import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { ClientSecretCredential } from '@azure/identity';
import {
  IntegrationAdapter,
  IntegrationContext,
  IntegrationCredentials,
  IntegrationError,
  AuthenticationError,
  ConfigurationError,
  RateLimitExceededException,
} from '../types';

// Types for OneDrive operations
interface OneDriveItem {
  id?: string;
  name?: string;
  size?: number;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  webUrl?: string;
  parentReference?: {
    driveId?: string;
    id?: string;
    path?: string;
  };
  file?: {
    mimeType?: string;
    hashes?: {
      quickXorHash?: string;
      sha1Hash?: string;
      sha256Hash?: string;
    };
  };
  folder?: {
    childCount?: number;
  };
  shared?: {
    scope?: string;
    owner?: {
      user?: {
        displayName?: string;
        email?: string;
      };
    };
  };
  permissions?: Permission[];
  '@microsoft.graph.downloadUrl'?: string;
}

interface Permission {
  id?: string;
  grantedTo?: {
    user?: {
      displayName?: string;
      email?: string;
      id?: string;
    };
  };
  grantedToIdentities?: Array<{
    user?: {
      displayName?: string;
      email?: string;
      id?: string;
    };
  }>;
  roles?: string[];
  link?: {
    scope?: string;
    type?: string;
    webUrl?: string;
  };
  invitation?: {
    email?: string;
    signInRequired?: boolean;
  };
}

interface ShareFilePayload {
  itemId: string;
  type: 'view' | 'edit' | 'embed';
  scope?: 'anonymous' | 'organization' | 'users';
  password?: string;
  expirationDateTime?: string;
  retainInheritedPermissions?: boolean;
  sendInvitation?: boolean;
  recipients?: Array<{
    email: string;
    objectId?: string;
  }>;
  message?: string;
}

interface ImportDocumentPayload {
  itemId: string;
  format?: 'pdf' | 'html' | 'docx' | 'xlsx' | 'pptx' | 'txt';
  includeMetadata?: boolean;
}

interface ExportDocumentPayload {
  content: string | Buffer;
  fileName: string;
  parentId?: string;
  mimeType?: string;
  conflictBehavior?: 'rename' | 'replace' | 'fail';
  description?: string;
}

interface ListFilesPayload {
  folderId?: string;
  pageSize?: number;
  skipToken?: string;
  orderBy?: string;
  filter?: string;
  select?: string;
  expand?: string;
  includePermissions?: boolean;
}

interface CreateFolderPayload {
  name: string;
  parentId?: string;
  description?: string;
  conflictBehavior?: 'rename' | 'replace' | 'fail';
}

interface SyncFolderPayload {
  folderId?: string;
  deltaToken?: string;
  pageSize?: number;
  includeDeleted?: boolean;
}

interface WebhookPayload {
  resource: string;
  changeType: 'created' | 'updated' | 'deleted';
  notificationUrl: string;
  expirationDateTime?: string;
  clientState?: string;
}

interface UploadSession {
  uploadUrl: string;
  expirationDateTime: string;
  nextExpectedRanges?: string[];
}

export class OneDriveAdapter extends IntegrationAdapter {
  private client?: Client;
  private subscriptions: Map<string, any> = new Map();
  private uploadSessions: Map<string, UploadSession> = new Map();
  private accountType: 'personal' | 'business' = 'business';

  /**
   * Initialize Microsoft Graph client with OAuth2 credentials
   */
  async initialize(credentials: IntegrationCredentials): Promise<void> {
    if (!credentials.accessToken) {
      throw new AuthenticationError('OneDrive access token is required');
    }

    const config = credentials as any;

    // Determine account type based on credentials or configuration
    this.accountType = config.accountType || 'business';

    // For business accounts using Azure AD
    if (this.accountType === 'business') {
      const tenantId = config.tenantId || process.env.AZURE_TENANT_ID;
      const clientId = config.clientId || process.env.AZURE_CLIENT_ID;
      const clientSecret = config.clientSecret || process.env.AZURE_CLIENT_SECRET;

      if (!tenantId || !clientId || !clientSecret) {
        throw new ConfigurationError('Azure AD credentials are required for business accounts');
      }

      // Create credential object for Azure AD
      const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
      const authProvider = new TokenCredentialAuthenticationProvider(credential, {
        scopes: ['https://graph.microsoft.com/.default'],
      });

      this.client = Client.initWithMiddleware({
        authProvider,
        defaultVersion: 'v1.0',
      });
    } else {
      // For personal accounts, use the provided access token directly
      this.client = Client.init({
        authProvider: (done) => {
          done(null, credentials.accessToken);
        },
        defaultVersion: 'v1.0',
      });
    }
  }

