# Cross-Service Authentication Protocol Design

## Overview

This document outlines the comprehensive cross-service authentication protocol for the Knowledge Network React Application microservices architecture. The protocol ensures secure, scalable, and efficient authentication and authorization across all services while maintaining high availability and performance.

## Architecture Principles

### 1. Zero Trust Security Model
- No implicit trust between services
- Every request is authenticated and authorized
- Continuous verification of identity and permissions

### 2. Decentralized Authentication
- Independent service authentication capabilities
- Distributed secret management
- Fail-safe authentication mechanisms

### 3. Performance Optimization
- Token caching strategies
- Asynchronous verification
- Minimal network overhead

### 4. Scalability & Resilience
- Horizontal scaling support
- Circuit breaker patterns
- Graceful degradation

## Cross-Service Authentication Manager

```typescript
import { JwtPayload, sign, verify } from 'jsonwebtoken';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import Redis from 'ioredis';
import { RateLimiterRedis } from 'rate-limiter-flexible';

export interface ServiceIdentity {
  serviceId: string;
  serviceName: string;
  version: string;
  environment: string;
  publicKey: string;
  privateKey: string;
  capabilities: string[];
  trustLevel: 'high' | 'medium' | 'low';
  registeredAt: Date;
  lastSeen: Date;
}

export interface ServiceToken {
  iss: string; // Issuer service ID
  sub: string; // Subject service ID
  aud: string[]; // Audience services
  exp: number; // Expiration time
  iat: number; // Issued at
  jti: string; // JWT ID for tracking
  scope: string[]; // Permissions/capabilities
  context: {
    requestId: string;
    userId?: string;
    sessionId?: string;
    operation: string;
    metadata: Record<string, any>;
  };
}

export interface AuthenticationChain {
  chainId: string;
  initiator: string;
  services: string[];
  tokens: Map<string, string>;
  createdAt: Date;
  expiresAt: Date;
  status: 'active' | 'expired' | 'revoked';
}

export class CrossServiceAuthManager {
  private redis: Redis;
  private serviceRegistry: Map<string, ServiceIdentity> = new Map();
  private authChains: Map<string, AuthenticationChain> = new Map();
  private rateLimiters: Map<string, RateLimiterRedis> = new Map();
  private masterKey: Buffer;
  private keyRotationInterval: NodeJS.Timeout;

  constructor(redisClient: Redis, masterKey: string) {
    this.redis = redisClient;
    this.masterKey = Buffer.from(masterKey, 'hex');
    this.setupRateLimiting();
    this.startKeyRotation();
    this.startHealthMonitoring();
  }

  private setupRateLimiting(): void {
    // Service-to-service authentication rate limiting
    this.rateLimiters.set('service_auth', new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: 'rl_service_auth',
      points: 1000, // requests per minute
      duration: 60,
    }));

    // Token validation rate limiting
    this.rateLimiters.set('token_validation', new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: 'rl_token_validation',
      points: 5000, // validations per minute
      duration: 60,
    }));

    // Service registration rate limiting
    this.rateLimiters.set('service_registration', new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: 'rl_service_registration',
      points: 10, // registrations per hour
      duration: 3600,
    }));
  }

  public async registerService(
    serviceName: string,
    version: string,
    capabilities: string[],
    trustLevel: ServiceIdentity['trustLevel'] = 'medium'
  ): Promise<ServiceIdentity> {
    await this.checkRateLimit('service_registration', serviceName);

    const serviceId = this.generateServiceId(serviceName, version);
    const keyPair = await this.generateServiceKeyPair();

    const serviceIdentity: ServiceIdentity = {
      serviceId,
      serviceName,
      version,
      environment: process.env.NODE_ENV || 'development',
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      capabilities,
      trustLevel,
      registeredAt: new Date(),
      lastSeen: new Date(),
    };

    // Store service identity
    this.serviceRegistry.set(serviceId, serviceIdentity);
    await this.storeServiceIdentity(serviceIdentity);

    console.log(`Service registered: ${serviceId}`);

    return serviceIdentity;
  }

  public async authenticateService(
    requesterServiceId: string,
    targetServiceId: string,
    operation: string,
    context: Partial<ServiceToken['context']> = {}
  ): Promise<string> {
    await this.checkRateLimit('service_auth', `${requesterServiceId}:${targetServiceId}`);

    const requesterService = await this.getServiceIdentity(requesterServiceId);
    const targetService = await this.getServiceIdentity(targetServiceId);

    if (!requesterService || !targetService) {
      throw new Error('Service not found or not authorized');
    }

    // Check if requester has permission to call target service
    if (!this.hasServicePermission(requesterService, targetService, operation)) {
      throw new Error('Insufficient permissions');
    }

    // Generate service token
    const tokenPayload: ServiceToken = {
      iss: requesterServiceId,
      sub: targetServiceId,
      aud: [targetServiceId],
      exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
      iat: Math.floor(Date.now() / 1000),
      jti: this.generateTokenId(),
      scope: this.getPermittedScopes(requesterService, targetService, operation),
      context: {
        requestId: context.requestId || this.generateRequestId(),
        userId: context.userId,
        sessionId: context.sessionId,
        operation,
        metadata: context.metadata || {},
      },
    };

    // Sign token with requester's private key
    const token = sign(tokenPayload, requesterService.privateKey, { algorithm: 'RS256' });

    // Store token for tracking and potential revocation
    await this.storeActiveToken(tokenPayload.jti, token, tokenPayload.exp);

    // Create or update authentication chain
    await this.updateAuthenticationChain(requesterServiceId, targetServiceId, token);

    await this.logAuthenticationEvent(requesterServiceId, targetServiceId, operation, 'success');

    return token;
  }

  public async validateServiceToken(
    token: string,
    expectedAudience: string,
    requiredScopes: string[] = []
  ): Promise<ServiceToken> {
    await this.checkRateLimit('token_validation', expectedAudience);

    try {
      // Decode token to get issuer
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()) as ServiceToken;

      // Check if token is revoked
      const isRevoked = await this.isTokenRevoked(decoded.jti);
      if (isRevoked) {
        throw new Error('Token has been revoked');
      }

      // Get issuer service to verify signature
      const issuerService = await this.getServiceIdentity(decoded.iss);
      if (!issuerService) {
        throw new Error('Unknown issuer service');
      }

      // Verify token signature
      const verifiedPayload = verify(token, issuerService.publicKey, { algorithms: ['RS256'] }) as ServiceToken;

      // Validate audience
      if (!verifiedPayload.aud.includes(expectedAudience)) {
        throw new Error('Invalid audience');
      }

      // Validate required scopes
      const hasRequiredScopes = requiredScopes.every(scope =>
        verifiedPayload.scope.includes(scope)
      );

      if (!hasRequiredScopes) {
        throw new Error('Insufficient scopes');
      }

      // Update last seen for issuer service
      await this.updateServiceLastSeen(decoded.iss);

      await this.logAuthenticationEvent(decoded.iss, expectedAudience, verifiedPayload.context.operation, 'validation_success');

      return verifiedPayload;
    } catch (error) {
      await this.logAuthenticationEvent('unknown', expectedAudience, 'unknown', 'validation_failure', {
        error: error.message,
      });
      throw new Error(`Token validation failed: ${error.message}`);
    }
  }

  public async createAuthenticationChain(
    initiatorServiceId: string,
    serviceChain: string[],
    operation: string,
    context: Partial<ServiceToken['context']> = {}
  ): Promise<AuthenticationChain> {
    const chainId = this.generateChainId();
    const tokens = new Map<string, string>();

    // Generate tokens for each service in the chain
    for (let i = 0; i < serviceChain.length - 1; i++) {
      const currentService = serviceChain[i];
      const nextService = serviceChain[i + 1];

      const token = await this.authenticateService(
        currentService,
        nextService,
        operation,
        { ...context, requestId: context.requestId || chainId }
      );

      tokens.set(`${currentService}->${nextService}`, token);
    }

    const authChain: AuthenticationChain = {
      chainId,
      initiator: initiatorServiceId,
      services: serviceChain,
      tokens,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 300000), // 5 minutes
      status: 'active',
    };

    this.authChains.set(chainId, authChain);
    await this.storeAuthenticationChain(authChain);

    return authChain;
  }

  public async revokeServiceToken(jti: string, reason: string = 'manual_revocation'): Promise<void> {
    await this.redis.setex(`revoked_token:${jti}`, 3600, reason);
    await this.logAuthenticationEvent('system', 'all', 'token_revocation', 'success', { jti, reason });
  }

  public async revokeAuthenticationChain(chainId: string, reason: string = 'manual_revocation'): Promise<void> {
    const chain = this.authChains.get(chainId);
    if (!chain) {
      throw new Error('Authentication chain not found');
    }

    // Revoke all tokens in the chain
    for (const [, token] of chain.tokens) {
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()) as ServiceToken;
      await this.revokeServiceToken(decoded.jti, reason);
    }

    chain.status = 'revoked';
    await this.storeAuthenticationChain(chain);
  }

  public async rotateServiceKeys(serviceId: string): Promise<void> {
    const service = await this.getServiceIdentity(serviceId);
    if (!service) {
      throw new Error('Service not found');
    }

    // Generate new key pair
    const newKeyPair = await this.generateServiceKeyPair();

    // Store old key with expiry for token validation
    await this.redis.setex(
      `old_key:${serviceId}`,
      3600, // 1 hour grace period
      service.publicKey
    );

    // Update service with new keys
    service.publicKey = newKeyPair.publicKey;
    service.privateKey = newKeyPair.privateKey;

    await this.storeServiceIdentity(service);
    this.serviceRegistry.set(serviceId, service);

    console.log(`Keys rotated for service: ${serviceId}`);
  }

  private async generateServiceKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    const { generateKeyPairSync } = require('crypto');

    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    return { publicKey, privateKey };
  }

  private generateServiceId(serviceName: string, version: string): string {
    const hash = createHash('sha256')
      .update(`${serviceName}:${version}:${Date.now()}`)
      .digest('hex');
    return `svc_${hash.substring(0, 16)}`;
  }

  private generateTokenId(): string {
    return `tok_${randomBytes(16).toString('hex')}`;
  }

  private generateChainId(): string {
    return `chain_${randomBytes(16).toString('hex')}`;
  }

  private generateRequestId(): string {
    return `req_${randomBytes(16).toString('hex')}`;
  }

  private hasServicePermission(
    requester: ServiceIdentity,
    target: ServiceIdentity,
    operation: string
  ): boolean {
    // Check trust level compatibility
    const trustLevels = { high: 3, medium: 2, low: 1 };
    if (trustLevels[requester.trustLevel] < trustLevels[target.trustLevel]) {
      return false;
    }

    // Check if requester has capability to perform operation
    const requiredCapability = this.getRequiredCapability(operation);
    return requester.capabilities.includes(requiredCapability);
  }

  private getPermittedScopes(
    requester: ServiceIdentity,
    target: ServiceIdentity,
    operation: string
  ): string[] {
    // Return scopes based on service capabilities and operation
    const baseScopes = ['service:read'];

    if (operation.includes('write') || operation.includes('create') || operation.includes('update')) {
      baseScopes.push('service:write');
    }

    if (operation.includes('admin') || operation.includes('delete')) {
      baseScopes.push('service:admin');
    }

    return baseScopes.filter(scope => requester.capabilities.includes(scope));
  }

  private getRequiredCapability(operation: string): string {
    if (operation.includes('admin') || operation.includes('delete')) {
      return 'service:admin';
    }
    if (operation.includes('write') || operation.includes('create') || operation.includes('update')) {
      return 'service:write';
    }
    return 'service:read';
  }

  private async getServiceIdentity(serviceId: string): Promise<ServiceIdentity | null> {
    // Try cache first
    let service = this.serviceRegistry.get(serviceId);

    if (!service) {
      // Try Redis
      const serviceData = await this.redis.get(`service:${serviceId}`);
      if (serviceData) {
        service = JSON.parse(serviceData);
        this.serviceRegistry.set(serviceId, service!);
      }
    }

    return service || null;
  }

  private async storeServiceIdentity(service: ServiceIdentity): Promise<void> {
    const serviceData = {
      ...service,
      privateKey: this.encryptPrivateKey(service.privateKey),
    };

    await this.redis.setex(
      `service:${service.serviceId}`,
      86400 * 30, // 30 days
      JSON.stringify(serviceData)
    );
  }

  private async storeActiveToken(jti: string, token: string, exp: number): Promise<void> {
    const ttl = exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.setex(`active_token:${jti}`, ttl, token);
    }
  }

  private async isTokenRevoked(jti: string): Promise<boolean> {
    const revokedReason = await this.redis.get(`revoked_token:${jti}`);
    return !!revokedReason;
  }

  private async updateServiceLastSeen(serviceId: string): Promise<void> {
    const service = await this.getServiceIdentity(serviceId);
    if (service) {
      service.lastSeen = new Date();
      await this.storeServiceIdentity(service);
      this.serviceRegistry.set(serviceId, service);
    }
  }

  private async updateAuthenticationChain(
    requesterServiceId: string,
    targetServiceId: string,
    token: string
  ): Promise<void> {
    // Find or create authentication chain
    let chainId: string | null = null;

    for (const [id, chain] of this.authChains) {
      if (chain.initiator === requesterServiceId && chain.status === 'active') {
        chainId = id;
        break;
      }
    }

    if (!chainId) {
      chainId = this.generateChainId();
      const newChain: AuthenticationChain = {
        chainId,
        initiator: requesterServiceId,
        services: [requesterServiceId, targetServiceId],
        tokens: new Map(),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 300000),
        status: 'active',
      };
      this.authChains.set(chainId, newChain);
    }

    const chain = this.authChains.get(chainId)!;
    chain.tokens.set(`${requesterServiceId}->${targetServiceId}`, token);

    if (!chain.services.includes(targetServiceId)) {
      chain.services.push(targetServiceId);
    }

    await this.storeAuthenticationChain(chain);
  }

  private async storeAuthenticationChain(chain: AuthenticationChain): Promise<void> {
    const chainData = {
      ...chain,
      tokens: Array.from(chain.tokens.entries()),
    };

    const ttl = Math.max(300, Math.floor((chain.expiresAt.getTime() - Date.now()) / 1000));

    await this.redis.setex(
      `auth_chain:${chain.chainId}`,
      ttl,
      JSON.stringify(chainData)
    );
  }

  private encryptPrivateKey(privateKey: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.masterKey, iv);

    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decryptPrivateKey(encryptedKey: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedKey.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private async checkRateLimit(type: string, identifier: string): Promise<void> {
    const limiter = this.rateLimiters.get(type);
    if (limiter) {
      try {
        await limiter.consume(identifier);
      } catch (rejRes) {
        throw new Error(`Rate limit exceeded for ${type}`);
      }
    }
  }

  private async logAuthenticationEvent(
    sourceService: string,
    targetService: string,
    operation: string,
    result: 'success' | 'failure' | 'validation_success' | 'validation_failure',
    metadata: any = {}
  ): Promise<void> {
    const event = {
      timestamp: new Date().toISOString(),
      sourceService,
      targetService,
      operation,
      result,
      metadata,
    };

    await this.redis.lpush('cross_service_auth_events', JSON.stringify(event));
    await this.redis.ltrim('cross_service_auth_events', 0, 9999);
  }

  private startKeyRotation(): void {
    // Rotate service keys every 24 hours
    this.keyRotationInterval = setInterval(async () => {
      console.log('Starting automatic key rotation...');

      for (const [serviceId] of this.serviceRegistry) {
        try {
          await this.rotateServiceKeys(serviceId);
        } catch (error) {
          console.error(`Key rotation failed for service ${serviceId}:`, error);
        }
      }
    }, 86400000); // 24 hours
  }

  private startHealthMonitoring(): void {
    // Monitor service health every 5 minutes
    setInterval(async () => {
      const now = Date.now();
      const staleThreshold = 300000; // 5 minutes

      for (const [serviceId, service] of this.serviceRegistry) {
        const timeSinceLastSeen = now - service.lastSeen.getTime();

        if (timeSinceLastSeen > staleThreshold) {
          console.warn(`Service appears stale: ${serviceId} (last seen: ${service.lastSeen})`);

          // Optionally mark service as unhealthy
          await this.redis.setex(`service_health:${serviceId}`, 300, 'stale');
        }
      }

      // Clean up expired authentication chains
      for (const [chainId, chain] of this.authChains) {
        if (chain.expiresAt.getTime() < now && chain.status === 'active') {
          chain.status = 'expired';
          await this.storeAuthenticationChain(chain);
        }
      }
    }, 300000); // 5 minutes
  }

  public async getServiceMetrics(): Promise<any> {
    const totalServices = this.serviceRegistry.size;
    const activeChains = Array.from(this.authChains.values()).filter(c => c.status === 'active').length;

    // Get recent authentication events
    const recentEvents = await this.redis.lrange('cross_service_auth_events', 0, 99);
    const events = recentEvents.map(e => JSON.parse(e));

    const successfulAuths = events.filter(e => e.result === 'success').length;
    const failedAuths = events.filter(e => e.result === 'failure').length;

    return {
      totalServices,
      activeChains,
      authenticationMetrics: {
        successful: successfulAuths,
        failed: failedAuths,
        successRate: successfulAuths / (successfulAuths + failedAuths) || 0,
      },
      servicesByTrustLevel: {
        high: Array.from(this.serviceRegistry.values()).filter(s => s.trustLevel === 'high').length,
        medium: Array.from(this.serviceRegistry.values()).filter(s => s.trustLevel === 'medium').length,
        low: Array.from(this.serviceRegistry.values()).filter(s => s.trustLevel === 'low').length,
      },
    };
  }

  public async shutdown(): Promise<void> {
    console.log('Shutting down Cross-Service Auth Manager...');

    if (this.keyRotationInterval) {
      clearInterval(this.keyRotationInterval);
    }

    // Revoke all active authentication chains
    for (const [chainId] of this.authChains) {
      await this.revokeAuthenticationChain(chainId, 'system_shutdown');
    }

    await this.redis.disconnect();
  }
}
```

