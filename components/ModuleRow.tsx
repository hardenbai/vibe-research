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
      className="group fade-up"
      style={{ display: 'flex', gap: 8, opacity: isDragging ? 0.3 : 1, transform: CSS.Transform.toString(transform), transition }}
    >
      {/* Gutter */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, paddingTop: 10, width: 18, flexShrink: 0 }}>
        <span {...attributes} {...listeners}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab select-none"
          style={{ color: 'var(--t4)', fontSize: 12 }}>⠿</span>
        <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--mono)' }}>{String(index + 1).padStart(2, '0')}</span>
        <span style={{
          fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
          padding: '2px 4px', borderRadius: 3, fontFamily: 'var(--mono)',
          background: isChart ? 'rgba(191,90,242,0.1)' : 'var(--accent-light)',
          color: isChart ? '#bf5af2' : 'var(--accent)',
          border: `1px solid ${isChart ? 'rgba(191,90,242,0.25)' : 'var(--accent-border)'}`,
        }}>{isChart ? 'img' : 'txt'}</span>
        <button onClick={() => { if (confirm('删除这个模块？')) deleteModule(chapterId, subChapterId, module.id) }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--t4)', fontSize: 10, marginTop: 2, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t4)' }}>rm</button>
      </div>

      {/* Two columns */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, minWidth: 0 }}>
        <DraftBlock chapterId={chapterId} subChapterId={subChapterId} module={module} />
        <div style={{
          borderRadius: 8,
          outline: isActive ? `1px solid var(--accent-border)` : 'none',
          outlineOffset: 2,
          transition: 'outline 0.12s',
        }}>
          <ReportBlock chapterId={chapterId} subChapterId={subChapterId} module={module} />
        </div>
      </div>
    </div>
  )
}
