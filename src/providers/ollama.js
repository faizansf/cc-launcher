export default {
  id: 'ollama',
  name: 'Ollama (local)',
  fields: [
    { key: 'ANTHROPIC_BASE_URL', label: 'Ollama URL', type: 'url', required: true, default: 'http://localhost:11434' },
    { key: 'ANTHROPIC_AUTH_TOKEN', label: 'Auth Token', type: 'secret', required: true, default: 'ollama' },
    { key: 'ANTHROPIC_DEFAULT_HAIKU_MODEL', label: 'Haiku Model Override', type: 'string', required: false },
    { key: 'ANTHROPIC_DEFAULT_SONNET_MODEL', label: 'Sonnet Model Override', type: 'string', required: false },
    { key: 'ANTHROPIC_DEFAULT_OPUS_MODEL', label: 'Opus Model Override', type: 'string', required: false },
  ],
};
