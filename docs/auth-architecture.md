# Authentication & Authorization Architecture - Knowledge Network

## Overview

This document outlines the comprehensive authentication and authorization architecture for the Knowledge Network application, implementing JWT-based authentication with fine-grained Role-Based Access Control (RBAC) and supporting multi-workspace scenarios.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
│                 (React Application)                             │
└─────────────────────┬───────────────────────────────────────────┘
                      │ JWT Token + GraphQL Request
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                   API Gateway                                   │
│              (Authentication Middleware)                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Validated Request + User Context
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                 Auth Service                                    │
│         (JWT Management + RBAC Engine)                         │
└─────┬───────────────┬───────────────────┬─────────────────────────┘
      │               │                   │
┌─────▼──┐      ┌─────▼──┐          ┌─────▼──┐
│PostgreSQL│    │  Redis │          │  LDAP  │
│(Users)  │    │(Sessions)│         │(SSO)   │
└─────────┘    └────────┘          └────────┘
```

## Core Components

### 1. JWT Authentication Service

```typescript
// JWT Service Implementation
@Injectable()
export class JWTService {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor(
    private configService: ConfigService,
    private userService: UserService,
    private sessionService: SessionService
  ) {
    this.accessTokenSecret = this.configService.get('JWT_SECRET')!;
    this.refreshTokenSecret = this.configService.get('JWT_REFRESH_SECRET')!;
    this.accessTokenExpiry = this.configService.get('JWT_EXPIRES_IN', '15m');
    this.refreshTokenExpiry = this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  async generateTokenPair(user: User, sessionData?: Partial<SessionData>): Promise<TokenPair> {
    // Create session
    const sessionId = generateSecureId();
    const session = await this.sessionService.createSession(sessionId, {
      userId: user.id,
      workspaceId: sessionData?.workspaceId,
      permissions: await this.getUserPermissions(user.id, sessionData?.workspaceId),
      deviceInfo: sessionData?.deviceInfo,
      ipAddress: sessionData?.ipAddress
    });

    // Generate access token
    const accessTokenPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      sessionId,
      workspaceId: sessionData?.workspaceId,
      roles: await this.getUserRoles(user.id, sessionData?.workspaceId),
      permissions: session.permissions,
      type: 'access'
    };

    const accessToken = jwt.sign(accessTokenPayload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'knowledge-network',
      audience: 'knowledge-network-api'
    });

    // Generate refresh token
    const refreshTokenPayload: RefreshTokenPayload = {
      sub: user.id,
      sessionId,
      type: 'refresh'
    };

    const refreshToken = jwt.sign(refreshTokenPayload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'knowledge-network',
      audience: 'knowledge-network-api'
    });

    // Store refresh token hash in database
    await this.storeRefreshToken(user.id, sessionId, refreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getExpirySeconds(this.accessTokenExpiry),
      tokenType: 'Bearer'
    };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'knowledge-network',
        audience: 'knowledge-network-api'
      }) as AccessTokenPayload;

      // Verify session is still active
      const session = await this.sessionService.getSession(payload.sessionId);
      if (!session || !session.isActive) {
        throw new UnauthorizedException('Session expired or invalid');
      }

      // Update session last accessed time
      await this.sessionService.updateLastAccessed(payload.sessionId);

      return payload;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }
      throw error;
    }
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = jwt.verify(refreshToken, this.refreshTokenSecret) as RefreshTokenPayload;

      // Verify refresh token exists and is valid
      const storedToken = await this.getStoredRefreshToken(payload.sub, payload.sessionId);
      if (!storedToken || !this.compareTokens(refreshToken, storedToken.hash)) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Get user and session data
      const [user, session] = await Promise.all([
        this.userService.findById(payload.sub),
        this.sessionService.getSession(payload.sessionId)
      ]);

      if (!user || !session) {
        throw new UnauthorizedException('User or session not found');
      }

      // Generate new token pair
      return this.generateTokenPair(user, {
        workspaceId: session.workspaceId,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      throw error;
    }
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    // Invalidate all user sessions
    await this.sessionService.destroyAllUserSessions(userId);

    // Remove all refresh tokens
    await this.removeAllRefreshTokens(userId);
  }

  async revokeToken(sessionId: string): Promise<void> {
    await this.sessionService.destroySession(sessionId);
    await this.removeRefreshToken(sessionId);
  }

  private async getUserRoles(userId: string, workspaceId?: string): Promise<string[]> {
    if (!workspaceId) {
      return ['user']; // Default global role
    }

    const userRoles = await this.roleService.getUserRoles(userId, workspaceId);
    return userRoles.map(role => role.name);
  }

  private async getUserPermissions(userId: string, workspaceId?: string): Promise<Permission[]> {
    const roles = await this.roleService.getUserRoles(userId, workspaceId);
    const permissions: Permission[] = [];

    for (const role of roles) {
      permissions.push(...role.permissions);
    }

    // Remove duplicates
    return Array.from(new Map(permissions.map(p => [p.resource + p.action, p])).values());
  }
}
```

### 2. Role-Based Access Control (RBAC)

```typescript
// RBAC Service Implementation
@Injectable()
export class RBACService {
  constructor(
    private roleRepository: RoleRepository,
    private userWorkspaceRoleRepository: UserWorkspaceRoleRepository,
    private cacheService: CacheService
  ) {}

