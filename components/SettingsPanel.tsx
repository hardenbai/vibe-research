'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { PROVIDER_CONFIGS, getProviderModels, DEFAULT_PROVIDER_MODELS } from '@/lib/providers'
import type { ProviderId, ModelOption } from '@/lib/types'

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-default)',
  borderRadius: 6,
  fontSize: 12,
  padding: '6px 10px',
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  transition: 'border-color 0.15s',
}

function ModelEditor({
  providerId,
  models,
  onChange,
}: {
  providerId: ProviderId
  models: ModelOption[]
  onChange: (models: ModelOption[]) => void
}) {
  const [newId, setNewId] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editId, setEditId] = useState('')
  const [editLabel, setEditLabel] = useState('')

  const isCustomized = JSON.stringify(models) !== JSON.stringify(DEFAULT_PROVIDER_MODELS[providerId] ?? [])

  const addModel = () => {
    const id = newId.trim()
    const label = newLabel.trim() || id
    if (!id) return
    if (models.some(m => m.id === id)) return
    onChange([...models, { id, label }])
    setNewId('')
    setNewLabel('')
  }

  const removeModel = (index: number) => onChange(models.filter((_, i) => i !== index))

  const startEdit = (index: number) => {
    setEditingIdx(index)
    setEditId(models[index].id)
    setEditLabel(models[index].label)
  }

  const commitEdit = () => {
    if (editingIdx === null) return
    const id = editId.trim()
    const label = editLabel.trim() || id
    if (!id) return
    if (models.some((m, i) => m.id === id && i !== editingIdx)) return
    onChange(models.map((m, i) => (i === editingIdx ? { id, label } : m)))
    setEditingIdx(null)
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {models.length === 0 && (
          <p className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>暂无模型，请添加</p>
        )}
        {models.map((model, index) => (
          <div
            key={model.id + index}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded group"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}
          >
            {editingIdx === index ? (
              <>
                <input value={editId} onChange={e => setEditId(e.target.value)} placeholder="模型 ID"
                  style={{ ...inputStyle, flex: 1 }}
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit() }}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--gold-dim)' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-default)' }}
                />
                <input value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="显示名称"
                  style={{ ...inputStyle, flex: 1 }}
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit() }}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--gold-dim)' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-default)' }}
                />
                <button onClick={commitEdit} className="text-[11px] px-1 transition-colors" style={{ color: '#4ade80' }}>✓</button>
                <button onClick={() => setEditingIdx(null)} className="text-[11px] px-1 transition-colors" style={{ color: 'var(--text-muted)' }}>✕</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                  {model.label}
                  <span className="ml-1 font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>({model.id})</span>
                </span>
                <button onClick={() => startEdit(index)} className="opacity-0 group-hover:opacity-100 text-[11px] px-1 transition-all" style={{ color: 'var(--gold-dim)' }}>编辑</button>
                <button onClick={() => removeModel(index)} className="opacity-0 group-hover:opacity-100 text-[11px] px-1 transition-all" style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
                >删除</button>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <input value={newId} onChange={e => setNewId(e.target.value)} placeholder="模型 ID (如 glm-4)"
          style={{ ...inputStyle, flex: 1 }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addModel() } }}
          onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--gold-dim)' }}
          onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-default)' }}
        />
        <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="显示名称 (可选)"
          style={{ ...inputStyle, flex: 1 }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addModel() } }}
          onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--gold-dim)' }}
          onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-default)' }}
        />
        <button onClick={addModel} disabled={!newId.trim()}
          className="px-3 py-1.5 rounded text-[11px] transition-all disabled:opacity-40"
          style={{ background: 'var(--gold-glow)', border: '1px solid var(--border-gold)', color: 'var(--gold)', whiteSpace: 'nowrap' }}
        >添加</button>
      </div>

      {isCustomized && (
        <button onClick={() => onChange([...(DEFAULT_PROVIDER_MODELS[providerId] ?? [])])}
          className="text-[11px] transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--gold)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
        >↺ 恢复默认模型列表</button>
      )}
    </div>
  )
}

