// Authentication & Authorization System
// Main entry point for the Knowledge Network authentication system

export { jwtService, type AccessTokenPayload, type RefreshTokenPayload, type TokenPair, type Permission, type User } from './jwt.service';
export { rbacService, type Role, type PermissionCheck, type PermissionResult } from './rbac.service';
export { sessionService, type Session, type CreateSessionData, type SessionActivity } from './session.service';
export { ssoService, type SSOProvider, type SSOUser, type GoogleUser, type MicrosoftUser } from './sso.service';
export {
  authenticateRequest,
  authorizeRequest,
  rateLimit,
  securityHeaders,
  corsMiddleware,
  validateApiKey,
  sanitizeInput,
  createSecurityMiddleware,
  securityAudit,
  type AuthenticatedRequest,
  type SecurityConfig,
  type SecurityEvent
} from './middleware';

import { jwtService } from './jwt.service';
import { rbacService } from './rbac.service';
import { sessionService } from './session.service';
import { ssoService } from './sso.service';
import type { User, Permission, CreateSessionData } from './jwt.service';

/**
 * Main Authentication Service
 * Orchestrates all authentication and authorization operations
 */
export class AuthService {
  private static instance: AuthService;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Authenticate user with email and password
   */
  async login(email: string, password: string, sessionData?: Partial<CreateSessionData>): Promise<{
    success: boolean;
    tokens?: { accessToken: string; refreshToken: string; expiresIn: number };
    user?: User;
    error?: string;
  }> {
    try {
      // TODO: Implement user lookup and password verification
      // const user = await userService.findByEmail(email);
      // if (!user || !await jwtService.verifyPassword(password, user.passwordHash)) {
      //   return { success: false, error: 'Invalid credentials' };
      // }

      // Mock user for demonstration
      const user: User = {
        id: 'user_123',
        email,
        displayName: 'Demo User',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Create session
      const session = await sessionService.createSession({
        userId: user.id,
        ...sessionData
      });

      // Generate tokens
      const tokens = await jwtService.generateTokenPair(user, {
        workspaceId: sessionData?.workspaceId,
        deviceInfo: sessionData?.deviceInfo,
        ipAddress: sessionData?.ipAddress
      });

      return {
        success: true,
        tokens,
        user
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    }
  }

  /**
   * Logout user and invalidate session
   */
  async logout(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await sessionService.destroySession(sessionId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed'
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{
    success: boolean;
    tokens?: { accessToken: string; refreshToken: string; expiresIn: number };
    error?: string;
  }> {
    try {
      const tokens = await jwtService.refreshTokens(refreshToken);
      return { success: true, tokens };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed'
      };
    }
  }

  /**
   * Register new user
   */
  async register(userData: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<{
    success: boolean;
    user?: User;
    error?: string;
  }> {
    try {
      // Validate password strength
      const passwordValidation = jwtService.validatePasswordStrength(userData.password);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: `Password validation failed: ${passwordValidation.errors.join(', ')}`
        };
      }

      // Hash password
      const passwordHash = await jwtService.hashPassword(userData.password);

      // TODO: Create user in database
      const user: User = {
        id: `user_${Date.now()}`,
        email: userData.email,
        displayName: userData.displayName,
        passwordHash,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // TODO: Get user and verify current password
      // const user = await userService.findById(userId);
      // if (!user || !await jwtService.verifyPassword(currentPassword, user.passwordHash)) {
      //   return { success: false, error: 'Current password is incorrect' };
      // }

      // Validate new password strength
      const passwordValidation = jwtService.validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: `Password validation failed: ${passwordValidation.errors.join(', ')}`
        };
      }

      // Hash new password
      const newPasswordHash = await jwtService.hashPassword(newPassword);

      // TODO: Update user password in database
      // await userService.updatePassword(userId, newPasswordHash);

      // Invalidate all user sessions to force re-login
      await sessionService.destroyAllUserSessions(userId);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password change failed'
      };
    }
  }

  /**
   * Check if user has permission
   */
  async checkPermission(
    userId: string,
    resource: string,
    action: string,
    workspaceId?: string,
    resourceId?: string
  ): Promise<{ granted: boolean; reason?: string }> {
    const result = await rbacService.checkPermission({
      userId,
      resource,
      action,
      workspaceId,
      resourceId
    });

    return {
      granted: result.granted,
      reason: result.reason
    };
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string) {
    return sessionService.getUserSessions(userId);
  }

  /**
   * Get available SSO providers
   */
  getAvailableSSOProviders() {
    return ssoService.getAvailableProviders();
  }

  /**
   * Initialize SSO authentication
   */
  async initiateSSOLogin(providerId: string, returnUrl?: string): Promise<{
    success: boolean;
    loginUrl?: string;
    error?: string;
  }> {
    try {
      const loginUrl = await ssoService.generateLoginURL(providerId, returnUrl);
      return { success: true, loginUrl };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SSO initiation failed'
      };
    }
  }

  /**
   * Process SSO callback
   */
  async processSSOCallback(
    providerId: string,
    callbackData: any,
    sessionData?: Partial<CreateSessionData>
  ): Promise<{
    success: boolean;
    tokens?: { accessToken: string; refreshToken: string; expiresIn: number };
    user?: User;
    error?: string;
  }> {
    try {
      // Process SSO user data
      const ssoUser = await ssoService.processSSOCallback(providerId, callbackData);

      // TODO: Find or create user in database
      const user: User = {
        id: `sso_${ssoUser.id}`,
        email: ssoUser.email,
        displayName: ssoUser.displayName,
        status: 'active',
        authProvider: ssoUser.provider as any,
        externalId: ssoUser.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Create session
      await sessionService.createSession({
        userId: user.id,
        ...sessionData
      });

      // Generate tokens
      const tokens = await jwtService.generateTokenPair(user, sessionData);

      return {
        success: true,
        tokens,
        user
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SSO authentication failed'
      };
    }
  }

  /**
   * Verify token and get user context
   */
  async verifyToken(token: string): Promise<{
    valid: boolean;
    user?: {
      id: string;
      email: string;
      sessionId: string;
      workspaceId?: string;
      roles: string[];
      permissions: Permission[];
    };
    error?: string;
  }> {
    try {
      const payload = await jwtService.verifyAccessToken(token);

      // Verify session is still active
      const session = await sessionService.getActiveSession(payload.sessionId);
      if (!session) {
        return { valid: false, error: 'Session expired' };
      }

      return {
        valid: true,
        user: {
          id: payload.sub,
          email: payload.email,
          sessionId: payload.sessionId,
          workspaceId: payload.workspaceId,
          roles: payload.roles,
          permissions: payload.permissions
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Token verification failed'
      };
    }
  }

  /**
   * Get authentication statistics
   */
  getAuthStats() {
    return {
      sessions: sessionService.getSessionStats(),
      ssoProviders: ssoService.getAvailableProviders().map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        enabled: p.enabled
      }))
    };
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();

// Initialize SSO on module load
ssoService.initializePassport();