  async checkPermission(
    userId: string,
    resource: string,
    action: string,
    workspaceId?: string,
    resourceId?: string
  ): Promise<PermissionResult> {
    // Get user permissions from cache or database
    const permissions = await this.getUserPermissions(userId, workspaceId);

    // Check direct permission
    const hasDirectPermission = this.hasDirectPermission(permissions, resource, action);

    if (hasDirectPermission) {
      return { granted: true, reason: 'direct_permission' };
    }

    // Check resource-specific permissions
    if (resourceId) {
      const hasResourcePermission = await this.checkResourcePermission(
        userId,
        resource,
        action,
        resourceId,
        workspaceId
      );

      if (hasResourcePermission) {
        return { granted: true, reason: 'resource_permission' };
      }
    }

    // Check contextual permissions (e.g., author of knowledge)
    const hasContextualPermission = await this.checkContextualPermission(
      userId,
      resource,
      action,
      resourceId,
      workspaceId
    );

    if (hasContextualPermission) {
      return { granted: true, reason: 'contextual_permission' };
    }

    return { granted: false, reason: 'no_permission' };
  }

  private hasDirectPermission(
    permissions: Permission[],
    resource: string,
    action: string
  ): boolean {
    return permissions.some(permission =>
      (permission.resource === '*' || permission.resource === resource) &&
      (permission.action === '*' || permission.action === action)
    );
  }

  private async checkResourcePermission(
    userId: string,
    resource: string,
    action: string,
    resourceId: string,
    workspaceId?: string
  ): Promise<boolean> {
    // Check if user has specific permissions on this resource
    const resourcePermissions = await this.getResourcePermissions(resourceId, userId);

    return resourcePermissions.some(permission =>
      permission.resource === resource && permission.action === action
    );
  }

  private async checkContextualPermission(
    userId: string,
    resource: string,
    action: string,
    resourceId?: string,
    workspaceId?: string
  ): Promise<boolean> {
    // Author permissions - users can always edit their own content
    if (resource === 'knowledge' && (action === 'update' || action === 'delete') && resourceId) {
      const knowledge = await this.knowledgeRepository.findById(resourceId);
      return knowledge?.authorId === userId;
    }

    // Workspace member permissions
    if (workspaceId) {
      const isMember = await this.isWorkspaceMember(userId, workspaceId);
      return isMember && this.getDefaultMemberPermissions().some(p =>
        p.resource === resource && p.action === action
      );
    }

    return false;
  }

