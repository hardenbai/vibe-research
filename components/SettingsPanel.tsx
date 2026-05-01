'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { PROVIDER_CONFIGS, getProviderModels, DEFAULT_PROVIDER_MODELS } from '@/lib/providers'
import type { ProviderId, ModelOption } from '@/lib/types'

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--input-bg)', color: 'var(--t1)',
  border: '1px solid var(--input-border)', borderRadius: 8, fontSize: 13,
  padding: '8px 11px', fontFamily: 'var(--font)', outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}
const focus = (el: HTMLElement, on: boolean) => {
  el.style.borderColor = on ? 'var(--accent-border)' : 'var(--input-border)'
  el.style.boxShadow = on ? 'var(--input-focus-shadow)' : 'none'
}

function ModelEditor({ providerId, models, onChange }: { providerId: ProviderId; models: ModelOption[]; onChange: (m: ModelOption[]) => void }) {
  const [newId, setNewId] = useState(''); const [newLabel, setNewLabel] = useState('')
  const [editIdx, setEditIdx] = useState<number | null>(null); const [editId, setEditId] = useState(''); const [editLabel, setEditLabel] = useState('')
  const isCustomized = JSON.stringify(models) !== JSON.stringify(DEFAULT_PROVIDER_MODELS[providerId] ?? [])

  const add = () => {
    const id = newId.trim(); if (!id || models.some(m => m.id === id)) return
    onChange([...models, { id, label: newLabel.trim() || id }]); setNewId(''); setNewLabel('')
  }
  const commit = () => {
    if (editIdx === null) return
    const id = editId.trim(); if (!id || models.some((m, i) => m.id === id && i !== editIdx)) return
    onChange(models.map((m, i) => i === editIdx ? { id, label: editLabel.trim() || id } : m)); setEditIdx(null)
  }

  return (
    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 176, overflowY: 'auto' }}>
        {models.length === 0 && <p style={{ fontSize: 12, color: 'var(--t4)', fontStyle: 'italic' }}>暂无模型，请添加</p>}
        {models.map((m, i) => (
          <div key={m.id + i} className="group flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: 'var(--ws-bg)', border: '1px solid var(--input-border)' }}>
            {editIdx === i ? (
              <>
                <input value={editId} onChange={e => setEditId(e.target.value)} placeholder="模型 ID" style={{ ...inp, flex: 1 }} onKeyDown={e => { if (e.key === 'Enter') commit() }} onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />
                <input value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="显示名称" style={{ ...inp, flex: 1 }} onKeyDown={e => { if (e.key === 'Enter') commit() }} onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />
                <button onClick={commit} style={{ color: 'var(--green)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>✓</button>
                <button onClick={() => setEditIdx(null)} style={{ color: 'var(--t4)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.label} <span style={{ color: 'var(--t4)', fontFamily: 'var(--mono)', fontSize: 11 }}>({m.id})</span>
                </span>
                <button onClick={() => { setEditIdx(i); setEditId(m.id); setEditLabel(m.label) }} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>编辑</button>
                <button onClick={() => onChange(models.filter((_, j) => j !== i))} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: 12, color: 'var(--t4)', background: 'none', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t4)' }}>删除</button>
              </>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={newId} onChange={e => setNewId(e.target.value)} placeholder="模型 ID" style={{ ...inp, flex: 1 }} onKeyDown={e => { if (e.key === 'Enter') add() }} onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />
        <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="显示名称" style={{ ...inp, flex: 1 }} onKeyDown={e => { if (e.key === 'Enter') add() }} onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />
        <button onClick={add} disabled={!newId.trim()} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', opacity: newId.trim() ? 1 : 0.4, whiteSpace: 'nowrap' }}>添加</button>
      </div>
      {isCustomized && <button onClick={() => onChange([...(DEFAULT_PROVIDER_MODELS[providerId] ?? [])])} style={{ fontSize: 12, color: 'var(--t4)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-hover)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t4)' }}>↺ 恢复默认模型列表</button>}
    </div>
  )
}

export default function SettingsPanel() {
  const [open, setOpen] = useState(false)
  const { aiSettings, updateAISettings, setApiKey, setProviderModels, resetProviderModels: _r } = useStore()
  const [keyDraft, setKeyDraft] = useState<Partial<Record<ProviderId, string>>>({})
  const [managingModels, setManagingModels] = useState<ProviderId | null>(null)
  const currentConfig = PROVIDER_CONFIGS.find(p => p.id === aiSettings.providerId)!
  const currentModels = getProviderModels(aiSettings.providerId, aiSettings.customModels)

  const saveKey = (pid: ProviderId) => {
    const val = keyDraft[pid]?.trim(); if (val) { setApiKey(pid, val); setKeyDraft(d => ({ ...d, [pid]: '' })) }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--st2)', fontSize: 13.5, transition: 'all 0.15s', fontFamily: 'var(--font)' }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'var(--sidebar-hover)'; el.style.color = 'var(--st1)' }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'transparent'; el.style.color = 'var(--st2)' }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
      <span>AI 设置</span>
      <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--st3)' }}>{currentConfig.label}</span>
    </button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)' }}
      onClick={() => setOpen(false)}>
      <div onClick={e => e.stopPropagation()}
        className="fade-up"
        style={{
          width: 520, maxHeight: '82vh', overflowY: 'auto', borderRadius: 16,
          background: 'var(--card)', border: '1px solid var(--divider)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)',
        }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--divider)' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.02em', margin: 0 }}>AI 设置</h2>
            <p style={{ fontSize: 12, color: 'var(--t4)', margin: '4px 0 0' }}>配置模型与 API 接口</p>
          </div>
          <button onClick={() => setOpen(false)}
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--ws-bg)', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'var(--input-border)'; b.style.color = 'var(--t1)' }}
            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'var(--ws-bg)'; b.style.color = 'var(--t3)' }}
          >✕</button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Provider */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>服务商</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {PROVIDER_CONFIGS.map(p => (
                <button key={p.id} onClick={() => { const ms = getProviderModels(p.id, aiSettings.customModels); updateAISettings({ providerId: p.id, modelId: ms[0]?.id ?? '' }); setManagingModels(null) }}
                  style={{
                    padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                    textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s',
                    background: aiSettings.providerId === p.id ? 'var(--accent-light)' : 'var(--ws-bg)',
                    border: `1px solid ${aiSettings.providerId === p.id ? 'var(--accent-border)' : 'var(--input-border)'}`,
                    color: aiSettings.providerId === p.id ? 'var(--accent-hover)' : 'var(--t2)',
                  }}
                  onMouseEnter={e => { if (aiSettings.providerId !== p.id) { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'rgba(0,0,0,0.2)'; b.style.color = 'var(--t1)' } }}
                  onMouseLeave={e => { if (aiSettings.providerId !== p.id) { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--input-border)'; b.style.color = 'var(--t2)' } }}
                >
                  {p.label}
                  {aiSettings.apiKeys[p.id] && <span style={{ fontSize: 13, color: 'var(--green)' }}>✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Model */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>模型</label>
              <button onClick={() => setManagingModels(managingModels ? null : aiSettings.providerId)} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {managingModels ? '收起' : '管理模型'}
              </button>
            </div>
            <select value={aiSettings.modelId} onChange={e => updateAISettings({ modelId: e.target.value })}
              style={{ ...inp, cursor: 'pointer' }} onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)}>
              {currentModels.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            {managingModels && <ModelEditor providerId={aiSettings.providerId} models={currentModels} onChange={ms => setProviderModels(aiSettings.providerId, ms)} />}
          </div>

          {/* API Keys */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>API Keys</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {PROVIDER_CONFIGS.map(p => (
                <div key={p.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--t2)' }}>{p.label}</span>
                    {aiSettings.apiKeys[p.id] && <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>已配置</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="password" placeholder={aiSettings.apiKeys[p.id] ? '已保存（输入新值更新）' : `输入 ${p.label} API Key`}
                      value={keyDraft[p.id] ?? ''} onChange={e => setKeyDraft(d => ({ ...d, [p.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') saveKey(p.id) }}
                      style={{ ...inp, flex: 1 }} onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />
                    <button onClick={() => saveKey(p.id)} disabled={!keyDraft[p.id]?.trim()}
                      style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', opacity: keyDraft[p.id]?.trim() ? 1 : 0.4, whiteSpace: 'nowrap', transition: 'opacity 0.15s' }}>保存</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p style={{ fontSize: 11, color: 'var(--t4)' }}>API Key 仅存储在本地浏览器，不会上传至服务器。</p>
        </div>
      </div>
    </div>
  )
}
