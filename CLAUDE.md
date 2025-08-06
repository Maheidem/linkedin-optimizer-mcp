# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 Project Overview

This is a LinkedIn API MCP (Model Context Protocol) server that provides comprehensive LinkedIn functionality through Claude Desktop/Code. It enables creating posts, profile optimization, content generation, and analytics - all accessible through natural language interfaces.

## 📊 Key Architecture Components

### Core MCP Server
- **Main Entry**: `src/linkedin-complete-mcp.ts` - The primary MCP server implementation
- **CLI Tool**: `src/cli.ts` - Installation and management CLI 
- **Token Manager**: `src/token-manager.ts` - Secure OAuth token handling

### LinkedIn API Integration
- **API Client**: `src/api/linkedin-client.ts` - REST API client implementation
- **Type Definitions**: `src/types/linkedin.d.ts` - TypeScript interfaces for API

### Content Tools
- **Content Generator**: `src/tools/generator.ts` - AI-powered content generation
- **Profile Analyzer**: `src/tools/analyzer.ts` - Profile optimization analysis

## 🛠️ Development Commands

### Build & Development
```bash
npm run build          # Build TypeScript to dist/
npm run dev           # Watch mode with tsx
npm run type-check    # Type checking without emit
npm run clean         # Clean dist directory
```

### Testing
```bash
npm test                      # Run Jest tests
npm run test:examples         # Test all LinkedIn functions
npm run test:oauth           # Test OAuth flow
```

### Code Quality
```bash
npm run lint          # ESLint for TypeScript files
npm run format        # Prettier formatting
```

### MCP Server Operations
```bash
npm start                     # Start MCP server
npm run install-mcp          # Install into Claude config
linkedin-mcp status          # Check installation status
linkedin-mcp auth           # Set up OAuth credentials
```

### Example Scripts
```bash
npm run demo                 # Run demo script
npm run auth-setup          # Get LinkedIn auth URL
node examples/post-to-linkedin.js  # Post to LinkedIn
```

## 📋 LinkedIn Post Creation Workflow

### Standard Workflow for Creating Posts

1. **Check Current Date/Time** (MANDATORY FIRST)
   ```bash
   date
   ```

2. **Research Current Topics**
   - Use research-documentation-specialist agent for latest news
   - Focus on ML/DS/AI developments with metrics

3. **Verify Sources** (CRITICAL)
   - Find actual URLs for all statistics
   - Ensure sources are accessible (not paywalled)
   - Verify publication dates

4. **Create Content**
   - Start with direct insight (NO "As a Principal..." openings)
   - Include verified statistics with source URLs
   - Target ML/DS professionals with specific questions
   - Use 5-7 relevant hashtags

5. **Execute Post**
   ```bash
   cd ~/Documents/dev/linkedin-optimizer-mcp
   node examples/post-to-linkedin.js
   ```

## 🔑 Authentication & Configuration

### OAuth Setup
1. Create app at [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Add redirect URI: `http://localhost:3000/callback`
3. Store credentials using `linkedin-mcp auth`

### Token Storage
- **Location**: `~/.linkedin-mcp/tokens/`
- **Auto-refresh**: Tokens refresh automatically when expired

### Claude Configuration
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`

## 📁 Project Structure

```
linkedin-optimizer-mcp/
├── src/                      # TypeScript source
│   ├── linkedin-complete-mcp.ts  # Main MCP server
│   ├── cli.ts                    # CLI tool
│   ├── token-manager.ts          # Token handling
│   ├── api/                      # API client
│   └── tools/                    # Content tools
├── dist/                     # Compiled JavaScript
├── examples/                 # Usage examples
│   ├── post-to-linkedin.js      # Posting script
│   ├── linkedin-oauth-*.js      # OAuth helpers
│   └── linkedin-mcp-demo.js     # Demo script
├── tests/                    # Test files
├── docs/                     # Documentation
└── .taskmaster/             # Task Master integration
```

## 🔧 TypeScript Configuration

- **Target**: ES2022
- **Module**: CommonJS  
- **Strict Mode**: Enabled
- **Source Maps**: Generated
- **Declaration Files**: Generated

## 📝 Task Master Integration

The project uses Task Master for task management. Key commands:

```bash
task-master list              # Show all tasks
task-master next             # Get next task
task-master show <id>        # View task details
task-master set-status --id=<id> --status=done
```

Task files are stored in `.taskmaster/tasks/` and documentation in `.taskmaster/docs/`.

## 🚀 Common Development Tasks

### Adding New LinkedIn API Endpoints
1. Add type definitions to `src/types/linkedin.d.ts`
2. Implement API call in `src/api/linkedin-client.ts`
3. Add MCP tool handler in `src/linkedin-complete-mcp.ts`
4. Create example in `examples/` directory
5. Add test coverage in `tests/`

### Testing Changes
1. Build: `npm run build`
2. Type check: `npm run type-check`
3. Run tests: `npm test`
4. Test examples: `npm run test:examples`
5. Test with Claude: Restart Claude after build

### Debugging MCP Server
1. Check logs in Claude's developer console
2. Test standalone: `npm start`
3. Verify configuration: `linkedin-mcp status`
4. Test OAuth: `npm run test:oauth`

## 🔄 Git Workflow

- **Main Branch**: `main`
- **Feature Branches**: `feature/description`
- **Commit Format**: `type(scope): description`
  - Types: feat, fix, refactor, docs, test, chore

## 📚 Key Dependencies

- **@modelcontextprotocol/sdk**: MCP server implementation
- **commander**: CLI framework
- **zod**: Schema validation
- **TypeScript**: Type safety
- **Jest**: Testing framework

## ⚠️ Important Notes

1. **OAuth Token**: The access token in examples is for testing only
2. **Source Verification**: Always verify sources before including in posts
3. **Rate Limits**: LinkedIn API has rate limits - handle appropriately
4. **Error Handling**: Implement proper error handling for all API calls
5. **Security**: Never commit real tokens or credentials

## 🎯 Post Creation Best Practices

### Content Structure
```
Hook (1 line)
↓
Context (2-3 sentences)
↓  
Analysis (2-4 bullet points)
↓
Engagement Question (1-2 sentences)
↓
Sources (mandatory with URLs)
↓
Hashtags (5-7 maximum)
```

### Core Hashtags
- `#MachineLearning`
- `#ArtificialIntelligence`
- `#MLOps`

### Contextual Hashtags (Choose 2-4)
- `#TechLeadership`
- `#GenAI`
- `#DataScience`
- `#Innovation`
- `#TechTrends`

## 🐛 Troubleshooting

### MCP Server Issues
```bash
linkedin-mcp status          # Check status
linkedin-mcp uninstall      # Clean reinstall
linkedin-mcp install
```

### Build Issues
```bash
npm run clean               # Clean dist
npm run build              # Rebuild
```

### OAuth Issues
```bash
linkedin-mcp auth          # Reset credentials
ls ~/.linkedin-mcp/tokens/ # Check token storage
```