  async getUserRoles(userId: string, workspaceId?: string): Promise<Role[]> {
    const cacheKey = `user_roles:${userId}:${workspaceId || 'global'}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Query database
    let roles: Role[];

    if (workspaceId) {
      const userWorkspaceRoles = await this.userWorkspaceRoleRepository.findMany({
        where: { userId, workspaceId },
        include: { role: true }
      });
      roles = userWorkspaceRoles.map(uwr => uwr.role);
    } else {
      // Global roles
      roles = await this.roleRepository.findByUser(userId);
    }

    // Cache for 15 minutes
    await this.cacheService.set(cacheKey, JSON.stringify(roles), 900);

    return roles;
  }

  async assignRole(userId: string, roleId: string, workspaceId: string): Promise<void> {
    // Verify role exists
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Verify workspace
    if (role.workspaceId !== workspaceId) {
      throw new BadRequestException('Role does not belong to workspace');
    }

    // Assign role
    await this.userWorkspaceRoleRepository.create({
      userId,
      workspaceId,
      roleId,
      grantedAt: new Date()
    });

    // Invalidate cache
    await this.invalidateUserPermissionCache(userId, workspaceId);
  }

  async removeRole(userId: string, roleId: string, workspaceId: string): Promise<void> {
    await this.userWorkspaceRoleRepository.delete({
      userId,
      workspaceId,
      roleId
    });

    // Invalidate cache
    await this.invalidateUserPermissionCache(userId, workspaceId);
  }

  async createRole(workspaceId: string, roleData: CreateRoleData): Promise<Role> {
    // Validate permissions
    this.validatePermissions(roleData.permissions);

    const role = await this.roleRepository.create({
      ...roleData,
      workspaceId,
      isSystemRole: false
    });

    return role;
  }

  async updateRole(roleId: string, updateData: UpdateRoleData): Promise<Role> {
    if (updateData.permissions) {
      this.validatePermissions(updateData.permissions);
    }

    const role = await this.roleRepository.update(roleId, updateData);

    // Invalidate all affected user caches
    await this.invalidateRoleCache(roleId);

    return role;
  }

  private validatePermissions(permissions: Permission[]): void {
    const validResources = [
      'knowledge', 'workspace', 'user', 'tag', 'collection',
      'comment', 'search', 'analytics', 'integration'
    ];

    const validActions = ['create', 'read', 'update', 'delete', 'share', 'comment', 'admin'];

    for (const permission of permissions) {
      if (permission.resource !== '*' && !validResources.includes(permission.resource)) {
        throw new BadRequestException(`Invalid resource: ${permission.resource}`);
      }

      if (permission.action !== '*' && !validActions.includes(permission.action)) {
        throw new BadRequestException(`Invalid action: ${permission.action}`);
      }
    }
  }

  private async invalidateUserPermissionCache(userId: string, workspaceId?: string): Promise<void> {
    const pattern = `user_*:${userId}:${workspaceId || '*'}`;
    await this.cacheService.invalidatePattern(pattern);
  }
}
```

### 3. Authentication Middleware

```typescript
// GraphQL Authentication Guard
@Injectable()
export class GraphQLAuthGuard implements CanActivate {
  constructor(
    private jwtService: JWTService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlContext = GqlExecutionContext.create(context);
    const request = gqlContext.getContext().req;

    // Check if route requires authentication
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    // Extract token
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Verify token
      const payload = await this.jwtService.verifyAccessToken(token);

      // Add user to request context
      request.user = {
        id: payload.sub,
        email: payload.email,
        sessionId: payload.sessionId,
        workspaceId: payload.workspaceId,
        roles: payload.roles,
        permissions: payload.permissions
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

// Permission Guard for GraphQL
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private rbacService: RBACService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<Permission[]>('permissions', context.getHandler());

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const gqlContext = GqlExecutionContext.create(context);
    const request = gqlContext.getContext().req;
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Check each required permission
    for (const permission of requiredPermissions) {
      const result = await this.rbacService.checkPermission(
        user.id,
        permission.resource,
        permission.action,
        user.workspaceId,
        permission.resourceId
      );

      if (!result.granted) {
        throw new ForbiddenException(
          `Insufficient permissions: ${permission.resource}:${permission.action}`
        );
      }
    }

    return true;
  }
}
```

### 4. Authentication Decorators

```typescript
// Authentication Decorators
export const Public = () => SetMetadata('isPublic', true);

export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata('permissions', permissions);

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): AuthenticatedUser => {
    if (context.getType() === 'http') {
      return context.switchToHttp().getRequest().user;
    }

    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req.user;
  }
);

export const WorkspaceId = createParamDecorator(
  (data: unknown, context: ExecutionContext): string | undefined => {
    if (context.getType() === 'http') {
      return context.switchToHttp().getRequest().user?.workspaceId;
    }

    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req.user?.workspaceId;
  }
);

// Usage in resolvers
@Resolver(() => Knowledge)
export class KnowledgeResolver {
  @Query(() => [Knowledge])
  @RequirePermissions({ resource: 'knowledge', action: 'read' })
  async getKnowledge(
    @Args('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<Knowledge[]> {
    return this.knowledgeService.findByWorkspace(workspaceId);
  }

  @Mutation(() => Knowledge)
  @RequirePermissions({ resource: 'knowledge', action: 'create' })
  async createKnowledge(
    @Args('input') input: CreateKnowledgeInput,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<Knowledge> {
    return this.knowledgeService.create(input, user.id);
  }

  @Mutation(() => Knowledge)
  @RequirePermissions({ resource: 'knowledge', action: 'update' })
  async updateKnowledge(
    @Args('id') id: string,
    @Args('input') input: UpdateKnowledgeInput,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<Knowledge> {
    return this.knowledgeService.update(id, input, user.id);
  }
}
```

### 5. Multi-Workspace Context

```typescript
// Workspace Context Service
@Injectable()
export class WorkspaceContextService {
  constructor(
    private workspaceRepository: WorkspaceRepository,
    private userWorkspaceRoleRepository: UserWorkspaceRoleRepository
  ) {}

  async switchWorkspace(userId: string, workspaceId: string): Promise<WorkspaceContext> {
    // Verify user has access to workspace
    const hasAccess = await this.userWorkspaceRoleRepository.exists({
      userId,
      workspaceId
    });

    if (!hasAccess) {
      throw new ForbiddenException('Access denied to workspace');
    }

    // Get workspace details
    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace || !workspace.isActive) {
      throw new NotFoundException('Workspace not found or inactive');
    }

    // Get user roles in workspace
    const roles = await this.rbacService.getUserRoles(userId, workspaceId);

    return {
      workspace,
      roles,
      permissions: this.extractPermissions(roles)
    };
  }

  async getUserWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
    const userWorkspaceRoles = await this.userWorkspaceRoleRepository.findMany({
      where: { userId },
      include: {
        workspace: true,
        role: true
      }
    });

    return userWorkspaceRoles.map(uwr => ({
      id: uwr.workspace.id,
      name: uwr.workspace.name,
      description: uwr.workspace.description,
      role: uwr.role.name,
      lastAccessed: uwr.workspace.updatedAt
    }));
  }

  private extractPermissions(roles: Role[]): Permission[] {
    const permissions: Permission[] = [];

    for (const role of roles) {
      permissions.push(...role.permissions);
    }

    return Array.from(new Map(permissions.map(p => [p.resource + p.action, p])).values());
  }
}
```

### 6. Password Security

```typescript
// Password Service
@Injectable()
export class PasswordService {
  private readonly saltRounds = 12;

  async hashPassword(password: string): Promise<string> {
    // Validate password strength
    this.validatePasswordStrength(password);

    return bcrypt.hash(password, this.saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  validatePasswordStrength(password: string): void {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors: string[] = [];

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (!hasUpperCase) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!hasLowerCase) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!hasNumbers) {
      errors.push('Password must contain at least one number');
    }

    if (!hasSpecialChar) {
      errors.push('Password must contain at least one special character');
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Password validation failed: ${errors.join(', ')}`);
    }
  }

  generateSecurePassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return password;
  }
}
```

### 7. SSO Integration

```typescript
// SAML SSO Service
@Injectable()
export class SAMLSSOService {
  private samlStrategy: Strategy;