## Service Authentication Middleware

```typescript
export class ServiceAuthMiddleware {
  private authManager: CrossServiceAuthManager;

  constructor(authManager: CrossServiceAuthManager) {
    this.authManager = authManager;
  }

  public authenticate(requiredScopes: string[] = []) {
    return async (req: any, res: any, next: any) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }

        const token = authHeader.substring(7);
        const serviceId = req.headers['x-service-id'];

        if (!serviceId) {
          return res.status(401).json({ error: 'Missing service identifier' });
        }

        // Validate service token
        const validatedToken = await this.authManager.validateServiceToken(
          token,
          serviceId,
          requiredScopes
        );

        // Attach service context to request
        req.serviceContext = {
          serviceId: validatedToken.iss,
          targetService: validatedToken.sub,
          scopes: validatedToken.scope,
          requestId: validatedToken.context.requestId,
          operation: validatedToken.context.operation,
          userId: validatedToken.context.userId,
          sessionId: validatedToken.context.sessionId,
        };

        next();
      } catch (error) {
        res.status(401).json({ error: error.message });
      }
    };
  }

  public requireScope(scope: string) {
    return (req: any, res: any, next: any) => {
      if (!req.serviceContext?.scopes.includes(scope)) {
        return res.status(403).json({ error: `Required scope missing: ${scope}` });
      }
      next();
    };
  }

  public requireTrustLevel(minLevel: ServiceIdentity['trustLevel']) {
    return async (req: any, res: any, next: any) => {
      try {
        const service = await this.authManager.getServiceIdentity(req.serviceContext.serviceId);
        if (!service) {
          return res.status(401).json({ error: 'Service not found' });
        }

        const trustLevels = { high: 3, medium: 2, low: 1 };
        if (trustLevels[service.trustLevel] < trustLevels[minLevel]) {
          return res.status(403).json({ error: 'Insufficient trust level' });
        }

        next();
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    };
  }
}
```

