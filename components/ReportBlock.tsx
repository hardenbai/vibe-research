'use client'

import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/lib/store'
import type { Module, DraftSource } from '@/lib/types'
import { PROVIDER_CONFIGS } from '@/lib/providers'
import { fileToCompressedDataUrl } from '@/lib/imageUtils'
import { streamAI } from '@/lib/ai'

interface Props { chapterId: string; subChapterId: string | null; module: Module }

const EXPAND_PROMPT = `你是一位专业的金融研究分析师，擅长撰写研究报告。
请根据用户提供的观点和底稿材料，用专业、简洁、有说服力的语言续写研究报告段落。
要求：
- 语言专业，符合研究报告风格
- 逻辑清晰，有据可查
- 直接输出报告内容，不要加说明性前缀
- 如果提供了参考资料链接，请基于这些材料进行分析和撰写
- 如果提供了截图备注，请结合截图中的信息进行分析`

const DRAFT_PROMPT = `你是一位专业的金融研究分析师，擅长根据底稿材料撰写完整的研究报告段落。
请根据用户提供的底稿信息（包括参考链接、截图备注等），独立撰写一段专业、完整的研究报告内容。
要求：
- 语言专业，符合研究报告风格
- 逻辑清晰，有据可查
- 充分整合所有底稿材料的信息
- 直接输出报告内容，不要加说明性前缀
- 不需要额外的观点提示，直接根据底稿材料生成内容`

function buildExpandPrompt(viewpoint: string, sources: DraftSource[], existing?: string) {
  const parts: string[] = []
  const urls = sources.map(s => s.url).filter(Boolean)
  if (urls.length) parts.push(`参考资料链接：\n${urls.join('\n')}`)
  const notes = sources.map(s => s.note).filter(Boolean)
  if (notes.length) parts.push(`底稿备注：\n${notes.join('\n')}`)
  const imgs = sources.filter(s => s.imageBase64)
  if (imgs.length) parts.push(`截图资料：共 ${imgs.length} 张截图，请结合截图中的数据和信息进行分析。`)
  if (existing) parts.push(`已有内容：\n${existing}`)
  const ctx = parts.join('\n\n')
  return ctx ? `${ctx}\n\n请基于以上材料，围绕以下观点续写：${viewpoint}` : `请围绕以下观点撰写研究报告段落：${viewpoint}`
}

function buildDraftPrompt(sources: DraftSource[], existing?: string) {
  const parts: string[] = []
  const urls = sources.map(s => s.url).filter(Boolean)
  if (urls.length) parts.push(`参考资料链接：\n${urls.join('\n')}`)
  const notes = sources.map(s => s.note).filter(Boolean)
  if (notes.length) parts.push(`底稿备注：\n${notes.join('\n')}`)
  const imgs = sources.filter(s => s.imageBase64)
  if (imgs.length) parts.push(`截图资料：共 ${imgs.length} 张截图，请结合截图中的数据和信息进行分析。`)
  if (existing) parts.push(`已有内容（请在此基础上扩展）：\n${existing}`)
  const ctx = parts.join('\n\n')
  return ctx ? `${ctx}\n\n请根据以上底稿材料，撰写一段专业、完整的研究报告内容。` : `请撰写一段专业的研究报告内容。`
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

function focusRing(el: HTMLElement, focused: boolean) {
  el.style.borderColor = focused ? 'var(--accent-border)' : 'var(--border)'
  el.style.boxShadow = focused ? '0 0 0 3px var(--accent-bg)' : 'none'
}

function ActiveBadge({ color }: { color: 'blue' | 'purple' }) {
  const isBlue = color === 'blue'
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full ml-1.5"
      style={{
        background: isBlue ? 'var(--accent-bg)' : 'rgba(191,90,242,0.1)',
        fontSize: 10,
        color: isBlue ? 'var(--accent)' : '#bf5af2',
      }}>
      <span className="w-1.5 h-1.5 rounded-full"
        style={{ background: isBlue ? 'var(--accent)' : '#bf5af2', animation: 'pulse-dot 1.5s infinite' }} />
      当前
    </span>
  )
}

