# LinkedIn MCP Server - Reading & Feed Capabilities

## New Tools Added

The LinkedIn MCP server now includes comprehensive reading and feed capabilities alongside the existing posting functionality.

### 📖 Reading Tools

#### 1. `linkedin_get_user_posts`
**Purpose**: Retrieve user's own posts with pagination support

**Parameters**:
- `accessToken` (required): LinkedIn access token
- `count` (optional): Number of posts to retrieve (1-50, default: 10)
- `start` (optional): Start position for pagination (default: 0)

**Returns**:
- Array of user's posts with metadata
- Pagination information
- Post URLs for direct access

**Example Usage**:
```javascript
{
  "name": "linkedin_get_user_posts",
  "arguments": {
    "accessToken": "your_token_here",
    "count": 20,
    "start": 0
  }
}
```

#### 2. `linkedin_get_feed`
**Purpose**: Get LinkedIn feed/timeline posts

**Parameters**:
- `accessToken` (required): LinkedIn access token
- `count` (optional): Number of posts to retrieve (1-50, default: 10)
- `start` (optional): Start position for pagination (default: 0)

**Returns**:
- Array of feed posts
- Pagination information
- Note about API limitations

**Limitations**: LinkedIn API restricts feed access significantly. This tool provides available public shares.

#### 3. `linkedin_get_post_details`
**Purpose**: Get detailed information about a specific post

**Parameters**:
- `accessToken` (required): LinkedIn access token
- `postId` (required): LinkedIn post/share ID
- `includeStats` (optional): Include engagement statistics (default: true)

**Returns**:
- Complete post details
- Engagement statistics (likes, etc.)
- Post metadata and URL

#### 4. `linkedin_get_post_comments`
**Purpose**: Get comments on a specific post

**Parameters**:
- `accessToken` (required): LinkedIn access token
- `postId` (required): LinkedIn post/share ID
- `count` (optional): Number of comments to retrieve (1-50, default: 10)
- `start` (optional): Start position for pagination (default: 0)

**Returns**:
- Array of comments with author info
- Pagination information
- Comment timestamps and text

#### 5. `linkedin_get_user_activity`
**Purpose**: Get user's recent activity (likes, comments, shares)

**Parameters**:
- `accessToken` (required): LinkedIn access token
- `activityTypes` (optional): Array of activity types ['LIKE', 'COMMENT', 'SHARE', 'REACTION']
- `count` (optional): Number of activities to retrieve (1-100, default: 20)
- `start` (optional): Start position for pagination (default: 0)

**Returns**:
- Array of user activities
- Activity types and timestamps
- Pagination information

**Note**: LinkedIn API has limited activity endpoint access. Currently shows share activity.

## Technical Implementation Details

### API Endpoints Used
- `GET /v2/shares` - For posts and feed content
- `GET /v2/shares/{id}` - For specific post details
- `GET /v2/socialActions/{shareUrn}/comments` - For post comments
- `GET /v2/userinfo` - For user identification

### Data Processing
- **Text Extraction**: Smart extraction from multiple possible LinkedIn API response formats
- **Date Formatting**: Converts LinkedIn timestamps to ISO 8601 format
- **URN Handling**: Proper LinkedIn URN formatting for API calls
- **Pagination**: Consistent pagination support across all reading tools
- **Error Handling**: Comprehensive error handling with meaningful messages

### Type Safety
- Comprehensive TypeScript interfaces for all LinkedIn API responses
- Proper type checking for all parameters and return values
- Safe handling of optional fields and nested objects

## Usage Examples

### Get Your Recent Posts
```javascript
// Get your last 10 posts
const posts = await linkedin_get_user_posts({
  accessToken: "your_token",
  count: 10
});

console.log(`Found ${posts.posts.length} posts`);
posts.posts.forEach(post => {
  console.log(`${post.created}: ${post.text.substring(0, 100)}...`);
});
```

### Analyze Post Performance
```javascript
// Get post details with engagement stats
const postDetails = await linkedin_get_post_details({
  accessToken: "your_token",
  postId: "urn:li:share:12345",
  includeStats: true
});

console.log(`Post has ${postDetails.postDetails.engagement.likes} likes`);

// Get comments for engagement analysis
const comments = await linkedin_get_post_comments({
  accessToken: "your_token",
  postId: "urn:li:share:12345"
});

console.log(`Post has ${comments.comments.length} comments`);
```

### Monitor Activity
```javascript
// Get recent user activity
const activity = await linkedin_get_user_activity({
  accessToken: "your_token",
  count: 50
});

console.log(`User has ${activity.activities.length} recent activities`);
```

## Integration with Existing Tools

These new reading capabilities complement the existing posting tools:

1. **Content Analysis**: Read existing posts to analyze what works
2. **Engagement Tracking**: Monitor post performance over time
3. **Content Planning**: Understand your posting patterns and audience response
4. **Comment Management**: Track and respond to post comments
5. **Activity Monitoring**: Keep track of your LinkedIn engagement

## LinkedIn API Limitations

Important notes about LinkedIn API restrictions:

1. **Feed Access**: Limited by LinkedIn's API policies for privacy and security
2. **Rate Limits**: LinkedIn enforces rate limits on API calls
3. **Permissions**: Requires appropriate OAuth scopes (r_liteprofile, r_emailaddress, w_member_social)
4. **Activity Data**: Full activity feeds are restricted; only share activity is currently accessible
5. **Comment Access**: Requires proper URN formatting and appropriate permissions

## Authentication Requirements

All reading tools require the same OAuth flow as posting:

1. Use `linkedin_get_auth_url` to get authorization URL
2. Complete OAuth flow in browser
3. Use `linkedin_exchange_code` to get access token
4. Use access token with any reading tool

The reading tools use the same authentication pattern as the existing posting functionality, ensuring consistent security and access control.