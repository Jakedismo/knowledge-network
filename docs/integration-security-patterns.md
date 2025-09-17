# Integration Security for External Services

## Overview

This document outlines comprehensive security patterns for integrating with external services including Slack, JIRA, Google Drive, and other third-party APIs. The implementation focuses on OAuth2 flows, secure credential management, and robust error handling.

## Core Security Principles

### 1. Zero Trust Architecture
- All external service requests are treated as untrusted
- Mandatory authentication and authorization for every integration
- Principle of least privilege for API access

### 2. Secure Credential Management
- OAuth2 tokens stored encrypted in Redis with TTL
- Refresh token rotation with secure storage
- Credential isolation per user and service

### 3. Request Validation & Sanitization
- All incoming data from external services validated
- Rate limiting per integration and user
- Input sanitization to prevent injection attacks

## Integration Security Manager

```typescript
import { OAuth2Client, Credentials } from 'google-auth-library';
import { WebClient as SlackClient } from '@slack/web-api';
import { Version3Client as JiraClient } from 'jira.js';
import Redis from 'ioredis';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';

export interface ExternalServiceConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  tokenEndpoint: string;
  authEndpoint: string;
  revokeEndpoint?: string;
}

export interface SecureCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
  encryptedData: string;
  checksum: string;
}

export class IntegrationSecurityManager {
  private redis: Redis;
  private encryptionKey: Buffer;
  private services: Map<string, ExternalServiceConfig> = new Map();
  private rateLimiters: Map<string, any> = new Map();

  constructor(redisClient: Redis, encryptionKey: string) {
    this.redis = redisClient;
    this.encryptionKey = Buffer.from(encryptionKey, 'hex');
    this.initializeServices();
    this.setupRateLimiting();
  }

  private initializeServices(): void {
    // Google Drive Configuration
    this.services.set('google_drive', {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: process.env.GOOGLE_REDIRECT_URI!,
      scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file'
      ],
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      revokeEndpoint: 'https://oauth2.googleapis.com/revoke'
    });

    // Slack Configuration
    this.services.set('slack', {
      clientId: process.env.SLACK_CLIENT_ID!,
      clientSecret: process.env.SLACK_CLIENT_SECRET!,
      redirectUri: process.env.SLACK_REDIRECT_URI!,
      scopes: [
        'channels:read',
        'chat:write',
        'files:read',
        'users:read'
      ],
      tokenEndpoint: 'https://slack.com/api/oauth.v2.access',
      authEndpoint: 'https://slack.com/oauth/v2/authorize'
    });

    // JIRA Configuration
    this.services.set('jira', {
      clientId: process.env.JIRA_CLIENT_ID!,
      clientSecret: process.env.JIRA_CLIENT_SECRET!,
      redirectUri: process.env.JIRA_REDIRECT_URI!,
      scopes: [
        'read:jira-work',
        'write:jira-work',
        'read:jira-user'
      ],
      tokenEndpoint: 'https://auth.atlassian.com/oauth/token',
      authEndpoint: 'https://auth.atlassian.com/authorize'
    });
  }

  private setupRateLimiting(): void {
    const { RateLimiterRedis } = require('rate-limiter-flexible');

    // Google Drive API limits
    this.rateLimiters.set('google_drive', new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: 'rl_google_drive',
      points: 1000, // requests per quota period
      duration: 100, // per 100 seconds (Google's quota period)
    }));

    // Slack API limits
    this.rateLimiters.set('slack', new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: 'rl_slack',
      points: 50, // Slack Tier 1 rate limit
      duration: 60, // per minute
    }));

    // JIRA API limits
    this.rateLimiters.set('jira', new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: 'rl_jira',
      points: 300, // requests per minute
      duration: 60,
    }));
  }

  public async generateAuthUrl(service: string, userId: string, state?: string): Promise<string> {
    const config = this.services.get(service);
    if (!config) {
      throw new Error(`Unsupported service: ${service}`);
    }

    const secureState = state || randomBytes(32).toString('hex');
    await this.redis.setex(`auth_state:${service}:${userId}`, 600, secureState);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      response_type: 'code',
      state: secureState,
      access_type: 'offline', // For Google to get refresh tokens
      prompt: 'consent' // Ensure refresh token is always returned
    });

    return `${config.authEndpoint}?${params.toString()}`;
  }

  public async handleCallback(
    service: string,
    userId: string,
    code: string,
    state: string
  ): Promise<SecureCredentials> {
    // Validate state parameter
    const storedState = await this.redis.get(`auth_state:${service}:${userId}`);
    if (!storedState || storedState !== state) {
      throw new Error('Invalid state parameter');
    }

    await this.redis.del(`auth_state:${service}:${userId}`);

    const config = this.services.get(service);
    if (!config) {
      throw new Error(`Unsupported service: ${service}`);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    const tokens = await tokenResponse.json();

    // Encrypt and store credentials
    const credentials: SecureCredentials = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      scopes: config.scopes,
      encryptedData: '',
      checksum: ''
    };

    const secureCredentials = await this.encryptCredentials(credentials);
    await this.storeCredentials(service, userId, secureCredentials);

    return secureCredentials;
  }

  private async encryptCredentials(credentials: SecureCredentials): Promise<SecureCredentials> {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    const sensitiveData = JSON.stringify({
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken
    });

    let encrypted = cipher.update(sensitiveData, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();
    const encryptedData = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;

    const checksum = createHash('sha256')
      .update(encryptedData + credentials.expiresAt.toString())
      .digest('hex');

    return {
      ...credentials,
      accessToken: '', // Clear from memory
      refreshToken: '', // Clear from memory
      encryptedData,
      checksum
    };
  }

  private async decryptCredentials(encryptedCredentials: SecureCredentials): Promise<SecureCredentials> {
    const [ivHex, authTagHex, encrypted] = encryptedCredentials.encryptedData.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const sensitiveData = JSON.parse(decrypted);

    return {
      ...encryptedCredentials,
      accessToken: sensitiveData.accessToken,
      refreshToken: sensitiveData.refreshToken
    };
  }

  public async getValidCredentials(service: string, userId: string): Promise<SecureCredentials | null> {
    const encryptedCredentials = await this.redis.get(`credentials:${service}:${userId}`);
    if (!encryptedCredentials) {
      return null;
    }

    const credentials: SecureCredentials = JSON.parse(encryptedCredentials);

    // Verify checksum
    const expectedChecksum = createHash('sha256')
      .update(credentials.encryptedData + credentials.expiresAt.toString())
      .digest('hex');

    if (expectedChecksum !== credentials.checksum) {
      throw new Error('Credential integrity check failed');
    }

    const decryptedCredentials = await this.decryptCredentials(credentials);

    // Check if token is expired
    if (Date.now() >= decryptedCredentials.expiresAt - 300000) { // 5 min buffer
      return await this.refreshToken(service, userId, decryptedCredentials);
    }

    return decryptedCredentials;
  }

  private async refreshToken(
    service: string,
    userId: string,
    credentials: SecureCredentials
  ): Promise<SecureCredentials> {
    const config = this.services.get(service);
    if (!config || !credentials.refreshToken) {
      throw new Error('Cannot refresh token');
    }

    const refreshResponse = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: credentials.refreshToken,
      }),
    });

    if (!refreshResponse.ok) {
      throw new Error('Failed to refresh token');
    }

    const tokens = await refreshResponse.json();

    const newCredentials: SecureCredentials = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || credentials.refreshToken,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      scopes: credentials.scopes,
      encryptedData: '',
      checksum: ''
    };

    const secureCredentials = await this.encryptCredentials(newCredentials);
    await this.storeCredentials(service, userId, secureCredentials);

    return secureCredentials;
  }

  private async storeCredentials(
    service: string,
    userId: string,
    credentials: SecureCredentials
  ): Promise<void> {
    const ttl = Math.max(3600, Math.floor((credentials.expiresAt - Date.now()) / 1000));
    await this.redis.setex(
      `credentials:${service}:${userId}`,
      ttl,
      JSON.stringify(credentials)
    );
  }

  public async revokeCredentials(service: string, userId: string): Promise<void> {
    const credentials = await this.getValidCredentials(service, userId);
    if (!credentials) {
      return;
    }

    const config = this.services.get(service);
    if (config?.revokeEndpoint) {
      try {
        await fetch(config.revokeEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token: credentials.accessToken,
          }),
        });
      } catch (error) {
        console.error(`Failed to revoke ${service} token:`, error);
      }
    }

    await this.redis.del(`credentials:${service}:${userId}`);
  }

  public async checkRateLimit(service: string, userId: string): Promise<boolean> {
    const limiter = this.rateLimiters.get(service);
    if (!limiter) {
      return true;
    }

    try {
      await limiter.consume(`${service}:${userId}`);
      return true;
    } catch (rejRes) {
      return false;
    }
  }
}
```

