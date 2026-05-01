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
  const isSub = level === 'subchapter'

  return (
    <section id={anchorId} style={{ scrollMarginTop: 56 }}>
      {isSub && <div style={{ height: 1, background: 'var(--b1)', margin: '32px 0 24px' }} />}

      {/* Title row */}
      <div className="group flex items-baseline gap-3" style={{ marginBottom: 16 }}>
        <span style={{
          fontSize: 10, fontWeight: 600, color: 'var(--accent)', fontFamily: 'var(--mono)',
          textTransform: 'uppercase', letterSpacing: '0.08em', paddingTop: 4, flexShrink: 0,
        }}>{isSub ? '##' : '#'}</span>
        <input value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => { if (draft !== title) onRename(draft) }}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--t1)', fontFamily: 'var(--font)',
            fontSize: isSub ? 18 : 24, fontWeight: isSub ? 600 : 700,
            letterSpacing: isSub ? '-0.02em' : '-0.03em',
          }}
          placeholder={isSub ? 'Sub-chapter title' : 'Chapter title'}
        />
        {onDelete && (
          <button onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs shrink-0"
            style={{ color: 'var(--t4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t4)' }}>rm</button>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {modules.map((m, i) => <ModuleRow key={m.id} chapterId={chapterId} subChapterId={subChapterId} module={m} index={i} />)}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add buttons */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {(['text', 'chart'] as const).map(type => (
          <button key={type} onClick={() => addModule(chapterId, subChapterId, type)}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 6, fontSize: 11.5, fontWeight: 500,
              background: 'transparent', color: 'var(--t4)', cursor: 'pointer',
              border: '1px dashed var(--b1)', transition: 'all 0.12s',
              fontFamily: 'var(--mono)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.borderColor = type === 'chart' ? 'rgba(191,90,242,0.3)' : 'var(--accent-border)'
              el.style.color = type === 'chart' ? '#bf5af2' : 'var(--accent)'
              el.style.background = type === 'chart' ? 'rgba(191,90,242,0.06)' : 'var(--accent-light)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.borderColor = 'var(--b1)'; el.style.color = 'var(--t4)'; el.style.background = 'transparent'
            }}
          >+ {type === 'text' ? 'text block' : 'chart block'}</button>
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

export default function ChapterEditor() {
  const { chapters, activeChapterId, activeSubChapterId, renameChapter, renameSubChapter, addSubChapter, deleteSubChapter } = useStore()
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

  if (!chapter) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)', gap: 10 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: 'linear-gradient(135deg, #D4915A 0%, #C17840 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
      }}>
        <svg width="20" height="20" viewBox="0 0 13 13" fill="none">
          <path d="M6.5 1L9.5 4.5L12 3.5L10 7L12 8.5L8.5 9.5L8 12L6.5 9.5L5 12L4.5 9.5L1 8.5L3 7L1 3.5L3.5 4.5L6.5 1Z" fill="white" fillOpacity="0.9"/>
        </svg>
      </div>
      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--t2)', fontFamily: 'var(--mono)' }}>select a chapter</p>
      <p style={{ fontSize: 12, color: 'var(--t4)', fontFamily: 'var(--mono)' }}>or create a new one →</p>
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-0)' }}>
      {/* Top bar */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 44,
        background: 'var(--bg-1)', borderBottom: '1px solid var(--b1)',
      }}>
        {/* breadcrumb + column labels */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
          <span style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'var(--mono)' }}>
            {chapter.title}{activeSubChapterId ? ` / ${chapter.subChapters.find(s => s.id === activeSubChapterId)?.title}` : ''}
          </span>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingLeft: 24 }}>
            {['draft', 'report'].map(l => (
              <span key={l} style={{ fontSize: 10, fontWeight: 600, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--mono)' }}>{l}</span>
            ))}
          </div>
        </div>
        {/* Export */}
        <button onClick={exportMd}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
            background: 'transparent', color: 'var(--t3)',
            border: '1px solid var(--b1)', cursor: 'pointer', transition: 'all 0.12s',
            fontFamily: 'var(--mono)',
          }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'var(--accent-light)'; el.style.color = 'var(--accent)'; el.style.borderColor = 'var(--accent-border)' }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'transparent'; el.style.color = 'var(--t3)'; el.style.borderColor = 'var(--b1)' }}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v7M3.5 5.5L6 8l2.5-2.5M1 10.5h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          export .md
        </button>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 80px' }}>
        <div style={{ maxWidth: 1360 }}>
          <Section chapterId={chapter.id} subChapterId={null} title={chapter.title}
            onRename={v => renameChapter(chapter.id, v)}
            modules={chapter.modules} level="chapter" anchorId={`chap-${chapter.id}`} />

          {chapter.subChapters.map(sub => (
            <Section key={sub.id} chapterId={chapter.id} subChapterId={sub.id} title={sub.title}
              onRename={v => renameSubChapter(chapter.id, sub.id, v)}
              onDelete={() => { if (confirm(`删除「${sub.title}」？`)) deleteSubChapter(chapter.id, sub.id) }}
              modules={sub.modules} level="subchapter" anchorId={`sub-${sub.id}`} />
          ))}

          <div style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid var(--b1)' }}>
            <button onClick={() => addSubChapter(chapter.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--t4)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.12s', fontFamily: 'var(--mono)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t4)' }}
            >
              + add sub-chapter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
