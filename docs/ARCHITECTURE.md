# LinkedIn Optimizer MCP - Architecture Documentation

> **Version**: 2.0.0 | **Total Lines**: ~400 TypeScript (main server) | **MCP Tools**: 5 Working

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Directory Structure](#3-directory-structure)
4. [MCP Tools Reference](#4-mcp-tools-reference)
5. [Design Patterns](#5-design-patterns)
6. [Security Architecture](#6-security-architecture)
7. [LinkedIn API Integration](#7-linkedin-api-integration)
8. [OAuth 2.0 + PKCE Flow](#8-oauth-20--pkce-flow)
9. [API Version Management](#9-api-version-management)
10. [Rate Limiting & Error Handling](#10-rate-limiting--error-handling)
11. [Testing Coverage](#11-testing-coverage)
12. [Code Quality Metrics](#12-code-quality-metrics)
13. [Gaps & Recommendations](#13-gaps--recommendations)

---

## 1. Executive Summary

The **LinkedIn Optimizer MCP** (`@maheidem/linkedin-mcp`) is a production-ready Model Context Protocol server providing comprehensive LinkedIn API integration with Claude Desktop/Code. It features enterprise-grade token security, OAuth 2.0 with PKCE, and a modular architecture.

### Key Strengths

| Area | Highlights |
|------|------------|
| **Security** | AES-256-GCM encryption, PBKDF2 key derivation (100k iterations), automatic token rotation |
| **Architecture** | Clean separation of concerns across 7 modules |
| **Testing** | 11 test files covering security, auth, API, and storage |
| **Documentation** | Comprehensive JSDoc comments, README, CHANGELOG |

### Quality Scores

| Category | Score | Assessment |
|----------|-------|------------|
| Security | 8.5/10 | Strong crypto, minor hardcoding issues |
| Code Quality | 7.5/10 | Good architecture, type safety gaps |
| Maintainability | 8/10 | Clear structure, good documentation |
| Testing | 7/10 | Good unit tests, limited integration |
| Documentation | 8/10 | Comprehensive, could add ADRs |

**Overall Status**: Production-Ready

---

## 2. Architecture Overview

```
                    ┌─────────────────────────────────────────────────────┐
                    │            Claude Desktop/Code (User)               │
                    └────────────────────┬────────────────────────────────┘
                                         │ MCP Protocol (stdio)
                    ┌────────────────────▼────────────────────────────────┐
                    │      linkedin-complete-mcp.ts (Main MCP Server)     │
                    │      - 13 Tool definitions                          │
                    │      - Tool handlers/implementations                │
                    └────────┬──────────────────────────────┬─────────────┘
                             │                              │
                    ┌────────▼─────────────────┐   ┌────────▼──────────────┐
                    │   LinkedIn API Client    │   │ Token/Security Mgmt   │
                    │ - OAuth 2.0 with PKCE    │   │ - Token Lifecycle     │
                    │ - REST API endpoints     │   │ - Key Management      │
                    │ - Request handling       │   │ - Encryption          │
                    └────────┬─────────────────┘   └────────┬──────────────┘
                             │                              │
                    ┌────────▼──────────────────────────────▼──────────────┐
                    │              Secure Storage Layer                    │
                    │  - File-based encrypted storage                      │
                    │  - Backup & integrity verification                   │
                    │  - Location: ~/.linkedin-mcp/tokens/                 │
                    └──────────────────────────────────────────────────────┘
```

### Module Relationships

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   MCP Layer  │────▶│   API Layer  │────▶│  Auth Layer  │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Tools Layer  │     │Security Layer│◀───▶│Storage Layer │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 3. Directory Structure

```
linkedin-optimizer-mcp/
├── src/                                  (23 TypeScript files, 11,554 lines)
│   │
│   ├── api/                              (7 files - LinkedIn API layer)
│   │   ├── linkedin-client.ts            (834 lines)  - Main API client with sub-clients
│   │   ├── linkedin-api-v2024.ts         (783 lines)  - Version-aware API implementation
│   │   ├── linkedin-endpoints.ts         (437 lines)  - High-level endpoint wrappers
│   │   ├── version-manager.ts            (528 lines)  - API version management
│   │   ├── legacy-compatibility.ts       (346 lines)  - Backward compatibility layer
│   │   ├── types.ts                      (101 lines)  - Shared type definitions
│   │   └── index.ts                      (114 lines)  - Module exports
│   │
│   ├── auth/                             (1 file - OAuth implementation)
│   │   └── pkce-oauth-manager.ts         (466 lines)  - RFC 7636 PKCE OAuth 2.0
│   │
│   ├── security/                         (4 files - Token security)
│   │   ├── token-lifecycle-manager.ts    (675 lines)  - Token lifecycle & rotation
│   │   ├── integrated-token-security-manager.ts (705 lines) - Security orchestration
│   │   ├── key-manager.ts                (615 lines)  - Key derivation & rotation
│   │   └── secure-token-storage.ts       (368 lines)  - AES-256-GCM encryption
│   │
│   ├── storage/                          (2 files - Persistent storage)
│   │   ├── file-based-secure-storage.ts  (1,316 lines) - Encrypted file storage
│   │   └── secure-storage-interface.ts   (363 lines)   - Storage abstraction
│   │
│   ├── tools/                            (2 files - Content tools)
│   │   ├── generator.ts                  (120 lines)  - Content generation
│   │   └── analyzer.ts                   (299 lines)  - Profile analysis
│   │
│   ├── types/                            (1 file - Type definitions)
│   │   └── linkedin.d.ts                 (52 lines)
│   │
│   ├── linkedin-complete-mcp.ts          (1,165 lines) - Main MCP server
│   ├── index.ts                          (302 lines)   - Profile optimizer server
│   ├── cli.ts                            (366 lines)   - CLI installation tool
│   ├── linkedin-api-mcp.ts               (697 lines)   - Alternative API server
│   ├── linkedin-basic-mcp.ts             (444 lines)   - Basic server version
│   └── linkedin-working-mcp.ts           (458 lines)   - Working implementation
│
├── tests/unit/                           (11 test files)
│   ├── token-lifecycle-manager.test.ts
│   ├── key-manager.test.ts
│   ├── secure-token-storage.test.ts
│   ├── integrated-token-security-manager.test.ts
│   ├── pkce-oauth-manager.test.ts
│   ├── linkedin-endpoints.test.ts
│   ├── version-manager.test.ts
│   ├── legacy-compatibility.test.ts
│   ├── cursor-pagination.test.ts
│   ├── linkedin-api-v2024.test.ts
│   └── file-based-secure-storage.test.ts
│
├── examples/                             (8 demo files)
├── dist/                                 (Compiled output)
├── docs/                                 (Documentation)
└── configs/                              (Configuration files)
```

---

## 4. MCP Tools Reference

### Overview

The MCP server exposes **5 working tools** across 3 categories:

> **Note**: The following endpoints were removed to keep the MCP lean and focused:
> - **Read endpoints** (get_user_posts, get_feed, get_post_details, get_post_comments, get_user_activity): Require Marketing Developer Platform access
> - **AI content generation** (create_optimized_post, analyze_profile_from_data, generate_optimized_content): Local AI generation is better handled by Claude directly

### 4.1 Authentication Tools

| Tool | Description | Parameters | Status |
|------|-------------|------------|--------|
| `linkedin_get_auth_url` | Generate OAuth 2.0 authorization URL | `state` (optional) | ✅ Working |
| `linkedin_exchange_code` | Exchange authorization code for access token | `code` (required) | ✅ Working |

### 4.2 User Profile Tools

| Tool | Description | Parameters | Status |
|------|-------------|------------|--------|
| `linkedin_get_user_info` | Get authenticated user info via OpenID Connect | `accessToken` (required) | ✅ Working |

### 4.3 Post Creation Tools

| Tool | Description | Parameters | Status |
|------|-------------|------------|--------|
| `linkedin_create_post` | Create and publish a LinkedIn post | `accessToken` (required), `text` (required), `visibility` (PUBLIC\|CONNECTIONS) | ✅ Working |
| `linkedin_post_profile_update` | Create a post announcing profile updates | `accessToken` (required), `updateType` (new_role\|skill_certification\|achievement\|general_update), `details` (required) | ✅ Working |

---

## 5. Design Patterns

### 5.1 Patterns Implemented

| Pattern | Implementation | Files |
|---------|----------------|-------|
| **Manager/Service** | Core domain abstractions with single responsibility | `TokenLifecycleManager`, `KeyManager`, `IntegratedTokenSecurityManager` |
| **Event Emitter** | Async lifecycle event handling | All security managers extend `EventEmitter` |
| **Factory** | Client instantiation encapsulation | `LinkedInAPIClient` |
| **Adapter** | API version compatibility | `LegacyLinkedInClient` wraps new API |
| **Strategy** | Multiple KDF algorithms | `KeyManager.deriveKey()` with PBKDF2/Scrypt/Argon2 |

### 5.2 Event-Driven Architecture

The security layer uses an event-driven architecture for token lifecycle management:

```typescript
// Token Lifecycle Events (token-lifecycle-manager.ts:15)
enum TokenLifecycleEvent {
  CREATED,     // New token issued
  VALIDATED,   // Token verified valid
  EXPIRED,     // Token expiration detected
  ROTATED,     // Token automatically rotated
  REVOKED,     // Token manually revoked
  RENEWED,     // Expiration extended via refresh
  CLEANUP,     // Cleanup operation completed
  WARNING      // Expiration approaching
}
```

### 5.3 Layered Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Presentation Layer (MCP)                      │
│  linkedin-complete-mcp.ts - Tool definitions & handlers          │
├─────────────────────────────────────────────────────────────────┤
│                    Business Logic Layer                          │
│  tools/generator.ts, tools/analyzer.ts - Content operations      │
├─────────────────────────────────────────────────────────────────┤
│                    Service Layer (API + Security)                │
│  api/*.ts - LinkedIn API integration                            │
│  security/*.ts - Token & key management                         │
├─────────────────────────────────────────────────────────────────┤
│                    Data Access Layer (Storage)                   │
│  storage/*.ts - Encrypted persistent storage                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Security Architecture

### 6.1 Security Stack Overview

```
┌─────────────────────────────────────────┐
│   IntegratedTokenSecurityManager        │
│   - Orchestrates all security           │
│   - Auto-rotation scheduling            │
│   - Integrity verification              │
└────────────────┬────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼────┐  ┌───▼────┐  ┌───▼────┐
│ Token  │  │  Key   │  │Secure  │
│Lifecycle│  │Manager │  │Storage │
│Manager │  │        │  │        │
└───┬────┘  └───┬────┘  └───┬────┘
    │           │           │
┌───▼───────────▼───────────▼────┐
│   File-Based Secure Storage    │
│   ~/.linkedin-mcp/tokens/      │
└────────────────────────────────┘
```

### 6.2 Encryption Specifications

| Aspect | Implementation | Standard |
|--------|----------------|----------|
| **Encryption Algorithm** | AES-256-GCM | Authenticated encryption |
| **Key Derivation** | PBKDF2 | 100,000 iterations |
| **Alternative KDFs** | Scrypt, Argon2 | Fallback options |
| **IV Length** | 128 bits (16 bytes) | NIST recommended |
| **Authentication Tag** | 128 bits (16 bytes) | GCM standard |
| **Salt Length** | 256 bits (32 bytes) | Strong entropy |

### 6.3 Token Lifecycle Management

| Feature | Configuration |
|---------|---------------|
| **Auto-rotation (time)** | Every 24 hours |
| **Auto-rotation (usage)** | After 1,000 uses |
| **Token binding** | Client ID, User ID, Session, IP address |
| **Expiration buffer** | 5 minutes before actual expiry |
| **Cleanup interval** | Hourly |
| **Max token age** | 7 days |
| **Revocation list** | In-memory tracking |

### 6.4 Key Management

```typescript
// Key Derivation Functions Supported (key-manager.ts)
enum KeyDerivationFunction {
  PBKDF2,   // Default - 100,000 iterations with SHA-256
  SCRYPT,   // Memory-hard function
  ARGON2    // Fallback to scrypt if unavailable
}
```

**Key Features**:
- Key versioning for safe rotation
- Re-encryption of tokens during key rotation
- Secure deletion with 3-pass overwrite
- Key status tracking (active/deprecated/revoked)

---

## 7. LinkedIn API Integration

### 7.1 API Endpoints - Authentication

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/oauth/v2/authorization` | GET | Generate authorization URL with PKCE |
| `/oauth/v2/accessToken` | POST | Exchange code for access token |
| `/oauth/v2/revoke` | POST | Revoke access token |

### 7.2 API Endpoints - User & Profile

| Endpoint | Method | Purpose | File Reference |
|----------|--------|---------|----------------|
| `/v2/userinfo` | GET | OpenID Connect user info | `linkedin-complete-mcp.ts:534` |
| `/rest/me` | GET | Current user profile (v2024) | `linkedin-endpoints.ts:128` |
| `/v2/people/~` | GET | Profile by URL name (legacy) | `linkedin-client.ts:346` |
| `/rest/connections` | GET | User connections | `linkedin-endpoints.ts:236` |

### 7.3 API Endpoints - Posts & Content

| Endpoint | Method | Purpose | File Reference |
|----------|--------|---------|----------------|
| `/v2/ugcPosts` | POST | Create UGC post | `linkedin-complete-mcp.ts:596` |
| `/rest/posts` | POST | Create post (v2024) | `linkedin-endpoints.ts:143` |
| `/v2/shares` | GET | Get posts/shares | `linkedin-complete-mcp.ts:768` |
| `/v2/shares/{id}` | GET | Get specific post | `linkedin-complete-mcp.ts:858` |
| `/rest/images` | POST | Upload images | `linkedin-endpoints.ts:185` |

### 7.4 API Endpoints - Social Actions

| Endpoint | Method | Purpose | File Reference |
|----------|--------|---------|----------------|
| `/v2/socialActions/{urn}/comments` | GET | Get post comments | `linkedin-complete-mcp.ts:908` |
| `/v2/socialActions/likes` | POST | Like a post | `linkedin-client.ts:595` |
| `/v2/socialActions/comments` | POST | Comment on post | `linkedin-client.ts:609` |
| `/v2/socialActions/shares` | POST | Share content | `linkedin-client.ts:626` |

### 7.5 API Endpoints - Organizations

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/rest/organizationAcls` | GET | Get managed organizations |
| `/v2/organizations/{id}` | GET | Get company information |
| `/v2/organizationalEntityFollowerStatistics` | GET | Get follower stats |
| `/rest/analytics/shares` | GET | Get share analytics |

### 7.6 API Endpoints - Marketing

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/rest/adCampaigns` | GET/POST/PUT | Campaign management |
| `/rest/adAnalytics` | GET | Ad analytics |
| `/rest/adTargetingFacets` | GET | Targeting options |

### 7.7 API Client Sub-Clients

| Sub-Client | Methods | File Reference |
|------------|---------|----------------|
| `people` | `getProfile()`, `searchMembers()` | `linkedin-client.ts:343-376` |
| `organizations` | `getCompany()`, `getFollowerStats()` | `linkedin-client.ts:378-402` |
| `content` | `createPost()`, `getPosts()`, `updatePost()`, `deletePost()` | `linkedin-client.ts:404-589` |
| `socialActions` | `like()`, `comment()`, `share()` | `linkedin-client.ts:592-640` |
| `marketing` | `createCampaign()`, `getCampaigns()`, `getAnalytics()` | `linkedin-client.ts:642-705` |
| `talent` | `postJob()`, `searchJobs()` | `linkedin-client.ts:708-736` |
| `learning` | `getCourses()`, `getClassifications()` | `linkedin-client.ts:738-760` |
| `messaging` | `sendMessage()`, `getConversations()` | `linkedin-client.ts:762-784` |
| `events` | `createEvent()`, `getEvents()` | `linkedin-client.ts:786-808` |

---

## 8. OAuth 2.0 + PKCE Flow

### 8.1 Overview

The MCP implements OAuth 2.0 with PKCE (Proof Key for Code Exchange) compliant with:
- **RFC 7636** - PKCE for OAuth 2.0
- **RFC 9700** - OAuth 2.0 best practices (January 2025)

### 8.2 Authorization URL Structure

```
https://www.linkedin.com/oauth/v2/authorization
  ?response_type=code
  &client_id={clientId}
  &redirect_uri={redirectUri}
  &state={32-byte-cryptographically-secure-random}
  &scope=openid profile email w_member_social
  &code_challenge={SHA256(code_verifier) base64url-encoded}
  &code_challenge_method=S256
```

### 8.3 Token Exchange

```http
POST /oauth/v2/accessToken HTTP/1.1
Host: www.linkedin.com
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code={authorization-code}
&redirect_uri={redirectUri}
&client_id={clientId}
&code_verifier={original-code-verifier}
```

### 8.4 Token Response

```typescript
interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;        // ~5400 seconds (90 minutes)
  refresh_token?: string;
  scope?: string;
  id_token?: string;         // For OpenID Connect
  created_at?: number;       // Unix timestamp
}
```

### 8.5 Scopes Used

| Scope | Purpose |
|-------|---------|
| `openid` | OpenID Connect authentication |
| `profile` | User profile information |
| `email` | Email address access |
| `w_member_social` | Write member social content (post creation) |

### 8.6 PKCE Code Verifier

```typescript
// Generated at pkce-oauth-manager.ts:79-100
// Length: 43-128 characters
// Character set: [A-Z, a-z, 0-9, -, ., _, ~]
// Entropy: 64 bytes from crypto.randomBytes()
```

---

## 9. API Version Management

### 9.1 Supported Versions

| Version | Release | Key Features |
|---------|---------|--------------|
| `v202401` | Jan 2024 | Cursor pagination, Video API, Batch operations |
| `v202404` | Apr 2024 | Documents API, Enhanced targeting |
| `v202407` | Jul 2024 | Community management, Webhooks |
| `v202410` | Oct 2024 | Connected TV, Analytics v2 |
| `v202411` | Nov 2024 | Buy Now CTA (latest) |

### 9.2 Feature Matrix

| Feature | v202401 | v202404 | v202407 | v202410 | v202411 |
|---------|:-------:|:-------:|:-------:|:-------:|:-------:|
| Cursor Pagination | ✅ | ✅ | ✅ | ✅ | ✅ |
| Documents API | ❌ | ✅ | ✅ | ✅ | ✅ |
| Community Management | ❌ | ❌ | ✅ | ✅ | ✅ |
| Connected TV | ❌ | ❌ | ❌ | ✅ | ✅ |
| Buy Now CTA | ❌ | ❌ | ❌ | ❌ | ✅ |
| Enhanced Targeting | ❌ | ✅ | ✅ | ✅ | ✅ |
| Batch Operations | ✅ | ✅ | ✅ | ✅ | ✅ |
| Webhooks | ❌ | ❌ | ✅ | ✅ | ✅ |
| Analytics v2 | ❌ | ❌ | ❌ | ✅ | ✅ |
| Video API | ✅ | ✅ | ✅ | ✅ | ✅ |

### 9.3 Version-Specific Endpoint Mappings

| Operation | Legacy Endpoint | v2024+ Endpoint |
|-----------|-----------------|-----------------|
| Create Post | `/v2/ugcPosts` | `/rest/posts` |
| Get Profile | `/v2/me` | `/rest/me` |
| Get Analytics | `/organizationalEntityShareStatistics` | `/analytics/shares` |

---

## 10. Rate Limiting & Error Handling

### 10.1 Rate Limit Headers

| Header | Purpose |
|--------|---------|
| `X-RateLimit-Limit` | Maximum requests allowed |
| `X-RateLimit-Remaining` | Remaining requests in window |
| `X-RateLimit-Reset` | Unix timestamp when limit resets |

### 10.2 Retry Strategy

| Configuration | Value |
|---------------|-------|
| **Retry conditions** | HTTP 429, 500+ status codes |
| **Backoff type** | Exponential |
| **Max delay** | 30 seconds |
| **Max retries** | 3 (configurable) |
| **Default timeout** | 30 seconds |

### 10.3 Error Response Structure

```typescript
interface LinkedInError {
  status: number;        // HTTP status code
  code: string;          // LinkedIn error code
  message: string;       // Human-readable message
  requestId?: string;    // For debugging with LinkedIn support
  details?: any;         // Full error response body
}
```

### 10.4 Rate Limit Strategies

| Strategy | Behavior |
|----------|----------|
| `throttle` | Wait until reset time, then retry |
| `queue` | Queue request for later execution |
| `reject` | Throw error immediately |

---

## 11. Testing Coverage

### 11.1 Test Files

| Category | Test File | Coverage Area |
|----------|-----------|---------------|
| **Security** | `token-lifecycle-manager.test.ts` | Token creation, validation, rotation |
| **Security** | `key-manager.test.ts` | Key derivation, rotation |
| **Security** | `secure-token-storage.test.ts` | AES-256-GCM encryption |
| **Security** | `integrated-token-security-manager.test.ts` | Security orchestration |
| **Auth** | `pkce-oauth-manager.test.ts` | OAuth 2.0 + PKCE flow |
| **API** | `linkedin-endpoints.test.ts` | Endpoint wrappers |
| **API** | `version-manager.test.ts` | API version handling |
| **API** | `legacy-compatibility.test.ts` | Backward compatibility |
| **API** | `cursor-pagination.test.ts` | Pagination handling |
| **API** | `linkedin-api-v2024.test.ts` | v2024 API client |
| **Storage** | `file-based-secure-storage.test.ts` | File storage operations |

### 11.2 Test Configuration

| Setting | Value |
|---------|-------|
| **Framework** | Jest with ts-jest |
| **Timeout** | 30 seconds per test |
| **Coverage** | Reports generated |
| **Mocks** | In-memory storage implementations |

---

## 12. Code Quality Metrics

### 12.1 TypeScript Configuration

| Setting | Value | Status |
|---------|-------|--------|
| `strict` | true | ✅ Enabled |
| `noImplicitReturns` | true | ✅ Enabled |
| `noFallthroughCasesInSwitch` | true | ✅ Enabled |
| `target` | ES2022 | Modern Node.js |
| `module` | CommonJS | npm compatible |

### 12.2 Code Statistics

| Metric | Value |
|--------|-------|
| **Total source files** | 23 TypeScript files |
| **Total lines of code** | 11,554 lines |
| **JSDoc coverage** | ~90% |
| **Error handling points** | 72+ locations |
| **`any` type usage** | 157 instances (needs improvement) |

### 12.3 Quality Assessment

| Area | Assessment |
|------|------------|
| **Type Safety** | Good overall, 157 `any` types to refine |
| **Error Handling** | Comprehensive with proper propagation |
| **Documentation** | Excellent JSDoc coverage |
| **Code Organization** | Clean module separation |
| **Dependency Management** | Well-structured, minimal dependencies |

---

## 13. Gaps & Recommendations

### 13.1 Critical Issues (High Priority)

| Issue | Location | Recommendation |
|-------|----------|----------------|
| Hardcoded storage key | `key-manager.ts:555` | Move to environment variable |
| Test passphrases | Multiple security files | Use environment variables |
| 157 `any` types | Across codebase | Gradual type refinement |

### 13.2 Medium Priority Issues

| Issue | Recommendation |
|-------|----------------|
| Scattered console.log | Implement structured logging (Winston/Pino) |
| No client-side rate limiting | Add rate limiting with exponential backoff |
| Generic error handling | Preserve error chains with `cause` field |
| CLI input validation | Add Zod schema validation |

### 13.3 Low Priority (Quick Wins)

| Issue | Recommendation |
|-------|----------------|
| Missing ADRs | Add architecture decision records |
| Limited integration tests | Expand test coverage |
| Type definition duplication | Centralize in types/ directory |

### 13.4 API Limitations (LinkedIn Platform)

| Limitation | Reason | Scope Required |
|------------|--------|----------------|
| **Read own posts** | Marketing Developer Platform required | `r_member_social` |
| **Read comments** | Marketing Developer Platform required | `r_member_social` |
| **Read feed** | Special approval required | Various |
| **Read activity** | Marketing Developer Platform required | `r_member_social` |
| **Video Upload** | Not implemented | `w_member_social` |

### 13.5 API Coverage Summary (After Cleanup)

| Category | Tools | Status |
|----------|-------|--------|
| Authentication | 2 | ✅ Complete (get_auth_url, exchange_code) |
| User Profile | 1 | ✅ Complete (get_user_info) |
| Post Creation | 2 | ✅ Complete (create_post, post_profile_update) |
| **Read Operations** | 0 | ❌ Removed (require Marketing Developer Platform) |
| **AI Generation** | 0 | ❌ Removed (better handled by Claude directly) |

**Total Working Tools: 5**

### 13.6 Design Philosophy

The MCP now follows a lean design philosophy:
- **Core Focus**: Authentication and posting only
- **No Duplication**: AI content generation is Claude's strength, not the MCP's
- **Clean API Surface**: Only working endpoints exposed
- **Minimal Dependencies**: Reduced code complexity (~400 lines vs ~1200 lines)

---

## Key Files Reference

### Entry Points

| File | Purpose |
|------|---------|
| `src/linkedin-complete-mcp.ts:1` | Main MCP server |
| `src/cli.ts:1` | CLI installation tool |
| `src/index.ts:1` | Profile optimizer server |

### Security Layer

| File | Purpose |
|------|---------|
| `src/security/integrated-token-security-manager.ts` | Security orchestration |
| `src/security/token-lifecycle-manager.ts` | Token lifecycle management |
| `src/security/key-manager.ts` | Key derivation & rotation |
| `src/security/secure-token-storage.ts` | AES-256-GCM encryption |

### API Layer

| File | Purpose |
|------|---------|
| `src/api/linkedin-client.ts` | Main API client with sub-clients |
| `src/auth/pkce-oauth-manager.ts` | OAuth 2.0 + PKCE implementation |
| `src/api/linkedin-endpoints.ts` | High-level endpoint wrappers |
| `src/api/version-manager.ts` | API version management |

### Storage Layer

| File | Purpose |
|------|---------|
| `src/storage/file-based-secure-storage.ts` | Encrypted file storage |
| Storage location | `~/.linkedin-mcp/tokens/` |

---

*Documentation generated: November 28, 2025*
*Version: 2.0.0*
