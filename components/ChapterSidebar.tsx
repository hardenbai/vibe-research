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

function InlineEdit({
  value, onCommit, className = '',
}: { value: string; onCommit: (v: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  const commit = () => {
    onCommit(draft.trim() || value)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        onClick={e => e.stopPropagation()}
        style={{ background: 'transparent', outline: 'none', borderBottom: '1px solid var(--gold-dim)' }}
        className={`w-full text-[--text-primary] ${className}`}
      />
    )
  }
  return (
    <span className={`truncate ${className}`} onDoubleClick={() => { setDraft(value); setEditing(true) }}>
      {value}
    </span>
  )
}

function SubChapterItem({
  chapterId, sub, isActive,
}: { chapterId: string; sub: SubChapter; isActive: boolean }) {
  const { setActiveSubChapter, renameSubChapter, deleteSubChapter } = useStore()

  return (
    <div
      className="group flex items-center gap-1.5 pl-6 pr-2 py-1.5 rounded cursor-pointer transition-all duration-150"
      style={isActive ? {
        background: 'var(--gold-glow)',
        borderLeft: '2px solid var(--gold)',
        paddingLeft: '22px',
      } : {
        borderLeft: '2px solid transparent',
      }}
      onClick={() => setActiveSubChapter(chapterId, sub.id)}
    >
      <svg width="8" height="8" viewBox="0 0 8 8" className="shrink-0 opacity-30">
        <path d="M1 1 v4 h6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      </svg>
      <InlineEdit
        value={sub.title}
        onCommit={v => renameSubChapter(chapterId, sub.id, v)}
        className={`flex-1 text-xs leading-relaxed ${isActive ? 'text-[--gold-bright]' : 'text-[--text-secondary] group-hover:text-[--text-primary]'}`}
      />
      <button
        onClick={e => { e.stopPropagation(); if (confirm(`删除「${sub.title}」？`)) deleteSubChapter(chapterId, sub.id) }}
        className="opacity-0 group-hover:opacity-100 text-[--text-muted] hover:text-red-400 text-[10px] px-0.5 transition-all shrink-0"
      >✕</button>
    </div>
  )
}

function ChapterItem({ chapter }: { chapter: Chapter }) {
  const {
    activeChapterId, activeSubChapterId,
    setActiveChapter, renameChapter, deleteChapter,
    toggleChapter, addSubChapter,
  } = useStore()

  const isActive = chapter.id === activeChapterId && !activeSubChapterId
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: chapter.id })

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="animate-fade-in-up">
      <div
        className="group flex items-center gap-1.5 px-2 py-2 rounded-md cursor-pointer transition-all duration-150"
        style={isActive ? {
          background: 'linear-gradient(90deg, rgba(200,168,75,0.1) 0%, rgba(200,168,75,0.04) 100%)',
          borderLeft: '2px solid var(--gold)',
          paddingLeft: '6px',
        } : {
          borderLeft: '2px solid transparent',
        }}
        onClick={() => setActiveChapter(chapter.id)}
      >
        {/* Drag handle */}
        <span
          {...attributes} {...listeners}
          className="cursor-grab text-[--text-muted] hover:text-[--text-secondary] shrink-0 select-none leading-none"
          style={{ fontSize: 13 }}
          onClick={e => e.stopPropagation()}
        >⠿</span>

        {/* Expand toggle */}
        {(chapter.subChapters ?? []).length > 0 && (
          <button
            onClick={e => { e.stopPropagation(); toggleChapter(chapter.id) }}
            className="text-[--text-muted] hover:text-[--text-secondary] text-[10px] w-3 shrink-0 transition-colors"
          >
            {chapter.expanded ? '▾' : '▸'}
          </button>
        )}

        <InlineEdit
          value={chapter.title}
          onCommit={v => renameChapter(chapter.id, v)}
          className={`flex-1 text-sm font-medium leading-snug ${isActive ? 'text-[--gold-bright]' : 'text-[--text-secondary] group-hover:text-[--text-primary]'}`}
        />

        {/* Add sub-chapter */}
        <button
          onClick={e => { e.stopPropagation(); addSubChapter(chapter.id) }}
          className="opacity-0 group-hover:opacity-100 text-[--text-muted] hover:text-[--gold] text-xs px-0.5 shrink-0 transition-all"
          title="添加子章节"
        >+</button>

        {/* Delete */}
        <button
          onClick={e => { e.stopPropagation(); if (confirm(`删除「${chapter.title}」及其所有内容？`)) deleteChapter(chapter.id) }}
          className="opacity-0 group-hover:opacity-100 text-[--text-muted] hover:text-red-400 text-xs px-0.5 shrink-0 transition-all"
        >✕</button>
      </div>

      {/* Sub-chapters */}
      {chapter.expanded && (chapter.subChapters ?? []).map(sub => (
        <SubChapterItem
          key={sub.id}
          chapterId={chapter.id}
          sub={sub}
          isActive={chapter.id === activeChapterId && sub.id === activeSubChapterId}
        />
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
    const from = chapters.findIndex(c => c.id === active.id)
    const to = chapters.findIndex(c => c.id === over.id)
    reorderChapters(from, to)
  }

  return (
    <aside
      className="w-52 shrink-0 flex flex-col h-full"
      style={{
        background: 'var(--bg-panel)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      {/* Brand */}
      <div
        className="px-4 pt-5 pb-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-baseline gap-1.5">
          <h1
            className="font-display font-semibold tracking-wide leading-none"
            style={{ fontSize: 16, color: 'var(--text-primary)' }}
          >
            Vibe
          </h1>
          <h1
            className="font-display font-semibold tracking-wide leading-none"
            style={{ fontSize: 16, color: 'var(--gold)' }}
          >
            Research
          </h1>
        </div>
        <p className="mt-1 text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
          AI Research System
        </p>
      </div>

      {/* Chapter label */}
      <div
        className="px-4 pt-3 pb-1.5 shrink-0"
      >
        <span className="text-[9px] font-mono tracking-[0.15em] uppercase" style={{ color: 'var(--text-muted)' }}>
          章节
        </span>
      </div>

      {/* Chapter list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={chapters.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {chapters.map(chapter => (
              <ChapterItem key={chapter.id} chapter={chapter} />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Footer actions */}
      <div
        className="p-2 space-y-1 shrink-0"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <button
          onClick={addChapter}
          className="w-full text-xs py-2 rounded-md transition-all duration-150 text-left px-3 flex items-center gap-2"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--gold)'
            ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--gold-glow)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
            ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
          }}
        >
          <span className="text-base leading-none">+</span>
          <span>新建章节</span>
        </button>
        <SettingsPanel />
      </div>
    </aside>
  )
}
