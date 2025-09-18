# Troubleshooting Guide

## Common Issues and Solutions

### Authentication & Login Issues

#### Cannot Log In

**Problem**: Unable to log in with correct credentials

**Solutions**:
1. **Clear browser cache and cookies**
   - Chrome: Settings → Privacy → Clear browsing data
   - Firefox: Settings → Privacy & Security → Clear Data
   - Safari: Preferences → Privacy → Manage Website Data

2. **Check password requirements**
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number

3. **Reset password**
   - Click "Forgot Password" on login page
   - Check email (including spam folder)
   - Use reset link within 24 hours

4. **Verify account status**
   - Check for verification email
   - Contact admin if account is suspended
   - Ensure organization SSO is configured correctly

**Error Codes**:
- `AUTH_001`: Invalid credentials
- `AUTH_002`: Account not verified
- `AUTH_003`: Account suspended
- `AUTH_004`: Too many failed attempts (wait 15 minutes)

---

#### Session Expired Frequently

**Problem**: Being logged out unexpectedly

**Solutions**:
1. **Check browser settings**
   - Enable cookies for the domain
   - Disable aggressive privacy extensions temporarily
   - Try incognito/private mode

2. **Network stability**
   - Check internet connection stability
   - Disable VPN if experiencing issues
   - Try different network

3. **Token refresh issues**
   ```javascript
   // Check console for errors
   localStorage.getItem('refreshToken')
   // Should not be null or expired
   ```

---

### Document & Editor Issues

#### Document Won't Save

**Problem**: Changes not saving or "Failed to save" error

**Solutions**:
1. **Check connection**
   - Look for offline indicator
   - Verify internet connectivity
   - Check system status page

2. **Storage quota**
   - Verify workspace storage limit
   - Delete unnecessary documents
   - Contact admin for quota increase

3. **Permission issues**
   - Confirm you have edit permissions
   - Check if document is locked
   - Verify collection permissions

4. **Browser compatibility**
   - Use supported browser version
   - Disable problematic extensions
   - Clear browser cache

**Recovery Steps**:
```javascript
// Open browser console (F12)
// Copy unsaved content
document.querySelector('.editor-content').innerText
// Save to local file as backup
```

---

#### Editor Not Loading

**Problem**: Blank editor or infinite loading

**Solutions**:
1. **Refresh the page** (Ctrl/Cmd + R)
2. **Hard refresh** (Ctrl/Cmd + Shift + R)
3. **Check browser console** for errors (F12)
4. **Disable browser extensions** temporarily
5. **Try different browser**
6. **Clear local storage**:
   ```javascript
   localStorage.clear()
   sessionStorage.clear()
   ```

---

#### Formatting Issues

**Problem**: Text formatting not working or displaying incorrectly

**Solutions**:
1. **Markdown mode issues**
   - Switch to rich text mode
   - Check markdown syntax
   - Use preview to verify

2. **Copy-paste problems**
   - Use "Paste as plain text" (Ctrl/Cmd + Shift + V)
   - Clear formatting button in toolbar
   - Re-apply formatting manually

