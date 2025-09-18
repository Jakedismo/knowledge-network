# Authentication Flow Specification - Knowledge Network Application

## Overview

This document details the authentication and authorization flows for the Knowledge Network React Application, including JWT-based authentication, session management, role-based access control, and security best practices.

## 1. Authentication Architecture

### 1.1 Token-Based Authentication Flow

```typescript
interface AuthenticationFlow {
  // 1. Initial Authentication
  signIn: {
    input: { email: string; password: string; rememberMe?: boolean }
    process: [
      'validate_credentials',
      'check_account_status',
      'generate_tokens',
      'create_session',
      'update_last_login'
    ]
    output: {
      accessToken: string
      refreshToken: string
      user: User
      expiresAt: Date
    }
  }

  // 2. Token Refresh
  refresh: {
    input: { refreshToken: string }
    process: [
      'validate_refresh_token',
      'check_token_revocation',
      'verify_user_status',
      'generate_new_access_token',
      'optionally_rotate_refresh_token'
    ]
    output: {
      accessToken: string
      refreshToken?: string
      expiresAt: Date
    }
  }

  // 3. Token Validation
  validate: {
    input: { accessToken: string }
    process: [
      'verify_jwt_signature',
      'check_token_expiration',
      'validate_token_claims',
      'check_revocation_list',
      'load_user_context'
    ]
    output: {
      valid: boolean
      user?: User
      permissions?: string[]
    }
  }
}
```

### 1.2 JWT Token Structure

```typescript
// Access Token Payload
interface AccessTokenPayload {
  // Standard claims
  sub: string           // User ID
  iat: number          // Issued at
  exp: number          // Expires at
  iss: string          // Issuer
  aud: string          // Audience
  jti: string          // JWT ID for revocation

  // Custom claims
  email: string
  displayName: string
  role: UserRole
  permissions: Permission[]
  workspaces: {
    id: string
    role: UserRole
    permissions: Permission[]
  }[]

  // Security claims
  tokenType: 'access'
  sessionId: string
  deviceFingerprint?: string
}

// Refresh Token Payload (minimal)
interface RefreshTokenPayload {
  sub: string
  iat: number
  exp: number
  iss: string
  aud: string
  jti: string
  tokenType: 'refresh'
  sessionId: string
}
```

### 1.3 Session Management

```typescript
// Session data structure
interface UserSession {
  id: string
  userId: string
  accessToken: string
  refreshToken: string
  deviceInfo: {
    userAgent: string
    ip: string
    fingerprint: string
    platform: string
    browser: string
  }
  createdAt: Date
  lastActivity: Date
  expiresAt: Date
  isActive: boolean
}

// Session management service
class SessionManager {
  private redis: Redis

  async createSession(user: User, deviceInfo: DeviceInfo): Promise<UserSession> {
    const sessionId = generateSecureId()
    const accessToken = await this.generateAccessToken(user, sessionId)
    const refreshToken = await this.generateRefreshToken(user, sessionId)

    const session: UserSession = {
      id: sessionId,
      userId: user.id,
      accessToken,
      refreshToken,
      deviceInfo,
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)), // 30 days
      isActive: true
    }

    // Store session in Redis
    await this.redis.setex(
      `session:${sessionId}`,
      30 * 24 * 60 * 60, // 30 days
      JSON.stringify(session)
    )

    // Track active sessions per user
    await this.redis.sadd(`user:${user.id}:sessions`, sessionId)

    return session
  }

  async validateSession(sessionId: string): Promise<UserSession | null> {
    const sessionData = await this.redis.get(`session:${sessionId}`)
    if (!sessionData) return null

    const session: UserSession = JSON.parse(sessionData)

    // Check if session is expired or inactive
    if (!session.isActive || new Date() > session.expiresAt) {
      await this.revokeSession(sessionId)
      return null
    }

    // Update last activity
    session.lastActivity = new Date()
    await this.redis.setex(
      `session:${sessionId}`,
      30 * 24 * 60 * 60,
      JSON.stringify(session)
    )

    return session
  }

  async revokeSession(sessionId: string): Promise<void> {
    const sessionData = await this.redis.get(`session:${sessionId}`)
    if (sessionData) {
      const session: UserSession = JSON.parse(sessionData)

      // Add tokens to revocation list
      await this.addToRevocationList(session.accessToken)
      await this.addToRevocationList(session.refreshToken)

      // Remove from active sessions
      await this.redis.del(`session:${sessionId}`)
      await this.redis.srem(`user:${session.userId}:sessions`, sessionId)
    }
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const sessionIds = await this.redis.smembers(`user:${userId}:sessions`)

    for (const sessionId of sessionIds) {
      await this.revokeSession(sessionId)
    }
  }
}
```

