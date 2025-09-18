import { useEffect, useState } from 'react'

/**
 * Custom hook for responsive design using media queries
 * @param query - Media query string (e.g., '(min-width: 768px)')
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Check if window is defined (client-side)
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia(query)

    // Set initial value
    setMatches(mediaQuery.matches)

    // Define listener
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Add listener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange)
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange)
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [query])

  return matches
}

// Preset media queries for common breakpoints
export const breakpoints = {
  mobile: '(max-width: 639px)',
  tablet: '(min-width: 640px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',

  // Utility queries
  touch: '(hover: none) and (pointer: coarse)',
  hover: '(hover: hover) and (pointer: fine)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  darkMode: '(prefers-color-scheme: dark)',

  // Specific breakpoints
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
} as const

// Convenience hooks for common breakpoints
export function useIsMobile() {
  return useMediaQuery(breakpoints.mobile)
}

export function useIsTablet() {
  return useMediaQuery(breakpoints.tablet)
}

export function useIsDesktop() {
  return useMediaQuery(breakpoints.desktop)
}

export function useIsTouch() {
  return useMediaQuery(breakpoints.touch)
}

export function usePrefersDarkMode() {
  return useMediaQuery(breakpoints.darkMode)
}

export function usePrefersReducedMotion() {
  return useMediaQuery(breakpoints.reducedMotion)
}

// Hook to get current breakpoint
export function useBreakpoint() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const isDesktop = useIsDesktop()

  if (isMobile) return 'mobile'
  if (isTablet) return 'tablet'
  if (isDesktop) return 'desktop'
  return 'mobile' // Default fallback
}

// Hook for responsive value selection
export function useResponsive<T>(
  mobile: T,
  tablet?: T,
  desktop?: T
): T {
  const breakpoint = useBreakpoint()

  switch (breakpoint) {
    case 'desktop':
      return desktop ?? tablet ?? mobile
    case 'tablet':
      return tablet ?? mobile
    default:
      return mobile
  }
}