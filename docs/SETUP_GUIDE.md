# LinkedIn API MCP Server - Setup Guide

This guide will walk you through setting up the complete LinkedIn API MCP Server that exposes ALL LinkedIn API endpoints.

## Prerequisites

- Node.js 18+ installed
- LinkedIn Developer Account
- LinkedIn Partner Program approval (for full API access)
- Claude Desktop or Claude CLI

## Step 1: LinkedIn Developer Setup

### 1.1 Create LinkedIn Developer Application

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Click "Create App"
3. Fill in application details:
   - **App name**: Your application name
   - **LinkedIn Page**: Associate with a LinkedIn company page
   - **Privacy policy URL**: Required
   - **App logo**: Upload a logo
4. Submit for review

### 1.2 Configure OAuth Settings

1. In your app dashboard, go to "Auth" tab
2. Add redirect URLs:
   - `http://localhost:3000/callback` (for development)
   - Your production callback URL
3. Note down:
   - **Client ID**
   - **Client Secret**

### 1.3 Request API Access

1. Go to "Products" tab in your app
2. Request access to required products:
   - **Sign In with LinkedIn** (basic access)
   - **Share on LinkedIn** (content posting)
   - **Marketing Developer Platform** (advertising)
   - **Learning** (LinkedIn Learning integration)
   - Additional products as needed

⚠️ **Important**: Most products require LinkedIn Partner Program approval.

## Step 2: Apply for LinkedIn Partner Program

### 2.1 Partner Program Requirements

To access most LinkedIn APIs, you need partner approval:

- **Existing Product**: You must have a working application with users
- **Value Proposition**: Clear benefit for LinkedIn users
- **Technical Capability**: Demonstrated ability to integrate properly
- **Compliance**: Data privacy and security standards

### 2.2 Application Process

1. Visit [LinkedIn Partner Program](https://partners.linkedin.com/)
2. Choose appropriate program:
   - **Marketing Developer Platform**: For advertising/marketing tools
   - **Talent Solutions**: For recruitment applications
   - **Learning Partners**: For education platforms
3. Submit detailed application with:
   - Product demonstration
   - User metrics
   - Technical architecture
   - Data usage policies

**Timeline**: 3-6 months average approval time

## Step 3: Install the MCP Server

### 3.1 Clone and Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/linkedin-optimizer-mcp.git
cd linkedin-optimizer-mcp

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 3.2 Configure Environment Variables

Edit `.env` file with your LinkedIn app credentials:

```bash
# Required - from your LinkedIn Developer App
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_REDIRECT_URI=http://localhost:3000/callback

# Optional - API configuration
LINKEDIN_API_VERSION=202504
DEBUG=linkedin-api-mcp
LOG_LEVEL=info
```

### 3.3 Build the Project

```bash
# Build TypeScript
npm run build

# Run tests (optional)
npm test
```

## Step 4: Configure with Claude

### 4.1 For Claude Desktop

Add to your Claude Desktop configuration file:

**Location**: 
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "linkedin-api": {
      "command": "node",
      "args": ["/path/to/linkedin-optimizer-mcp/dist/linkedin-api-mcp.js"],
      "env": {
        "LINKEDIN_CLIENT_ID": "your_client_id",
        "LINKEDIN_CLIENT_SECRET": "your_client_secret",
        "LINKEDIN_REDIRECT_URI": "http://localhost:3000/callback"
      }
    }
  }
}
```

### 4.2 For Claude CLI

```bash
# Add the MCP server
claude mcp add linkedin-api node /path/to/linkedin-optimizer-mcp/dist/linkedin-api-mcp.js

