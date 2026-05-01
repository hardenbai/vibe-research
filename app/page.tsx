'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import ChapterSidebar from '@/components/ChapterSidebar'
import ChapterEditor from '@/components/ChapterEditor'
import { captureScreenshot } from '@/lib/screenCapture'
import { callActiveCaptureHandler, hasActiveCaptureHandler } from '@/lib/activeCapture'

export default function Home() {
  const { chapters, activeChapterId, setActiveChapter } = useStore()

  useEffect(() => {
    if (!activeChapterId && chapters.length > 0) {
      setActiveChapter(chapters[0].id)
    }
  }, [activeChapterId, chapters, setActiveChapter])

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

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      <ChapterSidebar />
      <ChapterEditor />
    </div>
  )
}
