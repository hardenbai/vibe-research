'use client'

import { useState, useRef } from 'react'
import { useStore } from '@/lib/store'
import type { Module, DraftSource } from '@/lib/types'
import { PROVIDER_CONFIGS } from '@/lib/providers'

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

async function callAI(providerId: string, apiKey: string, modelId: string, baseUrl: string | undefined, system: string, userPrompt: string): Promise<string> {
  if (providerId === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: modelId, max_tokens: 2048, system, messages: [{ role: 'user', content: userPrompt }] }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || 'Anthropic API 错误')
    return data.content?.[0]?.type === 'text' ? data.content[0].text : ''
  }
  const url = baseUrl ? `${baseUrl}/chat/completions` : 'https://api.openai.com/v1/chat/completions'
  const res = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: modelId, max_tokens: 2048, messages: [{ role: 'system', content: system }, { role: 'user', content: userPrompt }] }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'API 错误')
  return data.choices?.[0]?.message?.content ?? ''
}

function ChartModule({ chapterId, subChapterId, module }: Props) {
  const { updateReport } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const { report } = module
  const handleImage = (file: File) => { const r = new FileReader(); r.onload = e => updateReport(chapterId, subChapterId, module.id, { chartImage: e.target?.result as string }); r.readAsDataURL(file) }
  return (
    <div className="flex flex-col gap-2 p-3 bg-gray-800 rounded-lg border border-purple-900/50 min-h-[120px]">
      <input type="text" placeholder="图表标题（如：图1. XX走势图）" value={report.chartTitle ?? ''}
        onChange={e => updateReport(chapterId, subChapterId, module.id, { chartTitle: e.target.value })}
        className="w-full bg-gray-900 text-gray-200 text-sm font-medium rounded px-2 py-1.5 border border-gray-600 focus:border-purple-500 focus:outline-none placeholder-gray-500" />
      {report.chartImage ? (
        <div className="relative group/chart">
          <img src={report.chartImage} alt="图表" className="w-full rounded border border-gray-600 object-contain max-h-64" />
          <button onClick={() => updateReport(chapterId, subChapterId, module.id, { chartImage: undefined })}
            className="absolute top-1 right-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover/chart:opacity-100 transition-opacity">删除</button>
        </div>
      ) : (
        <div onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleImage(f) }} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-purple-800 rounded p-6 text-center text-gray-500 text-xs cursor-pointer hover:border-purple-500 hover:text-purple-400 transition-colors">
          点击或拖拽上传图表
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f) }} />
        </div>
      )}
      <input type="text" placeholder="资料来源（如：Wind，公司公告）" value={report.chartSource ?? ''}
        onChange={e => updateReport(chapterId, subChapterId, module.id, { chartSource: e.target.value })}
        className="w-full bg-gray-900 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-600 focus:border-purple-500 focus:outline-none placeholder-gray-500" />
    </div>
  )
}

function TextModule({ chapterId, subChapterId, module }: Props) {
  const { updateReport, aiSettings, setActiveModule } = useStore()
  const [viewpoint, setViewpoint] = useState('')
  const [instruction, setInstruction] = useState('')
  const [loading, setLoading] = useState<'expand' | 'generate' | null>(null)
  const [error, setError] = useState('')
  const { report, draft } = module
  const hasSources = (draft.sources ?? []).length > 0 && (draft.sources ?? []).some(s => s.url || s.note || s.imageBase64)

  const append = (content: string) =>
    updateReport(chapterId, subChapterId, module.id, {
      content: report.content ? report.content + '\n\n' + content : content,
    })

  const handleExpand = async () => {
    if (!viewpoint.trim()) return
    const apiKey = aiSettings.apiKeys[aiSettings.providerId]
    if (!apiKey) { setError('请先在 AI 设置中填入 API Key'); return }
    setError(''); setLoading('expand')
    try {
      const provider = PROVIDER_CONFIGS.find(p => p.id === aiSettings.providerId)
      const content = await callAI(aiSettings.providerId, apiKey, aiSettings.modelId, provider?.baseUrl, EXPAND_PROMPT,
        buildExpandPrompt(viewpoint, draft.sources ?? [], report.content))
      if (content) { append(content); setViewpoint('') }
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'AI 生成失败') } finally { setLoading(null) }
  }

  const handleGenerate = async () => {
    if (!hasSources) { setError('请先在左侧底稿中填写来源信息'); return }
    const apiKey = aiSettings.apiKeys[aiSettings.providerId]
    if (!apiKey) { setError('请先在 AI 设置中填入 API Key'); return }
    setError(''); setLoading('generate')
    try {
      const provider = PROVIDER_CONFIGS.find(p => p.id === aiSettings.providerId)
      const basePrompt = buildDraftPrompt(draft.sources ?? [], report.content)
      const extra = instruction.trim()
      const userPrompt = extra ? `${basePrompt}\n\n额外要求：${extra}` : basePrompt
      const content = await callAI(aiSettings.providerId, apiKey, aiSettings.modelId, provider?.baseUrl, DRAFT_PROMPT, userPrompt)
      if (content) { append(content); setInstruction('') }
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'AI 生成失败') } finally { setLoading(null) }
  }

  const handleFocus = () => setActiveModule(module.id)
  const handleBlur = () => setActiveModule(null)

  return (
    <div className="flex flex-col gap-2 p-3 bg-gray-800 rounded-lg border border-gray-700 min-h-[120px]">
      <textarea placeholder="在此撰写报告内容..." value={report.content}
        onChange={e => updateReport(chapterId, subChapterId, module.id, { content: e.target.value })}
        onFocus={handleFocus} onBlur={handleBlur}
        rows={5}
        className="w-full bg-gray-900 text-gray-200 text-sm rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none placeholder-gray-500 resize-none leading-relaxed transition-all" />

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {/* AI 续写 */}
      <div className="flex gap-2">
        <input type="text" placeholder="输入一句观点，AI 帮你续写..." value={viewpoint}
          onChange={e => setViewpoint(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleExpand() }}
          className="flex-1 bg-gray-900 text-gray-200 text-xs rounded px-2 py-1.5 border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-500" />
        <button onClick={handleExpand} disabled={loading !== null || !viewpoint.trim()}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs rounded transition-colors whitespace-nowrap">
          {loading === 'expand' ? '生成中...' : 'AI 续写'}
        </button>
      </div>

      {/* 从底稿生成 */}
      {hasSources && (
        <div className="flex gap-2 border-t border-gray-700 pt-2">
          <input type="text" placeholder="额外指令（可选，如：重点分析竞争格局）"
            value={instruction} onChange={e => setInstruction(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleGenerate() }}
            className="flex-1 bg-gray-900 text-gray-200 text-xs rounded px-2 py-1.5 border border-gray-600 focus:border-green-500 focus:outline-none placeholder-gray-500" />
          <button onClick={handleGenerate} disabled={loading !== null}
            className="px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:bg-gray-600 text-white text-xs rounded transition-colors whitespace-nowrap">
            {loading === 'generate' ? '生成中...' : '从底稿生成'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function ReportBlock(props: Props) {
  return props.module.type === 'chart' ? <ChartModule {...props} /> : <TextModule {...props} />
}
