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

interface LinkedInAssetUploadResponse {
  value: {
    uploadMechanism: {
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
        uploadUrl: string;
        headers: Record<string, string>;
      };
    };
    asset: string;
  };
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
    description: '🚀 Create a LinkedIn post with optional image',
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
        },
        image: {
          type: 'string',
          description: 'Optional: Local file path (/path/to/image.png) or URL (https://...)'
        }
      },
      required: ['accessToken', 'text']
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
      case 'linkedin_post_profile_update':
        result = await postProfileUpdate(toolArgs);
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

// Image upload helper functions
function isUrl(str: string): boolean {
  return str.startsWith('http://') || str.startsWith('https://');
}

async function getImageBuffer(source: string): Promise<{ buffer: Buffer; mimeType: string }> {
  if (isUrl(source)) {
    // Fetch from URL
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Failed to fetch image from URL: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return { buffer: Buffer.from(arrayBuffer), mimeType: contentType };
  } else {
    // Read from local file
    const fs = await import('fs/promises');
    const path = await import('path');
    const buffer = await fs.readFile(source);
    const ext = path.extname(source).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp'
    };
    return { buffer, mimeType: mimeTypes[ext] || 'image/jpeg' };
  }
}

async function registerImageUpload(accessToken: string, ownerUrn: string): Promise<LinkedInAssetUploadResponse> {
  const response = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner: ownerUrn,
        serviceRelationships: [{
          relationshipType: 'OWNER',
          identifier: 'urn:li:userGeneratedContent'
        }]
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Register image upload failed: ${response.status} - ${errorText}`);
  }
  return await response.json() as LinkedInAssetUploadResponse;
}

async function uploadImageBinary(uploadUrl: string, buffer: Buffer, mimeType: string): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
    },
    body: buffer
  });

  if (!response.ok) {
    throw new Error(`Image binary upload failed: ${response.status}`);
  }
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
  const { accessToken, text, visibility = 'PUBLIC', image } = args;

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

  let assetUrn: string | null = null;

  // Handle image upload if provided
  if (image) {
    console.error('DEBUG - Image provided, starting upload process...');
    console.error('DEBUG - Image source:', image);

    const { buffer, mimeType } = await getImageBuffer(image);
    console.error('DEBUG - Image loaded, size:', buffer.length, 'bytes, type:', mimeType);

    const uploadData = await registerImageUpload(accessToken, authorUrn);
    console.error('DEBUG - Upload registered, asset:', uploadData.value.asset);

    const uploadUrl = uploadData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
    await uploadImageBinary(uploadUrl, buffer, mimeType);
    console.error('DEBUG - Image binary uploaded successfully');

    assetUrn = uploadData.value.asset;
  }

  // Build share content
  const shareContent: Record<string, unknown> = {
    shareCommentary: { text },
    shareMediaCategory: assetUrn ? 'IMAGE' : 'NONE'
  };

  if (assetUrn) {
    shareContent.media = [{
      status: 'READY',
      media: assetUrn
    }];
  }

  // Create the post
  const postData = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': shareContent
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
    message: assetUrn ? '🎉 Post with image created successfully!' : '🎉 Post created successfully!',
    postUrl: `https://www.linkedin.com/feed/update/${result.id}/`,
    author: userData.name,
    text: text,
    visibility: visibility,
    hasImage: !!assetUrn
  };
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