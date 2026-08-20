/**
 * useTheme.jsx — Dark/light theme provider and hook.
 *
 * Resolves the initial theme from localStorage (a previously saved
 * manual choice) or, failing that, the OS-level `prefers-color-scheme`
 * media query. Persists manual changes to localStorage and toggles the
 * `dark` class on `<html>` for Tailwind's `dark:` variant to key off.
 * While no manual preference has been saved, it also live-syncs with
 * OS theme changes.
 *
 * `ThemeProvider` wraps the app in main.jsx; `useTheme` is consumed by
 * any component that needs to read/toggle the theme (e.g. a nav/header
 * dark-mode switch).
 */
import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

/**
 * Determines the theme to use on first render: a previously saved
 * localStorage value takes priority; otherwise falls back to the
 * browser/OS `prefers-color-scheme` setting.
 * @returns {'dark'|'light'} The resolved initial theme.
 */
function getInitialTheme() {
  const stored = localStorage.getItem('theme')
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Provides theme state (`theme`, `toggle`) to descendants via React
 * context. Applies the theme to the document (`dark` class on
 * `<html>`, read by Tailwind's `dark:` variant) and persists manual
 * selections to localStorage so they survive reloads. While no manual
 * choice has been stored yet, also listens for OS-level scheme changes
 * and follows them live.
 *
 * @param {{ children: import('react').ReactNode }} props
 * @returns {JSX.Element} Context provider wrapping `children`.
 * Used by: main.jsx, wrapping `<App />` so the whole tree can call `useTheme()`.
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  // Whenever theme changes (manual toggle or system sync below), reflect
  // it on the document root and persist the explicit choice.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  // If no manual preference stored, keep in sync with system changes
  useEffect(() => {
    if (localStorage.getItem('theme')) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => setTheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Flips between 'dark' and 'light'; this counts as a manual choice and
  // will be persisted to localStorage by the effect above, which also
  // opts the user out of further automatic OS-sync until they clear it.
  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

/**
 * Hook to read the current theme and the `toggle` function from the
 * nearest `ThemeProvider` context.
 * @returns {{ theme: 'dark'|'light', toggle: () => void } | null} Theme
 *   context value, or null if used outside a `ThemeProvider`.
 * Used by: any component needing theme-aware rendering or a dark-mode toggle control.
 */
export const useTheme = () => useContext(ThemeContext)
