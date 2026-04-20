export default {
  id: 'vercel',
  name: 'Vercel AI Gateway',
  fields: [
    { key: 'ANTHROPIC_BASE_URL', label: 'Gateway URL', type: 'url', required: true, default: 'https://ai-gateway.vercel.sh' },
    { key: 'ANTHROPIC_AUTH_TOKEN', label: 'Anthropic API Key', type: 'secret', required: true },
    { key: 'ANTHROPIC_CUSTOM_HEADERS', label: 'Gateway API Key Header (x-ai-gateway-api-key: Bearer <key>)', type: 'string', required: false },
    { key: 'ANTHROPIC_DEFAULT_HAIKU_MODEL', label: 'Haiku Model Override', type: 'string', required: false },
    { key: 'ANTHROPIC_DEFAULT_SONNET_MODEL', label: 'Sonnet Model Override', type: 'string', required: false },
    { key: 'ANTHROPIC_DEFAULT_OPUS_MODEL', label: 'Opus Model Override', type: 'string', required: false },
  ],
};
