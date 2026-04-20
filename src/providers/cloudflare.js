export default {
  id: 'cloudflare',
  name: 'Cloudflare AI Gateway',
  fields: [
    { key: 'ANTHROPIC_BASE_URL', label: 'Gateway URL (https://gateway.ai.cloudflare.com/v1/<ACCOUNT_ID>/<GATEWAY_ID>/anthropic)', type: 'url', required: true },
    { key: 'ANTHROPIC_AUTH_TOKEN', label: 'Anthropic API Key', type: 'secret', required: true },
    { key: 'ANTHROPIC_DEFAULT_HAIKU_MODEL', label: 'Haiku Model Override', type: 'string', required: false },
    { key: 'ANTHROPIC_DEFAULT_SONNET_MODEL', label: 'Sonnet Model Override', type: 'string', required: false },
    { key: 'ANTHROPIC_DEFAULT_OPUS_MODEL', label: 'Opus Model Override', type: 'string', required: false },
  ],
};
