'use client'

import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/lib/store'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Chapter, SubChapter } from '@/lib/types'
import SettingsPanel from './SettingsPanel'

function InlineEdit({ value, onCommit, style = {} }: {
  value: string; onCommit: (v: string) => void; style?: React.CSSProperties
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) ref.current?.select() }, [editing])
  const commit = () => { onCommit(draft.trim() || value); setEditing(false) }
  if (editing) {
    return <input ref={ref} value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      onClick={e => e.stopPropagation()}
      style={{ background: 'transparent', outline: 'none', width: '100%', color: 'var(--t1)', borderBottom: '1px solid var(--blue)', ...style }}
    />
  }
  return <span style={{ ...style, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
    onDoubleClick={() => { setDraft(value); setEditing(true) }}>{value}</span>
}

function SubChapterItem({ chapterId, sub, isActive }: { chapterId: string; sub: SubChapter; isActive: boolean }) {
  const { setActiveSubChapter, renameSubChapter, deleteSubChapter } = useStore()
  return (
    <div onClick={() => setActiveSubChapter(chapterId, sub.id)}
      className="group flex items-center gap-2 cursor-pointer rounded-lg transition-all duration-150"
      style={{
        padding: '6px 12px 6px 28px',
        background: isActive ? 'var(--blue-bg)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--blue)' : '2px solid transparent',
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)' }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
    >
      <InlineEdit value={sub.title} onCommit={v => renameSubChapter(chapterId, sub.id, v)}
        style={{ fontSize: 13, color: isActive ? 'var(--blue-hover)' : 'var(--t3)', flex: 1 }} />
      <button onClick={e => { e.stopPropagation(); if (confirm(`删除「${sub.title}」？`)) deleteSubChapter(chapterId, sub.id) }}
        className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
        style={{ color: 'var(--t4)', fontSize: 12 }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t4)' }}
      >✕</button>
    </div>
  )
}

function ChapterItem({ chapter }: { chapter: Chapter }) {
  const { activeChapterId, activeSubChapterId, setActiveChapter, renameChapter, deleteChapter, toggleChapter, addSubChapter } = useStore()
  const isActive = chapter.id === activeChapterId && !activeSubChapterId
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id })
  const dragStyle = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  return (
    <div ref={setNodeRef} style={dragStyle}>
      <div onClick={() => setActiveChapter(chapter.id)}
        className="group flex items-center gap-2 cursor-pointer rounded-lg transition-all duration-150"
        style={{
          padding: '8px 10px',
          background: isActive ? 'var(--blue-bg)' : 'transparent',
          borderLeft: isActive ? '2px solid var(--blue)' : '2px solid transparent',
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)' }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
      >
        <span {...attributes} {...listeners} onClick={e => e.stopPropagation()}
          className="cursor-grab shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--t4)', fontSize: 14 }}>⠿</span>

        {(chapter.subChapters ?? []).length > 0 && (
          <button onClick={e => { e.stopPropagation(); toggleChapter(chapter.id) }}
            className="shrink-0 transition-transform duration-150"
            style={{ color: 'var(--t4)', fontSize: 11, transform: chapter.expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</button>
        )}

        <InlineEdit value={chapter.title} onCommit={v => renameChapter(chapter.id, v)}
          style={{ fontSize: 14, fontWeight: 500, color: isActive ? 'var(--blue-hover)' : 'var(--t2)' }} />

        <div className="ml-auto shrink-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e => { e.stopPropagation(); addSubChapter(chapter.id) }}
            title="添加子章节" style={{ color: 'var(--t4)', fontSize: 16, lineHeight: 1, padding: '0 3px' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--blue-hover)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t4)' }}>+</button>
          <button onClick={e => { e.stopPropagation(); if (confirm(`删除「${chapter.title}」？`)) deleteChapter(chapter.id) }}
            style={{ color: 'var(--t4)', fontSize: 12, padding: '0 3px' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t4)' }}>✕</button>
        </div>
      </div>

      {chapter.expanded && (chapter.subChapters ?? []).map(sub => (
        <SubChapterItem key={sub.id} chapterId={chapter.id} sub={sub}
          isActive={chapter.id === activeChapterId && sub.id === activeSubChapterId} />
      ))}
    </div>
  )
}

export default function ChapterSidebar() {
  const { chapters, addChapter, reorderChapters } = useStore()
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  return (
    <aside className="w-56 shrink-0 flex flex-col h-full"
      style={{ background: 'var(--bg-1)', borderRight: '1px solid var(--sep)' }}>

      {/* Brand */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--sep)' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
          Vibe Research
        </div>
        <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 4, letterSpacing: '0.01em' }}>
          AI 研究报告系统
        </div>
      </div>

      {/* Label */}
      <div style={{ padding: '16px 16px 6px' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          章节
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '0 8px 8px' }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter}
          onDragEnd={e => {
            const { active, over } = e
            if (!over || active.id === over.id) return
            reorderChapters(chapters.findIndex(c => c.id === active.id), chapters.findIndex(c => c.id === over.id))
          }}>
          <SortableContext items={chapters.map(c => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-0.5">
              {chapters.map(c => <ChapterItem key={c.id} chapter={c} />)}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Footer */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--sep)' }}>
        <button onClick={addChapter}
          className="w-full flex items-center gap-2.5 rounded-lg transition-all duration-150"
          style={{ padding: '9px 12px', color: 'var(--t3)', fontSize: 14, background: 'transparent' }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'rgba(255,255,255,0.06)'; el.style.color = 'var(--t1)' }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'transparent'; el.style.color = 'var(--t3)' }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M7.5 2v11M2 7.5h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          新建章节
        </button>
        <SettingsPanel />
      </div>
    </aside>
  )
}
