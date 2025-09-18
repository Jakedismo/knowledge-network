import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OneDriveAdapter } from '@/server/modules/integrations/adapters/onedrive.adapter';
import {
  IntegrationContext,
  IntegrationCredentials,
  AuthenticationError,
  IntegrationError,
  ConfigurationError,
} from '@/server/modules/integrations/types';

// Mock Microsoft Graph Client
vi.mock('@microsoft/microsoft-graph-client', () => ({
  Client: {
    init: vi.fn(() => mockClient),
    initWithMiddleware: vi.fn(() => mockClient),
  },
}));

vi.mock('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials', () => ({
  TokenCredentialAuthenticationProvider: vi.fn(),
}));

vi.mock('@azure/identity', () => ({
  ClientSecretCredential: vi.fn(),
}));

const mockClient = {
  api: vi.fn(() => ({
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
    select: vi.fn(() => mockClient.api()),
    expand: vi.fn(() => mockClient.api()),
    filter: vi.fn(() => mockClient.api()),
    top: vi.fn(() => mockClient.api()),
    skipToken: vi.fn(() => mockClient.api()),
    orderby: vi.fn(() => mockClient.api()),
    query: vi.fn(() => mockClient.api()),
    responseType: vi.fn(() => mockClient.api()),
    headers: vi.fn(() => mockClient.api()),
    getStream: vi.fn(),
  })),
};

