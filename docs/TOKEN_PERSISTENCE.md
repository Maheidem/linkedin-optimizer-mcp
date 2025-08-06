# LinkedIn MCP Token Persistence

## Overview

The LinkedIn MCP server now includes automatic token persistence, eliminating the need to re-authenticate every time you restart Claude or the MCP server.

## How It Works

1. **Token Storage**: When you authenticate using `linkedin_exchange_code`, the access token is automatically saved to:
   - Default location: `~/.linkedin-mcp/tokens/linkedin_token.json`
   - Custom location: Set via `LINKEDIN_TOKEN_STORAGE_PATH` environment variable

2. **Automatic Loading**: When you call any LinkedIn API function without providing an `accessToken`, the server automatically:
   - Checks for a stored token
   - Validates it hasn't expired
   - Uses it for the API call

3. **Token Validation**: The server checks token validity with a 5-minute buffer before expiry to ensure smooth operation.

## Usage

### Initial Authentication

1. Get authorization URL:
```
linkedin_get_auth_url
```

2. Open the URL in browser, authorize, and get the code from the redirect URL

3. Exchange code for token (this automatically saves it):
```
linkedin_exchange_code({ code: "YOUR_AUTH_CODE" })
```

### Using Stored Token

After authentication, you can use all LinkedIn functions without providing the access token:

```javascript
// No need to provide accessToken anymore!
linkedin_create_post({ 
  text: "Hello LinkedIn!" 
})

linkedin_get_user_info()

linkedin_get_user_posts()
```

### Check Token Status

Use the new tool to check if you're authenticated:

```
linkedin_check_token_status()
```

This returns:
- Token validity status
- Expiration time
- User information (if authenticated)
- Next steps for authentication (if not authenticated)

## Environment Variables

- `LINKEDIN_TOKEN_STORAGE_PATH`: Override the default token storage location
  ```bash
  export LINKEDIN_TOKEN_STORAGE_PATH=/custom/path/to/tokens
  ```

## Security Notes

1. **Token Storage**: Tokens are stored in plain JSON files. Ensure your home directory has appropriate permissions.
2. **Token Expiry**: LinkedIn access tokens typically expire after 60 days.
3. **Token Refresh**: Currently, manual re-authentication is required when tokens expire.

## Troubleshooting

### Token Not Found
If the server can't find your token:
1. Check the token file exists: `ls ~/.linkedin-mcp/tokens/`
2. Re-authenticate using the OAuth flow

### Token Expired
If your token has expired:
1. Use `linkedin_get_auth_url` to start a new OAuth flow
2. Complete the authorization
3. Use `linkedin_exchange_code` with the new code

### Permission Issues
Ensure the token directory has proper permissions:
```bash
chmod 700 ~/.linkedin-mcp/tokens
```

## Benefits

1. **Convenience**: No need to manage access tokens manually
2. **Session Persistence**: Tokens survive MCP server restarts
3. **Automatic Validation**: Server checks token validity before use
4. **Fallback Support**: Can still provide accessToken manually if needed

## Migration from Previous Version

If you were storing tokens elsewhere:
1. Copy your existing `access_token` value
2. Create a JSON file at `~/.linkedin-mcp/tokens/linkedin_token.json`:
```json
{
  "access_token": "YOUR_TOKEN_HERE",
  "expires_in": 5184000,
  "created_at": 1719774720000
}
```
3. The server will now use this token automatically