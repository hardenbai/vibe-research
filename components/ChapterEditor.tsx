'use client'

import { useRef, useEffect, useState } from 'react'
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

export default function ChapterEditor() {
  const {
    chapters, activeChapterId, activeSubChapterId,
    addModule, reorderModules, renameChapter, renameSubChapter,
  } = useStore()

  const chapter = chapters.find(c => c.id === activeChapterId)
  const subChapter = activeSubChapterId
    ? chapter?.subChapters.find(s => s.id === activeSubChapterId)
    : null

  const activeTitle = subChapter ? subChapter.title : chapter?.title ?? ''
  const activeModules: Module[] = subChapter ? subChapter.modules : chapter?.modules ?? []

  // Editable title state
  const [titleDraft, setTitleDraft] = useState(activeTitle)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTitleDraft(activeTitle) }, [activeTitle])

  const commitTitle = () => {
    const val = titleDraft.trim()
    if (!val || !chapter) return
    if (subChapter) renameSubChapter(chapter.id, subChapter.id, val)
    else renameChapter(chapter.id, val)
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = activeModules.findIndex(m => m.id === active.id)
    const to = activeModules.findIndex(m => m.id === over.id)
    if (chapter) reorderModules(chapter.id, activeSubChapterId, from, to)
  }

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
      <div className="shrink-0 flex gap-3 px-6 py-3 border-b border-gray-700 bg-gray-900">
        <div className="w-6 shrink-0" />
        <div className="flex-1 grid grid-cols-2 gap-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">底稿</div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">报告</div>
        </div>
      </div>

      {/* Breadcrumb + editable title */}
      <div className="shrink-0 px-6 pt-5 pb-3">
        {subChapter && (
          <p className="text-gray-500 text-xs mb-1">{chapter.title}</p>
        )}
        <input
          ref={titleRef}
          value={titleDraft}
          onChange={e => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={e => { if (e.key === 'Enter') { commitTitle(); titleRef.current?.blur() } }}
          className="w-full bg-transparent text-white text-lg font-semibold focus:outline-none border-b border-transparent focus:border-gray-600 transition-colors pb-0.5 placeholder-gray-600"
          placeholder="章节标题"
        />
      </div>

      {/* Modules */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={activeModules.map(m => m.id)} strategy={verticalListSortingStrategy}>
            {activeModules.map((module, index) => (
              <ModuleRow
                key={module.id}
                chapterId={chapter.id}
                subChapterId={activeSubChapterId}
                module={module}
                index={index}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Add module buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => addModule(chapter.id, activeSubChapterId, 'text')}
            className="flex-1 py-3 border-2 border-dashed border-gray-700 hover:border-blue-500 text-gray-500 hover:text-blue-400 text-sm rounded-lg transition-colors"
          >
            + 文字模块
          </button>
          <button
            onClick={() => addModule(chapter.id, activeSubChapterId, 'chart')}
            className="flex-1 py-3 border-2 border-dashed border-gray-700 hover:border-purple-500 text-gray-500 hover:text-purple-400 text-sm rounded-lg transition-colors"
          >
            + 图表模块
          </button>
        </div>
      </div>
    </div>
  )
}
