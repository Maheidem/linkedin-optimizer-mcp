#!/usr/bin/env node
/**
 * Complete LinkedIn API MCP Server
 * NOW WITH WORKING POST CREATION!
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// Type definitions for API responses
interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type?: string;
}

interface LinkedInUserInfo {
  name: string;
  email: string;
  given_name: string;
  family_name: string;
  picture: string;
  sub: string;
}

interface LinkedInPostResponse {
  id: string;
}

interface LinkedInShare {
  id: string;
  created: { time: number };
  lastModified: { time: number };
  author: string;
  text?: { text: string };
  specificContent?: {
    'com.linkedin.ugc.ShareContent'?: {
      shareCommentary?: { text: string };
      shareMediaCategory?: string;
    };
  };
  activity?: { likes: { paging: { total: number } } };
  visibility?: any;
}

interface LinkedInSharesResponse {
  elements: LinkedInShare[];
  paging?: {
    count: number;
    start: number;
    total?: number;
  };
}

interface LinkedInComment {
  id: string;
  created: { time: number };
  message: { text: string };
  author: string;
  object: string;
}

interface LinkedInCommentsResponse {
  elements: LinkedInComment[];
  paging?: {
    count: number;
    start: number;
    total?: number;
  };
}

interface LinkedInActivity {
  actor: string;
  verb: string;
  object: string;
  time: number;
}

interface ToolArgs {
  [key: string]: any;
}

const server = new Server(
  {
    name: 'linkedin-complete-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Configuration
const config = {
  clientId: '77dvmuotbmd8gx',
  clientSecret: 'WPL_AP1.w8905sdXttgXXHCV.pZR0rg==',
  redirectUri: 'http://localhost:3000/callback',
};

// Complete tools including WORKING post creation
const COMPLETE_TOOLS = [
  {
    name: 'linkedin_get_auth_url',
    description: 'Generate LinkedIn OAuth authorization URL',
    inputSchema: {
      type: 'object',
      properties: {
        state: { type: 'string', description: 'Optional state parameter' }
      }
    }
  },
  {
    name: 'linkedin_exchange_code',
    description: 'Exchange authorization code for access token',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Authorization code from callback' }
      },
      required: ['code']
    }
  },
  {
    name: 'linkedin_get_user_info',
    description: 'Get user information via OpenID Connect',
    inputSchema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: 'LinkedIn access token' }
      },
      required: ['accessToken']
    }
  },
  {
    name: 'linkedin_create_post',
    description: '🚀 Create a LinkedIn post (WORKING!)',
    inputSchema: {
      type: 'object',
      properties: {
        accessToken: { 
          type: 'string', 
          description: 'LinkedIn access token' 
        },
        text: { 
          type: 'string', 
          description: 'Post content text' 
        },
        visibility: {
          type: 'string',
          enum: ['PUBLIC', 'CONNECTIONS'],
          description: 'Post visibility (default: PUBLIC)'
        }
      },
      required: ['accessToken', 'text']
    }
  },
  {
    name: 'linkedin_create_optimized_post',
    description: '✨ Generate and create an optimized LinkedIn post',
    inputSchema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: 'LinkedIn access token' },
        topic: { type: 'string', description: 'Post topic or theme' },
        role: { type: 'string', description: 'Your professional role' },
        industry: { type: 'string', description: 'Your industry' },
        tone: {
          type: 'string',
          enum: ['professional', 'conversational', 'inspirational', 'educational'],
          description: 'Post tone'
        },
        includeHashtags: { type: 'boolean', description: 'Include relevant hashtags' },
        includeQuestion: { type: 'boolean', description: 'Include engagement question' }
      },
      required: ['accessToken', 'topic', 'role']
    }
  },
  {
    name: 'linkedin_analyze_profile_from_data',
    description: 'Analyze LinkedIn profile data and provide optimization recommendations',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Full name' },
        currentHeadline: { type: 'string', description: 'Current LinkedIn headline' },
        currentSummary: { type: 'string', description: 'Current about section' },
        skills: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'List of current skills'
        },
        industry: { type: 'string', description: 'Industry/field' },
        experience: { type: 'string', description: 'Years of experience' }
      },
      required: ['name']
    }
  },
  {
    name: 'linkedin_generate_optimized_content',
    description: 'Generate optimized LinkedIn content (headlines, summaries, posts)',
    inputSchema: {
      type: 'object',
      properties: {
        contentType: {
          type: 'string',
          enum: ['headline', 'summary', 'post', 'experience'],
          description: 'Type of content to generate'
        },
        currentRole: { type: 'string', description: 'Current job title' },
        skills: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Key skills'
        },
        achievements: {
          type: 'array',
          items: { type: 'string' },
          description: 'Key achievements or metrics'
        },
        industry: { type: 'string', description: 'Industry/field' },
        tone: {
          type: 'string',
          enum: ['professional', 'conversational', 'creative'],
          description: 'Content tone'
        }
      },
      required: ['contentType', 'currentRole']
    }
  },
  {
    name: 'linkedin_post_profile_update',
    description: '📢 Create a post announcing your profile updates',
    inputSchema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: 'LinkedIn access token' },
        updateType: {
          type: 'string',
          enum: ['new_role', 'skill_certification', 'achievement', 'general_update'],
          description: 'Type of profile update'
        },
        details: { type: 'string', description: 'Details about the update' }
      },
      required: ['accessToken', 'updateType', 'details']
    }
  },
  {
    name: 'linkedin_get_user_posts',
    description: '📖 Get user\'s own posts with pagination',
    inputSchema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: 'LinkedIn access token' },
        count: { 
          type: 'number', 
          description: 'Number of posts to retrieve (default: 10, max: 50)',
          minimum: 1,
          maximum: 50
        },
        start: { 
          type: 'number', 
          description: 'Start position for pagination (default: 0)',
          minimum: 0
        }
      },
      required: ['accessToken']
    }
  },
  {
    name: 'linkedin_get_feed',
    description: '📰 Get LinkedIn feed/timeline posts',
    inputSchema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: 'LinkedIn access token' },
        count: { 
          type: 'number', 
          description: 'Number of posts to retrieve (default: 10, max: 50)',
          minimum: 1,
          maximum: 50
        },
        start: { 
          type: 'number', 
          description: 'Start position for pagination (default: 0)',
          minimum: 0
        }
      },
      required: ['accessToken']
    }
  },
  {
    name: 'linkedin_get_post_details',
    description: '🔍 Get detailed information about a specific post',
    inputSchema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: 'LinkedIn access token' },
        postId: { type: 'string', description: 'LinkedIn post/share ID' },
        includeStats: { 
          type: 'boolean', 
          description: 'Include engagement statistics (default: true)' 
        }
      },
      required: ['accessToken', 'postId']
    }
  },
  {
    name: 'linkedin_get_post_comments',
    description: '💬 Get comments on a specific post',
    inputSchema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: 'LinkedIn access token' },
        postId: { type: 'string', description: 'LinkedIn post/share ID' },
        count: { 
          type: 'number', 
          description: 'Number of comments to retrieve (default: 10, max: 50)',
          minimum: 1,
          maximum: 50
        },
        start: { 
          type: 'number', 
          description: 'Start position for pagination (default: 0)',
          minimum: 0
        }
      },
      required: ['accessToken', 'postId']
    }
  },
  {
    name: 'linkedin_get_user_activity',
    description: '📊 Get user\'s recent activity (likes, comments, shares)',
    inputSchema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: 'LinkedIn access token' },
        activityTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['LIKE', 'COMMENT', 'SHARE', 'REACTION']
          },
          description: 'Types of activities to retrieve (default: all)'
        },
        count: { 
          type: 'number', 
          description: 'Number of activities to retrieve (default: 20, max: 100)',
          minimum: 1,
          maximum: 100
        },
        start: { 
          type: 'number', 
          description: 'Start position for pagination (default: 0)',
          minimum: 0
        }
      },
      required: ['accessToken']
    }
  }
];

// Handler for listing available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: COMPLETE_TOOLS };
});

// Handler for tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const toolArgs = (args || {}) as ToolArgs;

  try {
    let result: any;
    switch (name) {
      case 'linkedin_get_auth_url':
        result = getAuthUrl(toolArgs);
        break;
      case 'linkedin_exchange_code':
        result = await exchangeCode(toolArgs);
        break;
      case 'linkedin_get_user_info':
        result = await getUserInfo(toolArgs);
        break;
      case 'linkedin_create_post':
        result = await createPost(toolArgs);
        break;
      case 'linkedin_create_optimized_post':
        result = await createOptimizedPost(toolArgs);
        break;
      case 'linkedin_analyze_profile_from_data':
        result = analyzeProfileFromData(toolArgs);
        break;
      case 'linkedin_generate_optimized_content':
        result = generateOptimizedContent(toolArgs);
        break;
      case 'linkedin_post_profile_update':
        result = await postProfileUpdate(toolArgs);
        break;
      case 'linkedin_get_user_posts':
        result = await getUserPosts(toolArgs);
        break;
      case 'linkedin_get_feed':
        result = await getFeed(toolArgs);
        break;
      case 'linkedin_get_post_details':
        result = await getPostDetails(toolArgs);  
        break;
      case 'linkedin_get_post_comments':
        result = await getPostComments(toolArgs);
        break;
      case 'linkedin_get_user_activity':
        result = await getUserActivity(toolArgs);
        break;
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }

    // Return result in proper MCP format
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
    
  } catch (error) {
    console.error('DEBUG - Exception in request handler:', error);
    console.error('DEBUG - Error type:', typeof error);
    console.error('DEBUG - Error instanceof Error:', error instanceof Error);
    if (error instanceof McpError) throw error;
    throw new McpError(ErrorCode.InternalError, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Tool implementations
function getAuthUrl(args: ToolArgs) {
  const state = args.state || `state_${Date.now()}`;
  const scopes = ['openid', 'profile', 'email', 'w_member_social'];
  
  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', config.redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', scopes.join(' '));

  return {
    authorizationUrl: authUrl.toString(),
    state,
    instructions: [
      '1. Copy the URL and open in browser',
      '2. Authorize the LinkedIn app',
      '3. Copy the code from redirect URL',
      '4. Use linkedin_exchange_code with the code'
    ]
  };
}

async function exchangeCode(args: ToolArgs) {
  console.error('DEBUG - exchangeCode called with args:', JSON.stringify(args, null, 2));
  const { code } = args;
  
  console.error('DEBUG - Extracted code:', code);
  
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  console.error('DEBUG - Request params:', params.toString());
  console.error('DEBUG - Making request to LinkedIn...');

  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: params,
  });

  console.error('DEBUG - Response status:', response.status);
  console.error('DEBUG - Response ok:', response.ok);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('DEBUG - Error response text:', errorText);
    return {
      error: true,
      status: response.status,
      message: `Token exchange failed: ${response.status} - ${errorText}`,
      details: errorText
    };
  }

  const tokenData = await response.json() as LinkedInTokenResponse;
  
  // Debug logging
  console.error('DEBUG - Token response:', JSON.stringify(tokenData, null, 2));
  
  if (!tokenData.access_token) {
    throw new Error(`Invalid token response: ${JSON.stringify(tokenData)}`);
  }
  
  const result = {
    access_token: tokenData.access_token,
    expires_in: tokenData.expires_in,
    scope: tokenData.scope,
    message: 'Token obtained successfully! You can now create LinkedIn posts!',
    expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()
  };
  
  console.error('DEBUG - Final result:', JSON.stringify(result, null, 2));
  return result;
}

async function getUserInfo(args: ToolArgs) {
  const { accessToken } = args;
  
  const response = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`User info fetch failed: ${response.status}`);
  }

  const userInfo = await response.json() as LinkedInUserInfo;
  
  return {
    userInfo,
    message: 'User information retrieved successfully',
    availableData: {
      name: userInfo.name,
      email: userInfo.email,
      firstName: userInfo.given_name,
      lastName: userInfo.family_name,
      profilePicture: userInfo.picture,
      linkedinId: userInfo.sub
    }
  };
}

async function createPost(args: ToolArgs) {
  const { accessToken, text, visibility = 'PUBLIC' } = args;
  
  // Get user ID first
  const userResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to get user info for posting');
  }

  const userData = await userResponse.json() as LinkedInUserInfo;
  const authorUrn = `urn:li:person:${userData.sub}`;

  // Create the post
  const postData = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: text
        },
        shareMediaCategory: 'NONE'
      }
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': visibility
    }
  };

  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(postData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Post creation failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json() as LinkedInPostResponse;
  
  return {
    success: true,
    postId: result.id,
    message: '🎉 Post created successfully!',
    postUrl: `https://www.linkedin.com/feed/update/${result.id}/`,
    author: userData.name,
    text: text,
    visibility: visibility
  };
}

async function createOptimizedPost(args: ToolArgs) {
  const { 
    accessToken, 
    topic, 
    role, 
    industry, 
    tone = 'professional', 
    includeHashtags = true, 
    includeQuestion = true 
  } = args;
  
  // Generate optimized post content
  const postContent = generateOptimizedPostContent(topic, role, industry, tone, includeHashtags, includeQuestion);
  
  // Create the post
  const result = await createPost({
    accessToken,
    text: postContent,
    visibility: 'PUBLIC'
  });
  
  return {
    ...result,
    generatedContent: postContent,
    optimizationDetails: {
      topic,
      role,
      industry,
      tone,
      includeHashtags,
      includeQuestion
    }
  };
}

function generateOptimizedPostContent(
  topic: string, 
  role: string, 
  industry: string, 
  tone: string, 
  includeHashtags: boolean, 
  includeQuestion: boolean
): string {
  const toneIntros = {
    professional: `As a ${role}`,
    conversational: `Hey LinkedIn network! As a ${role}`,
    inspirational: `💡 Reflecting on my journey as a ${role}`,
    educational: `📚 Quick insight from a ${role}`
  };
  
  const intro = toneIntros[tone as keyof typeof toneIntros] || toneIntros.professional;
  
  let content = `${intro}, I wanted to share some thoughts on ${topic}.

${getTopicContent(topic, role, industry)}`;

  if (includeQuestion) {
    content += `\n\n${getEngagementQuestion(topic, role)}`;
  }
  
  if (includeHashtags) {
    const hashtags = generateHashtags(topic, role, industry);
    content += `\n\n${hashtags.join(' ')}`;
  }
  
  return content;
}

function getTopicContent(topic: string, role: string, industry: string): string {
  const templates = [
    `The ${industry} landscape is evolving rapidly, and ${topic} is at the forefront of this change. In my experience as a ${role}, I've seen how embracing this trend can transform both individual careers and entire organizations.`,
    `One thing that consistently amazes me about ${topic} is its potential to drive real impact. As someone working in ${industry}, I believe we're just scratching the surface of what's possible.`,
    `Recently, I've been diving deep into ${topic}, and the insights have been game-changing for my work as a ${role}. The intersection of innovation and practical application continues to surprise me.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

function getEngagementQuestion(topic: string, _role: string): string {
  const questions = [
    `What's your experience with ${topic}? I'd love to hear different perspectives!`,
    `How are you seeing ${topic} impact your work? Let's discuss in the comments!`,
    `What trends in ${topic} are you most excited about? Share your thoughts below!`,
    `Any fellow professionals working with ${topic}? Would love to connect and exchange ideas!`
  ];
  
  return questions[Math.floor(Math.random() * questions.length)];
}

function generateHashtags(topic: string, role: string, industry: string): string[] {
  const baseHashtags = [`#${industry.replace(/\s+/g, '')}`, '#ProfessionalDevelopment', '#Innovation'];
  const topicHashtags = topic.split(' ').filter(word => word.length > 3).map(word => `#${word}`);
  const roleHashtags = role.split(' ').filter(word => word.length > 3).map(word => `#${word}`);
  
  return [...baseHashtags, ...topicHashtags.slice(0, 2), ...roleHashtags.slice(0, 1)].slice(0, 5);
}

async function postProfileUpdate(args: ToolArgs) {
  const { accessToken, updateType, details } = args;
  
  const updateMessages = {
    new_role: `🚀 Excited to share that I've started a new role! ${details}`,
    skill_certification: `📜 Just earned a new certification! ${details}. Always learning and growing in this ever-evolving field.`,
    achievement: `🎉 Thrilled to share a recent achievement: ${details}. Grateful for the journey and excited for what's next!`,
    general_update: `📈 Professional update: ${details}. Looking forward to the opportunities ahead!`
  };
  
  const message = updateMessages[updateType as keyof typeof updateMessages] || details;
  
  return await createPost({
    accessToken,
    text: message,
    visibility: 'PUBLIC'
  });
}

async function getUserPosts(args: ToolArgs) {
  const { accessToken, count = 10, start = 0 } = args;
  
  // Get user ID first
  const userResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to get user info for posts retrieval');
  }

  const userData = await userResponse.json() as LinkedInUserInfo;
  const authorUrn = `urn:li:person:${userData.sub}`;

  // Get user's posts using shares endpoint
  const queryParams = new URLSearchParams({
    q: 'owners',
    owners: authorUrn,
    count: Math.min(count, 50).toString(),
    start: start.toString(),
    sortBy: 'LAST_MODIFIED'
  });

  const response = await fetch(`https://api.linkedin.com/v2/shares?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get user posts: ${response.status} - ${errorText}`);
  }

  const sharesData = await response.json() as LinkedInSharesResponse;
  
  // Process and format the posts
  const posts = sharesData.elements.map(share => ({
    id: share.id,
    text: extractPostText(share),
    created: new Date(share.created.time).toISOString(),
    lastModified: new Date(share.lastModified.time).toISOString(),
    author: share.author,
    likes: share.activity?.likes?.paging?.total || 0,
    url: `https://www.linkedin.com/feed/update/${share.id}/`,
    visibility: share.visibility
  }));

  return {
    posts,
    pagination: {
      count: sharesData.paging?.count || posts.length,
      start: sharesData.paging?.start || start,
      total: sharesData.paging?.total
    },
    message: `Retrieved ${posts.length} posts successfully`
  };
}

async function getFeed(args: ToolArgs) {
  const { accessToken, count = 10, start = 0 } = args;
  
  // LinkedIn Feed API is limited - using shares with different filtering
  const queryParams = new URLSearchParams({
    count: Math.min(count, 50).toString(),
    start: start.toString(),
    sortBy: 'LAST_MODIFIED'
  });

  const response = await fetch(`https://api.linkedin.com/v2/shares?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get feed: ${response.status} - ${errorText}`);
  }

  const sharesData = await response.json() as LinkedInSharesResponse;
  
  // Process and format the feed posts
  const feedPosts = sharesData.elements.map(share => ({
    id: share.id,
    text: extractPostText(share),
    created: new Date(share.created.time).toISOString(),
    lastModified: new Date(share.lastModified.time).toISOString(),
    author: share.author,
    likes: share.activity?.likes?.paging?.total || 0,
    url: `https://www.linkedin.com/feed/update/${share.id}/`
  }));

  return {
    feedPosts,
    pagination: {
      count: sharesData.paging?.count || feedPosts.length,
      start: sharesData.paging?.start || start,
      total: sharesData.paging?.total
    },
    message: `Retrieved ${feedPosts.length} feed posts successfully`,
    note: 'Feed access is limited by LinkedIn API permissions'
  };
}

async function getPostDetails(args: ToolArgs) {
  const { accessToken, postId, includeStats = true } = args;
  
  // Get specific post details
  const response = await fetch(`https://api.linkedin.com/v2/shares/${encodeURIComponent(postId)}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get post details: ${response.status} - ${errorText}`);
  }

  const share = await response.json() as LinkedInShare;
  
  const postDetails = {
    id: share.id,
    text: extractPostText(share),
    created: new Date(share.created.time).toISOString(),
    lastModified: new Date(share.lastModified.time).toISOString(),
    author: share.author,
    url: `https://www.linkedin.com/feed/update/${share.id}/`,
    visibility: share.visibility
  };

  if (includeStats) {
    // Get engagement statistics if available
    (postDetails as any).engagement = {
      likes: share.activity?.likes?.paging?.total || 0,
      // Note: Comments and shares require additional API calls
    };
  }

  return {
    postDetails,
    message: 'Post details retrieved successfully'
  };
}

async function getPostComments(args: ToolArgs) {
  const { accessToken, postId, count = 10, start = 0 } = args;
  
  // Convert postId to proper URN format for comments
  const shareUrn = postId.startsWith('urn:li:share:') ? postId : `urn:li:share:${postId}`;
  
  const queryParams = new URLSearchParams({
    count: Math.min(count, 50).toString(),
    start: start.toString()
  });

  const response = await fetch(`https://api.linkedin.com/v2/socialActions/${encodeURIComponent(shareUrn)}/comments?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get post comments: ${response.status} - ${errorText}`);
  }

  const commentsData = await response.json() as LinkedInCommentsResponse;
  
  // Process and format the comments
  const comments = commentsData.elements.map(comment => ({
    id: comment.id,
    text: comment.message.text,
    created: new Date(comment.created.time).toISOString(),
    author: comment.author,
    postId: comment.object
  }));

  return {
    comments,
    pagination: {
      count: commentsData.paging?.count || comments.length,
      start: commentsData.paging?.start || start,
      total: commentsData.paging?.total
    },
    postId: shareUrn,
    message: `Retrieved ${comments.length} comments successfully`
  };
}

async function getUserActivity(args: ToolArgs) {
  const { accessToken, activityTypes = ['LIKE', 'COMMENT', 'SHARE', 'REACTION'], count = 20, start = 0 } = args;
  
  // Get user ID first
  const userResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to get user info for activity retrieval');
  }

  const userData = await userResponse.json() as LinkedInUserInfo;
  const userUrn = `urn:li:person:${userData.sub}`;

  // Note: LinkedIn API has limited activity endpoints available
  // This is a simplified implementation that retrieves available activity data
  const activities: LinkedInActivity[] = [];
  
  try {
    // Attempt to get recent shares as a proxy for user activity
    const sharesResponse = await fetch(`https://api.linkedin.com/v2/shares?q=owners&owners=${encodeURIComponent(userUrn)}&count=${Math.min(count, 50)}&start=${start}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    if (sharesResponse.ok) {
      const sharesData = await sharesResponse.json() as LinkedInSharesResponse;
      
      // Convert shares to activity format
      sharesData.elements.forEach(share => {
        activities.push({
          actor: share.author,
          verb: 'SHARE',
          object: share.id,
          time: share.created.time
        });
      });
    }
  } catch (error) {
    console.error('Error fetching user activity:', error);
  }

  // Format activities
  const formattedActivities = activities.map(activity => ({
    type: activity.verb,
    actor: activity.actor,
    objectId: activity.object,
    timestamp: new Date(activity.time).toISOString(),
    description: `User ${activity.verb.toLowerCase()}d content`
  }));

  return {
    activities: formattedActivities,
    pagination: {
      count: formattedActivities.length,
      start,
      requestedTypes: activityTypes
    },
    message: `Retrieved ${formattedActivities.length} activities successfully`,
    note: 'LinkedIn API has limited activity endpoint access. This shows available share activity.'
  };
}

// Helper function to extract post text from LinkedIn share object
function extractPostText(share: LinkedInShare): string {
  // Try multiple possible text locations in the LinkedIn API response
  if (share.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text) {
    return share.specificContent['com.linkedin.ugc.ShareContent'].shareCommentary.text;
  }
  
  if (share.text?.text) {
    return share.text.text;
  }
  
  return 'No text content available';
}

// Include other helper functions from previous implementation
function analyzeProfileFromData(args: ToolArgs) {
  const { name, currentHeadline, currentSummary, skills = [], industry, experience } = args;
  
  const analysis = {
    profileCompleteness: calculateCompleteness(args),
    recommendations: generateRecommendations(args),
    missingElements: identifyMissingElements(args),
    optimizationOpportunities: findOptimizationOpportunities(args)
  };

  return {
    analysis,
    profileData: { name, headline: currentHeadline, summary: currentSummary, skills, industry, experience },
    nextSteps: [
      'Use linkedin_generate_optimized_content to create improved content',
      'Use linkedin_create_post to share your updates',
      'Implement recommendations and track progress'
    ]
  };
}

function generateOptimizedContent(args: ToolArgs) {
  const { contentType, currentRole, skills = [], achievements = [], industry, tone = 'professional' } = args;
  
  const generators = {
    headline: () => generateHeadlines(currentRole, skills, industry),
    summary: () => generateSummaries(currentRole, skills, achievements, tone),
    post: () => generatePosts(currentRole, skills, industry),
    experience: () => generateExperienceDescriptions(currentRole, achievements)
  };

  const content = generators[contentType as keyof typeof generators]?.() || { error: 'Invalid content type' };
  
  return {
    contentType,
    generatedContent: content,
    tips: getContentTips(contentType),
    nextSteps: [
      'Review and customize the generated content',
      'Use linkedin_create_post to publish posts',
      'Update your LinkedIn profile manually with other content'
    ]
  };
}

// Helper functions (shortened for brevity)
function calculateCompleteness(data: ToolArgs): number {
  let score = 0;
  if (data.name) score += 20;
  if (data.currentHeadline) score += 25;
  if (data.currentSummary) score += 30;
  if (data.skills?.length > 0) score += 15;
  if (data.industry) score += 10;
  return Math.min(score, 100);
}

function generateRecommendations(data: ToolArgs): string[] {
  const recommendations = [];
  if (!data.currentHeadline) recommendations.push('Add a compelling headline');
  if (!data.currentSummary) recommendations.push('Write a detailed About section');
  if (!data.skills?.length) recommendations.push('Add relevant skills');
  return recommendations;
}

function identifyMissingElements(data: ToolArgs): string[] {
  const missing = [];
  if (!data.currentHeadline) missing.push('Professional headline');
  if (!data.currentSummary) missing.push('About section');
  if (!data.skills?.length) missing.push('Skills section');
  return missing;
}

function findOptimizationOpportunities(data: ToolArgs): string[] {
  const opportunities = [];
  if (data.currentHeadline?.length < 100) opportunities.push('Expand headline');
  if (data.currentSummary?.length < 500) opportunities.push('Expand About section');
  if (data.skills?.length < 10) opportunities.push('Add more skills');
  return opportunities;
}

function generateHeadlines(role: string, skills: string[], industry?: string): { options: string[]; tips: string[] } {
  return {
    options: [
      `${role} | ${skills.slice(0, 3).join(' & ')} Expert | ${industry || 'Innovation'} Leader`,
      `${role} specializing in ${skills.slice(0, 2).join(' & ')} | Building Solutions at Scale`,
      `Senior ${role} | ${skills[0]} & ${skills[1]} Specialist | Driving Results`
    ],
    tips: ['Use all 220 characters', 'Include top skills', 'Show value proposition']
  };
}

function generateSummaries(role: string, skills: string[], achievements: string[], _tone: string): { summary: string; tips: string[] } {
  return {
    summary: `As a ${role}, I specialize in ${skills.slice(0, 3).join(', ')}. ${achievements[0] ? `Key achievement: ${achievements[0]}.` : ''}`,
    tips: ['Keep under 2000 characters', 'Include achievements', 'End with call-to-action']
  };
}

function generatePosts(role: string, skills: string[], _industry?: string): { posts: string[]; tips: string[] } {
  return {
    posts: [
      `💡 As a ${role}, I've learned that ${skills[0]} is just the beginning. What's your experience?`,
      `🚀 Quick tip for fellow ${role}s: Focus on mastering ${skills[0]} first. What skills do you prioritize?`
    ],
    tips: ['Ask questions', 'Use hashtags', 'Share insights']
  };
}

function generateExperienceDescriptions(role: string, achievements: string[]): { descriptions: string[]; tips: string[] } {
  return {
    descriptions: [
      `${role} responsible for ${achievements[0] || 'key initiatives'}. Delivered measurable business impact.`
    ],
    tips: ['Use action verbs', 'Include metrics', 'Show progression']
  };
}

function getContentTips(contentType: string): string[] {
  const tipMap: Record<string, string[]> = {
    headline: ['Use all 220 characters', 'Include keywords', 'Show value'],
    summary: ['Hook in first line', 'Include achievements', 'Call-to-action'],
    post: ['Ask questions', 'Use storytelling', 'Include hashtags'],
    experience: ['Action verbs', 'Quantify impact', 'Show growth']
  };
  return tipMap[contentType] || ['Be authentic', 'Stay professional', 'Show value'];
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('LinkedIn Complete MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});