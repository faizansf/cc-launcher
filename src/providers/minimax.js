export default {
  id: 'minimax',
  name: 'MiniMax',
  fields: [
    { key: 'ANTHROPIC_BASE_URL', label: 'API Base URL', type: 'url', required: true, default: 'https://api.minimax.io/anthropic' },
    { key: 'ANTHROPIC_AUTH_TOKEN', label: 'API Key', type: 'secret', required: true },
    { key: 'ANTHROPIC_DEFAULT_HAIKU_MODEL', label: 'Haiku Model Override', type: 'string', required: false, default: 'MiniMax-M2.7' },
    { key: 'ANTHROPIC_DEFAULT_SONNET_MODEL', label: 'Sonnet Model Override', type: 'string', required: false, default: 'MiniMax-M2.7' },
    { key: 'ANTHROPIC_DEFAULT_OPUS_MODEL', label: 'Opus Model Override', type: 'string', required: false, default: 'MiniMax-M2.7' },
  ],
};
