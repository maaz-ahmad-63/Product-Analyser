'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Swords, ArrowRight, Loader2, AlertCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const urlError = searchParams.get('error')

  useEffect(() => {
    if (urlError === 'ACCOUNT_DEACTIVATED') {
      setError('This account has been deactivated. Please contact an administrator.')
    }
  }, [urlError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })

      if (res?.error) {
        if (res.error.includes('ACCOUNT_DEACTIVATED')) {
          setError('This account has been deactivated. Please contact an administrator.')
        } else {
          setError('Invalid email or password. Please verify your credentials.')
        }
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-border bg-card p-8 shadow-2xl backdrop-blur-xl">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary shadow-sm">
          <Swords className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">SaaS Growth Agent</h2>
          <p className="text-xs text-muted-foreground">Sign in to your product intelligence dashboard</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5" htmlFor="email">
            Work Email
          </label>
          <div className="relative">
            <Mail className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="user@saasgrowth.internal"
              className="w-full rounded-lg border border-border bg-input pl-9 pr-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-foreground" htmlFor="password">
              Password
            </label>
            <button
              type="button"
              onClick={() => alert('Password recovery is managed by your system administrator. Please contact your admin to reset credentials.')}
              className="text-[11px] text-muted-foreground hover:text-foreground hover:underline transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-border bg-input pl-9 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors p-0.5"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 focus:outline-none transition-all disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying Credentials...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-border/60 text-center text-xs text-muted-foreground">
        <p className="text-[11px]">
          Access to this platform is invite-only. New accounts are provisioned directly by platform administrators.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md mx-auto rounded-2xl border border-border bg-card p-8 shadow-2xl flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
