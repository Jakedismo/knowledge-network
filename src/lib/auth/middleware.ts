import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { jwtService } from './jwt.service';
import { sessionService } from './session.service';
import { rbacService } from './rbac.service';
import type { AccessTokenPayload, Permission } from './jwt.service';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    sessionId: string;
    workspaceId?: string;
    roles: string[];
    permissions: Permission[];
  };
}

export interface SecurityConfig {
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  cors?: {
    origins: string[];
    methods: string[];
    allowCredentials: boolean;
  };
  csrfProtection?: boolean;
  apiKeyRequired?: boolean;
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { requests: number; resetTime: number }>();

/**
 * Authentication middleware for API routes
 */
export async function authenticateRequest(request: NextRequest): Promise<{
  success: boolean;
  user?: AccessTokenPayload;
  error?: string;
}> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'No authorization token provided' };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const payload = await jwtService.verifyAccessToken(token);

    // Verify session is still active
    const session = await sessionService.getActiveSession(payload.sessionId);
    if (!session) {
      return { success: false, error: 'Session expired or invalid' };
    }

    return { success: true, user: payload };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    };
  }
}

/**
 * Authorization middleware to check permissions
 */
export async function authorizeRequest(
  user: AccessTokenPayload,
  requiredPermissions: Permission[]
): Promise<{ success: boolean; error?: string }> {
  try {
    for (const permission of requiredPermissions) {
      const result = await rbacService.checkPermission({
        userId: user.sub,
        resource: permission.resource,
        action: permission.action,
        workspaceId: user.workspaceId,
        resourceId: permission.resourceId
      });

      if (!result.granted) {
        return {
          success: false,
          error: `Insufficient permissions: ${permission.resource}:${permission.action}`
        };
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: 'Authorization check failed'
    };
  }
}

/**
 * Rate limiting middleware
 */
export function rateLimit(config: { windowMs: number; maxRequests: number }) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const clientId = getClientIdentifier(request);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Clean up old entries
    for (const [key, data] of rateLimitStore.entries()) {
      if (data.resetTime < windowStart) {
        rateLimitStore.delete(key);
      }
    }

    // Get or create rate limit data for client
    let rateLimitData = rateLimitStore.get(clientId);
    if (!rateLimitData || rateLimitData.resetTime < windowStart) {
      rateLimitData = { requests: 0, resetTime: now + config.windowMs };
      rateLimitStore.set(clientId, rateLimitData);
    }

    // Check if limit exceeded
    if (rateLimitData.requests >= config.maxRequests) {
      const retryAfter = Math.ceil((rateLimitData.resetTime - now) / 1000);

      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter,
          message: `Too many requests. Please try again in ${retryAfter} seconds.`
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitData.resetTime.toString()
          }
        }
      );
    }

    // Increment request count
    rateLimitData.requests++;

    // Return null to continue processing
    return null;
  };
}

/**
 * Security headers middleware
 */
export function securityHeaders(request: NextRequest): NextResponse {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // Remove server identification
  response.headers.delete('Server');
  response.headers.delete('X-Powered-By');

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Note: unsafe-* should be removed in production
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'"
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  return response;
}

/**
 * CORS middleware
 */
export function corsMiddleware(config: {
  origins: string[];
  methods: string[];
  allowCredentials: boolean;
}) {
  return (request: NextRequest): NextResponse | null => {
    const origin = request.headers.get('origin');
    const method = request.method;

    // Handle preflight requests
    if (method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 });

      if (origin && config.origins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
      }

      response.headers.set('Access-Control-Allow-Methods', config.methods.join(', '));
      response.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With'
      );

      if (config.allowCredentials) {
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }

      response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours

      return response;
    }

    // For actual requests, add CORS headers if origin is allowed
    if (origin && config.origins.includes(origin)) {
      const response = NextResponse.next();
      response.headers.set('Access-Control-Allow-Origin', origin);

      if (config.allowCredentials) {
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }

      return response;
    }

    // Origin not allowed
    if (origin && !config.origins.includes('*')) {
      return new NextResponse(
        JSON.stringify({ error: 'CORS: Origin not allowed' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return null; // Continue processing
  };
}

/**
 * API key validation middleware
 */
export function validateApiKey(request: NextRequest): { valid: boolean; error?: string } {
  const apiKey = request.headers.get('x-api-key');

  if (!apiKey) {
    return { valid: false, error: 'API key required' };
  }

  // TODO: Implement actual API key validation
  // const isValid = await apiKeyService.validateKey(apiKey);
  const isValid = apiKey.startsWith('kn_'); // Simple validation for demo

  if (!isValid) {
    return { valid: false, error: 'Invalid API key' };
  }

  return { valid: true };
}

/**
 * Input validation and sanitization
 */
export function sanitizeInput(data: any): any {
  if (typeof data === 'string') {
    // Basic XSS protection
    return data
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[sanitizeInput(key)] = sanitizeInput(value);
    }
    return sanitized;
  }

  return data;
}

/**
 * Complete security middleware composition
 */
export function createSecurityMiddleware(config: SecurityConfig) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // 1. Apply security headers
      let response = securityHeaders(request);

      // 2. Handle CORS if configured
      if (config.cors) {
        const corsResult = corsMiddleware(config.cors)(request);
        if (corsResult) return corsResult;
      }

      // 3. Apply rate limiting if configured
      if (config.rateLimit) {
        const rateLimitResult = await rateLimit(config.rateLimit)(request);
        if (rateLimitResult) return rateLimitResult;
      }

      // 4. Validate API key if required
      if (config.apiKeyRequired) {
        const apiKeyResult = validateApiKey(request);
        if (!apiKeyResult.valid) {
          return new NextResponse(
            JSON.stringify({ error: apiKeyResult.error }),
            {
              status: 401,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      }

      return response;
    } catch (error) {
      logger.error('Security middleware error:', error as any);
      return new NextResponse(
        JSON.stringify({ error: 'Security check failed' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  };
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get IP address from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('x-remote-addr');

  let ip = forwarded?.split(',')[0] || realIp || remoteAddr || 'unknown';

  // For authenticated requests, also include user ID
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decoded = jwtService.decodeToken(token);
      if (decoded?.payload?.sub) {
        ip += `:${decoded.payload.sub}`;
      }
    } catch {
      // Ignore decode errors for rate limiting purposes
    }
  }

  return ip;
}

/**
 * Security audit logging
 */
export interface SecurityEvent {
  type: 'authentication' | 'authorization' | 'rate_limit' | 'cors' | 'validation' | 'suspicious';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

class SecurityAuditService {
  private events: SecurityEvent[] = [];

  logEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const auditEvent: SecurityEvent = {
      ...event,
      timestamp: new Date()
    };

    this.events.push(auditEvent);

    // Keep only last 10000 events in memory
    if (this.events.length > 10000) {
      this.events = this.events.slice(-5000);
    }

    // In production, send to logging service
    logger.info('Security Event:', auditEvent);

    // Alert on high severity events
    if (event.severity === 'high' || event.severity === 'critical') {
      this.sendAlert(auditEvent);
    }
  }

  getEvents(filter?: Partial<SecurityEvent>): SecurityEvent[] {
    if (!filter) return this.events;

    return this.events.filter(event => {
      return Object.entries(filter).every(([key, value]) => {
        return event[key as keyof SecurityEvent] === value;
      });
    });
  }

  private sendAlert(event: SecurityEvent): void {
    // TODO: Implement alerting mechanism (email, Slack, etc.)
    logger.warn('Security Alert:', event);
  }
}

export const securityAudit = new SecurityAuditService();
