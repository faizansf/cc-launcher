#!/usr/bin/env node

import { select } from '@inquirer/prompts';
import pc from 'picocolors';
import { parseArgs } from './utils/args.js';
import { showBanner } from './utils/banner.js';
import { promptTheme, formatMenu, withCancel, CANCELLED } from './utils/theme.js';
import { addCredentials } from './actions/add.js';
import { editCredentials } from './actions/edit.js';
import { deleteCredentialsAction } from './actions/delete.js';
import { listCredentials } from './actions/list.js';
import { useCredentials } from './actions/use.js';
import { launchDefault } from './actions/default.js';
import { showHelp } from './actions/help.js';
import { settingsAction } from './actions/settings.js';
import { ConfigCorruptError, ConfigAccessError } from './config.js';
import {
  migrateLegacyConfig,
  setRuntimeConfigPath,
  expandPath,
  listProfiles,
  getActiveProfile,
} from './settings.js';

function reportFatal(err) {
  if (err instanceof ConfigCorruptError) {
    console.error(pc.red(`\n  ${err.message}`));
    console.error(pc.dim(`  Fix the JSON by hand, or delete the file to start fresh.\n`));
    process.exit(1);
  }
  if (err instanceof ConfigAccessError) {
    console.error(pc.red(`\n  ${err.message}`));
    console.error(pc.dim(`  Check file permissions and try again.\n`));
    process.exit(1);
  }
  throw err;
}

function announceMigration(result) {
  if (!result) return;
  console.log(pc.yellow(`\n  Renamed credentials file:`));
  console.log(`    ${pc.dim('from')}  ${result.from}`);
  console.log(`    ${pc.dim('to  ')}  ${result.to}`);
  console.log(pc.dim(`  cc-launcher now uses the new name by default. No action needed.\n`));
}

// Print the active-profile status line below the banner. Reflects CLI
// overrides — `--config <path>` shows as `(ad-hoc)` since it bypasses any
// saved profile, and `--profile <label>` shows the resolved label.
function printProfileStatus(args) {
  if (args.configOverride) {
    console.log(`  ${pc.dim('Profile:')}  ${pc.bold('(ad-hoc)')}  ${pc.dim('·')}  ${expandPath(args.configOverride)}\n`);
    return;
  }
  const label = args.profile || getActiveProfile().label;
  const profiles = listProfiles();
  const path = profiles[label] || getActiveProfile().path;
  console.log(`  ${pc.dim('Profile:')}  ${pc.bold(label)}  ${pc.dim('·')}  ${path}\n`);
}

// Resolve --profile / --config into a runtime override on the credentials
// path. Both flags affect this run only — the active profile in settings.json
// is not modified. Mutually exclusive (validated by parseArgs).
function applyOverrides(args) {
  if (args.error) {
    console.error(pc.red(`\n  ${args.error}\n`));
    process.exit(1);
  }
  if (args.configOverride) {
    setRuntimeConfigPath(expandPath(args.configOverride));
    return;
  }
  if (args.profile) {
    const profiles = listProfiles();
    if (!Object.prototype.hasOwnProperty.call(profiles, args.profile)) {
      const available = Object.keys(profiles).join(', ') || '(none)';
      console.error(pc.red(`\n  Unknown profile: "${args.profile}"`));
      console.error(pc.dim(`  Available profiles: ${available}\n`));
      process.exit(1);
    }
    setRuntimeConfigPath(profiles[args.profile]);
  }
}

async function main() {
  announceMigration(migrateLegacyConfig());
  const args = parseArgs(process.argv.slice(2));
  applyOverrides(args);

  // Non-interactive: --credentials flag
  if (args.credentials) {
    await useCredentials(args.credentials, args.claudeArgs, args.print);
    process.exit(0);
  }

  // Non-interactive: list command
  if (args.command === 'list') {
    listCredentials();
    process.exit(0);
  }

  // launch [slug] — interactive picker if no slug given
  if (args.command === 'launch') {
    await useCredentials(args.commandArg ?? null, args.claudeArgs, args.print);
    process.exit(0);
  }

  // Unknown subcommand — don't silently drop into the menu
  if (args.command) {
    console.error(pc.red(`\n  Unknown command: "${args.command}"`));
    console.error(pc.dim(`  Try: cc-launcher --help, or run without arguments for the menu.\n`));
    process.exit(1);
  }

  // Interactive: main menu loop
  // Actions return navigation signals: 'back', 'add', or 'exit'
  let result;
  do {
    showBanner();
    printProfileStatus(args);

    const menuChoices = formatMenu([
      { label: 'Launch with provider', desc: 'run Claude Code with saved credentials',  value: 'use' },
      { label: 'Launch default',       desc: 'run with official Anthropic settings',    value: 'default' },
      { label: 'Add credentials',      desc: 'save new credentials for a provider',     value: 'add' },
      { label: 'Edit credentials',     desc: 'modify a saved set',                      value: 'edit' },
      { label: 'Delete credentials',   desc: 'remove a saved set',                      value: 'delete' },
      { label: 'Settings',             desc: 'configure cc-launcher',                   value: 'settings' },
      { label: 'Help',                 desc: 'about cc-launcher',                       value: 'help' },
      { label: 'Exit',                                                                   value: 'exit' },
    ]);
    let action = await withCancel(select, {
      message: '',
      choices: menuChoices,
      // Render every entry without paging — default pageSize (7) clips the
      // last items and makes the menu feel like it scrolls mid-list.
      pageSize: menuChoices.length,
      // Suppress the "? <message>" header — the menu is self-explanatory.
      theme: { ...promptTheme, prefix: '' },
    });

    // Esc / Ctrl-C at the top of the menu = quit cleanly.
    if (action === CANCELLED) action = 'exit';

    switch (action) {
      case 'default':
        result = await launchDefault();
        break;

      case 'exit':
        console.log(pc.dim('\n  Goodbye!\n'));
        process.exit(0);

      case 'use':
        result = await useCredentials(null, args.claudeArgs);
        if (result === 'add') {
          await addCredentials();
          result = 'back';
        }
        break;

      case 'add':
        result = await addCredentials();
        break;

      case 'edit':
        result = await editCredentials();
        if (result === 'add') {
          await addCredentials();
          result = 'back';
        }
        break;

      case 'delete':
        result = await deleteCredentialsAction();
        if (result === 'add') {
          await addCredentials();
          result = 'back';
        }
        break;

      case 'help':
        await showHelp();
        result = 'back';
        break;

      case 'settings':
        result = await settingsAction();
        break;
    }
  } while (result !== 'exit');
}

main().catch(reportFatal);
