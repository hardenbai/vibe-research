'use client'

import { useState, useRef } from 'react'
import { useStore } from '@/lib/store'
import type { Module } from '@/lib/types'
import { PROVIDER_CONFIGS } from '@/lib/providers'

interface Props {
  chapterId: string
  subChapterId: string | null
  module: Module
}

const SYSTEM_PROMPT = `你是一位专业的金融研究分析师，擅长撰写研究报告。
请根据用户提供的观点和底稿材料，用专业、简洁、有说服力的语言续写研究报告段落。
要求：
- 语言专业，符合研究报告风格
- 逻辑清晰，有据可查
- 直接输出报告内容，不要加说明性前缀`

function buildUserPrompt(viewpoint: string, draftNotes?: string, draftUrls?: string, existingContent?: string) {
  const parts: string[] = []
  if (draftUrls) parts.push(`参考资料链接：\n${draftUrls}`)
  if (draftNotes) parts.push(`底稿备注：\n${draftNotes}`)
  if (existingContent) parts.push(`已有内容：\n${existingContent}`)
  const context = parts.join('\n\n')
  return context
    ? `${context}\n\n请基于以上材料，围绕以下观点续写：${viewpoint}`
    : `请围绕以下观点撰写研究报告段落：${viewpoint}`
}

async function callAnthropic(apiKey: string, modelId: string, userPrompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Anthropic API 错误')
  return data.content?.[0]?.type === 'text' ? data.content[0].text : ''
}

async function callOpenAICompat(
  apiKey: string,
  modelId: string,
  baseURL: string | undefined,
  userPrompt: string
): Promise<string> {
  const url = baseURL ? `${baseURL}/chat/completions` : 'https://api.openai.com/v1/chat/completions'
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'API 错误')
  return data.choices?.[0]?.message?.content ?? ''
}

function ChartModule({ chapterId, subChapterId, module }: Props) {
  const { updateReport } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const { report } = module

  const handleImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => updateReport(chapterId, subChapterId, module.id, { chartImage: e.target?.result as string })
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) handleImage(file)
  }

  return (
    <div className="flex flex-col gap-2 p-3 bg-gray-800 rounded-lg border border-purple-900/50 min-h-[120px]">
      {/* 标题 */}
      <input
        type="text"
        placeholder="图表标题（如：图1. XX走势图）"
        value={report.chartTitle ?? ''}
        onChange={e => updateReport(chapterId, subChapterId, module.id, { chartTitle: e.target.value })}
        className="w-full bg-gray-900 text-gray-200 text-sm font-medium rounded px-2 py-1.5 border border-gray-600 focus:border-purple-500 focus:outline-none placeholder-gray-500"
      />

      {/* 图表 */}
      {report.chartImage ? (
        <div className="relative group/chart">
          <img src={report.chartImage} alt="图表"
            className="w-full rounded border border-gray-600 object-contain max-h-64" />
          <button
            onClick={() => updateReport(chapterId, subChapterId, module.id, { chartImage: undefined })}
            className="absolute top-1 right-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover/chart:opacity-100 transition-opacity"
          >删除</button>
        </div>
      ) : (
        <div
          onDrop={handleDrop} onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-purple-800 rounded p-6 text-center text-gray-500 text-xs cursor-pointer hover:border-purple-500 hover:text-purple-400 transition-colors"
        >
          点击或拖拽上传图表
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f) }} />
        </div>
      )}

      {/* 资料来源 */}
      <input
        type="text"
        placeholder="资料来源（如：Wind，公司公告）"
        value={report.chartSource ?? ''}
        onChange={e => updateReport(chapterId, subChapterId, module.id, { chartSource: e.target.value })}
        className="w-full bg-gray-900 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-600 focus:border-purple-500 focus:outline-none placeholder-gray-500"
      />

    </div>
  )
}