  /**
   * Execute OneDrive operations
   */
  async execute(
    action: string,
    context: IntegrationContext,
    payload?: any
  ): Promise<any> {
    if (!context.credentials) {
      throw new AuthenticationError('No credentials provided');
    }

    await this.initialize(context.credentials);

    if (!this.client) {
      throw new IntegrationError('OneDrive client not initialized');
    }

    try {
      switch (action) {
        case 'test':
          return this.testConnection();
        case 'import_document':
          return this.importDocument(payload);
        case 'export_document':
          return this.exportDocument(payload);
        case 'list_files':
          return this.listFiles(payload);
        case 'create_folder':
          return this.createFolder(payload);
        case 'share_file':
          return this.shareFile(payload);
        case 'get_permissions':
          return this.getPermissions(payload);
        case 'sync_folder':
          return this.syncFolder(payload);
        case 'delete_item':
          return this.deleteItem(payload);
        case 'move_item':
          return this.moveItem(payload);
        case 'copy_item':
          return this.copyItem(payload);
        case 'rename_item':
          return this.renameItem(payload);
        case 'get_item_metadata':
          return this.getItemMetadata(payload);
        case 'search_items':
          return this.searchItems(payload);
        case 'get_thumbnails':
          return this.getThumbnails(payload);
        case 'create_upload_session':
          return this.createUploadSession(payload);
        case 'upload_chunk':
          return this.uploadChunk(payload);
        case 'create_subscription':
          return this.createSubscription(payload);
        case 'delete_subscription':
          return this.deleteSubscription(payload);
        case 'renew_subscription':
          return this.renewSubscription(payload);
        case 'get_sharing_link':
          return this.getSharingLink(payload);
        case 'remove_permission':
          return this.removePermission(payload);
        case 'get_drive_info':
          return this.getDriveInfo();
        case 'get_recent_files':
          return this.getRecentFiles(payload);
        case 'get_shared_with_me':
          return this.getSharedWithMe(payload);
        default:
          throw new IntegrationError(`Unknown action: ${action}`);
      }
    } catch (error: any) {
      this.handleApiError(error);
    }
  }

  /**
   * Validate OneDrive credentials
   */
  async validateCredentials(credentials: IntegrationCredentials): Promise<boolean> {
    try {
      await this.initialize(credentials);
      const user = await this.client!.api('/me').get();
      return !!user;
    } catch {
      return false;
    }
  }

  /**
   * Refresh OAuth2 access token
   */
  async refreshCredentials(credentials: IntegrationCredentials): Promise<IntegrationCredentials> {
    if (!credentials.refreshToken && this.accountType === 'personal') {
      throw new AuthenticationError('Refresh token is required for personal accounts');
    }

    // For business accounts, Azure AD handles token refresh automatically
    if (this.accountType === 'business') {
      return credentials;
    }

    // For personal accounts, implement OAuth2 token refresh
    const config = credentials as any;
    const clientId = config.clientId || process.env.ONEDRIVE_CLIENT_ID;
    const clientSecret = config.clientSecret || process.env.ONEDRIVE_CLIENT_SECRET;

    const tokenEndpoint = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: credentials.refreshToken!,
      grant_type: 'refresh_token',
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new AuthenticationError('Failed to refresh token');
    }

    const data = await response.json();