export default function SettingsPanel() {
  const [open, setOpen] = useState(false)
  const { aiSettings, updateAISettings, setApiKey, setProviderModels, resetProviderModels } = useStore()
  const [keyDraft, setKeyDraft] = useState<Partial<Record<ProviderId, string>>>({})
  const [managingModels, setManagingModels] = useState<ProviderId | null>(null)

  const currentConfig = PROVIDER_CONFIGS.find(p => p.id === aiSettings.providerId)!
  const currentModels = getProviderModels(aiSettings.providerId, aiSettings.customModels)

  const handleProviderChange = (id: ProviderId) => {
    const models = getProviderModels(id, aiSettings.customModels)
    const firstModel = models[0]?.id ?? ''
    updateAISettings({ providerId: id, modelId: firstModel })
    setManagingModels(null)
  }

  const saveKey = (pid: ProviderId) => {
    const val = keyDraft[pid]?.trim()
    if (val) {
      setApiKey(pid, val)
      setKeyDraft(d => ({ ...d, [pid]: '' }))
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-all duration-150"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.color = 'var(--text-secondary)'
          el.style.background = 'var(--bg-card-hover)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.color = 'var(--text-muted)'
          el.style.background = 'transparent'
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <span>AI 设置</span>
        <span className="ml-auto text-[10px] font-mono truncate max-w-[70px]" style={{ color: 'var(--gold-dim)' }}>
          {currentConfig.label}
        </span>
      </button>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(4,8,18,0.8)', backdropFilter: 'blur(4px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-[540px] max-h-[85vh] overflow-y-auto rounded-xl shadow-2xl"
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px var(--border-subtle)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div>
            <h2 className="font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>AI 设置</h2>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>配置模型与接口</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-md transition-all"
            style={{ color: 'var(--text-muted)', background: 'transparent' }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.color = 'var(--text-primary)'
              el.style.background = 'var(--bg-card)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.color = 'var(--text-muted)'
              el.style.background = 'transparent'
            }}
          >✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Provider selector */}
          <div>
            <label className="block text-[9px] font-mono tracking-[0.15em] uppercase mb-3" style={{ color: 'var(--text-muted)' }}>
              服务商
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDER_CONFIGS.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleProviderChange(p.id)}
                  className="px-3 py-2.5 rounded-lg text-sm text-left transition-all duration-150"
                  style={aiSettings.providerId === p.id ? {
                    background: 'var(--gold-glow)',
                    border: '1px solid var(--border-gold)',
                    color: 'var(--gold-bright)',
                  } : {
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={e => {
                    if (aiSettings.providerId !== p.id) {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.borderColor = 'var(--border-strong)'
                      el.style.color = 'var(--text-primary)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (aiSettings.providerId !== p.id) {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.borderColor = 'var(--border-subtle)'
                      el.style.color = 'var(--text-secondary)'
                    }
                  }}
                >
                  {p.label}
                  {aiSettings.apiKeys[p.id] && (
                    <span className="ml-1.5 text-[10px]" style={{ color: '#4ade80' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Model selector */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[9px] font-mono tracking-[0.15em] uppercase" style={{ color: 'var(--text-muted)' }}>
                模型
              </label>
              <button
                onClick={() => setManagingModels(managingModels === aiSettings.providerId ? null : aiSettings.providerId)}
                className="text-[11px] transition-colors"
                style={{ color: 'var(--gold-dim)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--gold)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--gold-dim)' }}
              >
                {managingModels === aiSettings.providerId ? '收起' : '管理模型'}
              </button>
            </div>

            <select
              value={aiSettings.modelId}
              onChange={e => updateAISettings({ modelId: e.target.value })}
              style={{
                ...inputStyle,
                fontSize: 13,
                padding: '8px 10px',
                cursor: 'pointer',
                marginBottom: 8,
              }}
              onFocus={e => { (e.target as HTMLSelectElement).style.borderColor = 'var(--gold-dim)' }}
              onBlur={e => { (e.target as HTMLSelectElement).style.borderColor = 'var(--border-default)' }}
            >
              {currentModels.map(m => (
                <option key={m.id} value={m.id} style={{ background: 'var(--bg-surface)' }}>{m.label}</option>
              ))}
            </select>

            {managingModels === aiSettings.providerId && (
              <ModelEditor
                providerId={aiSettings.providerId}
                models={currentModels}
                onChange={(models) => setProviderModels(aiSettings.providerId, models)}
              />
            )}
          </div>

          {/* API Keys */}
          <div>
            <label className="block text-[9px] font-mono tracking-[0.15em] uppercase mb-3" style={{ color: 'var(--text-muted)' }}>
              API Keys
            </label>
            <div className="space-y-3">
              {PROVIDER_CONFIGS.map(p => (
                <div key={p.id}>
                  <div className="text-[11px] mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {p.label}
                    {aiSettings.apiKeys[p.id] && <span className="ml-1.5 text-[10px]" style={{ color: '#4ade80' }}>已配置</span>}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder={aiSettings.apiKeys[p.id] ? '已保存（输入新值以更新）' : `输入 ${p.label} API Key`}
                      value={keyDraft[p.id] ?? ''}
                      onChange={e => setKeyDraft(d => ({ ...d, [p.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') saveKey(p.id) }}
                      style={{ ...inputStyle, flex: 1, fontSize: 12 }}
                      onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--gold-dim)' }}
                      onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-default)' }}
                    />
                    <button
                      onClick={() => saveKey(p.id)}
                      disabled={!keyDraft[p.id]?.trim()}
                      className="px-3 py-1.5 rounded text-[11px] transition-all disabled:opacity-40"
                      style={{
                        background: 'var(--gold-glow)',
                        border: '1px solid var(--border-gold)',
                        color: 'var(--gold)',
                        whiteSpace: 'nowrap',
                      }}
                    >保存</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
            API Key 及模型配置仅存储在本地浏览器，不会上传至服务器。
          </p>
        </div>
      </div>
    </div>
  )
}