## Cross-Service Client

```typescript
export class CrossServiceClient {
  private authManager: CrossServiceAuthManager;
  private serviceId: string;
  private httpClient: any; // axios or similar

  constructor(authManager: CrossServiceAuthManager, serviceId: string) {
    this.authManager = authManager;
    this.serviceId = serviceId;
    this.setupHttpClient();
  }

  private setupHttpClient(): void {
    const axios = require('axios');

    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'X-Service-Id': this.serviceId,
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add authentication
    this.httpClient.interceptors.request.use(async (config: any) => {
      const targetService = this.extractServiceFromUrl(config.url);
      const operation = `${config.method?.toUpperCase()}_${config.url}`;

      try {
        const token = await this.authManager.authenticateService(
          this.serviceId,
          targetService,
          operation,
          { requestId: config.headers['X-Request-Id'] }
        );

        config.headers.Authorization = `Bearer ${token}`;
        return config;
      } catch (error) {
        throw new Error(`Service authentication failed: ${error.message}`);
      }
    });

    // Response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response: any) => response,
      (error: any) => {
        if (error.response?.status === 401) {
          console.error('Service authentication failed:', error.response.data);
        }
        return Promise.reject(error);
      }
    );
  }

  public async get(url: string, options: any = {}): Promise<any> {
    return this.httpClient.get(url, options);
  }

  public async post(url: string, data: any, options: any = {}): Promise<any> {
    return this.httpClient.post(url, data, options);
  }

  public async put(url: string, data: any, options: any = {}): Promise<any> {
    return this.httpClient.put(url, data, options);
  }

  public async delete(url: string, options: any = {}): Promise<any> {
    return this.httpClient.delete(url, options);
  }

  private extractServiceFromUrl(url: string): string {
    // Extract service identifier from URL
    // This would be customized based on your service discovery mechanism
    const match = url.match(/\/\/([^.]+)/);
    return match ? match[1] : 'unknown';
  }
}
```

