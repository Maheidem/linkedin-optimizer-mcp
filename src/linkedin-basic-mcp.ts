#!/usr/bin/env node
/**
 * Basic LinkedIn API MCP Server
 * Focuses on available APIs with your current permissions
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'linkedin-basic-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Configuration from environment
const config = {
  clientId: process.env.LINKEDIN_CLIENT_ID || '77dvmuotbmd8gx',
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET || 'WPL_AP1.w8905sdXttgXXHCV.pZR0rg==',
  redirectUri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/callback',
  baseUrl: 'https://api.linkedin.com/v2',
};

// Available tools based on your current LinkedIn app permissions
const AVAILABLE_TOOLS = [
  {
    name: 'linkedin_get_auth_url',
    description: 'Generate LinkedIn OAuth authorization URL',
    inputSchema: {
      type: 'object',
      properties: {
        state: { 
          type: 'string', 
          description: 'Optional state parameter for CSRF protection' 
        }
      }
    }
  },
  {
    name: 'linkedin_exchange_code',
    description: 'Exchange authorization code for access token',
    inputSchema: {
      type: 'object',
      properties: {
        code: { 
          type: 'string', 
          description: 'Authorization code from LinkedIn callback' 
        },
        state: { 
          type: 'string', 
          description: 'State parameter for verification' 
        }
      },
      required: ['code']
    }
  },
  {
    name: 'linkedin_get_profile',
    description: 'Get authenticated user LinkedIn profile',
    inputSchema: {
      type: 'object',
      properties: {
        accessToken: { 
          type: 'string', 
          description: 'LinkedIn access token' 
        },
        fields: {
          type: 'array',
          items: { type: 'string' },
          description: 'Profile fields to retrieve (id, firstName, lastName, etc.)'
        }
      },
      required: ['accessToken']
    }
  },
  {
    name: 'linkedin_create_post',
    description: 'Create a LinkedIn post',
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
          description: 'Post visibility'
        }
      },
      required: ['accessToken', 'text']
    }
  },
  {
    name: 'linkedin_test_connection',
    description: 'Test LinkedIn API connectivity and permissions',
    inputSchema: {
      type: 'object',
      properties: {
        accessToken: { 
          type: 'string', 
          description: 'LinkedIn access token (optional for basic test)' 
        }
      }
    }
  }
];

// Handler for listing available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: AVAILABLE_TOOLS,
  };
});

// Handler for tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'linkedin_get_auth_url':
        return getAuthUrl(args);
      
      case 'linkedin_exchange_code':
        return exchangeCode(args);
      
      case 'linkedin_get_profile':
        return getProfile(args);
      
      case 'linkedin_create_post':
        return createPost(args);
      
      case 'linkedin_test_connection':
        return testConnection(args);
      
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    if (error instanceof McpError) throw error;
    
    throw new McpError(
      ErrorCode.InternalError,
      `Error executing tool ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});

// Tool implementations
function getAuthUrl(args: any) {
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
      '1. Copy the authorization URL and open it in your browser',
      '2. Log in to LinkedIn and authorize the application',
      '3. You will be redirected to the callback URL with a code parameter',
      '4. Copy the code from the URL and use linkedin_exchange_code to get an access token',
      '5. IMPORTANT: You must add this redirect URL to your LinkedIn app: ' + config.redirectUri
    ],
    redirectUri: config.redirectUri,
    scopes: scopes
  };
}

async function exchangeCode(args: any) {
  const { code, state } = args;
  
  const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const tokenData = await response.json();
    
    return {
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
      token_type: 'Bearer',
      expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
      message: 'Token obtained successfully! Use this access token for other LinkedIn API calls.',
      nextSteps: [
        'Save the access_token securely',
        'Use linkedin_get_profile to test the token',
        'Token expires in ' + Math.floor(tokenData.expires_in / 3600) + ' hours'
      ]
    };
  } catch (error) {
    throw new Error(`Failed to exchange code for token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function getProfile(args: any) {
  const { accessToken, fields = ['id', 'firstName', 'lastName', 'headline'] } = args;
  
  const fieldsParam = fields.join(',');
  const profileUrl = `${config.baseUrl}/people/~?fields=${fieldsParam}`;
  
  try {
    const response = await fetch(profileUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Profile fetch failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const profileData = await response.json();
    
    return {
      profile: profileData,
      message: 'Profile retrieved successfully!',
      availableFields: [
        'id', 'firstName', 'lastName', 'headline', 'summary',
        'location', 'industry', 'publicProfileUrl'
      ]
    };
  } catch (error) {
    throw new Error(`Failed to get profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function createPost(args: any) {
  const { accessToken, text, visibility = 'PUBLIC' } = args;
  
  // First, get the user's profile to get their person URN
  const profileResponse = await fetch(`${config.baseUrl}/people/~?fields=id`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!profileResponse.ok) {
    throw new Error('Failed to get user profile for posting');
  }

  const profile = await profileResponse.json();
  const authorUrn = `urn:li:person:${profile.id}`;

  // Create the post using UGC API
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

  try {
    const response = await fetch(`${config.baseUrl}/ugcPosts`, {
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
      throw new Error(`Post creation failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    
    return {
      postId: result.id,
      message: 'Post created successfully!',
      postData: result,
      viewUrl: `https://www.linkedin.com/feed/update/${result.id}/`
    };
  } catch (error) {
    throw new Error(`Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function testConnection(args: any) {
  const { accessToken } = args;
  
  const tests = [];
  
  // Test 1: Basic API connectivity
  try {
    const response = await fetch('https://api.linkedin.com/v2', {
      method: 'GET',
    });
    tests.push({
      test: 'Basic API Connectivity',
      status: 'PASS',
      details: `LinkedIn API responding (${response.status})`
    });
  } catch (error) {
    tests.push({
      test: 'Basic API Connectivity',
      status: 'FAIL',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 2: OAuth endpoints
  try {
    const authUrl = 'https://www.linkedin.com/oauth/v2/authorization';
    const response = await fetch(authUrl + '?response_type=code&client_id=test', {
      method: 'GET',
    });
    tests.push({
      test: 'OAuth Endpoints',
      status: response.status < 500 ? 'PASS' : 'FAIL',
      details: `OAuth endpoint responding (${response.status})`
    });
  } catch (error) {
    tests.push({
      test: 'OAuth Endpoints',
      status: 'FAIL',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 3: Token validation (if provided)
  if (accessToken) {
    try {
      const response = await fetch(`${config.baseUrl}/people/~?fields=id`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });
      
      tests.push({
        test: 'Access Token Validation',
        status: response.ok ? 'PASS' : 'FAIL',
        details: response.ok ? 'Token is valid and working' : `Token validation failed (${response.status})`
      });
    } catch (error) {
      tests.push({
        test: 'Access Token Validation',
        status: 'FAIL',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    tests.push({
      test: 'Access Token Validation',
      status: 'SKIPPED',
      details: 'No access token provided'
    });
  }

  const passedTests = tests.filter(t => t.status === 'PASS').length;
  const totalTests = tests.filter(t => t.status !== 'SKIPPED').length;

  return {
    overallStatus: passedTests === totalTests ? 'HEALTHY' : 'ISSUES_DETECTED',
    summary: `${passedTests}/${totalTests} tests passed`,
    tests,
    configuration: {
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      apiBaseUrl: config.baseUrl
    },
    recommendations: [
      'Ensure your LinkedIn app has the redirect URI configured: ' + config.redirectUri,
      'Make sure your app has the required permissions: openid, profile, email, w_member_social',
      'Test the OAuth flow with linkedin_get_auth_url and linkedin_exchange_code'
    ]
  };
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('LinkedIn Basic MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});