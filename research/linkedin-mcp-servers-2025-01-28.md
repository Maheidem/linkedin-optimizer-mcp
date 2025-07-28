# LinkedIn MCP (Model Context Protocol) Servers Research
**Date**: 2025-01-28  
**Research Scope**: LinkedIn MCP implementations, features, and compliance  
**Key Questions**: What LinkedIn MCP servers exist, their capabilities, and how to use them

## Executive Summary

This research identifies multiple LinkedIn MCP (Model Context Protocol) server implementations that enable AI assistants to interact with LinkedIn data. These range from unofficial API integrations to web scraping solutions and official API implementations. Key findings include 5 main LinkedIn MCP servers with varying approaches, features, and compliance considerations. Most implementations come with significant Terms of Service risks, except for the official LinkedIn Compliance API approach which requires partnership approval.

## Detailed Findings

### 1. Main LinkedIn MCP Implementations

#### 1.1 adhikasp/mcp-linkedin
- **Approach**: Uses unofficial LinkedIn API via linkedin-api
- **Key Features**:
  - Get LinkedIn feed posts
  - Search for jobs with location filters
  - Analyze job matches against resumes
- **Installation**: 
  ```bash
  npx -y @smithery/cli install mcp-linkedin --client claude
  ```
- **Authentication**: Requires LINKEDIN_EMAIL and LINKEDIN_PASSWORD environment variables
- **Risk Level**: High - uses unofficial API

#### 1.2 stickerdaniel/linkedin-mcp-server
- **Approach**: Web scraping via Selenium/ChromeDriver
- **Key Features**:
  - Profile scraping (work history, education, skills, connections)
  - Company analysis and information extraction
  - Job details retrieval using LinkedIn job IDs
  - Job search with keyword and location filters
  - Personalized job recommendations
- **Installation**: Docker or UV package manager
- **Authentication**: Uses LinkedIn cookies stored in system keychain
- **Risk Level**: High - web scraping violates LinkedIn ToS

#### 1.3 fredericbarthelet/linkedin-mcp-server
- **Approach**: Uses official LinkedIn Community Management API
- **Key Features**:
  - OAuth integration with draft third-party authorization flow
  - Get user info (name, headline, profile picture)
  - Post content on LinkedIn
  - Content management capabilities
- **Authentication**: Requires LinkedIn client with Community Management API product
- **Risk Level**: Low - uses official API (if properly authorized)

#### 1.4 felipfr/linkedin-mcpserver
- **Approach**: LinkedIn API integration (unclear if official)
- **Key Features**:
  - Profile search with advanced filters
  - Profile retrieval
  - Job search capabilities
- **Installation**: Standard npm installation
- **Risk Level**: Medium - API status unclear

#### 1.5 horizondatawave/hdw-mcp-server
- **Approach**: Uses HorizonDataWave API (third-party service)
- **Key Features**:
  - Comprehensive profile management
  - Connection management and invitations
  - Chat messaging capabilities
  - Comment posting
  - Company search and employee lookup
  - Sales Navigator integration
- **Installation**: 
  ```bash
  npm i @horizondatawave/mcp
  ```
- **Authentication**: Requires HDW_ACCESS_TOKEN and HDW_ACCOUNT_ID
- **Risk Level**: Medium - depends on HorizonDataWave's compliance

### 2. Alternative Approaches

#### 2.1 Playwright MCP for Browser Automation
- **Server**: @playwright/mcp
- **Capabilities**:
  - Browser automation across Chrome, Firefox, WebKit
  - Web scraping without screenshots
  - Form automation
  - JavaScript execution
- **Configuration**:
  ```json
  {
    "mcpServers": {
      "playwright": {
        "command": "npx",
        "args": ["@playwright/mcp@latest"]
      }
    }
  }
  ```
- **Note**: Could theoretically work with LinkedIn but would violate ToS

### 3. Official MCP Registry Status

- **Official Registry**: modelcontextprotocol/servers on GitHub
- **Community Registry**: Being developed at modelcontextprotocol/registry
- **Community Hubs**: MCP.so, Smithery, PulseMCP, awesome-mcp-servers
- **Status**: Active development of centralized MCP metaregistry with REST API

## Compliance and Legal Considerations

### LinkedIn Terms of Service Violations

LinkedIn explicitly prohibits:
- Using bots or automated methods to access services
- Adding or downloading contacts automatically
- Sending or redirecting messages via automation
- Web scraping or data extraction
- Simulating LinkedIn's interface

### Official API Requirements

- **Compliance API**: Restricted to approved developers only
- **Partner Program**: Private, paid partnership requiring:
  - FINRA/SEC registration (for compliance use cases)
  - Extensive documentation and audits
  - Several months approval process
- **Monitoring**: LinkedIn actively monitors API usage for compliance

### Risk Assessment by Implementation

1. **High Risk**: adhikasp/mcp-linkedin, stickerdaniel/linkedin-mcp-server (ToS violations)
2. **Medium Risk**: HDW MCP Server, felipfr/linkedin-mcpserver (third-party dependencies)
3. **Low Risk**: fredericbarthelet/linkedin-mcp-server (if properly authorized)

## Implementation Recommendations

### For Personal/Research Use
1. Be aware that most implementations violate LinkedIn ToS
2. Consider read-only operations over write operations
3. Implement rate limiting to avoid detection
4. Use at your own risk - account bans are possible

### For Commercial/Production Use
1. Only use official LinkedIn APIs with proper authorization
2. Consider LinkedIn Compliance API partnership if eligible
3. Avoid all web scraping or unofficial API approaches
4. Consult legal counsel before implementation

### Technical Setup Example (adhikasp/mcp-linkedin)
```json
{
  "mcpServers": {
    "linkedin": {
      "command": "uvx",
      "args": ["--from", "git+https://github.com/adhikasp/mcp-linkedin", "mcp-linkedin"],
      "env": {
        "LINKEDIN_EMAIL": "your_email@example.com",
        "LINKEDIN_PASSWORD": "your_password"
      }
    }
  }
}
```

## Gaps and Future Research

1. **Unclear Official Support**: No clear official LinkedIn MCP server from LinkedIn
2. **Compliance Pathways**: Limited information on becoming an approved partner
3. **Rate Limits**: Unclear rate limiting across different implementations
4. **Feature Parity**: No single implementation covers all LinkedIn features
5. **Long-term Viability**: Risk of implementations breaking due to LinkedIn changes

## Sources

- GitHub: adhikasp/mcp-linkedin
- GitHub: stickerdaniel/linkedin-mcp-server
- GitHub: fredericbarthelet/linkedin-mcp-server
- GitHub: horizondatawave/hdw-mcp-server
- GitHub: modelcontextprotocol/servers
- LinkedIn API Terms of Use
- LinkedIn User Agreement
- Various MCP community resources (MCP.so, Smithery, etc.)

## Version History

- v1.0 (2025-01-28): Initial comprehensive research on LinkedIn MCP implementations