import { NextRequest, NextResponse } from 'next/server';
import { WebhookService } from '@/server/modules/integrations/webhook.service';

const webhookService = new WebhookService();

/**
 * Get webhook delivery history
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const webhookId = searchParams.get('webhookId');
    const workspaceId = searchParams.get('workspaceId');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!webhookId || !workspaceId) {
      return NextResponse.json(
        { error: 'webhookId and workspaceId are required' },
        { status: 400 }
      );
    }

    // Verify webhook belongs to workspace
    const webhook = await webhookService.getWebhook(webhookId);
    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    if ((webhook as any).workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get delivery history
    const deliveries = await webhookService.getDeliveryHistory(webhookId, {
      limit,
      offset,
    });

    // Get webhook statistics
    const stats = await webhookService.getWebhookStats(webhookId);

    return NextResponse.json({
      success: true,
      data: {
        deliveries,
        stats,
        pagination: {
          limit,
          offset,
          hasMore: deliveries.length === limit,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting delivery history:', error);
    return NextResponse.json(
      { error: 'Failed to get delivery history', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Retry failed webhook deliveries
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, webhookId, eventId, retryAll } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    // If webhookId is provided, verify it belongs to workspace
    if (webhookId) {
      const webhook = await webhookService.getWebhook(webhookId);
      if (!webhook) {
        return NextResponse.json(
          { error: 'Webhook not found' },
          { status: 404 }
        );
      }

      if ((webhook as any).workspaceId !== workspaceId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }
    }

    let retriedCount = 0;

    if (retryAll) {
      // Retry all failed deliveries from dead letter queue
      retriedCount = await webhookService.retryDeadLetterEvents(100);
    } else if (eventId) {
      // Retry specific event
      // This would require implementing a specific method in WebhookService
      // For now, we'll just trigger a new event as an example
      const options: { webhookIds?: string[]; headers?: Record<string, string> } = {};
      if (webhookId) options.webhookIds = [webhookId];

      await webhookService.triggerEvent('webhook.retry', {
        originalEventId: eventId,
        retriedAt: new Date(),
      }, options);
      retriedCount = 1;
    } else {
      return NextResponse.json(
        { error: 'Either eventId or retryAll must be specified' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        retriedCount,
        message: `Successfully queued ${retriedCount} webhook(s) for retry`,
      },
    });
  } catch (error: any) {
    console.error('Error retrying webhooks:', error);
    return NextResponse.json(
      { error: 'Failed to retry webhooks', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Trigger a test webhook event
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhookId, workspaceId, eventType, payload } = body;

    if (!webhookId || !workspaceId || !eventType) {
      return NextResponse.json(
        { error: 'webhookId, workspaceId, and eventType are required' },
        { status: 400 }
      );
    }

    // Verify webhook belongs to workspace
    const webhook = await webhookService.getWebhook(webhookId);
    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    if ((webhook as any).workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if webhook is configured for this event type
    if (!webhook.events.includes(eventType) && !webhook.events.includes('*')) {
      return NextResponse.json(
        { error: `Webhook is not configured for event type: ${eventType}` },
        { status: 400 }
      );
    }

    // Trigger test event
    await webhookService.triggerEvent(eventType, payload || {
      test: true,
      message: 'Test webhook event',
      timestamp: new Date(),
      workspaceId,
    }, {
      webhookIds: [webhookId],
      headers: {
        'X-Test-Event': 'true',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Test event triggered successfully',
      data: {
        webhookId,
        eventType,
        timestamp: new Date(),
      },
    });
  } catch (error: any) {
    console.error('Error triggering test event:', error);
    return NextResponse.json(
      { error: 'Failed to trigger test event', message: error.message },
      { status: 500 }
    );
  }
}