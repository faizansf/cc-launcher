import { describe, it } from 'node:test';
import assert from 'node:assert';
import { maskSecret } from '../src/utils/mask.js';
import { parseArgs } from '../src/utils/args.js';
import { buildCommand } from '../src/utils/spawn.js';

describe('maskSecret', () => {
  it('masks all but last 4 characters', () => {
    assert.strictEqual(maskSecret('sk-abcdef1234'), '*********1234');
  });

  it('returns **** for short values', () => {
    assert.strictEqual(maskSecret('ab'), '****');
  });

  it('returns **** for empty string', () => {
    assert.strictEqual(maskSecret(''), '****');
  });

  it('returns **** for null', () => {
    assert.strictEqual(maskSecret(null), '****');
  });
});

describe('parseArgs', () => {
  it('returns defaults for empty argv', () => {
    const result = parseArgs([]);
    assert.deepStrictEqual(result, { credentials: null, print: false, command: null, claudeArgs: [] });
  });

  it('extracts --credentials slug', () => {
    const result = parseArgs(['--credentials', 'my-zai']);
    assert.strictEqual(result.credentials, 'my-zai');
  });

  it('extracts --print flag', () => {
    const result = parseArgs(['--credentials', 'my-zai', '--print']);
    assert.strictEqual(result.print, true);
  });

  it('extracts command (list)', () => {
    const result = parseArgs(['list']);
    assert.strictEqual(result.command, 'list');
  });

  it('splits at -- separator for claude args', () => {
    const result = parseArgs(['--credentials', 'my-zai', '--', '--model', 'sonnet']);
    assert.strictEqual(result.credentials, 'my-zai');
    assert.deepStrictEqual(result.claudeArgs, ['--model', 'sonnet']);
  });

  it('handles -- with no claude args after it', () => {
    const result = parseArgs(['--credentials', 'my-zai', '--']);
    assert.strictEqual(result.credentials, 'my-zai');
    assert.deepStrictEqual(result.claudeArgs, []);
  });

  it('does not treat args after -- as our flags', () => {
    const result = parseArgs(['--', '--credentials', 'should-be-claude-arg']);
    assert.strictEqual(result.credentials, null);
    assert.deepStrictEqual(result.claudeArgs, ['--credentials', 'should-be-claude-arg']);
  });
});

describe('buildCommand', () => {
  it('formats env vars with claude command', () => {
    const result = buildCommand(
      { ANTHROPIC_BASE_URL: 'https://api.z.ai', ANTHROPIC_AUTH_TOKEN: 'sk-123' },
      []
    );
    assert.ok(result.includes(`ANTHROPIC_BASE_URL='https://api.z.ai'`));
    assert.ok(result.includes(`ANTHROPIC_AUTH_TOKEN='sk-123'`));
    assert.ok(result.includes('claude'));
  });

  it('appends claude args', () => {
    const result = buildCommand({ KEY: 'val' }, ['--model', 'sonnet']);
    assert.ok(result.includes(`'--model' 'sonnet'`));
  });

  it('handles empty env', () => {
    const result = buildCommand({}, []);
    assert.strictEqual(result.trim(), 'claude');
  });

  it('escapes embedded single quotes in values', () => {
    const result = buildCommand({ KEY: `a'b` }, []);
    // POSIX single-quote escape: a'b → 'a'\''b'
    assert.ok(result.includes(`KEY='a'\\''b'`));
  });

  it('wraps values containing shell metacharacters in single quotes', () => {
    const result = buildCommand({ KEY: 'a"$(rm -rf ~)"b' }, []);
    // Everything hazardous is inside single quotes — POSIX shells do not
    // perform substitution, glob, or escape processing inside '...'.
    assert.ok(result.includes(`KEY='a"$(rm -rf ~)"b'`));
  });
});
