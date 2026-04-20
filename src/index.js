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
import { ConfigCorruptError, ConfigAccessError } from './config.js';

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

async function main() {
  const args = parseArgs(process.argv.slice(2));

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

    let action = await withCancel(select, {
      message: '',
      choices: formatMenu([
        { label: 'Launch with provider', desc: 'run Claude Code with saved credentials',  value: 'use' },
        { label: 'Launch default',       desc: 'run with official Anthropic settings',    value: 'default' },
        { label: 'Add credentials',      desc: 'save new credentials for a provider',     value: 'add' },
        { label: 'Edit credentials',     desc: 'modify a saved set',                      value: 'edit' },
        { label: 'Delete credentials',   desc: 'remove a saved set',                      value: 'delete' },
        { label: 'Help',                 desc: 'about cc-launcher',                       value: 'help' },
        { label: 'Exit',                                                                   value: 'exit' },
      ]),
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
    }
  } while (result !== 'exit');
}

main().catch(reportFatal);
