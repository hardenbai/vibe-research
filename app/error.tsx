'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[vibe-research] runtime error:', error)
  }, [error])

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900 text-white p-6">
      <div className="max-w-md w-full bg-gray-800 border border-red-900/50 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-red-400 text-xl">⚠</span>
          <h1 className="text-lg font-semibold">出错了</h1>
        </div>
        <p className="text-sm text-gray-400">
          页面渲染遇到错误，你的数据已自动保存到本地，不会丢失。
        </p>
        <pre className="text-[11px] text-red-300 bg-gray-900 rounded p-3 overflow-auto max-h-40 whitespace-pre-wrap">
          {error.message}
          {error.digest && `\n[${error.digest}]`}
        </pre>
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
          >
            重试
          </button>
          <button
            onClick={() => location.reload()}
            className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
          >
            刷新页面
          </button>
        </div>
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-gray-300">高级：清空本地数据</summary>
          <button
            onClick={() => { if (confirm('确认清空所有章节、设置和数据？此操作不可恢复。')) { localStorage.clear(); location.reload() } }}
            className="mt-2 px-2 py-1 bg-red-900/40 hover:bg-red-900/60 text-red-300 text-[11px] rounded border border-red-900/50"
          >
            清空 localStorage 并刷新
          </button>
        </details>
      </div>
    </div>
  )
}
