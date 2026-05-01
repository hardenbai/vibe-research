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
  const { deleteModule, activeModuleId } = useStore()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: module.id })

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }
  const isActive = activeModuleId === module.id
  const isChart = module.type === 'chart'

  return (
    <div ref={setNodeRef} style={style} className="flex gap-3 group">
      {/* Left gutter: drag + index + type */}
      <div className="flex flex-col items-center gap-1.5 pt-3 shrink-0 w-6">
        <span
          {...attributes} {...listeners}
          className="cursor-grab select-none leading-none transition-colors"
          style={{ color: 'var(--text-muted)', fontSize: 14 }}
          onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.color = 'var(--text-secondary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.color = 'var(--text-muted)' }}
        >⠿</span>

        <span
          className="text-[10px] font-mono"
          style={{ color: 'var(--text-muted)' }}
        >{index + 1}</span>

        {/* Type badge */}
        <span
          className="text-[9px] font-mono px-1 py-0.5 rounded leading-none"
          style={isChart
            ? { color: '#c084fc', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }
            : { color: 'var(--gold)', background: 'var(--gold-glow)', border: '1px solid var(--border-gold)' }
          }
        >{isChart ? '图' : '文'}</span>

        {/* Delete */}
        <button
          onClick={() => { if (confirm('删除这个模块？')) deleteModule(chapterId, subChapterId, module.id) }}
          className="text-[10px] opacity-0 group-hover:opacity-100 transition-all mt-1"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
        >✕</button>
      </div>

      {/* Draft + Report */}
      <div className="flex-1 grid grid-cols-2 gap-3 min-w-0">
        <DraftBlock chapterId={chapterId} subChapterId={subChapterId} module={module} />

        {/* Report — gold ring when active */}
        <div
          className="rounded-lg transition-all duration-200"
          style={isActive ? {
            boxShadow: '0 0 0 1px var(--border-gold), 0 0 20px var(--gold-glow)',
          } : {}}
        >
          <ReportBlock chapterId={chapterId} subChapterId={subChapterId} module={module} />
        </div>
      </div>
    </div>
  )
}