function TextModule({ chapterId, subChapterId, module }: Props) {
  const { updateReport, aiSettings } = useStore()
  const [viewpoint, setViewpoint] = useState('')
  const [instruction, setInstruction] = useState('')
  const [loading, setLoading] = useState<'expand' | 'generate' | null>(null)
  const [error, setError] = useState('')
  const { report, draft } = module

  const sources = draft.sources ?? []
  const draftNotes = sources.map(s => s.note).filter(Boolean).join('\n')
  const draftUrls = sources.map(s => s.url).filter(Boolean).join('\n')
  const hasDraftContent = draftNotes || draftUrls

  const callAI = async (userPrompt: string) => {
    const apiKey = aiSettings.apiKeys[aiSettings.providerId]
    if (!apiKey) throw new Error('请先在 AI 设置中填入 API Key')
    const provider = PROVIDER_CONFIGS.find(p => p.id === aiSettings.providerId)
    if (aiSettings.providerId === 'anthropic') {
      return callAnthropic(apiKey, aiSettings.modelId, userPrompt)
    }
    return callOpenAICompat(apiKey, aiSettings.modelId, provider?.baseUrl, userPrompt)
  }

  const append = (content: string) => {
    updateReport(chapterId, subChapterId, module.id, {
      content: report.content ? report.content + '\n\n' + content : content,
    })
  }

  const handleExpand = async () => {
    if (!viewpoint.trim()) return
    setError('')
    setLoading('expand')
    try {
      const userPrompt = buildUserPrompt(viewpoint, draftNotes, draftUrls, report.content)
      const content = await callAI(userPrompt)
      if (content) { append(content); setViewpoint('') }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'AI 生成失败')
    } finally {
      setLoading(null)
    }
  }

  const handleGenerate = async () => {
    if (!hasDraftContent) { setError('请先在左侧底稿中填写来源信息'); return }
    setError('')
    setLoading('generate')
    try {
      const parts: string[] = []
      if (draftUrls) parts.push(`参考资料链接：\n${draftUrls}`)
      if (draftNotes) parts.push(`底稿备注：\n${draftNotes}`)
      if (report.content) parts.push(`已有内容：\n${report.content}`)
      const extra = instruction.trim()
      const context = parts.join('\n\n')
      const userPrompt = extra
        ? `${context}\n\n请基于以上材料，${extra}，撰写研究报告内容。`
        : `${context}\n\n请基于以上材料，撰写一段专业的研究报告内容。`
      const content = await callAI(userPrompt)
      if (content) { append(content); setInstruction('') }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'AI 生成失败')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col gap-2 p-3 bg-gray-800 rounded-lg border border-gray-700 min-h-[120px]">
      <textarea
        placeholder="在此撰写报告内容..."
        value={report.content}
        onChange={e => updateReport(chapterId, subChapterId, module.id, { content: e.target.value })}
        rows={5}
        className="w-full bg-gray-900 text-gray-200 text-sm rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-500 resize-none leading-relaxed"
      />

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {/* AI 续写 */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="输入一句观点，AI 帮你续写..."
          value={viewpoint}
          onChange={e => setViewpoint(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleExpand() }}
          className="flex-1 bg-gray-900 text-gray-200 text-xs rounded px-2 py-1.5 border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-500"
        />
        <button
          onClick={handleExpand}
          disabled={loading !== null || !viewpoint.trim()}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs rounded transition-colors whitespace-nowrap"
        >
          {loading === 'expand' ? '生成中...' : 'AI 续写'}
        </button>
      </div>

      {/* 从底稿生成 */}
      <div className="flex gap-2 border-t border-gray-700 pt-2">
        <input
          type="text"
          placeholder="额外指令（可选，如：重点分析竞争格局）"
          value={instruction}
          onChange={e => setInstruction(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleGenerate() }}
          className="flex-1 bg-gray-900 text-gray-200 text-xs rounded px-2 py-1.5 border border-gray-600 focus:border-green-500 focus:outline-none placeholder-gray-500"
        />
        <button
          onClick={handleGenerate}
          disabled={loading !== null || !hasDraftContent}
          title={!hasDraftContent ? '请先填写底稿来源信息' : ''}
          className="px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:bg-gray-600 text-white text-xs rounded transition-colors whitespace-nowrap"
        >
          {loading === 'generate' ? '生成中...' : '从底稿生成'}
        </button>
      </div>
    </div>
  )
}

export default function ReportBlock(props: Props) {
  return props.module.type === 'chart'
    ? <ChartModule {...props} />
    : <TextModule {...props} />
}
