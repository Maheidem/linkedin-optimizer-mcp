# @maheidem/linkedin-mcp

[![npm version](https://badge.fury.io/js/@maheidem%2Flinkedin-mcp.svg)](https://badge.fury.io/js/@maheidem%2Flinkedin-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive LinkedIn API MCP (Model Context Protocol) server that integrates seamlessly with Claude Desktop/Code. This package provides full LinkedIn functionality including post creation, profile optimization, content generation, and analytics - all accessible through Claude's natural language interface.

## 🚀 Quick Start

Install and configure with a single command:

```bash
npx @maheidem/linkedin-mcp install
```

That's it! The installer will:
- ✅ Install the MCP server
- ✅ Automatically configure Claude Desktop/Code
- ✅ Set up token storage
- ✅ Provide setup instructions

## 📋 Features

### ✨ Core Functionality
- **🚀 LinkedIn Posting**: Create and publish posts with full formatting
- **🔍 Profile Analytics**: Get detailed insights and optimization recommendations  
- **📊 Content Analytics**: Track post performance and engagement metrics
- **🎯 Content Generation**: AI-powered post creation with industry best practices
- **👤 Profile Management**: Update and optimize LinkedIn profiles
- **🔐 Secure OAuth**: Robust token management with automatic refresh

### 🛠 Developer Features  
- **📱 Cross-Platform**: Works on Windows, macOS, and Linux
- **🔧 CLI Management**: Easy installation, configuration, and maintenance
- **📖 Comprehensive API**: All LinkedIn REST API endpoints available
- **🔒 Security First**: Secure token storage and handling
- **📚 Full Documentation**: Complete API reference and examples

## 📦 Installation Methods

### Method 1: NPX Install (Recommended)
```bash
npx @maheidem/linkedin-mcp install
```

### Method 2: Global Install + Setup
```bash
npm install -g @maheidem/linkedin-mcp
linkedin-mcp install
```

### Method 3: Local Install
```bash
npm install @maheidem/linkedin-mcp
npx linkedin-mcp install
```

## 🔧 CLI Commands

### Installation & Setup
```bash
# Install and configure for Claude
linkedin-mcp install

# Check installation status  
linkedin-mcp status

# Set up LinkedIn OAuth credentials
linkedin-mcp auth

# Remove configuration
linkedin-mcp uninstall
```

### Usage Examples
```bash
# Check if everything is working
linkedin-mcp status

# Set up authentication
linkedin-mcp auth
```

## 🔐 Authentication Setup

After installation, you need to set up LinkedIn OAuth:

1. **Create LinkedIn App**:
   - Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
   - Create a new app
   - Note your Client ID and Client Secret

2. **Configure Redirect URI**:
   - Add `http://localhost:3000/callback` to your app's redirect URIs

3. **Set Up Credentials**:
   ```bash
   linkedin-mcp auth
   ```

4. **Complete OAuth Flow**:
   - Use the LinkedIn OAuth flow to get an access token
   - The token will be automatically managed by the MCP server

## 🎯 Usage with Claude

Once installed, you can use LinkedIn functionality directly in Claude:

### Creating Posts
```
Create a LinkedIn post about the latest developments in AI, targeting ML engineers and including relevant hashtags.
```

### Profile Optimization  
```
Analyze my LinkedIn profile and provide optimization recommendations for better visibility in the tech industry.
```

### Content Strategy
```
Generate 5 LinkedIn post ideas about machine learning trends, each with different engagement strategies.
```

### Analytics & Insights
```
Show me the performance metrics for my last 10 LinkedIn posts and identify the most engaging content types.
```

## 📊 Available Tools

The MCP server provides these tools to Claude:

### 🚀 Posting & Content
- `linkedin_create_post` - Create and publish posts
- `linkedin_create_optimized_post` - AI-generated optimized posts
- `linkedin_post_profile_update` - Announce profile changes

### 📊 Analytics & Data  
- `linkedin_get_user_posts` - Retrieve your posts with pagination
- `linkedin_get_post_details` - Detailed post analytics
- `linkedin_get_user_activity` - Activity timeline and engagement

### 👤 Profile Management
- `linkedin_get_user_info` - User profile information
- `linkedin_analyze_profile_from_data` - Profile optimization analysis
- `linkedin_generate_optimized_content` - Content generation for profiles

### 🔐 Authentication
- `linkedin_get_auth_url` - Generate OAuth URLs
- `linkedin_exchange_code` - Handle OAuth token exchange

## 🔧 Configuration

### Claude Configuration Location
The installer automatically detects and configures:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`  
- **Linux**: `~/.config/claude/claude_desktop_config.json`

### Token Storage
Tokens are securely stored at:
- **All Platforms**: `~/.linkedin-mcp/tokens/`

### Example Configuration
```json
{
  "mcpServers": {
    "linkedin-complete": {
      "command": "node",
      "args": ["/path/to/server/linkedin-complete-mcp.js"],
      "env": {
        "LINKEDIN_TOKEN_STORAGE_PATH": "/home/user/.linkedin-mcp/tokens"
      }
    }
  }
}
```

## 🐛 Troubleshooting

### Installation Issues
```bash
# Check status
linkedin-mcp status

# Reinstall if needed
linkedin-mcp uninstall
linkedin-mcp install
```

### Authentication Problems
```bash
# Reset credentials
linkedin-mcp auth

# Check token storage
ls ~/.linkedin-mcp/tokens/
```

### Claude Integration Issues
1. Restart Claude Desktop/Code after installation
2. Check configuration file location matches your system
3. Verify MCP server permissions

### Common Solutions
- **"Server not found"**: Run `linkedin-mcp install` again
- **"Token expired"**: The server automatically refreshes tokens
- **"Permission denied"**: Check file permissions on token directory

## 📚 API Reference

### Core Methods

#### Creating Posts
```javascript
// Through Claude's natural language interface:
"Create a post about AI trends with these key points: [points]"

// Direct API usage:
linkedin_create_post({
  text: "Your post content here",
  visibility: "PUBLIC"
})
```

#### Profile Analysis
```javascript
linkedin_analyze_profile_from_data({
  name: "Your Name",
  currentHeadline: "Current headline",
  industry: "Technology"
})
```

See [API_REFERENCE.md](./docs/API_REFERENCE.md) for complete documentation.

## 🔒 Security & Privacy

- **🔐 Secure Storage**: Tokens encrypted and stored locally
- **🔄 Auto-Refresh**: Automatic token renewal
- **🚫 No Data Collection**: No analytics or tracking
- **🏠 Local First**: All processing happens on your machine

## 🤝 Contributing

Contributions welcome! Please see our contributing guidelines.

### Development Setup
```bash
git clone https://github.com/maheidem/linkedin-mcp
cd linkedin-mcp
npm install
npm run build
```

### Testing
```bash
npm test
npm run dev  # Development mode
```

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

Built with:
- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [LinkedIn REST API](https://docs.microsoft.com/en-us/linkedin/)
- [Commander.js](https://github.com/tj/commander.js/)

## 📞 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/maheidem/linkedin-mcp/issues)  
- 📚 **Documentation**: [Full Docs](./docs/)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/maheidem/linkedin-mcp/discussions)

---

**Made with ❤️ for the Claude community**