  constructor(
    private userService: UserService,
    private jwtService: JWTService,
    private configService: ConfigService
  ) {
    this.initializeSAMLStrategy();
  }

  private initializeSAMLStrategy(): void {
    this.samlStrategy = new Strategy(
      {
        entryPoint: this.configService.get('SAML_ENTRY_POINT'),
        issuer: this.configService.get('SAML_ISSUER'),
        callbackUrl: this.configService.get('SAML_CALLBACK_URL'),
        cert: this.configService.get('SAML_CERT'),
        acceptedClockSkewMs: 60000,
        attributeConsumingServiceIndex: false,
        disableRequestedAuthnContext: true
      },
      async (profile: any, done: Function) => {
        try {
          const user = await this.processSAMLProfile(profile);
          done(null, user);
        } catch (error) {
          done(error, null);
        }
      }
    );
  }

  async processSAMLProfile(profile: any): Promise<User> {
    const email = profile.nameID || profile.email;
    const displayName = profile.displayName || profile.name || email;

    // Find or create user
    let user = await this.userService.findByEmail(email);

    if (!user) {
      user = await this.userService.create({
        email,
        displayName,
        status: UserStatus.ACTIVE,
        // No password hash for SSO users
        authProvider: 'saml'
      });
    } else {
      // Update user info from SSO
      user = await this.userService.update(user.id, {
        displayName,
        lastLoginAt: new Date()
      });
    }

    return user;
  }