## Service-Specific Implementations

### 1. Google Drive Integration

```typescript
export class GoogleDriveSecureIntegration {
  private securityManager: IntegrationSecurityManager;
  private oauth2Client: OAuth2Client;

  constructor(securityManager: IntegrationSecurityManager) {
    this.securityManager = securityManager;
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  public async listFiles(userId: string, query?: string): Promise<any[]> {
    if (!await this.securityManager.checkRateLimit('google_drive', userId)) {
      throw new Error('Rate limit exceeded');
    }

    const credentials = await this.securityManager.getValidCredentials('google_drive', userId);
    if (!credentials) {
      throw new Error('No valid credentials');
    }

    this.oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
    });

    const { google } = require('googleapis');
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client });

    try {
      const response = await drive.files.list({
        q: query,
        fields: 'files(id,name,mimeType,modifiedTime,size)',
        pageSize: 100,
      });

      return this.sanitizeFileList(response.data.files || []);
    } catch (error) {
      throw new Error(`Google Drive API error: ${error.message}`);
    }
  }

  private sanitizeFileList(files: any[]): any[] {
    return files.map(file => ({
      id: this.sanitizeString(file.id),
      name: this.sanitizeString(file.name),
      mimeType: this.sanitizeString(file.mimeType),
      modifiedTime: file.modifiedTime,
      size: file.size ? parseInt(file.size) : null,
    }));
  }

  private sanitizeString(input: string): string {
    return input.replace(/[<>\"'&]/g, '');
  }
}
```

