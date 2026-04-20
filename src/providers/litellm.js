export default {
  id: 'litellm',
  name: 'LiteLLM (proxy)',
  fields: [
    { key: 'ANTHROPIC_BASE_URL', label: 'LiteLLM Proxy URL', type: 'url', required: true, default: 'http://localhost:4000' },
    { key: 'ANTHROPIC_AUTH_TOKEN', label: 'Master Key', type: 'secret', required: true },
    { key: 'ANTHROPIC_DEFAULT_HAIKU_MODEL', label: 'Haiku Model Override', type: 'string', required: false },
    { key: 'ANTHROPIC_DEFAULT_SONNET_MODEL', label: 'Sonnet Model Override', type: 'string', required: false },
    { key: 'ANTHROPIC_DEFAULT_OPUS_MODEL', label: 'Opus Model Override', type: 'string', required: false },
  ],
};