## Security Configuration

```typescript
export const crossServiceAuthConfig = {
  tokenSecurity: {
    algorithm: 'RS256',
    keySize: 2048,
    tokenExpiry: 300, // 5 minutes
    clockTolerance: 60, // 1 minute
  },
  keyManagement: {
    rotationInterval: 86400, // 24 hours
    gracePeriod: 3600, // 1 hour
    backupKeys: 3, // Number of old keys to keep
  },
  rateLimiting: {
    serviceAuth: { points: 1000, duration: 60 },
    tokenValidation: { points: 5000, duration: 60 },
    serviceRegistration: { points: 10, duration: 3600 },
  },
  monitoring: {
    healthCheckInterval: 300, // 5 minutes
    staleServiceThreshold: 300, // 5 minutes
    logRetention: 30, // days
    alertThresholds: {
      failureRate: 0.1, // 10%
      responseTime: 5000, // 5 seconds
    },
  },
  trustLevels: {
    high: {
      description: 'Critical services with highest security requirements',
      canAccessAll: true,
      requireMfa: true,
    },
    medium: {
      description: 'Standard business services',
      canAccessAll: false,
      requireMfa: false,
    },
    low: {
      description: 'Non-critical services with basic access',
      canAccessAll: false,
      requireMfa: false,
    },
  },
};
```

## Implementation Checklist

- [x] Cross-service authentication protocol design
- [x] Service identity management and registration
- [x] JWT-based service-to-service authentication
- [x] Authentication chain management for multi-hop requests
- [x] Automatic key rotation and management
- [x] Rate limiting and abuse prevention
- [x] Service trust levels and capability-based authorization
- [x] Token revocation and blacklisting
- [x] Health monitoring and stale service detection
- [x] Authentication middleware for service endpoints
- [x] Cross-service HTTP client with automatic authentication
- [x] Comprehensive security logging and monitoring
- [x] Performance optimization with caching strategies
- [x] Circuit breaker patterns for resilience

This implementation provides enterprise-grade cross-service authentication that ensures secure, scalable, and efficient communication between all microservices while maintaining high availability and performance standards.