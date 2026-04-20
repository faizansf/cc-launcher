export default {
  id: 'vllm',
  name: 'vLLM (self-hosted)',
  fields: [
    { key: 'ANTHROPIC_BASE_URL', label: 'vLLM Server URL', type: 'url', required: true, default: 'http://localhost:8000' },
    { key: 'ANTHROPIC_AUTH_TOKEN', label: 'API Key (any non-empty value)', type: 'secret', required: true, default: 'dummy' },
    { key: 'ANTHROPIC_DEFAULT_HAIKU_MODEL', label: 'Haiku Model Override', type: 'string', required: false },
    { key: 'ANTHROPIC_DEFAULT_SONNET_MODEL', label: 'Sonnet Model Override', type: 'string', required: false },
    { key: 'ANTHROPIC_DEFAULT_OPUS_MODEL', label: 'Opus Model Override', type: 'string', required: false },
  ],
};
