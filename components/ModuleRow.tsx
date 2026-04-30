'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import DraftBlock from './DraftBlock'
import ReportBlock from './ReportBlock'
import { useStore } from '@/lib/store'
import type { Module } from '@/lib/types'

interface Props {
  chapterId: string
  subChapterId: string | null
  module: Module
  index: number
}

export default function ModuleRow({ chapterId, subChapterId, module, index }: Props) {
  const { deleteModule } = useStore()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: module.id })

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  const typeLabel = module.type === 'chart' ? '图' : '文'
  const typeBadgeColor = module.type === 'chart'
    ? 'text-purple-400 border-purple-700'
    : 'text-blue-400 border-blue-800'

  return (
    <div ref={setNodeRef} style={style} className="flex gap-3 group">
      {/* Drag handle + index + type badge */}
      <div className="flex flex-col items-center gap-1 pt-3 shrink-0 w-6">
        <span
          {...attributes} {...listeners}
          className="cursor-grab text-gray-600 hover:text-gray-400 text-lg leading-none select-none"
        >⠿</span>
        <span className="text-gray-600 text-xs">{index + 1}</span>
        <span className={`text-[10px] border rounded px-0.5 ${typeBadgeColor}`}>{typeLabel}</span>
        <button
          onClick={() => { if (confirm('删除这个模块？')) deleteModule(chapterId, subChapterId, module.id) }}
          className="text-gray-700 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity mt-1"
        >✕</button>
      </div>

      {/* Draft + Report */}
      <div className="flex-1 grid grid-cols-2 gap-3">
        <DraftBlock chapterId={chapterId} subChapterId={subChapterId} module={module} />
        <ReportBlock chapterId={chapterId} subChapterId={subChapterId} module={module} />
      </div>
    </div>
  )
}