## 2. Authorization Framework

### 2.1 Role-Based Access Control (RBAC)

```typescript
// Permission enumeration
enum Permission {
  // Document permissions
  DOCUMENT_CREATE = 'document:create',
  DOCUMENT_READ = 'document:read',
  DOCUMENT_UPDATE = 'document:update',
  DOCUMENT_DELETE = 'document:delete',
  DOCUMENT_PUBLISH = 'document:publish',
  DOCUMENT_ARCHIVE = 'document:archive',

  // Collection permissions
  COLLECTION_CREATE = 'collection:create',
  COLLECTION_READ = 'collection:read',
  COLLECTION_UPDATE = 'collection:update',
  COLLECTION_DELETE = 'collection:delete',
  COLLECTION_MANAGE = 'collection:manage',

  // Collaboration permissions
  COLLABORATION_JOIN = 'collaboration:join',
  COLLABORATION_COMMENT = 'collaboration:comment',
  COLLABORATION_SUGGEST = 'collaboration:suggest',
  COLLABORATION_MODERATE = 'collaboration:moderate',

  // Workspace permissions
  WORKSPACE_READ = 'workspace:read',
  WORKSPACE_UPDATE = 'workspace:update',
  WORKSPACE_ADMIN = 'workspace:admin',
  WORKSPACE_INVITE = 'workspace:invite',
  WORKSPACE_REMOVE_MEMBER = 'workspace:remove_member',

  // AI permissions
  AI_SUMMARIZE = 'ai:summarize',
  AI_IMPROVE = 'ai:improve',
  AI_TRANSLATE = 'ai:translate',
  AI_ANALYZE = 'ai:analyze',

  // Analytics permissions
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_EXPORT = 'analytics:export',
  ANALYTICS_ADMIN = 'analytics:admin',

  // System permissions
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_MONITOR = 'system:monitor'
}

// Role definitions with hierarchical inheritance
enum UserRole {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  CONTRIBUTOR = 'CONTRIBUTOR',
  VIEWER = 'VIEWER'
}

// Role permission mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // All permissions
    ...Object.values(Permission)
  ],

  [UserRole.EDITOR]: [
    // Document permissions
    Permission.DOCUMENT_CREATE,
    Permission.DOCUMENT_READ,
    Permission.DOCUMENT_UPDATE,
    Permission.DOCUMENT_PUBLISH,
    Permission.DOCUMENT_ARCHIVE,

    // Collection permissions
    Permission.COLLECTION_CREATE,
    Permission.COLLECTION_READ,
    Permission.COLLECTION_UPDATE,
    Permission.COLLECTION_MANAGE,

    // Collaboration permissions
    Permission.COLLABORATION_JOIN,
    Permission.COLLABORATION_COMMENT,
    Permission.COLLABORATION_SUGGEST,
    Permission.COLLABORATION_MODERATE,

    // Workspace permissions
    Permission.WORKSPACE_READ,
    Permission.WORKSPACE_UPDATE,
    Permission.WORKSPACE_INVITE,

    // AI permissions
    Permission.AI_SUMMARIZE,
    Permission.AI_IMPROVE,
    Permission.AI_TRANSLATE,
    Permission.AI_ANALYZE,

    // Analytics permissions
    Permission.ANALYTICS_READ,
    Permission.ANALYTICS_EXPORT
  ],

  [UserRole.CONTRIBUTOR]: [
    // Document permissions (limited)
    Permission.DOCUMENT_CREATE,
    Permission.DOCUMENT_READ,
    Permission.DOCUMENT_UPDATE,

    // Collection permissions (read-only)
    Permission.COLLECTION_READ,

    // Collaboration permissions
    Permission.COLLABORATION_JOIN,
    Permission.COLLABORATION_COMMENT,
    Permission.COLLABORATION_SUGGEST,

    // Workspace permissions (read-only)
    Permission.WORKSPACE_READ,

    // AI permissions (basic)
    Permission.AI_SUMMARIZE,
    Permission.AI_IMPROVE,

    // Analytics permissions (read-only)
    Permission.ANALYTICS_READ
  ],

  [UserRole.VIEWER]: [
    // Document permissions (read-only)
    Permission.DOCUMENT_READ,

    // Collection permissions (read-only)
    Permission.COLLECTION_READ,

    // Collaboration permissions (limited)
    Permission.COLLABORATION_JOIN,
    Permission.COLLABORATION_COMMENT,

    // Workspace permissions (read-only)
    Permission.WORKSPACE_READ,

    // AI permissions (basic)
    Permission.AI_SUMMARIZE,

    // Analytics permissions (read-only)
    Permission.ANALYTICS_READ
  ]
}
```

