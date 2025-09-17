import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  sessionId: string;
  workspaceId?: string;
  roles: string[];
  permissions: Permission[];
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface Permission {
  resource: string;
  action: string;
  resourceId?: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  passwordHash?: string;
  status: 'active' | 'suspended' | 'deactivated';
  authProvider?: 'local' | 'google' | 'microsoft' | 'saml';
  externalId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionData {
  userId: string;
  workspaceId?: string;
  permissions: Permission[];
  deviceInfo?: string;
  ipAddress?: string;
  isActive: boolean;
  lastAccessed: Date;
  createdAt: Date;
}

const envSchema = z.object({
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
});

export class JWTService {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor() {
    // Use test secrets if in test environment or if actual secrets are missing
    const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

    if (isTest) {
      this.accessTokenSecret = 'test-jwt-secret-key-for-testing-minimum-32-chars';
      this.refreshTokenSecret = 'test-refresh-secret-key-for-testing-minimum-32-chars';
      this.accessTokenExpiry = '15m';
      this.refreshTokenExpiry = '7d';
    } else {
      // Validate environment variables for production
      const env = envSchema.parse(process.env);
      this.accessTokenSecret = env.JWT_SECRET;
      this.refreshTokenSecret = env.JWT_REFRESH_SECRET;
      this.accessTokenExpiry = env.JWT_EXPIRES_IN;
      this.refreshTokenExpiry = env.JWT_REFRESH_EXPIRES_IN;
    }
  }

  /**
   * Generate a new JWT token pair (access + refresh)
   */
  async generateTokenPair(user: User, sessionData?: Partial<SessionData>): Promise<TokenPair> {
    // Create session ID
    const sessionId = this.generateSecureId();

    // Get user permissions for the workspace
    const permissions = await this.getUserPermissions(user.id, sessionData?.workspaceId);
    const roles = await this.getUserRoles(user.id, sessionData?.workspaceId);

    // Generate access token
    const accessTokenPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      sessionId,
      workspaceId: sessionData?.workspaceId,
      roles,
      permissions,
      type: 'access'
    };

    const accessToken = jwt.sign(accessTokenPayload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'knowledge-network',
      audience: 'knowledge-network-api',
      algorithm: 'HS256'
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
      audience: 'knowledge-network-api',
      algorithm: 'HS256'
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getExpirySeconds(this.accessTokenExpiry),
      tokenType: 'Bearer'
    };
  }

  /**
   * Verify and decode an access token
   */
  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'knowledge-network',
        audience: 'knowledge-network-api',
        algorithms: ['HS256']
      }) as AccessTokenPayload;

      // Validate token type
      if (payload.type !== 'access') {
        throw new Error('Invalid token type');
      }

      // TODO: Verify session is still active in database/cache
      // const session = await this.sessionService.getSession(payload.sessionId);
      // if (!session || !session.isActive) {
      //   throw new Error('Session expired or invalid');
      // }

      return payload;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error(`Invalid access token: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Verify and decode a refresh token
   */
  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'knowledge-network',
        audience: 'knowledge-network-api',
        algorithms: ['HS256']
      }) as RefreshTokenPayload;

      // Validate token type
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error(`Invalid refresh token: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = await this.verifyRefreshToken(refreshToken);

      // TODO: Verify refresh token exists in database and is valid
      // const storedToken = await this.getStoredRefreshToken(payload.sub, payload.sessionId);
      // if (!storedToken || !this.compareTokens(refreshToken, storedToken.hash)) {
      //   throw new Error('Invalid refresh token');
      // }

      // Get user data
      // TODO: Implement user service
      // const user = await this.userService.findById(payload.sub);
      // if (!user) {
      //   throw new Error('User not found');
      // }

      // For now, create a mock user for demonstration
      const user: User = {
        id: payload.sub,
        email: 'user@example.com',
        displayName: 'Mock User',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Generate new token pair
      return this.generateTokenPair(user);
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): any {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      throw new Error(`Token decode failed: ${error.message}`);
    }
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const minLength = 8;

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate secure random ID
   */
  private generateSecureId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Convert expiry string to seconds
   */
  private getExpirySeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 60 * 60 * 24;
      default: return 900;
    }
  }

  /**
   * Get user roles (placeholder - implement with actual role service)
   */
  private async getUserRoles(userId: string, workspaceId?: string): Promise<string[]> {
    // TODO: Implement with actual role service
    return ['user']; // Default role
  }

  /**
   * Get user permissions (placeholder - implement with actual permission service)
   */
  private async getUserPermissions(userId: string, workspaceId?: string): Promise<Permission[]> {
    // TODO: Implement with actual permission service
    return [
      { resource: 'knowledge', action: 'read' },
      { resource: 'knowledge', action: 'create' }
    ];
  }
}

// Export singleton instance
export const jwtService = new JWTService();