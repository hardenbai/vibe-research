'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface FocusOverlayProps {
  isOpen: boolean
  onClose: () => void
  originRect: { left: number; top: number; width: number; height: number } | null
  title?: string
  children: React.ReactNode
}

export default function FocusOverlay({ isOpen, onClose, originRect, title, children }: FocusOverlayProps) {
  const [phase, setPhase] = useState<'hidden' | 'from' | 'to' | 'leaving'>('hidden')
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && phase === 'hidden' && originRect) {
      setPhase('from')
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase('to'))
      })
    }
    if (!isOpen && phase === 'to') {
      setPhase('leaving')
    }
  }, [isOpen, phase, originRect])

  const close = useCallback(() => {
    if (phase === 'to') setPhase('leaving')
  }, [phase])

  useEffect(() => {
    if (phase !== 'to') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [phase, close])

  const onTransitionEnd = useCallback(() => {
    if (phase === 'leaving') {
      setPhase('hidden')
      onClose()
    }
  }, [phase, onClose])

  if (phase === 'hidden' || !originRect) return null

  const fromRect = phase === 'from'
  const active = phase === 'to'

  const centerW = Math.min(window.innerWidth * 0.7, 860)

  const cardStyle: React.CSSProperties = fromRect
    ? {
        position: 'fixed',
        left: originRect.left,
        top: originRect.top,
        width: originRect.width,
        height: originRect.height,
        borderRadius: 12,
        background: 'var(--card)',
        boxShadow: 'var(--card-shadow)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 101,
      }
    : phase === 'leaving'
      ? {
          position: 'fixed',
          left: originRect.left,
          top: originRect.top,
          width: originRect.width,
          height: originRect.height,
          borderRadius: 12,
          background: 'var(--card)',
          boxShadow: 'var(--card-shadow)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 101,
          transition: 'all 0.38s cubic-bezier(0.22, 1, 0.36, 1)',
        }
      : {
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: centerW,
          maxHeight: '84vh',
          borderRadius: 16,
          background: 'var(--card)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 101,
          transition: 'all 0.38s cubic-bezier(0.22, 1, 0.36, 1)',
        }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: active ? 'rgba(0,0,0,0.35)' : 'transparent',
        backdropFilter: active ? 'blur(4px)' : 'none',
        WebkitBackdropFilter: active ? 'blur(4px)' : 'none',
        transition: 'all 0.38s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      onClick={close}
    >
      <div
        ref={cardRef}
        style={cardStyle}
        onClick={e => e.stopPropagation()}
        onTransitionEnd={onTransitionEnd}
      >
        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 24px',
              borderBottom: '1px solid var(--divider)',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.01em' }}>
              {title}
            </span>
            <button
              onClick={close}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--ws-bg)',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--t3)',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = 'rgba(0,0,0,0.08)'
                el.style.color = 'var(--t1)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = 'var(--ws-bg)'
                el.style.color = 'var(--t3)'
              }}
            >
              ✕
            </button>
          </div>
        )}
        <div style={{ overflowY: 'auto', flex: 1, padding: 24 }}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
