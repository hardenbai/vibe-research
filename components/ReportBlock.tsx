'use client'

import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/lib/store'
import type { Module, DraftSource } from '@/lib/types'
import { PROVIDER_CONFIGS } from '@/lib/providers'
import { fileToCompressedDataUrl } from '@/lib/imageUtils'
import { streamAI } from '@/lib/ai'

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

const EXPAND_PROMPT = `你是一位专业的金融研究分析师，擅长撰写研究报告。请根据用户提供的观点和底稿材料，用专业、简洁、有说服力的语言续写研究报告段落。要求：语言专业，符合研究报告风格；逻辑清晰，有据可查；直接输出报告内容，不要加说明性前缀；如果提供了参考资料链接，请基于这些材料进行分析和撰写；如果提供了截图备注，请结合截图中的信息进行分析。`
const DRAFT_PROMPT = `你是一位专业的金融研究分析师，擅长根据底稿材料撰写完整的研究报告段落。请根据用户提供的底稿信息，独立撰写一段专业、完整的研究报告内容。要求：语言专业，符合研究报告风格；逻辑清晰；充分整合所有底稿材料的信息；直接输出报告内容，不要加说明性前缀。`

function buildExpand(viewpoint: string, sources: DraftSource[], existing?: string) {
  const p: string[] = []
  const urls = sources.map(s => s.url).filter(Boolean)
  if (urls.length) p.push(`参考资料链接：\n${urls.join('\n')}`)
  const notes = sources.map(s => s.note).filter(Boolean)
  if (notes.length) p.push(`底稿备注：\n${notes.join('\n')}`)
  const imgs = sources.filter(s => s.imageBase64)
  if (imgs.length) p.push(`截图资料：共 ${imgs.length} 张截图。`)
  if (existing) p.push(`已有内容：\n${existing}`)
  const ctx = p.join('\n\n')
  return ctx ? `${ctx}\n\n请围绕以下观点续写：${viewpoint}` : `请围绕以下观点撰写研究报告段落：${viewpoint}`
}
function buildDraft(sources: DraftSource[], existing?: string) {
  const p: string[] = []
  const urls = sources.map(s => s.url).filter(Boolean)
  if (urls.length) p.push(`参考资料链接：\n${urls.join('\n')}`)
  const notes = sources.map(s => s.note).filter(Boolean)
  if (notes.length) p.push(`底稿备注：\n${notes.join('\n')}`)
  const imgs = sources.filter(s => s.imageBase64)
  if (imgs.length) p.push(`截图资料：共 ${imgs.length} 张截图。`)
  if (existing) p.push(`已有内容：\n${existing}`)
  return p.length ? `${p.join('\n\n')}\n\n请撰写一段专业研究报告内容。` : '请撰写一段专业的研究报告内容。'
}

function Badge({ label, color }: { label: string; color: 'amber' | 'purple' }) {
  const isAmber = color === 'amber'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 7px',
      borderRadius: 20, marginLeft: 6,
      background: isAmber ? 'var(--accent-light)' : 'rgba(191,90,242,0.1)',
      fontSize: 10, fontWeight: 500, fontFamily: 'var(--mono)',
      color: isAmber ? 'var(--accent)' : '#bf5af2',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: isAmber ? 'var(--accent)' : '#bf5af2', animation: 'blink 1.5s infinite' }} />
      {label}
    </span>
  )
}