function ChartModule({ chapterId, subChapterId, module }: Props) {
  const { updateReport, setActiveModule, activeModuleId } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const { report } = module
  const isActive = activeModuleId === module.id

  const handleImage = async (file: File) => {
    const compressed = await fileToCompressedDataUrl(file)
    updateReport(chapterId, subChapterId, module.id, { chartImage: compressed })
  }

  return (
    <div onClick={() => setActiveModule(module.id)}
      className="flex flex-col gap-2.5 p-3 rounded-xl min-h-[120px] cursor-pointer transition-all duration-150"
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${isActive ? 'rgba(191,90,242,0.3)' : 'var(--border)'}`,
        boxShadow: isActive ? '0 0 0 3px rgba(191,90,242,0.1)' : 'none',
      }}
    >
      <div className="flex items-center">
        <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? '#bf5af2' : 'var(--text-tertiary)' }}>
          图表
          {isActive && <ActiveBadge color="purple" />}
        </span>
      </div>

      <input type="text" placeholder="图表标题（如：图1. XX走势图）"
        value={report.chartTitle ?? ''}
        onChange={e => updateReport(chapterId, subChapterId, module.id, { chartTitle: e.target.value })}
        style={{ ...inputBase, fontSize: 13, fontWeight: 500 }}
        onFocus={e => focusRing(e.target as HTMLElement, true)}
        onBlur={e => focusRing(e.target as HTMLElement, false)}
      />

      {report.chartImage ? (
        <div className="relative group/chart">
          <img src={report.chartImage} alt="图表" className="w-full rounded-lg object-contain max-h-64"
            style={{ border: '1px solid var(--border)' }} />
          <button onClick={() => updateReport(chapterId, subChapterId, module.id, { chartImage: undefined })}
            className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium opacity-0 group-hover/chart:opacity-100 transition-opacity"
            style={{ background: 'var(--red)', color: 'white' }}>删除</button>
        </div>
      ) : (
        <div onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleImage(f) }}
          onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()}
          className="rounded-lg p-6 text-center text-[11px] transition-all duration-150 cursor-pointer"
          style={{ border: '1.5px dashed rgba(191,90,242,0.25)', color: 'var(--text-tertiary)' }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLDivElement
            el.style.borderColor = 'rgba(191,90,242,0.5)'
            el.style.color = '#bf5af2'
            el.style.background = 'rgba(191,90,242,0.04)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLDivElement
            el.style.borderColor = 'rgba(191,90,242,0.25)'
            el.style.color = 'var(--text-tertiary)'
            el.style.background = 'transparent'
          }}
        >
          点击或拖拽上传图表
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f) }} />
        </div>
      )}

      <input type="text" placeholder="资料来源（如：Wind，公司公告）"
        value={report.chartSource ?? ''}
        onChange={e => updateReport(chapterId, subChapterId, module.id, { chartSource: e.target.value })}
        style={{ ...inputBase, fontSize: 11, color: 'var(--text-secondary)' }}
        onFocus={e => focusRing(e.target as HTMLElement, true)}
        onBlur={e => focusRing(e.target as HTMLElement, false)}
      />
    </div>
  )
}

function TextModule({ chapterId, subChapterId, module }: Props) {
  const { updateReport, aiSettings, setActiveModule, activeModuleId } = useStore()
  const [viewpoint, setViewpoint] = useState('')
  const [instruction, setInstruction] = useState('')
  const [loading, setLoading] = useState<'expand' | 'generate' | null>(null)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const { report, draft } = module
  const isActive = activeModuleId === module.id
  const hasSources = (draft.sources ?? []).some(s => s.url || s.note || s.imageBase64)

  useEffect(() => () => abortRef.current?.abort(), [])

  const runStream = async (mode: 'expand' | 'generate', system: string, userPrompt: string) => {
    const apiKey = aiSettings.apiKeys[aiSettings.providerId]
    if (!apiKey) { setError('请先在 AI 设置中填入 API Key'); return }
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setError(''); setLoading(mode)
    const anchor = report.content + (report.content ? '\n\n' : '')
    let acc = ''
    try {
      const provider = PROVIDER_CONFIGS.find(p => p.id === aiSettings.providerId)
      await streamAI({
        providerId: aiSettings.providerId, apiKey, modelId: aiSettings.modelId,
        baseUrl: provider?.baseUrl, system, userPrompt, signal: ac.signal,
        onDelta: chunk => {
          acc += chunk
          updateReport(chapterId, subChapterId, module.id, { content: anchor + acc })
        },
      })
      if (mode === 'expand') setViewpoint('')
      else setInstruction('')
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'AI 生成失败')
    } finally {
      if (abortRef.current === ac) abortRef.current = null
      setLoading(null)
    }
  }

  const handleExpand = () => {
    if (!viewpoint.trim()) return
    runStream('expand', EXPAND_PROMPT, buildExpandPrompt(viewpoint, draft.sources ?? [], report.content))
  }
  const handleGenerate = () => {
    if (!hasSources) { setError('请先在左侧底稿中填写来源信息'); return }
    const base = buildDraftPrompt(draft.sources ?? [], report.content)
    const extra = instruction.trim()
    runStream('generate', DRAFT_PROMPT, extra ? `${base}\n\n额外要求：${extra}` : base)
  }
  const handleStop = () => abortRef.current?.abort()

  return (
    <div onClick={() => setActiveModule(module.id)}
      className="flex flex-col gap-2.5 p-3 rounded-xl min-h-[120px] cursor-text transition-all duration-150"
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${isActive ? 'var(--accent-border)' : 'var(--border)'}`,
        boxShadow: isActive ? '0 0 0 3px var(--accent-bg)' : 'none',
      }}
    >
      <div className="flex items-center">
        <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }}>
          报告
          {isActive && <ActiveBadge color="blue" />}
        </span>
      </div>

      {/* Main textarea */}
      <textarea placeholder="在此撰写报告内容..."
        value={report.content}
        onChange={e => updateReport(chapterId, subChapterId, module.id, { content: e.target.value })}
        rows={5}
        style={{
          width: '100%', background: 'var(--bg-base)', color: 'var(--text-primary)',
          border: '1px solid var(--border)', borderRadius: 8, fontSize: 13,
          padding: '8px 10px', fontFamily: 'var(--font-system)', lineHeight: 1.7,
          outline: 'none', resize: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onFocus={e => focusRing(e.target as HTMLElement, true)}
        onBlur={e => focusRing(e.target as HTMLElement, false)}
      />

      {error && <p style={{ fontSize: 11, color: 'var(--red)' }}>{error}</p>}

      {/* AI 续写 row */}
      <div className="flex gap-2">
        <input type="text" placeholder="输入一句观点，AI 帮你续写..."
          value={viewpoint} onChange={e => setViewpoint(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleExpand() }}
          style={inputBase}
          onFocus={e => focusRing(e.target as HTMLElement, true)}
          onBlur={e => focusRing(e.target as HTMLElement, false)}
        />
        {loading === 'expand' ? (
          <button onClick={handleStop}
            className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
            style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)' }}
          >停止</button>
        ) : (
          <button onClick={handleExpand} disabled={loading !== null || !viewpoint.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 disabled:opacity-40"
            style={{ background: 'var(--accent)', color: 'white', border: 'none' }}
            onMouseEnter={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-hover)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)' }}
          >AI 续写</button>
        )}
      </div>

      {/* 从底稿生成 row */}
      {hasSources && (
        <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--separator)' }}>
          <input type="text" placeholder="额外指令（可选，如：重点分析竞争格局）"
            value={instruction} onChange={e => setInstruction(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleGenerate() }}
            style={{ ...inputBase, borderColor: 'var(--border)' }}
            onFocus={e => focusRing(e.target as HTMLElement, true)}
            onBlur={e => focusRing(e.target as HTMLElement, false)}
          />
          {loading === 'generate' ? (
            <button onClick={handleStop}
              className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
              style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)' }}
            >停止</button>
          ) : (
            <button onClick={handleGenerate} disabled={loading !== null}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 disabled:opacity-40"
              style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)', color: 'var(--green)' }}
              onMouseEnter={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(48,209,88,0.18)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--green-bg)' }}
            >从底稿生成</button>
          )}
        </div>
      )}
    </div>
  )
}

export default function ReportBlock(props: Props) {
  return props.module.type === 'chart' ? <ChartModule {...props} /> : <TextModule {...props} />
}
