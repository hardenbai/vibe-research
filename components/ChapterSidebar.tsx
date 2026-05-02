'use client'

import { useState, useRef, useEffect } from 'react'
import { useStore, selectChapters } from '@/lib/store'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Chapter, SubChapter, Project } from '@/lib/types'
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
      style={{ background: 'transparent', outline: 'none', color: 'var(--st1)', borderBottom: '1px solid var(--accent)', width: '100%', fontFamily: 'var(--font)', ...textStyle }}
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
      className="group flex items-center gap-2 cursor-pointer rounded-lg transition-all duration-150"
      style={{
        padding: '5px 8px 5px 28px',
        background: isActive ? 'var(--sidebar-active)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'var(--sidebar-hover)' }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
    >
      <InlineEdit value={sub.title} onCommit={v => renameSubChapter(chapterId, sub.id, v)}
        textStyle={{ fontSize: 12.5, color: isActive ? '#6eb0ff' : 'var(--st2)', flex: 1 }} />
      <button onClick={e => { e.stopPropagation(); if (confirm(`删除「${sub.title}」？`)) deleteSubChapter(chapterId, sub.id) }}
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        style={{ color: 'var(--st3)', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--st3)' }}>✕</button>
    </div>
  )
}

function ChapterItem({ chapter }: { chapter: Chapter }) {
  const { activeChapterId, activeSubChapterId, setActiveChapter, renameChapter, deleteChapter, toggleChapter, addSubChapter } = useStore()
  const isActive = chapter.id === activeChapterId && !activeSubChapterId
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id })

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}>
      <div onClick={() => setActiveChapter(chapter.id)}
        className="group flex items-center gap-1.5 cursor-pointer rounded-lg transition-all duration-150"
        style={{
          padding: '7px 8px',
          background: isActive ? 'var(--sidebar-active)' : 'transparent',
          borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'var(--sidebar-hover)' }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
      >
        <span {...attributes} {...listeners} onClick={e => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab shrink-0 select-none"
          style={{ color: 'var(--st3)', fontSize: 14 }}>⠿</span>

        {(chapter.subChapters ?? []).length > 0 && (
          <button onClick={e => { e.stopPropagation(); toggleChapter(chapter.id) }}
            className="shrink-0 transition-transform duration-150"
            style={{ color: 'var(--st3)', fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', transform: chapter.expanded ? 'rotate(90deg)' : 'none' }}>›</button>
        )}

        <InlineEdit value={chapter.title} onCommit={v => renameChapter(chapter.id, v)}
          textStyle={{ fontSize: 13.5, fontWeight: 500, color: isActive ? '#6eb0ff' : 'var(--st1)' }} />

        <div className="ml-auto shrink-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e => { e.stopPropagation(); addSubChapter(chapter.id) }}
            style={{ color: 'var(--st3)', fontSize: 16, lineHeight: 1, padding: '0 4px', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6eb0ff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--st3)' }}>+</button>
          <button onClick={e => { e.stopPropagation(); if (confirm(`删除「${chapter.title}」？`)) deleteChapter(chapter.id) }}
            style={{ color: 'var(--st3)', fontSize: 11, padding: '0 4px', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--st3)' }}>✕</button>
        </div>
      </div>

      {chapter.expanded && (chapter.subChapters ?? []).map(sub => (
        <SubChapterItem key={sub.id} chapterId={chapter.id} sub={sub}
          isActive={chapter.id === activeChapterId && sub.id === activeSubChapterId} />
      ))}
    </div>
  )
}

function ProjectItem({ project }: { project: Project }) {
  const { activeProjectId, setActiveProject, renameProject, deleteProject } = useStore()
  const isActive = project.id === activeProjectId

  return (
    <div
      onClick={() => setActiveProject(project.id)}
      className="group flex items-center gap-2 cursor-pointer rounded-lg transition-all duration-150"
      style={{
        padding: '7px 10px',
        background: isActive ? 'var(--sidebar-active)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'var(--sidebar-hover)' }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
    >
      {/* Dot indicator */}
      <span style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: isActive ? 'var(--accent)' : 'transparent',
        border: isActive ? 'none' : '1.5px solid var(--st3)',
        transition: 'all 0.15s',
      }} />

      <InlineEdit
        value={project.title}
        onCommit={v => renameProject(project.id, v)}
        textStyle={{
          fontSize: 13, fontWeight: isActive ? 500 : 400,
          color: isActive ? '#6eb0ff' : 'var(--st2)',
          flex: 1,
        }}
      />

      <div className="ml-auto shrink-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => {
            e.stopPropagation()
            if (confirm(`删除项目「${project.title}」及其所有章节？`)) deleteProject(project.id)
          }}
          style={{ color: 'var(--st3)', fontSize: 11, padding: '0 3px', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--st3)' }}
        >✕</button>
      </div>
    </div>
  )
}

export default function ChapterSidebar() {
  const { projects, addProject, addChapter, reorderChapters } = useStore()
  const chapters = useStore(selectChapters)
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  return (
    <aside className="w-56 shrink-0 flex flex-col h-full sidebar-scroll"
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}>

      {/* Brand */}
      <div style={{ padding: '22px 18px 18px', borderBottom: '1px solid var(--sidebar-border)' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--st1)', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
          Vibe Research
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--st3)', marginTop: 3 }}>AI 研究报告系统</div>
      </div>

      {/* Projects section */}
      <div style={{ padding: '14px 16px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--st3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>项目</span>
        <span style={{
          fontSize: 10, fontWeight: 600, color: 'var(--st3)',
          background: 'rgba(255,255,255,0.07)', borderRadius: 10,
          padding: '0px 5px', lineHeight: '16px',
        }}>{projects.length}</span>
      </div>

      {/* Project list */}
      <div className="overflow-y-auto sidebar-scroll" style={{ padding: '0 8px', maxHeight: 200 }}>
        <div className="space-y-0.5">
          {projects.map(p => <ProjectItem key={p.id} project={p} />)}
        </div>
      </div>

      {/* Add project button */}
      <div style={{ padding: '4px 8px 8px', borderBottom: '1px solid var(--sidebar-border)' }}>
        <button onClick={addProject}
          className="w-full flex items-center gap-2 rounded-lg transition-all duration-150"
          style={{ padding: '6px 10px', color: 'var(--st3)', fontSize: 12.5, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left' }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'var(--sidebar-hover)'; el.style.color = 'var(--st2)' }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'transparent'; el.style.color = 'var(--st3)' }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          新建项目
        </button>
      </div>

      {/* Chapters section label */}
      <div style={{ padding: '14px 16px 5px' }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--st3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>章节</span>
      </div>

      {/* Chapter list */}
      <div className="flex-1 overflow-y-auto sidebar-scroll" style={{ padding: '0 8px 8px' }}>
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
      <div style={{ padding: '6px 8px 8px', borderTop: '1px solid var(--sidebar-border)' }}>
        <button onClick={addChapter}
          className="w-full flex items-center gap-2.5 rounded-lg transition-all duration-150"
          style={{ padding: '8px 10px', color: 'var(--st2)', fontSize: 13.5, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left' }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'var(--sidebar-hover)'; el.style.color = 'var(--st1)' }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'transparent'; el.style.color = 'var(--st2)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          新建章节
        </button>
        <SettingsPanel />
      </div>
    </aside>
  )
}
