'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import type {
  AppState, Chapter, SubChapter, Module, Project,
  DraftSource, ReportBlock, AISettings, ProviderId, ModuleType,
  ModelOption,
} from './types'
import { DEFAULT_SETTINGS, DEFAULT_PROVIDER_MODELS } from './providers'

interface Actions {
  // project
  addProject: () => void
  renameProject: (id: string, title: string) => void
  deleteProject: (id: string) => void
  setActiveProject: (id: string) => void

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

  // active source & module — mutually exclusive global selection
  setActiveSource: (sourceId: string | null) => void
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

function makeProject(n: number): Project {
  return { id: uuid(), title: `新项目 ${n}`, createdAt: Date.now(), chapters: [makeChapter(1)] }
}

/** Update the chapters array of the active project */
function updateActiveChapters(
  projects: Project[],
  activeProjectId: string | null,
  fn: (chapters: Chapter[]) => Chapter[]
): Project[] {
  return projects.map(p =>
    p.id === activeProjectId ? { ...p, chapters: fn(p.chapters) } : p
  )
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

/** Selector: get chapters of the active project */
export const selectChapters = (s: AppState & Actions) =>
  s.projects.find(p => p.id === s.activeProjectId)?.chapters ?? []

const initialProject = makeProject(1)

export const useStore = create<AppState & Actions>()(
  persist(
    (set) => ({
      projects: [initialProject],
      activeProjectId: initialProject.id,
      activeChapterId: null,
      activeSubChapterId: null,
      aiSettings: DEFAULT_SETTINGS,
      activeSourceId: null,
      activeModuleId: null,

      // --- project ---
      addProject: () =>
        set(s => {
          const project = makeProject(s.projects.length + 1)
          return {
            projects: [...s.projects, project],
            activeProjectId: project.id,
            activeChapterId: null,
            activeSubChapterId: null,
          }
        }),

      renameProject: (id, title) =>
        set(s => {
          const safe = title.trim() || '未命名项目'
          return { projects: s.projects.map(p => p.id === id ? { ...p, title: safe } : p) }
        }),

      deleteProject: (id) =>
        set(s => {
          const projects = s.projects.filter(p => p.id !== id)
          const activeProjectId = s.activeProjectId === id ? (projects[0]?.id ?? null) : s.activeProjectId
          return {
            projects,
            activeProjectId,
            activeChapterId: null,
            activeSubChapterId: null,
            activeSourceId: null,
            activeModuleId: null,
          }
        }),

      setActiveProject: (id) =>
        set({
          activeProjectId: id,
          activeChapterId: null,
          activeSubChapterId: null,
          activeSourceId: null,
          activeModuleId: null,
        }),

      // --- chapter ---
      addChapter: () =>
        set(s => {
          const chapters = s.projects.find(p => p.id === s.activeProjectId)?.chapters ?? []
          const chapter = makeChapter(chapters.length + 1)
          return {
            projects: updateActiveChapters(s.projects, s.activeProjectId, chs => [...chs, chapter]),
            activeChapterId: chapter.id,
            activeSubChapterId: null,
          }
        }),

      renameChapter: (id, title) =>
        set(s => {
          const safe = title.trim() || '未命名章节'
          return {
            projects: updateActiveChapters(s.projects, s.activeProjectId, chs =>
              chs.map(c => c.id === id ? { ...c, title: safe } : c)
            ),
          }
        }),

      deleteChapter: (id) =>
        set(s => {
          const chapters = (s.projects.find(p => p.id === s.activeProjectId)?.chapters ?? []).filter(c => c.id !== id)
          const activeChapterId = s.activeChapterId === id ? (chapters[0]?.id ?? null) : s.activeChapterId
          return {
            projects: updateActiveChapters(s.projects, s.activeProjectId, chs => chs.filter(c => c.id !== id)),
            activeChapterId,
            activeSubChapterId: null,
            activeSourceId: null,
            activeModuleId: null,
          }
        }),

      reorderChapters: (from, to) =>
        set(s => ({
          projects: updateActiveChapters(s.projects, s.activeProjectId, chs => {
            const arr = [...chs]
            const [moved] = arr.splice(from, 1)
            arr.splice(to, 0, moved)
            return arr
          }),
        })),

      toggleChapter: (id) =>
        set(s => ({
          projects: updateActiveChapters(s.projects, s.activeProjectId, chs =>
            chs.map(c => c.id === id ? { ...c, expanded: !c.expanded } : c)
          ),
        })),

      setActiveChapter: (id) =>
        set(s => ({
          activeChapterId: id,
          activeSubChapterId: null,
          projects: updateActiveChapters(s.projects, s.activeProjectId, chs =>
            chs.map(c => c.id === id ? { ...c, expanded: true } : c)
          ),
        })),

      // --- sub-chapter ---
      addSubChapter: (chapterId) =>
        set(s => {
          const chapters = s.projects.find(p => p.id === s.activeProjectId)?.chapters ?? []
          const chapter = chapters.find(c => c.id === chapterId)!
          const sub = makeSubChapter((chapter.subChapters ?? []).length + 1)
          return {
            projects: updateActiveChapters(s.projects, s.activeProjectId, chs =>
              chs.map(c =>
                c.id === chapterId ? { ...c, subChapters: [...(c.subChapters ?? []), sub], expanded: true } : c
              )
            ),
            activeChapterId: chapterId,
            activeSubChapterId: sub.id,
          }
        }),

      renameSubChapter: (chapterId, subId, title) =>
        set(s => {
          const safe = title.trim() || '未命名子章节'
          return {
            projects: updateActiveChapters(s.projects, s.activeProjectId, chs =>
              chs.map(c =>
                c.id === chapterId
                  ? { ...c, subChapters: (c.subChapters ?? []).map(sc => sc.id === subId ? { ...sc, title: safe } : sc) }
                  : c
              )
            ),
          }
        }),

      deleteSubChapter: (chapterId, subId) =>
        set(s => ({
          projects: updateActiveChapters(s.projects, s.activeProjectId, chs =>
            chs.map(c =>
              c.id === chapterId
                ? { ...c, subChapters: (c.subChapters ?? []).filter(sc => sc.id !== subId) }
                : c
            )
          ),
          activeSubChapterId: s.activeSubChapterId === subId ? null : s.activeSubChapterId,
          activeSourceId: null,
          activeModuleId: null,
        })),

      setActiveSubChapter: (chapterId, subId) =>
        set({ activeChapterId: chapterId, activeSubChapterId: subId }),

      // --- modules ---
      addModule: (chapterId, subChapterId, type = 'text') =>
        set(s => ({
          projects: updateActiveChapters(s.projects, s.activeProjectId, chs =>
            mapModules(chs, chapterId, subChapterId, ms => [...ms, makeModule(type)])
          ),
        })),

      reorderModules: (chapterId, subChapterId, from, to) =>
        set(s => ({
          projects: updateActiveChapters(s.projects, s.activeProjectId, chs =>
            mapModules(chs, chapterId, subChapterId, ms => {
              const arr = [...ms]
              const [moved] = arr.splice(from, 1)
              arr.splice(to, 0, moved)
              return arr
            })
          ),
        })),

      updateReport: (chapterId, subChapterId, moduleId, report) =>
        set(s => ({
          projects: updateActiveChapters(s.projects, s.activeProjectId, chs =>
            mapModules(chs, chapterId, subChapterId, ms =>
              ms.map(m => m.id === moduleId ? { ...m, report: { ...m.report, ...report } } : m)
            )
          ),
        })),

      // --- draft sources ---
      addDraftSource: (chapterId, subChapterId, moduleId) =>
        set(s => {
          const newSource = makeSource()
          return {
            projects: updateActiveChapters(s.projects, s.activeProjectId, chs =>
              mapSources(chs, chapterId, subChapterId, moduleId, srcs => [...srcs, newSource])
            ),
            activeSourceId: newSource.id,
            activeModuleId: null,
          }
        }),

      deleteModule: (chapterId, subChapterId, moduleId) =>
        set(s => ({
          projects: updateActiveChapters(s.projects, s.activeProjectId, chs =>
            mapModules(chs, chapterId, subChapterId, ms => ms.filter(m => m.id !== moduleId))
          ),
          activeModuleId: s.activeModuleId === moduleId ? null : s.activeModuleId,
        })),

      setActiveSource: (sourceId) =>
        set({ activeSourceId: sourceId, activeModuleId: null }),

      setActiveModule: (moduleId) =>
        set(moduleId ? { activeModuleId: moduleId, activeSourceId: null } : { activeModuleId: null }),

      removeDraftSource: (chapterId, subChapterId, moduleId, sourceId) =>
        set(s => ({
          projects: updateActiveChapters(s.projects, s.activeProjectId, chs =>
            mapSources(chs, chapterId, subChapterId, moduleId, srcs =>
              srcs.length > 1 ? srcs.filter(src => src.id !== sourceId) : srcs
            )
          ),
        })),

      updateDraftSource: (chapterId, subChapterId, moduleId, sourceId, data) =>
        set(s => ({
          projects: updateActiveChapters(s.projects, s.activeProjectId, chs =>
            mapSources(chs, chapterId, subChapterId, moduleId, srcs =>
              srcs.map(src => src.id === sourceId ? { ...src, ...data } : src)
            )
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
              modelId: DEFAULT_PROVIDER_MODELS[providerId]?.[0]?.id ?? s.aiSettings.modelId,
            },
          }
        }),
    }),
    {
      name: 'vibe-research-store',
      version: 6,
      // activeSourceId / activeModuleId are ephemeral UI state — don't persist
      partialize: (s) => {
        const { activeSourceId: _a, activeModuleId: _b, ...rest } = s
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return rest as any
      },
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>

        const migrateModule = (m: Record<string, unknown>) => {
          const withType: Record<string, unknown> = { ...m, type: (m.type as string) ?? 'text' }
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

        // v4: add customModels to aiSettings
        const aiSettings = (state.aiSettings as Record<string, unknown> | undefined) ?? {}
        const migratedAISettings = {
          ...aiSettings,
          customModels: (aiSettings.customModels as Record<string, unknown> | undefined) ?? {},
        }

        // v5: drop old activeSourceIds (per-module map), use single global activeSourceId
        const { activeSourceIds: _drop, ...rest } = state as Record<string, unknown> & { activeSourceIds?: unknown }
        void _drop

        // v6: wrap chapters in projects array (if upgrading from pre-v6)
        let projects: unknown[]
        let activeProjectId: string

        if (version < 6 && Array.isArray(state.chapters)) {
          const chapters = (state.chapters as Record<string, unknown>[]).map(migrateChapter)
          activeProjectId = crypto.randomUUID()
          projects = [{ id: activeProjectId, title: '默认项目', createdAt: Date.now(), chapters }]
        } else {
          projects = (state.projects as unknown[]) ?? []
          activeProjectId = (state.activeProjectId as string) ?? (projects[0] as Record<string, unknown>)?.id as string ?? crypto.randomUUID()
          // still migrate chapters inside each project
          projects = (projects as Record<string, unknown>[]).map(p => ({
            ...p,
            chapters: ((p.chapters as Record<string, unknown>[]) ?? []).map(migrateChapter),
          }))
        }

        return {
          ...rest,
          projects,
          activeProjectId,
          activeSubChapterId: (state.activeSubChapterId as string | null) ?? null,
          aiSettings: migratedAISettings,
          activeSourceId: null,
          activeModuleId: null,
        }
      },
    }
  )
)
