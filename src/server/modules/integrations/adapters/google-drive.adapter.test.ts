import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { GoogleDriveAdapter } from './google-drive.adapter.js';
import { IntegrationCredentials, IntegrationContext, IntegrationError } from '../types/index.js';

/**
 * Integration tests for Google Drive adapter
 * Note: These tests validate the adapter structure and error handling.
 * For full integration testing, proper OAuth2 credentials and Google API access are required.
 */
describe('GoogleDriveAdapter', () => {
  let adapter: GoogleDriveAdapter;
  let mockCredentials: IntegrationCredentials;
  let mockContext: IntegrationContext;

  beforeEach(() => {
    adapter = new GoogleDriveAdapter();

    // Mock credentials with OAuth2 configuration
    mockCredentials = {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      clientId: process.env.GOOGLE_CLIENT_ID || 'test-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'test-client-secret',
      redirectUri: 'http://localhost:3000/callback',
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    } as any;

    mockContext = {
      workspaceId: 'workspace-1',
      userId: 'user-1',
      integration: {
        id: 'google-drive',
        name: 'Google Drive',
        type: 'oauth2',
        enabled: true,
        config: {
          clientId: mockCredentials.clientId,
          clientSecret: mockCredentials.clientSecret,
        },
      },
      credentials: mockCredentials,
    };
  });

  describe('initialize', () => {
    it('should reject when access token is missing', async () => {
      const invalidCredentials = { ...mockCredentials, accessToken: undefined };

      await assert.rejects(
        async () => adapter.initialize(invalidCredentials),
        {
          message: 'Google Drive access token is required',
        }
      );
    });

    it('should reject when OAuth2 client credentials are missing', async () => {
      const invalidCredentials = {
        accessToken: 'token',
      } as IntegrationCredentials;

      // Clear environment variables for this test
      const originalClientId = process.env.GOOGLE_CLIENT_ID;
      const originalClientSecret = process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      await assert.rejects(
        async () => adapter.initialize(invalidCredentials),
        {
          message: 'Google OAuth2 client credentials are required',
        }
      );

      // Restore environment variables
      if (originalClientId) process.env.GOOGLE_CLIENT_ID = originalClientId;
      if (originalClientSecret) process.env.GOOGLE_CLIENT_SECRET = originalClientSecret;
    });
  });

  describe('execute', () => {
    it('should reject when no credentials provided', async () => {
      const contextWithoutCredentials = { ...mockContext, credentials: undefined };

      await assert.rejects(
        async () => adapter.execute('test', contextWithoutCredentials),
        {
          message: 'No credentials provided',
        }
      );
    });

    it('should reject for unknown action', async () => {
      await assert.rejects(
        async () => adapter.execute('unknown_action', mockContext),
        {
          message: 'Unknown action: unknown_action',
        }
      );
    });

    describe('action validations', () => {
      // Note: These tests validate parameter requirements without actually calling Google APIs

      it('should validate import_document requires fileId', async () => {
        await assert.rejects(
          async () => adapter.execute('import_document', mockContext, {}),
          {
            message: 'File ID is required',
          }
        );
      });

      it('should validate export_document requires content and title', async () => {
        await assert.rejects(
          async () => adapter.execute('export_document', mockContext, { content: 'test' }),
          {
            message: 'Content and title are required',
          }
        );

        await assert.rejects(
          async () => adapter.execute('export_document', mockContext, { title: 'test' }),
          {
            message: 'Content and title are required',
          }
        );
      });

      it('should validate create_folder requires name', async () => {
        await assert.rejects(
          async () => adapter.execute('create_folder', mockContext, {}),
          {
            message: 'Folder name is required',
          }
        );
      });

      it('should validate share_file requires fileId', async () => {
        await assert.rejects(
          async () => adapter.execute('share_file', mockContext, {
            email: 'test@example.com',
            role: 'reader',
            type: 'user',
          }),
          {
            message: 'File ID is required',
          }
        );
      });

      it('should validate get_permissions requires fileId', async () => {
        await assert.rejects(
          async () => adapter.execute('get_permissions', mockContext, {}),
          {
            message: 'File ID is required',
          }
        );
      });

      it('should validate delete_file requires fileId', async () => {
        await assert.rejects(
          async () => adapter.execute('delete_file', mockContext, {}),
          {
            message: 'File ID is required',
          }
        );
      });

      it('should validate move_file requires fileId and newParentId', async () => {
        await assert.rejects(
          async () => adapter.execute('move_file', mockContext, { fileId: 'file-1' }),
          {
            message: 'File ID and new parent ID are required',
          }
        );

        await assert.rejects(
          async () => adapter.execute('move_file', mockContext, { newParentId: 'folder-1' }),
          {
            message: 'File ID and new parent ID are required',
          }
        );
      });

      it('should validate copy_file requires fileId', async () => {
        await assert.rejects(
          async () => adapter.execute('copy_file', mockContext, {}),
          {
            message: 'File ID is required',
          }
        );
      });

      it('should validate search_files requires query', async () => {
        await assert.rejects(
          async () => adapter.execute('search_files', mockContext, {}),
          {
            message: 'Search query is required',
          }
        );
      });

      it('should validate create_webhook requires fileId and address', async () => {
        await assert.rejects(
          async () => adapter.execute('create_webhook', mockContext, { fileId: 'file-1' }),
          {
            message: 'File ID and webhook address are required',
          }
        );

        await assert.rejects(
          async () => adapter.execute('create_webhook', mockContext, { address: 'https://example.com' }),
          {
            message: 'File ID and webhook address are required',
          }
        );
      });

      it('should validate delete_webhook requires channelId and resourceId', async () => {
        await assert.rejects(
          async () => adapter.execute('delete_webhook', mockContext, { channelId: 'channel-1' }),
          {
            message: 'Channel ID and resource ID are required',
          }
        );

        await assert.rejects(
          async () => adapter.execute('delete_webhook', mockContext, { resourceId: 'resource-1' }),
          {
            message: 'Channel ID and resource ID are required',
          }
        );
      });
    });
  });

  describe('handleWebhook', () => {
    it('should reject for invalid webhook headers', async () => {
      const headers = {
        'x-goog-resource-state': 'update',
      };

      await assert.rejects(
        async () => adapter.handleWebhook(headers, {}),
        {
          message: 'Invalid webhook headers',
        }
      );
    });

    it('should reject for unknown webhook channel', async () => {
      const headers = {
        'x-goog-channel-id': 'unknown-channel',
        'x-goog-resource-id': 'resource-id',
        'x-goog-resource-state': 'update',
      };

      await assert.rejects(
        async () => adapter.handleWebhook(headers, {}),
        {
          message: 'Unknown webhook channel',
        }
      );
    });

    it('should handle sync webhook when channel is tracked', async () => {
      // Set up a tracked channel
      const channelId = 'test-channel-1';
      const resourceId = 'test-resource-1';
      (adapter as any).watchChannels.set(channelId, {
        fileId: 'file-1',
        resourceId: resourceId,
        expiration: Date.now() + 1000000,
      });

      const headers = {
        'x-goog-channel-id': channelId,
        'x-goog-resource-id': resourceId,
        'x-goog-resource-state': 'sync',
        'x-goog-message-number': '1',
      };

      const result = await adapter.handleWebhook(headers, {});
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.action, 'sync');
    });

    it('should handle file update webhook when channel is tracked', async () => {
      // Set up a tracked channel
      const channelId = 'test-channel-2';
      const resourceId = 'test-resource-2';
      const fileId = 'test-file-1';
      (adapter as any).watchChannels.set(channelId, {
        fileId: fileId,
        resourceId: resourceId,
        expiration: Date.now() + 1000000,
      });

      const headers = {
        'x-goog-channel-id': channelId,
        'x-goog-resource-id': resourceId,
        'x-goog-resource-state': 'update',
        'x-goog-message-number': '2',
      };

      const result = await adapter.handleWebhook(headers, {});
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.action, 'update');
      assert.strictEqual(result.fileId, fileId);
    });
  });

  describe('refreshCredentials', () => {
    it('should reject when refresh token is missing', async () => {
      const invalidCredentials = { ...mockCredentials, refreshToken: undefined };

      await assert.rejects(
        async () => adapter.refreshCredentials(invalidCredentials),
        {
          message: 'Refresh token is required',
        }
      );
    });
  });

  describe('helper methods', () => {
    it('should determine correct export MIME types', () => {
      const adapter = new GoogleDriveAdapter();
      const getExportMimeType = (adapter as any).getExportMimeType.bind(adapter);

      assert.strictEqual(
        getExportMimeType('application/vnd.google-apps.document'),
        'text/html'
      );
      assert.strictEqual(
        getExportMimeType('application/vnd.google-apps.spreadsheet'),
        'text/csv'
      );
      assert.strictEqual(
        getExportMimeType('application/vnd.google-apps.presentation'),
        'application/pdf'
      );
      assert.strictEqual(
        getExportMimeType('application/vnd.google-apps.drawing'),
        'image/png'
      );
      assert.strictEqual(
        getExportMimeType('unknown/type'),
        'text/plain'
      );
    });

    it('should convert markdown to HTML', () => {
      const adapter = new GoogleDriveAdapter();
      const markdownToHtml = (adapter as any).markdownToHtml.bind(adapter);

      const markdown = `# Title
## Subtitle
**bold text**
*italic text*
[link text](https://example.com)

New paragraph`;

      const html = markdownToHtml(markdown);

      assert(html.includes('<h1>Title</h1>'));
      assert(html.includes('<h2>Subtitle</h2>'));
      assert(html.includes('<strong>bold text</strong>'));
      assert(html.includes('<em>italic text</em>'));
      assert(html.includes('<a href="https://example.com">link text</a>'));
      assert(html.includes('<p>') && html.includes('</p>'));
    });
  });
});