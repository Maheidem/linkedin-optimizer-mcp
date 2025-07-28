# LinkedIn API MCP Server - Complete API Reference

This document provides a comprehensive reference for all LinkedIn API endpoints exposed through the MCP server.

## Overview

The LinkedIn API MCP Server exposes **ALL** LinkedIn API endpoints through 50+ MCP tools, organized by API category:

- **Authentication & Authorization** (3 tools)
- **Profile & People APIs** (2 tools)
- **Organizations & Companies** (2 tools)
- **Content APIs** (7 tools)
- **Social Actions** (3 tools)
- **Marketing & Advertising** (5 tools)
- **Talent Solutions** (3 tools)
- **Learning APIs** (2 tools)
- **Messaging** (2 tools)
- **Events** (2 tools)
- **Sales Navigator** (1 tool)
- **Compliance** (1 tool)
- **Utilities** (2 tools)

## Authentication Flow

### 1. Get Authorization URL
```javascript
linkedin_oauth_get_auth_url({
  scopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
  state: 'random-csrf-token',
  usePKCE: true
})
```

### 2. Exchange Code for Token
```javascript
linkedin_oauth_exchange_code({
  code: 'authorization_code_from_callback',
  state: 'csrf-token',
  codeVerifier: 'pkce-code-verifier'
})
```

### 3. Refresh Token
```javascript
linkedin_oauth_refresh_token({
  refreshToken: 'valid_refresh_token'
})
```

## Profile & People APIs

### Get Profile Information
```javascript
linkedin_people_get_profile({
  personId: '~/id', // Optional, defaults to authenticated user
  fields: ['id', 'firstName', 'lastName', 'headline', 'summary']
})
```

### Search Members
```javascript
linkedin_people_search_members({
  keywords: 'software engineer',
  facets: {
    location: 'us:84',
    industry: '4'
  },
  start: 0,
  count: 25
})
```

## Organizations & Companies

### Get Company Information
```javascript
linkedin_organizations_get_company({
  organizationId: '1337',
  fields: ['id', 'name', 'description', 'industry', 'website']
})
```

### Get Follower Statistics
```javascript
linkedin_organizations_get_follower_stats({
  organizationId: '1337',
  timeIntervals: {
    timeGranularityType: 'DAY',
    timeRange: {
      start: 1640995200000,
      end: 1641081600000
    }
  }
})
```

## Content APIs

### Create Post (New Posts API)
```javascript
linkedin_posts_create({
  author: 'urn:li:person:ABC123',
  postType: 'TEXT',
  text: 'Hello LinkedIn! This is my first post via API.',
  visibility: 'PUBLIC'
})
```

### Create Image Post
```javascript
linkedin_posts_create({
  author: 'urn:li:person:ABC123',
  postType: 'IMAGE',
  text: 'Check out this amazing image!',
  media: [
    {
      type: 'IMAGE',
      url: 'urn:li:digitalmediaAsset:xyz',
      altText: 'Description of the image'
    }
  ]
})
```

### Create Poll
```javascript
linkedin_posts_create({
  author: 'urn:li:person:ABC123',
  postType: 'POLL',
  text: 'What\'s your favorite programming language?',
  pollOptions: ['JavaScript', 'Python', 'Java', 'Go']
})
```

### Get Posts
```javascript
linkedin_posts_get({
  author: 'urn:li:person:ABC123',
  start: 0,
  count: 10
})
```

### Upload Media Asset
```javascript
// First, get upload URL
linkedin_assets_get_upload_url({
  mediaType: 'IMAGE',
  owner: 'urn:li:person:ABC123',
  filename: 'my-image.jpg'
})

// Then upload the asset
linkedin_assets_upload({
  uploadUrl: 'https://api.linkedin.com/media/upload/...',
  filePath: '/path/to/image.jpg',
  mediaType: 'IMAGE'
})
```

## Social Actions

### Like a Post
```javascript
linkedin_social_actions_like({
  targetUrn: 'urn:li:share:123456',
  actor: 'urn:li:person:ABC123'
})
```

### Comment on Post
```javascript
linkedin_social_actions_comment({
  targetUrn: 'urn:li:share:123456',
  actor: 'urn:li:person:ABC123',
  text: 'Great post! Thanks for sharing.'
})
```

### Share a Post
```javascript
linkedin_social_actions_share({
  targetUrn: 'urn:li:share:123456',
  actor: 'urn:li:person:ABC123',
  commentary: 'This is worth sharing with my network!'
})
```

## Marketing & Advertising

