import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import {
  IntegrationAdapter,
  IntegrationContext,
  IntegrationCredentials,
  IntegrationError,
  AuthenticationError,
  ConfigurationError,
} from '../types';

interface GoogleDriveFile {
  id?: string | null;
  name?: string | null;
  mimeType?: string | null;
  parents?: string[] | null;
  webViewLink?: string | null;
  webContentLink?: string | null;
  createdTime?: string | null;
  modifiedTime?: string | null;
  size?: string | null;
  owners?: Array<{
    displayName?: string | null;
    emailAddress?: string | null;
  }> | null;
  permissions?: drive_v3.Schema$Permission[] | null;
}

interface ShareFilePayload {
  fileId: string;
  email?: string;
  domain?: string;
  role: 'reader' | 'writer' | 'commenter' | 'owner';
  type: 'user' | 'group' | 'domain' | 'anyone';
  sendNotificationEmail?: boolean;
  emailMessage?: string;
}

interface ExportDocumentPayload {
  content: string;
  title: string;
  folderId?: string;
  mimeType?: 'application/vnd.google-apps.document' | 'application/vnd.google-apps.spreadsheet' | 'application/vnd.google-apps.presentation';
  format?: 'html' | 'markdown' | 'plain';
}

interface ImportDocumentPayload {
  fileId: string;
  format?: 'text/html' | 'text/plain' | 'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

interface ListFilesPayload {
  folderId?: string;
  query?: string;
  pageSize?: number;
  pageToken?: string;
  orderBy?: string;
  includePermissions?: boolean;
}

interface CreateFolderPayload {
  name: string;
  parentId?: string;
  description?: string;
  starred?: boolean;
}

interface WebhookPayload {
  fileId?: string;
  resourceId?: string;
  expiration?: number;
  address?: string;
  type?: 'web_hook';
  token?: string;
}

export class GoogleDriveAdapter extends IntegrationAdapter {
  private oauth2Client?: OAuth2Client;
  private drive?: drive_v3.Drive;
  private watchChannels: Map<string, any> = new Map();

  /**
   * Initialize Google Drive API client with OAuth2 credentials
   */
  async initialize(credentials: IntegrationCredentials): Promise<void> {
    if (!credentials.accessToken) {
      throw new AuthenticationError('Google Drive access token is required');
    }

    // Extract OAuth2 configuration from credentials
    const config = credentials as any;
    const clientId = config.clientId || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = config.clientSecret || process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new ConfigurationError('Google OAuth2 client credentials are required');
    }

    // Initialize OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      config.redirectUri || process.env.GOOGLE_REDIRECT_URI
    );

