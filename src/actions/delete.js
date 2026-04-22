import { select, confirm } from '@inquirer/prompts';
import { getAllCredentials, removeCredentials } from '../config.js';
import { selectTheme, promptTheme, formatMenu, withCancel, CANCELLED } from '../utils/theme.js';
import pc from 'picocolors';

export async function deleteCredentialsAction() {
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

  const slug = await withCancel(select, {
    message: 'Which credentials to delete?',
    choices: formatMenu(slugs.map(s => ({
      label: all[s].name,
      desc: all[s].provider,
      value: s,
    }))),
    theme: selectTheme,
  });
  if (slug === CANCELLED) return 'back';

  const confirmed = await withCancel(confirm, {
    message: `Delete "${all[slug].name}"? This cannot be undone.`,
    default: false,
    theme: promptTheme,
  });

  if (confirmed === CANCELLED || !confirmed) {
    console.log(pc.dim(`\n  Cancelled.\n`));
  } else {
    removeCredentials(slug);
    console.log(pc.green(`\n  Credentials "${all[slug].name}" deleted.\n`));
  }

  return 'back';
}
