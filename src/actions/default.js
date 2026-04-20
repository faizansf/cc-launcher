import { launchClaude, checkClaudeInstalled } from '../utils/spawn.js';
import pc from 'picocolors';

export async function launchDefault() {
  if (!checkClaudeInstalled()) {
    console.log(pc.red('\n  Error: "claude" not found in PATH.'));
    console.log(pc.dim('  Install Claude Code: https://docs.anthropic.com/en/docs/claude-code\n'));
    return 'back';
  }

  // Clear screen before launching
  process.stdout.write('\x1b[2J\x1b[H');

  try {
    await launchClaude({}, []);
  } catch (err) {
    console.log(pc.red(`\n  Failed to launch claude: ${err.message}\n`));
    return 'back';
  }
  process.exit(0);
}
