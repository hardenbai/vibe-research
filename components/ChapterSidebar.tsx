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

function InlineEdit({ value, onCommit, textStyle = {} }: {
  value: string; onCommit: (v: string) => void; textStyle?: React.CSSProperties
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) ref.current?.select() }, [editing])
  const commit = () => { onCommit(draft.trim() || value); setEditing(false) }
  if (editing) return (
    <input ref={ref} value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      onClick={e => e.stopPropagation()}
      style={{ background: 'transparent', outline: 'none', color: 'var(--t1)', borderBottom: '1px solid var(--accent)', width: '100%', fontFamily: 'var(--font)', ...textStyle }}
    />
  )
  return (
    <span onDoubleClick={() => { setDraft(value); setEditing(true) }}
      style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...textStyle }}>
      {value}
    </span>
  )
}

function SubChapterItem({ chapterId, sub, isActive }: { chapterId: string; sub: SubChapter; isActive: boolean }) {
  const { setActiveSubChapter, renameSubChapter, deleteSubChapter } = useStore()
  return (
    <div onClick={() => setActiveSubChapter(chapterId, sub.id)}
      className="group flex items-center gap-2 cursor-pointer rounded transition-all duration-100"
      style={{
        padding: '4px 8px 4px 26px',
        background: isActive ? 'var(--accent-light)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)' }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
    >
      <InlineEdit value={sub.title} onCommit={v => renameSubChapter(chapterId, sub.id, v)}
        textStyle={{ fontSize: 12, color: isActive ? 'var(--accent)' : 'var(--t3)', flex: 1, fontFamily: 'var(--mono)' }} />
      <button onClick={e => { e.stopPropagation(); if (confirm(`删除「${sub.title}」？`)) deleteSubChapter(chapterId, sub.id) }}
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        style={{ color: 'var(--t4)', fontSize: 10, background: 'none', border: 'none', cursor: 'pointer' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t4)' }}>✕</button>
    </div>
  )
}

function ChapterItem({ chapter }: { chapter: Chapter }) {
  const { activeChapterId, activeSubChapterId, setActiveChapter, renameChapter, deleteChapter, toggleChapter, addSubChapter } = useStore()
  const isActive = chapter.id === activeChapterId && !activeSubChapterId
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id })

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}>
      <div onClick={() => setActiveChapter(chapter.id)}
        className="group flex items-center gap-1.5 cursor-pointer rounded transition-all duration-100"
        style={{
          padding: '5px 8px',
          background: isActive ? 'var(--accent-light)' : 'transparent',
          borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)' }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
      >
        <span {...attributes} {...listeners} onClick={e => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab shrink-0 select-none"
          style={{ color: 'var(--t4)', fontSize: 12 }}>⠿</span>

        {(chapter.subChapters ?? []).length > 0 && (
          <button onClick={e => { e.stopPropagation(); toggleChapter(chapter.id) }}
            className="shrink-0 transition-transform duration-100"
            style={{ color: 'var(--t3)', fontSize: 9, background: 'none', border: 'none', cursor: 'pointer', transform: chapter.expanded ? 'rotate(90deg)' : 'none' }}>▶</button>
        )}

        <InlineEdit value={chapter.title} onCommit={v => renameChapter(chapter.id, v)}
          textStyle={{ fontSize: 12.5, fontWeight: 500, color: isActive ? 'var(--accent)' : 'var(--t2)', fontFamily: 'var(--mono)' }} />

        <div className="ml-auto shrink-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e => { e.stopPropagation(); addSubChapter(chapter.id) }}
            style={{ color: 'var(--t3)', fontSize: 14, lineHeight: 1, padding: '0 3px', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t3)' }}>+</button>
          <button onClick={e => { e.stopPropagation(); if (confirm(`删除「${chapter.title}」？`)) deleteChapter(chapter.id) }}
            style={{ color: 'var(--t3)', fontSize: 10, padding: '0 3px', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t3)' }}>✕</button>
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
    <aside className="shrink-0 flex flex-col h-full"
      style={{ width: 220, background: 'var(--bg-1)', borderRight: '1px solid var(--b1)' }}>

      {/* Brand */}
      <div style={{ padding: '16px 14px 14px', borderBottom: '1px solid var(--b1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Claude-style icon */}
          <div style={{
            width: 24, height: 24, borderRadius: 6, flexShrink: 0,
            background: 'linear-gradient(135deg, #D4915A 0%, #C17840 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1L9.5 4.5L12 3.5L10 7L12 8.5L8.5 9.5L8 12L6.5 9.5L5 12L4.5 9.5L1 8.5L3 7L1 3.5L3.5 4.5L6.5 1Z" fill="white" fillOpacity="0.9"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', fontFamily: 'var(--mono)' }}>
              vibe-research
            </div>
            <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--mono)', marginTop: 1 }}>AI 研究报告系统</div>
          </div>
        </div>
      </div>

      {/* Label */}
      <div style={{ padding: '12px 14px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--mono)' }}>chapters</span>
        <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--mono)' }}>{chapters.length}</span>
      </div>

      {/* Chapter list */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '0 6px 8px' }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter}
          onDragEnd={(e: DragEndEvent) => {
            const { active, over } = e
            if (!over || active.id === over.id) return
            reorderChapters(chapters.findIndex(c => c.id === active.id), chapters.findIndex(c => c.id === over.id))
          }}>
          <SortableContext items={chapters.map(c => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-0.5">{chapters.map(c => <ChapterItem key={c.id} chapter={c} />)}</div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Footer */}
      <div style={{ padding: '6px 6px 8px', borderTop: '1px solid var(--b1)' }}>
        <button onClick={addChapter}
          className="w-full flex items-center gap-2 rounded transition-all duration-100"
          style={{ padding: '7px 10px', color: 'var(--t3)', fontSize: 12.5, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', textAlign: 'left' }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'rgba(255,255,255,0.04)'; el.style.color = 'var(--t2)' }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'transparent'; el.style.color = 'var(--t3)' }}
        >
          <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
          new chapter
        </button>
        <SettingsPanel />
      </div>
    </aside>
  )
}
