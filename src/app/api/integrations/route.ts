import { NextRequest, NextResponse } from 'next/server';
import { IntegrationManager } from '@/server/modules/integrations/manager';
import { WebhookService } from '@/server/modules/integrations/webhook.service';
import { SecurityService } from '@/server/modules/integrations/security.service';
import { RateLimiterService } from '@/server/modules/integrations/rate-limiter.service';
import { WebhookConfig, IntegrationConfig, RateLimitConfig } from '@/server/modules/integrations/types';

const integrationManager = new IntegrationManager();
const webhookService = new WebhookService();
const securityService = new SecurityService();
const rateLimiter = new RateLimiterService();

/**
 * List available integrations and their configurations
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId');
    const includeCredentials = searchParams.get('includeCredentials') === 'true';

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    // Get available integration types
    const availableIntegrations = integrationManager.getAvailableIntegrations();

    // Get configured integrations for workspace
    const configuredIntegrations = await getWorkspaceIntegrations(workspaceId);

    // Build response
    const integrations = availableIntegrations.map(type => {
      const configured = configuredIntegrations.find(c => c.type === type);
      return {
        type,
        name: getIntegrationName(type),
        description: getIntegrationDescription(type),
        configured: !!configured,
        enabled: configured?.enabled || false,
        config: configured?.config || null,
        credentials: includeCredentials && (configured as any)?.credentials ?
          { hasCredentials: true } : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: integrations,
    });
  } catch (error: any) {
    console.error('Error listing integrations:', error);
    return NextResponse.json(
      { error: 'Failed to list integrations', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Configure a new integration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, integrationType, config, credentials } = body;

    // Validate required fields
    if (!workspaceId || !integrationType) {
      return NextResponse.json(
        { error: 'workspaceId and integrationType are required' },
        { status: 400 }
      );
    }

    // Validate integration type
    const availableIntegrations = integrationManager.getAvailableIntegrations();
    if (!availableIntegrations.includes(integrationType)) {
      return NextResponse.json(
        { error: 'Invalid integration type' },
        { status: 400 }
      );
    }

    // Encrypt credentials if provided
    let encryptedCredentials = null;
    if (credentials) {
      encryptedCredentials = await securityService.encryptCredentials(credentials);
    }

    // Test connection if credentials provided
    if (credentials) {
      const testResult = await integrationManager.testConnection(
        integrationType,
        credentials
      );

      if (!testResult) {
        return NextResponse.json(
          { error: 'Failed to connect to integration' },
          { status: 400 }
        );
      }
    }

    // Create integration configuration
    const integration: IntegrationConfig = {
      id: generateIntegrationId(),
      name: config?.name || getIntegrationName(integrationType),
      type: integrationType as any,
      enabled: true,
      config: config || {},
      rateLimits: config?.rateLimits || getDefaultRateLimits(integrationType),
      retryPolicy: config?.retryPolicy || {
        maxRetries: 3,
        initialDelay: 1000,
        backoffMultiplier: 2,
      },
    };

    // Store integration configuration
    await storeIntegration(workspaceId, integration, encryptedCredentials);

    // Configure rate limits
    if (integration.rateLimits) {
      await rateLimiter.configureResourceLimit(
        `${integrationType}:${workspaceId}`,
        integration.rateLimits
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: integration.id,
        type: integration.type,
        name: integration.name,
        enabled: integration.enabled,
      },
    });
  } catch (error: any) {
    console.error('Error configuring integration:', error);
    return NextResponse.json(
      { error: 'Failed to configure integration', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Update integration configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { integrationId, workspaceId, enabled, config, credentials } = body;

    if (!integrationId || !workspaceId) {
      return NextResponse.json(
        { error: 'integrationId and workspaceId are required' },
        { status: 400 }
      );
    }

    // Get existing integration
    const existing = await getIntegration(integrationId, workspaceId);
    if (!existing) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Update configuration
    const updated = {
      ...existing,
      enabled: enabled !== undefined ? enabled : existing.enabled,
      config: config ? { ...existing.config, ...config } : existing.config,
    };

    // Update credentials if provided
    let encryptedCredentials = null;
    if (credentials) {
      encryptedCredentials = await securityService.encryptCredentials(credentials);

      // Test new credentials
      const testResult = await integrationManager.testConnection(
        existing.type,
        credentials
      );

      if (!testResult) {
        return NextResponse.json(
          { error: 'Failed to validate new credentials' },
          { status: 400 }
        );
      }
    }

    // Update integration
    await updateIntegration(workspaceId, updated, encryptedCredentials);

    // Update rate limits if changed
    if (config?.rateLimits) {
      await rateLimiter.configureResourceLimit(
        `${existing.type}:${workspaceId}`,
        config.rateLimits
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating integration:', error);
    return NextResponse.json(
      { error: 'Failed to update integration', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Delete integration
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const integrationId = searchParams.get('integrationId');
    const workspaceId = searchParams.get('workspaceId');

    if (!integrationId || !workspaceId) {
      return NextResponse.json(
        { error: 'integrationId and workspaceId are required' },
        { status: 400 }
      );
    }

    // Get existing integration
    const existing = await getIntegration(integrationId, workspaceId);
    if (!existing) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Delete associated webhooks
    const webhooks = await webhookService.listWebhooks();
    for (const webhook of webhooks) {
      if ((webhook as any).integrationId === integrationId) {
        await webhookService.deleteWebhook(webhook.id);
      }
    }

    // Delete integration
    await deleteIntegration(integrationId, workspaceId);

    // Reset rate limits
    await rateLimiter.resetLimit(existing.type, workspaceId);

    return NextResponse.json({
      success: true,
      message: 'Integration deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting integration:', error);
    return NextResponse.json(
      { error: 'Failed to delete integration', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Helper functions
 */

