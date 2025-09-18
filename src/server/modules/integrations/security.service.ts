import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  createHash,
  pbkdf2Sync,
  timingSafeEqual,
} from 'crypto';
import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { IntegrationError } from './types';

interface EncryptedData {
  data: string;
  iv: string;
  tag: string;
  algorithm: string;
  version: string;
}

interface ApiKey {
  id: string;
  key: string;
  hash: string;
  name: string;
  workspaceId: string;
  permissions: string[];
  expiresAt?: Date;
  createdAt: Date;
  lastUsedAt?: Date;
  metadata?: Record<string, any>;
}

interface SecurityAuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  workspaceId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  result: 'success' | 'failure';
  metadata?: Record<string, any>;
  timestamp: Date;
}

interface EncryptionOptions {
  algorithm?: string;
  keyLength?: number;
  saltLength?: number;
  iterations?: number;
  tagLength?: number;
}

export class SecurityService extends EventEmitter {
  private redis: Redis;
  private encryptionKey: Buffer;
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32;
  private readonly IV_LENGTH = 16;
  private readonly TAG_LENGTH = 16;
  private readonly SALT_LENGTH = 32;
  private readonly PBKDF2_ITERATIONS = 100000;
  private readonly API_KEY_PREFIX = 'kn_';
  private readonly API_KEY_LENGTH = 32;
  private readonly AUDIT_LOG_KEY = 'security:audit';
  private readonly API_KEYS_KEY = 'security:api_keys';
  private readonly ENCRYPTION_VERSION = '1.0';