3. **Code blocks not highlighting**
   - Specify language after ```
   - Verify language is supported
   - Refresh page to reload syntax highlighter

---

### Collaboration Issues

#### Cannot See Other Users' Changes

**Problem**: Real-time collaboration not working

**Solutions**:
1. **Check collaboration indicators**
   - Look for user presence indicators
   - Verify WebSocket connection (green dot)
   - Check if document is shared

2. **Network configuration**
   - WebSocket port 3001 must be open
   - Firewall may block WebSocket
   - Try different network

3. **Browser settings**
   - Enable JavaScript
   - Allow WebSocket connections
   - Disable proxy if using one

**Debug WebSocket**:
```javascript
// In browser console
new WebSocket('wss://api.knowledgenetwork.com/ws').readyState
// Should return 1 (OPEN)
```

---

#### Comments Not Appearing

**Problem**: Comments not visible or not posting

**Solutions**:
1. **Refresh comment panel** (click refresh icon)
2. **Check notification settings**
3. **Verify permissions** (need at least comment access)
4. **Clear comment cache**:
   ```javascript
   // Force reload comments
   location.reload(true)
   ```

---

### Search Issues

#### Search Returns No Results

**Problem**: Search not finding known documents

**Solutions**:
1. **Check search syntax**
   - Remove special characters
   - Try simpler terms
   - Use quotes for exact phrases

2. **Index status**
   - New documents take 1-2 minutes to index
   - Admin can trigger re-indexing
   - Check if search service is running

3. **Filter settings**
   - Clear all filters
   - Check date range
   - Verify collection selection

4. **Advanced search tips**:
   ```
   title:"exact title"        # Search in title only
   author:john               # Find by author
   tag:important            # Search by tag
   created:>2025-01-01     # Date filters
   ```

---

### Performance Issues

#### Slow Page Load

**Problem**: Pages taking too long to load

**Solutions**:
1. **Client-side optimization**
   - Clear browser cache
   - Disable unnecessary extensions
   - Close other tabs
   - Update browser

2. **Network optimization**
   - Check internet speed
   - Try wired connection
   - Disable VPN
   - Change DNS servers

3. **Application settings**
   - Reduce preview image quality
   - Disable auto-preview
   - Use compact view mode
   - Limit documents per page

**Performance Check**:
```javascript
// Check load metrics
performance.timing.loadEventEnd - performance.timing.navigationStart
// Should be < 3000ms
```

---

#### High Memory Usage

**Problem**: Browser using excessive memory

**Solutions**:
1. **Close unused documents**
2. **Refresh browser periodically**
3. **Disable heavy features**:
   - Live preview
   - Spell check
   - Grammar check
4. **Use lightweight mode** in settings

---

### Mobile & PWA Issues

#### PWA Won't Install

**Problem**: Cannot install as app on mobile

**Solutions**:
1. **iOS (Safari)**:
   - Open in Safari (not Chrome)
   - Tap Share button
   - Scroll and tap "Add to Home Screen"
   - Name the app and tap "Add"

2. **Android (Chrome)**:
   - Look for install banner
   - Or menu → "Add to Home Screen"
   - Accept permissions

3. **Requirements**:
   - HTTPS connection required
   - Valid manifest.json
   - Service worker registered

---

#### Offline Mode Not Working

**Problem**: Cannot access documents offline

**Solutions**:
1. **Enable offline mode** in settings
2. **Pre-download documents**:
   - Star documents for offline
   - Wait for sync to complete
3. **Check storage**:
   - Ensure adequate device storage
   - Clear app cache if needed
4. **Re-install PWA** if persistent issues

---

### API & Integration Issues

#### API Returns 401 Unauthorized

**Problem**: API calls failing with auth errors

**Solutions**:
1. **Check token expiry**:
   ```bash
   # Decode JWT to check exp claim
   echo $TOKEN | cut -d. -f2 | base64 -d
   ```

2. **Refresh token**:
   ```bash
   curl -X POST /api/auth/refresh \
     -H "Content-Type: application/json" \
     -d '{"refreshToken":"your_refresh_token"}'
   ```

3. **Verify API key** (if using):
   - Check key hasn't been revoked
   - Ensure correct environment (prod/dev)
   - Verify key permissions

---

#### Rate Limiting Errors

**Problem**: Getting 429 Too Many Requests

**Solutions**:
1. **Check rate limit headers**:
   ```
   X-RateLimit-Limit: 1000
   X-RateLimit-Remaining: 0
   X-RateLimit-Reset: 1642248000
   ```

2. **Implement backoff**:
   ```javascript
   // Exponential backoff
   let delay = 1000;
   for (let i = 0; i < maxRetries; i++) {
     try {
       return await apiCall();
     } catch (e) {
       if (e.status === 429) {
         await sleep(delay);
         delay *= 2;
       }
     }
   }
   ```

3. **Optimize requests**:
   - Batch operations
   - Cache responses
   - Use webhooks instead of polling

---

## Error Messages Reference

### Common Error Codes

| Code | Message | Solution |
|------|---------|----------|
| ERR_001 | Network Error | Check internet connection |
| ERR_002 | Server Error | Wait and retry, contact support if persists |
| ERR_003 | Permission Denied | Check user permissions |
| ERR_004 | Resource Not Found | Verify URL/ID, may be deleted |
| ERR_005 | Validation Error | Check input requirements |
| ERR_006 | Quota Exceeded | Upgrade plan or delete content |
| ERR_007 | Rate Limited | Wait before retrying |
| ERR_008 | Maintenance Mode | Check status page for updates |

---

## Browser Console Debugging

### Useful Console Commands

```javascript
// Check current user
console.log(window.__USER__)

// View app version
console.log(window.__APP_VERSION__)

// Check WebSocket status
console.log(window.__WS_STATUS__)

// Force refresh data
window.__FORCE_REFRESH__()

// Enable debug mode
localStorage.setItem('debug', 'true')

// View performance metrics
performance.getEntriesByType('navigation')

// Check service worker
navigator.serviceWorker.getRegistrations()

// Clear all caches
caches.keys().then(names => names.forEach(name => caches.delete(name)))
```

---

## Data Recovery

### Recovering Lost Work

1. **Check auto-save versions**:
   - Document menu → Version History
   - Select previous version
   - Restore or copy content

2. **Browser recovery**:
   ```javascript
   // Check session storage
   sessionStorage.getItem('draft_content')

   // Check local storage
   localStorage.getItem('backup_doc_' + documentId)
   ```

3. **Contact support** with:
   - Document ID
   - Timestamp of last edit
   - Description of lost content

---

## Getting Additional Help

### Self-Service Resources
- **Status Page**: https://status.knowledgenetwork.com
- **Community Forum**: https://community.knowledgenetwork.com
- **Video Tutorials**: Help menu → Tutorials
- **API Documentation**: https://docs.knowledgenetwork.com/api

### Contact Support

**Before Contacting Support, Gather**:
1. Browser type and version
2. Operating system
3. Error messages (exact text)
4. Screenshots if applicable
5. Steps to reproduce issue
6. Document/Workspace IDs involved

**Support Channels**:
- **Email**: support@knowledgenetwork.com
- **Chat**: Click bubble in bottom-right
- **Priority Support**: enterprise@knowledgenetwork.com
- **Phone** (Enterprise): +1-XXX-XXX-XXXX

### Reporting Bugs

**GitHub Issues**: https://github.com/knowledge-network/app/issues

**Include**:
- Clear title
- Reproduction steps
- Expected behavior
- Actual behavior
- Environment details
- Screenshots/videos

---

## Preventive Measures

### Best Practices
1. **Regular saves**: Although auto-save is enabled, manually save important work
2. **Version control**: Create versions before major changes
3. **Backup critical documents**: Export to PDF/Markdown periodically
4. **Monitor quotas**: Check storage and API usage regularly
5. **Keep browser updated**: Use latest stable version
6. **Test in staging**: For API integrations, test in staging first

### Monitoring Tools
- Browser DevTools (F12)
- Network tab for API calls
- Console for JavaScript errors
- Application tab for storage inspection

---

**Last Updated**: January 2025
**Version**: 1.0.0