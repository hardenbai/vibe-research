'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { PROVIDER_CONFIGS, getProviderModels, DEFAULT_PROVIDER_MODELS } from '@/lib/providers'
import type { ProviderId, ModelOption } from '@/lib/types'

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg-base)', color: 'var(--text-primary)',
  border: '1px solid var(--border)', borderRadius: 8, fontSize: 13,
  padding: '7px 10px', fontFamily: 'var(--font-system)', outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

function focusRing(el: HTMLElement, focused: boolean) {
  el.style.borderColor = focused ? 'var(--accent-border)' : 'var(--border)'
  el.style.boxShadow = focused ? '0 0 0 3px var(--accent-bg)' : 'none'
}

function ModelEditor({ providerId, models, onChange }: {
  providerId: ProviderId; models: ModelOption[]; onChange: (m: ModelOption[]) => void
}) {
  const [newId, setNewId] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editId, setEditId] = useState('')
  const [editLabel, setEditLabel] = useState('')

  const isCustomized = JSON.stringify(models) !== JSON.stringify(DEFAULT_PROVIDER_MODELS[providerId] ?? [])

  const addModel = () => {
    const id = newId.trim(); const label = newLabel.trim() || id
    if (!id || models.some(m => m.id === id)) return
    onChange([...models, { id, label }]); setNewId(''); setNewLabel('')
  }

  const commitEdit = () => {
    if (editingIdx === null) return
    const id = editId.trim(); const label = editLabel.trim() || id
    if (!id || models.some((m, i) => m.id === id && i !== editingIdx)) return
    onChange(models.map((m, i) => i === editingIdx ? { id, label } : m))
    setEditingIdx(null)
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="space-y-1 max-h-44 overflow-y-auto">
        {models.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>暂无模型，请添加</p>
        )}
        {models.map((model, index) => (
          <div key={model.id + index}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg group"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}
          >
            {editingIdx === index ? (
              <>
                <input value={editId} onChange={e => setEditId(e.target.value)} placeholder="模型 ID"
                  style={{ ...inputStyle, flex: 1 }}
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit() }}
                  onFocus={e => focusRing(e.target as HTMLElement, true)}
                  onBlur={e => focusRing(e.target as HTMLElement, false)}
                />
                <input value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="显示名称"
                  style={{ ...inputStyle, flex: 1 }}
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit() }}
                  onFocus={e => focusRing(e.target as HTMLElement, true)}
                  onBlur={e => focusRing(e.target as HTMLElement, false)}
                />
                <button onClick={commitEdit} style={{ fontSize: 13, color: 'var(--green)' }}>✓</button>
                <button onClick={() => setEditingIdx(null)} style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>✕</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>
                  {model.label}
                  <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 10, marginLeft: 6 }}>({model.id})</span>
                </span>
                <button onClick={() => { setEditingIdx(index); setEditId(model.id); setEditLabel(model.label) }}
                  className="opacity-0 group-hover:opacity-100 text-[11px] transition-opacity"
                  style={{ color: 'var(--accent)' }}>编辑</button>
                <button onClick={() => onChange(models.filter((_, i) => i !== index))}
                  className="opacity-0 group-hover:opacity-100 text-[11px] transition-opacity"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)' }}
                >删除</button>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input value={newId} onChange={e => setNewId(e.target.value)} placeholder="模型 ID (如 glm-4)"
          style={{ ...inputStyle, flex: 1 }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addModel() } }}
          onFocus={e => focusRing(e.target as HTMLElement, true)}
          onBlur={e => focusRing(e.target as HTMLElement, false)}
        />
        <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="显示名称"
          style={{ ...inputStyle, flex: 1 }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addModel() } }}
          onFocus={e => focusRing(e.target as HTMLElement, true)}
          onBlur={e => focusRing(e.target as HTMLElement, false)}
        />
        <button onClick={addModel} disabled={!newId.trim()}
          className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-40"
          style={{ background: 'var(--accent)', color: 'white', border: 'none', whiteSpace: 'nowrap' }}
        >添加</button>
      </div>

      {isCustomized && (
        <button onClick={() => onChange([...(DEFAULT_PROVIDER_MODELS[providerId] ?? [])])}
          style={{ fontSize: 12, color: 'var(--text-tertiary)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)' }}
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
    updateAISettings({ providerId: id, modelId: models[0]?.id ?? '' })
    setManagingModels(null)
  }

  const saveKey = (pid: ProviderId) => {
    const val = keyDraft[pid]?.trim()
    if (val) { setApiKey(pid, val); setKeyDraft(d => ({ ...d, [pid]: '' })) }
  }

  void resetProviderModels

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-100"
        style={{ color: 'var(--text-secondary)', fontSize: 13, background: 'transparent' }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = 'rgba(255,255,255,0.05)'
          el.style.color = 'var(--text-primary)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = 'transparent'
          el.style.color = 'var(--text-secondary)'
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <span>AI 设置</span>
        <span className="ml-auto text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          {currentConfig.label}
        </span>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={() => setOpen(false)}
    >
      <div className="w-[520px] max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl animate-fade-in"
        style={{
          background: 'rgba(28,28,30,0.95)',
          border: '1px solid var(--border-medium)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.05) inset',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid var(--separator)' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>AI 设置</h2>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>配置模型与 API 接口</p>
          </div>
          <button onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-100"
            style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 14 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card-hover)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)' }}
          >✕</button>
        </div>

        <div className="p-6 space-y-7">
          {/* Provider */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              服务商
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDER_CONFIGS.map(p => (
                <button key={p.id} onClick={() => handleProviderChange(p.id)}
                  className="px-3 py-2.5 rounded-xl text-[13px] text-left transition-all duration-100 flex items-center justify-between"
                  style={aiSettings.providerId === p.id
                    ? { background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontWeight: 500 }
                    : { background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }
                  }
                  onMouseEnter={e => {
                    if (aiSettings.providerId !== p.id) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-medium)'
                      ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (aiSettings.providerId !== p.id) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
                      ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
                    }
                  }}
                >
                  <span>{p.label}</span>
                  {aiSettings.apiKeys[p.id] && (
                    <span style={{ fontSize: 11, color: 'var(--green)' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Model */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                模型
              </label>
              <button onClick={() => setManagingModels(managingModels === aiSettings.providerId ? null : aiSettings.providerId)}
                style={{ fontSize: 12, color: 'var(--accent)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.8' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
              >
                {managingModels === aiSettings.providerId ? '收起' : '管理模型'}
              </button>
            </div>
            <select value={aiSettings.modelId} onChange={e => updateAISettings({ modelId: e.target.value })}
              style={{ ...inputStyle, cursor: 'pointer' }}
              onFocus={e => focusRing(e.target as HTMLElement, true)}
              onBlur={e => focusRing(e.target as HTMLElement, false)}
            >
              {currentModels.map(m => (
                <option key={m.id} value={m.id} style={{ background: 'var(--bg-surface)' }}>{m.label}</option>
              ))}
            </select>
            {managingModels === aiSettings.providerId && (
              <ModelEditor providerId={aiSettings.providerId} models={currentModels}
                onChange={models => setProviderModels(aiSettings.providerId, models)} />
            )}
          </div>

          {/* API Keys */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              API Keys
            </label>
            <div className="space-y-3">
              {PROVIDER_CONFIGS.map(p => (
                <div key={p.id}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{p.label}</span>
                    {aiSettings.apiKeys[p.id] && (
                      <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 500 }}>已配置</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input type="password"
                      placeholder={aiSettings.apiKeys[p.id] ? '已保存（输入新值以更新）' : `输入 ${p.label} API Key`}
                      value={keyDraft[p.id] ?? ''}
                      onChange={e => setKeyDraft(d => ({ ...d, [p.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') saveKey(p.id) }}
                      style={{ ...inputStyle, flex: 1 }}
                      onFocus={e => focusRing(e.target as HTMLElement, true)}
                      onBlur={e => focusRing(e.target as HTMLElement, false)}
                    />
                    <button onClick={() => saveKey(p.id)} disabled={!keyDraft[p.id]?.trim()}
                      className="px-4 py-2 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-40"
                      style={{ background: 'var(--accent)', color: 'white', border: 'none', whiteSpace: 'nowrap' }}
                      onMouseEnter={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-hover)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)' }}
                    >保存</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', opacity: 0.7 }}>
            API Key 及设置仅存储在本地浏览器，不会上传至任何服务器。
          </p>
        </div>
      </div>
    </div>
  )
}
