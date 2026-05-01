'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import DraftBlock from './DraftBlock'
import ReportBlock from './ReportBlock'
import { useStore } from '@/lib/store'
import type { Module } from '@/lib/types'

export default function ModuleRow({ chapterId, subChapterId, module, index }: {
  chapterId: string; subChapterId: string | null; module: Module; index: number
}) {
  const { deleteModule, activeModuleId } = useStore()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: module.id })
  const isActive = activeModuleId === module.id
  const isChart = module.type === 'chart'

  return (
    <div ref={setNodeRef}
      style={{ display: 'flex', gap: 12, opacity: isDragging ? 0.35 : 1, transform: CSS.Transform.toString(transform), transition }}
      className="group fade-up"
    >
      {/* Gutter */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 14, width: 20, flexShrink: 0 }}>
        <span {...attributes} {...listeners}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab select-none"
          style={{ color: 'var(--t4)', fontSize: 15 }}>⠿</span>

        <span style={{ fontSize: 11, color: 'var(--t4)', fontVariantNumeric: 'tabular-nums' }}>{index + 1}</span>

        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
          padding: '2px 5px', borderRadius: 4,
          background: isChart ? 'rgba(191,90,242,0.12)' : 'var(--blue-bg)',
          color: isChart ? '#bf5af2' : 'var(--blue)',
          border: `1px solid ${isChart ? 'rgba(191,90,242,0.25)' : 'var(--blue-border)'}`,
        }}>{isChart ? '图' : '文'}</span>

        <button onClick={() => { if (confirm('删除这个模块？')) deleteModule(chapterId, subChapterId, module.id) }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--t4)', fontSize: 12, marginTop: 4, background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t4)' }}
        >✕</button>
      </div>

      {/* Two columns */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, minWidth: 0 }}>
        <DraftBlock chapterId={chapterId} subChapterId={subChapterId} module={module} />
        <div style={{
          borderRadius: 12,
          boxShadow: isActive ? `0 0 0 2px var(--blue), 0 0 20px rgba(10,132,255,0.12)` : 'none',
          transition: 'box-shadow 0.2s',
        }}>
          <ReportBlock chapterId={chapterId} subChapterId={subChapterId} module={module} />
        </div>
      </div>
    </div>
  )
}
