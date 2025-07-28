# LinkedIn API MCP Server

A comprehensive Model Context Protocol (MCP) server that exposes **ALL** LinkedIn API endpoints through 50+ MCP tools. This server provides complete access to LinkedIn's API ecosystem including Profile, Content, Marketing, Talent, Learning, Messaging, Events, and more.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![LinkedIn API](https://img.shields.io/badge/LinkedIn%20API-2025-blue)](https://docs.microsoft.com/en-us/linkedin/)

## 🚀 Features

- **Complete API Coverage**: All LinkedIn API endpoints exposed as MCP tools
- **50+ Tools**: Comprehensive tool set covering every API category
- **OAuth 2.0 & PKCE**: Full authentication flow support
- **Rate Limiting**: Built-in rate limit handling and monitoring
- **Error Handling**: Robust error handling with detailed responses
- **Type Safety**: Full TypeScript implementation with type definitions
- **2025 API Support**: Latest LinkedIn API features and versioning

## 📋 API Categories Covered

### 🔐 Authentication & Authorization (3 tools)
- OAuth 2.0 authorization URL generation
- Code to token exchange
- Token refresh management

### 👤 Profile & People APIs (2 tools)
- Profile information retrieval
- Member search functionality

### 🏢 Organizations & Companies (2 tools)
- Company profile data
- Follower statistics and analytics

### 📝 Content Management (7 tools)
- Posts API (create, read, update, delete)
- UGC (User Generated Content) support
- Media asset upload and management

### ❤️ Social Actions (3 tools)
- Like posts and comments
- Comment on content
- Share posts with commentary

### 📊 Marketing & Advertising (5 tools)
- Campaign creation and management
- Analytics and reporting
- Targeting options and facets

### 💼 Talent Solutions (3 tools)
- Job posting and management
- Job search functionality
- Unified talent search (2025 feature)

### 🎓 Learning APIs (2 tools)
- Course catalog access
- Content classification system

### 💬 Messaging (2 tools)
- Direct message sending
- Conversation management

### 📅 Events (2 tools)
- Event creation and management
- Event discovery and search

### 💰 Sales Navigator (1 tool)
- Profile association management

### 🛡️ Compliance (1 tool)
- Compliance event monitoring

### 🔧 Utilities (2 tools)
- Rate limit monitoring
- API health checks

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/linkedin-api-mcp.git
cd linkedin-api-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Install globally (optional)
npm install -g .
```

## ⚙️ Configuration

### 1. LinkedIn Developer Setup

1. Create a LinkedIn Developer Application at [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Note your Client ID and Client Secret
3. Configure redirect URIs

### 2. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_REDIRECT_URI=http://localhost:3000/callback
LINKEDIN_API_VERSION=202504
```

### 3. Claude Integration

#### For Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "linkedin-api": {
      "command": "node",
      "args": ["/path/to/linkedin-api-mcp/dist/linkedin-api-mcp.js"],
      "env": {
        "LINKEDIN_CLIENT_ID": "your_client_id",
        "LINKEDIN_CLIENT_SECRET": "your_client_secret",
        "LINKEDIN_REDIRECT_URI": "http://localhost:3000/callback"
      }
    }
  }
}
```

#### For Claude CLI

```bash
claude mcp add linkedin-api node /path/to/linkedin-api-mcp/dist/linkedin-api-mcp.js
```

## 🔑 Authentication

The server supports OAuth 2.0 with optional PKCE:

```javascript
// 1. Get authorization URL
linkedin_oauth_get_auth_url({
  scopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
  usePKCE: true
})

// 2. Exchange code for token (after user authorization)
linkedin_oauth_exchange_code({
  code: "authorization_code_from_callback",
  codeVerifier: "pkce_code_verifier"
})

// 3. Refresh token when needed
linkedin_oauth_refresh_token({
  refreshToken: "valid_refresh_token"
})
```

## 📖 Usage Examples

### Profile Management
```javascript
// Get your profile
linkedin_people_get_profile({
  fields: ["id", "firstName", "lastName", "headline", "summary"]
})

// Search for people
linkedin_people_search_members({
  keywords: "software engineer",
  location: { countryCode: "US" }
})
```

### Content Creation
```javascript
// Create a text post
linkedin_posts_create({
  author: "urn:li:person:ABC123",
  postType: "TEXT",
  text: "Hello LinkedIn! 🚀",
  visibility: "PUBLIC"
})