    return {
      ...credentials,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || credentials.refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  /**
   * Test connection to OneDrive
   */
  private async testConnection(): Promise<any> {
    const [user, drive] = await Promise.all([
      this.client!.api('/me').select('displayName,mail,userPrincipalName').get(),
      this.client!.api('/me/drive').select('quota,driveType,owner').get(),
    ]);

    return {
      connected: true,
      user: {
        displayName: user.displayName,
        email: user.mail || user.userPrincipalName,
      },
      drive: {
        type: drive.driveType,
        quota: {
          total: drive.quota?.total,
          used: drive.quota?.used,
          remaining: drive.quota?.remaining,
          deleted: drive.quota?.deleted,
          state: drive.quota?.state,
        },
        owner: drive.owner,
      },
      accountType: this.accountType,
    };
  }

  /**
   * Import a document from OneDrive
   */
  private async importDocument(payload: ImportDocumentPayload): Promise<any> {
    if (!payload.itemId) {
      throw new IntegrationError('Item ID is required');
    }

    // Get item metadata
    const item: OneDriveItem = await this.client!
      .api(`/me/drive/items/${payload.itemId}`)
      .select('id,name,size,file,folder,webUrl,createdDateTime,lastModifiedDateTime,parentReference')
      .get();

    if (item.folder) {
      throw new IntegrationError('Cannot import a folder as a document');
    }

    // Get download URL
    const downloadUrl = item['@microsoft.graph.downloadUrl'];
    if (!downloadUrl) {
      // For some file types, we need to request the content differently
      const contentStream = await this.client!
        .api(`/me/drive/items/${payload.itemId}/content`)
        .get();

      return {
        id: item.id,
        name: item.name,
        mimeType: item.file?.mimeType,
        content: contentStream,
        metadata: {
          size: item.size,
          createdDateTime: item.createdDateTime,
          lastModifiedDateTime: item.lastModifiedDateTime,
          webUrl: item.webUrl,
          parentPath: item.parentReference?.path,
        },
      };
    }

    // Download the file content
    const response = await fetch(downloadUrl);
    const content = await response.text();

    // Convert format if requested
    if (payload.format && payload.format !== 'txt') {
      // For Office documents, use the convert endpoint
      const convertedContent = await this.convertDocument(payload.itemId, payload.format);
      return {
        id: item.id,
        name: item.name,
        mimeType: this.getMimeTypeForFormat(payload.format),
        content: convertedContent,
        metadata: {
          size: item.size,
          createdDateTime: item.createdDateTime,
          lastModifiedDateTime: item.lastModifiedDateTime,
          webUrl: item.webUrl,
          parentPath: item.parentReference?.path,
          originalMimeType: item.file?.mimeType,
        },
      };
    }

    return {
      id: item.id,
      name: item.name,
      mimeType: item.file?.mimeType,
      content,
      metadata: payload.includeMetadata ? {
        size: item.size,
        createdDateTime: item.createdDateTime,
        lastModifiedDateTime: item.lastModifiedDateTime,
        webUrl: item.webUrl,
        parentPath: item.parentReference?.path,
        hashes: item.file?.hashes,
      } : undefined,
    };
  }

  /**
   * Export a document to OneDrive
   */
  private async exportDocument(payload: ExportDocumentPayload): Promise<any> {
    if (!payload.content || !payload.fileName) {
      throw new IntegrationError('Content and fileName are required');
    }

    const parentPath = payload.parentId
      ? `/me/drive/items/${payload.parentId}`
      : '/me/drive/root';

    const conflictBehavior = payload.conflictBehavior || 'rename';
    const uploadPath = `${parentPath}:/${payload.fileName}:/content`;

    // Determine content type
    const contentType = payload.mimeType || this.getMimeTypeFromFileName(payload.fileName);

    // Handle large files with upload session
    const content = typeof payload.content === 'string'
      ? Buffer.from(payload.content)
      : payload.content;

    if (content.length > 4 * 1024 * 1024) { // Files larger than 4MB
      return this.uploadLargeFile({
        fileName: payload.fileName,
        parentId: payload.parentId,
        content,
        mimeType: contentType,
        description: payload.description,
      });
    }

    // Upload small files directly
    const uploadUrl = conflictBehavior === 'rename'
      ? `${uploadPath}?@microsoft.graph.conflictBehavior=rename`
      : conflictBehavior === 'replace'
      ? `${uploadPath}?@microsoft.graph.conflictBehavior=replace`
      : uploadPath;

    const item: OneDriveItem = await this.client!
      .api(uploadUrl)
      .headers({
        'Content-Type': contentType,
      })
      .put(content);

    // Add description if provided
    if (payload.description && item.id) {
      await this.client!
        .api(`/me/drive/items/${item.id}`)
        .patch({
          description: payload.description,
        });
    }

    return {
      id: item.id,
      name: item.name,
      webUrl: item.webUrl,
      size: item.size,
      createdDateTime: item.createdDateTime,
      lastModifiedDateTime: item.lastModifiedDateTime,
    };
  }

  /**
   * List files in OneDrive
   */
  private async listFiles(payload: ListFilesPayload = {}): Promise<any> {
    const basePath = payload.folderId
      ? `/me/drive/items/${payload.folderId}/children`
      : '/me/drive/root/children';

    let query = this.client!.api(basePath);

    // Apply query parameters
    if (payload.pageSize) {
      query = query.top(payload.pageSize);
    }
    if (payload.skipToken) {
      query = query.skipToken(payload.skipToken);
    }
    if (payload.orderBy) {
      query = query.orderby(payload.orderBy);
    }
    if (payload.filter) {
      query = query.filter(payload.filter);
    }
    if (payload.select) {
      query = query.select(payload.select);
    } else {
      query = query.select('id,name,size,file,folder,webUrl,createdDateTime,lastModifiedDateTime,shared');
    }
    if (payload.expand) {
      query = query.expand(payload.expand);
    }
    if (payload.includePermissions) {
      query = query.expand('permissions');
    }

    const response = await query.get();

    return {
      items: response.value || [],
      nextLink: response['@odata.nextLink'],
      deltaLink: response['@odata.deltaLink'],
    };
  }

  /**
   * Create a folder in OneDrive
   */
  private async createFolder(payload: CreateFolderPayload): Promise<any> {
    if (!payload.name) {
      throw new IntegrationError('Folder name is required');
    }

    const parentPath = payload.parentId
      ? `/me/drive/items/${payload.parentId}/children`
      : '/me/drive/root/children';

    const folderData: any = {
      name: payload.name,
      folder: {},
      '@microsoft.graph.conflictBehavior': payload.conflictBehavior || 'rename',
    };

    if (payload.description) {
      folderData.description = payload.description;
    }

    const item: OneDriveItem = await this.client!
      .api(parentPath)
      .post(folderData);

    return {
      id: item.id,
      name: item.name,
      webUrl: item.webUrl,
      createdDateTime: item.createdDateTime,
      parentPath: item.parentReference?.path,
    };
  }

  /**
   * Share a file with users
   */
  private async shareFile(payload: ShareFilePayload): Promise<any> {
    if (!payload.itemId) {
      throw new IntegrationError('Item ID is required');
    }

    const createLinkData: any = {
      type: payload.type,
      scope: payload.scope || 'organization',
    };

    if (payload.password) {
      createLinkData.password = payload.password;
    }
    if (payload.expirationDateTime) {
      createLinkData.expirationDateTime = payload.expirationDateTime;
    }
    if (payload.retainInheritedPermissions !== undefined) {
      createLinkData.retainInheritedPermissions = payload.retainInheritedPermissions;
    }

    // Create sharing link
    const linkResponse = await this.client!
      .api(`/me/drive/items/${payload.itemId}/createLink`)
      .post(createLinkData);

    // Send invitation if recipients are provided
    if (payload.sendInvitation && payload.recipients && payload.recipients.length > 0) {
      const inviteData = {
        requireSignIn: true,
        sendInvitation: true,
        roles: [payload.type === 'view' ? 'read' : 'write'],
        recipients: payload.recipients.map(r => ({
          email: r.email,
          objectId: r.objectId,
        })),
        message: payload.message || 'Please access the shared file',
      };

      await this.client!
        .api(`/me/drive/items/${payload.itemId}/invite`)
        .post(inviteData);
    }

    return {
      link: linkResponse.link,
      id: linkResponse.id,
      webUrl: linkResponse.link?.webUrl,
      type: linkResponse.link?.type,
      scope: linkResponse.link?.scope,
    };
  }

  /**
   * Get file permissions
   */
  private async getPermissions(payload: { itemId: string }): Promise<any> {
    if (!payload.itemId) {
      throw new IntegrationError('Item ID is required');
    }

    const response = await this.client!
      .api(`/me/drive/items/${payload.itemId}/permissions`)
      .expand('grantedToIdentities')
      .get();

    return response.value || [];
  }

  /**
   * Sync folder contents with delta changes
   */
  private async syncFolder(payload: SyncFolderPayload = {}): Promise<any> {
    const basePath = payload.folderId
      ? `/me/drive/items/${payload.folderId}/delta`
      : '/me/drive/root/delta';

    let query = this.client!.api(basePath);

    if (payload.deltaToken) {
      // Use delta token to get changes since last sync
      query = this.client!.api(`${basePath}?token=${payload.deltaToken}`);
    } else if (payload.pageSize) {
      query = query.top(payload.pageSize);
    }

    const response = await query.get();

    const changes = {
      added: [] as OneDriveItem[],
      modified: [] as OneDriveItem[],
      deleted: [] as string[],
    };

    // Process delta changes
    for (const item of response.value || []) {
      if (item.deleted) {
        if (payload.includeDeleted !== false) {
          changes.deleted.push(item.id);
        }
      } else if (item.file || item.folder) {
        // Check if item is new or modified based on created vs modified time
        const created = new Date(item.createdDateTime);
        const modified = new Date(item.lastModifiedDateTime);

        if (Math.abs(created.getTime() - modified.getTime()) < 1000) {
          changes.added.push(item);
        } else {
          changes.modified.push(item);
        }
      }
    }

    return {
      changes,
      nextLink: response['@odata.nextLink'],
      deltaLink: response['@odata.deltaLink'],
      deltaToken: this.extractDeltaToken(response['@odata.deltaLink']),
    };
  }

  /**
   * Delete an item
   */
  private async deleteItem(payload: { itemId: string }): Promise<void> {
    if (!payload.itemId) {
      throw new IntegrationError('Item ID is required');
    }

    await this.client!.api(`/me/drive/items/${payload.itemId}`).delete();
  }

  /**
   * Move an item to a different folder
   */
  private async moveItem(payload: {
    itemId: string;
    destinationId: string;
    newName?: string
  }): Promise<any> {
    if (!payload.itemId || !payload.destinationId) {
      throw new IntegrationError('Item ID and destination ID are required');
    }

    const updateData: any = {
      parentReference: {
        id: payload.destinationId,
      },
    };

    if (payload.newName) {
      updateData.name = payload.newName;
    }

    const item: OneDriveItem = await this.client!
      .api(`/me/drive/items/${payload.itemId}`)
      .patch(updateData);

    return {
      id: item.id,
      name: item.name,
      webUrl: item.webUrl,
      parentPath: item.parentReference?.path,
    };
  }

  /**
   * Copy an item
   */
  private async copyItem(payload: {
    itemId: string;
    destinationId?: string;
    name?: string;
  }): Promise<any> {
    if (!payload.itemId) {
      throw new IntegrationError('Item ID is required');
    }

    const copyData: any = {};

    if (payload.destinationId) {
      copyData.parentReference = {
        id: payload.destinationId,
      };
    }

    if (payload.name) {
      copyData.name = payload.name;
    }

    // Copy operation returns a Location header with the monitor URL
    const response = await this.client!
      .api(`/me/drive/items/${payload.itemId}/copy`)
      .post(copyData);

    // The copy operation is asynchronous
    // Return the monitor URL for tracking progress
    const monitorUrl = response.headers.get('Location');

    // Wait for copy to complete (simplified - in production, poll the monitor URL)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get the copied item details
    if (monitorUrl) {
      const statusResponse = await fetch(monitorUrl, {
        headers: {
          Authorization: `Bearer ${(await this.client!.api('/me').getStream()).req.headers.authorization}`,
        },
      });

      const status = await statusResponse.json();

      if (status.status === 'completed') {
        return {
          id: status.resourceId,
          monitorUrl,
          status: 'completed',
        };
      }
    }

    return {
      monitorUrl,
      status: 'inProgress',
    };
  }

  /**
   * Rename an item
   */
  private async renameItem(payload: { itemId: string; newName: string }): Promise<any> {
    if (!payload.itemId || !payload.newName) {
      throw new IntegrationError('Item ID and new name are required');
    }

    const item: OneDriveItem = await this.client!
      .api(`/me/drive/items/${payload.itemId}`)
      .patch({ name: payload.newName });

    return {
      id: item.id,
      name: item.name,
      webUrl: item.webUrl,
    };
  }

  /**
   * Get item metadata
   */
  private async getItemMetadata(payload: {
    itemId: string;
    expand?: string;
    select?: string;
  }): Promise<any> {
    if (!payload.itemId) {
      throw new IntegrationError('Item ID is required');
    }

    let query = this.client!.api(`/me/drive/items/${payload.itemId}`);

    if (payload.select) {
      query = query.select(payload.select);
    }

    if (payload.expand) {
      query = query.expand(payload.expand);
    }

    return query.get();
  }

  /**
   * Search for items
   */
  private async searchItems(payload: {
    query: string;
    scope?: 'drive' | 'sharedWithMe' | 'site';
    pageSize?: number;
    select?: string;
  }): Promise<any> {
    if (!payload.query) {
      throw new IntegrationError('Search query is required');
    }

    const searchPath = payload.scope === 'sharedWithMe'
      ? '/me/drive/sharedWithMe'
      : '/me/drive/root/search';

    let query = this.client!
      .api(searchPath)
      .query({ q: payload.query });

    if (payload.pageSize) {
      query = query.top(payload.pageSize);
    }

    if (payload.select) {
      query = query.select(payload.select);
    }

    const response = await query.get();

    return {
      items: response.value || [],
      nextLink: response['@odata.nextLink'],
    };
  }

  /**
   * Get thumbnails for an item
   */
  private async getThumbnails(payload: {
    itemId: string;
    size?: 'small' | 'medium' | 'large';
  }): Promise<any> {
    if (!payload.itemId) {
      throw new IntegrationError('Item ID is required');
    }

    const response = await this.client!
      .api(`/me/drive/items/${payload.itemId}/thumbnails`)
      .get();

    const thumbnailSet = response.value?.[0];
    if (!thumbnailSet) {
      return null;
    }

    const size = payload.size || 'medium';
    return thumbnailSet[size] || thumbnailSet.medium || thumbnailSet.large || thumbnailSet.small;
  }

  /**
   * Create an upload session for large files
   */
  private async createUploadSession(payload: {
    fileName: string;
    parentId?: string;
    conflictBehavior?: 'rename' | 'replace' | 'fail';
  }): Promise<any> {
    if (!payload.fileName) {
      throw new IntegrationError('File name is required');
    }

    const parentPath = payload.parentId
      ? `/me/drive/items/${payload.parentId}`
      : '/me/drive/root';

    const uploadPath = `${parentPath}:/${payload.fileName}:/createUploadSession`;

    const sessionData: any = {
      item: {
        '@microsoft.graph.conflictBehavior': payload.conflictBehavior || 'rename',
      },
    };

    const session: UploadSession = await this.client!
      .api(uploadPath)
      .post(sessionData);

    // Store session for chunk uploads
    const sessionId = `session-${Date.now()}`;
    this.uploadSessions.set(sessionId, session);

    return {
      sessionId,
      uploadUrl: session.uploadUrl,
      expirationDateTime: session.expirationDateTime,
    };
  }

  /**
   * Upload a chunk of a large file
   */
  private async uploadChunk(payload: {
    sessionId: string;
    content: Buffer;
    rangeStart: number;
    rangeEnd: number;
    totalSize: number;
  }): Promise<any> {
    const session = this.uploadSessions.get(payload.sessionId);
    if (!session) {
      throw new IntegrationError('Upload session not found');
    }

    const headers = {
      'Content-Length': `${payload.content.length}`,
      'Content-Range': `bytes ${payload.rangeStart}-${payload.rangeEnd}/${payload.totalSize}`,
    };

    const response = await fetch(session.uploadUrl, {
      method: 'PUT',
      headers,
      body: payload.content as any, // Buffer is compatible with BodyInit
    });

    const data = await response.json();

    // If upload is complete, clean up session
    if (response.status === 200 || response.status === 201) {
      this.uploadSessions.delete(payload.sessionId);
      return {
        completed: true,
        item: data,
      };
    }

    return {
      completed: false,
      nextExpectedRanges: data.nextExpectedRanges,
    };
  }

  /**
   * Create a webhook subscription
   */
  private async createSubscription(payload: WebhookPayload): Promise<any> {
    const subscriptionData = {
      changeType: payload.changeType,
      notificationUrl: payload.notificationUrl,
      resource: payload.resource,
      expirationDateTime: payload.expirationDateTime ||
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
      clientState: payload.clientState || this.generateClientState(),
    };

    const subscription = await this.client!
      .api('/subscriptions')
      .post(subscriptionData);

    // Store subscription for management
    this.subscriptions.set(subscription.id, subscription);

    return subscription;
  }

  /**
   * Delete a webhook subscription
   */
  private async deleteSubscription(payload: { subscriptionId: string }): Promise<void> {
    if (!payload.subscriptionId) {
      throw new IntegrationError('Subscription ID is required');
    }

    await this.client!.api(`/subscriptions/${payload.subscriptionId}`).delete();
    this.subscriptions.delete(payload.subscriptionId);
  }

  /**
   * Renew a webhook subscription
   */
  private async renewSubscription(payload: {
    subscriptionId: string;
    expirationDateTime?: string;
  }): Promise<any> {
    if (!payload.subscriptionId) {
      throw new IntegrationError('Subscription ID is required');
    }

    const expirationDateTime = payload.expirationDateTime ||
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const subscription = await this.client!
      .api(`/subscriptions/${payload.subscriptionId}`)
      .patch({ expirationDateTime });

    this.subscriptions.set(subscription.id, subscription);

    return subscription;
  }

  /**
   * Get a sharing link for an item
   */
  private async getSharingLink(payload: { itemId: string }): Promise<any> {
    if (!payload.itemId) {
      throw new IntegrationError('Item ID is required');
    }

    const permissions = await this.client!
      .api(`/me/drive/items/${payload.itemId}/permissions`)
      .filter('link ne null')
      .get();

    return permissions.value || [];
  }

  /**
   * Remove a permission from an item
   */
  private async removePermission(payload: {
    itemId: string;
    permissionId: string;
  }): Promise<void> {
    if (!payload.itemId || !payload.permissionId) {
      throw new IntegrationError('Item ID and permission ID are required');
    }

    await this.client!
      .api(`/me/drive/items/${payload.itemId}/permissions/${payload.permissionId}`)
      .delete();
  }

  /**
   * Get drive information
   */
  private async getDriveInfo(): Promise<any> {
    return this.client!.api('/me/drive').get();
  }

  /**
   * Get recent files
   */
  private async getRecentFiles(payload: { pageSize?: number } = {}): Promise<any> {
    const response = await this.client!
      .api('/me/drive/recent')
      .top(payload.pageSize || 20)
      .get();

    return {
      items: response.value || [],
      nextLink: response['@odata.nextLink'],
    };
  }

  /**
   * Get files shared with the user
   */
  private async getSharedWithMe(payload: { pageSize?: number } = {}): Promise<any> {
    const response = await this.client!
      .api('/me/drive/sharedWithMe')
      .top(payload.pageSize || 20)
      .get();

    return {
      items: response.value || [],
      nextLink: response['@odata.nextLink'],
    };
  }

  /**
   * Handle webhook notifications
   */
  async handleWebhook(headers: Record<string, string>, body: any): Promise<any> {
    // Validate the webhook
    const clientState = body.value?.[0]?.clientState;
    const subscriptionId = body.value?.[0]?.subscriptionId;

    if (!subscriptionId) {
      throw new IntegrationError('Invalid webhook notification');
    }

    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription || subscription.clientState !== clientState) {
      throw new IntegrationError('Invalid webhook client state');
    }

    // Process notifications
    const notifications = body.value || [];
    const results = [];

    for (const notification of notifications) {
      results.push({
        subscriptionId: notification.subscriptionId,
        changeType: notification.changeType,
        resource: notification.resource,
        resourceData: notification.resourceData,
        clientState: notification.clientState,
        tenantId: notification.tenantId,
      });
    }

    return {
      processed: results.length,
      notifications: results,
    };
  }