### 2. Slack Integration

```typescript
export class SlackSecureIntegration {
  private securityManager: IntegrationSecurityManager;

  constructor(securityManager: IntegrationSecurityManager) {
    this.securityManager = securityManager;
  }

  public async sendMessage(userId: string, channel: string, text: string): Promise<any> {
    if (!await this.securityManager.checkRateLimit('slack', userId)) {
      throw new Error('Rate limit exceeded');
    }

    const credentials = await this.securityManager.getValidCredentials('slack', userId);
    if (!credentials) {
      throw new Error('No valid credentials');
    }

    const slack = new SlackClient(credentials.accessToken);

    // Sanitize input
    const sanitizedText = this.sanitizeMessage(text);
    const sanitizedChannel = this.sanitizeChannelId(channel);

    try {
      const result = await slack.chat.postMessage({
        channel: sanitizedChannel,
        text: sanitizedText,
      });

      return {
        success: true,
        timestamp: result.ts,
        channel: result.channel,
      };
    } catch (error) {
      throw new Error(`Slack API error: ${error.message}`);
    }
  }

  private sanitizeMessage(text: string): string {
    // Remove potential XSS and injection attempts
    return text
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .slice(0, 4000); // Slack message limit
  }

  private sanitizeChannelId(channel: string): string {
    // Ensure channel ID format
    if (!/^[C|D|G][A-Z0-9]{8,}$/.test(channel) && !channel.startsWith('#')) {
      throw new Error('Invalid channel format');
    }
    return channel;
  }
}
```

### 3. JIRA Integration

```typescript
export class JiraSecureIntegration {
  private securityManager: IntegrationSecurityManager;

  constructor(securityManager: IntegrationSecurityManager) {
    this.securityManager = securityManager;
  }

  public async createIssue(userId: string, projectKey: string, summary: string, description: string): Promise<any> {
    if (!await this.securityManager.checkRateLimit('jira', userId)) {
      throw new Error('Rate limit exceeded');
    }

    const credentials = await this.securityManager.getValidCredentials('jira', userId);
    if (!credentials) {
      throw new Error('No valid credentials');
    }

    const jira = new JiraClient({
      host: process.env.JIRA_HOST!,
      authentication: {
        oauth2: {
          accessToken: credentials.accessToken,
        },
      },
    });

    const sanitizedData = {
      summary: this.sanitizeString(summary).slice(0, 255),
      description: this.sanitizeString(description).slice(0, 32767),
      projectKey: this.sanitizeProjectKey(projectKey),
    };

    try {
      const issue = await jira.issues.createIssue({
        fields: {
          project: { key: sanitizedData.projectKey },
          summary: sanitizedData.summary,
          description: sanitizedData.description,
          issuetype: { name: 'Task' },
        },
      });

      return {
        id: issue.id,
        key: issue.key,
        self: issue.self,
      };
    } catch (error) {
      throw new Error(`JIRA API error: ${error.message}`);
    }
  }

  private sanitizeString(input: string): string {
    return input.replace(/[<>\"'&]/g, '');
  }

  private sanitizeProjectKey(key: string): string {
    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
      throw new Error('Invalid project key format');
    }
    return key;
  }
}
```

## Security Monitoring & Logging

