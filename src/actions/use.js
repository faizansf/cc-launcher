import { select } from '@inquirer/prompts';
import { getAllCredentials, getCredentials } from '../config.js';
import { launchClaude, buildCommand, checkClaudeInstalled } from '../utils/spawn.js';
import { maskSecret } from '../utils/mask.js';
import { selectTheme, formatMenu, withCancel, CANCELLED } from '../utils/theme.js';
import pc from 'picocolors';

export async function useCredentials(slug, claudeArgs = [], printOnly = false) {
  if (slug) {
    // Direct mode: --credentials <slug>
    const creds = getCredentials(slug);
    if (!creds) {
      const all = getAllCredentials();
      const slugs = Object.keys(all);
      console.log(pc.red(`\n  Credentials "${slug}" not found.\n`));
      if (slugs.length > 0) {
        console.log(pc.dim('  Available credentials:'));
        for (const s of slugs) {
          console.log(pc.dim(`    - ${s} (${all[s].name})`));
        }
      }
      console.log();
      process.exit(1);
    }

    if (printOnly) {
      console.log(buildCommand(creds.env, claudeArgs));
      return;
    }

    if (!checkClaudeInstalled()) {
      console.log(pc.red('\n  Error: "claude" not found in PATH.'));
      console.log(pc.dim('  Install Claude Code: https://docs.anthropic.com/en/docs/claude-code\n'));
      process.exit(1);
    }

    const exitCode = await launchClaude(creds.env, claudeArgs);
    process.exit(exitCode);
  }

  // Interactive mode — show selection menu
  const all = getAllCredentials();
  const slugs = Object.keys(all);

  if (slugs.length === 0) {
    const choice = await withCancel(select, {
      message: 'No credentials yet. What would you like to do?',
      choices: formatMenu([{ label: 'Add credentials', value: 'add' }]),
      theme: selectTheme,
    });
    return choice === CANCELLED ? 'back' : choice;
  }

  const selected = await withCancel(select, {
    message: 'Select credentials to launch with:',
    choices: formatMenu(slugs.map(s => {
      const c = all[s];
      const token = c.env.ANTHROPIC_AUTH_TOKEN ? maskSecret(c.env.ANTHROPIC_AUTH_TOKEN) : 'no key';
      return {
        label: c.name,
        desc: `${c.provider} · ${token}`,
        value: s,
      };
    })),
    theme: selectTheme,
  });

  if (selected === CANCELLED) return 'back';

  const creds = all[selected];

  if (!checkClaudeInstalled()) {
    console.log(pc.red('\n  Error: "claude" not found in PATH.'));
    console.log(pc.dim('  Install Claude Code: https://docs.anthropic.com/en/docs/claude-code\n'));
    return 'back';
  }

  console.log(pc.dim(`\n  Launching Claude Code with "${creds.name}"...\n`));
  const exitCode = await launchClaude(creds.env, claudeArgs);
  process.exit(exitCode);
}
