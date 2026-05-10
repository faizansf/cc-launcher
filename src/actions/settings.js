import fs from 'node:fs';
import { select, input, confirm } from '@inquirer/prompts';
import pc from 'picocolors';
import {
  listProfiles,
  getActiveProfile,
  setActiveProfile,
  addProfile,
  renameProfile,
  updateProfilePath,
  removeProfile,
  expandPath,
  slugifyLabel,
  DEFAULT_CONFIG_PATH,
} from '../settings.js';
import { promptTheme, selectTheme, formatMenu, withCancel, CANCELLED } from '../utils/theme.js';
import { showBanner } from '../utils/banner.js';

// Count credentials in a JSON file at `filePath`. Used to warn on path
// changes when the previous file held creds that won't follow.
function countCredentialsAt(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    const creds = (parsed && typeof parsed === 'object' && parsed.credentials) ||
                  (parsed && typeof parsed === 'object' && parsed.providers) ||
                  null;
    if (!creds || typeof creds !== 'object') return 0;
    return Object.keys(creds).length;
  } catch {
    return 0;
  }
}

async function pause() {
  console.log();
  await withCancel(input, {
    message: 'Press Enter to continue',
    theme: promptTheme,
  });
}

function profileChoices(profiles, activeLabel) {
  const labels = Object.keys(profiles);
  return formatMenu(labels.map(label => ({
    label: label === activeLabel ? `${label} ${pc.green('(active)')}` : label,
    desc: profiles[label],
    value: label,
  })));
}

async function switchProfile() {
  const profiles = listProfiles();
  const labels = Object.keys(profiles);
  if (labels.length < 2) {
    console.log(pc.dim(`\n  Only one profile exists. Add another first.`));
    await pause();
    return;
  }
  const { label: activeLabel } = getActiveProfile();
  const picked = await withCancel(select, {
    message: 'Switch active profile to:',
    choices: profileChoices(profiles, activeLabel),
    pageSize: Math.min(labels.length, 20),
    theme: selectTheme,
  });
  if (picked === CANCELLED) return;
  if (picked === activeLabel) {
    console.log(pc.dim(`\n  "${picked}" is already active.`));
    await pause();
    return;
  }
  setActiveProfile(picked);
  console.log(pc.green(`\n  Active profile  ${pc.bold(picked)}`));
  console.log(`  ${pc.dim('Path')}            ${profiles[picked]}`);
  await pause();
}

async function addProfileAction() {
  console.log();
  console.log(pc.dim(`  Pick a label (e.g. ${pc.bold('personal')}, ${pc.bold('office')}, ${pc.bold('cheap-models')}).`));
  console.log(pc.dim(`  Labels are slugified for the CLI: "Office Mac" → ${pc.bold('--profile office-mac')}.`));
  console.log();

  const rawLabel = await withCancel(input, {
    message: 'Profile label:',
    validate: (v) => slugifyLabel(v) ? true : 'Label needs at least one alphanumeric character',
    theme: promptTheme,
  });
  if (rawLabel === CANCELLED || !rawLabel) return;
  const slug = slugifyLabel(rawLabel);

  if (Object.prototype.hasOwnProperty.call(listProfiles(), slug)) {
    console.log(pc.red(`\n  Profile "${slug}" already exists. Use Edit to change it.`));
    await pause();
    return;
  }

  console.log();
  console.log(pc.dim(`  Path can be anywhere — e.g. a synced/shared file, a per-machine`));
  console.log(pc.dim(`  copy, or a network mount. ~ expands to your home directory.\n`));

  const rawPath = await withCancel(input, {
    message: 'Path to credentials JSON:',
    default: DEFAULT_CONFIG_PATH,
    validate: (v) => v && v.trim() ? true : 'Path is required',
    theme: promptTheme,
  });
  if (rawPath === CANCELLED || !rawPath) return;
  const profilePath = expandPath(rawPath);

  addProfile(slug, profilePath);
  console.log(pc.green(`\n  Profile "${slug}" added.`));
  console.log(`  ${pc.dim('Path')}  ${profilePath}\n`);

  const switchNow = await withCancel(confirm, {
    message: `Switch to "${slug}" now?`,
    default: true,
    theme: promptTheme,
  });
  if (switchNow !== CANCELLED && switchNow) {
    setActiveProfile(slug);
    console.log(pc.green(`\n  Active profile is now "${slug}".`));
  }
  await pause();
}

