import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Settings live at a fixed location so we know where to find them before
// we know where the credentials file lives. Credentials path itself is
// driven by the active profile (see Profile system below).
const SETTINGS_PATH = path.join(os.homedir(), '.cc-launcher.json');
const FILE_MODE = 0o600;
const DIR_MODE = 0o700;

export const DEFAULT_CONFIG_PATH = path.join(os.homedir(), '.cc-launcher-providers.json');
// Pre-rename location. Auto-migrated to DEFAULT_CONFIG_PATH on startup if the
// new path doesn't exist and the user hasn't customized profiles.
export const LEGACY_CONFIG_PATH = path.join(os.homedir(), '.claude-providers.json');
export const DEFAULT_PROFILE_LABEL = 'default';
export { SETTINGS_PATH };

// ---- Slug rules (shared with credential slugs) ---------------------------
// Lowercase alphanumeric + dashes. Used for profile labels so they work as
// CLI flag values without quoting.
export function slugifyLabel(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ---- Settings file I/O ---------------------------------------------------

function readRaw() {
  try {
    const data = fs.readFileSync(SETTINGS_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeRaw(settings) {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: DIR_MODE });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), { encoding: 'utf-8', mode: FILE_MODE });
  fs.chmodSync(SETTINGS_PATH, FILE_MODE);
}

// Normalize raw settings into the canonical shape:
//   { activeProfile: <label>, profiles: { <label>: <path>, ... } }
// Migrates the legacy `{ configPath }` shape into a `default` profile.
// `dirty` indicates whether the on-disk file should be persisted to reflect
// migrations or repairs.
function normalize(raw) {
  let dirty = false;
  let profiles = (raw.profiles && typeof raw.profiles === 'object') ? { ...raw.profiles } : null;
  let activeProfile = typeof raw.activeProfile === 'string' ? raw.activeProfile : null;

  // Legacy migration: { configPath: "..." } → { profiles: { default: ... } }
  if (!profiles && typeof raw.configPath === 'string' && raw.configPath) {
    profiles = { [DEFAULT_PROFILE_LABEL]: raw.configPath };
    activeProfile = DEFAULT_PROFILE_LABEL;
    dirty = true;
  }

  // Fresh install / empty file: seed default profile.
  if (!profiles || Object.keys(profiles).length === 0) {
    profiles = { [DEFAULT_PROFILE_LABEL]: DEFAULT_CONFIG_PATH };
    activeProfile = DEFAULT_PROFILE_LABEL;
    dirty = dirty || !raw.profiles;
  }

  // Drop non-string entries defensively.
  for (const [label, p] of Object.entries(profiles)) {
    if (typeof p !== 'string' || !p) {
      delete profiles[label];
      dirty = true;
    }
  }
  if (Object.keys(profiles).length === 0) {
    profiles = { [DEFAULT_PROFILE_LABEL]: DEFAULT_CONFIG_PATH };
    activeProfile = DEFAULT_PROFILE_LABEL;
    dirty = true;
  }

  // Ensure activeProfile points at an existing profile.
  if (!activeProfile || !Object.prototype.hasOwnProperty.call(profiles, activeProfile)) {
    activeProfile = Object.keys(profiles)[0];
    dirty = true;
  }

  return { settings: { activeProfile, profiles }, dirty };
}

export function loadSettings() {
  const raw = readRaw();
  const { settings, dirty } = normalize(raw);
  if (dirty) {
    try { writeRaw(settings); } catch { /* read-only env: in-memory only */ }
  }
  return settings;
}

export function saveSettings(settings) {
  writeRaw(settings);
}

// ---- Profile API ---------------------------------------------------------

export function listProfiles() {
  return { ...loadSettings().profiles };
}

export function getActiveProfile() {
  const s = loadSettings();
  return { label: s.activeProfile, path: s.profiles[s.activeProfile] };
}

export function setActiveProfile(label) {
  const s = loadSettings();
  if (!Object.prototype.hasOwnProperty.call(s.profiles, label)) {
    throw new Error(`Profile "${label}" does not exist`);
  }
  s.activeProfile = label;
  saveSettings(s);
}

export function addProfile(label, profilePath) {
  const slug = slugifyLabel(label);
  if (!slug) throw new Error('Profile label must contain at least one alphanumeric character');
  if (!profilePath || typeof profilePath !== 'string') throw new Error('Profile path is required');
  const s = loadSettings();
  if (Object.prototype.hasOwnProperty.call(s.profiles, slug)) {
    throw new Error(`Profile "${slug}" already exists`);
  }
  s.profiles[slug] = profilePath;
  saveSettings(s);
  return slug;
}

