'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { IntegrationCard } from './IntegrationCard'
import { IntegrationConfigDialog } from './IntegrationConfigDialog'
import { IntegrationWebhookPanel } from './IntegrationWebhookPanel'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  Filter,
  Grid3X3,
  List,
  Zap,
  Package,
  Briefcase,
  Code,
  BarChart3,
  MessageSquare,
  HelpCircle,
  Settings,
  RefreshCw,
  Loader2,
  ChevronRight,
  Store,
  Webhook
} from 'lucide-react'
import { IntegrationConfig, WebhookConfig, OAuth2Config } from '@/server/modules/integrations/types'

// Mock data for available integrations
const mockIntegrations = [
  {
    id: 'slack',
    name: 'Slack',
    type: 'oauth2' as const,
    enabled: false,
    category: 'collaboration' as const,
    description: 'Team communication and collaboration platform',
    logo: '/integrations/slack.png',
    features: ['Real-time messaging', 'File sharing', 'Channel management', 'Notifications'],
    status: 'disconnected' as const,
    config: {},
    oauth2Config: {
      clientId: '',
      clientSecret: '',
      authorizationUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      redirectUri: 'http://localhost:3000/api/integrations/oauth/callback',
      scope: ['chat:write', 'channels:read', 'users:read']
    },
    requiredScopes: ['chat:write', 'channels:read'],
    optionalScopes: ['files:read', 'files:write', 'users:read.email']
  },
  {
    id: 'github',
    name: 'GitHub',
    type: 'oauth2' as const,
    enabled: true,
    category: 'development' as const,
    description: 'Code hosting and version control platform',
    logo: '/integrations/github.png',
    features: ['Repository management', 'Issue tracking', 'Pull requests', 'CI/CD'],
    status: 'connected' as const,
    lastSync: new Date('2024-01-10T10:00:00'),
    usage: { requests: 850, limit: 1000 },
    config: {},
    oauth2Config: {
      clientId: '',
      clientSecret: '',
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      redirectUri: 'http://localhost:3000/api/integrations/oauth/callback',
      scope: ['repo', 'user']
    }
  },
  {
    id: 'jira',
    name: 'Jira',
    type: 'api_key' as const,
    enabled: true,
    category: 'project_management' as const,
    description: 'Agile project management and issue tracking',
    logo: '/integrations/jira.png',
    features: ['Sprint planning', 'Issue tracking', 'Roadmaps', 'Reports'],
    status: 'connected' as const,
    lastSync: new Date('2024-01-10T09:30:00'),
    usage: { requests: 320, limit: 500 },
    config: {},
    apiKeyFields: [
      { name: 'domain', label: 'Jira Domain', type: 'url' as const, placeholder: 'https://your-domain.atlassian.net', required: true },
      { name: 'email', label: 'Email', type: 'text' as const, placeholder: 'your-email@example.com', required: true },
      { name: 'apiToken', label: 'API Token', type: 'password' as const, placeholder: 'Your Jira API token', required: true }
    ]
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    type: 'oauth2' as const,
    enabled: false,
    category: 'storage' as const,
    description: 'Cloud storage and file synchronization',
    logo: '/integrations/google-drive.png',
    features: ['File storage', 'Real-time collaboration', 'Version control', 'Sharing'],
    status: 'disconnected' as const,
    config: {}
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    type: 'oauth2' as const,
    enabled: false,
    category: 'collaboration' as const,
    description: 'Business communication and collaboration',
    logo: '/integrations/teams.png',
    features: ['Video conferencing', 'Chat', 'File sharing', 'App integration'],
    status: 'error' as const,
    config: {}
  },
  {
    id: 'mixpanel',
    name: 'Mixpanel',
    type: 'api_key' as const,
    enabled: false,
    category: 'analytics' as const,
    description: 'Product analytics and user behavior tracking',
    logo: '/integrations/mixpanel.png',
    features: ['Event tracking', 'User analytics', 'Funnels', 'Retention analysis'],
    status: 'disconnected' as const,
    config: {},
    apiKeyFields: [
      { name: 'projectId', label: 'Project ID', type: 'text' as const, required: true },
      { name: 'apiSecret', label: 'API Secret', type: 'password' as const, required: true }
    ]
  }
]

const mockWebhooks: WebhookConfig[] = [
  {
    id: 'wh-1',
    url: 'https://example.com/webhook/github',
    events: ['push', 'pull_request', 'issues'],
    active: true,
    secret: 'secret-key'
  },
  {
    id: 'wh-2',
    url: 'https://example.com/webhook/jira',
    events: ['issue_created', 'issue_updated'],
    active: false
  }
]

