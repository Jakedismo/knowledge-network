'use client'

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
} from 'react'
import { cn } from '@/lib/utils'
import { IntegrationCard } from './IntegrationCard'
import { IntegrationConfigDialog } from './IntegrationConfigDialog'
import { IntegrationWebhookPanel } from './IntegrationWebhookPanel'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Grid3X3,
  List,
  Zap,
  Package,
  Briefcase,
  Code,
  BarChart3,
  MessageSquare,
  HelpCircle,
  RefreshCw,
  Loader2,
  RotateCcw,
  Store,
  Webhook,
} from 'lucide-react'
import type { WebhookConfig } from '@/server/modules/integrations/types'
import {
  cloneDefaultIntegrationState,
} from '@/lib/integrations/default-state'
import {
  loadIntegrationState,
  resetIntegrationState,
  saveIntegrationState,
} from '@/lib/integrations/storage'
import type {
  IntegrationDefinition,
  IntegrationStateSnapshot,
} from '@/lib/integrations/types'

const availableEvents = [
  'push',
  'pull_request',
  'issues',
  'issue_created',
  'issue_updated',
  'sprint_started',
  'sprint_completed',
  'file_uploaded',
  'file_deleted',
  'message_sent',
  'user_joined',
]

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface IntegrationMarketplaceProps {
  className?: string
}