describe('OneDriveAdapter', () => {
  let adapter: OneDriveAdapter;
  let context: IntegrationContext;
  let credentials: IntegrationCredentials;

  beforeEach(() => {
    adapter = new OneDriveAdapter();
    credentials = {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tenantId: 'test-tenant-id',
    } as any;

    context = {
      workspaceId: 'test-workspace',
      userId: 'test-user',
      integration: {
        id: 'onedrive',
        name: 'OneDrive',
        type: 'oauth2',
        enabled: true,
        config: {},
      },
      credentials,
    };

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize client with OAuth2 credentials for business account', async () => {
      await adapter.initialize(credentials);

      expect(mockClient).toBeDefined();
    });

    it('should throw error if access token is missing', async () => {
      const invalidCredentials = { ...credentials, accessToken: undefined };

      await expect(adapter.initialize(invalidCredentials))
        .rejects.toThrow(AuthenticationError);
    });

    it('should throw error for business account without Azure AD credentials', async () => {
      const invalidCredentials = {
        accessToken: 'token',
        accountType: 'business',
      } as any;

      // Clear environment variables
      const originalEnv = process.env;
      process.env = { ...originalEnv };
      delete process.env.AZURE_TENANT_ID;
      delete process.env.AZURE_CLIENT_ID;
      delete process.env.AZURE_CLIENT_SECRET;

      await expect(adapter.initialize(invalidCredentials))
        .rejects.toThrow(ConfigurationError);

      process.env = originalEnv;
    });
  });

  describe('validateCredentials', () => {
    it('should return true for valid credentials', async () => {
      const mockGet = vi.fn().mockResolvedValue({ id: 'user-id', displayName: 'Test User' });
      mockClient.api = vi.fn(() => ({ get: mockGet }));

      const result = await adapter.validateCredentials(credentials);

      expect(result).toBe(true);
      expect(mockClient.api).toHaveBeenCalledWith('/me');
    });

    it('should return false for invalid credentials', async () => {
      const mockGet = vi.fn().mockRejectedValue(new Error('Unauthorized'));
      mockClient.api = vi.fn(() => ({ get: mockGet }));

      const result = await adapter.validateCredentials(credentials);

      expect(result).toBe(false);
    });
  });

  describe('execute - test connection', () => {
    it('should successfully test connection', async () => {
      const mockUser = {
        displayName: 'Test User',
        mail: 'test@example.com',
      };

      const mockDrive = {
        driveType: 'business',
        quota: {
          total: 1000000,
          used: 500000,
          remaining: 500000,
        },
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockGet = vi.fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockDrive);

      mockClient.api = vi.fn(() => ({
        select: mockSelect,
        get: mockGet,
      }));

      const result = await adapter.execute('test', context);

      expect(result).toEqual({
        connected: true,
        user: {
          displayName: 'Test User',
          email: 'test@example.com',
        },
        drive: {
          type: 'business',
          quota: {
            total: 1000000,
            used: 500000,
            remaining: 500000,
            deleted: undefined,
            state: undefined,
          },
          owner: undefined,
        },
        accountType: 'business',
      });
    });
  });

  describe('execute - import document', () => {
    it('should import a document successfully', async () => {
      const mockItem = {
        id: 'file-123',
        name: 'test.docx',
        size: 1024,
        file: {
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
        webUrl: 'https://example.sharepoint.com/test.docx',
        createdDateTime: '2024-01-01T00:00:00Z',
        lastModifiedDateTime: '2024-01-02T00:00:00Z',
        '@microsoft.graph.downloadUrl': 'https://download.url/test.docx',
      };

      const mockGet = vi.fn().mockResolvedValue(mockItem);
      const mockSelect = vi.fn().mockReturnThis();

      mockClient.api = vi.fn(() => ({
        select: mockSelect,
        get: mockGet,
      }));

      // Mock fetch for downloading content
      global.fetch = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue('Document content'),
      });

      const result = await adapter.execute('import_document', context, {
        itemId: 'file-123',
      });

      expect(result).toMatchObject({
        id: 'file-123',
        name: 'test.docx',
        content: 'Document content',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
    });

    it('should throw error when importing a folder', async () => {
      const mockItem = {
        id: 'folder-123',
        name: 'test-folder',
        folder: { childCount: 5 },
      };

      const mockGet = vi.fn().mockResolvedValue(mockItem);
      const mockSelect = vi.fn().mockReturnThis();

      mockClient.api = vi.fn(() => ({
        select: mockSelect,
        get: mockGet,
      }));

      await expect(
        adapter.execute('import_document', context, { itemId: 'folder-123' })
      ).rejects.toThrow(IntegrationError);
    });
  });

  describe('execute - export document', () => {
    it('should export a document successfully', async () => {
      const mockCreatedItem = {
        id: 'new-file-123',
        name: 'exported.docx',
        webUrl: 'https://example.sharepoint.com/exported.docx',
        size: 2048,
        createdDateTime: '2024-01-03T00:00:00Z',
        lastModifiedDateTime: '2024-01-03T00:00:00Z',
      };

      const mockPut = vi.fn().mockResolvedValue(mockCreatedItem);
      const mockHeaders = vi.fn().mockReturnThis();

      mockClient.api = vi.fn(() => ({
        headers: mockHeaders,
        put: mockPut,
      }));

      const result = await adapter.execute('export_document', context, {
        content: 'Test content',
        fileName: 'exported.docx',
      });

      expect(result).toMatchObject({
        id: 'new-file-123',
        name: 'exported.docx',
        webUrl: 'https://example.sharepoint.com/exported.docx',
      });
    });
  });

  describe('execute - list files', () => {
    it('should list files in root folder', async () => {
      const mockResponse = {
        value: [
          { id: 'file-1', name: 'file1.docx', file: {} },
          { id: 'file-2', name: 'file2.xlsx', file: {} },
          { id: 'folder-1', name: 'folder1', folder: {} },
        ],
        '@odata.nextLink': 'https://graph.microsoft.com/next',
      };

      const mockQuery = {
        top: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockResponse),
      };

      mockClient.api = vi.fn(() => mockQuery);

      const result = await adapter.execute('list_files', context, {
        pageSize: 10,
      });

      expect(result).toEqual({
        items: mockResponse.value,
        nextLink: mockResponse['@odata.nextLink'],
        deltaLink: undefined,
      });
    });
  });

  describe('execute - create folder', () => {
    it('should create a folder successfully', async () => {
      const mockCreatedFolder = {
        id: 'folder-123',
        name: 'New Folder',
        webUrl: 'https://example.sharepoint.com/New%20Folder',
        createdDateTime: '2024-01-01T00:00:00Z',
      };

      const mockPost = vi.fn().mockResolvedValue(mockCreatedFolder);
      mockClient.api = vi.fn(() => ({ post: mockPost }));

      const result = await adapter.execute('create_folder', context, {
        name: 'New Folder',
      });

      expect(result).toMatchObject({
        id: 'folder-123',
        name: 'New Folder',
        webUrl: 'https://example.sharepoint.com/New%20Folder',
      });
    });
  });

  describe('execute - share file', () => {
    it('should create a sharing link successfully', async () => {
      const mockLinkResponse = {
        id: 'permission-123',
        link: {
          webUrl: 'https://share.url/file',
          type: 'view',
          scope: 'organization',
        },
      };

      const mockPost = vi.fn().mockResolvedValue(mockLinkResponse);
      mockClient.api = vi.fn(() => ({ post: mockPost }));

      const result = await adapter.execute('share_file', context, {
        itemId: 'file-123',
        type: 'view',
        scope: 'organization',
      });

      expect(result).toMatchObject({
        link: mockLinkResponse.link,
        webUrl: 'https://share.url/file',
      });
    });
  });

  describe('execute - sync folder', () => {
    it('should sync folder changes with delta', async () => {
      const mockResponse = {
        value: [
          {
            id: 'file-1',
            name: 'new-file.docx',
            file: {},
            createdDateTime: '2024-01-01T00:00:00Z',
            lastModifiedDateTime: '2024-01-01T00:00:00Z',
          },
          {
            id: 'file-2',
            name: 'modified-file.xlsx',
            file: {},
            createdDateTime: '2024-01-01T00:00:00Z',
            lastModifiedDateTime: '2024-01-02T00:00:00Z',
          },
          {
            id: 'file-3',
            deleted: { state: 'deleted' },
          },
        ],
        '@odata.deltaLink': 'https://graph.microsoft.com/delta?token=new-token',
      };

      const mockGet = vi.fn().mockResolvedValue(mockResponse);
      mockClient.api = vi.fn(() => ({
        get: mockGet,
        top: vi.fn().mockReturnThis(),
      }));

      const result = await adapter.execute('sync_folder', context);

      expect(result.changes.added).toHaveLength(1);
      expect(result.changes.modified).toHaveLength(1);
      expect(result.changes.deleted).toHaveLength(1);
      expect(result.deltaToken).toBe('new-token');
    });
  });

  describe('execute - error handling', () => {
    it('should handle authentication errors', async () => {
      await expect(
        adapter.execute('test', { ...context, credentials: undefined })
      ).rejects.toThrow(AuthenticationError);
    });

    it('should handle unknown actions', async () => {
      await expect(
        adapter.execute('unknown_action', context)
      ).rejects.toThrow(IntegrationError);
    });

    it('should handle rate limit errors', async () => {
      const mockError = {
        statusCode: 429,
        message: 'Too many requests',
      };

      const mockGet = vi.fn().mockRejectedValue(mockError);
      mockClient.api = vi.fn(() => ({
        get: mockGet,
        select: vi.fn().mockReturnThis(),
      }));

      await expect(
        adapter.execute('test', context)
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('webhook handling', () => {
    it('should handle valid webhook notifications', async () => {
      const headers = {};
      const body = {
        value: [
          {
            subscriptionId: 'sub-123',
            clientState: 'test-state',
            changeType: 'updated',
            resource: '/me/drive/items/file-123',
            resourceData: { id: 'file-123' },
          },
        ],
      };

      // Set up subscription in adapter
      (adapter as any).subscriptions.set('sub-123', {
        id: 'sub-123',
        clientState: 'test-state',
      });

      const result = await adapter.handleWebhook(headers, body);

      expect(result.processed).toBe(1);
      expect(result.notifications[0]).toMatchObject({
        subscriptionId: 'sub-123',
        changeType: 'updated',
        resource: '/me/drive/items/file-123',
      });
    });

    it('should reject invalid webhook notifications', async () => {
      const headers = {};
      const body = { value: [] };

      await expect(
        adapter.handleWebhook(headers, body)
      ).rejects.toThrow('Invalid webhook notification');
    });
  });

  describe('refreshCredentials', () => {
    it('should return credentials as-is for business accounts', async () => {
      const businessCredentials = {
        ...credentials,
        accountType: 'business',
      } as any;

      const result = await adapter.refreshCredentials(businessCredentials);
      expect(result).toEqual(businessCredentials);
    });

    it('should refresh token for personal accounts', async () => {
      const personalCredentials = {
        ...credentials,
        accountType: 'personal',
      } as any;

      // Mock fetch for token refresh
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
        }),
      });

      const result = await adapter.refreshCredentials(personalCredentials);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should throw error for personal account without refresh token', async () => {
      const invalidCredentials = {
        ...credentials,
        accountType: 'personal',
        refreshToken: undefined,
      } as any;

      await expect(
        adapter.refreshCredentials(invalidCredentials)
      ).rejects.toThrow(AuthenticationError);
    });
  });
});