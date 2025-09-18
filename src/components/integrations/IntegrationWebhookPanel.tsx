'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Webhook,
  Plus,
  Copy,
  Trash2,
  Edit,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  Filter,
  Search,
  Eye,
  Loader2,
  Send,
  Activity
} from 'lucide-react'
import { WebhookConfig } from '@/server/modules/integrations/types'

interface WebhookDelivery {
  id: string
  webhookId: string
  event: string
  status: 'pending' | 'success' | 'failed' | 'retrying'
  attempts: number
  timestamp: Date
  responseCode?: number
  responseTime?: number
  error?: string
}

interface IntegrationWebhookPanelProps {
  integrationId: string
  webhooks: WebhookConfig[]
  deliveries: WebhookDelivery[]
  availableEvents: string[]
  onAddWebhook: (webhook: Omit<WebhookConfig, 'id'>) => Promise<WebhookConfig>
  onUpdateWebhook: (id: string, webhook: Partial<WebhookConfig>) => Promise<void>
  onDeleteWebhook: (id: string) => Promise<void>
  onTestWebhook: (id: string) => Promise<boolean>
  onRefreshDeliveries: () => Promise<void>
  className?: string
}

export function IntegrationWebhookPanel({
  integrationId,
  webhooks,
  deliveries,
  availableEvents,
  onAddWebhook,
  onUpdateWebhook,
  onDeleteWebhook,
  onTestWebhook,
  onRefreshDeliveries,
  className
}: IntegrationWebhookPanelProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(null)
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDelivery | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | WebhookDelivery['status']>('all')
  const [isTestingWebhook, setIsTestingWebhook] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Form state for add/edit webhook
  const [webhookForm, setWebhookForm] = useState({
    url: '',
    secret: '',
    events: [] as string[],
    active: true,
    headers: {} as Record<string, string>
  })

  const handleAddWebhook = async () => {
    const newWebhook = await onAddWebhook({
      url: webhookForm.url,
      secret: webhookForm.secret,
      events: webhookForm.events,
      active: webhookForm.active,
      headers: webhookForm.headers
    })
    setIsAddDialogOpen(false)
    resetForm()
  }

  const handleEditWebhook = async () => {
    if (!selectedWebhook) return
    await onUpdateWebhook(selectedWebhook.id, webhookForm)
    setIsEditDialogOpen(false)
    resetForm()
  }

  const handleTestWebhook = async (webhookId: string) => {
    setIsTestingWebhook(webhookId)
    try {
      await onTestWebhook(webhookId)
    } finally {
      setIsTestingWebhook(null)
    }
  }

  const handleRefreshDeliveries = async () => {
    setIsRefreshing(true)
    try {
      await onRefreshDeliveries()
    } finally {
      setIsRefreshing(false)
    }
  }

  const resetForm = () => {
    setWebhookForm({
      url: '',
      secret: '',
      events: [],
      active: true,
      headers: {}
    })
    setSelectedWebhook(null)
  }

  const openEditDialog = (webhook: WebhookConfig) => {
    setSelectedWebhook(webhook)
    setWebhookForm({
      url: webhook.url,
      secret: webhook.secret || '',
      events: webhook.events,
      active: webhook.active,
      headers: webhook.headers || {}
    })
    setIsEditDialogOpen(true)
  }

  const copyWebhookUrl = (url: string) => {
    navigator.clipboard.writeText(url)
  }

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = searchQuery === '' ||
      delivery.event.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || delivery.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusIcon = (status: WebhookDelivery['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'retrying':
        return <RefreshCw className="h-4 w-4 text-orange-500 animate-spin" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: WebhookDelivery['status']) => {
    const variants = {
      success: 'bg-green-500/10 text-green-600 dark:text-green-400',
      failed: 'bg-red-500/10 text-red-600 dark:text-red-400',
      pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
      retrying: 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
    }
    return (
      <Badge variant="secondary" className={cn('text-xs', variants[status])}>
        {status}
      </Badge>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Webhooks Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhooks
              </CardTitle>
              <CardDescription>
                Manage webhook endpoints and event subscriptions
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No webhooks configured. Add your first webhook to start receiving events.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {webhooks.map(webhook => (
                <div
                  key={webhook.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-mono">{webhook.url}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyWebhookUrl(webhook.url)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {webhook.active ? (
                        <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                          <Activity className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <Pause className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                      {webhook.events.slice(0, 3).map((event, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                      {webhook.events.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{webhook.events.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleTestWebhook(webhook.id)}
                      disabled={isTestingWebhook === webhook.id}
                    >
                      {isTestingWebhook === webhook.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(webhook)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteWebhook(webhook.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery History Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Delivery History
              </CardTitle>
              <CardDescription>
                Monitor webhook delivery status and responses
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={handleRefreshDeliveries}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="retrying">Retrying</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Delivery Table */}
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Response</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeliveries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No deliveries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDeliveries.map(delivery => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-mono text-sm">
                        {delivery.event}
                      </TableCell>
                      <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                      <TableCell>
                        {delivery.responseCode && (
                          <Badge variant="outline" className="text-xs">
                            {delivery.responseCode}
                          </Badge>
                        )}
                        {delivery.responseTime && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {delivery.responseTime}ms
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{delivery.attempts}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(delivery.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedDelivery(delivery)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add Webhook Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
            <DialogDescription>
              Configure a new webhook endpoint for receiving events
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Webhook URL</Label>
              <Input
                id="url"
                placeholder="https://your-domain.com/webhook"
                value={webhookForm.url}
                onChange={(e) => setWebhookForm(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secret">Secret (optional)</Label>
              <Input
                id="secret"
                type="password"
                placeholder="Signing secret for verification"
                value={webhookForm.secret}
                onChange={(e) => setWebhookForm(prev => ({ ...prev, secret: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <ScrollArea className="h-[150px] border rounded-md p-3">
                <div className="space-y-2">
                  {availableEvents.map(event => (
                    <div key={event} className="flex items-center space-x-2">
                      <Checkbox
                        checked={webhookForm.events.includes(event)}
                        onCheckedChange={(checked) => {
                          setWebhookForm(prev => ({
                            ...prev,
                            events: checked
                              ? [...prev.events, event]
                              : prev.events.filter(e => e !== event)
                          }))
                        }}
                      />
                      <Label className="text-sm font-normal cursor-pointer">
                        {event}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={webhookForm.active}
                onCheckedChange={(checked) =>
                  setWebhookForm(prev => ({ ...prev, active: checked as boolean }))
                }
              />
              <Label className="text-sm font-normal">
                Activate webhook immediately
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddWebhook}>Add Webhook</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Webhook Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Webhook</DialogTitle>
            <DialogDescription>
              Update webhook configuration and event subscriptions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-url">Webhook URL</Label>
              <Input
                id="edit-url"
                value={webhookForm.url}
                onChange={(e) => setWebhookForm(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-secret">Secret</Label>
              <Input
                id="edit-secret"
                type="password"
                value={webhookForm.secret}
                onChange={(e) => setWebhookForm(prev => ({ ...prev, secret: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <ScrollArea className="h-[150px] border rounded-md p-3">
                <div className="space-y-2">
                  {availableEvents.map(event => (
                    <div key={event} className="flex items-center space-x-2">
                      <Checkbox
                        checked={webhookForm.events.includes(event)}
                        onCheckedChange={(checked) => {
                          setWebhookForm(prev => ({
                            ...prev,
                            events: checked
                              ? [...prev.events, event]
                              : prev.events.filter(e => e !== event)
                          }))
                        }}
                      />
                      <Label className="text-sm font-normal cursor-pointer">
                        {event}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={webhookForm.active}
                onCheckedChange={(checked) =>
                  setWebhookForm(prev => ({ ...prev, active: checked as boolean }))
                }
              />
              <Label className="text-sm font-normal">
                Webhook active
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditWebhook}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery Details Dialog */}
      {selectedDelivery && (
        <Dialog open={!!selectedDelivery} onOpenChange={() => setSelectedDelivery(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Delivery Details</DialogTitle>
              <DialogDescription>
                Event: {selectedDelivery.event}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedDelivery.status)}</div>
                </div>
                <div>
                  <Label>Attempts</Label>
                  <div className="mt-1 text-sm">{selectedDelivery.attempts}</div>
                </div>
                <div>
                  <Label>Response Code</Label>
                  <div className="mt-1 text-sm">{selectedDelivery.responseCode || 'N/A'}</div>
                </div>
                <div>
                  <Label>Response Time</Label>
                  <div className="mt-1 text-sm">
                    {selectedDelivery.responseTime ? `${selectedDelivery.responseTime}ms` : 'N/A'}
                  </div>
                </div>
              </div>
              {selectedDelivery.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{selectedDelivery.error}</AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setSelectedDelivery(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}