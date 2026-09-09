import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppNav } from '@/components/layout/app-nav'
import { AuthProvider } from '@/components/providers/session-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SaaS Competitor Analyzer — Real Two-URL Competitive Intelligence',
  description:
    'Compare your SaaS with competitors using automated public website scraping and deterministic rule-based analysis.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background text-foreground flex flex-col antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider>
              <AppNav />
              <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 lg:p-8">
                {children}
              </main>
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
