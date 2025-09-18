# OneDrive Integration Adapter

## Overview

The OneDrive adapter provides seamless integration with Microsoft OneDrive and SharePoint document libraries, supporting both personal and business accounts through the Microsoft Graph API.

## Features

### Core Operations
- **Document Import/Export**: Import Office documents and export knowledge content to OneDrive
- **File Management**: List, create, move, copy, and delete files and folders
- **Sharing & Permissions**: Create sharing links, manage permissions, and collaborate
- **Real-time Sync**: Folder synchronization with delta tracking for efficient updates
- **Webhook Support**: Subscribe to file changes for real-time notifications
- **Large File Support**: Resumable upload sessions for files over 4MB

### Supported Actions

| Action | Description |
|--------|-------------|
| `test` | Test connection and retrieve account information |
| `import_document` | Import documents from OneDrive with format conversion |
| `export_document` | Export knowledge content to OneDrive |
| `list_files` | List files and folders with filtering and pagination |
| `create_folder` | Create new folders with conflict handling |
| `share_file` | Create sharing links with various permission levels |
| `get_permissions` | Retrieve file/folder permissions |
| `sync_folder` | Synchronize folder changes using delta queries |
| `delete_item` | Delete files or folders |
| `move_item` | Move items between folders |
| `copy_item` | Create copies of files |
| `rename_item` | Rename files or folders |
| `search_items` | Search for files across OneDrive |
| `get_thumbnails` | Get preview thumbnails for files |
| `create_upload_session` | Start large file upload session |
| `upload_chunk` | Upload file chunks for large files |
| `create_subscription` | Set up webhooks for change notifications |
| `get_recent_files` | Get recently accessed files |
| `get_shared_with_me` | Get files shared with the user |

## Configuration

### Environment Variables

#### Business Accounts (Azure AD)
```env
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
```

#### Personal Accounts
```env
ONEDRIVE_CLIENT_ID=your-client-id
ONEDRIVE_CLIENT_SECRET=your-client-secret
```

### Credentials Object
```typescript
const credentials: IntegrationCredentials = {
  accessToken: 'user-access-token',
  refreshToken: 'refresh-token', // Required for personal accounts
  clientId: 'app-client-id',
  clientSecret: 'app-client-secret',
  tenantId: 'azure-tenant-id', // Business accounts only
  accountType: 'business' | 'personal'
};
```

## Usage Examples

### Test Connection
```typescript
const result = await adapter.execute('test', context);
// Returns: { connected: true, user: {...}, drive: {...} }
```

### Import Document
```typescript
const document = await adapter.execute('import_document', context, {
  itemId: 'file-123',
  format: 'pdf', // Optional: Convert to specific format
  includeMetadata: true
});
```

### Export Document
```typescript
const exported = await adapter.execute('export_document', context, {
  content: 'Document content',
  fileName: 'report.docx',
  parentId: 'folder-456', // Optional: Target folder
  conflictBehavior: 'rename' // rename, replace, or fail
});
```

### Share File
```typescript
const shareLink = await adapter.execute('share_file', context, {
  itemId: 'file-123',
  type: 'view', // view, edit, or embed
  scope: 'organization', // anonymous, organization, or users
  password: 'optional-password',
  expirationDateTime: '2024-12-31T23:59:59Z',
  recipients: [{ email: 'user@example.com' }]
});
```

### Sync Folder Changes
```typescript
const sync = await adapter.execute('sync_folder', context, {
  folderId: 'folder-789',
  deltaToken: previousDeltaToken, // For incremental sync
  includeDeleted: true
});
// Returns: { changes: { added: [...], modified: [...], deleted: [...] }, deltaToken: 'new-token' }
```

### Large File Upload
```typescript
// 1. Create upload session
const session = await adapter.execute('create_upload_session', context, {
  fileName: 'large-video.mp4',
  parentId: 'folder-123'
});

// 2. Upload chunks
const chunkSize = 10 * 1024 * 1024; // 10MB chunks
for (let i = 0; i < totalChunks; i++) {
  const result = await adapter.execute('upload_chunk', context, {
    sessionId: session.sessionId,
    content: chunk,
    rangeStart: i * chunkSize,
    rangeEnd: Math.min((i + 1) * chunkSize - 1, totalSize - 1),
    totalSize
  });

  if (result.completed) {
    console.log('Upload complete:', result.item);
  }
}
```

## Webhook Integration

### Create Subscription
```typescript
const subscription = await adapter.execute('create_subscription', context, {
  resource: '/me/drive/root',
  changeType: 'updated',
  notificationUrl: 'https://your-app.com/webhook',
  expirationDateTime: '2024-12-31T23:59:59Z',
  clientState: 'secret-validation-string'
});
```

### Handle Webhook Notifications
```typescript
app.post('/webhook', async (req, res) => {
  const result = await adapter.handleWebhook(req.headers, req.body);
  // Process notifications
  for (const notification of result.notifications) {
    console.log(`Change type: ${notification.changeType}`);
    console.log(`Resource: ${notification.resource}`);
  }
  res.status(200).send();
});
```

## Error Handling

The adapter includes comprehensive error handling for common scenarios:

- **AuthenticationError**: Invalid or expired credentials
- **ConfigurationError**: Missing required configuration
- **RateLimitExceededException**: API rate limits exceeded
- **IntegrationError**: General API errors with specific codes

```typescript
try {
  await adapter.execute('import_document', context, payload);
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Refresh token or re-authenticate
  } else if (error instanceof RateLimitExceededException) {
    // Implement exponential backoff
  }
}
```

## Security Considerations

1. **Token Management**: Store refresh tokens securely and rotate regularly
2. **Scope Limitations**: Request only necessary permissions
3. **Webhook Validation**: Verify clientState in webhook notifications
4. **Data Encryption**: Use HTTPS for all communications
5. **Access Control**: Implement proper RBAC for OneDrive operations

## Performance Optimization

- **Delta Queries**: Use sync_folder with delta tokens for efficient synchronization
- **Chunked Uploads**: Automatically handles large files with resumable sessions
- **Pagination**: Use pageSize and skipToken for large result sets
- **Field Selection**: Use select parameter to retrieve only needed fields
- **Caching**: Implement caching for frequently accessed metadata

## Account Type Differences

### Business Accounts
- Uses Azure AD authentication
- Supports organizational sharing
- Requires tenant configuration
- Automatic token refresh via Azure Identity

### Personal Accounts
- Uses Microsoft consumer authentication
- Limited to personal sharing options
- Requires manual token refresh
- Different API endpoints for some operations

## Limitations

- Maximum file size: 250GB for business, 100GB for personal
- Webhook expiration: Maximum 3 days, requires renewal
- API rate limits: 10,000 requests per 10 minutes
- Search results: Maximum 1000 items per query