import type {
  IntegrationConfig,
  OAuth2Config,
  RateLimitConfig,
  RetryPolicy,
  WebhookConfig,
} from '@/server/modules/integrations/types'

export type IntegrationCategory =
  | 'collaboration'
  | 'storage'
  | 'project_management'
  | 'development'
  | 'analytics'

export interface IntegrationUsage {
  requests: number
  limit: number
}

export interface IntegrationRuntimeState {
  enabled: boolean
  status: 'connected' | 'disconnected' | 'error'
  lastSync?: string
  usage?: IntegrationUsage
  connectedAt?: string
}

export interface IntegrationMetadata {
  id: string
  name: string
  description: string
  category: IntegrationCategory
  features: string[]
  logo?: string
  docsUrl?: string
  supportUrl?: string
  oauth2Config?: OAuth2Config
  requiredScopes?: string[]
  optionalScopes?: string[]
  apiKeyFields?: {
    name: string
    label: string
    type?: 'text' | 'password' | 'url'
    placeholder?: string
    required?: boolean
  }[]
  rateLimits?: RateLimitConfig
  retryPolicy?: RetryPolicy
}

export type IntegrationDefinition = IntegrationConfig & IntegrationMetadata & IntegrationRuntimeState

export interface ManagedWebhook extends WebhookConfig {
  integrationId: string
  name: string
  createdAt: string
  lastTriggeredAt?: string
}

export interface WebhookDeliveryRecord {
  id: string
  webhookId: string
  event: string
  status: 'pending' | 'success' | 'failed' | 'retrying'
  attempts: number
  timestamp: string
  responseCode?: number
  responseTime?: number
  error?: string
}

export interface IntegrationStateSnapshot {
  integrations: IntegrationDefinition[]
  webhooks: ManagedWebhook[]
  deliveries: WebhookDeliveryRecord[]
}
