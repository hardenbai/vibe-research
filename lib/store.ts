'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import type {
  AppState, Chapter, SubChapter, Module,
  DraftSource, ReportBlock, AISettings, ProviderId, ModuleType,
  ModelOption,
} from './types'
import { DEFAULT_SETTINGS, DEFAULT_PROVIDER_MODELS } from './providers'

interface Actions {
  // chapter
  addChapter: () => void
  renameChapter: (id: string, title: string) => void
  deleteChapter: (id: string) => void
  reorderChapters: (from: number, to: number) => void
  toggleChapter: (id: string) => void
  setActiveChapter: (id: string) => void

  // sub-chapter
  addSubChapter: (chapterId: string) => void
  renameSubChapter: (chapterId: string, subId: string, title: string) => void
  deleteSubChapter: (chapterId: string, subId: string) => void
  setActiveSubChapter: (chapterId: string, subId: string) => void

  // module
  addModule: (chapterId: string, subChapterId: string | null, type?: ModuleType) => void
  deleteModule: (chapterId: string, subChapterId: string | null, moduleId: string) => void
  reorderModules: (chapterId: string, subChapterId: string | null, from: number, to: number) => void
  updateReport: (chapterId: string, subChapterId: string | null, moduleId: string, report: Partial<ReportBlock>) => void

  // draft sources
  addDraftSource: (chapterId: string, subChapterId: string | null, moduleId: string) => void
  removeDraftSource: (chapterId: string, subChapterId: string | null, moduleId: string, sourceId: string) => void
  updateDraftSource: (chapterId: string, subChapterId: string | null, moduleId: string, sourceId: string, data: Partial<DraftSource>) => void

  // ai settings
  updateAISettings: (settings: Partial<AISettings>) => void
  setApiKey: (providerId: ProviderId, key: string) => void

  // active source & module
  setActiveSource: (moduleId: string, sourceId: string) => void
  setActiveModule: (moduleId: string | null) => void

  // custom models
  setProviderModels: (providerId: ProviderId, models: ModelOption[]) => void
  addProviderModel: (providerId: ProviderId, model: ModelOption) => void
  removeProviderModel: (providerId: ProviderId, modelId: string) => void
  resetProviderModels: (providerId: ProviderId) => void
}

function makeSource(): DraftSource {
  return { id: uuid() }
}

function makeModule(type: ModuleType = 'text'): Module {
  return { id: uuid(), type, draft: { sources: [makeSource()] }, report: { content: '' } }
}

function makeSubChapter(n: number): SubChapter {
  return { id: uuid(), title: `子章节 ${n}`, modules: [makeModule()] }
}

function makeChapter(n: number): Chapter {
  return { id: uuid(), title: `第${n}章`, modules: [makeModule()], subChapters: [], expanded: true }
}

function mapModules(
  chapters: Chapter[],
  chapterId: string,
  subChapterId: string | null,
  fn: (modules: Module[]) => Module[]
): Chapter[] {
  return chapters.map(c => {
    if (c.id !== chapterId) return c
    if (!subChapterId) return { ...c, modules: fn(c.modules) }
    return {
      ...c,
      subChapters: c.subChapters.map(s =>
        s.id === subChapterId ? { ...s, modules: fn(s.modules) } : s
      ),
    }
  })
}

function mapSources(
  chapters: Chapter[],
  chapterId: string,
  subChapterId: string | null,
  moduleId: string,
  fn: (sources: DraftSource[]) => DraftSource[]
): Chapter[] {
  return mapModules(chapters, chapterId, subChapterId, ms =>
    ms.map(m => m.id === moduleId
      ? { ...m, draft: { ...m.draft, sources: fn(m.draft.sources ?? []) } }
      : m
    )
  )
}