  /**
   * Upload large file with session
   */
  private async uploadLargeFile(payload: {
    fileName: string;
    parentId?: string;
    content: Buffer;
    mimeType?: string;
    description?: string;
  }): Promise<any> {
    // Create upload session
    const session = await this.createUploadSession({
      fileName: payload.fileName,
      parentId: payload.parentId,
    });

    const chunkSize = 10 * 1024 * 1024; // 10MB chunks
    const totalSize = payload.content.length;
    let uploadedItem = null;

    for (let start = 0; start < totalSize; start += chunkSize) {
      const end = Math.min(start + chunkSize, totalSize) - 1;
      const chunk = payload.content.slice(start, end + 1);

      const result = await this.uploadChunk({
        sessionId: session.sessionId,
        content: chunk,
        rangeStart: start,
        rangeEnd: end,
        totalSize,
      });

      if (result.completed) {
        uploadedItem = result.item;
        break;
      }
    }

    // Add description if provided
    if (uploadedItem && payload.description) {
      await this.client!
        .api(`/me/drive/items/${uploadedItem.id}`)
        .patch({ description: payload.description });
    }

    return uploadedItem;
  }

  /**
   * Convert document to different format
   */
  private async convertDocument(itemId: string, format: string): Promise<any> {
    const formatMap: Record<string, string> = {
      pdf: 'application/pdf',
      html: 'text/html',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
    };

    const mimeType = formatMap[format] || 'text/plain';

    const response = await this.client!
      .api(`/me/drive/items/${itemId}/content`)
      .query({ format })
      .get();

    return response;
  }

