import type { ProviderConfig, ModelOption, ProviderId } from './types'

/** Provider 基础配置（不含模型列表） */
export const PROVIDER_CONFIGS: ProviderConfig[] = [
  { id: 'anthropic', label: 'Anthropic (Claude)' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com' },
  { id: 'gemini', label: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  { id: 'zhipu', label: '智谱 AI (GLM)', baseUrl: 'https://open.bigmodel.cn/api/paas/v4' },
  { id: 'kimi', label: 'Kimi (Moonshot)', baseUrl: 'https://api.moonshot.cn/v1' },
  { id: 'minimax', label: 'MiniMax', baseUrl: 'https://api.minimax.chat/v1' },
]

/** 各 Provider 的默认推荐模型 */
export const DEFAULT_PROVIDER_MODELS: Record<ProviderId, ModelOption[]> = {
  anthropic: [
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { id: 'claude-opus-4-7', label: 'Claude Opus 4.7' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  ],
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
    { id: 'o3', label: 'o3' },
  ],
  deepseek: [
    { id: 'deepseek-chat', label: 'DeepSeek V3' },
    { id: 'deepseek-reasoner', label: 'DeepSeek R1' },
  ],
  gemini: [
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  ],
  zhipu: [
    { id: 'glm-4-plus', label: 'GLM-4 Plus' },
    { id: 'glm-4', label: 'GLM-4' },
    { id: 'glm-4-air', label: 'GLM-4 Air' },
    { id: 'glm-4-flash', label: 'GLM-4 Flash' },
  ],
  kimi: [
    { id: 'moonshot-v1-8k', label: 'Moonshot v1 8K' },
    { id: 'moonshot-v1-32k', label: 'Moonshot v1 32K' },
    { id: 'moonshot-v1-128k', label: 'Moonshot v1 128K' },
    { id: 'moonshot-v1-auto', label: 'Moonshot v1 Auto' },
  ],
  minimax: [
    { id: 'abab6.5s-chat', label: 'abab6.5s' },
    { id: 'abab6.5-chat', label: 'abab6.5' },
    { id: 'abab6-chat', label: 'abab6' },
  ],
}

/**
 * 获取指定 Provider 的模型列表。
 * 如果用户有自定义模型列表则优先使用，否则返回默认列表。
 */
export function getProviderModels(
  providerId: ProviderId,
  customModels?: Partial<Record<ProviderId, ModelOption[]>>
): ModelOption[] {
  const custom = customModels?.[providerId]
  if (custom && custom.length > 0) return custom
  return DEFAULT_PROVIDER_MODELS[providerId] ?? []
}

export const DEFAULT_SETTINGS = {
  providerId: 'anthropic' as const,
  modelId: 'claude-sonnet-4-6',
  apiKeys: {},
  customModels: {},
}
