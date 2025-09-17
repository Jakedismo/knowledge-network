import { z } from 'zod';

export interface Session {
  id: string;
  userId: string;
  workspaceId?: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  lastAccessed: Date;
  createdAt: Date;
  expiresAt: Date;
  refreshTokenHash?: string;
}

export interface CreateSessionData {
  userId: string;
  workspaceId?: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  ttlSeconds?: number;
}

export interface SessionActivity {
  sessionId: string;
  action: 'login' | 'logout' | 'refresh' | 'access' | 'expire';
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

const createSessionSchema = z.object({
  userId: z.string().min(1),
  workspaceId: z.string().min(1).optional(),
  deviceInfo: z.string().max(500).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().max(1000).optional(),
  ttlSeconds: z.number().min(60).max(7 * 24 * 60 * 60).optional() // 1 minute to 7 days
});

export class SessionService {
  private static instance: SessionService;
  private sessions = new Map<string, Session>();
  private userSessions = new Map<string, Set<string>>();
  private sessionActivity: SessionActivity[] = [];
  private defaultTTL = 24 * 60 * 60; // 24 hours in seconds
  private maxSessionsPerUser = 10;

  constructor() {
    // Start cleanup interval for expired sessions
    this.startCleanupInterval();
  }

  static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  /**
   * Create a new session for a user
   */
  async createSession(data: CreateSessionData): Promise<Session> {
    const validatedData = createSessionSchema.parse(data);
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (validatedData.ttlSeconds || this.defaultTTL) * 1000);

    // Check if user has too many active sessions
    await this.enforceSessionLimit(validatedData.userId);

    const session: Session = {
      id: sessionId,
      userId: validatedData.userId,
      workspaceId: validatedData.workspaceId,
      deviceInfo: validatedData.deviceInfo,
      ipAddress: validatedData.ipAddress,
      userAgent: validatedData.userAgent,
      isActive: true,
      lastAccessed: now,
      createdAt: now,
      expiresAt
    };

    // Store session
    this.sessions.set(sessionId, session);

    // Track user sessions
    if (!this.userSessions.has(validatedData.userId)) {
      this.userSessions.set(validatedData.userId, new Set());
    }
    this.userSessions.get(validatedData.userId)!.add(sessionId);

