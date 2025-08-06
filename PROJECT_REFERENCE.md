# LinkedIn Optimizer MCP - Comprehensive Project Reference

## 📋 Project Overview

**Location**: `/Users/maheidem/Documents/dev/linkedin-optimizer-mcp`
**Name**: @maheidem/linkedin-mcp
**Version**: 1.1.0
**Author**: Marcos Heidemann
**License**: MIT

### Purpose
A comprehensive LinkedIn API MCP (Model Context Protocol) server that provides full LinkedIn functionality through Claude Desktop/Code. Enables creating posts, profile optimization, content generation, and analytics - all accessible through natural language interfaces.

### Key Value Propositions
- Automated LinkedIn content creation with AI optimization
- Professional post creation following specific best practices
- Research-backed content generation
- OAuth authentication and token management
- Streamlined workflow integration with Claude Code
- Profile analysis and optimization recommendations

## 🏗️ Architecture Components

### Core MCP Server Files
- **`src/linkedin-complete-mcp.ts`** - Primary MCP server implementation with all LinkedIn tools
- **`src/cli.ts`** - Installation and management CLI tool
- **`src/index.ts`** - Package entry point
- **`src/token-manager.ts`** - Secure OAuth token handling and storage

### LinkedIn API Integration
- **`src/api/linkedin-client.ts`** - REST API client implementation
- **`src/types/linkedin.d.ts`** - TypeScript interfaces for LinkedIn API responses

### Content Generation Tools
- **`src/tools/generator.ts`** - AI-powered content generation
- **`src/tools/analyzer.ts`** - Profile optimization analysis

### Alternative Server Implementations
- **`src/linkedin-api-mcp.ts`** - Basic API-only server
- **`src/linkedin-basic-mcp.ts`** - Minimal functionality server
- **`src/linkedin-working-mcp.ts`** - Development/testing server

## 🔧 Development Workflow & Commands

### Build & Development
```bash
npm run build          # Build TypeScript to dist/ with executable permissions
npm run dev           # Watch mode with tsx for development
npm run type-check    # TypeScript type checking without emit
npm run clean         # Clean dist directory
```

### Testing Strategy
```bash
npm test                      # Run Jest unit tests
npm run test:examples         # Test all LinkedIn functions end-to-end
npm run test:oauth           # Test OAuth authentication flow
```

### Code Quality & Standards
```bash
npm run lint          # ESLint for TypeScript files
npm run format        # Prettier code formatting
```

### MCP Server Operations
```bash
npm start                     # Start MCP server directly
npm run install-mcp          # Install into Claude Desktop/Code config
linkedin-mcp status          # Check installation status
linkedin-mcp auth           # Set up OAuth credentials interactively
```

### Example & Demo Scripts
```bash
npm run demo                 # Run comprehensive demo script
npm run auth-setup          # Get LinkedIn OAuth authorization URL
node examples/post-to-linkedin.js  # Direct posting script
```

## 📝 LinkedIn Post Creation Workflow

### Complete Workflow Steps

1. **Date/Time Check (MANDATORY FIRST STEP)**
   ```bash
   date
   ```
   **Purpose**: Get accurate current date/time for research context

2. **Research Phase**
   Use research-documentation-specialist agent:
   - Focus on latest ML/DS/AI developments with specific metrics
   - Find recent breakthroughs with verifiable statistics
   - Identify business/industry impact data

3. **Source Verification (CRITICAL)**
   - Find and verify actual URLs for all statistics and claims
   - Ensure sources are accessible (not paywalled)
   - Confirm publication dates are current
   - Provide clickable, working URLs

4. **Content Creation Rules**

   **❌ NEVER DO:**
   - Start with "As a Principal..." or any role-based opening
   - Include statistics without verified source URLs
   - Use generic professional introductions

   **✅ ALWAYS DO:**
   - Start with direct insight, observation, or intriguing statement
   - Include only verified statistics with working URLs
   - Provide mandatory sources section with numbered list
   - Ask specific questions targeting ML/DS professionals
   - Use 5-7 relevant hashtags maximum

5. **Post Structure Template**
   ```
   Hook (1 line)
   ↓
   Context/Development (2-3 sentences)
   ↓  
   Analysis/Perspective (2-4 bullet points)
   ↓
   Engagement Question (1-2 sentences)
   ↓
   Sources (mandatory)
   ↓
   Hashtags (5-7 maximum)
   ```

6. **Quality Control Checklist**
   - [ ] No role-based opening ("As a...")
   - [ ] All statistics have valid source URLs
   - [ ] Sources are accessible and current
   - [ ] Authentic voice and genuine insights
   - [ ] Specific engagement question for ML/DS professionals
   - [ ] 5-7 relevant hashtags
   - [ ] 600-1000 character target met
   - [ ] Technical accuracy verified

7. **Post Execution**
   ```bash
   cd ~/Documents/dev/linkedin-optimizer-mcp
   node examples/post-to-linkedin.js
   ```

### Hashtag Strategy
**Core Hashtags (Always Include):**
- `#MachineLearning`
- `#ArtificialIntelligence` 
- `#MLOps`

**Contextual Hashtags (Choose 2-4):**
- `#TechLeadership` (strategy/management)
- `#GenAI` (generative AI)
- `#DataScience` (data-focused)
- `#Innovation` (research/breakthroughs)
- `#TechTrends` (industry analysis)

## 🔐 Authentication & Configuration

