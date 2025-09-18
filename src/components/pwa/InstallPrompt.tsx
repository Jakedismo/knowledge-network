'use client'

import React, { useState, useEffect } from 'react'
import { Download, X, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { usePWA } from '@/hooks/use-pwa'
import { cn } from '@/lib/utils'

interface InstallPromptProps {
  className?: string
  variant?: 'banner' | 'card' | 'toast'
  autoShow?: boolean
  showDelay?: number
}

export function InstallPrompt({
  className,
  variant = 'banner',
  autoShow = true,
  showDelay = 30000, // Show after 30 seconds by default
}: InstallPromptProps) {
  const { canInstall, isInstalled, isStandalone, installPWA } = usePWA()
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    // Don't show if already installed or dismissed
    if (isInstalled || isStandalone || isDismissed || !autoShow) return

    // Check if user has previously dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      setIsDismissed(true)
      return
    }

    // Show prompt after delay
    const timer = setTimeout(() => {
      if (canInstall) {
        setIsVisible(true)
      }
    }, showDelay)

    return () => clearTimeout(timer)
  }, [canInstall, isInstalled, isStandalone, isDismissed, autoShow, showDelay])

  const handleInstall = async () => {
    setIsInstalling(true)
    const success = await installPWA()

    if (success) {
      setIsVisible(false)
      // Track successful installation
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'pwa_install', {
          event_category: 'PWA',
          event_label: 'Install Success',
        })
      }
    }

    setIsInstalling(false)
  }

  const handleDismiss = () => {
    setIsVisible(false)
    setIsDismissed(true)
    localStorage.setItem('pwa-install-dismissed', 'true')

    // Track dismissal
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'pwa_dismiss', {
        event_category: 'PWA',
        event_label: 'Install Prompt Dismissed',
      })
    }
  }

  // Don't render if not visible or can't install
  if (!isVisible || !canInstall) return null

  if (variant === 'banner') {
    return (
      <div
        className={cn(
          'fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-lg transition-transform duration-300',
          isVisible ? 'translate-y-0' : '-translate-y-full',
          className
        )}
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Install Knowledge Network</p>
                <p className="text-xs opacity-90">
                  Add to your home screen for the best experience
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleInstall}
                disabled={isInstalling}
                className="whitespace-nowrap"
              >
                {isInstalling ? (
                  'Installing...'
                ) : (
                  <>
                    <Download className="mr-1 h-3 w-3" />
                    Install
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="h-8 w-8 p-0 text-primary-foreground hover:text-primary-foreground/80"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <Card
        className={cn(
          'fixed bottom-4 right-4 z-50 max-w-sm p-4 shadow-lg transition-all duration-300',
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>

          <div className="flex-1">
            <h3 className="font-semibold">Install Knowledge Network</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Install our app for offline access and a native experience
            </p>

            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={handleInstall} disabled={isInstalling}>
                {isInstalling ? 'Installing...' : 'Install Now'}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                Not Now
              </Button>
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="h-6 w-6 p-0"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    )
  }

  // Toast variant
  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-lg bg-background shadow-lg ring-1 ring-black/10 transition-all duration-300 dark:ring-white/10 md:left-auto md:right-4',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
        className
      )}
    >
      <div className="flex items-center gap-3 p-4">
        <Smartphone className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Add to Home Screen</p>
          <p className="text-xs text-muted-foreground">Install for quick access</p>
        </div>
        <Button size="sm" variant="default" onClick={handleInstall} disabled={isInstalling}>
          {isInstalling ? 'Installing...' : 'Install'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          className="h-8 w-8 p-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// Global window type extension for gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}