const mockDeliveries = [
  {
    id: 'd-1',
    webhookId: 'wh-1',
    event: 'push',
    status: 'success' as const,
    attempts: 1,
    timestamp: new Date('2024-01-10T10:00:00'),
    responseCode: 200,
    responseTime: 145
  },
  {
    id: 'd-2',
    webhookId: 'wh-1',
    event: 'pull_request',
    status: 'failed' as const,
    attempts: 3,
    timestamp: new Date('2024-01-10T09:45:00'),
    responseCode: 500,
    error: 'Internal server error'
  },
  {
    id: 'd-3',
    webhookId: 'wh-2',
    event: 'issue_created',
    status: 'pending' as const,
    attempts: 0,
    timestamp: new Date('2024-01-10T10:15:00')
  }
]

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
  'user_joined'
]

interface IntegrationMarketplaceProps {
  className?: string
}

export function IntegrationMarketplace({ className }: IntegrationMarketplaceProps) {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'connected' | 'webhooks'>('marketplace')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [integrations, setIntegrations] = useState(mockIntegrations)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<any>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const categories = [
    { value: 'all', label: 'All Categories', icon: Package },
    { value: 'collaboration', label: 'Collaboration', icon: MessageSquare },
    { value: 'storage', label: 'Storage', icon: Package },
    { value: 'project_management', label: 'Project Management', icon: Briefcase },
    { value: 'development', label: 'Development', icon: Code },
    { value: 'analytics', label: 'Analytics', icon: BarChart3 }
  ]

  const filteredIntegrations = useMemo(() => {
    return integrations.filter(integration => {
      const matchesSearch = searchQuery === '' ||
        integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        integration.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || integration.category === selectedCategory
      const matchesTab = activeTab === 'marketplace' ||
        (activeTab === 'connected' && integration.status === 'connected')
      return matchesSearch && matchesCategory && matchesTab
    })
  }, [integrations, searchQuery, selectedCategory, activeTab])

  const connectedCount = integrations.filter(i => i.status === 'connected').length
  const totalCount = integrations.length

  const handleConfigure = useCallback((integration: any) => {
    setSelectedIntegration(integration)
    setConfigDialogOpen(true)
  }, [])

  const handleToggle = useCallback((integration: any, enabled: boolean) => {
    setIntegrations(prev => prev.map(i =>
      i.id === integration.id ? { ...i, enabled } : i
    ))
  }, [])

  const handleConnect = useCallback((integration: any) => {
    setSelectedIntegration(integration)
    setConfigDialogOpen(true)
  }, [])

  const handleSaveConfig = useCallback(async (config: IntegrationConfig) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIntegrations(prev => prev.map(i =>
      i.id === config.id ? { ...i, ...config, status: 'connected' as const } : i
    ))
    setConfigDialogOpen(false)
  }, [])

  const handleTestConnection = useCallback(async (config: IntegrationConfig) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    return Math.random() > 0.3 // 70% success rate for demo
  }, [])

  const handleOAuthConnect = useCallback((integration: IntegrationConfig) => {
    // In a real app, this would redirect to the OAuth provider
    console.log('OAuth connect:', integration)
  }, [])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsRefreshing(false)
  }, [])

  // Webhook handlers
  const handleAddWebhook = async (webhook: Omit<WebhookConfig, 'id'>) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    return { ...webhook, id: `wh-${Date.now()}` } as WebhookConfig
  }

  const handleUpdateWebhook = async (id: string, webhook: Partial<WebhookConfig>) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  const handleDeleteWebhook = async (id: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  const handleTestWebhook = async (id: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    return true
  }

  const handleRefreshDeliveries = async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
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
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
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
          {/* Search and Filters */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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

          {/* Integration Grid */}
          {filteredIntegrations.length === 0 ? (
            <Alert>
              <HelpCircle className="h-4 w-4" />
              <AlertTitle>No integrations found</AlertTitle>
              <AlertDescription>
                Try adjusting your search criteria or browse all integrations
              </AlertDescription>
            </Alert>
          ) : (
            <div className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-4'
            )}>
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
          {/* Connected Integrations */}
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
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search connected integrations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                  : 'space-y-4'
              )}>
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
            integrationId="all"
            webhooks={mockWebhooks}
            deliveries={mockDeliveries}
            availableEvents={availableEvents}
            onAddWebhook={handleAddWebhook}
            onUpdateWebhook={handleUpdateWebhook}
            onDeleteWebhook={handleDeleteWebhook}
            onTestWebhook={handleTestWebhook}
            onRefreshDeliveries={handleRefreshDeliveries}
          />
        </TabsContent>
      </Tabs>

      {/* Configuration Dialog */}
      {selectedIntegration && (
        <IntegrationConfigDialog
          integration={selectedIntegration}
          isOpen={configDialogOpen}
          onClose={() => setConfigDialogOpen(false)}
          onSave={handleSaveConfig}
          onTestConnection={handleTestConnection}
          onOAuthConnect={handleOAuthConnect}
        />
      )}
    </div>
  )
}