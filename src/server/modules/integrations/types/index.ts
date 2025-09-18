// Integration types and interfaces
export interface IntegrationConfig {
  id: string;
  name: string;
  type: 'oauth2' | 'api_key' | 'webhook' | 'saml';
  enabled: boolean;
  config: Record<string, any>;
  rateLimits?: RateLimitConfig;
  retryPolicy?: RetryPolicy;
}

export interface IntegrationCredentials {
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  apiSecret?: string;
  host?: string;
  email?: string;
  apiToken?: string;
  expiresAt?: Date;
}

export interface IntegrationContext {
  workspaceId: string;
  userId: string;
  integration: IntegrationConfig;
  credentials?: IntegrationCredentials;
}

export interface IntegrationResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelay: number;
  backoffMultiplier: number;
  maxDelay?: number;
}

export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  redirectUri: string;
  scope: string[];
}

export interface OAuth2Token {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope?: string;
}

export interface WebhookConfig {
  id: string;
  url: string;
  secret?: string;
  events: string[];
  headers?: Record<string, string>;
  active: boolean;
  retryPolicy?: RetryPolicy;
}

export interface SAMLConfig {
  entityId: string;
  assertionConsumerServiceUrl: string;
  identityProviderUrl: string;
  certificate: string;
  privateKey: string;
}

export interface SAMLUser {
  nameId: string;
  email: string;
  attributes: Record<string, any>;
  sessionIndex?: string;
}

export abstract class IntegrationAdapter {
  abstract initialize(credentials: IntegrationCredentials): Promise<void>;
  abstract execute(
    action: string,
    context: IntegrationContext,
    payload?: any
  ): Promise<any>;
  abstract validateCredentials?(credentials: IntegrationCredentials): Promise<boolean>;
  abstract refreshCredentials?(credentials: IntegrationCredentials): Promise<IntegrationCredentials>;
}

// Integration events
export enum IntegrationEvent {
  CONNECTED = 'integration.connected',
  DISCONNECTED = 'integration.disconnected',
  SUCCESS = 'integration.success',
  FAILURE = 'integration.failure',
  RATE_LIMITED = 'integration.rateLimited',
  WEBHOOK_RECEIVED = 'integration.webhookReceived',
  TOKEN_REFRESHED = 'integration.tokenRefreshed',
}

// Integration error classes
export class IntegrationError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

export class RateLimitExceededException extends IntegrationError {
  constructor(message: string) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
    this.name = 'RateLimitExceededException';
  }
}

export class AuthenticationError extends IntegrationError {
  constructor(message: string) {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class ConfigurationError extends IntegrationError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR', 400);
    this.name = 'ConfigurationError';
  }
}