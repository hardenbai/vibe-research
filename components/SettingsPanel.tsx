'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { PROVIDER_CONFIGS, getProviderModels, DEFAULT_PROVIDER_MODELS } from '@/lib/providers'
import type { ProviderId, ModelOption } from '@/lib/types'

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

  const removeModel = (index: number) => {
    const updated = models.filter((_, i) => i !== index)
    onChange(updated)
  }

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
    // Check for duplicate IDs (excluding current)
    if (models.some((m, i) => m.id === id && i !== editingIdx)) return
    const updated = models.map((m, i) => (i === editingIdx ? { id, label } : m))
    onChange(updated)
    setEditingIdx(null)
  }

  return (
    <div className="mt-3 space-y-2">
      {/* Model list */}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {models.length === 0 && (
          <p className="text-gray-600 text-xs italic">暂无模型，请添加</p>
        )}
        {models.map((model, index) => (
          <div
            key={model.id + index}
            className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-900 rounded border border-gray-700 group"
          >
            {editingIdx === index ? (
              <>
                <input
                  value={editId}
                  onChange={e => setEditId(e.target.value)}
                  placeholder="模型 ID"
                  className="flex-1 bg-gray-800 text-gray-200 text-xs rounded px-1.5 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none"
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit() }}
                />
                <input
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  placeholder="显示名称"
                  className="flex-1 bg-gray-800 text-gray-200 text-xs rounded px-1.5 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none"
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit() }}
                />
                <button
                  onClick={commitEdit}
                  className="text-green-400 hover:text-green-300 text-xs px-1"
                >✓</button>
                <button
                  onClick={() => setEditingIdx(null)}
                  className="text-gray-500 hover:text-gray-300 text-xs px-1"
                >✕</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-gray-300 text-xs truncate">
                  {model.label}
                  <span className="text-gray-600 ml-1">({model.id})</span>
                </span>
                <button
                  onClick={() => startEdit(index)}
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-blue-400 text-xs px-1 transition-opacity"
                >编辑</button>
                <button
                  onClick={() => removeModel(index)}
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 text-xs px-1 transition-opacity"
                >删除</button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add new model */}
      <div className="flex items-center gap-1.5">
        <input
          value={newId}
          onChange={e => setNewId(e.target.value)}
          placeholder="模型 ID (如 glm-4)"
          className="flex-1 bg-gray-900 text-gray-200 text-xs rounded px-2 py-1.5 border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-600"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addModel() } }}
        />
        <input
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          placeholder="显示名称 (可选)"
          className="flex-1 bg-gray-900 text-gray-200 text-xs rounded px-2 py-1.5 border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-600"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addModel() } }}
        />
        <button
          onClick={addModel}
          disabled={!newId.trim()}
          className="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs rounded transition-colors"
        >
          添加
        </button>
      </div>

      {/* Reset to default */}
      {isCustomized && (
        <button
          onClick={() => onChange([...(DEFAULT_PROVIDER_MODELS[providerId] ?? [])])}
          className="text-xs text-gray-500 hover:text-yellow-400 transition-colors"
        >
          ↺ 恢复默认模型列表
        </button>
      )}
    </div>
  )
}

export default function SettingsPanel() {
  const [open, setOpen] = useState(false)
  const {
    aiSettings, updateAISettings, setApiKey,
    setProviderModels, resetProviderModels,
  } = useStore()
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
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
      >
        <span>⚙</span>
        <span>AI 设置</span>
        <span className="ml-auto text-gray-600 truncate max-w-[80px]">
          {currentConfig.label}
        </span>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setOpen(false)}>
      <div
        className="bg-gray-800 border border-gray-600 rounded-xl w-[520px] max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-white font-semibold">AI 设置</h2>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
        </div>

        <div className="p-5 space-y-6">
          {/* Provider selector */}
          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">选择服务商</label>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDER_CONFIGS.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleProviderChange(p.id)}
                  className={`px-3 py-2 rounded-lg text-sm text-left border transition-colors ${
                    aiSettings.providerId === p.id
                      ? 'border-blue-500 bg-blue-600/20 text-white'
                      : 'border-gray-600 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {p.label}
                  {aiSettings.apiKeys[p.id] && (
                    <span className="ml-1 text-green-400 text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Model selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400 uppercase tracking-wider">选择模型</label>
              <button
                onClick={() => setManagingModels(managingModels === aiSettings.providerId ? null : aiSettings.providerId)}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                {managingModels === aiSettings.providerId ? '收起' : '管理模型'}
              </button>
            </div>

            <select
              value={aiSettings.modelId}
              onChange={e => updateAISettings({ modelId: e.target.value })}
              className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none mb-2"
            >
              {currentModels.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
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
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">API Keys</label>
            <div className="space-y-3">
              {PROVIDER_CONFIGS.map(p => (
                <div key={p.id}>
                  <div className="text-xs text-gray-500 mb-1">{p.label}</div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder={aiSettings.apiKeys[p.id] ? '已保存（输入新值以更新）' : `输入 ${p.label} API Key`}
                      value={keyDraft[p.id] ?? ''}
                      onChange={e => setKeyDraft(d => ({ ...d, [p.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') saveKey(p.id) }}
                      className="flex-1 bg-gray-900 text-white text-xs border border-gray-600 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none placeholder-gray-600"
                    />
                    <button
                      onClick={() => saveKey(p.id)}
                      disabled={!keyDraft[p.id]?.trim()}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs rounded-lg transition-colors"
                    >
                      保存
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-600">API Key 和模型列表仅存储在本地浏览器，不会上传到服务器。</p>
        </div>
      </div>
    </div>
  )
}
