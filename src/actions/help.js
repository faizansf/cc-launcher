import { input } from '@inquirer/prompts';
import pc from 'picocolors';
import { CONFIG_PATH } from '../config.js';
import { getAllProviders } from '../providers/index.js';
import { promptTheme, orange, getVersion, withCancel } from '../utils/theme.js';

const SEP = pc.dim(' · ');

export async function showHelp() {
  console.log();
  console.log(`  ${orange('cc-launcher')}${SEP}${pc.dim(`v${getVersion()}`)}${SEP}${pc.dim('help')}`);
  console.log(pc.dim('  ─────────────────────────────────────────'));
  console.log();

  console.log(`  ${pc.bold('What is this?')}`);
  console.log('  A CLI tool to manage multiple sets of Claude Code credentials');
  console.log('  and launch Claude Code with any of them instantly.');
  console.log();

  console.log(`  ${pc.bold('Quick start')}`);
  console.log(`   ${pc.dim('1.')}  ${pc.bold('Add credentials')}        ${pc.dim('→')} pick a provider, paste your API key`);
  console.log(`   ${pc.dim('2.')}  ${pc.bold('Launch with provider')}   ${pc.dim('→')} run Claude Code with those credentials`);
  console.log();

  console.log(`  ${pc.bold('Keys')}`);
  console.log(`   ${pc.bold('↑ ↓')} move${SEP}${pc.bold('Enter')} select${SEP}${pc.bold('Esc')} back${SEP}${pc.bold('Ctrl-C')} quit`);
  console.log();

  console.log(`  ${pc.bold('Commands')}`);
  console.log(`   ${pc.dim('$')} cc-launcher                                 ${pc.dim('# interactive menu')}`);
  console.log(`   ${pc.dim('$')} cc-launcher list                            ${pc.dim('# list all credentials')}`);
  console.log(`   ${pc.dim('$')} cc-launcher launch                          ${pc.dim('# pick credentials interactively')}`);
  console.log(`   ${pc.dim('$')} cc-launcher launch <slug>                   ${pc.dim('# launch with these credentials')}`);
  console.log(`   ${pc.dim('$')} cc-launcher launch <slug> --print           ${pc.dim('# show env vars only')}`);
  console.log(`   ${pc.dim('$')} cc-launcher launch <slug> -- <args>         ${pc.dim('# pass args to claude')}`);
  console.log(`   ${pc.dim('$')} cc-launcher --credentials <slug>            ${pc.dim('# legacy: same as launch <slug>')}`);
  console.log();

  const providers = getAllProviders();
  if (providers.length > 0) {
    console.log(`  ${pc.bold('Providers')}`);
    for (const p of providers) console.log(`   ${p.name}`);
    console.log();
  }

  console.log(`  ${pc.bold('Config')}`);
  console.log(`   ${CONFIG_PATH}   ${pc.dim('(mode 0600; plaintext keys — do not commit)')}`);
  console.log();

  console.log(`  ${pc.bold('Project')}`);
  console.log(`   ${pc.cyan('https://github.com/faizansf/cc-launcher')}`);
  console.log();

  console.log(`  ${pc.bold('Upgrade')}`);
  console.log(`   ${pc.dim('$')} npm i -g cc-launcher@latest`);
  console.log();

  await withCancel(input, {
    message: 'Press Enter to go back',
    theme: promptTheme,
  });
  return 'back';
}
