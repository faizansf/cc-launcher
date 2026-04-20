export default {
  id: 'nvidia-nim',
  name: 'NVIDIA NIM',
  fields: [
    { key: 'ANTHROPIC_BASE_URL', label: 'NIM Endpoint URL', type: 'url', required: true },
    { key: 'ANTHROPIC_AUTH_TOKEN', label: 'API Key (any non-empty value)', type: 'secret', required: true },
    { key: 'ANTHROPIC_DEFAULT_HAIKU_MODEL', label: 'Haiku Model Override', type: 'string', required: false },
    { key: 'ANTHROPIC_DEFAULT_SONNET_MODEL', label: 'Sonnet Model Override', type: 'string', required: false },
    { key: 'ANTHROPIC_DEFAULT_OPUS_MODEL', label: 'Opus Model Override', type: 'string', required: false },
  ],
};