  async generateSAMLLoginURL(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.samlStrategy.authenticate({} as any, {
        samlFallback: (context: any, request: any) => {
          resolve(context);
        }
      } as any);
    });
  }
}

// OAuth2 Service (for Google, Microsoft, etc.)
@Injectable()
export class OAuth2Service {
  constructor(
    private userService: UserService,
    private jwtService: JWTService
  ) {}

  async handleGoogleAuth(googleUser: GoogleUser): Promise<TokenPair> {
    let user = await this.userService.findByEmail(googleUser.email);

    if (!user) {
      user = await this.userService.create({
        email: googleUser.email,
        displayName: googleUser.name,
        avatarUrl: googleUser.picture,
        status: UserStatus.ACTIVE,
        authProvider: 'google',
        externalId: googleUser.id
      });
    }

    return this.jwtService.generateTokenPair(user);
  }

  async handleMicrosoftAuth(microsoftUser: MicrosoftUser): Promise<TokenPair> {
    let user = await this.userService.findByEmail(microsoftUser.mail || microsoftUser.userPrincipalName);

    if (!user) {
      user = await this.userService.create({
        email: microsoftUser.mail || microsoftUser.userPrincipalName,
        displayName: microsoftUser.displayName,
        status: UserStatus.ACTIVE,
        authProvider: 'microsoft',
        externalId: microsoftUser.id
      });
    }

    return this.jwtService.generateTokenPair(user);
  }
}
```

### 8. Security Middleware & Rate Limiting

```typescript
// Security Middleware
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Remove server header
    res.removeHeader('X-Powered-By');

    next();
  }
}

// Rate Limiting Service
@Injectable()
export class RateLimitingService {
  private limiter: RateLimiterRedis;

  constructor(private redis: Redis) {
    this.limiter = new RateLimiterRedis({
      storeClient: redis,
      keyGenerator: (req: Request) => this.generateKey(req),
      points: 100, // Number of requests
      duration: 60, // Per 60 seconds
      blockDuration: 60, // Block for 60 seconds if limit exceeded
    });
  }

  async checkRateLimit(req: Request): Promise<void> {
    try {
      await this.limiter.consume(req.ip);
    } catch (rejRes) {
      const remainingPoints = rejRes.remainingPoints;
      const msBeforeNext = rejRes.msBeforeNext;

      throw new TooManyRequestsException(
        `Rate limit exceeded. Try again in ${Math.round(msBeforeNext / 1000)} seconds.`
      );
    }
  }

