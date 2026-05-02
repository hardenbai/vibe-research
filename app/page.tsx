'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import ChapterSidebar from '@/components/ChapterSidebar'
import ChapterEditor from '@/components/ChapterEditor'
import { captureScreenshot } from '@/lib/screenCapture'
import { callActiveCaptureHandler, hasActiveCaptureHandler } from '@/lib/activeCapture'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const { projects, activeProjectId, activeChapterId, setActiveChapter } = useStore()
  const activeProjectChapters = projects.find(p => p.id === activeProjectId)?.chapters ?? []

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!activeChapterId && activeProjectChapters.length > 0) {
      setActiveChapter(activeProjectChapters[0].id)
    }
  }, [activeChapterId, activeProjectChapters, setActiveChapter])

  // Global Cmd+Shift+S shortcut for screen capture
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (!hasActiveCaptureHandler()) return
        const result = await captureScreenshot()
        if (result) callActiveCaptureHandler(result.imageBase64, result.url)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  if (!mounted) return null

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      <ChapterSidebar />
      <ChapterEditor />
    </div>
  )
}
