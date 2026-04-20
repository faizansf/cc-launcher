import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CONFIG_PATH = path.join(os.homedir(), '.claude-providers.json');
const FILE_MODE = 0o600;
const DIR_MODE = 0o700;

export { CONFIG_PATH };

export class ConfigCorruptError extends Error {
  constructor(path, cause) {
    super(`Config file at ${path} is not valid JSON: ${cause.message}`);
    this.name = 'ConfigCorruptError';
    this.path = path;
  }
}

export class ConfigAccessError extends Error {
  constructor(path, cause) {
    super(`Cannot access config file at ${path}: ${cause.message}`);
    this.name = 'ConfigAccessError';
    this.path = path;
    this.code = cause.code;
  }
}

// Stored shape on disk:
//   { "credentials": { "<slug>": { "name": "...", "provider": "<id>", "env": {...} } } }
//
// Top-level key is "credentials" — each entry is a saved set of credentials
// for a provider (e.g. one z.ai key for personal use, another for work).
export function loadConfig() {
  let data;
  try {
    data = fs.readFileSync(CONFIG_PATH, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') return { credentials: {} };
    throw new ConfigAccessError(CONFIG_PATH, err);
  }
  if (process.platform !== 'win32') {
    try {
      const stat = fs.statSync(CONFIG_PATH);
      if ((stat.mode & 0o077) !== 0) {
        fs.chmodSync(CONFIG_PATH, FILE_MODE);
      }
    } catch {
      // Best-effort; a chmod failure here should not block reads.
    }
  }
  let parsed;
  try {
    parsed = JSON.parse(data);
  } catch (err) {
    throw new ConfigCorruptError(CONFIG_PATH, err);
  }
  // Ensure the credentials key exists even if a hand-edited file is missing it.
  if (!parsed.credentials || typeof parsed.credentials !== 'object') {
    parsed.credentials = {};
  }
  // Migration: the on-disk shape used to be { providers: { <slug>: { name, template, env } } }.
  // The key "providers" is now "credentials" and the per-entry field "template" is "provider".
  // Migrate any legacy entries, then strip the old key and persist so this is a one-shot fix.
  if (parsed.providers && typeof parsed.providers === 'object') {
    const noNewData = Object.keys(parsed.credentials).length === 0;
    const hasLegacyData = Object.keys(parsed.providers).length > 0;
    if (noNewData && hasLegacyData) {
      for (const [slug, entry] of Object.entries(parsed.providers)) {
        parsed.credentials[slug] = {
          name: entry.name,
          provider: entry.provider ?? entry.template,
          env: entry.env ?? {},
        };
      }
    }
    delete parsed.providers;
    // Persist the migrated shape. Best-effort — if the write fails (e.g. EACCES),
    // we still return the in-memory migrated object so the caller works correctly,
    // and the next successful write will fix the file.
    try {
      saveConfig(parsed);
    } catch {
      /* ignore — read-only envs still work in-memory */
    }
  }
  return parsed;
}

export function saveConfig(config) {
  const dir = path.dirname(CONFIG_PATH);
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: DIR_MODE });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { encoding: 'utf-8', mode: FILE_MODE });
    fs.chmodSync(CONFIG_PATH, FILE_MODE);
  } catch (err) {
    throw new ConfigAccessError(CONFIG_PATH, err);
  }
}

export function getAllCredentials() {
  return loadConfig().credentials;
}

export function getCredentials(slug) {
  return loadConfig().credentials[slug] ?? null;
}

export function saveCredentials(slug, data) {
  const config = loadConfig();
  config.credentials[slug] = data;
  saveConfig(config);
}

export function removeCredentials(slug) {
  const config = loadConfig();
  delete config.credentials[slug];
  saveConfig(config);
}

// Rename a credential's slug and update its data in a single file write.
// When oldSlug === newSlug this is equivalent to saveCredentials. Callers
// are responsible for collision-checking before invoking this.
export function renameCredentials(oldSlug, newSlug, data) {
  const config = loadConfig();
  if (oldSlug !== newSlug) {
    delete config.credentials[oldSlug];
  }
  config.credentials[newSlug] = data;
  saveConfig(config);
}
