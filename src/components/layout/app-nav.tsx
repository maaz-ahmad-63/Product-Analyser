'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Swords, PlusCircle, Shield, LogOut, LogIn, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { cn } from '@/lib/utils'

export function AppNav() {
  const pathname = usePathname()
  const { data: session, status } = useSession()

  const isAuthenticated = status === 'authenticated' && !!session?.user
  const isAdmin = session?.user?.role === 'admin'

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 md:px-8 backdrop-blur-sm">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-sm text-foreground tracking-tight">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/20 text-primary">
            <Swords className="h-4 w-4" />
          </div>
          <span>SaaS Competitor Analyzer</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded transition-colors',
              pathname === '/'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            Analyze
          </Link>
          <Link
            href="/history"
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded transition-colors',
              pathname === '/history'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            Analysis History
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1',
                pathname?.startsWith('/admin')
                  ? 'bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30'
                  : 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10'
              )}
            >
              <Shield className="h-3 w-3" />
              <span>Admin Console</span>
            </Link>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />

        <Link href="/">
          <Button size="sm" className="h-8 gap-1.5 text-xs font-medium">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Comparison</span>
          </Button>
        </Link>

        {isAuthenticated ? (
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div className="hidden md:flex flex-col items-end text-right">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-foreground leading-none">
                  {session.user.name || session.user.email?.split('@')[0]}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[9px] uppercase px-1 py-0 h-4 font-mono',
                    isAdmin
                      ? 'border-purple-500/40 text-purple-400 bg-purple-500/10'
                      : 'border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {session.user.role}
                </Badge>
              </div>
              <span className="text-[10px] text-muted-foreground leading-none mt-0.5 max-w-[140px] truncate">
                {session.user.email}
              </span>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="h-8 text-xs gap-1 border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        ) : (
          <Link href="/login">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
              <LogIn className="h-3.5 w-3.5 text-primary" />
              <span>Sign In</span>
            </Button>
          </Link>
        )}
      </div>
    </header>
  )
}
