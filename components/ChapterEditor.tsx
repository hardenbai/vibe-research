'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import ModuleRow from './ModuleRow'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { Module } from '@/lib/types'

interface SectionProps {
  chapterId: string
  subChapterId: string | null
  title: string
  onRename: (v: string) => void
  onDelete?: () => void
  modules: Module[]
  level: 'chapter' | 'subchapter'
  anchorId: string
}

function Section({ chapterId, subChapterId, title, onRename, onDelete, modules, level, anchorId }: SectionProps) {
  const { addModule, reorderModules } = useStore()
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const [draft, setDraft] = useState(title)
  useEffect(() => setDraft(title), [title])
  const commit = () => { if (draft !== title) onRename(draft) }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    reorderModules(chapterId, subChapterId,
      modules.findIndex(m => m.id === active.id),
      modules.findIndex(m => m.id === over.id))
  }

  const isSub = level === 'subchapter'

  return (
    <section id={anchorId} className="scroll-mt-16">
      {/* Divider for sub-sections */}
      {isSub && <div style={{ height: 1, background: 'var(--separator)', margin: '28px 0 24px' }} />}

      {/* Title row */}
      <div className="flex items-center gap-3 mb-4">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-system)',
            fontSize: isSub ? 17 : 22,
            fontWeight: isSub ? 500 : 600,
            letterSpacing: isSub ? '-0.01em' : '-0.02em',
            lineHeight: 1.2,
          }}
          placeholder={isSub ? '子章节标题' : '章节标题'}
        />
        {onDelete && (
          <button onClick={onDelete}
            className="shrink-0 opacity-0 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--text-tertiary)', fontSize: 12, padding: '2px 6px' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)' }}
          >删除</button>
        )}
      </div>

      {/* Modules */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {modules.map((m, index) => (
              <ModuleRow key={m.id} chapterId={chapterId} subChapterId={subChapterId} module={m} index={index} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add module */}
      <div className="flex gap-2 mt-3">
        {[
          { type: 'text' as const, label: '+ 文字模块' },
          { type: 'chart' as const, label: '+ 图表模块' },
        ].map(({ type, label }) => (
          <button key={type} onClick={() => addModule(chapterId, subChapterId, type)}
            className="flex-1 py-2 rounded-xl text-xs font-medium transition-all duration-150"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)', border: 'none' }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'var(--bg-card)'
              el.style.color = 'var(--text-secondary)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'var(--bg-surface)'
              el.style.color = 'var(--text-tertiary)'
            }}
          >{label}</button>
        ))}
      </div>
    </section>
  )
}

function modulesToMarkdown(modules: Module[]): string[] {
  const lines: string[] = []
  for (const m of modules) {
    if (m.type === 'text' && m.report.content?.trim()) {
      lines.push(m.report.content.trim(), '')
    } else if (m.type === 'chart') {
      if (m.report.chartTitle) lines.push(`**${m.report.chartTitle}**`)
      if (m.report.chartSource) lines.push(`*资料来源：${m.report.chartSource}*`)
      if (m.report.chartTitle || m.report.chartSource) lines.push('')
    }
  }
  return lines
}

export default function ChapterEditor() {
  const { chapters, activeChapterId, activeSubChapterId, renameChapter, renameSubChapter, addSubChapter, deleteSubChapter } = useStore()
  const chapter = chapters.find(c => c.id === activeChapterId)
  const scrollRef = useRef<HTMLDivElement>(null)

  const exportMarkdown = () => {
    if (!chapter) return
    const lines: string[] = [`# ${chapter.title}`, '']
    lines.push(...modulesToMarkdown(chapter.modules))
    for (const sub of chapter.subChapters) {
      lines.push(`## ${sub.title}`, '')
      lines.push(...modulesToMarkdown(sub.modules))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href: url, download: `${chapter.title}.md` }).click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (!chapter) return
    const id = activeSubChapterId ? `sub-${activeSubChapterId}` : `chapter-${chapter.id}`
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [activeChapterId, activeSubChapterId, chapter])

  if (!chapter) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2"
        style={{ background: 'var(--bg-base)' }}>
        <p style={{ fontSize: 17, fontWeight: 500, color: 'var(--text-tertiary)' }}>从左侧选择章节</p>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', opacity: 0.6 }}>或创建一个新章节开始撰写</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between px-8 py-3"
        style={{ borderBottom: '1px solid var(--separator)', background: 'var(--bg-panel)' }}>
        {/* Column labels */}
        <div className="flex-1 grid grid-cols-2 gap-4" style={{ paddingLeft: 28 }}>
          {['底稿', '报告'].map(label => (
            <span key={label} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {label}
            </span>
          ))}
        </div>
        {/* Export */}
        <button onClick={exportMarkdown}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-150"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'var(--bg-card)'
            el.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'var(--bg-surface)'
            el.style.color = 'var(--text-secondary)'
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1v7M3.5 5.5l3 3 3-3M1.5 10h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          导出 MD
        </button>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ padding: '32px 40px' }}>
        <div style={{ maxWidth: 1200 }}>
          <Section chapterId={chapter.id} subChapterId={null} title={chapter.title}
            onRename={v => renameChapter(chapter.id, v)}
            modules={chapter.modules} level="chapter" anchorId={`chapter-${chapter.id}`} />

          {chapter.subChapters.map(sub => (
            <Section key={sub.id} chapterId={chapter.id} subChapterId={sub.id} title={sub.title}
              onRename={v => renameSubChapter(chapter.id, sub.id, v)}
              onDelete={() => { if (confirm(`删除「${sub.title}」？`)) deleteSubChapter(chapter.id, sub.id) }}
              modules={sub.modules} level="subchapter" anchorId={`sub-${sub.id}`} />
          ))}

          {/* Add sub-chapter */}
          <div style={{ marginTop: 32 }}>
            <div style={{ height: 1, background: 'var(--separator)', marginBottom: 16 }} />
            <button onClick={() => addSubChapter(chapter.id)}
              className="flex items-center gap-2 transition-all duration-150"
              style={{ color: 'var(--text-tertiary)', fontSize: 13 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              添加子章节
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
