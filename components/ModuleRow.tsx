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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: module.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }
  const isActive = activeModuleId === module.id
  const isChart = module.type === 'chart'

  return (
    <div ref={setNodeRef} style={style} className="flex gap-3 group animate-fade-in">
      {/* Gutter */}
      <div className="flex flex-col items-center gap-2 pt-3 w-5 shrink-0">
        <span {...attributes} {...listeners}
          className="cursor-grab select-none transition-opacity opacity-0 group-hover:opacity-100"
          style={{ color: 'var(--text-tertiary)', fontSize: 13 }}
        >⠿</span>

        <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>{index + 1}</span>

        {/* Type pill */}
        <span style={{
          fontSize: 9, fontWeight: 600, letterSpacing: '0.04em',
          padding: '2px 5px', borderRadius: 4,
          background: isChart ? 'rgba(191,90,242,0.1)' : 'rgba(10,132,255,0.1)',
          color: isChart ? '#bf5af2' : 'var(--accent)',
          textTransform: 'uppercase',
        }}>{isChart ? '图' : '文'}</span>

        <button onClick={() => { if (confirm('删除这个模块？')) deleteModule(chapterId, subChapterId, module.id) }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-tertiary)', fontSize: 11, marginTop: 2 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)' }}
        >✕</button>
      </div>

      {/* Cards */}
      <div className="flex-1 grid grid-cols-2 gap-3 min-w-0">
        <DraftBlock chapterId={chapterId} subChapterId={subChapterId} module={module} />
        {/* Active report card gets a blue ring */}
        <div style={isActive ? {
          borderRadius: 12,
          boxShadow: '0 0 0 2px var(--accent)',
          transition: 'box-shadow 0.15s',
        } : { transition: 'box-shadow 0.15s' }}>
          <ReportBlock chapterId={chapterId} subChapterId={subChapterId} module={module} />
        </div>
      </div>
    </div>
  )
}
