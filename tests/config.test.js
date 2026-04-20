import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  loadConfig,
  saveConfig,
  getAllCredentials,
  getCredentials,
  saveCredentials,
  removeCredentials,
  renameCredentials,
  ConfigCorruptError,
} from '../src/config.js';

describe('Config Module', () => {
  let originalData = null;
  let configExists = false;
  const configPath = path.join(os.homedir(), '.claude-providers.json');

  beforeEach(() => {
    try {
      originalData = fs.readFileSync(configPath, 'utf-8');
      configExists = true;
    } catch {
      configExists = false;
    }
  });

  afterEach(() => {
    if (configExists && originalData) {
      fs.writeFileSync(configPath, originalData, 'utf-8');
    } else if (!configExists) {
      try { fs.unlinkSync(configPath); } catch {}
    }
  });

  it('loadConfig returns empty credentials when file does not exist', () => {
    try { fs.unlinkSync(configPath); } catch {}
    const config = loadConfig();
    assert.deepStrictEqual(config, { credentials: {} });
  });

  it('saveConfig and loadConfig round-trip', () => {
    const data = { credentials: { test: { name: 'Test', provider: 'zai', env: { KEY: 'val' } } } };
    saveConfig(data);
    const loaded = loadConfig();
    assert.deepStrictEqual(loaded, data);
    try { fs.unlinkSync(configPath); } catch {}
  });

  it('getAllCredentials returns the credentials object', () => {
    saveConfig({ credentials: { foo: { name: 'Foo' } } });
    assert.deepStrictEqual(getAllCredentials(), { foo: { name: 'Foo' } });
    try { fs.unlinkSync(configPath); } catch {}
  });

  it('getCredentials returns one entry by slug', () => {
    saveConfig({ credentials: { mycred: { name: 'MyCred' } } });
    assert.deepStrictEqual(getCredentials('mycred'), { name: 'MyCred' });
    assert.strictEqual(getCredentials('nonexistent'), null);
    try { fs.unlinkSync(configPath); } catch {}
  });

  it('saveCredentials adds a new entry', () => {
    saveConfig({ credentials: {} });
    saveCredentials('test', { name: 'Test', provider: 'zai', env: {} });
    assert.deepStrictEqual(getCredentials('test'), { name: 'Test', provider: 'zai', env: {} });
    try { fs.unlinkSync(configPath); } catch {}
  });

  it('saveCredentials updates an existing entry', () => {
    saveConfig({ credentials: { test: { name: 'Old', provider: 'zai', env: {} } } });
    saveCredentials('test', { name: 'New', provider: 'zai', env: { KEY: 'val' } });
    assert.deepStrictEqual(getCredentials('test'), { name: 'New', provider: 'zai', env: { KEY: 'val' } });
    try { fs.unlinkSync(configPath); } catch {}
  });

  it('removeCredentials removes an entry', () => {
    saveConfig({ credentials: { a: { name: 'A' }, b: { name: 'B' } } });
    removeCredentials('a');
    assert.strictEqual(getCredentials('a'), null);
    assert.deepStrictEqual(getCredentials('b'), { name: 'B' });
    try { fs.unlinkSync(configPath); } catch {}
  });

  it('renameCredentials moves an entry to a new slug', () => {
    saveConfig({ credentials: { old: { name: 'Old', provider: 'zai', env: { KEY: 'v' } } } });
    renameCredentials('old', 'new', { name: 'New', provider: 'zai', env: { KEY: 'v2' } });
    assert.strictEqual(getCredentials('old'), null);
    assert.deepStrictEqual(getCredentials('new'), { name: 'New', provider: 'zai', env: { KEY: 'v2' } });
    try { fs.unlinkSync(configPath); } catch {}
  });

  it('renameCredentials updates in place when oldSlug === newSlug', () => {
    saveConfig({ credentials: { same: { name: 'Same', provider: 'zai', env: {} } } });
    renameCredentials('same', 'same', { name: 'Same', provider: 'zai', env: { KEY: 'v' } });
    assert.deepStrictEqual(getCredentials('same'), { name: 'Same', provider: 'zai', env: { KEY: 'v' } });
    try { fs.unlinkSync(configPath); } catch {}
  });

  it('renameCredentials leaves other entries untouched', () => {
    saveConfig({ credentials: {
      a: { name: 'A', provider: 'zai', env: {} },
      b: { name: 'B', provider: 'zai', env: {} },
    }});
    renameCredentials('a', 'c', { name: 'C', provider: 'zai', env: {} });
    assert.strictEqual(getCredentials('a'), null);
    assert.deepStrictEqual(getCredentials('b'), { name: 'B', provider: 'zai', env: {} });
    assert.deepStrictEqual(getCredentials('c'), { name: 'C', provider: 'zai', env: {} });
    try { fs.unlinkSync(configPath); } catch {}
  });

  it('loadConfig throws ConfigCorruptError on corrupted JSON', () => {
    fs.writeFileSync(configPath, 'not valid json{{{', 'utf-8');
    assert.throws(() => loadConfig(), (err) => err instanceof ConfigCorruptError);
    try { fs.unlinkSync(configPath); } catch {}
  });

  it('loadConfig backfills missing credentials key on hand-edited files', () => {
    fs.writeFileSync(configPath, '{}', 'utf-8');
    assert.deepStrictEqual(loadConfig(), { credentials: {} });
    try { fs.unlinkSync(configPath); } catch {}
  });

  it('saveConfig writes file with mode 0600', () => {
    saveConfig({ credentials: {} });
    const stat = fs.statSync(configPath);
    assert.strictEqual(stat.mode & 0o777, 0o600);
    try { fs.unlinkSync(configPath); } catch {}
  });
});