### 2.2 Resource-Level Authorization

```typescript
// Resource-based authorization
interface ResourcePermission {
  resourceType: string
  resourceId: string
  userId: string
  permissions: Permission[]
  grantedBy: string
  grantedAt: Date
  expiresAt?: Date
}

// Authorization service
class AuthorizationService {
  private db: Database
  private cache: Redis

  async hasPermission(
    user: User,
    permission: Permission,
    resource?: ResourceContext
  ): Promise<boolean> {
    // Check if user is active
    if (!user.isActive) return false

    // Check role-based permissions
    const rolePermissions = ROLE_PERMISSIONS[user.role]
    if (rolePermissions.includes(permission)) {
      return true
    }

    // Check resource-specific permissions
    if (resource) {
      const resourcePerms = await this.getResourcePermissions(
        user.id,
        resource.type,
        resource.id
      )

      if (resourcePerms.some(p => p.permissions.includes(permission))) {
        return true
      }
    }

    return false
  }

  async authorizeDocument(
    userId: string,
    documentId: string,
    action: Permission
  ): Promise<AuthorizationResult> {
    const cacheKey = `auth:${userId}:${documentId}:${action}`

    // Check cache first
    const cached = await this.cache.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }

    try {
      // Get user and document
      const [user, document] = await Promise.all([
        this.getUserById(userId),
        this.getDocumentById(documentId)
      ])

      if (!user || !document) {
        return { authorized: false, reason: 'USER_OR_DOCUMENT_NOT_FOUND' }
      }

      // Check workspace membership
      const workspaceMember = await this.getWorkspaceMembership(
        userId,
        document.collection.workspaceId
      )

      if (!workspaceMember) {
        return { authorized: false, reason: 'NOT_WORKSPACE_MEMBER' }
      }

      // Check permissions
      const hasPermission = await this.hasPermission(user, action, {
        type: 'document',
        id: documentId,
        workspaceId: document.collection.workspaceId
      })

      const result: AuthorizationResult = {
        authorized: hasPermission,
        reason: hasPermission ? 'AUTHORIZED' : 'INSUFFICIENT_PERMISSIONS',
        context: {
          user: { id: user.id, role: user.role },
          resource: { id: documentId, type: 'document' },
          workspace: { id: document.collection.workspaceId }
        }
      }

      // Cache result for 5 minutes
      await this.cache.setex(cacheKey, 300, JSON.stringify(result))

      return result

    } catch (error) {
      console.error('Authorization error:', error)
      return { authorized: false, reason: 'AUTHORIZATION_ERROR' }
    }
  }

  async checkWorkspaceAccess(
    userId: string,
    workspaceId: string,
    requiredRole?: UserRole
  ): Promise<boolean> {
    const membership = await this.getWorkspaceMembership(userId, workspaceId)

    if (!membership) return false
    if (!requiredRole) return true

    // Check role hierarchy
    const roleHierarchy = {
      [UserRole.ADMIN]: 4,
      [UserRole.EDITOR]: 3,
      [UserRole.CONTRIBUTOR]: 2,
      [UserRole.VIEWER]: 1
    }

    return roleHierarchy[membership.role] >= roleHierarchy[requiredRole]
  }
}
```

