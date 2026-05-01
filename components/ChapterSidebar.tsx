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

function InlineEdit({ value, onCommit, className = '' }: {
  value: string; onCommit: (v: string) => void; className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])
  const commit = () => { onCommit(draft.trim() || value); setEditing(false) }
  if (editing) {
    return (
      <input ref={ref} value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'transparent', outline: 'none', color: 'var(--text-primary)',
          borderBottom: '1px solid var(--accent)', width: '100%',
          fontFamily: 'var(--font-system)', fontSize: 'inherit',
        }}
        className={className}
      />
    )
  }
  return (
    <span className={`truncate select-none ${className}`} onDoubleClick={() => { setDraft(value); setEditing(true) }}>
      {value}
    </span>
  )
}

function SubChapterItem({ chapterId, sub, isActive }: {
  chapterId: string; sub: SubChapter; isActive: boolean
}) {
  const { setActiveSubChapter, renameSubChapter, deleteSubChapter } = useStore()
  return (
    <div
      onClick={() => setActiveSubChapter(chapterId, sub.id)}
      className="group flex items-center gap-2 pl-8 pr-3 py-[5px] rounded-lg cursor-pointer transition-colors duration-100"
      style={isActive
        ? { background: 'var(--accent-bg)', color: 'var(--accent)' }
        : { color: 'var(--text-secondary)' }
      }
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)' }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
    >
      {/* Tree line */}
      <span style={{ color: 'var(--text-tertiary)', fontSize: 10, lineHeight: 1 }}>›</span>
      <InlineEdit
        value={sub.title}
        onCommit={v => renameSubChapter(chapterId, sub.id, v)}
        className="flex-1 text-[12px]"
      />
      <button
        onClick={e => { e.stopPropagation(); if (confirm(`删除「${sub.title}」？`)) deleteSubChapter(chapterId, sub.id) }}
        className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0"
        style={{ color: 'var(--text-tertiary)', fontSize: 11 }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)' }}
      >✕</button>
    </div>
  )
}

function ChapterItem({ chapter }: { chapter: Chapter }) {
  const { activeChapterId, activeSubChapterId, setActiveChapter, renameChapter, deleteChapter, toggleChapter, addSubChapter } = useStore()
  const isActive = chapter.id === activeChapterId && !activeSubChapterId
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        onClick={() => setActiveChapter(chapter.id)}
        className="group flex items-center gap-1.5 px-2.5 py-[7px] rounded-lg cursor-pointer transition-colors duration-100"
        style={isActive
          ? { background: 'var(--accent-bg)', color: 'var(--accent)' }
          : { color: 'var(--text-secondary)' }
        }
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)' }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
      >
        {/* Drag handle */}
        <span {...attributes} {...listeners}
          onClick={e => e.stopPropagation()}
          className="cursor-grab shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-tertiary)', fontSize: 12 }}
        >⠿</span>

        {/* Chevron */}
        {(chapter.subChapters ?? []).length > 0 && (
          <button onClick={e => { e.stopPropagation(); toggleChapter(chapter.id) }}
            className="shrink-0 transition-transform duration-150"
            style={{
              color: 'var(--text-tertiary)', fontSize: 10,
              transform: chapter.expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >›</button>
        )}

        <InlineEdit value={chapter.title} onCommit={v => renameChapter(chapter.id, v)}
          className={`flex-1 text-[13px] font-medium ${isActive ? '' : ''}`} />

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0">
          <button onClick={e => { e.stopPropagation(); addSubChapter(chapter.id) }}
            title="添加子章节"
            className="w-5 h-5 flex items-center justify-center rounded"
            style={{ color: 'var(--text-tertiary)', fontSize: 13 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)' }}
          >+</button>
          <button onClick={e => { e.stopPropagation(); if (confirm(`删除「${chapter.title}」？`)) deleteChapter(chapter.id) }}
            className="w-5 h-5 flex items-center justify-center rounded"
            style={{ color: 'var(--text-tertiary)', fontSize: 11 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)' }}
          >✕</button>
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
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    reorderChapters(chapters.findIndex(c => c.id === active.id), chapters.findIndex(c => c.id === over.id))
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col h-full"
      style={{ background: 'var(--bg-panel)', borderRight: '1px solid var(--separator)' }}>

      {/* Brand */}
      <div className="px-5 pt-6 pb-5 shrink-0">
        <h1 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          Vibe Research
        </h1>
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3, letterSpacing: '0.01em' }}>
          AI 研究报告系统
        </p>
      </div>

      {/* Section label */}
      <div className="px-4 pb-1 shrink-0">
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          章节
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-px">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={chapters.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {chapters.map(chapter => <ChapterItem key={chapter.id} chapter={chapter} />)}
          </SortableContext>
        </DndContext>
      </div>

      {/* Footer */}
      <div className="p-2 shrink-0" style={{ borderTop: '1px solid var(--separator)' }}>
        <button onClick={addChapter}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-100"
          style={{ color: 'var(--text-secondary)', fontSize: 13 }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'rgba(255,255,255,0.05)'
            el.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'transparent'
            el.style.color = 'var(--text-secondary)'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>新建章节</span>
        </button>
        <SettingsPanel />
      </div>
    </aside>
  )
}
