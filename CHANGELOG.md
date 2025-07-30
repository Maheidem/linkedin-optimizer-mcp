# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-07-30

### Added
- 🚀 **NPX Installation**: One-command installation with `npx @maheidem/linkedin-mcp install`
- 🔧 **CLI Management**: Complete command-line interface for setup and management
- 📱 **Cross-Platform Support**: Automatic detection for Windows, macOS, and Linux
- 🔐 **Secure Token Storage**: Automatic setup of token storage directory
- ⚙️ **Auto-Configuration**: Automatic Claude Desktop/Code configuration
- 📊 **Status Monitoring**: Real-time status checking with `linkedin-mcp status`
- 🔑 **OAuth Setup**: Guided authentication setup with `linkedin-mcp auth`
- 🗑️ **Clean Uninstall**: Complete removal with `linkedin-mcp uninstall`

### Features
- **LinkedIn Posting**: Create and publish posts with full formatting
- **Profile Analytics**: Get detailed insights and optimization recommendations
- **Content Generation**: AI-powered post creation with industry best practices
- **Profile Management**: Update and optimize LinkedIn profiles
- **Secure OAuth**: Robust token management with automatic refresh

### Technical
- TypeScript implementation with full type safety
- Cross-platform compatibility (Windows, macOS, Linux)
- Automatic Claude configuration detection
- Secure local token storage
- Comprehensive error handling
- Built-in status monitoring

### CLI Commands
- `linkedin-mcp install` - Install and configure for Claude
- `linkedin-mcp status` - Check installation status
- `linkedin-mcp auth` - Set up LinkedIn OAuth credentials
- `linkedin-mcp uninstall` - Remove configuration

### Installation Methods
- NPX (recommended): `npx @maheidem/linkedin-mcp install`
- Global install: `npm install -g @maheidem/linkedin-mcp && linkedin-mcp install`
- Local install: `npm install @maheidem/linkedin-mcp && npx linkedin-mcp install`

### Documentation
- Complete README with installation and usage guides
- Troubleshooting section with common solutions
- API reference with examples
- Cross-platform configuration details

### Security
- Local-only token storage
- No data collection or tracking
- Secure OAuth implementation
- Encrypted credential storage