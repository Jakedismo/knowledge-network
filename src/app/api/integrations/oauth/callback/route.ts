import { NextRequest, NextResponse } from 'next/server';
import { IntegrationManager } from '@/server/modules/integrations/manager';
import { SecurityService } from '@/server/modules/integrations/security.service';
import { OAuth2Token } from '@/server/modules/integrations/types';

const integrationManager = new IntegrationManager();
const securityService = new SecurityService();

/**
 * OAuth2 callback handler
 * Handles the authorization code flow callback from OAuth providers
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/integrations/error?message=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing required parameters: code or state' },
        { status: 400 }
      );
    }

    // Decode and validate state parameter
    // State should contain: integrationType, workspaceId, userId, returnUrl
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    } catch {
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 400 }
      );
    }

    const { integrationType, workspaceId, userId, returnUrl, nonce } = stateData;

    // Validate state to prevent CSRF attacks
    // In production, you should verify the nonce against a stored value
    if (!integrationType || !workspaceId || !userId) {
      return NextResponse.json(
        { error: 'Invalid state data' },
        { status: 400 }
      );
    }

    // Get the integration configuration
    // This would typically come from your database
    const integrationConfig = await getIntegrationConfig(integrationType);
    if (!integrationConfig) {
      return NextResponse.json(
        { error: 'Unknown integration type' },
        { status: 404 }
      );
    }

    // Exchange authorization code for access token
    const tokenResponse = await exchangeCodeForToken(
      code,
      integrationType,
      integrationConfig,
      request.url
    );

    if (!tokenResponse.success) {
      return NextResponse.json(
        { error: 'Failed to exchange authorization code' },
        { status: 500 }
      );
    }

    const token = tokenResponse.data as OAuth2Token;

    // Encrypt and store the credentials
    const encryptedCredentials = await securityService.encryptCredentials({
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: new Date(Date.now() + token.expiresIn * 1000),
      tokenType: token.tokenType,
      scope: token.scope,
    });

    // Store the integration connection
    // In production, this would be saved to your database
    await storeIntegrationConnection({
      workspaceId,
      userId,
      integrationType,
      credentials: encryptedCredentials,
      metadata: {
        connectedAt: new Date(),
        lastRefreshed: new Date(),
      },
    });

    // Test the connection
    const testResult = await integrationManager.testConnection(
      integrationType,
      {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
      }
    );

    if (!testResult) {
      return NextResponse.json(
        { error: 'Failed to verify integration connection' },
        { status: 500 }
      );
    }

    // Redirect to success page or return URL
    const redirectUrl = returnUrl || `/integrations/success?type=${integrationType}`;
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(
  code: string,
  integrationType: string,
  config: any,
  callbackUrl: string
): Promise<{ success: boolean; data?: OAuth2Token; error?: string }> {
  try {
    const tokenUrl = config.tokenUrl;
    const redirectUri = new URL('/api/integrations/oauth/callback', callbackUrl).toString();

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Token exchange failed:', error);
      return { success: false, error };
    }

    const data = await response.json();

    const token: OAuth2Token = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope,
    };

    return { success: true, data: token };
  } catch (error: any) {
    console.error('Token exchange error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get integration configuration from database
 * This is a placeholder - implement based on your database
 */
async function getIntegrationConfig(integrationType: string): Promise<any> {
  // Example configuration - replace with database lookup
  const configs: Record<string, any> = {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      scope: ['repo', 'user'],
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scope: ['https://www.googleapis.com/auth/drive.readonly'],
    },
    slack: {
      clientId: process.env.SLACK_CLIENT_ID,
      clientSecret: process.env.SLACK_CLIENT_SECRET,
      authorizationUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      scope: ['channels:read', 'chat:write'],
    },
  };

  return configs[integrationType];
}

/**
 * Store integration connection in database
 * This is a placeholder - implement based on your database
 */
async function storeIntegrationConnection(data: {
  workspaceId: string;
  userId: string;
  integrationType: string;
  credentials: string;
  metadata: any;
}): Promise<void> {
  // Implement database storage
  console.log('Storing integration connection:', {
    workspaceId: data.workspaceId,
    userId: data.userId,
    integrationType: data.integrationType,
  });
}