export function IntegrationMarketplace({ className }: IntegrationMarketplaceProps) {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'connected' | 'webhooks'>('marketplace')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [state, setState] = useState<IntegrationStateSnapshot>(() =>
    cloneDefaultIntegrationState()
  )
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(
    null
  )
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  const integrations = state.integrations
  const selectedIntegration = useMemo(() => {
    if (!selectedIntegrationId) return null
    return integrations.find(integration => integration.id === selectedIntegrationId) ?? null
  }, [selectedIntegrationId, integrations])

  useEffect(() => {
    const snapshot = loadIntegrationState()
    setState(snapshot)
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    saveIntegrationState(state)
  }, [state, isHydrated])

  const categories = [
    { value: 'all', label: 'All Categories', icon: Package },
    { value: 'collaboration', label: 'Collaboration', icon: MessageSquare },
    { value: 'storage', label: 'Storage', icon: Package },
    { value: 'project_management', label: 'Project Management', icon: Briefcase },
    { value: 'development', label: 'Development', icon: Code },
    { value: 'analytics', label: 'Analytics', icon: BarChart3 },
  ]

  const filteredIntegrations = useMemo(() => {
    return integrations.filter(integration => {
      const matchesSearch =
        searchQuery === '' ||
        integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        integration.description.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory =
        selectedCategory === 'all' || integration.category === selectedCategory

      const matchesTab =
        activeTab === 'marketplace' ||
        (activeTab === 'connected' && integration.status === 'connected')

      return matchesSearch && matchesCategory && matchesTab
    })
  }, [integrations, searchQuery, selectedCategory, activeTab])

  const connectedCount = integrations.filter(i => i.status === 'connected').length
  const totalCount = integrations.length

  const handleConfigure = useCallback((integration: IntegrationDefinition) => {
    setSelectedIntegrationId(integration.id)
    setConfigDialogOpen(true)
  }, [])

  const handleConnect = useCallback((integration: IntegrationDefinition) => {
    setSelectedIntegrationId(integration.id)
    setConfigDialogOpen(true)
  }, [])

  const handleToggle = useCallback((integration: IntegrationDefinition, enabled: boolean) => {
    setState(prev => ({
      ...prev,
      integrations: prev.integrations.map(item =>
        item.id === integration.id
          ? {
              ...item,
              enabled,
              status: enabled ? 'connected' : 'disconnected',
              lastSync: enabled ? new Date().toISOString() : item.lastSync,
            }
          : item
      ),
    }))
  }, [])

  const handleSaveConfig = useCallback(async (config: IntegrationDefinition) => {
    await delay(500)
    const nowIso = new Date().toISOString()
    setState(prev => ({
      ...prev,
      integrations: prev.integrations.map(integration =>
        integration.id === config.id
          ? {
              ...integration,
              config: config.config ?? {},
              enabled: true,
              status: 'connected',
              lastSync: nowIso,
              connectedAt: integration.connectedAt ?? nowIso,
              usage: integration.usage
                ? {
                    ...integration.usage,
                    requests: Math.min(
                      integration.usage.limit,
                      integration.usage.requests + Math.floor(Math.random() * 25) + 10
                    ),
                  }
                : integration.usage,
            }
          : integration
      ),
    }))
    setConfigDialogOpen(false)
    setSelectedIntegrationId(null)
  }, [])

  const handleTestConnection = useCallback(
    async (candidate: IntegrationDefinition) => {
      await delay(600)
      const integration = integrations.find(item => item.id === candidate.id)
      if (!integration) return false

      if (integration.type === 'api_key') {
        const requiredFields =
          integration.apiKeyFields?.filter(field => field.required).map(field => field.name) ?? []
        return requiredFields.every(field => {
          const value = candidate.config?.[field]
          if (typeof value === 'string') {
            return value.trim().length > 0
          }
          return Boolean(value)
        })
      }

      if (integration.type === 'oauth2') {
        const { clientId, clientSecret } = candidate.config ?? {}
        return Boolean(clientId && clientSecret)
      }

      return true
    },
    [integrations]
  )

  const handleOAuthConnect = useCallback((integration: IntegrationDefinition) => {
    const nowIso = new Date().toISOString()
    setState(prev => ({
      ...prev,
      integrations: prev.integrations.map(item =>
        item.id === integration.id
          ? {
              ...item,
              status: 'connected',
              enabled: true,
              lastSync: nowIso,
              connectedAt: item.connectedAt ?? nowIso,
            }
          : item
      ),
    }))
  }, [])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await delay(700)
    setState(prev => ({
      ...prev,
      integrations: prev.integrations.map(integration => {
        if (integration.status !== 'connected') {
          return integration
        }

        const nextUsage = integration.usage
          ? {
              ...integration.usage,
              requests: Math.min(
                integration.usage.limit,
                integration.usage.requests + Math.floor(Math.random() * 15)
              ),
            }
          : undefined

        return {
          ...integration,
          lastSync: new Date().toISOString(),
          usage: nextUsage,
        }
      }),
    }))
    setIsRefreshing(false)
  }, [])

  const handleReset = useCallback(() => {
    const snapshot = resetIntegrationState()
    setState(snapshot)
    setSelectedIntegrationId(null)
    setConfigDialogOpen(false)
  }, [])

  const handleAddWebhook = useCallback(
    async (webhook: Omit<WebhookConfig, 'id'>) => {
      await delay(500)
      const id = `wh-${Date.now()}`
      const nowIso = new Date().toISOString()
      const managedWebhook = {
        id,
        integrationId: selectedIntegrationId ?? 'global',
        name: `${selectedIntegration?.name ?? 'Global'} webhook`,
        createdAt: nowIso,
        lastTriggeredAt: undefined,
        ...webhook,
      }

      setState(prev => ({
        ...prev,
        webhooks: [...prev.webhooks, managedWebhook],
        deliveries: [
          {
            id: `d-${Date.now()}`,
            webhookId: id,
            event: 'webhook.created',
            status: 'success',
            attempts: 1,
            timestamp: nowIso,
            responseCode: 200,
            responseTime: 120,
          },
          ...prev.deliveries,
        ],
      }))

      return managedWebhook
    },
    [selectedIntegrationId, selectedIntegration]
  )

  const handleUpdateWebhook = useCallback(async (id: string, webhook: Partial<WebhookConfig>) => {
    await delay(400)
    setState(prev => ({
      ...prev,
      webhooks: prev.webhooks.map(item =>
        item.id === id
          ? {
              ...item,
              ...webhook,
            }
          : item
      ),
    }))
  }, [])

  const handleDeleteWebhook = useCallback(async (id: string) => {
    await delay(300)
    setState(prev => ({
      ...prev,
      webhooks: prev.webhooks.filter(webhook => webhook.id !== id),
      deliveries: prev.deliveries.filter(delivery => delivery.webhookId !== id),
    }))
  }, [])

  const handleTestWebhook = useCallback(async (id: string) => {
    await delay(700)
    const success = Math.random() > 0.2
    const nowIso = new Date().toISOString()

    setState(prev => ({
      ...prev,
      deliveries: [
        {
          id: `d-${Date.now()}`,
          webhookId: id,
          event: 'manual_test',
          status: success ? 'success' : 'failed',
          attempts: success ? 1 : 2,
          timestamp: nowIso,
          responseCode: success ? 200 : 500,
          responseTime: 100 + Math.floor(Math.random() * 100),
          error: success ? undefined : 'Timed out waiting for response',
        },
        ...prev.deliveries,
      ],
      webhooks: prev.webhooks.map(webhook =>
        webhook.id === id
          ? {
              ...webhook,
              lastTriggeredAt: nowIso,
            }
          : webhook
      ),
    }))

    return success
  }, [])

  const handleRefreshDeliveries = useCallback(async () => {
    await delay(500)
    setState(prev => ({
      ...prev,
      deliveries: prev.deliveries.map(delivery => {
        if (delivery.status === 'pending' || delivery.status === 'retrying') {
          return {
            ...delivery,
            status: 'success',
            attempts: delivery.attempts + 1,
            timestamp: new Date().toISOString(),
            responseCode: 200,
            responseTime: 110 + Math.floor(Math.random() * 60),
            error: undefined,
          }
        }
        return delivery
      }),
    }))
  }, [])

  const closeDialog = useCallback(() => {
    setConfigDialogOpen(false)
    setSelectedIntegrationId(null)
  }, [])

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Store className="h-8 w-8" />
            Integration Marketplace
          </h1>
          <p className="text-muted-foreground mt-1">
            Connect your favorite tools and services to extend functionality
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {connectedCount} / {totalCount} Connected
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={value => setActiveTab(value as typeof activeTab)}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="marketplace" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Marketplace
            </TabsTrigger>
            <TabsTrigger value="connected" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Connected ({connectedCount})
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Webhooks
            </TabsTrigger>
          </TabsList>

          {activeTab !== 'webhooks' && (
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="marketplace" className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    <div className="flex items-center gap-2">
                      <category.icon className="h-4 w-4" />
                      {category.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredIntegrations.length === 0 ? (
            <Alert>
              <HelpCircle className="h-4 w-4" />
              <AlertTitle>No integrations found</AlertTitle>
              <AlertDescription>
                Try adjusting your search criteria or browse all integrations
              </AlertDescription>
            </Alert>
          ) : (
            <div
              className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                  : 'space-y-4'
              )}
            >
              {filteredIntegrations.map(integration => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onConfigure={handleConfigure}
                  onToggle={handleToggle}
                  onConnect={handleConnect}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="connected" className="space-y-4">
          {filteredIntegrations.length === 0 ? (
            <Alert>
              <HelpCircle className="h-4 w-4" />
              <AlertTitle>No connected integrations</AlertTitle>
              <AlertDescription>
                Browse the marketplace to connect your first integration
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search connected integrations..."
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  className="pl-9"
                />
              </div>

              <div
                className={cn(
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                    : 'space-y-4'
                )}
              >
                {filteredIntegrations.map(integration => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    onConfigure={handleConfigure}
                    onToggle={handleToggle}
                    onConnect={handleConnect}
                  />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="webhooks">
          <IntegrationWebhookPanel
            integrationId={selectedIntegrationId ?? 'all'}
            webhooks={state.webhooks}
            deliveries={state.deliveries}
            availableEvents={availableEvents}
            onAddWebhook={handleAddWebhook}
            onUpdateWebhook={handleUpdateWebhook}
            onDeleteWebhook={handleDeleteWebhook}
            onTestWebhook={handleTestWebhook}
            onRefreshDeliveries={handleRefreshDeliveries}
          />
        </TabsContent>
      </Tabs>

      {selectedIntegration && (
        <IntegrationConfigDialog
          integration={selectedIntegration}
          isOpen={configDialogOpen}
          onClose={closeDialog}
          onSave={handleSaveConfig}
          onTestConnection={handleTestConnection}
          onOAuthConnect={handleOAuthConnect}
        />
      )}
    </div>
  )
}
