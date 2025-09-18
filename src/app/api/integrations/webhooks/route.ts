import { NextRequest, NextResponse } from 'next/server';
import { WebhookService } from '@/server/modules/integrations/webhook.service';
import { WebhookConfig } from '@/server/modules/integrations/types';

let webhookService: WebhookService | null = null;

const getWebhookService = () => {
  if (!webhookService) {
    try {
      webhookService = new WebhookService();
    } catch (error) {
      console.warn('WebhookService initialization failed:', error);
      return null;
    }
  }
  return webhookService;
};

/**
 * List webhook configurations
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId');
    const events = searchParams.get('events')?.split(',');
    const active = searchParams.get('active');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    // List webhooks with filters
    const filter: { events?: string[]; active?: boolean } = {};
    if (events) filter.events = events;
    if (active !== null) filter.active = active === 'true';

    const service = getWebhookService();
    if (!service) {
      return NextResponse.json(
        { error: 'Webhook service not available' },
        { status: 503 }
      );
    }

    const webhooks = await service.listWebhooks(filter);

    // Filter by workspace
    const filtered = webhooks.filter(w =>
      (w as any).workspaceId === workspaceId
    );

    // Get statistics for each webhook
    const webhooksWithStats = await Promise.all(
      filtered.map(async webhook => {
        const stats = await service.getWebhookStats(webhook.id);
        return {
          ...webhook,
          stats,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: webhooksWithStats,
    });
  } catch (error: any) {
    console.error('Error listing webhooks:', error);
    return NextResponse.json(
      { error: 'Failed to list webhooks', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Register a new webhook
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, url, events, headers, retryPolicy, name } = body;

    // Validate required fields
    if (!workspaceId || !url || !events || events.length === 0) {
      return NextResponse.json(
        { error: 'workspaceId, url, and events are required' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid webhook URL' },
        { status: 400 }
      );
    }

    // Create webhook configuration
    const webhookConfig: WebhookConfig = {
      id: '',
      url,
      events,
      headers: headers || {},
      active: true,
      retryPolicy: retryPolicy || {
        maxRetries: 3,
        initialDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 30000,
      },
    };

    // Add workspace metadata
    (webhookConfig as any).workspaceId = workspaceId;
    (webhookConfig as any).name = name || 'Webhook';
    (webhookConfig as any).createdAt = new Date();

    // Register webhook
    const service = getWebhookService();
    if (!service) {
      return NextResponse.json(
        { error: 'Webhook service not available' },
        { status: 503 }
      );
    }

    const webhook = await service.registerWebhook(webhookConfig);

    // Test webhook with a ping event
    try {
      await service.triggerEvent('webhook.test', {
        message: 'Webhook test event',
        timestamp: new Date(),
      }, {
        webhookIds: [webhook.id],
      });
    } catch (testError) {
      console.warn('Webhook test failed:', testError);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: webhook.id,
        url: webhook.url,
        secret: webhook.secret, // Only return on creation
        events: webhook.events,
        active: webhook.active,
      },
    });
  } catch (error: any) {
    console.error('Error registering webhook:', error);
    return NextResponse.json(
      { error: 'Failed to register webhook', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Update webhook configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhookId, workspaceId, url, events, headers, active, retryPolicy } = body;

    if (!webhookId || !workspaceId) {
      return NextResponse.json(
        { error: 'webhookId and workspaceId are required' },
        { status: 400 }
      );
    }

    // Get existing webhook
    const service = getWebhookService();
    if (!service) {
      return NextResponse.json(
        { error: 'Webhook service not available' },
        { status: 503 }
      );
    }

    const existing = await service.getWebhook(webhookId);
    if (!existing) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Verify workspace ownership
    if ((existing as any).workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update webhook
    const updates: Partial<WebhookConfig> = {};
    if (url !== undefined) updates.url = url;
    if (events !== undefined) updates.events = events;
    if (headers !== undefined) updates.headers = headers;
    if (active !== undefined) updates.active = active;
    if (retryPolicy !== undefined) updates.retryPolicy = retryPolicy;

    const updated = await service.updateWebhook(webhookId, updates);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating webhook:', error);
    return NextResponse.json(
      { error: 'Failed to update webhook', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Delete webhook
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const webhookId = searchParams.get('webhookId');
    const workspaceId = searchParams.get('workspaceId');

    if (!webhookId || !workspaceId) {
      return NextResponse.json(
        { error: 'webhookId and workspaceId are required' },
        { status: 400 }
      );
    }

    // Get existing webhook
    const service = getWebhookService();
    if (!service) {
      return NextResponse.json(
        { error: 'Webhook service not available' },
        { status: 503 }
      );
    }

    const existing = await service.getWebhook(webhookId);
    if (!existing) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Verify workspace ownership
    if ((existing as any).workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete webhook
    await service.deleteWebhook(webhookId);

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json(
      { error: 'Failed to delete webhook', message: error.message },
      { status: 500 }
    );
  }
}
