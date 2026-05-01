'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { captureScreenshot } from '@/lib/screenCapture'
import { setActiveCaptureHandler } from '@/lib/activeCapture'
import { fileToCompressedDataUrl, compressDataUrl } from '@/lib/imageUtils'
import type { Module, DraftSource } from '@/lib/types'

const inp = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  width: '100%', background: 'var(--input-bg)', color: 'var(--t2)',
  border: '1px solid var(--input-border)', borderRadius: 8, fontSize: 13,
  padding: '8px 11px', fontFamily: 'var(--font)', outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s', ...extra,
})

const focus = (el: HTMLElement, on: boolean) => {
  el.style.borderColor = on ? 'var(--accent-border)' : 'var(--input-border)'
  el.style.boxShadow = on ? 'var(--input-focus-shadow)' : 'none'
}

function SourceCard({ chapterId, subChapterId, module, source, index, total, isActive, onActivate }: {
  chapterId: string; subChapterId: string | null; module: Module
  source: DraftSource; index: number; total: number; isActive: boolean; onActivate: () => void
}) {
  const { updateDraftSource, removeDraftSource } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pasting, setPasting] = useState(false)
  const [capturing, setCapturing] = useState(false)

  const update = useCallback((d: Partial<DraftSource>) =>
    updateDraftSource(chapterId, subChapterId, module.id, source.id, d),
    [chapterId, subChapterId, module.id, source.id, updateDraftSource])

  const handleImage = useCallback(async (file: File) => {
    const r = await fileToCompressedDataUrl(file).catch(() => ''); if (r) update({ imageBase64: r })
  }, [update])

  const applyCapture = useCallback(async (b64: string, url: string) => {
    update({ imageBase64: await compressDataUrl(b64), ...(url ? { url } : {}) })
  }, [update])

  useEffect(() => { if (isActive) setActiveCaptureHandler(applyCapture) }, [isActive, applyCapture])
  useEffect(() => () => setActiveCaptureHandler(null), [])

  useEffect(() => {
    if (!isActive) return
    const handler = (e: ClipboardEvent) => {
      for (const item of Array.from(e.clipboardData?.items ?? [])) {
        if (item.type.startsWith('image/')) {
          e.preventDefault(); setPasting(true)
          const f = item.getAsFile(); if (f) handleImage(f)
          setTimeout(() => setPasting(false), 600); return
        }
        if (item.type === 'text/plain') {
          item.getAsString(t => {
            const s = t.trim()
            if ((s.startsWith('http://') || s.startsWith('https://')) && !source.url) update({ url: s })
          })
        }
      }
    }
    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [isActive, handleImage, source.url, update])

  return (
    <div onClick={onActivate}
      style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: '12px', borderRadius: 10, cursor: 'pointer',
        background: isActive ? 'var(--accent-light)' : 'var(--input-bg)',
        border: `1px solid ${isActive ? 'var(--accent-border)' : 'var(--input-border)'}`,
        boxShadow: isActive ? 'var(--input-focus-shadow)' : 'none',
        transition: 'all 0.15s', position: 'relative',
      }}
    >
      {/* Active left bar */}
      {isActive && <div style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: '0 2px 2px 0', background: 'var(--accent)' }} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: isActive ? 4 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            来源 {index + 1}
          </span>
          {isActive && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 20, background: 'var(--accent-light)', fontSize: 11, color: 'var(--accent-hover)', fontWeight: 500 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'blink 1.5s infinite' }} />
              当前
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isActive && <span style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'var(--mono)' }}>⌘⇧S</span>}
          {total > 1 && (
            <button onClick={e => { e.stopPropagation(); removeDraftSource(chapterId, subChapterId, module.id, source.id) }}
              style={{ fontSize: 12, color: 'var(--t4)', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t4)' }}>✕</button>
          )}
        </div>
      </div>

      {/* URL */}
      <input type="url" placeholder="粘贴链接 URL..." value={source.url ?? ''} onChange={e => update({ url: e.target.value })}
        style={inp()} onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />
      {source.url && <a href={source.url} target="_blank" rel="noopener noreferrer"
        style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--mono)', marginTop: -4, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        className="hover:underline">{source.url}</a>}

      {/* Image */}
      {source.imageBase64 ? (
        <div style={{ position: 'relative' }} className="group/img">
          <img src={source.imageBase64} alt="截图" style={{ width: '100%', borderRadius: 8, objectFit: 'contain', maxHeight: 160, border: '1px solid var(--input-border)', display: 'block' }} />
          <button onClick={e => { e.stopPropagation(); update({ imageBase64: undefined }) }}
            className="opacity-0 group-hover/img:opacity-100 transition-opacity"
            style={{ position: 'absolute', top: 8, right: 8, background: 'var(--red)', color: 'white', fontSize: 11, padding: '2px 8px', borderRadius: 20, border: 'none', cursor: 'pointer' }}>删除</button>
        </div>
      ) : (
        <div onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleImage(f) }}
          onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()}
          style={{
            border: `1.5px dashed ${isActive ? 'var(--accent-border)' : 'var(--input-border)'}`,
            borderRadius: 8, padding: '14px 0', textAlign: 'center', fontSize: 12,
            color: 'var(--t4)', cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = 'var(--ws-bg)'; el.style.color = 'var(--t3)' }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = 'transparent'; el.style.color = 'var(--t4)' }}
        >
          {pasting ? <span style={{ color: 'var(--accent)' }}>粘贴中...</span>
            : <span>点击、拖拽或 <kbd style={{ background: 'var(--ws-bg)', borderRadius: 4, padding: '1px 6px', fontFamily: 'var(--mono)', fontSize: 11 }}>⌘V</kbd> 粘贴截图</span>}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f) }} />
        </div>
      )}

      {/* Capture */}
      <button onClick={async () => { setActiveCaptureHandler(applyCapture); setCapturing(true); const r = await captureScreenshot(); setCapturing(false); if (r) applyCapture(r.imageBase64, r.url) }}
        disabled={capturing}
        style={{ padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 500, background: 'var(--input-bg)', color: 'var(--t3)', border: '1px solid var(--input-border)', cursor: 'pointer', transition: 'all 0.15s', opacity: capturing ? 0.5 : 1 }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'var(--card)'; el.style.color = 'var(--accent-hover)'; el.style.borderColor = 'var(--accent-border)' }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'var(--input-bg)'; el.style.color = 'var(--t3)'; el.style.borderColor = 'var(--input-border)' }}
      >{capturing ? '选择捕获区域...' : '📷  捕获屏幕'}</button>

      {/* Note */}
      <textarea placeholder="备注..." value={source.note ?? ''} rows={2} onChange={e => update({ note: e.target.value })}
        style={inp({ resize: 'none', lineHeight: 1.55 })}
        onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />
    </div>
  )
}

