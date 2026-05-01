'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { captureScreenshot } from '@/lib/screenCapture'
import { setActiveCaptureHandler } from '@/lib/activeCapture'
import { fileToCompressedDataUrl, compressDataUrl } from '@/lib/imageUtils'
import type { Module, DraftSource } from '@/lib/types'

interface Props { chapterId: string; subChapterId: string | null; module: Module }
interface SourceCardProps {
  chapterId: string; subChapterId: string | null; module: Module
  source: DraftSource; index: number; total: number
  isActive: boolean; onActivate: () => void
}

const inputBase: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-base)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  padding: '6px 10px',
  fontFamily: 'var(--font-system)',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

function SourceCard({ chapterId, subChapterId, module, source, index, total, isActive, onActivate }: SourceCardProps) {
  const { updateDraftSource, removeDraftSource } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pasting, setPasting] = useState(false)
  const [capturing, setCapturing] = useState(false)

  const update = useCallback((data: Partial<DraftSource>) =>
    updateDraftSource(chapterId, subChapterId, module.id, source.id, data),
    [chapterId, subChapterId, module.id, source.id, updateDraftSource])

  const handleImage = useCallback(async (file: File) => {
    const compressed = await fileToCompressedDataUrl(file).catch(() => '')
    if (compressed) update({ imageBase64: compressed })
  }, [update])

  const applyCapture = useCallback(async (imageBase64: string, url: string) => {
    const compressed = await compressDataUrl(imageBase64)
    update({ imageBase64: compressed, ...(url ? { url } : {}) })
  }, [update])

  useEffect(() => { if (isActive) setActiveCaptureHandler(applyCapture) }, [isActive, applyCapture])
  useEffect(() => () => setActiveCaptureHandler(null), [])

  useEffect(() => {
    if (!isActive) return
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault(); setPasting(true)
          const f = item.getAsFile(); if (f) handleImage(f)
          setTimeout(() => setPasting(false), 500); return
        }
        if (item.type === 'text/plain') {
          item.getAsString(t => {
            const s = t.trim()
            if ((s.startsWith('http://') || s.startsWith('https://')) && !source.url) update({ url: s })
          })
        }
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [isActive, handleImage, source.url, update])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f?.type.startsWith('image/')) handleImage(f)
  }

  const handleCapture = async () => {
    setActiveCaptureHandler(applyCapture); setCapturing(true)
    const r = await captureScreenshot(); setCapturing(false)
    if (r) applyCapture(r.imageBase64, r.url)
  }

  const focusStyle = (el: HTMLElement, focused: boolean) => {
    el.style.borderColor = focused ? 'var(--accent-border)' : 'var(--border)'
    el.style.boxShadow = focused ? '0 0 0 3px var(--accent-bg)' : 'none'
  }

  return (
    <div onClick={onActivate}
      className="flex flex-col gap-2 p-3 rounded-xl relative transition-all duration-150 cursor-pointer"
      style={isActive ? {
        background: 'var(--bg-base)',
        border: '1px solid var(--accent-border)',
        boxShadow: '0 0 0 3px var(--accent-bg)',
      } : {
        background: 'var(--bg-base)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }}>
            来源 {index + 1}
          </span>
          {isActive && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--accent-bg)', fontSize: 10, color: 'var(--accent)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)', animation: 'pulse-dot 1.5s infinite' }} />
              当前
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isActive && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>⌘⇧S</span>}
          {total > 1 && (
            <button onClick={e => { e.stopPropagation(); removeDraftSource(chapterId, subChapterId, module.id, source.id) }}
              style={{ color: 'var(--text-tertiary)', fontSize: 11 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)' }}
            >✕</button>
          )}
        </div>
      </div>

      {/* URL */}
      <input type="url" placeholder="粘贴链接 URL..."
        value={source.url ?? ''}
        onChange={e => update({ url: e.target.value })}
        style={inputBase}
        onFocus={e => focusStyle(e.target as HTMLElement, true)}
        onBlur={e => focusStyle(e.target as HTMLElement, false)}
      />
      {source.url && (
        <a href={source.url} target="_blank" rel="noopener noreferrer"
          className="text-[11px] truncate -mt-1 hover:underline"
          style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
        >{source.url}</a>
      )}

      {/* Image */}
      {source.imageBase64 ? (
        <div className="relative group/img">
          <img src={source.imageBase64} alt="截图" className="w-full rounded-lg object-contain max-h-40"
            style={{ border: '1px solid var(--border)' }} />
          <button onClick={e => { e.stopPropagation(); update({ imageBase64: undefined }) }}
            className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium opacity-0 group-hover/img:opacity-100 transition-opacity"
            style={{ background: 'var(--red)', color: 'white' }}>删除</button>
        </div>
      ) : (
        <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()}
          className="rounded-lg py-4 text-center text-[11px] transition-all duration-150 cursor-pointer"
          style={{ border: `1.5px dashed ${isActive ? 'var(--accent-border)' : 'var(--border)'}`, color: 'var(--text-tertiary)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-surface)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
        >
          {pasting
            ? <span style={{ color: 'var(--accent)' }}>粘贴中...</span>
            : <span>点击、拖拽或 <kbd style={{ background: 'var(--bg-surface)', borderRadius: 4, padding: '1px 5px', fontFamily: 'var(--font-mono)', fontSize: 10 }}>⌘V</kbd> 粘贴截图</span>
          }
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f) }} />
        </div>
      )}

      {/* Capture */}
      <button onClick={handleCapture} disabled={capturing}
        className="w-full py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 disabled:opacity-40"
        style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)', border: 'none' }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = 'var(--bg-card)'
          el.style.color = 'var(--accent)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = 'var(--bg-surface)'
          el.style.color = 'var(--text-tertiary)'
        }}
      >{capturing ? '选择捕获区域...' : '📷  捕获屏幕'}</button>

      {/* Note */}
      <textarea placeholder="备注..." value={source.note ?? ''} rows={2}
        onChange={e => update({ note: e.target.value })}
        style={{ ...inputBase, lineHeight: 1.5, resize: 'none' }}
        onFocus={e => focusStyle(e.target as HTMLElement, true)}
        onBlur={e => focusStyle(e.target as HTMLElement, false)}
      />
    </div>
  )
}

