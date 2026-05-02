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

export interface Project {
  id: string
  title: string
  createdAt: number
  chapters: Chapter[]
}

export interface AppState {
  projects: Project[]
  activeProjectId: string | null
  activeChapterId: string | null
  activeSubChapterId: string | null
  aiSettings: AISettings
  /** Globally active draft source ID (mutually exclusive with activeModuleId) */
  activeSourceId: string | null
  /** Globally active module ID for report highlight (mutually exclusive with activeSourceId) */
  activeModuleId: string | null
}
