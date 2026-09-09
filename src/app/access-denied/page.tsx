import Link from 'next/link'
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AccessDeniedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-6 shadow-sm border border-destructive/20">
        <ShieldAlert className="h-8 w-8" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
        Access Denied
      </h1>

      <p className="text-sm text-muted-foreground max-w-md mb-8">
        You do not have administrative permissions to view this section. This area is strictly restricted to platform administrators.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/">
          <Button variant="default" size="sm" className="gap-2 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Dashboard</span>
          </Button>
        </Link>
        <Link href="/login">
          <Button variant="outline" size="sm" className="gap-2 text-xs">
            <LogOut className="h-3.5 w-3.5" />
            <span>Switch Account</span>
          </Button>
        </Link>
      </div>
    </div>
  )
}
