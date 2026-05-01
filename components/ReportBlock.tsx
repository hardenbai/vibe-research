'use client'

import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/lib/store'
import type { Module, DraftSource } from '@/lib/types'
import { PROVIDER_CONFIGS } from '@/lib/providers'
import { fileToCompressedDataUrl } from '@/lib/imageUtils'
import { streamAI } from '@/lib/ai'

interface Props {
  chapterId: string
  subChapterId: string | null
  module: Module
}

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

function buildExpandPrompt(viewpoint: string, sources: DraftSource[], existingContent?: string) {
  const parts: string[] = []
  const urls = sources.map(s => s.url).filter(Boolean)
  if (urls.length > 0) parts.push(`参考资料链接：\n${urls.join('\n')}`)
  const notes = sources.map(s => s.note).filter(Boolean)
  if (notes.length > 0) parts.push(`底稿备注：\n${notes.join('\n')}`)
  const images = sources.filter(s => s.imageBase64)
  if (images.length > 0) parts.push(`截图资料：共 ${images.length} 张截图，请结合截图中的数据和信息进行分析。`)
  if (existingContent) parts.push(`已有内容：\n${existingContent}`)
  const context = parts.join('\n\n')
  return context ? `${context}\n\n请基于以上材料，围绕以下观点续写：${viewpoint}` : `请围绕以下观点撰写研究报告段落：${viewpoint}`
}

function buildDraftPrompt(sources: DraftSource[], existingContent?: string) {
  const parts: string[] = []
  const urls = sources.map(s => s.url).filter(Boolean)
  if (urls.length > 0) parts.push(`参考资料链接：\n${urls.join('\n')}`)
  const notes = sources.map(s => s.note).filter(Boolean)
  if (notes.length > 0) parts.push(`底稿备注：\n${notes.join('\n')}`)
  const images = sources.filter(s => s.imageBase64)
  if (images.length > 0) parts.push(`截图资料：共 ${images.length} 张截图，请结合截图中的数据和信息进行分析。`)
  if (existingContent) parts.push(`已有内容（请在此基础上扩展）：\n${existingContent}`)
  const context = parts.join('\n\n')
  return context ? `${context}\n\n请根据以上底稿材料，撰写一段专业、完整的研究报告内容。` : `请撰写一段专业的研究报告内容。`
}

