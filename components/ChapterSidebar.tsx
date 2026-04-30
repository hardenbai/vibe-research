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
        className={`bg-transparent outline-none border-b border-blue-400 ${className}`}
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
      className={`group flex items-center gap-1 pl-7 pr-2 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${
        isActive ? 'bg-blue-600/80 text-white' : 'text-gray-400 hover:bg-gray-700/60 hover:text-gray-200'
      }`}
      onClick={() => setActiveSubChapter(chapterId, sub.id)}
    >
      <span className="text-gray-600 mr-0.5">└</span>
      <InlineEdit
        value={sub.title}
        onCommit={v => renameSubChapter(chapterId, sub.id, v)}
        className="flex-1 text-xs"
      />
      <button
        onClick={e => { e.stopPropagation(); if (confirm(`删除「${sub.title}」？`)) deleteSubChapter(chapterId, sub.id) }}
        className="opacity-0 group-hover:opacity-100 hover:text-red-400 px-0.5 shrink-0"
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

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style}>
      {/* Chapter row */}
      <div
        className={`group flex items-center gap-1 px-2 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
          isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
        }`}
        onClick={() => setActiveChapter(chapter.id)}
      >
        <span
          {...attributes} {...listeners}
          className="cursor-grab text-gray-600 hover:text-gray-400 shrink-0 mr-0.5"
          onClick={e => e.stopPropagation()}
        >⠿</span>

        {/* Expand toggle */}
        {(chapter.subChapters ?? []).length > 0 && (
          <button
            onClick={e => { e.stopPropagation(); toggleChapter(chapter.id) }}
            className="text-gray-500 hover:text-gray-300 text-xs w-3 shrink-0"
          >
            {chapter.expanded ? '▾' : '▸'}
          </button>
        )}

        <InlineEdit
          value={chapter.title}
          onCommit={v => renameChapter(chapter.id, v)}
          className="flex-1 text-sm"
        />

        {/* Add sub-chapter */}
        <button
          onClick={e => { e.stopPropagation(); addSubChapter(chapter.id) }}
          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-blue-400 text-xs px-0.5 shrink-0"
          title="添加子章节"
        >+</button>

        {/* Delete chapter */}
        <button
          onClick={e => { e.stopPropagation(); if (confirm(`删除「${chapter.title}」及其所有内容？`)) deleteChapter(chapter.id) }}
          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 text-xs px-0.5 shrink-0"
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
    <aside className="w-52 shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-700">
        <h1 className="text-white font-semibold text-sm tracking-wide">Vibe Research</h1>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={chapters.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {chapters.map(chapter => (
              <ChapterItem key={chapter.id} chapter={chapter} />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <div className="p-2 border-t border-gray-700 space-y-1">
        <button
          onClick={addChapter}
          className="w-full text-sm text-gray-400 hover:text-white hover:bg-gray-700 py-2 rounded-lg transition-colors"
        >
          + 新章节
        </button>
        <SettingsPanel />
      </div>
    </aside>
  )
}