  constructor(masterKey?: string, redisUrl?: string) {
    super();
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');

    // Derive encryption key from master key
    const key = masterKey || process.env.ENCRYPTION_MASTER_KEY;
    if (!key) {
      throw new IntegrationError('Encryption master key is required');
    }

    // Use a fixed salt for consistent key derivation (stored securely)
    const salt = Buffer.from(process.env.ENCRYPTION_SALT || 'default-salt-change-in-production', 'utf8');
    this.encryptionKey = scryptSync(key, salt, this.KEY_LENGTH);
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  async encryptData(data: string | Record<string, any>, options?: EncryptionOptions): Promise<EncryptedData> {
    try {
      const algorithm = options?.algorithm || this.ENCRYPTION_ALGORITHM;
      const stringData = typeof data === 'string' ? data : JSON.stringify(data);

      // Generate random IV for each encryption
      const iv = randomBytes(this.IV_LENGTH);

      // Create cipher
      const cipher = createCipheriv(algorithm, this.encryptionKey, iv);

      // Encrypt data
      let encrypted = cipher.update(stringData, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag for GCM mode
      const tag = cipher.getAuthTag();

      // Store encrypted data with metadata
      const encryptedData: EncryptedData = {
        data: encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        algorithm,
        version: this.ENCRYPTION_VERSION,
      };

      // Log encryption event
      await this.auditLog({
        action: 'data_encrypted',
        entityType: 'data',
        result: 'success',
        metadata: { algorithm, dataLength: stringData.length },
      });

      return encryptedData;
    } catch (error: any) {
      await this.auditLog({
        action: 'data_encrypted',
        entityType: 'data',
        result: 'failure',
        metadata: { error: error.message },
      });
      throw new IntegrationError(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data encrypted with AES-256-GCM
   */
  async decryptData(encryptedData: EncryptedData): Promise<string | Record<string, any>> {
    try {
      // Validate encryption version
      if (encryptedData.version !== this.ENCRYPTION_VERSION) {
        throw new Error('Unsupported encryption version');
      }

      const algorithm = encryptedData.algorithm || this.ENCRYPTION_ALGORITHM;
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const tag = Buffer.from(encryptedData.tag, 'hex');
      const encrypted = encryptedData.data;

      // Create decipher
      const decipher = createDecipheriv(algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(tag);

      // Decrypt data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      // Try to parse as JSON, return as string if fails
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error: any) {
      await this.auditLog({
        action: 'data_decrypted',
        entityType: 'data',
        result: 'failure',
        metadata: { error: error.message },
      });
      throw new IntegrationError(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt credentials for storage
   */
  async encryptCredentials(credentials: Record<string, any>): Promise<string> {
    const encrypted = await this.encryptData(credentials);
    // Return as base64 encoded string for storage
    return Buffer.from(JSON.stringify(encrypted)).toString('base64');
  }

  /**
   * Decrypt stored credentials
   */
  async decryptCredentials(encryptedCredentials: string): Promise<Record<string, any>> {
    try {
      // Decode from base64
      const encryptedData = JSON.parse(Buffer.from(encryptedCredentials, 'base64').toString('utf8'));
      const decrypted = await this.decryptData(encryptedData);
      return decrypted as Record<string, any>;
    } catch (error: any) {
      throw new IntegrationError(`Failed to decrypt credentials: ${error.message}`);
    }
  }

  /**
   * Generate a new API key
   */
  async generateApiKey(
    name: string,
    workspaceId: string,
    permissions: string[] = [],
    expiresIn?: number
  ): Promise<{ id: string; key: string; apiKey: ApiKey }> {
    try {
      // Generate random key
      const keyBytes = randomBytes(this.API_KEY_LENGTH);
      const keyString = keyBytes.toString('hex');
      const fullKey = `${this.API_KEY_PREFIX}${keyString}`;

      // Generate ID
      const id = `apikey_${randomBytes(16).toString('hex')}`;

      // Hash the key for storage
      const hash = this.hashApiKey(fullKey);

      // Create API key object
      const apiKey: ApiKey = {
        id,
        key: fullKey, // Will be removed before storage
        hash,
        name,
        workspaceId,
        permissions,
        createdAt: new Date(),
      };

      if (expiresIn) {
        apiKey.expiresAt = new Date(Date.now() + expiresIn);
      }

      // Store API key (without plain text key)
      const storedKey = { ...apiKey };
      delete (storedKey as any).key;
      await this.redis.hset(this.API_KEYS_KEY, id, JSON.stringify(storedKey));

      // Also store a reverse lookup from hash to ID
      await this.redis.hset(`${this.API_KEYS_KEY}:lookup`, hash, id);

      // Audit log
      await this.auditLog({
        action: 'api_key_generated',
        entityType: 'api_key',
        entityId: id,
        workspaceId,
        result: 'success',
        metadata: { name, permissions, expiresIn },
      });

      this.emit('api_key.generated', { id, name, workspaceId });

      return { id, key: fullKey, apiKey };
    } catch (error: any) {
      await this.auditLog({
        action: 'api_key_generated',
        entityType: 'api_key',
        workspaceId,
        result: 'failure',
        metadata: { error: error.message },
      });
      throw new IntegrationError(`Failed to generate API key: ${error.message}`);
    }
  }

  /**
   * Validate an API key
   */
  async validateApiKey(apiKey: string): Promise<ApiKey | null> {
    try {
      // Check format
      if (!apiKey.startsWith(this.API_KEY_PREFIX)) {
        return null;
      }

      // Hash the key
      const hash = this.hashApiKey(apiKey);

      // Look up key by hash
      const keyId = await this.redis.hget(`${this.API_KEYS_KEY}:lookup`, hash);
      if (!keyId) {
        await this.auditLog({
          action: 'api_key_validated',
          entityType: 'api_key',
          result: 'failure',
          metadata: { reason: 'not_found' },
        });
        return null;
      }

      // Get key data
      const keyData = await this.redis.hget(this.API_KEYS_KEY, keyId);
      if (!keyData) {
        return null;
      }

      const storedKey = JSON.parse(keyData) as ApiKey;

      // Check expiration
      if (storedKey.expiresAt && new Date(storedKey.expiresAt) < new Date()) {
        await this.auditLog({
          action: 'api_key_validated',
          entityType: 'api_key',
          entityId: keyId,
          result: 'failure',
          metadata: { reason: 'expired' },
        });
        return null;
      }

      // Update last used timestamp
      storedKey.lastUsedAt = new Date();
      await this.redis.hset(this.API_KEYS_KEY, keyId, JSON.stringify(storedKey));

      await this.auditLog({
        action: 'api_key_validated',
        entityType: 'api_key',
        entityId: keyId,
        workspaceId: storedKey.workspaceId,
        result: 'success',
      });

      return storedKey;
    } catch (error: any) {
      await this.auditLog({
        action: 'api_key_validated',
        entityType: 'api_key',
        result: 'failure',
        metadata: { error: error.message },
      });
      return null;
    }
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(keyId: string): Promise<void> {
    try {
      const keyData = await this.redis.hget(this.API_KEYS_KEY, keyId);
      if (!keyData) {
        throw new IntegrationError('API key not found');
      }

      const key = JSON.parse(keyData) as ApiKey;

      // Remove from storage
      await this.redis.hdel(this.API_KEYS_KEY, keyId);
      await this.redis.hdel(`${this.API_KEYS_KEY}:lookup`, key.hash);

      await this.auditLog({
        action: 'api_key_revoked',
        entityType: 'api_key',
        entityId: keyId,
        workspaceId: key.workspaceId,
        result: 'success',
      });

      this.emit('api_key.revoked', { id: keyId, workspaceId: key.workspaceId });
    } catch (error: any) {
      await this.auditLog({
        action: 'api_key_revoked',
        entityType: 'api_key',
        entityId: keyId,
        result: 'failure',
        metadata: { error: error.message },
      });
      throw error;
    }
  }

  /**
   * List API keys for a workspace
   */
  async listApiKeys(workspaceId: string): Promise<Omit<ApiKey, 'hash'>[]> {
    const allKeys = await this.redis.hgetall(this.API_KEYS_KEY);
    const keys = Object.values(allKeys)
      .map(data => JSON.parse(data) as ApiKey)
      .filter(key => key.workspaceId === workspaceId)
      .map(key => {
        // Remove sensitive data
        const { hash, ...safeKey } = key;
        return safeKey;
      });

    return keys;
  }

  /**
   * Generate webhook signature
   */
  generateWebhookSignature(secret: string, payload: string | Record<string, any>): string {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const hash = createHash('sha256');
    hash.update(secret + data);
    return `sha256=${hash.digest('hex')}`;
  }

  /**
   * Validate webhook signature with timing-safe comparison
   */
  validateWebhookSignature(
    secret: string,
    payload: string | Record<string, any>,
    signature: string
  ): boolean {
    try {
      const expectedSignature = this.generateWebhookSignature(secret, payload);
      const expected = Buffer.from(expectedSignature);
      const received = Buffer.from(signature);

      // Check length first
      if (expected.length !== received.length) {
        return false;
      }

      // Use timing-safe comparison
      return timingSafeEqual(expected, received);
    } catch {
      return false;
    }
  }

  /**
   * Encrypt token for secure storage
   */
  async encryptToken(token: string, context?: Record<string, any>): Promise<string> {
    const tokenData = {
      token,
      context,
      issuedAt: new Date().toISOString(),
    };

    const encrypted = await this.encryptData(tokenData);
    return Buffer.from(JSON.stringify(encrypted)).toString('base64');
  }

  /**
   * Decrypt stored token
   */
  async decryptToken(encryptedToken: string): Promise<{ token: string; context?: Record<string, any>; issuedAt: string }> {
    try {
      const encryptedData = JSON.parse(Buffer.from(encryptedToken, 'base64').toString('utf8'));
      const decrypted = await this.decryptData(encryptedData);
      return decrypted as { token: string; context?: Record<string, any>; issuedAt: string };
    } catch (error: any) {
      throw new IntegrationError(`Failed to decrypt token: ${error.message}`);
    }
  }

  /**
   * Generate secure random string
   */
  generateSecureRandom(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Hash sensitive data for comparison
   */
  hashSensitiveData(data: string, salt?: string): string {
    const actualSalt = salt || randomBytes(this.SALT_LENGTH).toString('hex');
    const hash = pbkdf2Sync(data, actualSalt, this.PBKDF2_ITERATIONS, 64, 'sha512');
    return `${actualSalt}:${hash.toString('hex')}`;
  }

  /**
   * Verify hashed sensitive data
   */
  verifySensitiveData(data: string, hashedData: string): boolean {
    try {
      const [salt, hash] = hashedData.split(':');
      const testHash = pbkdf2Sync(data, salt, this.PBKDF2_ITERATIONS, 64, 'sha512');
      return timingSafeEqual(Buffer.from(hash, 'hex'), testHash);
    } catch {
      return false;
    }
  }

  /**
   * Security audit logging
   */
  private async auditLog(log: Omit<SecurityAuditLog, 'id' | 'timestamp'>): Promise<void> {
    const auditEntry: SecurityAuditLog = {
      id: `audit_${randomBytes(16).toString('hex')}`,
      ...log,
      timestamp: new Date(),
    };

    // Store in Redis with expiration (30 days)
    const key = `${this.AUDIT_LOG_KEY}:${auditEntry.id}`;
    await this.redis.setex(key, 30 * 24 * 60 * 60, JSON.stringify(auditEntry));

    // Also add to sorted set for querying
    await this.redis.zadd(
      `${this.AUDIT_LOG_KEY}:index`,
      auditEntry.timestamp.getTime(),
      auditEntry.id
    );

    // Emit audit event
    this.emit('security.audit', auditEntry);
  }

  /**
   * Query audit logs
   */
  async queryAuditLogs(filters: {
    action?: string;
    entityType?: string;
    workspaceId?: string;
    userId?: string;
    result?: 'success' | 'failure';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<SecurityAuditLog[]> {
    const startScore = filters.startDate ? filters.startDate.getTime() : '-inf';
    const endScore = filters.endDate ? filters.endDate.getTime() : '+inf';
    const limit = filters.limit || 100;

    // Get audit IDs within date range
    const auditIds = await this.redis.zrevrangebyscore(
      `${this.AUDIT_LOG_KEY}:index`,
      endScore,
      startScore,
      'LIMIT',
      0,
      limit * 2 // Get extra to account for filtering
    );

    const logs: SecurityAuditLog[] = [];

    for (const id of auditIds) {
      const logData = await this.redis.get(`${this.AUDIT_LOG_KEY}:${id}`);
      if (!logData) continue;

      const log = JSON.parse(logData) as SecurityAuditLog;

      // Apply filters
      if (filters.action && log.action !== filters.action) continue;
      if (filters.entityType && log.entityType !== filters.entityType) continue;
      if (filters.workspaceId && log.workspaceId !== filters.workspaceId) continue;
      if (filters.userId && log.userId !== filters.userId) continue;
      if (filters.result && log.result !== filters.result) continue;

      logs.push(log);

      if (logs.length >= limit) break;
    }

    return logs;
  }

  /**
   * Hash API key for storage
   */
  private hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Clean up resources
   */
  async stop(): Promise<void> {
    await this.redis.quit();
  }
}