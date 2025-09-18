'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Key,
  Globe,
  Shield,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  TestTube,
  Loader2,
  Link2
} from 'lucide-react'
import type { IntegrationDefinition } from '@/lib/integrations/types'

interface IntegrationConfigDialogProps {
  integration: IntegrationDefinition
  isOpen: boolean
  onClose: () => void
  onSave: (config: IntegrationDefinition) => Promise<void>
  onTestConnection: (config: IntegrationDefinition) => Promise<boolean>
  onOAuthConnect?: (integration: IntegrationDefinition) => void
}

export function IntegrationConfigDialog({
  integration,
  isOpen,
  onClose,
  onSave,
  onTestConnection,
  onOAuthConnect
}: IntegrationConfigDialogProps) {
  const [activeTab, setActiveTab] = useState<'credentials' | 'permissions' | 'advanced'>('credentials')
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (integration) {
      setFormData(integration.config || {})
      setSelectedScopes(integration.oauth2Config?.scope || [])
    }
  }, [integration])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleScopeToggle = (scope: string, checked: boolean) => {
    setSelectedScopes(prev =>
      checked ? [...prev, scope] : prev.filter(s => s !== scope)
    )
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)

    try {
      const updatedConfig = {
        ...integration,
        config: { ...formData, scopes: selectedScopes }
      }
      const success = await onTestConnection(updatedConfig)
      setTestResult({
        success,
        message: success
          ? 'Connection successful! Your credentials are valid.'
          : 'Connection failed. Please check your credentials and try again.'
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: 'An error occurred while testing the connection.'
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updatedConfig = {
        ...integration,
        config: { ...formData, scopes: selectedScopes }
      }
      await onSave(updatedConfig)
      onClose()
    } catch (error) {
      console.error('Failed to save configuration:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const toggleSecretVisibility = (field: string) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const isOAuth = integration.type === 'oauth2'
  const isApiKey = integration.type === 'api_key'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            {integration.logo && (
              <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <img
                  src={integration.logo}
                  alt={integration.name}
                  className="h-6 w-6 object-contain"
                />
              </div>
            )}
            <div>
              <DialogTitle>Configure {integration.name}</DialogTitle>
              <DialogDescription>
                {integration.description || 'Set up your integration credentials and permissions'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="credentials" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Credentials
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            <TabsContent value="credentials" className="space-y-4 px-1">
              {isOAuth ? (
                <div className="space-y-4">
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertTitle>OAuth 2.0 Authentication</AlertTitle>
                    <AlertDescription>
                      This integration uses secure OAuth 2.0 authentication. Click the button below to authorize access.
                    </AlertDescription>
                  </Alert>

                  {integration.oauth2Config && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="text-sm">
                          <p className="font-medium">Redirect URI</p>
                          <p className="text-muted-foreground font-mono text-xs mt-1">
                            {integration.oauth2Config.redirectUri}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(integration.oauth2Config!.redirectUri)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => onOAuthConnect?.(integration)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Authorize with {integration.name}
                      </Button>
                    </div>
                  )}
                </div>
              ) : isApiKey ? (
                <div className="space-y-4">
                  {integration.apiKeyFields?.map((field) => (
                    <div key={field.name} className="space-y-2">
                      <Label htmlFor={field.name}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <div className="relative">
                        <Input
                          id={field.name}
                          type={
                            field.type === 'password' && !showSecrets[field.name]
                              ? 'password'
                              : 'text'
                          }
                          placeholder={field.placeholder}
                          value={formData[field.name] || ''}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          className="pr-10"
                        />
                        {field.type === 'password' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => toggleSecretVisibility(field.name)}
                          >
                            {showSecrets[field.name] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Test Connection */}
              <div className="pt-4 space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4 mr-2" />
                      Test Connection
                    </>
                  )}
                </Button>

                {testResult && (
                  <Alert variant={testResult.success ? 'default' : 'destructive'}>
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>{testResult.message}</AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4 px-1">
              {isOAuth && integration.requiredScopes && (
                <div className="space-y-3">
                  <div>
                    <h3 className="font-medium mb-2">Required Permissions</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      These permissions are required for the integration to function properly
                    </p>
                    <div className="space-y-2">
                      {integration.requiredScopes.map((scope) => (
                        <div
                          key={scope}
                          className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg"
                        >
                          <Checkbox checked disabled />
                          <Label className="text-sm font-normal cursor-not-allowed">
                            {scope}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {integration.optionalScopes && integration.optionalScopes.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2">Optional Permissions</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Additional permissions for enhanced functionality
                      </p>
                      <div className="space-y-2">
                        {integration.optionalScopes.map((scope) => (
                          <div
                            key={scope}
                            className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors"
                          >
                            <Checkbox
                              checked={selectedScopes.includes(scope)}
                              onCheckedChange={(checked) =>
                                handleScopeToggle(scope, checked as boolean)
                              }
                            />
                            <Label className="text-sm font-normal cursor-pointer">
                              {scope}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isOAuth && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This integration uses API key authentication. Permissions are managed through the external service.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4 px-1">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Rate Limiting</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Configure rate limiting for API requests
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rateLimit">Max Requests</Label>
                      <Input
                        id="rateLimit"
                        type="number"
                        placeholder="100"
                        value={formData.rateLimitMax || ''}
                        onChange={(e) => handleInputChange('rateLimitMax', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rateLimitWindow">Time Window (ms)</Label>
                      <Input
                        id="rateLimitWindow"
                        type="number"
                        placeholder="60000"
                        value={formData.rateLimitWindow || ''}
                        onChange={(e) => handleInputChange('rateLimitWindow', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Retry Policy</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Configure automatic retry behavior for failed requests
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxRetries">Max Retries</Label>
                      <Input
                        id="maxRetries"
                        type="number"
                        placeholder="3"
                        value={formData.maxRetries || ''}
                        onChange={(e) => handleInputChange('maxRetries', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="retryDelay">Initial Delay (ms)</Label>
                      <Input
                        id="retryDelay"
                        type="number"
                        placeholder="1000"
                        value={formData.retryDelay || ''}
                        onChange={(e) => handleInputChange('retryDelay', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Connection Settings</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="autoRefresh">Auto-refresh Token</Label>
                      <Checkbox
                        id="autoRefresh"
                        checked={formData.autoRefresh || false}
                        onCheckedChange={(checked) =>
                          handleInputChange('autoRefresh', String(checked))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="syncEnabled">Enable Background Sync</Label>
                      <Checkbox
                        id="syncEnabled"
                        checked={formData.syncEnabled || false}
                        onCheckedChange={(checked) =>
                          handleInputChange('syncEnabled', String(checked))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}