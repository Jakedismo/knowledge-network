import { NextRequest, NextResponse } from 'next/server';
import { SecurityService } from '@/server/modules/integrations/security.service';

let securityService: SecurityService | null = null;

// Initialize security service lazily with error handling
const getSecurityService = () => {
  if (!securityService) {
    try {
      // Use a development key if ENCRYPTION_MASTER_KEY is not set
      const masterKey = process.env.ENCRYPTION_MASTER_KEY || 'dev-master-key-change-in-production';
      securityService = new SecurityService(masterKey);
    } catch (error) {
      console.warn('SecurityService initialization failed:', error);
      return null;
    }
  }
  return securityService;
};

/**
 * List API keys for a workspace
 */
export async function GET(request: NextRequest) {
  try {
    const service = getSecurityService();
    if (!service) {
      return NextResponse.json(
        { error: 'Security service not available' },
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    // List API keys for workspace
    const apiKeys = await service.listApiKeys(workspaceId);

    // Remove sensitive data and format response
    const formattedKeys = apiKeys.map(key => ({
      id: key.id,
      name: key.name,
      permissions: key.permissions,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      isExpired: key.expiresAt ? new Date(key.expiresAt) < new Date() : false,
    }));

    return NextResponse.json({
      success: true,
      data: formattedKeys,
    });
  } catch (error: any) {
    console.error('Error listing API keys:', error);
    return NextResponse.json(
      { error: 'Failed to list API keys', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Generate a new API key
 */
export async function POST(request: NextRequest) {
  try {
    const service = getSecurityService();
    if (!service) {
      return NextResponse.json(
        { error: 'Security service not available' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { workspaceId, name, permissions, expiresIn } = body;

    // Validate required fields
    if (!workspaceId || !name) {
      return NextResponse.json(
        { error: 'workspaceId and name are required' },
        { status: 400 }
      );
    }

    // Validate permissions
    const validPermissions = [
      'read',
      'write',
      'delete',
      'admin',
      'integrations.read',
      'integrations.write',
      'webhooks.read',
      'webhooks.write',
      'api_keys.read',
      'api_keys.write',
    ];

    if (permissions) {
      const invalidPermissions = permissions.filter(
        (p: string) => !validPermissions.includes(p)
      );
      if (invalidPermissions.length > 0) {
        return NextResponse.json(
          { error: `Invalid permissions: ${invalidPermissions.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate expiration
    if (expiresIn && typeof expiresIn !== 'number') {
      return NextResponse.json(
        { error: 'expiresIn must be a number of milliseconds' },
        { status: 400 }
      );
    }

    // Generate API key
    const result = await service.generateApiKey(
      name,
      workspaceId,
      permissions || ['read'],
      expiresIn
    );

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        key: result.key, // Only returned on creation
        name: result.apiKey.name,
        permissions: result.apiKey.permissions,
        expiresAt: result.apiKey.expiresAt,
      },
      warning: 'Please save the API key securely. It will not be shown again.',
    });
  } catch (error: any) {
    console.error('Error generating API key:', error);
    return NextResponse.json(
      { error: 'Failed to generate API key', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Revoke an API key
 */
export async function DELETE(request: NextRequest) {
  try {
    const service = getSecurityService();
    if (!service) {
      return NextResponse.json(
        { error: 'Security service not available' },
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const keyId = searchParams.get('keyId');
    const workspaceId = searchParams.get('workspaceId');

    if (!keyId || !workspaceId) {
      return NextResponse.json(
        { error: 'keyId and workspaceId are required' },
        { status: 400 }
      );
    }

    // Verify key belongs to workspace
    const keys = await service.listApiKeys(workspaceId);
    const key = keys.find(k => k.id === keyId);

    if (!key) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Revoke API key
    await service.revokeApiKey(keyId);

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error: any) {
    console.error('Error revoking API key:', error);
    return NextResponse.json(
      { error: 'Failed to revoke API key', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Validate an API key (for testing purposes)
 */
export async function PUT(request: NextRequest) {
  try {
    const service = getSecurityService();
    if (!service) {
      return NextResponse.json(
        { error: 'Security service not available' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'apiKey is required' },
        { status: 400 }
      );
    }

    // Validate API key
    const result = await service.validateApiKey(apiKey);

    if (!result) {
      return NextResponse.json({
        success: false,
        valid: false,
        message: 'Invalid or expired API key',
      });
    }

    return NextResponse.json({
      success: true,
      valid: true,
      data: {
        name: result.name,
        workspaceId: result.workspaceId,
        permissions: result.permissions,
        expiresAt: result.expiresAt,
        isExpired: result.expiresAt ? new Date(result.expiresAt) < new Date() : false,
      },
    });
  } catch (error: any) {
    console.error('Error validating API key:', error);
    return NextResponse.json(
      { error: 'Failed to validate API key', message: error.message },
      { status: 500 }
    );
  }
}