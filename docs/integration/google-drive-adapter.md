# Google Drive Integration Adapter

## Overview

The Google Drive adapter provides seamless integration with Google Drive and Google Workspace applications for the Knowledge Network platform. It enables document import/export, file management, collaboration features, and real-time updates through webhooks.

## Features

### Core Functionality

1. **Document Operations**
   - Import Google Docs, Sheets, Slides as HTML/CSV/PDF
   - Export knowledge content to Google Drive
   - Convert between formats (Markdown ↔ HTML)
   - Full-text content extraction

2. **File Management**
   - List files with pagination and filtering
   - Create folders with hierarchical organization
   - Move, copy, and delete files
   - Search files with query support
   - Get detailed file metadata

3. **Collaboration**
   - Share files with users, groups, or domains
   - Manage permissions (reader, writer, commenter, owner)
   - Get file permission lists
   - Email notifications for sharing

4. **Real-time Updates**
   - Webhook support for file changes
   - Track file additions, updates, deletions
   - Channel-based subscription management
   - Automatic webhook expiration handling

## Implementation Details

### File Location
```
src/server/modules/integrations/adapters/google-drive.adapter.ts
```

### Dependencies
- `googleapis` (v160.0.0+)
- `google-auth-library` (OAuth2 client)

### Authentication

The adapter uses OAuth2 authentication with automatic token refresh:

```typescript
const credentials = {
  accessToken: 'user_access_token',
  refreshToken: 'user_refresh_token',
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret',
  redirectUri: 'http://localhost:3000/callback'
};
```

Environment variables can be used for client credentials:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

## Available Actions

### Document Operations

#### `test`
Test connection and retrieve user information.
```typescript
const result = await adapter.execute('test', context);
// Returns: { connected: true, user: {...}, storageQuota: {...} }
```

#### `import_document`
Import a document from Google Drive.
```typescript
const result = await adapter.execute('import_document', context, {
  fileId: 'file_id',
  format: 'text/html' // optional
});
// Returns: { id, name, mimeType, content, metadata }
```

#### `export_document`
Export content to Google Drive.
```typescript
const result = await adapter.execute('export_document', context, {
  content: '<p>HTML content</p>',
  title: 'My Document',
  folderId: 'parent_folder_id', // optional
  mimeType: 'application/vnd.google-apps.document', // optional
  format: 'html' // or 'markdown', 'plain'
});
// Returns: { id, name, webViewLink, createdTime }
```

### File Management

#### `list_files`
List files with filtering and pagination.
```typescript
const result = await adapter.execute('list_files', context, {
  folderId: 'folder_id', // optional
  query: 'name contains "report"', // optional
  pageSize: 100,
  pageToken: 'next_page_token',
  includePermissions: true
});
// Returns: { files: [...], nextPageToken }
```

#### `create_folder`
Create a new folder.
```typescript
const result = await adapter.execute('create_folder', context, {
  name: 'Project Files',
  parentId: 'parent_folder_id', // optional
  description: 'Project documentation'
});
// Returns: { id, name, webViewLink, createdTime }
```

#### `search_files`
Search for files using Drive API query syntax.
```typescript
const result = await adapter.execute('search_files', context, {
  query: 'mimeType = "application/pdf" and modifiedTime > "2024-01-01"',
  pageSize: 50
});
// Returns: { files: [...], nextPageToken }
```

### Collaboration

#### `share_file`
Share a file with users or groups.
```typescript
const result = await adapter.execute('share_file', context, {
  fileId: 'file_id',
  email: 'user@example.com',
  role: 'reader', // or 'writer', 'commenter', 'owner'
  type: 'user', // or 'group', 'domain', 'anyone'
  sendNotificationEmail: true,
  emailMessage: 'Please review this document'
});
// Returns: { id, type, role, emailAddress, displayName }
```

#### `get_permissions`
Get all permissions for a file.
```typescript
const result = await adapter.execute('get_permissions', context, {
  fileId: 'file_id'
});
// Returns: array of permission objects
```

### Advanced Operations

#### `move_file`
Move a file to a different folder.
```typescript
const result = await adapter.execute('move_file', context, {
  fileId: 'file_id',
  newParentId: 'new_folder_id'
});
```

