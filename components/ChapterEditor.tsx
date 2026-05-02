'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore, selectChapters } from '@/lib/store'
import ModuleRow from './ModuleRow'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { Module } from '@/lib/types'

function Section({ chapterId, subChapterId, title, onRename, onDelete, modules, level, anchorId }: {
  chapterId: string; subChapterId: string | null; title: string
  onRename: (v: string) => void; onDelete?: () => void
  modules: Module[]; level: 'chapter' | 'subchapter'; anchorId: string
}) {
  const { addModule, reorderModules } = useStore()
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const [draft, setDraft] = useState(title)
  useEffect(() => setDraft(title), [title])
  const isSub = level === 'subchapter'

  return (
    <section id={anchorId} style={{ scrollMarginTop: 64 }}>
      {isSub && <hr style={{ border: 'none', borderTop: '1px solid var(--divider)', margin: '36px 0 28px' }} />}

      {/* Title row */}
      <div className="group flex items-baseline gap-3" style={{ marginBottom: 18 }}>
        <input value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => { if (draft !== title) onRename(draft) }}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--t1)', fontFamily: 'var(--font)',
            fontSize: isSub ? 21 : 28, fontWeight: isSub ? 600 : 700,
            letterSpacing: isSub ? '-0.02em' : '-0.03em',
          }}
          placeholder={isSub ? '子章节标题' : '章节标题'}
        />
        {onDelete && (
          <button onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-sm shrink-0"
            style={{ color: 'var(--t4)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t4)' }}>删除</button>
        )}
      </div>

      {/* Modules */}
      <DndContext sensors={sensors} collisionDetection={closestCenter}
        onDragEnd={(e: DragEndEvent) => {
          const { active, over } = e
          if (!over || active.id === over.id) return
          reorderModules(chapterId, subChapterId,
            modules.findIndex(m => m.id === active.id),
            modules.findIndex(m => m.id === over.id))
        }}>
        <SortableContext items={modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {modules.map((m, i) => <ModuleRow key={m.id} chapterId={chapterId} subChapterId={subChapterId} module={m} index={i} />)}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        {(['text', 'chart'] as const).map(type => (
          <button key={type} onClick={() => addModule(chapterId, subChapterId, type)}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 500,
              background: 'var(--card)', color: 'var(--t3)', cursor: 'pointer',
              border: '1.5px dashed var(--divider)', boxShadow: 'none', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.borderColor = type === 'chart' ? 'rgba(191,90,242,0.4)' : 'var(--accent-border)'
              el.style.color = type === 'chart' ? '#9b51c8' : 'var(--accent)'
              el.style.background = type === 'chart' ? 'rgba(191,90,242,0.04)' : 'var(--accent-light)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.borderColor = 'var(--divider)'; el.style.color = 'var(--t3)'; el.style.background = 'var(--card)'
            }}
          >{type === 'text' ? '+ 文字模块' : '+ 图表模块'}</button>
        ))}
      </div>
    </section>
  )
}

function modulesToMd(modules: Module[]) {
  const lines: string[] = []
  for (const m of modules) {
    if (m.type === 'text' && m.report.content?.trim()) lines.push(m.report.content.trim(), '')
    else if (m.type === 'chart') {
      if (m.report.chartTitle) lines.push(`**${m.report.chartTitle}**`)
      if (m.report.chartSource) lines.push(`*来源：${m.report.chartSource}*`)
      if (m.report.chartTitle || m.report.chartSource) lines.push('')
    }
  }
  return lines
}

function countChars(modules: Module[]): number {
  let n = 0
  for (const m of modules) {
    if (m.type === 'text' && m.report.content) n += m.report.content.length
  }
  return n
}