function ChartModule({ chapterId, subChapterId, module }: { chapterId: string; subChapterId: string | null; module: Module }) {
  const { updateReport, setActiveModule, activeModuleId } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const { report } = module
  const isActive = activeModuleId === module.id

  const handleImage = async (file: File) => {
    updateReport(chapterId, subChapterId, module.id, { chartImage: await fileToCompressedDataUrl(file) })
  }

  return (
    <div onClick={() => setActiveModule(module.id)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: 10, borderRadius: 8, minHeight: 100, cursor: 'pointer',
        background: 'var(--bg-2)',
        border: `1px solid ${isActive ? 'rgba(191,90,242,0.3)' : 'var(--b1)'}`,
        boxShadow: isActive ? '0 0 0 2px rgba(191,90,242,0.12)' : 'none',
        transition: 'all 0.12s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? '#bf5af2' : 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--mono)' }}>
          chart{isActive && <Badge label="active" color="purple" />}
        </span>
      </div>

      <input type="text" placeholder="chart title (e.g. Fig.1 XX trend)" value={report.chartTitle ?? ''}
        onChange={e => updateReport(chapterId, subChapterId, module.id, { chartTitle: e.target.value })}
        style={inp({ fontSize: 13, fontWeight: 500 })}
        onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />

      {report.chartImage ? (
        <div style={{ position: 'relative' }} className="group/c">
          <img src={report.chartImage} alt="图表" style={{ width: '100%', borderRadius: 6, objectFit: 'contain', maxHeight: 220, border: '1px solid var(--b1)', display: 'block' }} />
          <button onClick={() => updateReport(chapterId, subChapterId, module.id, { chartImage: undefined })}
            className="opacity-0 group-hover/c:opacity-100 transition-opacity"
            style={{ position: 'absolute', top: 6, right: 6, background: 'var(--red)', color: 'white', fontSize: 10, padding: '2px 7px', borderRadius: 4, border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)' }}>rm</button>
        </div>
      ) : (
        <div onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleImage(f) }}
          onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()}
          style={{ border: '1px dashed rgba(191,90,242,0.2)', borderRadius: 6, padding: '20px 0', textAlign: 'center', fontSize: 11, color: 'var(--t4)', cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'var(--mono)' }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'rgba(191,90,242,0.45)'; el.style.color = '#bf5af2'; el.style.background = 'rgba(191,90,242,0.05)' }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'rgba(191,90,242,0.2)'; el.style.color = 'var(--t4)'; el.style.background = 'transparent' }}
        >
          click or drag to upload chart
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f) }} />
        </div>
      )}

      <input type="text" placeholder="source (e.g. Wind, company filings)" value={report.chartSource ?? ''}
        onChange={e => updateReport(chapterId, subChapterId, module.id, { chartSource: e.target.value })}
        style={inp({ fontSize: 11.5, color: 'var(--t3)' })}
        onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />
    </div>
  )
}

