"use client"

import React from 'react'
import { useNetworkStatus, useSyncStatus, useActionQueue } from '@/lib/offline'
import { cn } from '@/lib/utils'
import { WifiOff, Wifi, Cloud, CloudOff, Loader2, AlertCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function OfflineIndicator() {
  const network = useNetworkStatus()
  const sync = useSyncStatus()
  const queue = useActionQueue()

  const getStatusIcon = () => {
    if (network.isOffline) {
      return <WifiOff className="h-4 w-4 text-red-500" />
    }
    if (network.isSlow) {
      return <Wifi className="h-4 w-4 text-yellow-500" />
    }
    if (sync.isSyncing) {
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
    }
    if (sync.conflicts.length > 0) {
      return <AlertCircle className="h-4 w-4 text-orange-500" />
    }
    return <Wifi className="h-4 w-4 text-green-500" />
  }

  const getStatusText = () => {
    if (network.isOffline) return 'Offline'
    if (network.isSlow) return 'Slow connection'
    if (network.isLimited) return 'Limited connection'
    if (sync.isSyncing) return 'Syncing...'
    if (sync.conflicts.length > 0) return `${sync.conflicts.length} conflicts`
    return 'Online'
  }

  const getCloudIcon = () => {
    if (network.isOffline) {
      return <CloudOff className="h-4 w-4" />
    }
    if (sync.isSyncing) {
      return <Cloud className="h-4 w-4 animate-pulse" />
    }
    return <Cloud className="h-4 w-4" />
  }

  const formatLastSync = () => {
    if (!sync.lastSyncTime) return 'Never'

    const now = new Date()
    const diff = now.getTime() - sync.lastSyncTime.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`

    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Network Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "px-2 py-1 h-auto",
                network.isOffline && "text-red-500",
                network.isSlow && "text-yellow-500",
                !network.isOffline && !network.isSlow && "text-green-500"
              )}
            >
              {getStatusIcon()}
              <span className="ml-1 text-xs">{getStatusText()}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-semibold">Connection Status</p>
              <p className="text-xs">State: {network.state}</p>
              {network.effectiveType && (
                <p className="text-xs">Type: {network.effectiveType}</p>
              )}
              {network.downlink && (
                <p className="text-xs">Speed: {network.downlink} Mbps</p>
              )}
              {network.rtt && (
                <p className="text-xs">Latency: {network.rtt}ms</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Sync Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="px-2 py-1 h-auto"
              onClick={() => sync.sync()}
              disabled={network.isOffline || sync.isSyncing}
            >
              {getCloudIcon()}
              <span className="ml-1 text-xs">{formatLastSync()}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-semibold">Sync Status</p>
              <p className="text-xs">
                Last sync: {sync.lastSyncTime?.toLocaleTimeString() || 'Never'}
              </p>
              {sync.conflicts.length > 0 && (
                <p className="text-xs text-orange-500">
                  {sync.conflicts.length} documents with conflicts
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Click to sync now
              </p>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Action Queue */}
        {queue.stats && queue.stats.total > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant={queue.stats.failed > 0 ? "destructive" : "secondary"}
                className="text-xs"
              >
                {queue.stats.pending > 0 && (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                )}
                {queue.stats.total}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p className="font-semibold">Offline Queue</p>
                <p className="text-xs">Pending: {queue.stats.pending}</p>
                <p className="text-xs">Processing: {queue.stats.processing}</p>
                {queue.stats.failed > 0 && (
                  <p className="text-xs text-red-500">
                    Failed: {queue.stats.failed}
                  </p>
                )}
                <div className="pt-1 border-t">
                  <p className="text-xs font-medium">By Priority:</p>
                  <p className="text-xs">Critical: {queue.stats.byPriority.critical}</p>
                  <p className="text-xs">High: {queue.stats.byPriority.high}</p>
                  <p className="text-xs">Normal: {queue.stats.byPriority.normal}</p>
                  <p className="text-xs">Low: {queue.stats.byPriority.low}</p>
                </div>
                {queue.stats.failed > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => queue.process()}
                  >
                    Retry Failed
                  </Button>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Offline Mode Badge */}
        {network.isOffline && (
          <Badge variant="outline" className="text-xs">
            Offline Mode
          </Badge>
        )}
      </div>
    </TooltipProvider>
  )
}

export function OfflineStatusBar() {
  const network = useNetworkStatus()
  const [show, setShow] = React.useState(false)

  React.useEffect(() => {
    setShow(network.isOffline || network.isSlow)
  }, [network.isOffline, network.isSlow])

  if (!show) return null

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium",
        network.isOffline && "bg-red-500 text-white",
        network.isSlow && "bg-yellow-500 text-black"
      )}
    >
      {network.isOffline
        ? "You're offline. Changes will be saved locally and synced when you're back online."
        : "Slow connection detected. Some features may be limited."}
    </div>
  )
}