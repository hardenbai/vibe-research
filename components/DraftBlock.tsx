'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { captureScreenshot } from '@/lib/screenCapture'
import { setActiveCaptureHandler } from '@/lib/activeCapture'
import { fileToCompressedDataUrl, compressDataUrl } from '@/lib/imageUtils'
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

function SourceCard({ chapterId, subChapterId, module, source, index, total, isActive, onActivate }: SourceCardProps) {
  const { updateDraftSource, removeDraftSource } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pasting, setPasting] = useState(false)
  const [capturing, setCapturing] = useState(false)

  const update = useCallback((data: Partial<DraftSource>) =>
    updateDraftSource(chapterId, subChapterId, module.id, source.id, data),
    [chapterId, subChapterId, module.id, source.id, updateDraftSource]
  )

  const handleImage = useCallback(async (file: File) => {
    try {
      const compressed = await fileToCompressedDataUrl(file)
      update({ imageBase64: compressed })
    } catch { /* ignore */ }
  }, [update])

  const applyCapture = useCallback(async (imageBase64: string, url: string) => {
    const compressed = await compressDataUrl(imageBase64)
    update({ imageBase64: compressed, ...(url ? { url } : {}) })
  }, [update])

  useEffect(() => {
    if (isActive) setActiveCaptureHandler(applyCapture)
  }, [isActive, applyCapture])

  useEffect(() => {
    return () => setActiveCaptureHandler(null)
  }, [])

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) handleImage(file)
  }

  const handleCapture = async () => {
    setActiveCaptureHandler(applyCapture)
    setCapturing(true)
    const result = await captureScreenshot()
    setCapturing(false)
    if (result) applyCapture(result.imageBase64, result.url)
  }

  const inputStyle = {
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    border: `1px solid ${isActive ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
    borderRadius: 6,
    fontSize: 11,
    padding: '5px 8px',
    width: '100%',
    fontFamily: 'var(--font-sans)',
    outline: 'none',
    transition: 'border-color 0.15s',
  }

  return (
    <div
      onClick={onActivate}
      className="flex flex-col gap-2 p-2.5 rounded-lg relative transition-all duration-150 cursor-pointer"
      style={isActive ? {
        background: 'linear-gradient(135deg, rgba(200,168,75,0.05) 0%, rgba(200,168,75,0.02) 100%)',
        border: '1px solid var(--border-gold)',
        boxShadow: '0 0 12px var(--gold-glow)',
      } : {
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Active left bar */}
      {isActive && (
        <div
          className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r"
          style={{ background: 'var(--gold)' }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between pl-1.5">
        <span
          className="text-[9px] font-mono tracking-widest uppercase"
          style={{ color: isActive ? 'var(--gold)' : 'var(--text-muted)' }}
        >
          来源 {index + 1}
          {isActive && (
            <span
              className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded"
              style={{
                background: 'rgba(200,168,75,0.12)',
                border: '1px solid var(--border-gold)',
                color: 'var(--gold-bright)',
                fontSize: 9,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--gold)', animation: 'goldPulse 1.5s ease-in-out infinite' }}
              />
              当前
            </span>
          )}
        </span>
        <div className="flex items-center gap-1.5">
          {isActive && <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>⌘⇧S</span>}
          {total > 1 && (
            <button
              onClick={e => { e.stopPropagation(); removeDraftSource(chapterId, subChapterId, module.id, source.id) }}
              className="text-[10px] transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
            >✕</button>
          )}
        </div>
      </div>

      {/* URL input */}
      <input
        type="url"
        placeholder="粘贴链接 URL..."
        value={source.url ?? ''}
        onChange={e => update({ url: e.target.value })}
        style={{ ...inputStyle, color: source.url ? 'var(--text-primary)' : undefined }}
        onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--gold-dim)' }}
        onBlur={e => { (e.target as HTMLInputElement).style.borderColor = isActive ? 'var(--border-strong)' : 'var(--border-subtle)' }}
      />
      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] truncate -mt-1 hover:underline"
          style={{ color: 'var(--gold-dim)', fontFamily: 'var(--font-mono)' }}
        >{source.url}</a>
      )}

      {/* Image */}
      {source.imageBase64 ? (
        <div className="relative group/img">
          <img
            src={source.imageBase64}
            alt="截图"
            className="w-full rounded object-contain max-h-40"
            style={{ border: '1px solid var(--border-default)' }}
          />
          <button
            onClick={e => { e.stopPropagation(); update({ imageBase64: undefined }) }}
            className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover/img:opacity-100 transition-opacity"
            style={{ background: 'rgba(248,113,113,0.9)', color: 'white' }}
          >删除</button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="rounded py-3 text-center text-[10px] transition-all duration-150 select-none cursor-pointer"
          style={{
            border: `1px dashed ${isActive ? 'var(--gold-dim)' : 'var(--border-default)'}`,
            color: isActive ? 'var(--gold-dim)' : 'var(--text-muted)',
          }}
        >
          {pasting ? (
            <span style={{ color: 'var(--gold)', animation: 'goldPulse 1s infinite' }}>粘贴中...</span>
          ) : (
            <span>点击、拖拽或 <kbd className="px-1 py-0.5 rounded" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 9 }}>⌘V</kbd> 粘贴截图</span>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f) }}
          />
        </div>
      )}

      {/* Capture button */}
      <button
        onClick={handleCapture}
        disabled={capturing}
        className="w-full py-1 text-[10px] rounded transition-all duration-150 disabled:opacity-40"
        style={{
          border: `1px dashed ${isActive ? 'var(--gold-dim)' : 'var(--border-subtle)'}`,
          color: isActive ? 'var(--gold-dim)' : 'var(--text-muted)',
          background: 'transparent',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.borderColor = 'var(--gold-dim)'
          el.style.color = 'var(--gold)'
          el.style.background = 'var(--gold-glow)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.borderColor = isActive ? 'var(--gold-dim)' : 'var(--border-subtle)'
          el.style.color = isActive ? 'var(--gold-dim)' : 'var(--text-muted)'
          el.style.background = 'transparent'
        }}
      >
        {capturing ? '选择捕获区域...' : '📷 捕获屏幕'}
      </button>

      {/* Note textarea */}
      <textarea
        placeholder="备注..."
        value={source.note ?? ''}
        onChange={e => update({ note: e.target.value })}
        rows={2}
        style={{
          ...inputStyle,
          resize: 'none',
          lineHeight: 1.5,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
        }}
        onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--gold-dim)' }}
        onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = isActive ? 'var(--border-strong)' : 'var(--border-subtle)' }}
      />
    </div>
  )
}

export default function DraftBlock({ chapterId, subChapterId, module }: Props) {
  const { addDraftSource, activeSourceId, setActiveSource } = useStore()
  const sources = module.draft.sources ?? []

  return (
    <div
      className="flex flex-col gap-2 p-3 rounded-lg min-h-[120px]"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {sources.map((source, index) => (
        <SourceCard
          key={source.id}
          chapterId={chapterId}
          subChapterId={subChapterId}
          module={module}
          source={source}
          index={index}
          total={sources.length}
          isActive={source.id === activeSourceId}
          onActivate={() => setActiveSource(source.id)}
        />
      ))}

      <button
        onClick={() => addDraftSource(chapterId, subChapterId, module.id)}
        className="w-full py-1.5 rounded-lg text-[10px] transition-all duration-150"
        style={{
          border: '1px dashed var(--border-default)',
          color: 'var(--text-muted)',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.borderColor = 'var(--gold-dim)'
          el.style.color = 'var(--gold)'
          el.style.background = 'var(--gold-glow)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.borderColor = 'var(--border-default)'
          el.style.color = 'var(--text-muted)'
          el.style.background = 'transparent'
        }}
      >
        + 添加信息源
      </button>

      <div className="text-[9px] font-mono mt-0.5" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
        点击卡片后可 <kbd className="px-1 py-0.5 rounded" style={{ background: 'var(--bg-surface)', fontSize: 9 }}>⌘V</kbd> 粘贴截图 或 <kbd className="px-1 py-0.5 rounded" style={{ background: 'var(--bg-surface)', fontSize: 9 }}>⌘⇧S</kbd> 全屏捕获
      </div>
    </div>
  )
}
