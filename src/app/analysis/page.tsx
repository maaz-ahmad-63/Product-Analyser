'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function AnalysisIndexPage() {
  const router = useRouter()
  const [statusText, setStatusText] = useState('Redirecting to your analysis...')

  useEffect(() => {
    async function loadLatest() {
      try {
        const res = await fetch('/api/history')
        if (res.ok) {
          const data = await res.json()
          const items = data.history || data.analyses || []
          if (items.length > 0) {
            router.replace(`/analysis/${items[0].id}?tab=comments#own-products`)
            return
          }
        }
        // If no history, redirect to home
        router.replace('/')
      } catch {
        router.replace('/')
      }
    }
    loadLatest()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
        <span>{statusText}</span>
      </div>
    </div>
  )
}
