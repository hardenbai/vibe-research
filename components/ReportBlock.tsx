'use client'

import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/lib/store'
import type { Module, DraftSource } from '@/lib/types'
import { PROVIDER_CONFIGS } from '@/lib/providers'
import { fileToCompressedDataUrl } from '@/lib/imageUtils'
import { streamAI } from '@/lib/ai'
import FocusOverlay from './FocusOverlay'

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

function Badge({ label, color }: { label: string; color: 'blue' | 'purple' }) {
  const isBlue = color === 'blue'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px',
      borderRadius: 20, marginLeft: 8,
      background: isBlue ? 'var(--accent-light)' : 'rgba(191,90,242,0.12)',
      fontSize: 11, fontWeight: 500,
      color: isBlue ? 'var(--accent-hover)' : '#bf5af2',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: isBlue ? 'var(--accent)' : '#bf5af2', animation: 'blink 1.5s infinite' }} />
      {label}
    </span>
  )
}

function ChartModule({ chapterId, subChapterId, module }: { chapterId: string; subChapterId: string | null; module: Module }) {
  const { updateReport, setActiveModule, activeModuleId } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [focused, setFocused] = useState(false)
  const { report } = module
  const isActive = activeModuleId === module.id

  const handleImage = async (file: File) => {
    updateReport(chapterId, subChapterId, module.id, { chartImage: await fileToCompressedDataUrl(file) })
  }

  const enterFocus = () => {
    setActiveModule(module.id)
    const rect = cardRef.current?.getBoundingClientRect()
    if (rect) setFocused(true)
  }

  const cardContent = (
    <div ref={cardRef} onClick={enterFocus}
      style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        padding: 12, borderRadius: 12, minHeight: 120, cursor: 'pointer',
        background: 'var(--card)',
        border: `1px solid ${isActive ? 'rgba(191,90,242,0.35)' : 'transparent'}`,
        boxShadow: isActive ? '0 0 0 3px rgba(191,90,242,0.1), var(--card-shadow)' : 'var(--card-shadow)',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? '#bf5af2' : 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          图表{isActive && <Badge label="当前" color="purple" />}
        </span>
      </div>

      <input type="text" placeholder="图表标题（如：图1. XX走势图）" value={report.chartTitle ?? ''}
        onChange={e => updateReport(chapterId, subChapterId, module.id, { chartTitle: e.target.value })}
        style={inp({ fontSize: 14, fontWeight: 500 })}
        onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />

      {report.chartImage ? (
        <div style={{ position: 'relative' }} className="group/c">
          <img src={report.chartImage} alt="图表" style={{ width: '100%', borderRadius: 8, objectFit: 'contain', maxHeight: 240, border: '1px solid var(--input-border)', display: 'block' }} />
          <button onClick={e => { e.stopPropagation(); updateReport(chapterId, subChapterId, module.id, { chartImage: undefined }) }}
            className="opacity-0 group-hover/c:opacity-100 transition-opacity"
            style={{ position: 'absolute', top: 8, right: 8, background: 'var(--red)', color: 'white', fontSize: 11, padding: '2px 8px', borderRadius: 20, border: 'none', cursor: 'pointer' }}>删除</button>
        </div>
      ) : (
        <div onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleImage(f) }}
          onDragOver={e => e.preventDefault()} onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
          style={{ border: '1.5px dashed rgba(191,90,242,0.25)', borderRadius: 8, padding: '24px 0', textAlign: 'center', fontSize: 12, color: 'var(--t4)', cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'rgba(191,90,242,0.5)'; el.style.color = '#bf5af2'; el.style.background = 'rgba(191,90,242,0.04)' }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'rgba(191,90,242,0.25)'; el.style.color = 'var(--t4)'; el.style.background = 'transparent' }}
        >
          点击或拖拽上传图表
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f) }} />
        </div>
      )}

      <input type="text" placeholder="资料来源（如：Wind，公司公告）" value={report.chartSource ?? ''}
        onChange={e => updateReport(chapterId, subChapterId, module.id, { chartSource: e.target.value })}
        style={inp({ fontSize: 12, color: 'var(--t3)' })}
        onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />
    </div>
  )

  return (
    <>
      {cardContent}

      <FocusOverlay
        isOpen={focused}
        onClose={() => setFocused(false)}
        originRect={cardRef.current?.getBoundingClientRect() ?? null}
        title="图表"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t3)', marginBottom: 6 }}>图表标题</label>
            <input type="text" placeholder="如：图1. XX 走势图" value={report.chartTitle ?? ''}
              onChange={e => updateReport(chapterId, subChapterId, module.id, { chartTitle: e.target.value })}
              style={inp({ fontSize: 16, fontWeight: 600, padding: '10px 14px' })}
              onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t3)', marginBottom: 6 }}>图表图片</label>
            {report.chartImage ? (
              <div style={{ position: 'relative' }} className="group/c">
                <img src={report.chartImage} alt="图表" style={{ width: '100%', borderRadius: 10, objectFit: 'contain', maxHeight: 400, border: '1px solid var(--input-border)', display: 'block' }} />
                <button onClick={() => updateReport(chapterId, subChapterId, module.id, { chartImage: undefined })}
                  className="opacity-0 group-hover/c:opacity-100 transition-opacity"
                  style={{ position: 'absolute', top: 10, right: 10, background: 'var(--red)', color: 'white', fontSize: 12, padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer' }}>删除</button>
              </div>
            ) : (
              <div onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleImage(f) }}
                onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()}
                style={{ border: '1.5px dashed rgba(191,90,242,0.3)', borderRadius: 10, padding: '36px 0', textAlign: 'center', fontSize: 14, color: 'var(--t4)', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'rgba(191,90,242,0.5)'; el.style.color = '#bf5af2'; el.style.background = 'rgba(191,90,242,0.04)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'rgba(191,90,242,0.3)'; el.style.color = 'var(--t4)'; el.style.background = 'transparent' }}
              >
                点击或拖拽上传图表
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f) }} />
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t3)', marginBottom: 6 }}>资料来源</label>
            <input type="text" placeholder="如：Wind，公司公告" value={report.chartSource ?? ''}
              onChange={e => updateReport(chapterId, subChapterId, module.id, { chartSource: e.target.value })}
              style={inp({ fontSize: 14, padding: '10px 14px' })}
              onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />
          </div>
        </div>
      </FocusOverlay>
    </>
  )
}

