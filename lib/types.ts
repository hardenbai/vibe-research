export interface DraftSource {
  id: string
  url?: string
  imageBase64?: string
  note?: string
}

export interface DraftBlock {
  sources: DraftSource[]
}

export interface ReportBlock {
  content: string
  chartTitle?: string
  chartImage?: string
  chartSource?: string
}

export type ModuleType = 'text' | 'chart'

export interface Module {
  id: string
  type: ModuleType
  draft: DraftBlock
  report: ReportBlock
}

export interface SubChapter {
  id: string
  title: string
  modules: Module[]
}

export interface Chapter {
  id: string
  title: string
  modules: Module[]
  subChapters: SubChapter[]
  expanded: boolean
}

export type ProviderId = 'anthropic' | 'openai' | 'deepseek' | 'gemini' | 'zhipu' | 'kimi' | 'minimax'

export interface ModelOption {
  id: string
  label: string
}

/** Provider 基础配置，不包含模型列表 */
export interface ProviderConfig {
  id: ProviderId
  label: string
  baseUrl?: string
}

export interface AISettings {
  providerId: ProviderId
  modelId: string
  apiKeys: Partial<Record<ProviderId, string>>
  /** 用户自定义的模型列表，key 为 providerId */
  customModels: Partial<Record<ProviderId, ModelOption[]>>
}

export interface AppState {
  chapters: Chapter[]
  activeChapterId: string | null
  activeSubChapterId: string | null
  aiSettings: AISettings
  /** Per-module active source ID for draft paste targeting */
  activeSourceIds: Record<string, string>
  /** Currently focused module ID for report highlighting */
  activeModuleId: string | null
}
