"use client"

import * as React from "react"

/**
 * Minimal local theme system replacing next-themes.
 *
 * next-themes injects its no-flash <script> from inside a client component,
 * which React 19 / Next 16 flags on every client render ("Scripts inside
 * React components are never executed"). Here the blocking script lives in
 * the server-rendered <head> of app/layout.tsx and this provider only owns
 * state after mount.
 */

export type Theme = "dark" | "light" | "system"
export type ResolvedTheme = "dark" | "light"

const STORAGE_KEY = "mcppro-theme"

interface ThemeProviderState {
  theme: Theme
  resolvedTheme?: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeProviderState>({
  theme: "system",
  setTheme: () => {},
})

function resolve(theme: Theme): ResolvedTheme {
  if (theme !== "system") return theme
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function apply(resolved: ResolvedTheme) {
  const root = document.documentElement
  root.classList.toggle("dark", resolved === "dark")
  root.classList.toggle("light", resolved === "light")
  root.style.colorScheme = resolved
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("system")
  const [resolvedTheme, setResolved] = React.useState<ResolvedTheme>()

  React.useEffect(() => {
    let stored: Theme = "system"
    try {
      stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system"
    } catch {}
    setThemeState(stored)
    const resolved = resolve(stored)
    apply(resolved)
    setResolved(resolved)

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => {
      try {
        if ((localStorage.getItem(STORAGE_KEY) ?? "system") === "system") {
          const r = resolve("system")
          apply(r)
          setResolved(r)
        }
      } catch {}
    }
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])

  const setTheme = React.useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {}
    setThemeState(next)
    const resolved = resolve(next)
    apply(resolved)
    setResolved(resolved)
  }, [])

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return React.useContext(ThemeContext)
}
