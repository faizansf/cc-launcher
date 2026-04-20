import { getAllCredentials } from '../config.js';
import { getProviderDef } from '../providers/index.js';
import { maskSecret } from '../utils/mask.js';
import pc from 'picocolors';

export function listCredentials() {
  const all = getAllCredentials();
  const slugs = Object.keys(all);

  if (slugs.length === 0) {
    console.log(pc.yellow('\n  No credentials configured yet.\n'));
    return;
  }

  console.log();
  for (const slug of slugs) {
    const c = all[slug];
    const provider = getProviderDef(c.provider);
    const providerName = provider ? provider.name : c.provider;
    const token = c.env.ANTHROPIC_AUTH_TOKEN ? maskSecret(c.env.ANTHROPIC_AUTH_TOKEN) : pc.dim('not set');
    const url = c.env.ANTHROPIC_BASE_URL || pc.dim('not set');

    console.log(`  ${pc.bold(c.name)} ${pc.dim(`[${slug}]`)}`);
    console.log(`    Provider: ${pc.cyan(providerName)}`);
    console.log(`    Base URL: ${url}`);
    console.log(`    API Key:  ${token}`);
    if (c.env.ANTHROPIC_DEFAULT_SONNET_MODEL) {
      console.log(`    Sonnet:   ${c.env.ANTHROPIC_DEFAULT_SONNET_MODEL}`);
    }
    console.log();
  }
}
