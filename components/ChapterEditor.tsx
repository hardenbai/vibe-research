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

function Section({ chapterId, subChapterId, title, onRename, onDelete, modules, level, anchorId }: {
  chapterId: string; subChapterId: string | null; title: string
  onRename: (v: string) => void; onDelete?: () => void
  modules: Module[]; level: 'chapter' | 'subchapter'; anchorId: string
}) {
  const { addModule, reorderModules } = useStore()
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const [draft, setDraft] = useState(title)
  useEffect(() => setDraft(title), [title])
  const commit = () => { if (draft !== title) onRename(draft) }
  const isSub = level === 'subchapter'

  return (
    <section id={anchorId} style={{ scrollMarginTop: 72 }}>
      {isSub && <div style={{ height: 1, background: 'var(--sep)', margin: '40px 0 32px' }} />}

      {/* Title */}
      <div className="group flex items-baseline gap-3" style={{ marginBottom: 20 }}>
        <input value={draft} onChange={e => setDraft(e.target.value)}
          onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--t1)', fontFamily: 'var(--font)',
            fontSize: isSub ? 22 : 30, fontWeight: isSub ? 500 : 700,
            letterSpacing: isSub ? '-0.02em' : '-0.03em', lineHeight: 1.15,
          }}
          placeholder={isSub ? '子章节标题' : '章节标题'}
        />
        {onDelete && (
          <button onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            style={{ fontSize: 12, color: 'var(--t4)', padding: '2px 8px' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t4)' }}
          >删除</button>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {modules.map((m, i) => (
              <ModuleRow key={m.id} chapterId={chapterId} subChapterId={subChapterId} module={m} index={i} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add module */}
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        {(['text', 'chart'] as const).map(type => (
          <button key={type} onClick={() => addModule(chapterId, subChapterId, type)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 500,
              background: 'var(--bg-3)', color: 'var(--t3)', border: '1px solid var(--b1)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'var(--bg-4)'; el.style.color = 'var(--t2)'; el.style.borderColor = 'var(--b2)' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'var(--bg-3)'; el.style.color = 'var(--t3)'; el.style.borderColor = 'var(--b1)' }}
          >{type === 'text' ? '+ 文字模块' : '+ 图表模块'}</button>
        ))}
      </div>
    </section>
  )
}

function modulesToMarkdown(modules: Module[]) {
  const lines: string[] = []
  for (const m of modules) {
    if (m.type === 'text' && m.report.content?.trim()) lines.push(m.report.content.trim(), '')
    else if (m.type === 'chart') {
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

  const exportMd = () => {
    if (!chapter) return
    const lines = [`# ${chapter.title}`, '', ...modulesToMarkdown(chapter.modules)]
    for (const sub of chapter.subChapters) lines.push(`## ${sub.title}`, '', ...modulesToMarkdown(sub.modules))
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown' })),
      download: `${chapter.title}.md`,
    })
    a.click(); URL.revokeObjectURL(a.href)
  }

  useEffect(() => {
    if (!chapter) return
    const id = activeSubChapterId ? `sub-${activeSubChapterId}` : `chap-${chapter.id}`
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [activeChapterId, activeSubChapterId, chapter])

  if (!chapter) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3"
      style={{ background: 'var(--bg-2)' }}>
      <p style={{ fontSize: 22, fontWeight: 600, color: 'var(--t3)', letterSpacing: '-0.02em' }}>选择或新建章节</p>
      <p style={{ fontSize: 14, color: 'var(--t4)' }}>从左侧导航栏开始</p>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-2)' }}>
      {/* Top bar */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center',
        padding: '0 32px', height: 52,
        borderBottom: '1px solid var(--sep)', background: 'var(--bg-1)',
      }}>
        {/* Column labels */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingLeft: 28 }}>
          {['底稿', '报告'].map(l => (
            <span key={l} style={{ fontSize: 11, fontWeight: 600, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</span>
          ))}
        </div>
        {/* Export */}
        <button onClick={exportMd}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: 'var(--bg-3)', color: 'var(--t3)', border: '1px solid var(--b1)',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'var(--bg-4)'; el.style.color = 'var(--t1)'; el.style.borderColor = 'var(--b2)' }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'var(--bg-3)'; el.style.color = 'var(--t3)'; el.style.borderColor = 'var(--b1)' }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1v7.5M3.5 6l3 3 3-3M1 11h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          导出 MD
        </button>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ padding: '40px 40px 80px' }}>
        <div style={{ maxWidth: 1280 }}>
          <Section chapterId={chapter.id} subChapterId={null} title={chapter.title}
            onRename={v => renameChapter(chapter.id, v)}
            modules={chapter.modules} level="chapter" anchorId={`chap-${chapter.id}`} />

          {chapter.subChapters.map(sub => (
            <Section key={sub.id} chapterId={chapter.id} subChapterId={sub.id} title={sub.title}
              onRename={v => renameSubChapter(chapter.id, sub.id, v)}
              onDelete={() => { if (confirm(`删除「${sub.title}」？`)) deleteSubChapter(chapter.id, sub.id) }}
              modules={sub.modules} level="subchapter" anchorId={`sub-${sub.id}`} />
          ))}

          <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--sep)' }}>
            <button onClick={() => addSubChapter(chapter.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--t4)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--blue-hover)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t4)' }}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M7.5 2v11M2 7.5h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              添加子章节
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
