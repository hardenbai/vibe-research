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

  // local draft for title — only commit to store on blur / Enter (avoids per-keystroke global re-render)
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
      <div className={`flex items-center gap-2 ${isSub ? 'pt-4 border-t border-gray-800' : ''}`}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          className={`flex-1 bg-transparent text-white focus:outline-none border-b border-transparent focus:border-gray-600 transition-colors pb-0.5 ${
            isSub ? 'text-base font-medium text-gray-200' : 'text-lg font-semibold'
          }`}
          placeholder={isSub ? '子章节标题' : '章节标题'}
        />
        {isSub && subChapterId && (
          <button
            onClick={() => { if (confirm(`删除「${title}」？`)) deleteSubChapter(chapterId, subChapterId) }}
            className="text-gray-600 hover:text-red-400 text-xs px-1"
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

      <div className="flex gap-2">
        <button
          onClick={() => addModule(chapterId, subChapterId, 'text')}
          className="flex-1 py-2 border-2 border-dashed border-gray-700 hover:border-blue-500 text-gray-500 hover:text-blue-400 text-xs rounded-lg transition-colors"
        >
          + 文字模块
        </button>
        <button
          onClick={() => addModule(chapterId, subChapterId, 'chart')}
          className="flex-1 py-2 border-2 border-dashed border-gray-700 hover:border-purple-500 text-gray-500 hover:text-purple-400 text-xs rounded-lg transition-colors"
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

  // Scroll to selected sub-chapter when sidebar selection changes
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
      <div className="flex-1 flex items-center justify-center text-gray-500">
        从左侧选择或新建章节
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Column headers */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-3 border-b border-gray-700 bg-gray-900">
        <div className="w-6 shrink-0" />
        <div className="flex-1 grid grid-cols-2 gap-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">底稿</div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">报告</div>
        </div>
        <button
          onClick={exportMarkdown}
          title="导出为 Markdown 文件"
          className="shrink-0 px-2.5 py-1 text-[11px] text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded transition-colors"
        >
          导出 MD
        </button>
      </div>

      {/* Scrollable content: chapter + all sub-chapters in one continuous view */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Chapter section */}
        <Section
          chapterId={chapter.id}
          subChapterId={null}
          title={chapter.title}
          onRename={v => renameChapter(chapter.id, v)}
          modules={chapter.modules}
          level="chapter"
          anchorId={`chapter-${chapter.id}`}
        />

        {/* All sub-chapter sections */}
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

        {/* Add sub-chapter at bottom */}
        <button
          onClick={() => addSubChapter(chapter.id)}
          className="w-full py-2 border-2 border-dashed border-gray-800 hover:border-gray-600 text-gray-600 hover:text-gray-400 text-xs rounded-lg transition-colors"
        >
          + 添加子章节
        </button>
      </div>
    </div>
  )
}