    // Log session creation
    await this.logActivity({
      sessionId,
      action: 'login',
      ipAddress: validatedData.ipAddress,
      userAgent: validatedData.userAgent,
      timestamp: now
    });

    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (this.isSessionExpired(session)) {
      await this.destroySession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Get active session with automatic cleanup
   */
  async getActiveSession(sessionId: string): Promise<Session | null> {
    const session = await this.getSession(sessionId);

    if (!session || !session.isActive) {
      return null;
    }

    // Update last accessed time
    await this.updateLastAccessed(sessionId);

    return session;
  }

  /**
   * Update session last accessed time
   */
  async updateLastAccessed(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (session && session.isActive) {
      session.lastAccessed = new Date();

      // Log access activity (throttled to avoid spam)
      const lastActivity = this.sessionActivity
        .filter(a => a.sessionId === sessionId && a.action === 'access')
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

      // Only log if last access was more than 5 minutes ago
      if (!lastActivity || Date.now() - lastActivity.timestamp.getTime() > 5 * 60 * 1000) {
        await this.logActivity({
          sessionId,
          action: 'access',
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Destroy a specific session
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (session) {
      session.isActive = false;

      // Remove from user sessions
      const userSessionSet = this.userSessions.get(session.userId);
      if (userSessionSet) {
        userSessionSet.delete(sessionId);
        if (userSessionSet.size === 0) {
          this.userSessions.delete(session.userId);
        }
      }

      // Log logout activity
      await this.logActivity({
        sessionId,
        action: 'logout',
        timestamp: new Date()
      });

      // Remove from memory (in production, you might want to keep for audit)
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Destroy all sessions for a user
   */
  async destroyAllUserSessions(userId: string): Promise<number> {
    const userSessionSet = this.userSessions.get(userId);
    if (!userSessionSet) {
      return 0;
    }

    const sessionIds = Array.from(userSessionSet);
    let destroyedCount = 0;

    for (const sessionId of sessionIds) {
      await this.destroySession(sessionId);
      destroyedCount++;
    }

    return destroyedCount;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    const userSessionSet = this.userSessions.get(userId);
    if (!userSessionSet) {
      return [];
    }

    const sessions: Session[] = [];
    for (const sessionId of userSessionSet) {
      const session = await this.getActiveSession(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions.sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
  }

  /**
   * Store refresh token hash for session
   */
  async storeRefreshToken(sessionId: string, tokenHash: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.refreshTokenHash = tokenHash;
    }
  }

  /**
   * Verify refresh token for session
   */
  async verifyRefreshToken(sessionId: string, tokenHash: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);

    if (!session || !session.isActive || !session.refreshTokenHash) {
      return false;
    }

    return session.refreshTokenHash === tokenHash;
  }

  /**
   * Remove refresh token from session
   */
  async removeRefreshToken(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      delete session.refreshTokenHash;
    }
  }

  /**
   * Get session activity for audit purposes
   */
  async getSessionActivity(sessionId: string, limit = 50): Promise<SessionActivity[]> {
    return this.sessionActivity
      .filter(activity => activity.sessionId === sessionId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get user activity across all sessions
   */
  async getUserActivity(userId: string, limit = 100): Promise<SessionActivity[]> {
    const userSessionSet = this.userSessions.get(userId);
    if (!userSessionSet) {
      return [];
    }

    const sessionIds = Array.from(userSessionSet);

    return this.sessionActivity
      .filter(activity => sessionIds.includes(activity.sessionId))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Check session health and statistics
   */
  getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
    activeUsers: number;
  } {
    let activeSessions = 0;
    let expiredSessions = 0;

    for (const session of this.sessions.values()) {
      if (this.isSessionExpired(session)) {
        expiredSessions++;
      } else if (session.isActive) {
        activeSessions++;
      }
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      expiredSessions,
      activeUsers: this.userSessions.size
    };
  }

  /**
   * Check if session is expired
   */
  private isSessionExpired(session: Session): boolean {
    return new Date() > session.expiresAt;
  }

  /**
   * Enforce session limit per user
   */
  private async enforceSessionLimit(userId: string): Promise<void> {
    const userSessionSet = this.userSessions.get(userId);
    if (!userSessionSet || userSessionSet.size < this.maxSessionsPerUser) {
      return;
    }

    // Get sessions sorted by last accessed (oldest first)
    const sessions = await this.getUserSessions(userId);
    const sessionsToRemove = sessions.slice(this.maxSessionsPerUser - 1);

    for (const session of sessionsToRemove) {
      await this.destroySession(session.id);
    }
  }

  /**
   * Generate secure session ID
   */
  private generateSessionId(): string {
    // In production, use crypto.randomUUID() or similar
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Log session activity
   */
  private async logActivity(activity: SessionActivity): Promise<void> {
    this.sessionActivity.push(activity);

    // Keep only last 10000 activities in memory
    if (this.sessionActivity.length > 10000) {
      this.sessionActivity = this.sessionActivity.slice(-5000);
    }

    // In production, you'd write this to a persistent log store
  }

  /**
   * Start cleanup interval for expired sessions
   */
  private startCleanupInterval(): void {
    // Clean up expired sessions every 15 minutes
    setInterval(async () => {
      const expiredSessions: string[] = [];

      for (const [sessionId, session] of this.sessions.entries()) {
        if (this.isSessionExpired(session)) {
          expiredSessions.push(sessionId);
        }
      }

      for (const sessionId of expiredSessions) {
        await this.logActivity({
          sessionId,
          action: 'expire',
          timestamp: new Date()
        });
        await this.destroySession(sessionId);
      }

      console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    }, 15 * 60 * 1000); // 15 minutes
  }
}

// Export singleton instance
export const sessionService = SessionService.getInstance();