## 3. Security Implementation

### 3.1 Password Security

```typescript
// Password hashing and validation
class PasswordSecurity {
  private saltRounds = 12

  async hashPassword(plainPassword: string): Promise<string> {
    // Validate password strength
    this.validatePasswordStrength(plainPassword)

    // Hash with bcrypt
    const salt = await bcrypt.genSalt(this.saltRounds)
    return bcrypt.hash(plainPassword, salt)
  }

  async verifyPassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword)
  }

  private validatePasswordStrength(password: string): void {
    const minLength = 8
    const requirements = {
      length: password.length >= minLength,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }

    const score = Object.values(requirements).filter(Boolean).length

    if (score < 4) {
      throw new Error('Password does not meet security requirements')
    }

    // Check against common passwords
    if (this.isCommonPassword(password)) {
      throw new Error('Password is too common')
    }
  }

  private isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', '1234567890', 'abc123'
    ]

    return commonPasswords.includes(password.toLowerCase())
  }
}
```

### 3.2 Multi-Factor Authentication (MFA)

```typescript
// MFA implementation
class MFAService {
  async setupMFA(userId: string): Promise<MFASetup> {
    const user = await this.getUserById(userId)
    const secret = authenticator.generateSecret()

    // Generate QR code
    const qrCodeUrl = authenticator.keyuri(
      user.email,
      'Knowledge Network',
      secret
    )

    const qrCode = await QRCode.toDataURL(qrCodeUrl)

    // Store temporary secret
    await this.redis.setex(
      `mfa:setup:${userId}`,
      600, // 10 minutes
      secret
    )

    return {
      secret,
      qrCode,
      manualEntryKey: secret
    }
  }

  async verifyMFASetup(
    userId: string,
    token: string
  ): Promise<boolean> {
    const secret = await this.redis.get(`mfa:setup:${userId}`)
    if (!secret) return false

    const isValid = authenticator.verify({
      token,
      secret,
      window: 1 // Allow 1 step tolerance
    })

    if (isValid) {
      // Save MFA secret to database
      await this.saveMFASecret(userId, secret)
      await this.redis.del(`mfa:setup:${userId}`)
    }

    return isValid
  }

  async verifyMFA(userId: string, token: string): Promise<boolean> {
    const user = await this.getUserById(userId)
    if (!user.mfaSecret) return false

    return authenticator.verify({
      token,
      secret: user.mfaSecret,
      window: 1
    })
  }

  async generateBackupCodes(userId: string): Promise<string[]> {
    const codes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    )

    // Hash and store backup codes
    const hashedCodes = await Promise.all(
      codes.map(code => bcrypt.hash(code, 10))
    )

    await this.saveBackupCodes(userId, hashedCodes)

    return codes
  }
}
```

### 3.3 Security Headers and CSRF Protection

```typescript
// Security middleware
class SecurityMiddleware {
  // CSRF protection
  async csrfProtection(req: Request, res: Response, next: NextFunction) {
    // Skip CSRF for GET requests
    if (req.method === 'GET') return next()

    // Skip CSRF for API keys
    if (req.headers['x-api-key']) return next()

    const token = req.headers['x-csrf-token'] || req.body._csrf
    const sessionToken = req.session?.csrfToken

    if (!token || !sessionToken || token !== sessionToken) {
      return res.status(403).json({ error: 'Invalid CSRF token' })
    }

    next()
  }

  // Rate limiting by user and IP
  async rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    const userId = req.user?.id
    const ip = req.ip
    const endpoint = req.path

    // Check user-based limits
    if (userId) {
      const userLimit = await this.checkUserRateLimit(userId, endpoint)
      if (!userLimit.allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          resetTime: userLimit.resetTime
        })
      }
    }

    // Check IP-based limits
    const ipLimit = await this.checkIPRateLimit(ip, endpoint)
    if (!ipLimit.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        resetTime: ipLimit.resetTime
      })
    }

    next()
  }

  // Security headers
  securityHeaders(req: Request, res: Response, next: NextFunction) {
    // Content Security Policy
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' wss: https:; " +
      "font-src 'self'; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'"
    )

    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    res.setHeader('Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('Permissions-Policy',
      'camera=(), microphone=(), geolocation=()')

    next()
  }
}
```

