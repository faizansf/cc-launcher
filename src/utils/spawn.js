import { spawn, execFileSync } from 'node:child_process';

export function checkClaudeInstalled() {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  try {
    execFileSync(probe, ['claude'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function launchClaude(env, claudeArgs = []) {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', claudeArgs, {
      stdio: 'inherit',
      env: { ...process.env, ...env }
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code !== null) resolve(code);
      else if (signal) resolve(128 + (process.constants?.os?.signals?.[signal] ?? 1));
      else resolve(0);
    });
  });
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

export function buildCommand(env, claudeArgs = []) {
  const entries = Object.entries(env);
  const argsPart = claudeArgs.length > 0 ? ' ' + claudeArgs.map(shellQuote).join(' ') : '';
  if (entries.length === 0) {
    return `claude${argsPart}`;
  }
  const envParts = entries
    .map(([k, v]) => `${k}=${shellQuote(v)}`)
    .join(' \\\n  ');
  return `${envParts} \\\n  claude${argsPart}`;
}
