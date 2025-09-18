import { useRef } from 'react'

interface SwipeOptions {
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number
  velocityThreshold?: number
  preventDefaultTouch?: boolean
  trackMouse?: boolean
}

interface TouchData {
  startX: number
  startY: number
  startTime: number
  currentX: number
  currentY: number
}

export function useSwipeGesture({
  onSwipeUp,
  onSwipeDown,
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  velocityThreshold = 0.3,
  preventDefaultTouch = false,
  trackMouse = false,
}: SwipeOptions = {}) {
  const touchData = useRef<TouchData | null>(null)

  const handleStart = (clientX: number, clientY: number) => {
    touchData.current = {
      startX: clientX,
      startY: clientY,
      startTime: Date.now(),
      currentX: clientX,
      currentY: clientY,
    }
  }

  const handleMove = (clientX: number, clientY: number, event?: Event) => {
    if (!touchData.current) return

    touchData.current.currentX = clientX
    touchData.current.currentY = clientY

    if (preventDefaultTouch && event) {
      event.preventDefault()
    }
  }

  const handleEnd = () => {
    if (!touchData.current) return

    const { startX, startY, startTime, currentX, currentY } = touchData.current
    const deltaX = currentX - startX
    const deltaY = currentY - startY
    const deltaTime = Date.now() - startTime
    const velocity = Math.sqrt(deltaX ** 2 + deltaY ** 2) / deltaTime

    // Check if swipe velocity meets threshold
    if (velocity < velocityThreshold) {
      touchData.current = null
      return
    }

    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    // Determine swipe direction
    if (absX > absY && absX > threshold) {
      // Horizontal swipe
      if (deltaX > 0) {
        onSwipeRight?.()
      } else {
        onSwipeLeft?.()
      }
    } else if (absY > absX && absY > threshold) {
      // Vertical swipe
      if (deltaY > 0) {
        onSwipeDown?.()
      } else {
        onSwipeUp?.()
      }
    }

    touchData.current = null
  }

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleStart(touch.clientX, touch.clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleMove(touch.clientX, touch.clientY, e.nativeEvent)
  }

  const handleTouchEnd = () => {
    handleEnd()
  }

  // Mouse event handlers (optional)
  const handleMouseDown = trackMouse
    ? (e: React.MouseEvent) => {
        handleStart(e.clientX, e.clientY)
      }
    : undefined

  const handleMouseMove = trackMouse
    ? (e: React.MouseEvent) => {
        if (touchData.current) {
          handleMove(e.clientX, e.clientY)
        }
      }
    : undefined

  const handleMouseUp = trackMouse ? () => handleEnd() : undefined
  const handleMouseLeave = trackMouse ? () => (touchData.current = null) : undefined

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
      ...(trackMouse && {
        onMouseDown: handleMouseDown,
        onMouseMove: handleMouseMove,
        onMouseUp: handleMouseUp,
        onMouseLeave: handleMouseLeave,
      }),
    },
    // Expose state for custom rendering
    isTracking: !!touchData.current,
    touchDelta: touchData.current
      ? {
          x: touchData.current.currentX - touchData.current.startX,
          y: touchData.current.currentY - touchData.current.startY,
        }
      : null,
  }
}

// Hook for pull-to-refresh functionality
export function usePullToRefresh(onRefresh: () => void | Promise<void>) {
  const isRefreshing = useRef(false)
  const pullDistance = useRef(0)

  const handlePullStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && !isRefreshing.current) {
      pullDistance.current = e.touches[0].clientY
    }
  }

  const handlePullMove = (e: React.TouchEvent) => {
    if (pullDistance.current > 0 && !isRefreshing.current) {
      const delta = e.touches[0].clientY - pullDistance.current

      if (delta > 80) {
        // Trigger refresh at 80px pull distance
        isRefreshing.current = true
        pullDistance.current = 0

        const result = onRefresh()

        if (result instanceof Promise) {
          result.finally(() => {
            isRefreshing.current = false
          })
        } else {
          isRefreshing.current = false
        }
      }
    }
  }

  const handlePullEnd = () => {
    pullDistance.current = 0
  }

  return {
    handlers: {
      onTouchStart: handlePullStart,
      onTouchMove: handlePullMove,
      onTouchEnd: handlePullEnd,
      onTouchCancel: handlePullEnd,
    },
    isRefreshing: isRefreshing.current,
  }
}