/**
 * Theme System for Knowledge Network React Application
 *
 * Provides comprehensive theme management with light/dark mode support,
 * local storage persistence, and system preference detection.
 */

import { createContext, useContext } from 'react'

// Theme types
export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

// Theme context interface
export interface ThemeContextType {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  isDark: boolean
  isLight: boolean
  systemTheme: ResolvedTheme
}

// Theme context
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// Hook to use theme context
export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Utility functions for theme management
export const themeUtils = {
  /**
   * Get the stored theme from localStorage
   */
  getStoredTheme: (): Theme | null => {
    if (typeof window === 'undefined') return null
    try {
      return (localStorage.getItem('theme') as Theme) || null
    } catch {
      return null
    }
  },

  /**
   * Store theme in localStorage
   */
  setStoredTheme: (theme: Theme) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // localStorage not available
    }
  },

  /**
   * Get system theme preference
   */
  getSystemTheme: (): ResolvedTheme => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  },

  /**
   * Resolve theme to actual theme (light/dark)
   */
  resolveTheme: (theme: Theme, systemTheme: ResolvedTheme): ResolvedTheme => {
    return theme === 'system' ? systemTheme : theme
  },

  /**
   * Apply theme to document
   */
  applyTheme: (resolvedTheme: ResolvedTheme) => {
    if (typeof window === 'undefined') return

    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)

    // Update theme-color meta tag
    const themeColorMeta = document.querySelector('meta[name="theme-color"]')
    if (themeColorMeta) {
      themeColorMeta.setAttribute(
        'content',
        resolvedTheme === 'dark' ? '#0a0a0a' : '#ffffff'
      )
    }
  },

  /**
   * Create media query listener for system theme changes
   */
  createSystemThemeListener: (callback: (theme: ResolvedTheme) => void) => {
    if (typeof window === 'undefined') return () => {}

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (e: MediaQueryListEvent) => {
      callback(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', listener)
    return () => mediaQuery.removeEventListener('change', listener)
  },
}

// Theme configuration
export const themeConfig = {
  // Default theme
  defaultTheme: 'system' as Theme,

  // Storage key
  storageKey: 'knowledge-network-theme',

  // CSS custom properties for themes
  cssVariables: {
    light: {
      '--background': '0 0% 100%',
      '--foreground': '224 71.4% 4.1%',
      '--card': '0 0% 100%',
      '--card-foreground': '224 71.4% 4.1%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '224 71.4% 4.1%',
      '--primary': '262 83% 58%',
      '--primary-foreground': '210 20% 98%',
      '--secondary': '220 14% 96%',
      '--secondary-foreground': '221 39% 11%',
      '--muted': '220 14% 96%',
      '--muted-foreground': '220 9% 46%',
      '--accent': '220 14% 96%',
      '--accent-foreground': '221 39% 11%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '210 20% 98%',
      '--border': '220 13% 91%',
      '--input': '220 13% 91%',
      '--ring': '262 83% 58%',
      '--success': '142 76% 50%',
      '--success-foreground': '142 76% 95%',
      '--warning': '48 96% 50%',
      '--warning-foreground': '48 96% 15%',
      '--info': '198 93% 50%',
      '--info-foreground': '198 93% 95%',
    },
    dark: {
      '--background': '224 71% 4%',
      '--foreground': '210 20% 98%',
      '--card': '224 71% 4%',
      '--card-foreground': '210 20% 98%',
      '--popover': '224 71% 4%',
      '--popover-foreground': '210 20% 98%',
      '--primary': '263 70% 50%',
      '--primary-foreground': '210 20% 98%',
      '--secondary': '215 28% 17%',
      '--secondary-foreground': '210 20% 98%',
      '--muted': '215 28% 17%',
      '--muted-foreground': '218 11% 65%',
      '--accent': '215 28% 17%',
      '--accent-foreground': '210 20% 98%',
      '--destructive': '0 63% 31%',
      '--destructive-foreground': '210 20% 98%',
      '--border': '215 28% 17%',
      '--input': '215 28% 17%',
      '--ring': '263 70% 50%',
      '--success': '142 76% 45%',
      '--success-foreground': '142 76% 95%',
      '--warning': '42 87% 55%',
      '--warning-foreground': '48 96% 15%',
      '--info': '200 98% 39%',
      '--info-foreground': '198 93% 95%',
    },
  },
}

// Theme color schemes for different brand variations
export const themeVariants = {
  default: {
    light: { primary: '262 83% 58%' },
    dark: { primary: '263 70% 50%' }
  },
  blue: {
    light: { primary: '221 83% 53%' },
    dark: { primary: '217 91% 60%' }
  },
  green: {
    light: { primary: '142 76% 36%' },
    dark: { primary: '142 76% 45%' }
  },
  purple: {
    light: { primary: '262 83% 58%' },
    dark: { primary: '263 70% 50%' }
  },
  orange: {
    light: { primary: '25 95% 53%' },
    dark: { primary: '21 90% 48%' }
  },
} as const

export type ThemeVariant = keyof typeof themeVariants

// Helper functions for component theming
export const themeHelpers = {
  /**
   * Get theme-aware colors
   */
  getThemeColors: (resolvedTheme: ResolvedTheme) => {
    return themeConfig.cssVariables[resolvedTheme]
  },

  /**
   * Create theme-aware className
   */
  createThemeClass: (baseClass: string, lightClass?: string, darkClass?: string) => {
    if (!lightClass && !darkClass) return baseClass

    const classes = [baseClass]
    if (lightClass) classes.push(`light:${lightClass}`)
    if (darkClass) classes.push(`dark:${darkClass}`)

    return classes.join(' ')
  },

  /**
   * Get contrasting text color
   */
  getContrastingTextColor: (resolvedTheme: ResolvedTheme) => {
    return resolvedTheme === 'dark' ? 'text-white' : 'text-black'
  },

  /**
   * Check if theme is dark
   */
  isDarkTheme: (resolvedTheme: ResolvedTheme) => resolvedTheme === 'dark',

  /**
   * Get theme-appropriate shadow
   */
  getThemeShadow: (resolvedTheme: ResolvedTheme, size: 'sm' | 'md' | 'lg' = 'md') => {
    const shadows = {
      light: {
        sm: 'shadow-sm',
        md: 'shadow-md',
        lg: 'shadow-lg'
      },
      dark: {
        sm: 'shadow-sm shadow-black/25',
        md: 'shadow-md shadow-black/25',
        lg: 'shadow-lg shadow-black/25'
      }
    }

    return shadows[resolvedTheme][size]
  },
}

// Export everything needed for theme system
// Theme provider would be exported here when implemented