### Create Ad Campaign
```javascript
linkedin_ads_create_campaign({
  account: 'urn:li:sponsoredAccount:123',
  name: 'My First Campaign',
  type: 'SPONSORED_CONTENT',
  status: 'DRAFT',
  budget: {
    currencyCode: 'USD',
    amount: 1000
  },
  targeting: {
    includedTargetingFacets: {
      locations: ['urn:li:geo:us']
    }
  }
})
```

### Get Campaign Analytics
```javascript
linkedin_ads_get_analytics({
  campaigns: ['urn:li:sponsoredCampaign:123'],
  dateRange: {
    start: { day: 1, month: 1, year: 2025 },
    end: { day: 31, month: 1, year: 2025 }
  },
  fields: ['impressions', 'clicks', 'costInUsd'],
  pivot: 'CAMPAIGN'
})
```

### Get Targeting Options
```javascript
linkedin_ads_get_targeting_facets({
  facetType: 'LOCATIONS',
  locale: 'en_US'
})
```

## Talent Solutions

### Post a Job
```javascript
linkedin_jobs_post({
  companyId: 'urn:li:organization:123',
  title: 'Senior Software Engineer',
  description: 'We are looking for an experienced software engineer...',
  location: {
    countryCode: 'US',
    city: 'San Francisco',
    region: 'California'
  },
  employmentType: 'FULL_TIME',
  workRemoteAllowed: true,
  salary: {
    currencyCode: 'USD',
    amount: 150000
  }
})
```

### Search Jobs
```javascript
linkedin_jobs_search({
  keywords: 'machine learning engineer',
  location: {
    countryCode: 'US'
  },
  experienceLevel: 'MID_SENIOR'
})
```

## Learning APIs

### Get Courses
```javascript
linkedin_learning_get_courses({
  q: 'search',
  keywords: 'machine learning',
  start: 0,
  count: 10
})
```

### Get Content Classifications
```javascript
linkedin_learning_get_classifications({
  classificationType: 'SUBJECT'
})
```

## Messaging

### Send Direct Message
```javascript
linkedin_messaging_send_message({
  recipients: ['urn:li:person:ABC123'],
  subject: 'Hello from API',
  body: 'This message was sent via LinkedIn API!',
  attachments: []
})
```

### Get Conversations
```javascript
linkedin_messaging_get_conversations({
  participantId: 'urn:li:person:ABC123',
  start: 0,
  count: 20
})
```

## Events

### Create Event
```javascript
linkedin_events_create({
  organizer: 'urn:li:organization:123',
  name: 'Tech Meetup 2025',
  description: 'Join us for an evening of networking and tech talks',
  startTime: '2025-02-15T18:00:00Z',
  endTime: '2025-02-15T21:00:00Z',
  location: {
    venue: 'Tech Hub',
    address: '123 Main St, San Francisco, CA'
  },
  eventType: 'OFFLINE'
})
```

## Rate Limiting & Utilities

### Check Rate Limits
```javascript
linkedin_get_rate_limits({
  apiCategory: 'content' // Optional, omit for all categories
})
```

### API Health Check
```javascript
linkedin_get_api_health()
```

## Error Handling

All API calls return standardized error responses:

```javascript
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request is invalid",
    "details": "Access token is expired"
  },
  "status": 401
}
```

Common error codes:
- `UNAUTHORIZED` (401): Invalid or expired access token
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `RATE_LIMITED` (429): Rate limit exceeded
- `INTERNAL_ERROR` (500): LinkedIn API internal error

## Required Scopes by API Category

| API Category | Required Scopes |
|--------------|----------------|
| Profile | `r_liteprofile`, `r_basicprofile` |
| Content | `w_member_social`, `r_member_social` |
| Organizations | `r_organization_social`, `w_organization_social` |
| Marketing | `r_ads`, `rw_ads` |
| Messaging | `w_member_social` |
| Events | `w_organization_social` |

## Partner Program Requirements

⚠️ **Important**: Most LinkedIn APIs require approval through LinkedIn's Partner Program:

- **Application Timeline**: 3-6 months
- **Approval Rate**: Less than 10%
- **Requirements**: Existing product with proven user base
- **Review Process**: Quarterly review cycles

For development and testing, you can use the basic scopes available to all developers, but production usage requires partner approval.

## Next Steps

1. Apply for LinkedIn Partner Program (if not already approved)
2. Set up your LinkedIn Developer Application
3. Configure environment variables
4. Install and configure the MCP server
5. Begin testing with available scopes