export function renameProfile(oldLabel, newLabel) {
  const newSlug = slugifyLabel(newLabel);
  if (!newSlug) throw new Error('Profile label must contain at least one alphanumeric character');
  const s = loadSettings();
  if (!Object.prototype.hasOwnProperty.call(s.profiles, oldLabel)) {
    throw new Error(`Profile "${oldLabel}" does not exist`);
  }
  if (newSlug === oldLabel) return newSlug;
  if (Object.prototype.hasOwnProperty.call(s.profiles, newSlug)) {
    throw new Error(`Profile "${newSlug}" already exists`);
  }
  // Preserve insertion order so the menu stays stable for the user.
  const rebuilt = {};
  for (const [k, v] of Object.entries(s.profiles)) {
    rebuilt[k === oldLabel ? newSlug : k] = v;
  }
  s.profiles = rebuilt;
  if (s.activeProfile === oldLabel) s.activeProfile = newSlug;
  saveSettings(s);
  return newSlug;
}

export function updateProfilePath(label, profilePath) {
  if (!profilePath || typeof profilePath !== 'string') throw new Error('Profile path is required');
  const s = loadSettings();
  if (!Object.prototype.hasOwnProperty.call(s.profiles, label)) {
    throw new Error(`Profile "${label}" does not exist`);
  }
  s.profiles[label] = profilePath;
  saveSettings(s);
}

export function removeProfile(label) {
  const s = loadSettings();
  if (!Object.prototype.hasOwnProperty.call(s.profiles, label)) {
    throw new Error(`Profile "${label}" does not exist`);
  }
  if (s.activeProfile === label) {
    throw new Error(`Cannot delete active profile "${label}". Switch to another profile first.`);
  }
  delete s.profiles[label];
  saveSettings(s);
}

// ---- Runtime override (CLI flags) ---------------------------------------

let _runtimeOverride = null;

export function setRuntimeConfigPath(p) {
  _runtimeOverride = p || null;
}

export function getRuntimeConfigPath() {
  return _runtimeOverride;
}

// Resolves the credentials path: runtime override > active profile > default.
export function getConfigPath() {
  if (_runtimeOverride) return _runtimeOverride;
  try {
    return getActiveProfile().path || DEFAULT_CONFIG_PATH;
  } catch {
    return DEFAULT_CONFIG_PATH;
  }
}

// ---- Legacy file rename (~/.claude-providers.json → new name) -----------

// Returns true if the user has profiles other than a single `default → default-path`.
function hasCustomProfiles() {
  try {
    const raw = readRaw();
    const profiles = raw.profiles;
    if (!profiles || typeof profiles !== 'object') {
      // No profiles yet — also check legacy configPath, which would migrate
      // to a `default` profile pointing at that path.
      if (typeof raw.configPath === 'string' && raw.configPath && raw.configPath !== DEFAULT_CONFIG_PATH) {
        return true;
      }
      return false;
    }
    const labels = Object.keys(profiles);
    if (labels.length !== 1) return true;
    if (labels[0] !== DEFAULT_PROFILE_LABEL) return true;
    if (profiles[DEFAULT_PROFILE_LABEL] !== DEFAULT_CONFIG_PATH) return true;
    return false;
  } catch {
    return false;
  }
}

// One-shot rename of the legacy credentials file to the new default name.
// Skips when: user has customized profiles, new file already exists, or
// legacy file is absent. Failures are swallowed and reported as null.
export function migrateLegacyConfig() {
  if (hasCustomProfiles()) return null;
  try {
    if (!fs.existsSync(LEGACY_CONFIG_PATH)) return null;
    if (fs.existsSync(DEFAULT_CONFIG_PATH)) return null;
    fs.renameSync(LEGACY_CONFIG_PATH, DEFAULT_CONFIG_PATH);
    try { fs.chmodSync(DEFAULT_CONFIG_PATH, FILE_MODE); } catch {}
    return { migrated: true, from: LEGACY_CONFIG_PATH, to: DEFAULT_CONFIG_PATH };
  } catch {
    return null;
  }
}

// Expand a leading ~ to the user's home directory and resolve to absolute.
export function expandPath(input) {
  if (!input) return input;
  let p = String(input).trim();
  if (p === '~') p = os.homedir();
  else if (p.startsWith('~/')) p = path.join(os.homedir(), p.slice(2));
  return path.resolve(p);
}
