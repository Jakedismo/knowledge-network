import { EventEmitter } from 'events';
import {
  IntegrationAdapter,
  IntegrationConfig,
  IntegrationContext,
  IntegrationResult,
  IntegrationError,
  IntegrationEvent,
  RetryPolicy,
} from './types';
import { RateLimiterService } from './rate-limiter.service';
import { WebhookService } from './webhook.service';

// Import adapters
import { SlackAdapter } from './adapters/slack.adapter';
import { TeamsAdapter } from './adapters/teams.adapter';
import { JiraAdapter } from './adapters/jira.adapter';
import { GitHubAdapter } from './adapters/github.adapter';
import { GoogleDriveAdapter } from './adapters/google-drive.adapter';
import { OneDriveAdapter } from './adapters/onedrive.adapter';

export class IntegrationManager extends EventEmitter {
  private registry = new Map<string, IntegrationAdapter>();
  private rateLimiter: RateLimiterService;
  private webhookService: WebhookService;

  constructor() {
    super();
    this.rateLimiter = new RateLimiterService();
    this.webhookService = new WebhookService();
    this.initializeAdapters();
  }

  private initializeAdapters(): void {
    // Register all integration adapters
    this.registry.set('slack', new SlackAdapter());
    this.registry.set('teams', new TeamsAdapter());
    this.registry.set('jira', new JiraAdapter());
    this.registry.set('github', new GitHubAdapter());
    this.registry.set('google-drive', new GoogleDriveAdapter());
    this.registry.set('onedrive', new OneDriveAdapter());
  }

  async executeIntegration(
    integrationType: string,
    action: string,
    context: IntegrationContext,
    payload?: any
  ): Promise<IntegrationResult> {
    const adapter = this.registry.get(integrationType);

    if (!adapter) {
      throw new IntegrationError(`Unknown integration type: ${integrationType}`);
    }

    // Check if integration is enabled
    if (!context.integration.enabled) {
      throw new IntegrationError(`Integration ${integrationType} is disabled`);
    }

    // Check rate limits
    await this.rateLimiter.checkLimit(
      integrationType,
      context.workspaceId,
      context.integration.rateLimits
    );

    try {
      // Validate credentials if method exists
      if (adapter.validateCredentials && context.credentials) {
        const isValid = await adapter.validateCredentials(context.credentials);
        if (!isValid) {
          // Try to refresh credentials if method exists
          if (adapter.refreshCredentials) {
            context.credentials = await adapter.refreshCredentials(context.credentials);
            this.emit(IntegrationEvent.TOKEN_REFRESHED, {
              type: integrationType,
              workspaceId: context.workspaceId,
            });
          } else {
            throw new IntegrationError('Invalid credentials');
          }
        }
      }

      // Execute with retry logic
      const result = await this.executeWithRetry(
        () => adapter.execute(action, context, payload),
        context.integration.retryPolicy
      );

      // Emit success event
      this.emit(IntegrationEvent.SUCCESS, {
        type: integrationType,
        action,
        workspaceId: context.workspaceId,
        userId: context.userId,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      // Emit failure event
      this.emit(IntegrationEvent.FAILURE, {
        type: integrationType,
        action,
        error: error.message,
        workspaceId: context.workspaceId,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryPolicy?: RetryPolicy
  ): Promise<T> {
    const maxRetries = retryPolicy?.maxRetries || 3;
    const backoffMultiplier = retryPolicy?.backoffMultiplier || 2;
    const maxDelay = retryPolicy?.maxDelay || 30000;
    let delay = retryPolicy?.initialDelay || 1000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        if (attempt === maxRetries - 1) throw error;

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error;
        }

        await this.delay(Math.min(delay, maxDelay));
        delay *= backoffMultiplier;
      }
    }

    throw new Error('Max retries exceeded');
  }

  private isRetryableError(error: any): boolean {
    // Network errors and temporary failures are retryable
    const retryableStatusCodes = [429, 502, 503, 504];
    const retryableErrorCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];

    if (error.statusCode && retryableStatusCodes.includes(error.statusCode)) {
      return true;
    }

    if (error.code && retryableErrorCodes.includes(error.code)) {
      return true;
    }

    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async registerAdapter(name: string, adapter: IntegrationAdapter): Promise<void> {
    this.registry.set(name, adapter);
  }

  async unregisterAdapter(name: string): Promise<void> {
    this.registry.delete(name);
  }

  getAvailableIntegrations(): string[] {
    return Array.from(this.registry.keys());
  }

  async testConnection(
    integrationType: string,
    credentials: any
  ): Promise<boolean> {
    const adapter = this.registry.get(integrationType);

    if (!adapter) {
      throw new IntegrationError(`Unknown integration type: ${integrationType}`);
    }

    try {
      await adapter.initialize(credentials);

      if (adapter.validateCredentials) {
        return await adapter.validateCredentials(credentials);
      }

      // If no validation method, try a simple operation
      await adapter.execute('test', {} as IntegrationContext, {});
      return true;
    } catch (error) {
      return false;
    }
  }

  // Webhook handling
  async handleWebhook(
    integrationType: string,
    headers: Record<string, string>,
    body: any
  ): Promise<void> {
    const adapter = this.registry.get(integrationType);

    if (!adapter) {
      throw new IntegrationError(`Unknown integration type: ${integrationType}`);
    }

    // Emit webhook received event
    this.emit(IntegrationEvent.WEBHOOK_RECEIVED, {
      type: integrationType,
      headers,
      body,
    });

    // Let the adapter handle the webhook if it has the capability
    if ((adapter as any).handleWebhook) {
      await (adapter as any).handleWebhook(headers, body);
    }
  }
}