// Create an image post
linkedin_posts_create({
  author: "urn:li:person:ABC123",
  postType: "IMAGE",
  text: "Check out this amazing visualization!",
  media: [{
    type: "IMAGE",
    url: "urn:li:digitalmediaAsset:xyz",
    altText: "Data visualization chart"
  }]
})

// Create a poll
linkedin_posts_create({
  author: "urn:li:person:ABC123",
  postType: "POLL",
  text: "What's your favorite programming language?",
  pollOptions: ["JavaScript", "Python", "Java", "Go"]
})
```

### Marketing & Advertising
```javascript
// Create ad campaign
linkedin_ads_create_campaign({
  account: "urn:li:sponsoredAccount:123",
  name: "Product Launch Campaign",
  type: "SPONSORED_CONTENT",
  budget: { currencyCode: "USD", amount: 5000 }
})

// Get campaign analytics
linkedin_ads_get_analytics({
  campaigns: ["urn:li:sponsoredCampaign:123"],
  dateRange: {
    start: { day: 1, month: 1, year: 2025 },
    end: { day: 31, month: 1, year: 2025 }
  },
  fields: ["impressions", "clicks", "costInUsd"]
})
```

### Job Posting
```javascript
// Post a job
linkedin_jobs_post({
  companyId: "urn:li:organization:123",
  title: "Senior Software Engineer",
  description: "Join our amazing team...",
  location: { countryCode: "US", city: "San Francisco" },
  workRemoteAllowed: true,
  employmentType: "FULL_TIME"
})
```

## 📚 Documentation

- **[API Reference](./docs/API_REFERENCE.md)**: Complete API documentation with examples
- **[Setup Guide](./docs/SETUP_GUIDE.md)**: Detailed setup and configuration instructions
- **[Research](./research/)**: LinkedIn API research and specifications

## ⚠️ LinkedIn Partner Program

**Important**: Most LinkedIn APIs require approval through LinkedIn's Partner Program:

- **Timeline**: 3-6 months average
- **Approval Rate**: Less than 10%
- **Requirements**: Existing product with proven user base
- **Application**: [LinkedIn Partner Program](https://partners.linkedin.com/)

### Available Without Partner Approval
- Basic profile access (`r_liteprofile`, `r_emailaddress`)
- Limited social actions
- Basic content sharing

### Requires Partner Approval
- Full profile access
- Company data
- Marketing APIs
- Talent solutions
- Messaging
- Analytics

## 🔍 Rate Limiting

The server includes built-in rate limiting:

```javascript
// Check current rate limits
linkedin_get_rate_limits({
  apiCategory: "content" // Optional
})

// API health check
linkedin_get_api_health()
```

Rate limits vary by API category and partner tier. The server automatically handles rate limit headers and provides warnings.

## 🛡️ Security

- **OAuth 2.0 + PKCE**: Secure authentication flows
- **Token Management**: Automatic token refresh and expiry handling
- **Rate Limiting**: Built-in protection against API abuse
- **Input Validation**: All inputs validated using Zod schemas
- **Error Handling**: Secure error messages without sensitive data exposure

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- [LinkedIn Profile Optimizer MCP](./src/index.ts): Original profile optimization tools
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk): Model Context Protocol TypeScript SDK

## ⚡ Quick Start

```bash
# 1. Install
npm install -g linkedin-api-mcp

# 2. Configure (add your LinkedIn app credentials)
linkedin-api-mcp --setup

# 3. Add to Claude
claude mcp add linkedin-api linkedin-api-mcp

# 4. Start using in Claude
# "linkedin_people_get_profile" to get your profile
# "linkedin_posts_create" to create posts
# "linkedin_ads_get_campaigns" to manage campaigns
```

## 📞 Support

- **GitHub Issues**: [Report bugs and feature requests](https://github.com/yourusername/linkedin-api-mcp/issues)
- **LinkedIn Developer Support**: For API-specific questions
- **Partner Program**: For partnership and access questions

## 🚨 Disclaimer

This project is not affiliated with LinkedIn Corporation. LinkedIn is a trademark of LinkedIn Corporation. Use of LinkedIn APIs is subject to LinkedIn's Terms of Service and API Terms of Use.

---

**Made with ❤️ for the LinkedIn API developer community**