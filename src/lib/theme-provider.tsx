/**
 * Theme Provider Component
 *
 * Provides theme context to the entire application with automatic
 * system preference detection, persistence, and smooth transitions.
 */

'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { logger } from '@/lib/logger'

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  isDark: boolean
  isLight: boolean
  systemTheme: ResolvedTheme
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'knowledge-network-theme',
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('light')
  const [mounted, setMounted] = useState(false)

  // Resolve theme to actual theme (light/dark)
  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme

  // Computed values
  const isDark = resolvedTheme === 'dark'
  const isLight = resolvedTheme === 'light'

  // Get system theme preference
  const getSystemTheme = useCallback((): ResolvedTheme => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }, [])

  // Apply theme to document
  const applyTheme = useCallback((resolvedTheme: ResolvedTheme) => {
    if (typeof window === 'undefined') return

    const root = window.document.documentElement

    // Add transition class unless disabled
    if (!disableTransitionOnChange) {
      root.classList.add('theme-transition')
    }

    // Remove existing theme classes
    root.classList.remove('light', 'dark')

    // Add new theme class
    root.classList.add(resolvedTheme)

    // Update theme-color meta tag for mobile browsers
    const themeColorMeta = document.querySelector('meta[name="theme-color"]')
    if (themeColorMeta) {
      themeColorMeta.setAttribute(
        'content',
        resolvedTheme === 'dark' ? '#030712' : '#ffffff'
      )
    }

    // Remove transition class after animation
    if (!disableTransitionOnChange) {
      setTimeout(() => {
        root.classList.remove('theme-transition')
      }, 150)
    }
  }, [disableTransitionOnChange])

  // Set theme with persistence
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)

    // Store in localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, newTheme)
      } catch (error) {
        logger.warn('Failed to save theme to localStorage:', error as any)
      }
    }
  }, [storageKey])

  // Toggle between light and dark (ignores system)
  const toggleTheme = useCallback(() => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('light')
    } else {
      // If system, switch to opposite of current system theme
      setTheme(systemTheme === 'light' ? 'dark' : 'light')
    }
  }, [theme, systemTheme, setTheme])

  // Initialize theme on mount
  useEffect(() => {
    // Get system theme
    const currentSystemTheme = getSystemTheme()
    setSystemTheme(currentSystemTheme)

    // Get stored theme
    let storedTheme: Theme = defaultTheme
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey) as Theme
        if (stored && ['light', 'dark', 'system'].includes(stored)) {
          storedTheme = stored
        }
      } catch (error) {
        logger.warn('Failed to read theme from localStorage:', error as any)
      }
    }

    setThemeState(storedTheme)
    setMounted(true)
  }, [defaultTheme, storageKey, getSystemTheme])

  // Listen for system theme changes
  useEffect(() => {
    if (!enableSystem || typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      const newSystemTheme = e.matches ? 'dark' : 'light'
      setSystemTheme(newSystemTheme)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [enableSystem])

  // Apply theme when resolved theme changes
  useEffect(() => {
    if (mounted) {
      applyTheme(resolvedTheme)
    }
  }, [mounted, resolvedTheme, applyTheme])

  // Prevent flash of wrong theme
  if (!mounted) {
    return (
      <div style={{ visibility: 'hidden' }}>
        {children}
      </div>
    )
  }

  const contextValue: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark,
    isLight,
    systemTheme,
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

// Theme toggle hook for easy theme switching
export function useThemeToggle() {
  const { theme, toggleTheme, setTheme } = useTheme()

  return {
    theme,
    toggleTheme,
    setTheme,
    isLight: theme === 'light',
    isDark: theme === 'dark',
    isSystem: theme === 'system',
  }
}
