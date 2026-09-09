import { AppSidebar } from '@/components/shared/app-sidebar'
import { AppHeader } from '@/components/shared/app-header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex antialiased">
      {/* High-density left navigation */}
      <AppSidebar />

      {/* Main content container (offset for sidebar width) */}
      <div className="flex-1 ml-56 flex flex-col min-w-0 transition-all">
        <AppHeader />
        <main className="flex-1 p-5 max-w-[1400px] w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  )
}