    // Set credentials
    this.oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
      expiry_date: credentials.expiresAt?.getTime(),
    });

    // Handle token refresh automatically
    this.oauth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        // Store the new refresh token
        credentials.refreshToken = tokens.refresh_token;
      }
      credentials.accessToken = tokens.access_token || credentials.accessToken;
      if (tokens.expiry_date) {
        credentials.expiresAt = new Date(tokens.expiry_date);
      }
    });

    // Initialize Google Drive API
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Execute Google Drive operations
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

    if (!this.drive) {
      throw new IntegrationError('Google Drive client not initialized');
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
        case 'delete_file':
          return this.deleteFile(payload);
        case 'move_file':
          return this.moveFile(payload);
        case 'copy_file':
          return this.copyFile(payload);
        case 'get_file_metadata':
          return this.getFileMetadata(payload);
        case 'search_files':
          return this.searchFiles(payload);
        case 'create_webhook':
          return this.createWebhook(payload);
        case 'delete_webhook':
          return this.deleteWebhook(payload);
        default:
          throw new IntegrationError(`Unknown action: ${action}`);
      }
    } catch (error: any) {
      this.handleApiError(error);
    }
  }

  /**
   * Validate Google Drive credentials
   */
  async validateCredentials(credentials: IntegrationCredentials): Promise<boolean> {
    try {
      await this.initialize(credentials);
      const response = await this.drive!.about.get({
        fields: 'user',
      });
      return !!response.data.user;
    } catch {
      return false;
    }
  }

  /**
   * Refresh OAuth2 access token
   */
  async refreshCredentials(credentials: IntegrationCredentials): Promise<IntegrationCredentials> {
    if (!credentials.refreshToken) {
      throw new AuthenticationError('Refresh token is required');
    }

    await this.initialize(credentials);

    const { credentials: newCredentials } = await this.oauth2Client!.refreshAccessToken();

    return {
      ...credentials,
      accessToken: newCredentials.access_token || credentials.accessToken,
      refreshToken: newCredentials.refresh_token || credentials.refreshToken,
      expiresAt: newCredentials.expiry_date ? new Date(newCredentials.expiry_date) : undefined,
    };
  }

  /**
   * Test connection to Google Drive
   */
  private async testConnection(): Promise<any> {
    const response = await this.drive!.about.get({
      fields: 'user, storageQuota',
    });

    return {
      connected: true,
      user: {
        displayName: response.data.user?.displayName,
        emailAddress: response.data.user?.emailAddress,
        photoLink: response.data.user?.photoLink,
      },
      storageQuota: {
        limit: response.data.storageQuota?.limit,
        usage: response.data.storageQuota?.usage,
        usageInDrive: response.data.storageQuota?.usageInDrive,
        usageInDriveTrash: response.data.storageQuota?.usageInDriveTrash,
      },
    };
  }

  /**
   * Import a document from Google Drive
   */
  private async importDocument(payload: ImportDocumentPayload): Promise<any> {
    if (!payload.fileId) {
      throw new IntegrationError('File ID is required');
    }

    // Get file metadata
    const metadataResponse = await this.drive!.files.get({
      fileId: payload.fileId,
      fields: 'id, name, mimeType, createdTime, modifiedTime, owners, webViewLink',
    });

    const file = metadataResponse.data;
    let content: string = '';

    // Export Google Docs/Sheets/Slides to desired format
    if (file.mimeType?.startsWith('application/vnd.google-apps')) {
      const exportMimeType = payload.format || this.getExportMimeType(file.mimeType);

      const exportResponse = await this.drive!.files.export({
        fileId: payload.fileId,
        mimeType: exportMimeType,
      }, { responseType: 'text' });

      content = exportResponse.data as string;
    } else {
      // Download regular files
      const downloadResponse = await this.drive!.files.get({
        fileId: payload.fileId,
        alt: 'media',
      }, { responseType: 'text' });

      content = downloadResponse.data as string;
    }

    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      content,
      metadata: {
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
        owners: file.owners,
        webViewLink: file.webViewLink,
      },
    };
  }

  /**
   * Export a document to Google Drive
   */
  private async exportDocument(payload: ExportDocumentPayload): Promise<any> {
    if (!payload.content || !payload.title) {
      throw new IntegrationError('Content and title are required');
    }

    const mimeType = payload.mimeType || 'application/vnd.google-apps.document';
    const parents = payload.folderId ? [payload.folderId] : [];

    // Convert content based on format
    let convertedContent = payload.content;
    if (payload.format === 'markdown') {
      // Convert markdown to HTML for Google Docs
      convertedContent = this.markdownToHtml(payload.content);
    }

    // Create file metadata
    const fileMetadata: drive_v3.Schema$File = {
      name: payload.title,
      mimeType,
      parents,
    };

    // Create the file
    const response = await this.drive!.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: 'text/html',
        body: convertedContent,
      },
      fields: 'id, name, webViewLink, webContentLink, createdTime',
    });

    return {
      id: response.data.id,
      name: response.data.name,
      webViewLink: response.data.webViewLink,
      webContentLink: response.data.webContentLink,
      createdTime: response.data.createdTime,
    };
  }

  /**
   * List files in Google Drive
   */
  private async listFiles(payload: ListFilesPayload = {}): Promise<any> {
    let query = payload.query || '';

    // Add folder filter if specified
    if (payload.folderId) {
      query = query ? `${query} and '${payload.folderId}' in parents` : `'${payload.folderId}' in parents`;
    }

    // Add trashed filter
    if (!query.includes('trashed')) {
      query = query ? `${query} and trashed = false` : 'trashed = false';
    }

    const fields = payload.includePermissions
      ? 'nextPageToken, files(id, name, mimeType, parents, webViewLink, webContentLink, createdTime, modifiedTime, size, owners, permissions)'
      : 'nextPageToken, files(id, name, mimeType, parents, webViewLink, webContentLink, createdTime, modifiedTime, size, owners)';

    const response = await this.drive!.files.list({
      q: query,
      pageSize: payload.pageSize || 100,
      pageToken: payload.pageToken,
      orderBy: payload.orderBy || 'modifiedTime desc',
      fields,
    });

    return {
      files: response.data.files || [],
      nextPageToken: response.data.nextPageToken,
    };
  }

  /**
   * Create a folder in Google Drive
   */
  private async createFolder(payload: CreateFolderPayload): Promise<any> {
    if (!payload.name) {
      throw new IntegrationError('Folder name is required');
    }

    const fileMetadata: drive_v3.Schema$File = {
      name: payload.name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: payload.parentId ? [payload.parentId] : [],
      description: payload.description,
      starred: payload.starred,
    };

    const response = await this.drive!.files.create({
      requestBody: fileMetadata,
      fields: 'id, name, webViewLink, createdTime',
    });

    return {
      id: response.data.id,
      name: response.data.name,
      webViewLink: response.data.webViewLink,
      createdTime: response.data.createdTime,
    };
  }

  /**
   * Share a file with users
   */
  private async shareFile(payload: ShareFilePayload): Promise<any> {
    if (!payload.fileId) {
      throw new IntegrationError('File ID is required');
    }

    const permission: drive_v3.Schema$Permission = {
      type: payload.type,
      role: payload.role,
      emailAddress: payload.email,
      domain: payload.domain,
    };

    const response = await this.drive!.permissions.create({
      fileId: payload.fileId,
      requestBody: permission,
      sendNotificationEmail: payload.sendNotificationEmail !== false,
      emailMessage: payload.emailMessage,
      fields: 'id, type, role, emailAddress, domain, displayName',
    });

    return {
      id: response.data.id,
      type: response.data.type,
      role: response.data.role,
      emailAddress: response.data.emailAddress,
      domain: response.data.domain,
      displayName: response.data.displayName,
    };
  }

  /**
   * Get file permissions
   */
  private async getPermissions(payload: { fileId: string }): Promise<any> {
    if (!payload.fileId) {
      throw new IntegrationError('File ID is required');
    }

    const response = await this.drive!.permissions.list({
      fileId: payload.fileId,
      fields: 'permissions(id, type, role, emailAddress, domain, displayName, photoLink, deleted)',
    });

    return response.data.permissions || [];
  }

  /**
   * Delete a file
   */
  private async deleteFile(payload: { fileId: string }): Promise<void> {
    if (!payload.fileId) {
      throw new IntegrationError('File ID is required');
    }

    await this.drive!.files.delete({
      fileId: payload.fileId,
    });
  }

  /**
   * Move a file to a different folder
   */
  private async moveFile(payload: { fileId: string; newParentId: string }): Promise<any> {
    if (!payload.fileId || !payload.newParentId) {
      throw new IntegrationError('File ID and new parent ID are required');
    }

    // Get current parents
    const file = await this.drive!.files.get({
      fileId: payload.fileId,
      fields: 'parents',
    });

    // Remove from current parents and add to new parent
    const previousParents = file.data.parents ? file.data.parents.join(',') : '';

    const response = await this.drive!.files.update({
      fileId: payload.fileId,
      addParents: payload.newParentId,
      removeParents: previousParents,
      fields: 'id, name, parents',
    });

    return {
      id: response.data.id,
      name: response.data.name,
      parents: response.data.parents,
    };
  }

  /**
   * Copy a file
   */
  private async copyFile(payload: { fileId: string; name?: string; parentId?: string }): Promise<any> {
    if (!payload.fileId) {
      throw new IntegrationError('File ID is required');
    }

    const requestBody: drive_v3.Schema$File = {};
    if (payload.name) requestBody.name = payload.name;
    if (payload.parentId) requestBody.parents = [payload.parentId];

    const response = await this.drive!.files.copy({
      fileId: payload.fileId,
      requestBody,
      fields: 'id, name, webViewLink, createdTime',
    });

    return {
      id: response.data.id,
      name: response.data.name,
      webViewLink: response.data.webViewLink,
      createdTime: response.data.createdTime,
    };
  }

  /**
   * Get file metadata
   */
  private async getFileMetadata(payload: { fileId: string; fields?: string }): Promise<any> {
    if (!payload.fileId) {
      throw new IntegrationError('File ID is required');
    }

    const fields = payload.fields || 'id, name, mimeType, parents, webViewLink, webContentLink, createdTime, modifiedTime, size, owners, lastModifyingUser, shared, permissions, description, starred, trashed';

    const response = await this.drive!.files.get({
      fileId: payload.fileId,
      fields,
    });

    return response.data;
  }

  /**
   * Search for files
   */
  private async searchFiles(payload: { query: string; pageSize?: number; pageToken?: string }): Promise<any> {
    if (!payload.query) {
      throw new IntegrationError('Search query is required');
    }

    const response = await this.drive!.files.list({
      q: payload.query,
      pageSize: payload.pageSize || 100,
      pageToken: payload.pageToken,
      fields: 'nextPageToken, files(id, name, mimeType, webViewLink, modifiedTime, size)',
    });

    return {
      files: response.data.files || [],
      nextPageToken: response.data.nextPageToken,
    };
  }

  /**
   * Create webhook for file changes
   */
  private async createWebhook(payload: WebhookPayload): Promise<any> {
    if (!payload.fileId || !payload.address) {
      throw new IntegrationError('File ID and webhook address are required');
    }

    const channelId = `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expiration = payload.expiration || Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days default

    const response = await this.drive!.files.watch({
      fileId: payload.fileId,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: payload.address,
        token: payload.token,
        expiration: expiration.toString(),
      },
    });

    // Store channel info for later management
    this.watchChannels.set(channelId, {
      fileId: payload.fileId,
      resourceId: response.data.resourceId,
      expiration: response.data.expiration,
    });

    return {
      channelId,
      resourceId: response.data.resourceId,
      expiration: response.data.expiration,
    };
  }

  /**
   * Delete webhook
   */
  private async deleteWebhook(payload: { channelId: string; resourceId: string }): Promise<void> {
    if (!payload.channelId || !payload.resourceId) {
      throw new IntegrationError('Channel ID and resource ID are required');
    }

    await this.drive!.channels.stop({
      requestBody: {
        id: payload.channelId,
        resourceId: payload.resourceId,
      },
    });

    this.watchChannels.delete(payload.channelId);
  }

  /**
   * Handle webhook notifications from Google Drive
   */
  async handleWebhook(headers: Record<string, string>, body: any): Promise<any> {
    const channelId = headers['x-goog-channel-id'];
    const resourceId = headers['x-goog-resource-id'];
    const resourceState = headers['x-goog-resource-state'];
    const messageNumber = headers['x-goog-message-number'];

    // Validate webhook source
    if (!channelId || !resourceId) {
      throw new IntegrationError('Invalid webhook headers');
    }

    // Check if we're tracking this channel
    const channelInfo = this.watchChannels.get(channelId);
    if (!channelInfo || channelInfo.resourceId !== resourceId) {
      throw new IntegrationError('Unknown webhook channel');
    }

    // Handle different resource states
    switch (resourceState) {
      case 'sync':
        // Initial sync message
        console.log(`Webhook sync for channel ${channelId}`);
        return { success: true, action: 'sync' };

      case 'add':
      case 'update':
        // File was added or updated
        console.log(`File ${channelInfo.fileId} was ${resourceState}d`);
        return {
          success: true,
          action: resourceState,
          fileId: channelInfo.fileId,
          messageNumber,
        };

      case 'remove':
      case 'trash':
        // File was removed or trashed
        console.log(`File ${channelInfo.fileId} was ${resourceState}d`);
        return {
          success: true,
          action: resourceState,
          fileId: channelInfo.fileId,
          messageNumber,
        };

      default:
        console.log(`Unknown resource state: ${resourceState}`);
        return { success: true, action: 'unknown' };
    }
  }

  /**
   * Helper: Get appropriate export MIME type for Google Workspace files
   */
  private getExportMimeType(googleMimeType: string): string {
    const exportMap: Record<string, string> = {
      'application/vnd.google-apps.document': 'text/html',
      'application/vnd.google-apps.spreadsheet': 'text/csv',
      'application/vnd.google-apps.presentation': 'application/pdf',
      'application/vnd.google-apps.drawing': 'image/png',
    };

    return exportMap[googleMimeType] || 'text/plain';
  }

  /**
   * Helper: Convert markdown to HTML
   */
  private markdownToHtml(markdown: string): string {
    // Basic markdown to HTML conversion
    // In production, use a proper markdown parser like marked or markdown-it
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }

  /**
   * Handle Google API errors
   */
  private handleApiError(error: any): never {
    const statusCode = error.response?.status || error.code;
    const message = error.response?.data?.error?.message || error.message;

    switch (statusCode) {
      case 401:
        throw new AuthenticationError(`Google Drive authentication failed: ${message}`);
      case 403:
        throw new IntegrationError(`Permission denied: ${message}`, 'PERMISSION_DENIED', 403);
      case 404:
        throw new IntegrationError(`Resource not found: ${message}`, 'NOT_FOUND', 404);
      case 429:
        throw new IntegrationError(`Rate limit exceeded: ${message}`, 'RATE_LIMIT_EXCEEDED', 429);
      case 500:
      case 502:
      case 503:
        throw new IntegrationError(`Google Drive service error: ${message}`, 'SERVICE_ERROR', statusCode);
      default:
        throw new IntegrationError(`Google Drive API error: ${message}`, 'API_ERROR', statusCode);
    }
  }
}