### OAuth Setup Process
1. Create LinkedIn Developer App at https://www.linkedin.com/developers/
2. Configure redirect URI: `http://localhost:3000/callback`
3. Store credentials using: `linkedin-mcp auth`
4. Token storage location: `~/.linkedin-mcp/tokens/`

### Access Token (Current)
```javascript
const accessToken = 'AQWrlZ3yFxQmHmjUFf7crk7isAfN_OtCovgtTVCI0fetxZg8E2dT4ye-H28OCxv4DnByc5UcWvtmrSwxOHs5U0lOOYhvGF-M2BZfwL3P19gvoXGnkQe_98Ijt8fX5Ye3EAg0wqsHA0EDwLGyBYY-rrY57rGEHl7rU1tULg5cB3I_bCH_p9smcyb2xCng5RWLDLc22hwOndFqKmVs2DnDui2ElhK5z4EV-JAdIMehXwnitX10XJfGBPEWHh0SQkP94veAp199ujToKXLYzo6E5AThtYFEuU4DGNvGvdNEZB5FZpNOh9aT-dNGuZ8dvuIjOdaE-BEGjKS1l-on_I2h26bSfyvN6A';
```

## 📁 Project Structure

```
linkedin-optimizer-mcp/
├── src/
│   ├── linkedin-complete-mcp.ts     # Main MCP server
│   ├── cli.ts                       # Installation CLI
│   ├── index.ts                     # Package entry point
│   ├── token-manager.ts             # OAuth management
│   ├── api/
│   │   └── linkedin-client.ts       # REST API client
│   ├── tools/
│   │   ├── analyzer.ts              # Profile analysis
│   │   └── generator.ts             # Content generation
│   └── types/
│       └── linkedin.d.ts            # TypeScript definitions
├── examples/
│   ├── post-to-linkedin.js          # Direct posting script
│   ├── linkedin-oauth-debug.js      # OAuth debugging
│   └── [other example scripts]
├── docs/
│   ├── LINKEDIN_POST_RULES.md       # Posting guidelines
│   ├── API_REFERENCE.md             # API documentation
│   └── SETUP_GUIDE.md               # Installation guide
├── tests/
│   ├── test-all-linkedin-functions.js
│   ├── test-auth.js
│   └── [other test files]
├── configs/
│   └── mcp-config.json              # MCP configuration
├── templates/
│   └── claude_config_template.json  # Claude config template
└── dist/                            # Built TypeScript files
```

## 🧪 Testing Strategy

### Test Categories
1. **Unit Tests** (`npm test`) - Jest-based TypeScript testing
2. **Integration Tests** (`npm run test:examples`) - End-to-end functionality
3. **OAuth Tests** (`npm run test:oauth`) - Authentication flow validation
4. **Manual Tests** - Individual test scripts in `/tests` directory

### Key Test Files
- `test-all-linkedin-functions.js` - Comprehensive function testing
- `test-auth.js` - Authentication validation
- `test-posting.js` - Post creation testing
- `test-permissions.js` - API permission validation

## 🔗 Task Master Integration

The project uses Task Master AI for project management:
- Configuration in `.taskmaster/CLAUDE.md`
- Task definitions in `.taskmaster/tasks/tasks.json`
- Individual task files in `.taskmaster/tasks/`

### Key Task Master Commands
```bash
task-master list                     # Show all tasks
task-master next                     # Get next task
task-master show <id>               # View task details
task-master set-status --id=<id> --status=done
```

## ⚠️ Important Notes & Warnings

### Security Considerations
- **Never commit access tokens** to version control
- Store tokens securely in `~/.linkedin-mcp/tokens/`
- Use environment variables for sensitive configuration
- OAuth tokens have expiration - implement refresh logic

### Development Best Practices
- Always use TypeScript strict mode (enabled)
- Run linting before commits (`npm run lint`)
- Test OAuth flow after any authentication changes
- Verify posting functionality with test accounts first
- Keep dependencies updated for security

### Common Issues & Debugging
1. **Token Expiration**: Check token validity with `test-auth.js`
2. **Permission Errors**: Verify LinkedIn app permissions
3. **Build Issues**: Clear dist directory and rebuild
4. **MCP Connection**: Check Claude configuration with `linkedin-mcp status`

### Performance Considerations
- LinkedIn API has rate limits - implement appropriate throttling
- Cache user data when possible to reduce API calls
- Use batch operations for multiple posts/updates
- Monitor token usage and refresh patterns

## 📚 Documentation References

### Internal Documentation
- `/docs/API_REFERENCE.md` - Complete API documentation
- `/docs/LINKEDIN_POST_RULES.md` - Content creation rules
- `/docs/SETUP_GUIDE.md` - Installation instructions
- `CLAUDE.md` - Claude Code integration guide

### External References
- LinkedIn API Documentation: https://docs.microsoft.com/en-us/linkedin/
- MCP Protocol Specification: https://modelcontextprotocol.org/
- OAuth 2.0 Flow: https://tools.ietf.org/html/rfc6749

## 🎯 Success Metrics

### Recent Performance
- **Success Rate**: 100% for recent posts
- **Engagement**: High technical discussion quality
- **Key Success Factor**: Verified sources + authentic voice + targeted questions

### Quality Indicators
- Posts follow all content rules
- Sources are verifiable and current
- Engagement questions generate professional discussion
- Technical accuracy maintained
- No role-based openings used

---

**Last Updated**: January 2025
**Project Status**: Active Development
**Claude Integration**: Fully Configured
**Testing Status**: Comprehensive Suite Available