## 4. OAuth & SSO Integration

### 4.1 OAuth Provider Integration

```typescript
// OAuth configuration
interface OAuthProvider {
  name: string
  clientId: string
  clientSecret: string
  redirectUri: string
  scope: string[]
  authorizationUrl: string
  tokenUrl: string
  userInfoUrl: string
}

// OAuth service
class OAuthService {
  private providers = new Map<string, OAuthProvider>()

  constructor() {
    this.setupProviders()
  }

  private setupProviders() {
    // Google OAuth
    this.providers.set('google', {
      name: 'Google',
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: `${process.env.BASE_URL}/auth/google/callback`,
      scope: ['openid', 'profile', 'email'],
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo'
    })

    // Microsoft OAuth
    this.providers.set('microsoft', {
      name: 'Microsoft',
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      redirectUri: `${process.env.BASE_URL}/auth/microsoft/callback`,
      scope: ['openid', 'profile', 'email'],
      authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me'
    })
  }

  async initiateOAuth(provider: string, state?: string): Promise<string> {
    const config = this.providers.get(provider)
    if (!config) {
      throw new Error(`Unknown OAuth provider: ${provider}`)
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scope.join(' '),
      response_type: 'code',
      state: state || crypto.randomBytes(32).toString('hex'),
      prompt: 'consent'
    })

    return `${config.authorizationUrl}?${params.toString()}`
  }

  async handleCallback(
    provider: string,
    code: string,
    state: string
  ): Promise<AuthResponse> {
    const config = this.providers.get(provider)
    if (!config) {
      throw new Error(`Unknown OAuth provider: ${provider}`)
    }

    // Exchange code for tokens
    const tokenResponse = await this.exchangeCodeForToken(config, code)

    // Get user info
    const userInfo = await this.getUserInfo(config, tokenResponse.access_token)

    // Find or create user
    let user = await this.findUserByEmail(userInfo.email)

    if (!user) {
      user = await this.createUserFromOAuth(userInfo, provider)
    } else {
      // Link OAuth account if not already linked
      await this.linkOAuthAccount(user.id, provider, userInfo)
    }

    // Generate our tokens
    const session = await this.sessionManager.createSession(user, {
      userAgent: 'OAuth',
      ip: '127.0.0.1', // Would be actual IP
      fingerprint: 'oauth',
      platform: provider,
      browser: 'oauth'
    })

    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user,
      expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)) // 24 hours
    }
  }
}
```

### 4.2 SAML Integration

