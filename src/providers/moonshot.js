export default {
  id: 'moonshot',
  name: 'Moonshot AI (Kimi)',
  fields: [
    { key: 'ANTHROPIC_BASE_URL', label: 'API Base URL', type: 'url', required: true, default: 'https://api.moonshot.ai/anthropic' },
    { key: 'ANTHROPIC_AUTH_TOKEN', label: 'API Key', type: 'secret', required: true },
    { key: 'ANTHROPIC_DEFAULT_HAIKU_MODEL', label: 'Haiku Model Override', type: 'string', required: false, default: 'kimi-k2.5' },
    { key: 'ANTHROPIC_DEFAULT_SONNET_MODEL', label: 'Sonnet Model Override', type: 'string', required: false, default: 'kimi-k2.5' },
    { key: 'ANTHROPIC_DEFAULT_OPUS_MODEL', label: 'Opus Model Override', type: 'string', required: false, default: 'kimi-k2.5' },
  ],
};
