import { NextRequest, NextResponse } from 'next/server';
import { IntegrationManager } from '@/server/modules/integrations/manager';
import { WebhookService } from '@/server/modules/integrations/webhook.service';
import { SecurityService } from '@/server/modules/integrations/security.service';

const integrationManager = new IntegrationManager();
const webhookService = new WebhookService();
const securityService = new SecurityService();

/**
 * Webhook receiver endpoint
 * Handles incoming webhooks from external services
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { integration: string } }
) {
  try {
    const integration = params.integration;

    // Get request headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    // Get request body
    const rawBody = await request.text();
    let body: any;

    try {
      body = JSON.parse(rawBody);
    } catch {
      body = rawBody;
    }

    // Log webhook reception
    console.log(`Webhook received for ${integration}:`, {
      headers: Object.keys(headers),
      bodyType: typeof body,
    });

    // Validate webhook signature based on integration type
    const isValid = await validateWebhookSignature(
      integration,
      headers,
      rawBody
    );

    if (!isValid) {
      console.error(`Invalid webhook signature for ${integration}`);
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Process the webhook through the integration manager
    await integrationManager.handleWebhook(integration, headers, body);

    // Extract event type based on integration
    const eventType = extractEventType(integration, headers, body);

    // Find registered webhooks for this event
    const registeredWebhooks = await webhookService.listWebhooks({
      events: [eventType],
      active: true,
    });

    // Forward to registered internal webhooks if any
    if (registeredWebhooks.length > 0) {
      await webhookService.triggerEvent(eventType, {
        integration,
        headers,
        body,
        receivedAt: new Date(),
      });
    }

    // Store webhook for debugging/replay
    await storeWebhookEvent({
      integration,
      eventType,
      headers,
      body,
      processedAt: new Date(),
    });

    // Return success response
    return NextResponse.json(
      { success: true, message: 'Webhook processed successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Webhook processing error:', error);

    // Still return 200 to prevent retries from the sender
    // Log the error internally for investigation
    return NextResponse.json(
      { success: false, message: 'Webhook received but processing failed' },
      { status: 200 }
    );
  }
}

/**
 * List webhook configurations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { integration: string } }
) {
  try {
    const integration = params.integration;
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    // Get webhook configurations for this integration
    const webhooks = await webhookService.listWebhooks({
      events: [`${integration}.*`],
      active: searchParams.get('active') === 'true',
    });

    // Filter by workspace if needed
    const filtered = webhooks.filter(w =>
      (w as any).workspaceId === workspaceId
    );

    return NextResponse.json({
      success: true,
      data: filtered,
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
 * Validate webhook signature based on integration type
 */
async function validateWebhookSignature(
  integration: string,
  headers: Record<string, string>,
  body: string
): Promise<boolean> {
  // Get webhook secret for this integration
  const secret = await getWebhookSecret(integration);
  if (!secret) {
    // If no secret configured, skip validation
    console.warn(`No webhook secret configured for ${integration}`);
    return true;
  }

  switch (integration) {
    case 'github':
      // GitHub uses HMAC-SHA256 with 'sha256=' prefix
      const githubSignature = headers['x-hub-signature-256'];
      if (!githubSignature) return false;
      return securityService.validateWebhookSignature(secret, body, githubSignature);

    case 'stripe':
      // Stripe uses HMAC-SHA256
      const stripeSignature = headers['stripe-signature'];
      if (!stripeSignature) return false;
      // Stripe has a special format with timestamp
      return validateStripeSignature(secret, body, stripeSignature);

    case 'slack':
      // Slack uses HMAC-SHA256
      const slackSignature = headers['x-slack-signature'];
      const slackTimestamp = headers['x-slack-request-timestamp'];
      if (!slackSignature || !slackTimestamp) return false;
      return validateSlackSignature(secret, body, slackSignature, slackTimestamp);

    case 'shopify':
      // Shopify uses HMAC-SHA256 with base64 encoding
      const shopifyHmac = headers['x-shopify-hmac-sha256'];
      if (!shopifyHmac) return false;
      return validateShopifySignature(secret, body, shopifyHmac);

    default:
      // Generic signature validation
      const signature = headers['x-webhook-signature'] ||
                       headers['x-signature'] ||
                       headers['x-hub-signature'];
      if (!signature) return true; // No signature header, allow
      return securityService.validateWebhookSignature(secret, body, signature);
  }
}

/**
 * Validate Stripe webhook signature
 */
function validateStripeSignature(
  secret: string,
  payload: string,
  signature: string
): boolean {
  // Stripe signature format: t=timestamp,v1=signature
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.substring(2);
  const sig = parts.find(p => p.startsWith('v1='))?.substring(3);

  if (!timestamp || !sig) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expectedSig = require('crypto')
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return sig === expectedSig;
}

/**
 * Validate Slack webhook signature
 */
function validateSlackSignature(
  secret: string,
  body: string,
  signature: string,
  timestamp: string
): boolean {
  // Prevent replay attacks - timestamp should be recent (within 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    return false;
  }

  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature = 'v0=' + require('crypto')
    .createHmac('sha256', secret)
    .update(sigBasestring)
    .digest('hex');

  return mySignature === signature;
}

/**
 * Validate Shopify webhook signature
 */
function validateShopifySignature(
  secret: string,
  body: string,
  hmac: string
): boolean {
  const hash = require('crypto')
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  return hash === hmac;
}

/**
 * Extract event type from webhook
 */
function extractEventType(
  integration: string,
  headers: Record<string, string>,
  body: any
): string {
  switch (integration) {
    case 'github':
      return `github.${headers['x-github-event'] || 'unknown'}`;

    case 'stripe':
      return `stripe.${body.type || 'unknown'}`;

    case 'slack':
      if (body.type === 'url_verification') {
        return 'slack.url_verification';
      }
      return `slack.${body.event?.type || body.type || 'unknown'}`;

    case 'shopify':
      return `shopify.${headers['x-shopify-topic'] || 'unknown'}`;

    case 'jira':
      return `jira.${body.webhookEvent || 'unknown'}`;

    default:
      return `${integration}.${body.event || body.type || 'unknown'}`;
  }
}

/**
 * Get webhook secret for integration
 * This is a placeholder - implement based on your configuration
 */
async function getWebhookSecret(integration: string): Promise<string | null> {
  // In production, fetch from secure configuration or database
  const secrets: Record<string, string | undefined> = {
    github: process.env.GITHUB_WEBHOOK_SECRET,
    stripe: process.env.STRIPE_WEBHOOK_SECRET,
    slack: process.env.SLACK_SIGNING_SECRET,
    shopify: process.env.SHOPIFY_WEBHOOK_SECRET,
  };

  return secrets[integration] || null;
}

/**
 * Store webhook event for debugging/replay
 * This is a placeholder - implement based on your database
 */
async function storeWebhookEvent(data: {
  integration: string;
  eventType: string;
  headers: Record<string, string>;
  body: any;
  processedAt: Date;
}): Promise<void> {
  // Implement storage logic
  console.log('Storing webhook event:', {
    integration: data.integration,
    eventType: data.eventType,
    processedAt: data.processedAt,
  });
}