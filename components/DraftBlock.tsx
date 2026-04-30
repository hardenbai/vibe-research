'use client'

import { useCallback, useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import type { Module, DraftSource } from '@/lib/types'

interface Props {
  chapterId: string
  subChapterId: string | null
  module: Module
}

interface SourceCardProps {
  chapterId: string
  subChapterId: string | null
  module: Module
  source: DraftSource
  index: number
  total: number
  isActive: boolean
  onActivate: () => void
}

const BOOKMARKLET_CODE = `javascript:(function(){const u=encodeURIComponent(location.href);const t=encodeURIComponent(document.title);window.open('https://pb44ujxdftp6y.ok.kimi.link/?captureUrl='+u+'&captureTitle='+t,'_blank');})();`

function SourceCard({ chapterId, subChapterId, module, source, index, total, isActive, onActivate }: SourceCardProps) {
  const { updateDraftSource, removeDraftSource } = useStore()
  const [pasting, setPasting] = useState(false)

  const update = useCallback((data: Partial<DraftSource>) =>
    updateDraftSource(chapterId, subChapterId, module.id, source.id, data),
    [chapterId, subChapterId, module.id, source.id, updateDraftSource]
  )

  const handleImage = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => update({ imageBase64: e.target?.result as string })
    reader.readAsDataURL(file)
  }, [update])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) handleImage(file)
  }

  /** Document-level paste - only active card receives */
  useEffect(() => {
    if (!isActive) return
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          setPasting(true)
          const file = item.getAsFile()
          if (file) handleImage(file)
          setTimeout(() => setPasting(false), 500)
          return
        }
        if (item.type === 'text/plain') {
          item.getAsString(text => {
            const trimmed = text.trim()
            if ((trimmed.startsWith('http://') || trimmed.startsWith('https://')) && !source.url) {
              update({ url: trimmed })
            }
          })
        }
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [isActive, handleImage, source.url, update])

  return (
    <div
      onClick={onActivate}
      className={`flex flex-col gap-2 p-2.5 rounded-lg border relative transition-all cursor-pointer ${
        isActive
          ? 'bg-blue-900/15 border-blue-500/50'
          : 'bg-gray-850 border-gray-600 hover:border-gray-500'
      }`}
    >
      {isActive && <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r" />}

      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${isActive ? 'text-blue-400' : 'text-gray-500'}`}>
          来源 {index + 1}
          {isActive && <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-600/20 text-blue-300 rounded text-[9px] border border-blue-500/20"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />当前</span>}
        </span>
        {total > 1 && (
          <button onClick={e => { e.stopPropagation(); removeDraftSource(chapterId, subChapterId, module.id, source.id) }}
            className="text-gray-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
        )}
      </div>

      <input type="url" placeholder="粘贴链接 URL..." value={source.url ?? ''}
        onChange={e => update({ url: e.target.value })} onClick={e => e.stopPropagation()}
        className="w-full bg-gray-900 text-gray-200 text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-600" />
      {source.url && <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs truncate hover:underline -mt-1">{source.url}</a>}

      {source.imageBase64 ? (
        <div className="relative group/img">
          <img src={source.imageBase64} alt="截图" className="w-full rounded border border-gray-600 object-contain max-h-40" />
          <button onClick={e => { e.stopPropagation(); update({ imageBase64: undefined }) }}
            className="absolute top-1 right-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover/img:opacity-100 transition-opacity">删除</button>
        </div>
      ) : (
        <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={e => e.stopPropagation()}
          className={`border border-dashed rounded py-2.5 text-center text-xs transition-colors select-none ${
            isActive ? 'border-blue-600/50 text-blue-400/80' : 'border-gray-600 text-gray-600'
          }`}>
          {pasting ? <span className="text-blue-400 animate-pulse">粘贴中...</span> : <span>点击、拖拽 或 <kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-400">Ctrl</kbd>+<kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-400">V</kbd> 粘贴截图</span>}
        </div>
      )}

      <textarea placeholder="备注..." value={source.note ?? ''} onChange={e => update({ note: e.target.value })} onClick={e => e.stopPropagation()}
        rows={2} className="w-full bg-gray-900 text-gray-200 text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-600 resize-none" />
    </div>
  )
}

export default function DraftBlock({ chapterId, subChapterId, module }: Props) {
  const { addDraftSource, activeSourceIds, setActiveSource } = useStore()
  const sources = module.draft.sources ?? []
  const activeSourceId = activeSourceIds[module.id]
  const hasValidActive = activeSourceId && sources.some(s => s.id === activeSourceId)

  useEffect(() => {
    if (!hasValidActive && sources.length > 0) {
      setActiveSource(module.id, sources[sources.length - 1].id)
    }
  }, [hasValidActive, sources, module.id, setActiveSource])

  return (
    <div className="flex flex-col gap-2 p-3 bg-gray-800 rounded-lg border border-gray-700 min-h-[120px]">
      {sources.map((source, index) => (
        <SourceCard key={source.id} chapterId={chapterId} subChapterId={subChapterId} module={module}
          source={source} index={index} total={sources.length}
          isActive={source.id === activeSourceId}
          onActivate={() => setActiveSource(module.id, source.id)} />
      ))}

      <button onClick={() => addDraftSource(chapterId, subChapterId, module.id)}
        className="w-full py-1.5 border border-dashed border-gray-600 hover:border-blue-500 text-gray-600 hover:text-blue-400 text-xs rounded-lg transition-colors">
        + 添加信息源
      </button>

      <div className="text-[10px] text-gray-700 mt-1 space-y-1">
        <p>💡 点击来源卡片选中它，然后按 <kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-500">Ctrl</kbd>+<kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-500">V</kbd> 粘贴截图</p>
        <p>🔗 拖拽此链接到书签栏快速收录：<a href={BOOKMARKLET_CODE} className="text-blue-600 hover:underline" title="拖到浏览器书签栏">📎 收录到VibeResearch</a></p>
      </div>
    </div>
  )
}
