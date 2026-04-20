export default {
  id: 'qwen',
  name: 'Qwen (Alibaba Model Studio)',
  fields: [
    { key: 'ANTHROPIC_BASE_URL', label: 'API Base URL', type: 'url', required: true, default: 'https://dashscope-intl.aliyuncs.com/apps/anthropic' },
    { key: 'ANTHROPIC_AUTH_TOKEN', label: 'DashScope API Key', type: 'secret', required: true },
    { key: 'ANTHROPIC_DEFAULT_HAIKU_MODEL', label: 'Haiku Model Override', type: 'string', required: false, default: 'qwen3-coder-plus' },
    { key: 'ANTHROPIC_DEFAULT_SONNET_MODEL', label: 'Sonnet Model Override', type: 'string', required: false, default: 'qwen3-coder-plus' },
    { key: 'ANTHROPIC_DEFAULT_OPUS_MODEL', label: 'Opus Model Override', type: 'string', required: false, default: 'qwen3.6-plus' },
  ],
};
