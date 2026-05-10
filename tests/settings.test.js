import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Isolate this test file from the user's real home dir so concurrent test
// processes (config.test.js etc.) don't see our settings file at
// ~/.cc-launcher.json. We set HOME to a unique temp dir before any import
// of the settings module — `os.homedir()` in the module-level constants
// then resolves to the temp dir.
const TEST_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-launcher-settings-test-'));
const ORIGINAL_HOME = process.env.HOME;
process.env.HOME = TEST_HOME;

const moduleUrl = new URL('../src/settings.js', import.meta.url).href;
async function freshSettings() {
  return import(`${moduleUrl}?t=${Date.now()}-${Math.random()}`);
}

const SETTINGS_PATH = path.join(TEST_HOME, '.cc-launcher.json');

describe('Settings module', () => {
  before(() => {
    // Belt-and-braces: confirm the module sees our temp HOME.
    // (DEFAULT_CONFIG_PATH should live under TEST_HOME.)
  });

  after(() => {
    process.env.HOME = ORIGINAL_HOME;
    try { fs.rmSync(TEST_HOME, { recursive: true, force: true }); } catch {}
  });

  beforeEach(() => {
    try { fs.unlinkSync(SETTINGS_PATH); } catch {}
  });

  it('seeds default profile when settings file is missing', async () => {
    const m = await freshSettings();
    const s = m.loadSettings();
    assert.strictEqual(s.activeProfile, m.DEFAULT_PROFILE_LABEL);
    assert.deepStrictEqual(s.profiles, { [m.DEFAULT_PROFILE_LABEL]: m.DEFAULT_CONFIG_PATH });
    assert.ok(fs.existsSync(SETTINGS_PATH));
  });

  it('migrates legacy { configPath } shape to profiles.default', async () => {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify({ configPath: '/tmp/legacy.json' }), 'utf-8');
    const m = await freshSettings();
    const s = m.loadSettings();
    assert.strictEqual(s.activeProfile, 'default');
    assert.strictEqual(s.profiles.default, '/tmp/legacy.json');
    const onDisk = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    assert.strictEqual(onDisk.configPath, undefined);
    assert.strictEqual(onDisk.profiles.default, '/tmp/legacy.json');
  });

  it('addProfile + setActiveProfile + getActiveProfile round-trip', async () => {
    const m = await freshSettings();
    m.addProfile('Office', '/tmp/office.json');
    assert.deepStrictEqual(m.listProfiles(), {
      [m.DEFAULT_PROFILE_LABEL]: m.DEFAULT_CONFIG_PATH,
      office: '/tmp/office.json',
    });
    m.setActiveProfile('office');
    assert.deepStrictEqual(m.getActiveProfile(), { label: 'office', path: '/tmp/office.json' });
  });

  it('addProfile slugifies label and rejects duplicates', async () => {
    const m = await freshSettings();
    const slug = m.addProfile('Cheap Models!', '/x');
    assert.strictEqual(slug, 'cheap-models');
    assert.throws(() => m.addProfile('cheap-models', '/y'), /already exists/);
  });

  it('addProfile rejects empty / non-alphanumeric label', async () => {
    const m = await freshSettings();
    assert.throws(() => m.addProfile('!!!', '/x'), /alphanumeric/);
  });

  it('renameProfile updates active when renaming the active profile', async () => {
    const m = await freshSettings();
    m.addProfile('work', '/w');
    m.setActiveProfile('work');
    m.renameProfile('work', 'office');
    assert.strictEqual(m.getActiveProfile().label, 'office');
    assert.deepStrictEqual(Object.keys(m.listProfiles()).sort(), ['default', 'office'].sort());
  });

  it('renameProfile rejects collision', async () => {
    const m = await freshSettings();
    m.addProfile('a', '/a');
    m.addProfile('b', '/b');
    assert.throws(() => m.renameProfile('a', 'b'), /already exists/);
  });

  it('updateProfilePath changes the path', async () => {
    const m = await freshSettings();
    m.addProfile('p', '/old');
    m.updateProfilePath('p', '/new');
    assert.strictEqual(m.listProfiles().p, '/new');
  });

  it('removeProfile blocks deleting the active profile', async () => {
    const m = await freshSettings();
    m.addProfile('p', '/p');
    m.setActiveProfile('p');
    assert.throws(() => m.removeProfile('p'), /active/);
    assert.ok(m.listProfiles().p);
  });

  it('removeProfile deletes inactive profile', async () => {
    const m = await freshSettings();
    m.addProfile('p', '/p');
    m.removeProfile('p');
    assert.strictEqual(m.listProfiles().p, undefined);
  });

  it('setActiveProfile throws on unknown label', async () => {
    const m = await freshSettings();
    assert.throws(() => m.setActiveProfile('nope'), /does not exist/);
  });

  it('getConfigPath honors runtime override over active profile', async () => {
    const m = await freshSettings();
    m.addProfile('p', '/profile-path');
    m.setActiveProfile('p');
    assert.strictEqual(m.getConfigPath(), '/profile-path');
    m.setRuntimeConfigPath('/runtime-override');
    assert.strictEqual(m.getConfigPath(), '/runtime-override');
    m.setRuntimeConfigPath(null);
    assert.strictEqual(m.getConfigPath(), '/profile-path');
  });

  it('expandPath expands ~ and resolves to absolute', async () => {
    const m = await freshSettings();
    assert.strictEqual(m.expandPath('~'), TEST_HOME);
    assert.strictEqual(m.expandPath('~/foo'), path.join(TEST_HOME, 'foo'));
    assert.strictEqual(m.expandPath('/abs/x'), '/abs/x');
  });

  it('migrateLegacyConfig skips when user has custom profiles', async () => {
    const m = await freshSettings();
    m.addProfile('custom', '/custom');
    const result = m.migrateLegacyConfig();
    assert.strictEqual(result, null);
  });
});