export default function DraftBlock({ chapterId, subChapterId, module }: Props) {
  const { addDraftSource, activeSourceId, setActiveSource } = useStore()
  const sources = module.draft.sources ?? []

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl min-h-[120px]"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      {sources.map((source, index) => (
        <SourceCard key={source.id} chapterId={chapterId} subChapterId={subChapterId} module={module}
          source={source} index={index} total={sources.length}
          isActive={source.id === activeSourceId}
          onActivate={() => setActiveSource(source.id)} />
      ))}

      <button onClick={() => addDraftSource(chapterId, subChapterId, module.id)}
        className="w-full py-2 rounded-lg text-xs font-medium transition-all duration-150"
        style={{ background: 'transparent', color: 'var(--text-tertiary)', border: '1.5px dashed var(--border)' }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.borderColor = 'var(--accent-border)'
          el.style.color = 'var(--accent)'
          el.style.background = 'var(--accent-bg)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.borderColor = 'var(--border)'
          el.style.color = 'var(--text-tertiary)'
          el.style.background = 'transparent'
        }}
      >+ 添加信息源</button>

      <p style={{ fontSize: 10, color: 'var(--text-tertiary)', opacity: 0.7, marginTop: 2, fontFamily: 'var(--font-mono)' }}>
        点击卡片后 <kbd style={{ background: 'var(--bg-base)', borderRadius: 3, padding: '0 4px' }}>⌘V</kbd> 粘贴 · <kbd style={{ background: 'var(--bg-base)', borderRadius: 3, padding: '0 4px' }}>⌘⇧S</kbd> 全屏捕获
      </p>
    </div>
  )
}