function ActiveBadge({ color }: { color: 'gold' | 'purple' }) {
  const isGold = color === 'gold'
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] ml-1.5"
      style={isGold ? {
        background: 'rgba(200,168,75,0.12)',
        border: '1px solid rgba(200,168,75,0.3)',
        color: '#e8c96e',
      } : {
        background: 'rgba(168,85,247,0.1)',
        border: '1px solid rgba(168,85,247,0.25)',
        color: '#c084fc',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: isGold ? 'var(--gold)' : '#a855f7',
          animation: 'goldPulse 1.5s ease-in-out infinite',
        }}
      />
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

  const cardStyle = {
    background: 'var(--bg-card)',
    border: `1px solid ${isActive ? 'rgba(168,85,247,0.3)' : 'var(--border-subtle)'}`,
    boxShadow: isActive ? '0 0 12px rgba(168,85,247,0.08)' : 'none',
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    cursor: 'pointer',
    transition: 'all 0.15s',
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    fontSize: 12,
    padding: '6px 8px',
    fontFamily: 'var(--font-sans)',
    outline: 'none',
  }

  return (
    <div onClick={() => setActiveModule(module.id)} style={cardStyle}>
      <div className="flex items-center justify-between">
        <span
          className="text-[9px] font-mono tracking-widest uppercase"
          style={{ color: isActive ? '#c084fc' : 'var(--text-muted)' }}
        >
          图表
          {isActive && <ActiveBadge color="purple" />}
        </span>
      </div>

      <input
        type="text"
        placeholder="图表标题（如：图1. XX走势图）"
        value={report.chartTitle ?? ''}
        onChange={e => updateReport(chapterId, subChapterId, module.id, { chartTitle: e.target.value })}
        style={inputStyle}
        className="font-medium"
        onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(168,85,247,0.5)' }}
        onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-default)' }}
      />

      {report.chartImage ? (
        <div className="relative group/chart">
          <img
            src={report.chartImage}
            alt="图表"
            className="w-full rounded object-contain max-h-64"
            style={{ border: '1px solid var(--border-default)' }}
          />
          <button
            onClick={() => updateReport(chapterId, subChapterId, module.id, { chartImage: undefined })}
            className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover/chart:opacity-100 transition-opacity"
            style={{ background: 'rgba(248,113,113,0.9)', color: 'white' }}
          >删除</button>
        </div>
      ) : (
        <div
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleImage(f) }}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="rounded p-6 text-center text-[10px] transition-all duration-150 cursor-pointer"
          style={{
            border: '1px dashed rgba(168,85,247,0.3)',
            color: 'var(--text-muted)',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLDivElement
            el.style.borderColor = 'rgba(168,85,247,0.6)'
            el.style.color = '#c084fc'
            el.style.background = 'rgba(168,85,247,0.04)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLDivElement
            el.style.borderColor = 'rgba(168,85,247,0.3)'
            el.style.color = 'var(--text-muted)'
            el.style.background = 'transparent'
          }}
        >
          点击或拖拽上传图表
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f) }} />
        </div>
      )}

      <input
        type="text"
        placeholder="资料来源（如：Wind，公司公告）"
        value={report.chartSource ?? ''}
        onChange={e => updateReport(chapterId, subChapterId, module.id, { chartSource: e.target.value })}
        style={{ ...inputStyle, fontSize: 11, color: 'var(--text-secondary)' }}
        onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(168,85,247,0.5)' }}
        onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-default)' }}
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

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const runStream = async (mode: 'expand' | 'generate', system: string, userPrompt: string) => {
    const apiKey = aiSettings.apiKeys[aiSettings.providerId]
    if (!apiKey) { setError('请先在 AI 设置中填入 API Key'); return }
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setError(''); setLoading(mode)

    const separator = report.content ? '\n\n' : ''
    const anchor = report.content + separator
    let acc = ''

    try {
      const provider = PROVIDER_CONFIGS.find(p => p.id === aiSettings.providerId)
      await streamAI({
        providerId: aiSettings.providerId,
        apiKey,
        modelId: aiSettings.modelId,
        baseUrl: provider?.baseUrl,
        system,
        userPrompt,
        signal: ac.signal,
        onDelta: (chunk) => {
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
    const basePrompt = buildDraftPrompt(draft.sources ?? [], report.content)
    const extra = instruction.trim()
    const userPrompt = extra ? `${basePrompt}\n\n额外要求：${extra}` : basePrompt
    runStream('generate', DRAFT_PROMPT, userPrompt)
  }

  const handleStop = () => abortRef.current?.abort()

  const cardStyle = {
    background: 'var(--bg-card)',
    border: `1px solid ${isActive ? 'var(--border-gold)' : 'var(--border-subtle)'}`,
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    cursor: 'text',
    transition: 'all 0.15s',
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    fontSize: 11,
    padding: '5px 8px',
    fontFamily: 'var(--font-sans)',
    outline: 'none',
    transition: 'border-color 0.15s',
  }

  return (
    <div onClick={() => setActiveModule(module.id)} style={cardStyle}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span
          className="text-[9px] font-mono tracking-widest uppercase"
          style={{ color: isActive ? 'var(--gold)' : 'var(--text-muted)' }}
        >
          报告
          {isActive && <ActiveBadge color="gold" />}
        </span>
      </div>

      {/* Textarea */}
      <textarea
        placeholder="在此撰写报告内容..."
        value={report.content}
        onChange={e => updateReport(chapterId, subChapterId, module.id, { content: e.target.value })}
        rows={5}
        style={{
          width: '100%',
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
          borderRadius: 6,
          fontSize: 13,
          padding: '8px 10px',
          fontFamily: 'var(--font-sans)',
          lineHeight: 1.7,
          outline: 'none',
          resize: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--gold-dim)' }}
        onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--border-default)' }}
      />

      {error && (
        <p className="text-[11px]" style={{ color: '#f87171' }}>{error}</p>
      )}

      {/* AI 续写 */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="输入一句观点，AI 帮你续写..."
          value={viewpoint}
          onChange={e => setViewpoint(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleExpand() }}
          style={inputStyle}
          onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--gold-dim)' }}
          onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-default)' }}
        />
        {loading === 'expand' ? (
          <button
            onClick={handleStop}
            className="px-3 py-1.5 rounded text-[11px] whitespace-nowrap transition-all"
            style={{
              background: 'rgba(248,113,113,0.15)',
              border: '1px solid rgba(248,113,113,0.4)',
              color: '#f87171',
              fontFamily: 'var(--font-sans)',
            }}
          >停止</button>
        ) : (
          <button
            onClick={handleExpand}
            disabled={loading !== null || !viewpoint.trim()}
            className="px-3 py-1.5 rounded text-[11px] whitespace-nowrap transition-all disabled:opacity-40"
            style={{
              background: 'var(--gold-glow)',
              border: '1px solid var(--border-gold)',
              color: 'var(--gold)',
              fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,168,75,0.2)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--gold-glow)' }}
          >AI 续写</button>
        )}
      </div>

      {/* 从底稿生成 */}
      {hasSources && (
        <div
          className="flex gap-2 pt-2"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <input
            type="text"
            placeholder="额外指令（可选，如：重点分析竞争格局）"
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleGenerate() }}
            style={{ ...inputStyle, borderColor: 'var(--border-subtle)' }}
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--teal-dim)' }}
            onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-subtle)' }}
          />
          {loading === 'generate' ? (
            <button
              onClick={handleStop}
              className="px-3 py-1.5 rounded text-[11px] whitespace-nowrap transition-all"
              style={{
                background: 'rgba(248,113,113,0.15)',
                border: '1px solid rgba(248,113,113,0.4)',
                color: '#f87171',
                fontFamily: 'var(--font-sans)',
              }}
            >停止</button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={loading !== null}
              className="px-3 py-1.5 rounded text-[11px] whitespace-nowrap transition-all disabled:opacity-40"
              style={{
                background: 'rgba(45,212,191,0.08)',
                border: '1px solid rgba(45,212,191,0.3)',
                color: 'var(--teal)',
                fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,212,191,0.15)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,212,191,0.08)' }}
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
