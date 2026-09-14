import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { B2bShell } from '@/components/layout/b2b-shell'
import { AuthProvider } from '@/components/providers/session-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ProductScope — Real Two-URL Competitive SaaS Intelligence',
  description:
    'Benchmark your product against competitors using automated public website scraping and deterministic rule-based analysis.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider>
              <B2bShell>{children}</B2bShell>
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
