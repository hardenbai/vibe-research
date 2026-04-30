'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import ChapterSidebar from '@/components/ChapterSidebar'
import ChapterEditor from '@/components/ChapterEditor'

export default function Home() {
  const { chapters, activeChapterId, setActiveChapter } = useStore()

  useEffect(() => {
    if (!activeChapterId && chapters.length > 0) {
      setActiveChapter(chapters[0].id)
    }
  }, [activeChapterId, chapters, setActiveChapter])

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      <ChapterSidebar />
      <ChapterEditor />
    </div>
  )
}
