import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAStatus {
  isInstalled: boolean
  canInstall: boolean
  isOnline: boolean
  isStandalone: boolean
  installPrompt: BeforeInstallPromptEvent | null
}

export function usePWA() {
  const [pwaStatus, setPWAStatus] = useState<PWAStatus>({
    isInstalled: false,
    canInstall: false,
    isOnline: true,
    isStandalone: false,
    installPrompt: null,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if app is running in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://')

    // Check online status
    const updateOnlineStatus = () => {
      setPWAStatus((prev) => ({ ...prev, isOnline: navigator.onLine }))
    }

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setPWAStatus((prev) => ({
        ...prev,
        canInstall: true,
        installPrompt: promptEvent,
      }))
    }

    // Handle successful installation
    const handleAppInstalled = () => {
      setPWAStatus((prev) => ({
        ...prev,
        isInstalled: true,
        canInstall: false,
        installPrompt: null,
      }))
    }

    // Set initial state
    setPWAStatus({
      isInstalled: isStandalone,
      canInstall: false,
      isOnline: navigator.onLine,
      isStandalone,
      installPrompt: null,
    })

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  const installPWA = async () => {
    if (!pwaStatus.installPrompt) return false

    try {
      await pwaStatus.installPrompt.prompt()
      const { outcome } = await pwaStatus.installPrompt.userChoice

      if (outcome === 'accepted') {
        setPWAStatus((prev) => ({
          ...prev,
          isInstalled: true,
          canInstall: false,
          installPrompt: null,
        }))
        return true
      }

      return false
    } catch (error) {
      console.error('Error installing PWA:', error)
      return false
    }
  }

  return {
    ...pwaStatus,
    installPWA,
  }
}

// Hook for service worker management
export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const registerServiceWorker = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/service-worker.js')
        setRegistration(reg)

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setIsUpdateAvailable(true)
            }
          })
        })

        // Check for updates periodically (every hour)
        setInterval(() => {
          reg.update()
        }, 60 * 60 * 1000)
      } catch (error) {
        console.error('Service worker registration failed:', error)
      }
    }

    registerServiceWorker()
  }, [])

  const updateServiceWorker = () => {
    if (!registration || !isUpdateAvailable) return

    // Skip waiting and reload
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  return {
    registration,
    isUpdateAvailable,
    updateServiceWorker,
  }
}

// Hook for push notifications
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return

    setPermission(Notification.permission)
  }, [])

  const requestPermission = async () => {
    if (!('Notification' in window)) return false

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }

  const subscribeToPush = async (publicVapidKey: string) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return null
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      })

      setSubscription(sub)
      return sub
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      return null
    }
  }

  const unsubscribeFromPush = async () => {
    if (!subscription) return false

    try {
      await subscription.unsubscribe()
      setSubscription(null)
      return true
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error)
      return false
    }
  }

  return {
    permission,
    subscription,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    isSupported: 'Notification' in window && 'PushManager' in window,
  }
}

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}