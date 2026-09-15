'use client'

import React, { useState } from 'react'
import { AppSidebar } from '@/components/shared/app-sidebar'
import { AppHeader } from '@/components/shared/app-header'
import { ProjectProvider, useProject } from '@/context/project-provider'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { isSwitching } = useProject()

  return (
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
        <main className="flex-1 p-5 max-w-[1400px] w-full mx-auto space-y-6 relative">
          {isSwitching && (
            <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
              <div className="p-3.5 rounded-2xl bg-card/85 border border-border/80 shadow-2xl backdrop-blur-md flex items-center justify-center animate-in fade-in zoom-in-90 duration-150">
                <Loader2 className="h-7 w-7 text-primary animate-spin" />
              </div>
            </div>
          )}
          <div className={cn('transition-all duration-200', isSwitching ? 'opacity-30 pointer-events-none filter blur-[1px]' : 'opacity-100')}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProjectProvider>
      <DashboardShell>{children}</DashboardShell>
    </ProjectProvider>
  )
}

