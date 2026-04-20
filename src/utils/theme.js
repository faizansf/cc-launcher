import pc from 'picocolors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Sentinel returned by withCancel when the user hits Esc or Ctrl-C. Use a
// Symbol (not a string) so it cannot collide with a real input value — a
// user could legitimately type "back" or "cancel" into a text prompt.
export const CANCELLED = Symbol('cancelled');

// Inter-byte window for disambiguating standalone Esc from the start of an
// escape sequence (arrow keys, function keys, etc.). Node readline's default
// is 500ms, which feels laggy. Modern terminals deliver escape sequences in
// a single write or within microseconds, so 30ms is safely conservative
// while staying imperceptible.
const ESC_WINDOW_MS = 30;

// Wraps an @inquirer/prompts prompt so that Esc resolves to CANCELLED and
// Ctrl-C exits the process immediately. We bypass readline's keypress parser
// for Esc and detect raw 0x1B on the data event so we can use our own
// (short) disambiguation window.
export async function withCancel(prompt, config) {
  const ac = new AbortController();
  let escTimer = null;

  const onData = (chunk) => {
    if (chunk.length === 1 && chunk[0] === 0x1B) {
      // Standalone 0x1B — could be Esc, or could be the start of an escape
      // sequence whose remaining bytes haven't arrived yet. Wait briefly.
      if (escTimer) clearTimeout(escTimer);
      escTimer = setTimeout(() => {
        escTimer = null;
        ac.abort();
      }, ESC_WINDOW_MS);
    } else if (escTimer) {
      // Any other input (including arrow-key continuation bytes) means the
      // earlier 0x1B was the start of a sequence, not standalone Esc.
      clearTimeout(escTimer);
      escTimer = null;
    }
  };

  if (process.stdin.isTTY) process.stdin.on('data', onData);
  try {
    // Inquirer takes (config, context) — signal lives in context, not config.
    return await prompt(config, { signal: ac.signal });
  } catch (err) {
    if (err.name === 'AbortPromptError') return CANCELLED;
    if (err.name === 'ExitPromptError') {
      console.log(pc.dim('\n  Goodbye!\n'));
      process.exit(0);
    }
    throw err;
  } finally {
    if (process.stdin.isTTY) process.stdin.off('data', onData);
    if (escTimer) clearTimeout(escTimer);
  }
}

// Brand accent: ANSI-256 color 208 — a warm orange that stays distinct
// from the status colors (red 9, yellow 11, green 10) and reads well on
// both light and dark terminal backgrounds.
const ORANGE_OPEN = '\x1b[38;5;208m';
const ANSI_RESET = '\x1b[0m';

export function orange(str) {
  return `${ORANGE_OPEN}${str}${ANSI_RESET}`;
}

const __pkgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../package.json');
let _version = null;
export function getVersion() {
  if (_version === null) {
    try {
      _version = JSON.parse(fs.readFileSync(__pkgPath, 'utf-8')).version || '';
    } catch {
      _version = '';
    }
  }
  return _version;
}

// Shared theme for @inquirer/prompts calls.
export const promptTheme = {
  prefix: '',
  icon: {
    cursor: orange(pc.bold('❯')),
  },
  style: {
    highlight: (text) => orange(text),
    message: (text) => text ? pc.bold(text) : '',
  },
};

// Theme for select/search prompts in submenus. Appends an Esc hint to the
// built-in key legend so users know how to go back without a dedicated list item.
export const selectTheme = {
  ...promptTheme,
  style: {
    ...promptTheme.style,
    keysHelpTip: (keys) =>
      [...keys, ['Esc', 'back']]
        .map(([key, action]) => `${pc.bold(key)} ${pc.dim(action)}`)
        .join(pc.dim(' • ')),
  },
};

// Format a list of primary menu entries as aligned "LABEL    — description"
// rows. Labels are bold; the description is dim. `short` drops the
// vertical-alignment padding so inquirer's post-answer inline echo reads as
// a single clean row rather than the padded list cell.
export function formatMenu(entries) {
  const width = Math.max(...entries.map(e => e.label.length));
  return entries.map((e) => {
    const name = e.desc
      ? `${pc.bold(e.label)}${' '.repeat(width - e.label.length + 4)}${pc.dim(`— ${e.desc}`)}`
      : pc.bold(e.label);
    const short = e.desc ? `${e.label} ${pc.dim(`— ${e.desc}`)}` : e.label;
    return { name, value: e.value, short };
  });
}
