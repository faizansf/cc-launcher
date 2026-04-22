import { select, input, password, confirm } from '@inquirer/prompts';
import { getAllCredentials, getCredentials, saveCredentials, renameCredentials } from '../config.js';
import { getProviderDef } from '../providers/index.js';
import { maskSecret } from '../utils/mask.js';
import { selectTheme, promptTheme, formatMenu, withCancel, CANCELLED } from '../utils/theme.js';
import pc from 'picocolors';

export async function editCredentials() {
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
    message: 'Which credentials to edit?',
    choices: formatMenu(slugs.map(s => ({
      label: all[s].name,
      desc: all[s].provider,
      value: s,
    }))),
    theme: selectTheme,
  });
  if (slug === CANCELLED) return 'back';

  const current = getCredentials(slug);
  const provider = getProviderDef(current.provider);

  if (!provider) {
    console.log(pc.red(`\n  Provider "${current.provider}" not found. Cannot edit.\n`));
    return 'back';
  }

  console.log(pc.dim(`\n  Editing "${current.name}". Current values shown.`));
  console.log(pc.dim(`  Press ${pc.bold('Enter')} to keep a value, type a new value to change it, ${pc.bold('Esc')} to cancel.\n`));

  const newName = await withCancel(input, {
    message: 'Name for these credentials:',
    default: current.name,
    validate: (v) => v.trim() ? true : 'Name is required',
    theme: promptTheme,
  });
  if (newName === CANCELLED) return 'back';

  const newSlug = newName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!newSlug) {
    console.log(pc.red(`\n  Name "${newName}" contains no letters or digits. Please use a name with at least one alphanumeric character.\n`));
    return 'back';
  }
  if (newSlug !== slug && all[newSlug]) {
    console.log(pc.red(`\n  Credentials "${newSlug}" already exist. Pick a different name or edit "${newSlug}" instead.\n`));
    return 'back';
  }

  if (newSlug !== slug) {
    console.log(pc.yellow(`\n  Heads up: the CLI slug will change from ${pc.bold(slug)} to ${pc.bold(newSlug)}.`));
    console.log(pc.dim(`  Any scripts or aliases using ${pc.bold(`--credentials ${slug}`)} will need to be updated.\n`));
  }

  const env = {};
  for (const field of provider.fields) {
    const currentVal = current.env[field.key] ?? '';
    const displayVal = field.type === 'secret' && currentVal ? maskSecret(currentVal) : currentVal;
    const suffix = field.required ? pc.red(' *') : pc.dim('(optional)');
    const prompt = field.type === 'secret' ? password : input;
    const value = await withCancel(prompt, {
      message: field.type === 'secret'
        ? `${field.label} ${suffix}  ${pc.dim(`[current: ${displayVal}]`)}`
        : `${field.label} ${suffix}  ${pc.dim(`[${displayVal || 'not set'}]`)}`,
      ...(field.type === 'secret' ? { mask: '*' } : { default: currentVal || field.default || undefined }),
      theme: promptTheme,
    });

    if (value === CANCELLED) return 'back';
    if (value) env[field.key] = value;
  }

  const save = await withCancel(confirm, {
    message: `Save changes to "${newName}"?`,
    default: true,
    theme: promptTheme,
  });

  if (save === CANCELLED || !save) {
    console.log(pc.dim(`\n  Cancelled. No changes saved.\n`));
  } else {
    const updated = { ...current, name: newName, env };
    if (newSlug !== slug) {
      renameCredentials(slug, newSlug, updated);
      console.log(pc.green(`\n  Credentials updated and renamed to "${newSlug}"!\n`));
    } else {
      saveCredentials(slug, updated);
      console.log(pc.green(`\n  Credentials "${newName}" updated!\n`));
    }
  }

  return 'back';
}