```typescript
// SAML configuration
interface SAMLConfig {
  entityId: string
  singleSignOnServiceUrl: string
  singleLogoutServiceUrl: string
  certificate: string
  attributeMap: Record<string, string>
}

// SAML service
class SAMLService {
  private saml: SAML

  constructor(config: SAMLConfig) {
    this.saml = new SAML({
      entryPoint: config.singleSignOnServiceUrl,
      issuer: config.entityId,
      cert: config.certificate,
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
    })
  }

  async initiateSSO(workspaceId: string): Promise<string> {
    const relayState = Buffer.from(JSON.stringify({
      workspaceId,
      timestamp: Date.now()
    })).toString('base64')

    return new Promise((resolve, reject) => {
      this.saml.getAuthorizeUrl(relayState, (err, loginUrl) => {
        if (err) reject(err)
        else resolve(loginUrl!)
      })
    })
  }

  async handleCallback(
    samlResponse: string,
    relayState: string
  ): Promise<AuthResponse> {
    const profile = await new Promise<any>((resolve, reject) => {
      this.saml.validatePostResponse(samlResponse, (err, profile) => {
        if (err) reject(err)
        else resolve(profile)
      })
    })

    // Decode relay state
    const state = JSON.parse(Buffer.from(relayState, 'base64').toString())

    // Extract user attributes
    const userAttributes = {
      email: profile.nameID || profile.email,
      firstName: profile.firstName || profile.givenName,
      lastName: profile.lastName || profile.surname,
      displayName: profile.displayName ||
        `${profile.firstName} ${profile.lastName}`.trim()
    }

    // Find or create user
    let user = await this.findUserByEmail(userAttributes.email)

    if (!user) {
      user = await this.createUserFromSAML(userAttributes, state.workspaceId)
    }

    // Add to workspace if not already a member
    await this.ensureWorkspaceMembership(user.id, state.workspaceId)

    // Generate session
    const session = await this.sessionManager.createSession(user, {
      userAgent: 'SAML',
      ip: '127.0.0.1',
      fingerprint: 'saml',
      platform: 'saml',
      browser: 'saml'
    })

    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user,
      expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000))
    }
  }
}
```

## 5. API Security & Token Management

### 5.1 Token Revocation & Blacklisting

```typescript
// Token revocation service
class TokenRevocationService {
  private redis: Redis

  async revokeToken(tokenId: string, reason: string): Promise<void> {
    const expirationTime = await this.getTokenExpiration(tokenId)
    const ttl = Math.max(0, Math.floor((expirationTime - Date.now()) / 1000))

    if (ttl > 0) {
      await this.redis.setex(
        `revoked:${tokenId}`,
        ttl,
        JSON.stringify({
          revokedAt: new Date().toISOString(),
          reason
        })
      )
    }
  }

  async isTokenRevoked(tokenId: string): Promise<boolean> {
    const revocationInfo = await this.redis.get(`revoked:${tokenId}`)
    return revocationInfo !== null
  }

  async revokeAllUserTokens(userId: string, reason: string): Promise<void> {
    // Get all active sessions for user
    const sessionIds = await this.redis.smembers(`user:${userId}:sessions`)

    for (const sessionId of sessionIds) {
      const sessionData = await this.redis.get(`session:${sessionId}`)
      if (sessionData) {
        const session = JSON.parse(sessionData)

        // Extract token IDs from JWT
        const accessTokenId = this.extractTokenId(session.accessToken)
        const refreshTokenId = this.extractTokenId(session.refreshToken)

        // Revoke both tokens
        await this.revokeToken(accessTokenId, reason)
        await this.revokeToken(refreshTokenId, reason)
      }
    }

    // Clear all sessions
    await this.sessionManager.revokeAllUserSessions(userId)
  }

  private extractTokenId(token: string): string {
    const payload = jwt.decode(token) as any
    return payload.jti
  }
}
```

### 5.2 API Key Management

```typescript
// API key management for service-to-service communication
interface APIKey {
  id: string
  name: string
  keyHash: string
  userId: string
  permissions: Permission[]
  rateLimit: {
    requests: number
    window: number // seconds
  }
  createdAt: Date
  lastUsed?: Date
  expiresAt?: Date
  isActive: boolean
}

class APIKeyService {
  async generateAPIKey(
    userId: string,
    name: string,
    permissions: Permission[],
    expiresIn?: number // seconds
  ): Promise<{ key: string; apiKey: APIKey }> {
    const key = `kn_${crypto.randomBytes(32).toString('hex')}`
    const keyHash = await bcrypt.hash(key, 10)

    const apiKey: APIKey = {
      id: generateId(),
      name,
      keyHash,
      userId,
      permissions,
      rateLimit: {
        requests: 1000,
        window: 3600 // 1 hour
      },
      createdAt: new Date(),
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
      isActive: true
    }

    await this.saveAPIKey(apiKey)

    return { key, apiKey }
  }

  async validateAPIKey(key: string): Promise<APIKey | null> {
    if (!key.startsWith('kn_')) return null

    // Get all API keys (in production, you'd want better indexing)
    const apiKeys = await this.getAllAPIKeys()

    for (const apiKey of apiKeys) {
      if (await bcrypt.compare(key, apiKey.keyHash)) {
        // Check if key is active and not expired
        if (!apiKey.isActive ||
           (apiKey.expiresAt && apiKey.expiresAt < new Date())) {
          return null
        }

        // Update last used
        await this.updateLastUsed(apiKey.id)

        return apiKey
      }
    }

    return null
  }

  async revokeAPIKey(keyId: string): Promise<void> {
    await this.updateAPIKey(keyId, { isActive: false })
  }
}
```