function TextModule({ chapterId, subChapterId, module }: { chapterId: string; subChapterId: string | null; module: Module }) {
  const { updateReport, aiSettings, setActiveModule, activeModuleId } = useStore()
  const [viewpoint, setViewpoint] = useState('')
  const [instruction, setInstruction] = useState('')
  const [loading, setLoading] = useState<'expand' | 'generate' | null>(null)
  const [error, setError] = useState('')
  const abort = useRef<AbortController | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [focused, setFocused] = useState(false)
  const { report, draft } = module
  const isActive = activeModuleId === module.id
  const hasSources = (draft.sources ?? []).some(s => s.url || s.note || s.imageBase64)

  useEffect(() => () => abort.current?.abort(), [])

  const run = async (mode: 'expand' | 'generate', system: string, prompt: string) => {
    const apiKey = aiSettings.apiKeys[aiSettings.providerId]
    if (!apiKey) { setError('请先在 AI 设置中填入 API Key'); return }
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
      if ((e as Error)?.name !== 'AbortError') setError(e instanceof Error ? e.message : 'AI 生成失败')
    } finally {
      if (abort.current === ac) abort.current = null; setLoading(null)
    }
  }

  const btnBase: React.CSSProperties = {
    padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    whiteSpace: 'nowrap', border: 'none', cursor: 'pointer', transition: 'all 0.15s',
  }

  const enterFocus = () => {
    setActiveModule(module.id)
    const rect = cardRef.current?.getBoundingClientRect()
    if (rect) setFocused(true)
  }

  const cardContent = (
    <div ref={cardRef} onClick={enterFocus}
      style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        padding: 12, borderRadius: 12, minHeight: 120, cursor: 'text',
        background: 'var(--card)',
        border: `1px solid ${isActive ? 'var(--accent-border)' : 'transparent'}`,
        boxShadow: isActive ? 'var(--card-shadow-active)' : 'var(--card-shadow)',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          报告{isActive && <Badge label="当前" color="blue" />}
        </span>
      </div>

      <textarea placeholder="在此撰写报告内容..." value={report.content}
        onChange={e => updateReport(chapterId, subChapterId, module.id, { content: e.target.value })}
        rows={6}
        style={inp({ resize: 'none', lineHeight: 1.7, fontSize: 14, padding: '10px 12px', color: 'var(--t1)' })}
        onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />

      {error && <p style={{ fontSize: 12, color: 'var(--red)', margin: 0 }}>{error}</p>}

      {/* AI 续写 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="text" placeholder="输入一句观点，AI 帮你续写..." value={viewpoint}
          onChange={e => setViewpoint(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') run('expand', EXPAND_PROMPT, buildExpand(viewpoint, draft.sources ?? [], report.content)) }}
          style={inp()} onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />
        {loading === 'expand' ? (
          <button onClick={e => { e.stopPropagation(); abort.current?.abort() }}
            style={{ ...btnBase, background: 'var(--red-light)', border: '1px solid var(--red-border)', color: 'var(--red)' }}>停止</button>
        ) : (
          <button onClick={e => { e.stopPropagation(); run('expand', EXPAND_PROMPT, buildExpand(viewpoint, draft.sources ?? [], report.content)) }}
            disabled={loading !== null || !viewpoint.trim()}
            style={{ ...btnBase, background: 'var(--accent)', color: 'white', opacity: (loading !== null || !viewpoint.trim()) ? 0.45 : 1 }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; if (!el.disabled) el.style.background = 'var(--accent-hover)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)' }}
          >AI 续写</button>
        )}
      </div>

      {/* 从底稿生成 */}
      {hasSources && (
        <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: '1px solid var(--divider)' }}>
          <input type="text" placeholder="额外指令（可选）" value={instruction}
            onChange={e => setInstruction(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') run('generate', DRAFT_PROMPT, instruction.trim() ? `${buildDraft(draft.sources ?? [], report.content)}\n\n额外要求：${instruction.trim()}` : buildDraft(draft.sources ?? [], report.content)) }}
            style={inp()} onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />
          {loading === 'generate' ? (
            <button onClick={e => { e.stopPropagation(); abort.current?.abort() }}
              style={{ ...btnBase, background: 'var(--red-light)', border: '1px solid var(--red-border)', color: 'var(--red)' }}>停止</button>
          ) : (
            <button onClick={e => { e.stopPropagation(); run('generate', DRAFT_PROMPT, instruction.trim() ? `${buildDraft(draft.sources ?? [], report.content)}\n\n额外要求：${instruction.trim()}` : buildDraft(draft.sources ?? [], report.content)) }}
              disabled={loading !== null}
              style={{ ...btnBase, background: 'var(--green-light)', border: '1px solid var(--green-border)', color: 'var(--green)', opacity: loading !== null ? 0.45 : 1 }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; if (!el.disabled) el.style.background = 'rgba(40,205,65,0.2)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--green-light)' }}
            >从底稿生成</button>
          )}
        </div>
      )}
    </div>
  )

  return (
    <>
      {cardContent}

      <FocusOverlay
        isOpen={focused}
        onClose={() => setFocused(false)}
        originRect={cardRef.current?.getBoundingClientRect() ?? null}
        title="报告"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <textarea
            placeholder="在此撰写报告内容..."
            value={report.content}
            onChange={e => updateReport(chapterId, subChapterId, module.id, { content: e.target.value })}
            rows={14}
            style={inp({ resize: 'vertical', lineHeight: 1.75, fontSize: 15, padding: '14px 16px', color: 'var(--t1)' })}
            onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)}
          />

          {error && <p style={{ fontSize: 13, color: 'var(--red)', margin: 0 }}>{error}</p>}

          {/* AI 续写 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="输入一句观点，AI 帮你续写..."
              value={viewpoint}
              onChange={e => setViewpoint(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') run('expand', EXPAND_PROMPT, buildExpand(viewpoint, draft.sources ?? [], report.content)) }}
              style={inp({ fontSize: 14, padding: '10px 14px' })}
              onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)}
            />
            {loading === 'expand' ? (
              <button onClick={() => abort.current?.abort()}
                style={{ ...btnBase, background: 'var(--red-light)', border: '1px solid var(--red-border)', color: 'var(--red)' }}>停止</button>
            ) : (
              <button
                onClick={() => run('expand', EXPAND_PROMPT, buildExpand(viewpoint, draft.sources ?? [], report.content))}
                disabled={loading !== null || !viewpoint.trim()}
                style={{ ...btnBase, background: 'var(--accent)', color: 'white', opacity: (loading !== null || !viewpoint.trim()) ? 0.45 : 1 }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; if (!el.disabled) el.style.background = 'var(--accent-hover)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)' }}
              >AI 续写</button>
            )}
          </div>

          {/* 从底稿生成 */}
          {hasSources && (
            <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: '1px solid var(--divider)' }}>
              <input
                type="text"
                placeholder="额外指令（可选）"
                value={instruction}
                onChange={e => setInstruction(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') run('generate', DRAFT_PROMPT, instruction.trim() ? `${buildDraft(draft.sources ?? [], report.content)}\n\n额外要求：${instruction.trim()}` : buildDraft(draft.sources ?? [], report.content)) }}
                style={inp({ fontSize: 14, padding: '10px 14px' })}
                onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)}
              />
              {loading === 'generate' ? (
                <button onClick={() => abort.current?.abort()}
                  style={{ ...btnBase, background: 'var(--red-light)', border: '1px solid var(--red-border)', color: 'var(--red)' }}>停止</button>
              ) : (
                <button
                  onClick={() => run('generate', DRAFT_PROMPT, instruction.trim() ? `${buildDraft(draft.sources ?? [], report.content)}\n\n额外要求：${instruction.trim()}` : buildDraft(draft.sources ?? [], report.content))}
                  disabled={loading !== null}
                  style={{ ...btnBase, background: 'var(--green-light)', border: '1px solid var(--green-border)', color: 'var(--green)', opacity: loading !== null ? 0.45 : 1 }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; if (!el.disabled) el.style.background = 'rgba(40,205,65,0.2)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--green-light)' }}
                >从底稿生成</button>
              )}
            </div>
          )}
        </div>
      </FocusOverlay>
    </>
  )
}

export default function ReportBlock(props: { chapterId: string; subChapterId: string | null; module: Module }) {
  return props.module.type === 'chart' ? <ChartModule {...props} /> : <TextModule {...props} />
}