function getIntegrationName(type: string): string {
  const names: Record<string, string> = {
    slack: 'Slack',
    teams: 'Microsoft Teams',
    jira: 'Jira',
    github: 'GitHub',
    'google-drive': 'Google Drive',
    onedrive: 'OneDrive',
    stripe: 'Stripe',
    shopify: 'Shopify',
    discord: 'Discord',
    zoom: 'Zoom',
  };
  return names[type] || type;
}

function getIntegrationDescription(type: string): string {
  const descriptions: Record<string, string> = {
    slack: 'Connect with Slack for team communication and notifications',
    teams: 'Integrate with Microsoft Teams for collaboration',
    jira: 'Sync with Jira for project management and issue tracking',
    github: 'Connect GitHub repositories for code collaboration',
    'google-drive': 'Access and manage Google Drive files',
    onedrive: 'Integrate with Microsoft OneDrive for file storage',
    stripe: 'Process payments and manage subscriptions with Stripe',
    shopify: 'Connect your Shopify store for e-commerce operations',
    discord: 'Integrate with Discord for community management',
    zoom: 'Schedule and manage Zoom meetings',
  };
  return descriptions[type] || `Connect with ${getIntegrationName(type)}`;
}

function getDefaultRateLimits(type: string): RateLimitConfig {
  const limits: Record<string, RateLimitConfig> = {
    slack: { windowMs: 60000, maxRequests: 100 },
    teams: { windowMs: 60000, maxRequests: 100 },
    jira: { windowMs: 60000, maxRequests: 50 },
    github: { windowMs: 3600000, maxRequests: 5000 },
    'google-drive': { windowMs: 60000, maxRequests: 100 },
    onedrive: { windowMs: 60000, maxRequests: 100 },
    stripe: { windowMs: 60000, maxRequests: 100 },
    shopify: { windowMs: 60000, maxRequests: 40 },
  };
  return limits[type] || { windowMs: 60000, maxRequests: 100 };
}

function generateIntegrationId(): string {
  return `int_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

// Database placeholder functions - implement based on your database

async function getWorkspaceIntegrations(workspaceId: string): Promise<IntegrationConfig[]> {
  // Implement database query
  return [];
}

async function getIntegration(
  integrationId: string,
  workspaceId: string
): Promise<IntegrationConfig | null> {
  // Implement database query
  return null;
}

async function storeIntegration(
  workspaceId: string,
  integration: IntegrationConfig,
  encryptedCredentials: string | null
): Promise<void> {
  // Implement database storage
  console.log('Storing integration:', { workspaceId, integration });
}

async function updateIntegration(
  workspaceId: string,
  integration: IntegrationConfig,
  encryptedCredentials: string | null
): Promise<void> {
  // Implement database update
  console.log('Updating integration:', { workspaceId, integration });
}

async function deleteIntegration(
  integrationId: string,
  workspaceId: string
): Promise<void> {
  // Implement database deletion
  console.log('Deleting integration:', { integrationId, workspaceId });
}