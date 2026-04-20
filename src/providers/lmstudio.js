export default {
  id: 'lmstudio',
  name: 'LM Studio (local)',
  fields: [
    { key: 'ANTHROPIC_BASE_URL', label: 'LM Studio URL', type: 'url', required: true, default: 'http://localhost:1234' },
    { key: 'ANTHROPIC_AUTH_TOKEN', label: 'Auth Token', type: 'secret', required: true, default: 'lmstudio' },
    { key: 'ANTHROPIC_DEFAULT_HAIKU_MODEL', label: 'Haiku Model Override', type: 'string', required: false },
    { key: 'ANTHROPIC_DEFAULT_SONNET_MODEL', label: 'Sonnet Model Override', type: 'string', required: false },
    { key: 'ANTHROPIC_DEFAULT_OPUS_MODEL', label: 'Opus Model Override', type: 'string', required: false },
  ],
};
