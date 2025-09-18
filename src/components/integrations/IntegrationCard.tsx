'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  XCircle,
  Settings,
  Zap,
  Shield,
  Globe,
  ArrowRight,
  Info
} from 'lucide-react'
import { IntegrationConfig } from '@/server/modules/integrations/types'

interface IntegrationCardProps {
  integration: IntegrationConfig & {
    category: 'collaboration' | 'storage' | 'project_management' | 'development' | 'analytics'
    description: string
    logo?: string
    features: string[]
    status: 'connected' | 'disconnected' | 'error'
    lastSync?: Date
    usage?: {
      requests: number
      limit: number
    }
  }
  onConfigure: (integration: IntegrationConfig) => void
  onToggle: (integration: IntegrationConfig, enabled: boolean) => void
  onConnect: (integration: IntegrationConfig) => void
  className?: string
}

const categoryColors = {
  collaboration: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  storage: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  project_management: 'bg-green-500/10 text-green-600 dark:text-green-400',
  development: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  analytics: 'bg-pink-500/10 text-pink-600 dark:text-pink-400'
}

const statusIcons = {
  connected: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  disconnected: <XCircle className="h-4 w-4 text-gray-400" />,
  error: <XCircle className="h-4 w-4 text-red-500" />
}

export function IntegrationCard({
  integration,
  onConfigure,
  onToggle,
  onConnect,
  className
}: IntegrationCardProps) {
  const isConnected = integration.status === 'connected'
  const hasError = integration.status === 'error'

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggle(integration, !integration.enabled)
  }

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-200',
        'hover:shadow-lg hover:scale-[1.02]',
        isConnected && 'ring-1 ring-green-500/20',
        hasError && 'ring-1 ring-red-500/20',
        className
      )}
    >
      {/* Gradient Background Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <CardContent className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {/* Logo */}
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
              {integration.logo ? (
                <img
                  src={integration.logo}
                  alt={integration.name}
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <Globe className="h-6 w-6 text-gray-500" />
              )}
            </div>

            {/* Title and Status */}
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                {integration.name}
                {statusIcons[integration.status]}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="secondary"
                  className={cn('text-xs', categoryColors[integration.category])}
                >
                  {integration.category.replace('_', ' ')}
                </Badge>
                {integration.type === 'oauth2' && (
                  <Badge variant="outline" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    OAuth 2.0
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Enable/Disable Toggle */}
          {isConnected && (
            <Button
              variant={integration.enabled ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggle}
              className="relative"
            >
              <Zap className={cn('h-3 w-3 mr-1', integration.enabled && 'text-yellow-400')} />
              {integration.enabled ? 'Enabled' : 'Disabled'}
            </Button>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {integration.description}
        </p>

        {/* Features */}
        <div className="flex flex-wrap gap-1 mb-4">
          {integration.features.slice(0, 3).map((feature, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {feature}
            </Badge>
          ))}
          {integration.features.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{integration.features.length - 3} more
            </Badge>
          )}
        </div>

        {/* Usage Stats */}
        {isConnected && integration.usage && (
          <div className="mb-4">
            <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
              <span>API Usage</span>
              <span>{integration.usage.requests} / {integration.usage.limit}</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  integration.usage.requests / integration.usage.limit < 0.8
                    ? 'bg-green-500'
                    : integration.usage.requests / integration.usage.limit < 0.95
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                )}
                style={{ width: `${(integration.usage.requests / integration.usage.limit) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Last Sync */}
        {isConnected && integration.lastSync && (
          <p className="text-xs text-muted-foreground">
            Last synced: {new Date(integration.lastSync).toLocaleString()}
          </p>
        )}
      </CardContent>

      <CardFooter className="relative p-4 pt-0 flex justify-between items-center">
        {isConnected ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onConfigure(integration)}
              className="text-xs"
            >
              <Settings className="h-3 w-3 mr-1" />
              Configure
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              <Info className="h-3 w-3 mr-1" />
              Details
            </Button>
          </>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={() => onConnect(integration)}
          >
            Connect
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}