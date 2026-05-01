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
  modules: Module[]
  level: 'chapter' | 'subchapter'
  anchorId: string
}

function Section({ chapterId, subChapterId, title, onRename, modules, level, anchorId }: SectionProps) {
  const { addModule, reorderModules, deleteSubChapter } = useStore()
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const [draft, setDraft] = useState(title)
  useEffect(() => { setDraft(title) }, [title])
  const commit = () => { if (draft !== title) onRename(draft) }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = modules.findIndex(m => m.id === active.id)
    const to = modules.findIndex(m => m.id === over.id)
    reorderModules(chapterId, subChapterId, from, to)
  }

  const isSub = level === 'subchapter'

  return (
    <section id={anchorId} className="space-y-3 scroll-mt-24">
      {/* Section heading */}
      <div
        className="flex items-center gap-3"
        style={isSub ? { paddingTop: 20, borderTop: '1px solid var(--border-subtle)' } : {}}
      >
        {isSub && (
          <span
            className="text-[10px] font-mono tracking-widest uppercase shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >§</span>
        )}
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          className="flex-1 bg-transparent focus:outline-none pb-0.5 transition-colors"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: isSub ? 16 : 20,
            fontWeight: isSub ? 500 : 600,
            color: 'var(--text-primary)',
            borderBottom: '1px solid transparent',
          }}
          placeholder={isSub ? '子章节标题' : '章节标题'}
          onFocus={e => { (e.target as HTMLInputElement).style.borderBottomColor = 'var(--border-strong)' }}
          onBlurCapture={e => { (e.target as HTMLInputElement).style.borderBottomColor = 'transparent' }}
        />
        {isSub && subChapterId && (
          <button
            onClick={() => { if (confirm(`删除「${title}」？`)) deleteSubChapter(chapterId, subChapterId) }}
            className="text-[10px] transition-colors shrink-0 px-1"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
          >✕</button>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
          {modules.map((m, index) => (
            <ModuleRow
              key={m.id}
              chapterId={chapterId}
              subChapterId={subChapterId}
              module={m}
              index={index}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Add module buttons */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => addModule(chapterId, subChapterId, 'text')}
          className="flex-1 py-2 rounded-lg text-xs transition-all duration-150"
          style={{
            border: '1px dashed var(--border-default)',
            color: 'var(--text-muted)',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.borderColor = 'var(--gold-dim)'
            el.style.color = 'var(--gold)'
            el.style.background = 'var(--gold-glow)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.borderColor = 'var(--border-default)'
            el.style.color = 'var(--text-muted)'
            el.style.background = 'transparent'
          }}
        >
          + 文字模块
        </button>
        <button
          onClick={() => addModule(chapterId, subChapterId, 'chart')}
          className="flex-1 py-2 rounded-lg text-xs transition-all duration-150"
          style={{
            border: '1px dashed var(--border-default)',
            color: 'var(--text-muted)',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.borderColor = '#7e22ce'
            el.style.color = '#c084fc'
            el.style.background = 'rgba(168,85,247,0.06)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.borderColor = 'var(--border-default)'
            el.style.color = 'var(--text-muted)'
            el.style.background = 'transparent'
          }}
        >
          + 图表模块
        </button>
      </div>
    </section>
  )
}

function modulesToMarkdown(modules: Module[]): string[] {
  const lines: string[] = []
  for (const m of modules) {
    if (m.type === 'text') {
      if (m.report.content?.trim()) {
        lines.push(m.report.content.trim())
        lines.push('')
      }
    } else if (m.type === 'chart') {
      if (m.report.chartTitle) {
        lines.push(`**${m.report.chartTitle}**`)
      }
      if (m.report.chartSource) {
        lines.push(`*资料来源：${m.report.chartSource}*`)
      }
      if (m.report.chartTitle || m.report.chartSource) lines.push('')
    }
  }
  return lines
}

export default function ChapterEditor() {
  const {
    chapters, activeChapterId, activeSubChapterId,
    renameChapter, renameSubChapter, addSubChapter,
  } = useStore()

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
    const content = lines.join('\n')
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${chapter.title}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (!chapter) return
    const targetId = activeSubChapterId
      ? `sub-${activeSubChapterId}`
      : `chapter-${chapter.id}`
    const el = document.getElementById(targetId)
    if (el && scrollRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [activeChapterId, activeSubChapterId, chapter])

  if (!chapter) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ background: 'var(--bg-surface)' }}>
        <p className="font-display text-2xl font-medium" style={{ color: 'var(--text-muted)' }}>
          选择或新建章节
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
          从左侧导航开始撰写
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
      {/* Column headers */}
      <div
        className="shrink-0 flex items-center gap-3 px-6 py-3"
        style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-panel)' }}
      >
        <div className="w-6 shrink-0" />
        <div className="flex-1 grid grid-cols-2 gap-3">
          <div
            className="text-[10px] font-mono tracking-[0.12em] uppercase px-3"
            style={{ color: 'var(--text-muted)' }}
          >
            底稿
          </div>
          <div
            className="text-[10px] font-mono tracking-[0.12em] uppercase px-3"
            style={{ color: 'var(--text-muted)' }}
          >
            报告
          </div>
        </div>
        <button
          onClick={exportMarkdown}
          title="导出为 Markdown 文件"
          className="shrink-0 text-[10px] font-mono tracking-wider px-2.5 py-1 rounded transition-all duration-150"
          style={{
            border: '1px solid var(--border-default)',
            color: 'var(--text-muted)',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.borderColor = 'var(--gold-dim)'
            el.style.color = 'var(--gold)'
            el.style.background = 'var(--gold-glow)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.borderColor = 'var(--border-default)'
            el.style.color = 'var(--text-muted)'
            el.style.background = 'transparent'
          }}
        >
          ↓ MD
        </button>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        <Section
          chapterId={chapter.id}
          subChapterId={null}
          title={chapter.title}
          onRename={v => renameChapter(chapter.id, v)}
          modules={chapter.modules}
          level="chapter"
          anchorId={`chapter-${chapter.id}`}
        />

        {chapter.subChapters.map(sub => (
          <Section
            key={sub.id}
            chapterId={chapter.id}
            subChapterId={sub.id}
            title={sub.title}
            onRename={v => renameSubChapter(chapter.id, sub.id, v)}
            modules={sub.modules}
            level="subchapter"
            anchorId={`sub-${sub.id}`}
          />
        ))}

        <button
          onClick={() => addSubChapter(chapter.id)}
          className="w-full py-2.5 rounded-lg text-xs transition-all duration-150"
          style={{
            border: '1px dashed var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.borderColor = 'var(--border-strong)'
            el.style.color = 'var(--text-secondary)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.borderColor = 'var(--border-subtle)'
            el.style.color = 'var(--text-muted)'
          }}
        >
          + 添加子章节
        </button>
      </div>
    </div>
  )
}
