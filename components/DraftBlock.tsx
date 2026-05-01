'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { captureScreenshot } from '@/lib/screenCapture'
import { setActiveCaptureHandler } from '@/lib/activeCapture'
import { fileToCompressedDataUrl, compressDataUrl } from '@/lib/imageUtils'
import type { Module, DraftSource } from '@/lib/types'

const inp = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  width: '100%', background: 'var(--bg-0)', color: 'var(--t2)',
  border: '1px solid var(--b1)', borderRadius: 6, fontSize: 12.5,
  padding: '7px 10px', fontFamily: 'var(--mono)', outline: 'none',
  transition: 'border-color 0.12s, box-shadow 0.12s', ...extra,
})

const focus = (el: HTMLElement, on: boolean) => {
  el.style.borderColor = on ? 'var(--accent-border)' : 'var(--b1)'
  el.style.boxShadow = on ? 'var(--accent-glow)' : 'none'
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
        display: 'flex', flexDirection: 'column', gap: 7,
        padding: '10px', borderRadius: 7, cursor: 'pointer',
        background: isActive ? 'rgba(212,145,90,0.06)' : 'var(--bg-0)',
        border: `1px solid ${isActive ? 'var(--accent-border)' : 'var(--b1)'}`,
        boxShadow: isActive ? 'var(--accent-glow)' : 'none',
        transition: 'all 0.12s', position: 'relative',
      }}
    >
      {isActive && <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 2, borderRadius: '0 1px 1px 0', background: 'var(--accent)' }} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: isActive ? 6 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--mono)' }}>
            src[{index}]
          </span>
          {isActive && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 7px', borderRadius: 20, background: 'var(--accent-light)', fontSize: 10, color: 'var(--accent)', fontWeight: 500, fontFamily: 'var(--mono)' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', animation: 'blink 1.5s infinite' }} />
              active
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isActive && <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--mono)' }}>⌘⇧S</span>}
          {total > 1 && (
            <button onClick={e => { e.stopPropagation(); removeDraftSource(chapterId, subChapterId, module.id, source.id) }}
              style={{ fontSize: 10, color: 'var(--t4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t4)' }}>rm</button>
          )}
        </div>
      </div>

      {/* URL */}
      <input type="url" placeholder="paste url..." value={source.url ?? ''} onChange={e => update({ url: e.target.value })}
        style={inp()} onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />
      {source.url && <a href={source.url} target="_blank" rel="noopener noreferrer"
        style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--mono)', marginTop: -3, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.8 }}
        className="hover:opacity-100 hover:underline">{source.url}</a>}

      {/* Image */}
      {source.imageBase64 ? (
        <div style={{ position: 'relative' }} className="group/img">
          <img src={source.imageBase64} alt="截图" style={{ width: '100%', borderRadius: 6, objectFit: 'contain', maxHeight: 150, border: '1px solid var(--b1)', display: 'block' }} />
          <button onClick={e => { e.stopPropagation(); update({ imageBase64: undefined }) }}
            className="opacity-0 group-hover/img:opacity-100 transition-opacity"
            style={{ position: 'absolute', top: 6, right: 6, background: 'var(--red)', color: 'white', fontSize: 10, padding: '2px 7px', borderRadius: 4, border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)' }}>rm</button>
        </div>
      ) : (
        <div onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleImage(f) }}
          onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()}
          style={{
            border: `1px dashed ${isActive ? 'var(--accent-border)' : 'var(--b1)'}`,
            borderRadius: 6, padding: '12px 0', textAlign: 'center', fontSize: 11,
            color: 'var(--t4)', cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'var(--mono)',
          }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'var(--accent-border)'; el.style.color = 'var(--accent)'; el.style.background = 'var(--accent-light)' }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = isActive ? 'var(--accent-border)' : 'var(--b1)'; el.style.color = 'var(--t4)'; el.style.background = 'transparent' }}
        >
          {pasting
            ? <span style={{ color: 'var(--accent)' }}>pasting...</span>
            : <span>click / drag / <kbd style={{ background: 'var(--bg-1)', borderRadius: 3, padding: '0 4px', fontSize: 10 }}>⌘V</kbd> paste screenshot</span>}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f) }} />
        </div>
      )}

      {/* Capture */}
      <button onClick={async () => { setActiveCaptureHandler(applyCapture); setCapturing(true); const r = await captureScreenshot(); setCapturing(false); if (r) applyCapture(r.imageBase64, r.url) }}
        disabled={capturing}
        style={{ padding: '6px 0', borderRadius: 6, fontSize: 11, fontWeight: 500, background: 'var(--bg-0)', color: 'var(--t3)', border: '1px solid var(--b1)', cursor: 'pointer', transition: 'all 0.12s', opacity: capturing ? 0.5 : 1, fontFamily: 'var(--mono)' }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'var(--accent-light)'; el.style.color = 'var(--accent)'; el.style.borderColor = 'var(--accent-border)' }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'var(--bg-0)'; el.style.color = 'var(--t3)'; el.style.borderColor = 'var(--b1)' }}
      >{capturing ? '▶ selecting region...' : '⬛ capture screen'}</button>

      {/* Note */}
      <textarea placeholder="notes..." value={source.note ?? ''} rows={2} onChange={e => update({ note: e.target.value })}
        style={inp({ resize: 'none', lineHeight: 1.55 })}
        onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />
    </div>
  )
}

export default function DraftBlock({ chapterId, subChapterId, module }: { chapterId: string; subChapterId: string | null; module: Module }) {
  const { addDraftSource, activeSourceId, setActiveSource } = useStore()
  const sources = module.draft.sources ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: 10, borderRadius: 8, minHeight: 100, background: 'var(--bg-2)', border: '1px solid var(--b1)' }}>
      {sources.map((s, i) => (
        <SourceCard key={s.id} chapterId={chapterId} subChapterId={subChapterId} module={module}
          source={s} index={i} total={sources.length}
          isActive={s.id === activeSourceId} onActivate={() => setActiveSource(s.id)} />
      ))}

      <button onClick={() => addDraftSource(chapterId, subChapterId, module.id)}
        style={{ padding: '7px 0', borderRadius: 6, fontSize: 11, fontWeight: 500, background: 'transparent', color: 'var(--t4)', border: '1px dashed var(--b1)', cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'var(--mono)' }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = 'var(--accent-border)'; el.style.color = 'var(--accent)'; el.style.background = 'var(--accent-light)' }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = 'var(--b1)'; el.style.color = 'var(--t4)'; el.style.background = 'transparent' }}
      >+ add source</button>

      <p style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--mono)', opacity: 0.6, margin: 0 }}>
        <kbd style={{ background: 'var(--bg-1)', borderRadius: 2, padding: '0 4px' }}>⌘V</kbd> paste image · <kbd style={{ background: 'var(--bg-1)', borderRadius: 2, padding: '0 4px' }}>⌘⇧S</kbd> screenshot
      </p>
    </div>
  )
}
