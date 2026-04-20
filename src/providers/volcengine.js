export default {
  id: 'volcengine',
  name: 'Volcengine (Doubao)',
  fields: [
    { key: 'ANTHROPIC_BASE_URL', label: 'API Base URL', type: 'url', required: true, default: 'https://ark.cn-beijing.volces.com/api/coding' },
    { key: 'ANTHROPIC_AUTH_TOKEN', label: 'API Key', type: 'secret', required: true },
    { key: 'ANTHROPIC_DEFAULT_HAIKU_MODEL', label: 'Haiku Model Override', type: 'string', required: false, default: 'doubao-seed-2.0-lite' },
    { key: 'ANTHROPIC_DEFAULT_SONNET_MODEL', label: 'Sonnet Model Override', type: 'string', required: false, default: 'doubao-seed-2.0-pro' },
    { key: 'ANTHROPIC_DEFAULT_OPUS_MODEL', label: 'Opus Model Override', type: 'string', required: false, default: 'doubao-seed-2.0-code' },
  ],
};
