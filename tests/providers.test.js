import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getProviderDef, getAllProviders, getProviderChoices } from '../src/providers/index.js';

describe('Provider Registry', () => {
  it('getAllProviders returns at least one provider', () => {
    const providers = getAllProviders();
    assert.ok(Array.isArray(providers));
    assert.ok(providers.length >= 1, 'expected at least z.ai to be registered');
  });

  it('every registered provider matches the schema', () => {
    for (const p of getAllProviders()) {
      assert.ok(p.id, `provider missing id`);
      assert.ok(p.name, `provider ${p.id} missing name`);
      assert.ok(Array.isArray(p.fields), `provider ${p.id} missing fields`);
      for (const f of p.fields) {
        assert.ok(f.key, `field in ${p.id} missing key`);
        assert.ok(f.label, `field ${f.key} missing label`);
        assert.ok(['url', 'secret', 'string'].includes(f.type), `field ${f.key} has invalid type: ${f.type}`);
        assert.strictEqual(typeof f.required, 'boolean', `field ${f.key} missing required boolean`);
      }
    }
  });

  it('getProviderDef returns a registered provider by id', () => {
    const zai = getProviderDef('zai');
    assert.ok(zai, 'zai should be registered');
    assert.strictEqual(zai.id, 'zai');
    assert.strictEqual(zai.name, 'z.ai');
  });

  it('getProviderDef returns null for unknown id', () => {
    assert.strictEqual(getProviderDef('definitely-not-a-provider'), null);
  });

  it('getProviderChoices returns { name, value } shaped entries', () => {
    const choices = getProviderChoices();
    assert.ok(Array.isArray(choices));
    for (const c of choices) {
      assert.ok('name' in c);
      assert.ok('value' in c);
    }
  });

  it('z.ai requires base URL and auth token', () => {
    const zai = getProviderDef('zai');
    const required = zai.fields.filter(f => f.required).map(f => f.key);
    assert.ok(required.includes('ANTHROPIC_BASE_URL'));
    assert.ok(required.includes('ANTHROPIC_AUTH_TOKEN'));
  });
});
