'use client'

import { useRef } from 'react'
import { useStore } from '@/lib/store'
import type { Module, DraftSource } from '@/lib/types'

interface Props {
  chapterId: string
  subChapterId: string | null
  module: Module
}

interface SourceCardProps extends Props {
  source: DraftSource
  index: number
  total: number
}

function SourceCard({ chapterId, subChapterId, module, source, index, total }: SourceCardProps) {
  const { updateDraftSource, removeDraftSource } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const update = (data: Partial<DraftSource>) =>
    updateDraftSource(chapterId, subChapterId, module.id, source.id, data)

  const handleImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => update({ imageBase64: e.target?.result as string })
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) handleImage(file)
  }

  return (
    <div className="flex flex-col gap-2 p-2.5 bg-gray-750 rounded-lg border border-gray-600 relative group/card">
      {/* Source index + remove */}
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">
          来源 {index + 1}
        </span>
        {total > 1 && (
          <button
            onClick={() => removeDraftSource(chapterId, subChapterId, module.id, source.id)}
            className="text-gray-600 hover:text-red-400 text-xs opacity-0 group-hover/card:opacity-100 transition-opacity"
          >✕</button>
        )}
      </div>

      {/* URL */}
      <input
        type="url"
        placeholder="粘贴链接 URL..."
        value={source.url ?? ''}
        onChange={e => update({ url: e.target.value })}
        className="w-full bg-gray-900 text-gray-200 text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-600"
      />

      {source.url && (
        <a href={source.url} target="_blank" rel="noopener noreferrer"
          className="text-blue-400 text-xs truncate hover:underline -mt-1">
          {source.url}
        </a>
      )}

      {/* Screenshot */}
      {source.imageBase64 ? (
        <div className="relative group/img">
          <img src={source.imageBase64} alt="截图"
            className="w-full rounded border border-gray-600 object-contain max-h-40" />
          <button
            onClick={() => update({ imageBase64: undefined })}
            className="absolute top-1 right-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover/img:opacity-100 transition-opacity"
          >删除</button>
        </div>
      ) : (
        <div
          onDrop={handleDrop} onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="border border-dashed border-gray-600 rounded py-2 text-center text-gray-600 text-xs cursor-pointer hover:border-blue-500 hover:text-blue-400 transition-colors"
        >
          点击或拖拽截图
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f) }} />
        </div>
      )}

      {/* Note */}
      <textarea
        placeholder="备注..."
        value={source.note ?? ''}
        onChange={e => update({ note: e.target.value })}
        rows={2}
        className="w-full bg-gray-900 text-gray-200 text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-600 resize-none"
      />
    </div>
  )
}

export default function DraftBlock({ chapterId, subChapterId, module }: Props) {
  const { addDraftSource } = useStore()
  const sources = module.draft.sources ?? []

  return (
    <div className="flex flex-col gap-2 p-3 bg-gray-800 rounded-lg border border-gray-700 min-h-[120px]">
      {sources.map((source, index) => (
        <SourceCard
          key={source.id}
          chapterId={chapterId}
          subChapterId={subChapterId}
          module={module}
          source={source}
          index={index}
          total={sources.length}
        />
      ))}

      <button
        onClick={() => addDraftSource(chapterId, subChapterId, module.id)}
        className="w-full py-1.5 border border-dashed border-gray-600 hover:border-blue-500 text-gray-600 hover:text-blue-400 text-xs rounded-lg transition-colors"
      >
        + 添加信息源
      </button>
    </div>
  )
}
