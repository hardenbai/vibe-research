'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { PROVIDER_CONFIGS, getProviderModels, DEFAULT_PROVIDER_MODELS } from '@/lib/providers'
import type { ProviderId, ModelOption } from '@/lib/types'

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--bg-0)', color: 'var(--t1)',
  border: '1px solid var(--b1)', borderRadius: 6, fontSize: 12.5,
  padding: '7px 10px', fontFamily: 'var(--mono)', outline: 'none',
  transition: 'border-color 0.12s, box-shadow 0.12s',
}
const focus = (el: HTMLElement, on: boolean) => {
  el.style.borderColor = on ? 'var(--accent-border)' : 'var(--b1)'
  el.style.boxShadow = on ? 'var(--accent-glow)' : 'none'
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
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 160, overflowY: 'auto' }}>
        {models.length === 0 && <p style={{ fontSize: 11, color: 'var(--t4)', fontStyle: 'italic', fontFamily: 'var(--mono)' }}>no models — add one below</p>}
        {models.map((m, i) => (
          <div key={m.id + i} className="group flex items-center gap-2 px-2 py-1.5 rounded"
            style={{ background: 'var(--bg-0)', border: '1px solid var(--b1)' }}>
            {editIdx === i ? (
              <>
                <input value={editId} onChange={e => setEditId(e.target.value)} placeholder="model id" style={{ ...inp, flex: 1 }} onKeyDown={e => { if (e.key === 'Enter') commit() }} onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />
                <input value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="display name" style={{ ...inp, flex: 1 }} onKeyDown={e => { if (e.key === 'Enter') commit() }} onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />
                <button onClick={commit} style={{ color: 'var(--green)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>✓</button>
                <button onClick={() => setEditIdx(null)} style={{ color: 'var(--t4)', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--mono)' }}>
                  {m.label} <span style={{ color: 'var(--t4)', fontSize: 11 }}>({m.id})</span>
                </span>
                <button onClick={() => { setEditIdx(i); setEditId(m.id); setEditLabel(m.label) }} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)' }}>edit</button>
                <button onClick={() => onChange(models.filter((_, j) => j !== i))} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: 11, color: 'var(--t4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t4)' }}>rm</button>
              </>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={newId} onChange={e => setNewId(e.target.value)} placeholder="model-id" style={{ ...inp, flex: 1 }} onKeyDown={e => { if (e.key === 'Enter') add() }} onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />
        <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="display name" style={{ ...inp, flex: 1 }} onKeyDown={e => { if (e.key === 'Enter') add() }} onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />
        <button onClick={add} disabled={!newId.trim()} style={{ padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: 'var(--accent)', color: '#0d0d0e', border: 'none', cursor: 'pointer', opacity: newId.trim() ? 1 : 0.4, whiteSpace: 'nowrap', fontFamily: 'var(--mono)' }}>add</button>
      </div>
      {isCustomized && <button onClick={() => onChange([...(DEFAULT_PROVIDER_MODELS[providerId] ?? [])])} style={{ fontSize: 11, color: 'var(--t4)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--mono)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t4)' }}>↺ reset to defaults</button>}
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
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 12.5, transition: 'all 0.1s', fontFamily: 'var(--mono)' }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'rgba(255,255,255,0.04)'; el.style.color = 'var(--t2)' }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'transparent'; el.style.color = 'var(--t3)' }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
      <span>settings</span>
      <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--t4)', fontFamily: 'var(--mono)' }}>{currentConfig.label}</span>
    </button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
      onClick={() => setOpen(false)}>
      <div onClick={e => e.stopPropagation()}
        className="fade-up"
        style={{
          width: 500, maxHeight: '80vh', overflowY: 'auto', borderRadius: 12,
          background: 'var(--bg-2)', border: '1px solid var(--b2)',
          boxShadow: 'var(--shadow-float)',
        }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--b1)' }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.01em', margin: 0, fontFamily: 'var(--mono)' }}>settings</h2>
            <p style={{ fontSize: 11, color: 'var(--t4)', margin: '3px 0 0', fontFamily: 'var(--mono)' }}>configure model & api</p>
          </div>
          <button onClick={() => setOpen(false)}
            style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg-3)', border: '1px solid var(--b1)', cursor: 'pointer', color: 'var(--t3)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s' }}
            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'var(--bg-4)'; b.style.color = 'var(--t1)' }}
            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'var(--bg-3)'; b.style.color = 'var(--t3)' }}
          >✕</button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Provider */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, fontFamily: 'var(--mono)' }}>provider</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {PROVIDER_CONFIGS.map(p => (
                <button key={p.id} onClick={() => { const ms = getProviderModels(p.id, aiSettings.customModels); updateAISettings({ providerId: p.id, modelId: ms[0]?.id ?? '' }); setManagingModels(null) }}
                  style={{
                    padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                    textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.12s',
                    background: aiSettings.providerId === p.id ? 'var(--accent-light)' : 'var(--bg-3)',
                    border: `1px solid ${aiSettings.providerId === p.id ? 'var(--accent-border)' : 'var(--b1)'}`,
                    color: aiSettings.providerId === p.id ? 'var(--accent)' : 'var(--t2)',
                    fontFamily: 'var(--mono)',
                  }}
                  onMouseEnter={e => { if (aiSettings.providerId !== p.id) { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--b2)'; b.style.color = 'var(--t1)' } }}
                  onMouseLeave={e => { if (aiSettings.providerId !== p.id) { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--b1)'; b.style.color = 'var(--t2)' } }}
                >
                  {p.label}
                  {aiSettings.apiKeys[p.id] && <span style={{ fontSize: 12, color: 'var(--green)' }}>✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Model */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--mono)' }}>model</label>
              <button onClick={() => setManagingModels(managingModels ? null : aiSettings.providerId)} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)' }}>
                {managingModels ? '↑ collapse' : '⊕ manage'}
              </button>
            </div>
            <select value={aiSettings.modelId} onChange={e => updateAISettings({ modelId: e.target.value })}
              style={{ ...inp, cursor: 'pointer' }} onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)}>
              {currentModels.map(m => <option key={m.id} value={m.id} style={{ background: 'var(--bg-2)' }}>{m.label}</option>)}
            </select>
            {managingModels && <ModelEditor providerId={aiSettings.providerId} models={currentModels} onChange={ms => setProviderModels(aiSettings.providerId, ms)} />}
          </div>

          {/* API Keys */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, fontFamily: 'var(--mono)' }}>api keys</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {PROVIDER_CONFIGS.map(p => (
                <div key={p.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--t2)', fontFamily: 'var(--mono)' }}>{p.label}</span>
                    {aiSettings.apiKeys[p.id] && <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600, fontFamily: 'var(--mono)' }}>● set</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="password" placeholder={aiSettings.apiKeys[p.id] ? '••••••••  (enter new to update)' : `${p.label} API key`}
                      value={keyDraft[p.id] ?? ''} onChange={e => setKeyDraft(d => ({ ...d, [p.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') saveKey(p.id) }}
                      style={{ ...inp, flex: 1 }} onFocus={e => focus(e.target as HTMLElement, true)} onBlur={e => focus(e.target as HTMLElement, false)} />
                    <button onClick={() => saveKey(p.id)} disabled={!keyDraft[p.id]?.trim()}
                      style={{ padding: '7px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: 'var(--accent)', color: '#0d0d0e', border: 'none', cursor: 'pointer', opacity: keyDraft[p.id]?.trim() ? 1 : 0.4, whiteSpace: 'nowrap', fontFamily: 'var(--mono)' }}>save</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--mono)' }}>⚡ keys stored locally only — never sent to any server</p>
        </div>
      </div>
    </div>
  )
}
