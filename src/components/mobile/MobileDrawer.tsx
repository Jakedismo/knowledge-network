'use client'

import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useSwipeGesture } from '@/hooks/use-swipe-gesture'

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  side?: 'left' | 'right'
  children: React.ReactNode
  className?: string
  swipeToClose?: boolean
  swipeVelocityThreshold?: number
}

export function MobileDrawer({
  open,
  onClose,
  side = 'left',
  children,
  className,
  swipeToClose = true,
  swipeVelocityThreshold = 0.5,
}: MobileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Handle swipe gestures
  const { handlers } = useSwipeGesture({
    onSwipeLeft: side === 'right' && swipeToClose ? onClose : undefined,
    onSwipeRight: side === 'left' && swipeToClose ? onClose : undefined,
    velocityThreshold: swipeVelocityThreshold,
  })

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [open])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  // Handle overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose()
    }
  }

  // Prevent clicks inside drawer from closing it
  const handleDrawerClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className={cn(
          'fixed inset-0 z-50 bg-black/50 transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={cn(
          'fixed top-0 z-50 h-full w-80 max-w-[85vw] bg-background shadow-xl transition-transform duration-300',
          side === 'left' ? 'left-0' : 'right-0',
          open
            ? 'translate-x-0'
            : side === 'left'
            ? '-translate-x-full'
            : 'translate-x-full',
          className
        )}
        onClick={handleDrawerClick}
        {...(swipeToClose ? handlers : {})}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation drawer"
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-10 w-10"
          onClick={onClose}
          aria-label="Close drawer"
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Content */}
        <div className="h-full overflow-y-auto pb-safe pt-14">{children}</div>
      </div>
    </>
  )
}

// Safe area CSS classes
const safeAreaStyles = `
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom, 0);
  }
  .pt-safe {
    padding-top: env(safe-area-inset-top, 0);
  }
`

// Inject safe area styles
if (typeof window !== 'undefined' && !document.querySelector('#safe-area-styles')) {
  const style = document.createElement('style')
  style.id = 'safe-area-styles'
  style.textContent = safeAreaStyles
  document.head.appendChild(style)
}