export default function ChapterEditor() {
  const chapters = useStore(selectChapters)
  const { projects, activeProjectId, activeChapterId, activeSubChapterId, renameChapter, renameSubChapter, addSubChapter, deleteSubChapter } = useStore()
  const activeProject = projects.find(p => p.id === activeProjectId)
  const chapter = chapters.find(c => c.id === activeChapterId)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chapter) return
    const id = activeSubChapterId ? `sub-${activeSubChapterId}` : `chap-${chapter.id}`
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [activeChapterId, activeSubChapterId, chapter])

  const exportMd = () => {
    if (!chapter) return
    const lines = [`# ${chapter.title}`, '', ...modulesToMd(chapter.modules)]
    for (const sub of chapter.subChapters) lines.push(`## ${sub.title}`, '', ...modulesToMd(sub.modules))
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown' })),
      download: `${chapter.title}.md`,
    })
    a.click(); URL.revokeObjectURL(a.href)
  }

  if (chapters.length === 0) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--ws-bg)', gap: 8 }}>
      <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--t3)' }}>选择或新建章节</p>
      <p style={{ fontSize: 14, color: 'var(--t4)' }}>从左侧导航开始撰写</p>
    </div>
  )

  const activeSub = chapter && activeSubChapterId ? chapter.subChapters.find(s => s.id === activeSubChapterId) : null
  const totalModules = chapters.reduce((n, c) => n + c.modules.length + c.subChapters.reduce((m, s) => m + s.modules.length, 0), 0)
  const totalChars = chapters.reduce((n, c) => {
    const allMods = [c.modules, ...c.subChapters.map(s => s.modules)]
    return n + allMods.reduce((m, ms) => m + countChars(ms), 0)
  }, 0)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--ws-bg)' }}>
      {/* Top bar */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center',
        padding: '0 32px', height: 48,
        background: 'var(--ws-topbar)', borderBottom: '1px solid var(--divider)',
        gap: 0,
      }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0, minWidth: 0 }}>
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--t4)', flexShrink: 0 }}>
            <path d="M2 4h10M2 7h10M2 10h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {activeProject && (
            <>
              <span style={{
                fontSize: 12, fontWeight: 500, color: 'var(--accent)',
                background: 'var(--accent-light)', borderRadius: 5,
                padding: '2px 7px', flexShrink: 0, whiteSpace: 'nowrap',
              }}>
                {activeProject.title}
              </span>
              {chapter && (
                <svg width="11" height="11" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--t4)', flexShrink: 0, margin: '0 1px' }}>
                  <path d="M3.5 1.5L7 5l-3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </>
          )}
          {chapter ? (
            <>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {chapter.title}
              </span>
              {activeSub && (
                <>
                  <svg width="11" height="11" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--t4)', flexShrink: 0, margin: '0 1px' }}>
                    <path d="M3.5 1.5L7 5l-3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontSize: 13, color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeSub.title}
                  </span>
                </>
              )}
            </>
          ) : (
            <span style={{ fontSize: 14, color: 'var(--t3)' }}>全部章节</span>
          )}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Stats + Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: 'var(--t3)' }}>
            <span style={{ fontWeight: 600, color: 'var(--t2)' }}>{totalModules}</span> 模块
          </span>
          <span style={{ fontSize: 13, color: 'var(--t3)' }}>
            <span style={{ fontWeight: 600, color: 'var(--t2)' }}>{totalChars.toLocaleString()}</span> 字
          </span>
          {chapter && (
            <button onClick={exportMd}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: 'var(--accent)', color: '#fff',
                border: 'none', cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-hover)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)' }}
            >
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v7M3.5 5.5L6 8l2.5-2.5M1 10.5h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              导出
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content — all chapters */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '36px 40px 80px' }}>
        <div style={{ maxWidth: 1280 }}>
          {chapters.map((chap, ci) => (
            <div key={chap.id}>
              {ci > 0 && (
                <hr style={{ border: 'none', borderTop: '2px solid var(--divider)', margin: '56px 0 48px' }} />
              )}

              <Section chapterId={chap.id} subChapterId={null} title={chap.title}
                onRename={v => renameChapter(chap.id, v)}
                modules={chap.modules} level="chapter" anchorId={`chap-${chap.id}`} />

              {chap.subChapters.map(sub => (
                <Section key={sub.id} chapterId={chap.id} subChapterId={sub.id} title={sub.title}
                  onRename={v => renameSubChapter(chap.id, sub.id, v)}
                  onDelete={() => { if (confirm(`删除「${sub.title}」？`)) deleteSubChapter(chap.id, sub.id) }}
                  modules={sub.modules} level="subchapter" anchorId={`sub-${sub.id}`} />
              ))}

              <div style={{ marginTop: 44, paddingTop: 20, borderTop: '1px solid var(--divider)' }}>
                <button onClick={() => addSubChapter(chap.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: 'var(--t4)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t4)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  添加子章节
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