## 6. Security Monitoring & Audit

### 6.1 Security Event Logging

```typescript
// Security event types
enum SecurityEventType {
  AUTH_SUCCESS = 'auth.success',
  AUTH_FAILURE = 'auth.failure',
  AUTH_LOCKOUT = 'auth.lockout',
  TOKEN_REVOKED = 'auth.token_revoked',
  PASSWORD_CHANGED = 'auth.password_changed',
  MFA_ENABLED = 'auth.mfa_enabled',
  MFA_DISABLED = 'auth.mfa_disabled',
  SUSPICIOUS_ACTIVITY = 'security.suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'security.rate_limit_exceeded',
  UNAUTHORIZED_ACCESS = 'security.unauthorized_access'
}

// Security event
interface SecurityEvent {
  id: string
  type: SecurityEventType
  userId?: string
  ip: string
  userAgent: string
  details: any
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  timestamp: Date
}

// Security monitoring service
class SecurityMonitor {
  private events: SecurityEvent[] = []

  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      ...event,
      id: generateId(),
      timestamp: new Date()
    }

    // Store event
    await this.storeSecurityEvent(securityEvent)

    // Check for patterns that indicate attacks
    await this.analyzeSecurityPatterns(securityEvent)

    // Send alerts for high severity events
    if (event.severity === 'HIGH' || event.severity === 'CRITICAL') {
      await this.sendSecurityAlert(securityEvent)
    }
  }

  private async analyzeSecurityPatterns(event: SecurityEvent): Promise<void> {
    // Check for brute force attacks
    if (event.type === SecurityEventType.AUTH_FAILURE) {
      await this.checkBruteForcePattern(event)
    }

    // Check for unusual access patterns
    if (event.type === SecurityEventType.UNAUTHORIZED_ACCESS) {
      await this.checkUnusualAccessPattern(event)
    }

    // Check for rate limit violations
    if (event.type === SecurityEventType.RATE_LIMIT_EXCEEDED) {
      await this.checkRateLimitPattern(event)
    }
  }

  private async checkBruteForcePattern(event: SecurityEvent): Promise<void> {
    const recentFailures = await this.getRecentEventsByIP(
      event.ip,
      SecurityEventType.AUTH_FAILURE,
      300 // 5 minutes
    )

    if (recentFailures.length >= 5) {
      await this.logSecurityEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        ip: event.ip,
        userAgent: event.userAgent,
        details: {
          pattern: 'brute_force',
          failureCount: recentFailures.length,
          timeWindow: '5 minutes'
        },
        severity: 'HIGH'
      })

      // Temporarily block IP
      await this.blockIP(event.ip, 3600) // 1 hour
    }
  }
}
```

This authentication flow specification provides:

1. **Comprehensive JWT-based authentication** with secure token management
2. **Multi-layered authorization** with RBAC and resource-level permissions
3. **Advanced security features** including MFA, CSRF protection, and rate limiting
4. **OAuth and SAML integration** for enterprise SSO requirements
5. **API key management** for service-to-service authentication
6. **Security monitoring and audit logging** for threat detection
7. **Token revocation and session management** for secure logout and cleanup

The system is designed to handle enterprise-grade security requirements while maintaining performance and usability standards for the Knowledge Network application.

Key files created:
- `/Users/jokkeruokolainen/Documents/Solita/GenAI/IDE/ouroboros-demo/authentication-flow-spec.md`