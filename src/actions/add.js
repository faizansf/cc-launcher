import { search, input, password } from '@inquirer/prompts';
import { getAllProviders, getProviderDef } from '../providers/index.js';
import { getAllCredentials, saveCredentials } from '../config.js';
import { promptTheme, formatMenu, backChoice, withCancel, CANCELLED } from '../utils/theme.js';
import pc from 'picocolors';

export async function addCredentials() {
  const providers = getAllProviders();

  if (providers.length === 0) {
    console.log(pc.yellow(`\n  No providers are registered.`));
    console.log(pc.dim(`  Add one in ${pc.bold('src/providers/')} and register it in ${pc.bold('src/providers/index.js')}.\n`));
    return 'back';
  }

  const providerChoices = [
    backChoice,
    ...formatMenu(providers.map(p => ({ label: p.name, value: p.id }))),
  ];

  const providerId = await withCancel(search, {
    message: 'Choose a provider:',
    source: (input) => {
      if (!input) return providerChoices;
      const q = input.toLowerCase();
      return providerChoices.filter(c => c.value === 'back' || c.value?.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q));
    },
    theme: promptTheme,
  });
  if (providerId === CANCELLED || providerId === 'back') return 'back';
  const provider = getProviderDef(providerId);

  console.log(pc.dim(`\n  A label to identify these credentials in menus.`));
  console.log(pc.dim(`  It's also slugified for the CLI — e.g. "ZAI Personal" becomes ${pc.bold('--credentials zai-personal')}.\n`));

  const name = await withCancel(input, {
    message: 'Name for these credentials:',
    validate: (v) => v.trim() ? true : 'Name is required',
    theme: promptTheme,
  });
  if (name === CANCELLED || !name) return 'back';

  const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  if (!slug) {
    console.log(pc.red(`\n  Name "${name}" contains no letters or digits. Please use a name with at least one alphanumeric character.\n`));
    return 'back';
  }

  const existing = getAllCredentials();
  if (existing[slug]) {
    console.log(pc.red(`\n  Credentials "${slug}" already exist. Use edit instead.\n`));
    return 'back';
  }

  console.log(pc.dim(`\n  Fill in the fields:`));
  console.log(pc.dim(`  Required fields are marked with ${pc.red('*')}. Press ${pc.bold('Enter')} to skip optional fields, ${pc.bold('Esc')} to cancel.\n`));

  const env = {};
  for (const field of provider.fields) {
    const suffix = field.required ? pc.red(' *') : pc.dim(' (optional)');
    const prompt = field.type === 'secret' ? password : input;
    const value = await withCancel(prompt, {
      message: `${field.label}${suffix}`,
      ...(field.type === 'secret' ? { mask: '*' } : { default: field.default || undefined }),
      theme: promptTheme,
    });

    if (value === CANCELLED) return 'back';
    if (!value && field.required) {
      console.log(pc.yellow(`  Skipping required field — credentials may not work without ${field.label}`));
    }
    if (value) {
      env[field.key] = value;
    }
  }

  saveCredentials(slug, { name, provider: providerId, env });
  console.log(pc.green(`\n  Credentials "${name}" saved as "${slug}"!\n`));
  return 'back';
}