  /**
   * Extract delta token from delta link
   */
  private extractDeltaToken(deltaLink?: string): string | undefined {
    if (!deltaLink) return undefined;
    const match = deltaLink.match(/token=([^&]+)/);
    return match ? match[1] : undefined;
  }

  /**
   * Generate client state for webhooks
   */
  private generateClientState(): string {
    return Buffer.from(Math.random().toString(36).substring(2, 15)).toString('base64');
  }

  /**
   * Get MIME type for file format
   */
  private getMimeTypeForFormat(format: string): string {
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      html: 'text/html',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
    };
    return mimeTypes[format] || 'application/octet-stream';
  }

  /**
   * Get MIME type from file name
   */
  private getMimeTypeFromFileName(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      txt: 'text/plain',
      html: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      json: 'application/json',
      xml: 'application/xml',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      mp3: 'audio/mpeg',
      mp4: 'video/mp4',
      zip: 'application/zip',
    };
    return mimeTypes[extension || ''] || 'application/octet-stream';
  }

  /**
   * Handle Microsoft Graph API errors
   */
  private handleApiError(error: any): never {
    const statusCode = error.statusCode || error.status;
    const message = error.message || error.error?.message || 'Unknown error';
    const code = error.code || error.error?.code;

    switch (statusCode) {
      case 401:
        throw new AuthenticationError(`OneDrive authentication failed: ${message}`);
      case 403:
        throw new IntegrationError(`Permission denied: ${message}`, 'PERMISSION_DENIED', 403);
      case 404:
        throw new IntegrationError(`Resource not found: ${message}`, 'NOT_FOUND', 404);
      case 429:
        throw new RateLimitExceededException(`Rate limit exceeded: ${message}`);
      case 400:
        if (code === 'invalidRequest') {
          throw new ConfigurationError(`Invalid request: ${message}`);
        }
        throw new IntegrationError(`Bad request: ${message}`, 'BAD_REQUEST', 400);
      case 409:
        throw new IntegrationError(`Conflict: ${message}`, 'CONFLICT', 409);
      case 507:
        throw new IntegrationError(`Insufficient storage: ${message}`, 'INSUFFICIENT_STORAGE', 507);
      case 500:
      case 502:
      case 503:
      case 504:
        throw new IntegrationError(`OneDrive service error: ${message}`, 'SERVICE_ERROR', statusCode);
      default:
        throw new IntegrationError(`OneDrive API error: ${message}`, code || 'API_ERROR', statusCode);
    }
  }
}