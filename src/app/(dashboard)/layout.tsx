'use client'

import React, { useState } from 'react'
import { AppSidebar } from '@/components/shared/app-sidebar'
import { AppHeader } from '@/components/shared/app-header'
import { ProjectProvider } from '@/context/project-provider'
import { cn } from '@/lib/utils'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <ProjectProvider>
      <div className="min-h-screen bg-background text-foreground flex antialiased">
      {/* High-density left navigation (preview sidebar) */}
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content container (offset for preview sidebar width) */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-200',
          sidebarCollapsed ? 'ml-14' : 'ml-56'
        )}
      >
        <AppHeader />
        <main className="flex-1 p-5 max-w-[1400px] w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
    </ProjectProvider>
  )
}