export default function DraftBlock({ chapterId, subChapterId, module }: { chapterId: string; subChapterId: string | null; module: Module }) {
  const { addDraftSource, activeSourceId, setActiveSource } = useStore()
  const sources = module.draft.sources ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 12, minHeight: 120, background: 'var(--card)', boxShadow: 'var(--card-shadow)' }}>
      {sources.map((s, i) => (
        <SourceCard key={s.id} chapterId={chapterId} subChapterId={subChapterId} module={module}
          source={s} index={i} total={sources.length}
          isActive={s.id === activeSourceId} onActivate={() => setActiveSource(s.id)} />
      ))}

      <button onClick={() => addDraftSource(chapterId, subChapterId, module.id)}
        style={{ padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 500, background: 'transparent', color: 'var(--t4)', border: '1.5px dashed var(--input-border)', cursor: 'pointer', transition: 'all 0.15s' }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = 'var(--accent-border)'; el.style.color = 'var(--accent)'; el.style.background = 'var(--accent-light)' }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = 'var(--input-border)'; el.style.color = 'var(--t4)'; el.style.background = 'transparent' }}
      >+ 添加信息源</button>

      <p style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'var(--mono)', opacity: 0.7, margin: 0 }}>
        <kbd style={{ background: 'var(--ws-bg)', borderRadius: 3, padding: '0 5px' }}>⌘V</kbd> 粘贴图片 · <kbd style={{ background: 'var(--ws-bg)', borderRadius: 3, padding: '0 5px' }}>⌘⇧S</kbd> 全屏截图
      </p>
    </div>
  )
}