# Or add with environment variables
claude mcp add-json linkedin-api '{
  "command": "node",
  "args": ["/path/to/linkedin-optimizer-mcp/dist/linkedin-api-mcp.js"],
  "env": {
    "LINKEDIN_CLIENT_ID": "your_client_id",
    "LINKEDIN_CLIENT_SECRET": "your_client_secret",
    "LINKEDIN_REDIRECT_URI": "http://localhost:3000/callback"
  }
}'
```

## Step 5: Authentication Setup

### 5.1 OAuth Flow

The MCP server supports both 3-legged OAuth and PKCE flows:

```javascript
// In Claude, start the OAuth flow
linkedin_oauth_get_auth_url({
  scopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
  usePKCE: true
})
```

This returns an authorization URL. Visit it in your browser to authorize the application.

### 5.2 Complete Authentication

After authorization, exchange the code for tokens:

```javascript
linkedin_oauth_exchange_code({
  code: "code_from_callback_url",
  state: "state_from_initial_request",
  codeVerifier: "pkce_code_verifier"
})
```

### 5.3 Token Management

The MCP server automatically handles:
- Token storage during session
- Rate limit tracking
- Error handling for expired tokens

For production, implement proper token persistence.

## Step 6: Test the Installation

### 6.1 Health Check

```javascript
// Test API connectivity
linkedin_get_api_health()
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-28T10:00:00Z",
  "authenticated": true,
  "tokenExpiry": "2025-01-28T11:00:00Z"
}
```

### 6.2 Test Basic Profile Access

```javascript
// Get your profile information
linkedin_people_get_profile({
  fields: ["id", "firstName", "lastName", "headline"]
})
```

### 6.3 Test Content Creation

```javascript
// Create a simple text post
linkedin_posts_create({
  author: "urn:li:person:YOUR_PERSON_ID",
  postType: "TEXT",
  text: "Hello LinkedIn! Testing my new API integration.",
  visibility: "PUBLIC"
})
```

## Step 7: Available API Categories

Once set up, you have access to 50+ tools across these categories:

### Authentication (3 tools)
- `linkedin_oauth_get_auth_url`
- `linkedin_oauth_exchange_code`
- `linkedin_oauth_refresh_token`

### Profile & People (2 tools)
- `linkedin_people_get_profile`
- `linkedin_people_search_members`

### Content Management (7 tools)
- `linkedin_posts_create`
- `linkedin_posts_get`
- `linkedin_posts_update`
- `linkedin_posts_delete`
- `linkedin_ugc_create`
- `linkedin_assets_upload`
- `linkedin_assets_get_upload_url`

### Marketing & Advertising (5 tools)
- `linkedin_ads_create_campaign`
- `linkedin_ads_get_campaigns`
- `linkedin_ads_update_campaign`
- `linkedin_ads_get_analytics`
- `linkedin_ads_get_targeting_facets`

### And many more...

See [API_REFERENCE.md](./API_REFERENCE.md) for complete documentation.

## Troubleshooting

### Common Issues

1. **"Access token expired"**
   - Solution: Use `linkedin_oauth_refresh_token` or re-authenticate

2. **"Insufficient permissions"**
   - Solution: Request additional scopes or apply for partner program

3. **"Rate limit exceeded"**
   - Solution: Check limits with `linkedin_get_rate_limits` and implement backoff

4. **"Partner program required"**
   - Solution: Apply for LinkedIn Partner Program approval

### Debug Mode

Enable debug logging:

```bash
export DEBUG=linkedin-api-mcp
export LOG_LEVEL=debug
```

### Support

- GitHub Issues: [Report bugs and feature requests]
- LinkedIn Developer Support: For API-specific issues
- Partner Program Support: For partnership questions

## Security Considerations

1. **Never expose client secrets** in frontend code
2. **Use HTTPS** in production redirect URIs
3. **Implement proper token storage** with encryption
4. **Follow rate limiting** to avoid being blocked
5. **Validate all user inputs** before API calls
6. **Monitor API usage** for unusual patterns

## Production Deployment

### Environment Setup

```bash
# Production environment variables
LINKEDIN_CLIENT_ID=prod_client_id
LINKEDIN_CLIENT_SECRET=prod_client_secret
LINKEDIN_REDIRECT_URI=https://yourapp.com/linkedin/callback
NODE_ENV=production
LOG_LEVEL=warn
```

### Monitoring

Implement monitoring for:
- API response times
- Error rates
- Rate limit utilization
- Token expiration alerts

### Scaling

For high-volume applications:
- Implement request queuing
- Use multiple API keys (if permitted)
- Cache responses where appropriate
- Implement circuit breakers

## Next Steps

1. **Explore the APIs**: Try different endpoints with the MCP tools
2. **Build your application**: Integrate the APIs into your workflow
3. **Monitor usage**: Track your API consumption and limits
4. **Request additional access**: Apply for more LinkedIn products as needed
5. **Contribute**: Submit improvements to the MCP server

For detailed API usage examples, see [API_REFERENCE.md](./API_REFERENCE.md).