async function editProfileAction() {
  const profiles = listProfiles();
  const labels = Object.keys(profiles);
  if (labels.length === 0) {
    console.log(pc.dim(`\n  No profiles to edit.`));
    await pause();
    return;
  }
  const { label: activeLabel } = getActiveProfile();
  const target = await withCancel(select, {
    message: 'Edit which profile?',
    choices: profileChoices(profiles, activeLabel),
    pageSize: Math.min(labels.length, 20),
    theme: selectTheme,
  });
  if (target === CANCELLED) return;

  const action = await withCancel(select, {
    message: `Edit "${target}":`,
    choices: formatMenu([
      { label: 'Change path', desc: 'point this profile at a different file', value: 'path' },
      { label: 'Rename',      desc: 'change the label',                       value: 'rename' },
      { label: 'Back',                                                         value: 'back' },
    ]),
    pageSize: 3,
    theme: selectTheme,
  });
  if (action === CANCELLED || action === 'back') return;

  if (action === 'path') {
    const oldPath = profiles[target];
    const oldCount = countCredentialsAt(oldPath);
    const rawPath = await withCancel(input, {
      message: 'New path:',
      default: oldPath,
      validate: (v) => v && v.trim() ? true : 'Path is required',
      theme: promptTheme,
    });
    if (rawPath === CANCELLED || !rawPath) return;
    const newPath = expandPath(rawPath);
    if (newPath === oldPath) {
      console.log(pc.dim(`\n  Path unchanged.`));
      await pause();
      return;
    }
    updateProfilePath(target, newPath);
    console.log(pc.green(`\n  "${target}" now points at:`));
    console.log(`    ${newPath}\n`);
    if (oldCount > 0) {
      console.log(pc.yellow(`  Heads up: the previous file holds ${oldCount} saved credential${oldCount === 1 ? '' : 's'}:`));
      console.log(`    ${pc.bold(oldPath)}`);
      console.log();
      console.log(`  cc-launcher reads/writes the new file now. The old file is`);
      console.log(`  ${pc.bold('not')} moved automatically. To carry credentials over, copy by hand:`);
      console.log(pc.dim(`    cp "${oldPath}" "${newPath}"`));
    }
    await pause();
    return;
  }

  if (action === 'rename') {
    const rawLabel = await withCancel(input, {
      message: 'New label:',
      default: target,
      validate: (v) => slugifyLabel(v) ? true : 'Label needs at least one alphanumeric character',
      theme: promptTheme,
    });
    if (rawLabel === CANCELLED || !rawLabel) return;
    const newSlug = slugifyLabel(rawLabel);
    if (newSlug === target) {
      console.log(pc.dim(`\n  Label unchanged.`));
      await pause();
      return;
    }
    if (Object.prototype.hasOwnProperty.call(listProfiles(), newSlug)) {
      console.log(pc.red(`\n  Profile "${newSlug}" already exists.`));
      await pause();
      return;
    }
    renameProfile(target, newSlug);
    console.log(pc.green(`\n  Renamed "${target}" → "${newSlug}".`));
    await pause();
    return;
  }
}

async function deleteProfileAction() {
  const profiles = listProfiles();
  const labels = Object.keys(profiles);
  if (labels.length === 0) {
    console.log(pc.dim(`\n  No profiles to delete.`));
    await pause();
    return;
  }
  const { label: activeLabel } = getActiveProfile();
  const target = await withCancel(select, {
    message: 'Delete which profile?',
    choices: profileChoices(profiles, activeLabel),
    pageSize: Math.min(labels.length, 20),
    theme: selectTheme,
  });
  if (target === CANCELLED) return;

  if (target === activeLabel) {
    console.log(pc.red(`\n  "${target}" is the active profile and cannot be deleted.`));
    console.log(pc.dim(`  Switch to another profile first, then come back here.`));
    await pause();
    return;
  }

  const ok = await withCancel(confirm, {
    message: `Delete profile "${target}"? (the credentials file itself is not removed)`,
    default: false,
    theme: promptTheme,
  });
  if (ok === CANCELLED || !ok) return;

  removeProfile(target);
  console.log(pc.green(`\n  Profile "${target}" deleted.`));
  await pause();
}

export async function settingsAction() {
  while (true) {
    showBanner();
    const { label, path: activePath } = getActiveProfile();
    console.log(`  ${pc.bold('Settings')}`);
    console.log(`  ${pc.dim('Active profile')}  ${pc.bold(label)}  ${pc.dim('·')}  ${activePath}\n`);

    const settingsChoices = formatMenu([
      { label: 'Switch profile', desc: 'pick which profile is active',          value: 'switch' },
      { label: 'Add profile',    desc: 'register a new credentials file',       value: 'add' },
      { label: 'Edit profile',   desc: 'rename or change a profile path',       value: 'edit' },
      { label: 'Delete profile', desc: 'remove a profile (cannot be active)',   value: 'delete' },
      { label: 'Back',                                                            value: 'back' },
    ]);
    const choice = await withCancel(select, {
      message: 'What would you like to change?',
      choices: settingsChoices,
      pageSize: settingsChoices.length,
      theme: selectTheme,
    });

    if (choice === CANCELLED || choice === 'back') return 'back';

    switch (choice) {
      case 'switch': await switchProfile(); break;
      case 'add':    await addProfileAction(); break;
      case 'edit':   await editProfileAction(); break;
      case 'delete': await deleteProfileAction(); break;
    }
  }
}