#### `copy_file`
Create a copy of a file.
```typescript
const result = await adapter.execute('copy_file', context, {
  fileId: 'file_id',
  name: 'Copy of Document',
  parentId: 'destination_folder_id'
});
```

#### `delete_file`
Delete a file (moves to trash).
```typescript
await adapter.execute('delete_file', context, {
  fileId: 'file_id'
});
```

### Webhooks

#### `create_webhook`
Create a webhook for file change notifications.
```typescript
const result = await adapter.execute('create_webhook', context, {
  fileId: 'file_id',
  address: 'https://your-app.com/webhook',
  token: 'verification_token', // optional
  expiration: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
});
// Returns: { channelId, resourceId, expiration }
```

#### `delete_webhook`
Stop receiving webhook notifications.
```typescript
await adapter.execute('delete_webhook', context, {
  channelId: 'channel_id',
  resourceId: 'resource_id'
});
```

#### `handleWebhook`
Process incoming webhook notifications.
```typescript
const result = await adapter.handleWebhook(headers, body);
// Handles sync, add, update, remove, trash events
```

## Error Handling

The adapter includes comprehensive error handling with specific error types:

- `AuthenticationError`: OAuth2 authentication failures (401)
- `IntegrationError`: General API errors with status codes
- Permission denied errors (403)
- Resource not found errors (404)
- Rate limit errors (429)
- Service errors (500, 502, 503)

All errors include descriptive messages and appropriate HTTP status codes.

## Format Conversions

### Export MIME Types
- Google Docs → `text/html`
- Google Sheets → `text/csv`
- Google Slides → `application/pdf`
- Google Drawings → `image/png`

### Markdown Support
The adapter includes basic Markdown to HTML conversion for exporting content to Google Docs:
- Headers (H1, H2, H3)
- Bold and italic text
- Links
- Paragraphs

## Testing

Unit tests are provided in:
```
src/server/modules/integrations/adapters/google-drive.adapter.test.ts
```

Tests cover:
- Initialization and credential validation
- Parameter validation for all actions
- Error handling scenarios
- Webhook processing
- Helper method functionality

## Configuration

### Required OAuth2 Scopes
```
https://www.googleapis.com/auth/drive
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/drive.metadata.readonly
```

### Rate Limits
Google Drive API has the following limits:
- 1,000 queries per 100 seconds per user
- 1,000 queries per 100 seconds per project

The adapter handles rate limit errors gracefully with appropriate error responses.

## Usage Example

```typescript
import { GoogleDriveAdapter } from '@/server/modules/integrations/adapters/google-drive.adapter';
import { IntegrationContext } from '@/server/modules/integrations/types';

// Initialize adapter
const adapter = new GoogleDriveAdapter();

// Create context with credentials
const context: IntegrationContext = {
  workspaceId: 'workspace-123',
  userId: 'user-456',
  integration: {
    id: 'google-drive',
    name: 'Google Drive',
    type: 'oauth2',
    enabled: true,
    config: {}
  },
  credentials: {
    accessToken: 'user_token',
    refreshToken: 'refresh_token',
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
  }
};

// Import a document
const doc = await adapter.execute('import_document', context, {
  fileId: 'document_id'
});

// Create and share a new document
const newDoc = await adapter.execute('export_document', context, {
  title: 'Meeting Notes',
  content: '<h1>Meeting Notes</h1><p>Discussion points...</p>',
  format: 'html'
});

await adapter.execute('share_file', context, {
  fileId: newDoc.id,
  email: 'team@example.com',
  role: 'writer',
  type: 'group'
});
```

## Security Considerations

1. **Token Storage**: Store refresh tokens securely (encrypted at rest)
2. **Scope Limitation**: Request only necessary OAuth2 scopes
3. **Webhook Verification**: Validate webhook sources using channel tracking
4. **Rate Limiting**: Implement application-level rate limiting
5. **Error Information**: Avoid exposing sensitive data in error messages

## Future Enhancements

- [ ] Support for Google Drive comments API
- [ ] Batch operations for improved performance
- [ ] Team Drive support
- [ ] Advanced search with AI-powered query building
- [ ] Document version history tracking
- [ ] Offline sync capabilities
- [ ] Integration with Google Workspace admin APIs