function TextModule({ chapterId, subChapterId, module }: { chapterId: string; subChapterId: string | null; module: Module }) {
  const { updateReport, aiSettings, setActiveModule, activeModuleId } = useStore()
  const [viewpoint, setViewpoint] = useState('')
  const [instruction, setInstruction] = useState('')
  const [loading, setLoading] = useState<'expand' | 'generate' | null>(null)
  const [error, setError] = useState('')
  const abort = useRef<AbortController | null>(null)
  const { report, draft } = module
  const isActive = activeModuleId === module.id
  const hasSources = (draft.sources ?? []).some(s => s.url || s.note || s.imageBase64)

  useEffect(() => () => abort.current?.abort(), [])

  const run = async (mode: 'expand' | 'generate', system: string, prompt: string) => {
    const apiKey = aiSettings.apiKeys[aiSettings.providerId]
    if (!apiKey) { setError('set API key in settings first'); return }
    abort.current?.abort()
    const ac = new AbortController(); abort.current = ac
    setError(''); setLoading(mode)
    const anchor = report.content + (report.content ? '\n\n' : ''); let acc = ''
    try {
      await streamAI({
        providerId: aiSettings.providerId, apiKey, modelId: aiSettings.modelId,
        baseUrl: PROVIDER_CONFIGS.find(p => p.id === aiSettings.providerId)?.baseUrl,
        system, userPrompt: prompt, signal: ac.signal,
        onDelta: chunk => { acc += chunk; updateReport(chapterId, subChapterId, module.id, { content: anchor + acc }) },
      })
      if (mode === 'expand') setViewpoint(''); else setInstruction('')
    } catch (e: unknown) {
      if ((e as Error)?.name !== 'AbortError') setError(e instanceof Error ? e.message : 'AI generation failed')
    } finally {
      if (abort.current === ac) abort.current = null; setLoading(null)
    }
  }

  const btnBase: React.CSSProperties = {
    padding: '7px 12px', borderRadius: 6, fontSize: 11.5, fontWeight: 600,
    whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.12s',
    fontFamily: 'var(--mono)',
  }

  return (
    <div onClick={() => setActiveModule(module.id)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: 10, borderRadius: 8, minHeight: 100, cursor: 'text',
        background: 'var(--bg-2)',
        border: `1px solid ${isActive ? 'var(--accent-border)' : 'var(--b1)'}`,
        boxShadow: isActive ? 'var(--accent-glow)' : 'none',
        transition: 'all 0.12s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--mono)' }}>
          report{isActive && <Badge label="active" color="amber" />}
        </span>
      </div>

      <textarea placeholder="write report content here..." value={report.content}
        onChange={e => updateReport(chapterId, subChapterId, module.id, { content: e.target.value })}
        rows={6}
        style={inp({ resize: 'none', lineHeight: 1.7, fontSize: 13, padding: '9px 10px', fontFamily: 'var(--font)', color: 'var(--t1)' })}
        onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />

      {error && <p style={{ fontSize: 11, color: 'var(--red)', margin: 0, fontFamily: 'var(--mono)' }}>⚠ {error}</p>}

      {/* AI expand */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input type="text" placeholder="one viewpoint → AI expands it..." value={viewpoint}
          onChange={e => setViewpoint(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') run('expand', EXPAND_PROMPT, buildExpand(viewpoint, draft.sources ?? [], report.content)) }}
          style={inp()} onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />
        {loading === 'expand' ? (
          <button onClick={() => abort.current?.abort()}
            style={{ ...btnBase, background: 'var(--red-light)', border: '1px solid var(--red-border)', color: 'var(--red)' }}>■ stop</button>
        ) : (
          <button onClick={() => run('expand', EXPAND_PROMPT, buildExpand(viewpoint, draft.sources ?? [], report.content))}
            disabled={loading !== null || !viewpoint.trim()}
            style={{ ...btnBase, background: 'var(--accent)', color: '#0d0d0e', border: 'none', opacity: (loading !== null || !viewpoint.trim()) ? 0.4 : 1 }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; if (!el.disabled) el.style.background = 'var(--accent-hover)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)' }}
          >▶ expand</button>
        )}
      </div>

      {/* Generate from draft */}
      {hasSources && (
        <div style={{ display: 'flex', gap: 6, paddingTop: 7, borderTop: '1px solid var(--b1)' }}>
          <input type="text" placeholder="extra instructions (optional)..." value={instruction}
            onChange={e => setInstruction(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') run('generate', DRAFT_PROMPT, instruction.trim() ? `${buildDraft(draft.sources ?? [], report.content)}\n\n额外要求：${instruction.trim()}` : buildDraft(draft.sources ?? [], report.content)) }}
            style={inp()} onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />
          {loading === 'generate' ? (
            <button onClick={() => abort.current?.abort()}
              style={{ ...btnBase, background: 'var(--red-light)', border: '1px solid var(--red-border)', color: 'var(--red)' }}>■ stop</button>
          ) : (
            <button onClick={() => run('generate', DRAFT_PROMPT, instruction.trim() ? `${buildDraft(draft.sources ?? [], report.content)}\n\n额外要求：${instruction.trim()}` : buildDraft(draft.sources ?? [], report.content))}
              disabled={loading !== null}
              style={{ ...btnBase, background: 'var(--green-light)', border: '1px solid var(--green-border)', color: 'var(--green)', opacity: loading !== null ? 0.4 : 1 }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; if (!el.disabled) el.style.background = 'rgba(61,214,140,0.18)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--green-light)' }}
            >✦ from draft</button>
          )}
        </div>
      )}
    </div>
  )
}

export default function ReportBlock(props: { chapterId: string; subChapterId: string | null; module: Module }) {
  return props.module.type === 'chart' ? <ChartModule {...props} /> : <TextModule {...props} />
}