export const useStore = create<AppState & Actions>()(
  persist(
    (set) => ({
      chapters: [makeChapter(1)],
      activeChapterId: null,
      activeSubChapterId: null,
      aiSettings: DEFAULT_SETTINGS,
      activeSourceIds: {},
      activeModuleId: null,

      // --- chapter ---
      addChapter: () =>
        set(s => {
          const chapter = makeChapter(s.chapters.length + 1)
          return { chapters: [...s.chapters, chapter], activeChapterId: chapter.id, activeSubChapterId: null }
        }),

      renameChapter: (id, title) =>
        set(s => ({ chapters: s.chapters.map(c => c.id === id ? { ...c, title } : c) })),

      deleteChapter: (id) =>
        set(s => {
          const chapters = s.chapters.filter(c => c.id !== id)
          const activeChapterId = s.activeChapterId === id ? (chapters[0]?.id ?? null) : s.activeChapterId
          return { chapters, activeChapterId, activeSubChapterId: null }
        }),

      reorderChapters: (from, to) =>
        set(s => {
          const chapters = [...s.chapters]
          const [moved] = chapters.splice(from, 1)
          chapters.splice(to, 0, moved)
          return { chapters }
        }),

      toggleChapter: (id) =>
        set(s => ({
          chapters: s.chapters.map(c => c.id === id ? { ...c, expanded: !c.expanded } : c),
        })),

      setActiveChapter: (id) =>
        set(s => ({
          activeChapterId: id,
          activeSubChapterId: null,
          chapters: s.chapters.map(c => c.id === id ? { ...c, expanded: true } : c),
        })),

      // --- sub-chapter ---
      addSubChapter: (chapterId) =>
        set(s => {
          const chapter = s.chapters.find(c => c.id === chapterId)!
          const sub = makeSubChapter((chapter.subChapters ?? []).length + 1)
          return {
            chapters: s.chapters.map(c =>
              c.id === chapterId ? { ...c, subChapters: [...(c.subChapters ?? []), sub], expanded: true } : c
            ),
            activeChapterId: chapterId,
            activeSubChapterId: sub.id,
          }
        }),

      renameSubChapter: (chapterId, subId, title) =>
        set(s => ({
          chapters: s.chapters.map(c =>
            c.id === chapterId
              ? { ...c, subChapters: (c.subChapters ?? []).map(s => s.id === subId ? { ...s, title } : s) }
              : c
          ),
        })),

      deleteSubChapter: (chapterId, subId) =>
        set(s => ({
          chapters: s.chapters.map(c =>
            c.id === chapterId
              ? { ...c, subChapters: (c.subChapters ?? []).filter(s => s.id !== subId) }
              : c
          ),
          activeSubChapterId: s.activeSubChapterId === subId ? null : s.activeSubChapterId,
        })),

      setActiveSubChapter: (chapterId, subId) =>
        set({ activeChapterId: chapterId, activeSubChapterId: subId }),

      // --- modules ---
      addModule: (chapterId, subChapterId, type = 'text') =>
        set(s => ({
          chapters: mapModules(s.chapters, chapterId, subChapterId, ms => [...ms, makeModule(type)]),
        })),

      deleteModule: (chapterId, subChapterId, moduleId) =>
        set(s => ({
          chapters: mapModules(s.chapters, chapterId, subChapterId, ms => ms.filter(m => m.id !== moduleId)),
        })),

      reorderModules: (chapterId, subChapterId, from, to) =>
        set(s => ({
          chapters: mapModules(s.chapters, chapterId, subChapterId, ms => {
            const arr = [...ms]
            const [moved] = arr.splice(from, 1)
            arr.splice(to, 0, moved)
            return arr
          }),
        })),

      updateReport: (chapterId, subChapterId, moduleId, report) =>
        set(s => ({
          chapters: mapModules(s.chapters, chapterId, subChapterId, ms =>
            ms.map(m => m.id === moduleId ? { ...m, report: { ...m.report, ...report } } : m)
          ),
        })),

      // --- draft sources ---
      addDraftSource: (chapterId, subChapterId, moduleId) =>
        set(s => {
          const newSource = makeSource()
          return {
            chapters: mapSources(s.chapters, chapterId, subChapterId, moduleId, srcs => [...srcs, newSource]),
            activeSourceIds: { ...s.activeSourceIds, [moduleId]: newSource.id },
          }
        }),

      setActiveSource: (moduleId, sourceId) =>
        set(s => ({ activeSourceIds: { ...s.activeSourceIds, [moduleId]: sourceId } })),

      setActiveModule: (moduleId) =>
        set({ activeModuleId: moduleId }),

      removeDraftSource: (chapterId, subChapterId, moduleId, sourceId) =>
        set(s => ({
          chapters: mapSources(s.chapters, chapterId, subChapterId, moduleId, srcs =>
            srcs.length > 1 ? srcs.filter(src => src.id !== sourceId) : srcs
          ),
        })),

      updateDraftSource: (chapterId, subChapterId, moduleId, sourceId, data) =>
        set(s => ({
          chapters: mapSources(s.chapters, chapterId, subChapterId, moduleId, srcs =>
            srcs.map(src => src.id === sourceId ? { ...src, ...data } : src)
          ),
        })),

      // --- ai settings ---
      updateAISettings: (settings) =>
        set(s => ({ aiSettings: { ...s.aiSettings, ...settings } })),

      setApiKey: (providerId, key) =>
        set(s => ({
          aiSettings: {
            ...s.aiSettings,
            apiKeys: { ...s.aiSettings.apiKeys, [providerId]: key },
          },
        })),

      // --- custom models ---
      setProviderModels: (providerId, models) =>
        set(s => ({
          aiSettings: {
            ...s.aiSettings,
            customModels: { ...s.aiSettings.customModels, [providerId]: models },
          },
        })),

      addProviderModel: (providerId, model) =>
        set(s => {
          const existing = s.aiSettings.customModels[providerId] ?? DEFAULT_PROVIDER_MODELS[providerId] ?? []
          // Avoid duplicates
          if (existing.some(m => m.id === model.id)) return s
          return {
            aiSettings: {
              ...s.aiSettings,
              customModels: { ...s.aiSettings.customModels, [providerId]: [...existing, model] },
            },
          }
        }),

      removeProviderModel: (providerId, modelId) =>
        set(s => {
          const existing = s.aiSettings.customModels[providerId] ?? DEFAULT_PROVIDER_MODELS[providerId] ?? []
          const filtered = existing.filter(m => m.id !== modelId)
          // If filtered equals default, remove custom entry to fall back to default
          const defaultModels = DEFAULT_PROVIDER_MODELS[providerId] ?? []
          const isSameAsDefault = filtered.length === defaultModels.length &&
            filtered.every((m, i) => m.id === defaultModels[i]?.id && m.label === defaultModels[i]?.label)
          const newCustomModels = { ...s.aiSettings.customModels }
          if (isSameAsDefault || filtered.length === 0) {
            delete newCustomModels[providerId]
          } else {
            newCustomModels[providerId] = filtered
          }
          return {
            aiSettings: {
              ...s.aiSettings,
              customModels: newCustomModels,
            },
          }
        }),

      resetProviderModels: (providerId) =>
        set(s => {
          const newCustomModels = { ...s.aiSettings.customModels }
          delete newCustomModels[providerId]
          return {
            aiSettings: {
              ...s.aiSettings,
              customModels: newCustomModels,
              // Also reset modelId if current one doesn't exist in default
              modelId: DEFAULT_PROVIDER_MODELS[providerId]?.[0]?.id ?? s.aiSettings.modelId,
            },
          }
        }),
    }),
    {
      name: 'vibe-research-store',
      version: 4,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>

        const migrateModule = (m: Record<string, unknown>) => {
          // v2: add type
          const withType: Record<string, unknown> = { ...m, type: (m.type as string) ?? 'text' }
          // v3: convert flat draft → sources array
          const draft = withType.draft as Record<string, unknown> | undefined
          const hasSources = Array.isArray(draft?.sources)
          if (!hasSources) {
            const source = {
              id: crypto.randomUUID(),
              url: draft?.url,
              imageBase64: draft?.imageBase64,
              note: draft?.note,
            }
            withType.draft = { sources: [source] }
          }
          return withType
        }

        const migrateChapter = (c: Record<string, unknown>) => ({
          ...c,
          subChapters: ((c.subChapters as Record<string, unknown>[]) ?? []).map(s => ({
            ...s,
            modules: ((s.modules as Record<string, unknown>[]) ?? []).map(migrateModule),
          })),
          expanded: (c.expanded as boolean) ?? true,
          modules: ((c.modules as Record<string, unknown>[]) ?? []).map(migrateModule),
        })

        const chapters = ((state.chapters as Record<string, unknown>[]) ?? []).map(migrateChapter)

        // v4: add customModels to aiSettings
        const aiSettings = (state.aiSettings as Record<string, unknown> | undefined) ?? {}
        const migratedAISettings = {
          ...aiSettings,
          customModels: (aiSettings.customModels as Record<string, unknown> | undefined) ?? {},
        }

        return {
          ...state,
          chapters,
          activeSubChapterId: (state.activeSubChapterId as string | null) ?? null,
          aiSettings: migratedAISettings,
        }
      },
    }
  )
)
