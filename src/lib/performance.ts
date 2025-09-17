/**
 * Performance optimization utilities for component library
 */

import { useMemo, useCallback, useRef, useLayoutEffect } from 'react'

/**
 * Stable reference hook - prevents unnecessary re-renders
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback)

  useLayoutEffect(() => {
    callbackRef.current = callback
  })

  return useCallback((...args: any[]) => {
    return callbackRef.current(...args)
  }, []) as T
}

/**
 * Debounced value hook for search and input components
 */
export function useDebounced<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Intersection observer hook for lazy loading
 */
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  {
    threshold = 0,
    root = null,
    rootMargin = '0%',
    freezeOnceVisible = false,
  }: {
    threshold?: number
    root?: Element | null
    rootMargin?: string
    freezeOnceVisible?: boolean
  } = {}
) {
  const [entry, setEntry] = useState<IntersectionObserverEntry>()

  const frozen = entry?.isIntersecting && freezeOnceVisible

  const updateEntry = ([entry]: IntersectionObserverEntry[]): void => {
    setEntry(entry)
  }

  useEffect(() => {
    const node = elementRef?.current
    const hasIOSupport = !!window.IntersectionObserver

    if (!hasIOSupport || frozen || !node) return

    const observerParams = { threshold, root, rootMargin }
    const observer = new IntersectionObserver(updateEntry, observerParams)

    observer.observe(node)

    return () => observer.disconnect()
  }, [elementRef, threshold, root, rootMargin, frozen])

  return entry
}

/**
 * Virtual scrolling hook for large lists
 */
export function useVirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
}: {
  items: T[]
  itemHeight: number
  containerHeight: number
  overscan?: number
}) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleItems = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight)
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    )

    const start = Math.max(0, visibleStart - overscan)
    const end = Math.min(items.length - 1, visibleEnd + overscan)

    return {
      items: items.slice(start, end + 1),
      start,
      end,
      totalHeight: items.length * itemHeight,
      offsetY: start * itemHeight,
    }
  }, [items, itemHeight, scrollTop, containerHeight, overscan])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return {
    visibleItems,
    handleScroll,
    totalHeight: visibleItems.totalHeight,
    offsetY: visibleItems.offsetY,
  }
}

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0)
  const startTime = useRef(performance.now())

  renderCount.current += 1

  useLayoutEffect(() => {
    const endTime = performance.now()
    const renderTime = endTime - startTime.current

    // Log performance in development
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(
        `${componentName}: Render #${renderCount.current} took ${renderTime.toFixed(2)}ms`
      )
    }

    startTime.current = performance.now()
  })

  return {
    renderCount: renderCount.current,
  }
}

/**
 * Lazy loading hook for heavy components
 */
export function useLazyComponent<T>(
  factory: () => Promise<{ default: React.ComponentType<T> }>,
  deps: React.DependencyList = []
) {
  const [Component, setComponent] = useState<React.ComponentType<T> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let isCancelled = false

    const loadComponent = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const componentModule = await factory()

        if (!isCancelled) {
          setComponent(() => componentModule.default)
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load component'))
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadComponent()

    return () => {
      isCancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { Component, isLoading, error }
}

// Re-export useState and useEffect for consistency
import { useState, useEffect } from 'react'

/**
 * Measure a synchronous operation. Returns duration in ms and result.
 */
export function measure<T>(name: string, fn: () => T): { duration: number; result: T } {
  const start = performance.now()
  try {
    const result = fn()
    const duration = performance.now() - start
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[perf] ${name}: ${duration.toFixed(2)}ms`)
    }
    return { duration, result }
  } catch (e) {
    const duration = performance.now() - start
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[perf] ${name} failed after ${duration.toFixed(2)}ms`)
    }
    throw e
  }
}

/**
 * Measure an async operation. Returns duration and result.
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ duration: number; result: T }> {
  const start = performance.now()
  try {
    const result = await fn()
    const duration = performance.now() - start
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[perf] ${name}: ${duration.toFixed(2)}ms`)
    }
    return { duration, result }
  } catch (e) {
    const duration = performance.now() - start
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[perf] ${name} failed after ${duration.toFixed(2)}ms`)
    }
    throw e
  }
}
