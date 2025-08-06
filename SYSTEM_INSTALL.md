# System-Wide Installation Guide for LinkedIn MCP

## 📦 Installation Methods

### Method 1: NPM Global Install (Recommended)

```bash
# Install globally from npm
npm install -g @maheidem/linkedin-mcp

# Or if you're in the local directory
npm install -g .

# Verify installation
linkedin-mcp --version
```

### Method 2: Build and Install Locally

```bash
# Clone the repository
git clone https://github.com/Maheidem/linkedin-optimizer-mcp.git
cd linkedin-optimizer-mcp

# Install dependencies and build
npm install
npm run build

# Create global link
npm link

# Verify installation
linkedin-mcp status
```

## 🔧 System Setup

### 1. Configure MCP Server for Claude

Run the automatic installer:
```bash
linkedin-mcp install
```

This will:
- Detect your Claude installation (Desktop or Code)
- Add the MCP server configuration
- Set up token storage directory
- Configure environment variables

### 2. Manual Configuration (if needed)

If automatic installation fails, manually edit your Claude config:

**Claude Desktop** (macOS):
```bash
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Claude Code** (all platforms):
```bash
nano ~/.claude.json
```

Add this configuration:
```json
{
  "mcpServers": {
    "linkedin-complete": {
      "command": "npx",
      "args": ["-y", "--package=@maheidem/linkedin-mcp", "linkedin-mcp-server"],
      "env": {
        "LINKEDIN_TOKEN_STORAGE_PATH": "~/.linkedin-mcp/tokens"
      }
    }
  }
}
```

## 🔐 LinkedIn OAuth Setup

### 1. Create LinkedIn App

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Click "Create app"
3. Fill in required information:
   - App name: "Your MCP Server" (or any name)
   - LinkedIn Page: Select or create one
   - Privacy policy URL: Can use your website
   - App logo: Upload any logo

### 2. Configure OAuth

1. In your app settings, go to "Auth" tab
2. Add Authorized redirect URL:
   ```
   http://localhost:3000/callback
   ```
3. Note your:
   - **Client ID**
   - **Client Secret**

### 3. Set Up Credentials

```bash
# Run the auth setup
linkedin-mcp auth

# Enter your Client ID and Client Secret when prompted
```

Or set environment variables:
```bash
# Add to ~/.bashrc, ~/.zshrc, or ~/.bash_profile
export LINKEDIN_CLIENT_ID="your_client_id"
export LINKEDIN_CLIENT_SECRET="your_client_secret"
```

## 🚀 First-Time Authentication

### 1. Get Authorization URL

In Claude, run:
```
Use linkedin_get_auth_url to get the authorization URL
```

### 2. Authorize the App

1. Copy the URL from Claude's response
2. Open it in your browser
3. Log in to LinkedIn
4. Click "Allow" to authorize the app
5. You'll be redirected to `http://localhost:3000/callback?code=XXXXX`
6. Copy the `code` parameter from the URL

### 3. Exchange Code for Token

In Claude:
```
Use linkedin_exchange_code with code "XXXXX"
```

The token will be automatically saved to `~/.linkedin-mcp/tokens/`

## ✅ Verify Installation

### Check System Installation
```bash
# Check CLI is installed
which linkedin-mcp

# Check version
linkedin-mcp --version

# Check status
linkedin-mcp status
```

### Check Claude Integration

In Claude, test these commands:
```
Check my LinkedIn authentication status
```

Should use `linkedin_check_token_status` and show your authentication status.

```
Get my LinkedIn profile information
```

Should use `linkedin_get_user_info` without requiring a token.

## 🌍 Environment Variables

### Optional Configuration

Add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
# Custom token storage location (optional)
export LINKEDIN_TOKEN_STORAGE_PATH="$HOME/.linkedin-mcp/tokens"

# LinkedIn OAuth credentials (optional, can use 'linkedin-mcp auth' instead)
export LINKEDIN_CLIENT_ID="your_client_id"
export LINKEDIN_CLIENT_SECRET="your_client_secret"

# Enable debug logging (optional)
export LINKEDIN_MCP_DEBUG=true
```

## 📁 File Locations

The system installation creates files in these locations:

```
~/.linkedin-mcp/
├── tokens/
│   └── linkedin_token.json    # Stored access token
│   └── credentials.json       # OAuth credentials
└── logs/                       # Debug logs (if enabled)

# Claude configuration
~/Library/Application Support/Claude/claude_desktop_config.json  # macOS
~/.claude.json                                                    # Claude Code
%APPDATA%/Claude/claude_desktop_config.json                      # Windows
~/.config/claude/claude_desktop_config.json                      # Linux
```

## 🔄 Updating

### Update to Latest Version
```bash
# Update global package
npm update -g @maheidem/linkedin-mcp

# Verify update
linkedin-mcp --version
```

### Reconfigure After Update
```bash
# Reconfigure Claude integration
linkedin-mcp install

# Check everything works
linkedin-mcp status
```

## 🐛 Troubleshooting

### Command Not Found

If `linkedin-mcp` command not found:
```bash
# Check npm global bin directory
npm bin -g

# Add to PATH if needed (add to ~/.bashrc or ~/.zshrc)
export PATH="$(npm bin -g):$PATH"
```

### MCP Server Not Connecting

1. Restart Claude after installation
2. Check Claude logs:
   - macOS: `~/Library/Logs/Claude/`
   - Check Console.app for Claude-related messages

3. Test MCP server directly:
```bash
# Test server responds
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | linkedin-mcp-server
```

### Token Issues

```bash
# Check token status
ls -la ~/.linkedin-mcp/tokens/

# Clear old tokens if needed
rm ~/.linkedin-mcp/tokens/linkedin_token.json

# Re-authenticate
# Then use Claude to get new auth URL and exchange code
```

### Permission Issues

```bash
# Fix permissions
chmod 700 ~/.linkedin-mcp
chmod 700 ~/.linkedin-mcp/tokens
chmod 600 ~/.linkedin-mcp/tokens/*.json
```

## 🔒 Security Best Practices

1. **Token Storage**: Tokens are stored locally in your home directory
2. **Permissions**: Ensure only you can read token files
3. **Git Ignore**: Never commit tokens to version control
4. **Token Rotation**: Re-authenticate every 60 days (LinkedIn token expiry)

## 📊 Usage Examples

Once installed system-wide, you can use in Claude:

```
Create a LinkedIn post about AI trends

Get my recent LinkedIn posts

Analyze my LinkedIn profile and suggest improvements

Check my LinkedIn authentication status
```

All commands will work without needing to provide access tokens!

## 🔗 Quick Reference

| Command | Description |
|---------|-------------|
| `linkedin-mcp install` | Install and configure for Claude |
| `linkedin-mcp auth` | Set up OAuth credentials |
| `linkedin-mcp status` | Check installation status |
| `linkedin-mcp uninstall` | Remove from Claude config |
| `linkedin-mcp --help` | Show all commands |

## 📚 Additional Resources

- [GitHub Repository](https://github.com/Maheidem/linkedin-optimizer-mcp)
- [NPM Package](https://www.npmjs.com/package/@maheidem/linkedin-mcp)
- [LinkedIn API Documentation](https://docs.microsoft.com/en-us/linkedin/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

---

**Need Help?** Open an issue on [GitHub](https://github.com/Maheidem/linkedin-optimizer-mcp/issues)