  private generateKey(req: Request): string {
    // Different limits for different types of requests
    if (req.path.includes('/auth/login')) {
      return `login:${req.ip}`;
    }

    if (req.path.includes('/graphql')) {
      const user = req.user;
      return user ? `api:user:${user.id}` : `api:ip:${req.ip}`;
    }

    return `general:${req.ip}`;
  }
}
```

### 9. Audit Logging

```typescript
// Audit Service
@Injectable()
export class AuditService {
  constructor(
    private auditRepository: AuditLogRepository,
    private configService: ConfigService
  ) {}

  async logAuthenticationEvent(event: AuthenticationEvent): Promise<void> {
    await this.auditRepository.create({
      eventType: 'AUTHENTICATION',
      action: event.action, // 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'TOKEN_REFRESH'
      userId: event.userId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      details: {
        success: event.success,
        reason: event.reason,
        sessionId: event.sessionId
      },
      timestamp: new Date()
    });
  }

  async logAuthorizationEvent(event: AuthorizationEvent): Promise<void> {
    await this.auditRepository.create({
      eventType: 'AUTHORIZATION',
      action: event.action, // 'PERMISSION_CHECK', 'ACCESS_DENIED', 'ROLE_ASSIGNED'
      userId: event.userId,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      details: {
        permission: event.permission,
        granted: event.granted,
        reason: event.reason
      },
      timestamp: new Date()
    });
  }

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    await this.auditRepository.create({
      eventType: 'SECURITY',
      action: event.action, // 'SUSPICIOUS_ACTIVITY', 'RATE_LIMIT_EXCEEDED', 'INVALID_TOKEN'
      userId: event.userId,
      ipAddress: event.ipAddress,
      severity: event.severity, // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
      details: event.details,
      timestamp: new Date()
    });

    // Alert on high severity events
    if (event.severity === 'HIGH' || event.severity === 'CRITICAL') {
      await this.sendSecurityAlert(event);
    }
  }

  private async sendSecurityAlert(event: SecurityEvent): Promise<void> {
    // Implementation for sending alerts to security team
    // Could be email, Slack, PagerDuty, etc.
  }
}
```

### 10. Configuration & Environment

```typescript
// Auth Configuration
export interface AuthConfig {
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  bcryptRounds: number;
  sessionTTL: number;
  maxFailedLoginAttempts: number;
  lockoutDurationMinutes: number;
  enableSSO: boolean;
  ssoProviders: SSOProvider[];
  passwordPolicy: PasswordPolicy;
}

export const authConfig = (): AuthConfig => ({
  jwtSecret: process.env.JWT_SECRET!,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
  sessionTTL: parseInt(process.env.SESSION_TTL || '86400'), // 24 hours
  maxFailedLoginAttempts: parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS || '5'),
  lockoutDurationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '30'),
  enableSSO: process.env.ENABLE_SSO === 'true',
  ssoProviders: JSON.parse(process.env.SSO_PROVIDERS || '[]'),
  passwordPolicy: {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
    requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
    requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
    requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL_CHARS !== 'false'
  }
});
```

## Security Best Practices

### 1. Token Security
- Short-lived access tokens (15 minutes)
- Secure refresh token rotation
- Blacklisting of compromised tokens
- Secure token storage in HTTP-only cookies

### 2. Password Security
- Strong password policies
- Bcrypt with high salt rounds (12+)
- Protection against timing attacks
- Password history prevention

### 3. Session Management
- Secure session IDs
- Session invalidation on logout
- Concurrent session limits
- Session timeout handling

### 4. Rate Limiting
- API endpoint protection
- Login attempt limiting
- Progressive delays for repeated failures
- IP-based and user-based limits

### 5. Audit & Monitoring
- Comprehensive authentication logging
- Real-time security event monitoring
- Anomaly detection for suspicious activities
- Regular security audits

This authentication and authorization architecture provides a robust, scalable, and secure foundation for the Knowledge Network application, supporting multiple authentication methods, fine-grained permissions, and comprehensive security monitoring.