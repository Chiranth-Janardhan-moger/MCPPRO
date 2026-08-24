import './globals.css'
import '@astryxdesign/core/reset.css'
import '@astryxdesign/core/astryx.css'
import '@astryxdesign/theme-neutral/theme.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Theme } from '@astryxdesign/core'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import { ThemeProvider } from "@/components/global/theme-provider"
import QueryProvider from "@/components/global/query-provider";
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MCPPro',
  description: 'MCPPro: Advanced Multi-Agent AI System',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
}

/**
 * NOTE: intentionally contains NO <script> elements — not even in <head>.
 * React 19 + Next 16 warn on every script node that passes through a React
 * render/hydrate pass ("Scripts inside React components are never
 * executed"), including server-rendered ones replayed during hydration.
 * Theme bootstrapping therefore happens after mount in ThemeProvider
 * (components/global/theme-provider.tsx); first-paint theme is handled by
 * prefers-color-scheme media rules in globals.css instead of a blocking
 * script.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full light" style={{ colorScheme: 'light' }} suppressHydrationWarning>
      <body className={`${inter.className} h-full`}>
        <ThemeProvider>
          <QueryProvider>
            <Theme theme={neutralTheme}>{children}</Theme>
          </QueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
