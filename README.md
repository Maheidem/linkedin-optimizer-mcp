# LinkedIn Optimizer MCP

A Model Context Protocol (MCP) server that helps optimize LinkedIn profiles through AI-powered content generation and guided updates, while maintaining full compliance with LinkedIn's Terms of Service.

## Overview

This MCP server provides tools to analyze, optimize, and track LinkedIn profile improvements without using any automation or unofficial APIs. It generates optimized content that users manually apply to their profiles.

## Features

- 🔍 **Profile Analysis**: Analyze current profile against best practices
- ✨ **Content Generation**: AI-powered headline and summary optimization
- 📋 **Guided Updates**: Step-by-step instructions for profile improvements
- 📊 **Progress Tracking**: Monitor optimization progress over time
- ✅ **100% Compliant**: No automation, only content generation

## Architecture

```
linkedin-optimizer-mcp/
├── src/                    # Source code
│   ├── index.ts           # MCP server entry point
│   ├── tools/             # MCP tool implementations
│   ├── api/               # LinkedIn API integration
│   └── types/             # TypeScript definitions
├── docs/                   # Documentation
├── research/              # Research and specifications
└── examples/              # Usage examples
```

## Tools

### 1. `analyze_profile`
Analyzes your LinkedIn profile and provides optimization recommendations.

### 2. `generate_headline`
Creates multiple optimized headline options using your skills and target keywords.

### 3. `generate_summary`
Generates compelling About sections with achievements and value propositions.

### 4. `create_update_guide`
Provides step-by-step instructions for implementing profile improvements.

### 5. `track_updates`
Tracks manual update progress and measures impact.

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/linkedin-optimizer-mcp.git
cd linkedin-optimizer-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Install globally
npm install -g .
```

## Usage

### With Claude Desktop

Add to your Claude configuration:

```json
{
  "mcpServers": {
    "linkedin-optimizer": {
      "command": "node",
      "args": ["/path/to/linkedin-optimizer-mcp/dist/index.js"]
    }
  }
}
```

### With Claude CLI

```bash
claude mcp add linkedin-optimizer node /path/to/linkedin-optimizer-mcp/dist/index.js
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Compliance

This tool is designed to be 100% compliant with LinkedIn's Terms of Service:
- ✅ No automated profile updates
- ✅ No web scraping or unofficial APIs
- ✅ Only generates content for manual application
- ✅ Uses official LinkedIn API for read-only operations (when configured)

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Disclaimer

This tool is not affiliated with LinkedIn Corporation. LinkedIn is a trademark of LinkedIn Corporation.