```typescript
export class IntegrationSecurityMonitor {
  private redis: Redis;
  private logger: any; // Winston logger

  constructor(redisClient: Redis, logger: any) {
    this.redis = redisClient;
    this.logger = logger;
  }

  public async logSecurityEvent(
    service: string,
    userId: string,
    action: string,
    result: 'success' | 'failure',
    metadata?: any
  ): Promise<void> {
    const event = {
      timestamp: new Date().toISOString(),
      service,
      userId: this.hashUserId(userId),
      action,
      result,
      metadata: metadata || {},
      ip: metadata?.ip || 'unknown',
    };

    // Store in Redis for real-time monitoring
    await this.redis.lpush('security_events', JSON.stringify(event));
    await this.redis.ltrim('security_events', 0, 9999); // Keep last 10k events

    // Log to application logs
    this.logger.info('Integration security event', event);

    // Check for suspicious patterns
    await this.detectSuspiciousActivity(service, userId, action, result);
  }

  private async detectSuspiciousActivity(
    service: string,
    userId: string,
    action: string,
    result: string
  ): Promise<void> {
    const key = `activity:${service}:${this.hashUserId(userId)}`;
    const hourlyCount = await this.redis.incr(`${key}:${Date.now().toString().slice(0, -7)}`);
    await this.redis.expire(`${key}:${Date.now().toString().slice(0, -7)}`, 3600);

    // Alert on suspicious activity
    if (hourlyCount > 100) {
      this.logger.warn('Suspicious activity detected', {
        service,
        userId: this.hashUserId(userId),
        hourlyCount,
      });
    }

    // Track failure rates
    if (result === 'failure') {
      const failureKey = `failures:${service}:${this.hashUserId(userId)}`;
      const failureCount = await this.redis.incr(failureKey);
      await this.redis.expire(failureKey, 900); // 15 minutes

      if (failureCount > 10) {
        this.logger.error('High failure rate detected', {
          service,
          userId: this.hashUserId(userId),
          failureCount,
        });
      }
    }
  }

  private hashUserId(userId: string): string {
    return createHash('sha256').update(userId).digest('hex').slice(0, 16);
  }
}
```

## Error Handling & Recovery

```typescript
export class IntegrationErrorHandler {
  private static readonly RETRY_DELAYS = [1000, 2000, 4000, 8000]; // Exponential backoff
  private static readonly MAX_RETRIES = 3;

  public static async withRetry<T>(
    operation: () => Promise<T>,
    service: string,
    userId: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === this.MAX_RETRIES) {
          break;
        }

        // Don't retry on authentication errors
        if (error.message.includes('401') || error.message.includes('403')) {
          break;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAYS[attempt]));
      }
    }

    throw new Error(`Operation failed after ${this.MAX_RETRIES + 1} attempts: ${lastError.message}`);
  }

  public static handleIntegrationError(error: any, service: string): never {
    if (error.response?.status === 401) {
      throw new Error(`Authentication failed for ${service}. Please re-authorize.`);
    }

    if (error.response?.status === 403) {
      throw new Error(`Insufficient permissions for ${service}. Please check scopes.`);
    }

    if (error.response?.status === 429) {
      throw new Error(`Rate limit exceeded for ${service}. Please try again later.`);
    }

    throw new Error(`${service} integration error: ${error.message}`);
  }
}
```

## Security Configuration

```typescript
export const integrationSecurityConfig = {
  encryption: {
    algorithm: 'aes-256-gcm',
    keyRotationDays: 90,
  },
  tokenSecurity: {
    maxTokenAge: 3600, // 1 hour
    refreshThreshold: 300, // 5 minutes before expiry
    revokeOnLogout: true,
  },
  rateLimiting: {
    global: {
      windowMs: 60000, // 1 minute
      maxRequests: 1000,
    },
    perService: {
      google_drive: { windowMs: 100000, maxRequests: 1000 },
      slack: { windowMs: 60000, maxRequests: 50 },
      jira: { windowMs: 60000, maxRequests: 300 },
    },
  },
  monitoring: {
    logLevel: 'info',
    alertThresholds: {
      hourlyRequests: 500,
      failureRate: 0.1,
      suspiciousActivity: 100,
    },
  },
};
```

## Implementation Checklist

- [x] OAuth2 flow implementation with state validation
- [x] Secure credential encryption and storage
- [x] Token refresh automation
- [x] Service-specific rate limiting
- [x] Input validation and sanitization
- [x] Error handling with retry logic
- [x] Security event logging and monitoring
- [x] Credential revocation support
- [x] Integration-specific API implementations
- [x] Configuration management

This implementation provides enterprise-grade security for external service integrations while maintaining usability and performance.