import pc from 'picocolors';
import os from 'node:os';
import { getVersion, orange } from './theme.js';

let _firstFrame = true;

function shortenDir() {
  const cwd = process.cwd();
  const home = os.homedir();
  if (cwd.startsWith(home)) return '~' + cwd.slice(home.length);
  return cwd;
}

export function showBanner() {
  if (_firstFrame) {
    process.stdout.write('\x1b[2J\x1b[H');
    _firstFrame = false;
  } else {
    process.stdout.write('\x1b[H\x1b[J');
  }

  const version = getVersion();
  const rule = pc.dim('─'.repeat(66));

  console.log();
  console.log(rule);
  console.log(`  ${orange('cc-launcher')}  ${pc.dim(`·  v${version}  ·  ${shortenDir()}`)}`);
  console.log(rule);
  console.log();
}
