#!/usr/bin/env node
"use strict";
/**
 * Complete LinkedIn API MCP Server
 * NOW WITH WORKING POST CREATION!
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const http_1 = require("http");
const child_process_1 = require("child_process");
const simple_token_manager_js_1 = require("./simple-token-manager.js");
const server = new index_js_1.Server({
    name: 'linkedin-complete-mcp',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
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
        name: 'linkedin_auto_auth',
        description: 'Authenticate with LinkedIn - opens browser automatically, captures callback, saves token for future use',
        inputSchema: {
            type: 'object',
            properties: {
                timeout: {
                    type: 'number',
                    description: 'Timeout in seconds (default: 120)'
                }
            }
        }
    },
    {
        name: 'linkedin_get_user_info',
        description: 'Get user information via OpenID Connect',
        inputSchema: {
            type: 'object',
            properties: {
                accessToken: { type: 'string', description: 'LinkedIn access token (optional if previously authenticated)' }
            }
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
                    description: 'LinkedIn access token (optional if previously authenticated)'
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
            required: ['text']
        }
    },
    {
        name: 'linkedin_post_profile_update',
        description: '📢 Create a post announcing your profile updates',
        inputSchema: {
            type: 'object',
            properties: {
                accessToken: { type: 'string', description: 'LinkedIn access token (optional if previously authenticated)' },
                updateType: {
                    type: 'string',
                    enum: ['new_role', 'skill_certification', 'achievement', 'general_update'],
                    description: 'Type of profile update'
                },
                details: { type: 'string', description: 'Details about the update' }
            },
            required: ['updateType', 'details']
        }
    }
];
// Handler for listing available tools
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return { tools: COMPLETE_TOOLS };
});
// Handler for tool execution
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const toolArgs = (args || {});
    try {
        let result;
        switch (name) {
            case 'linkedin_get_auth_url':
                result = getAuthUrl(toolArgs);
                break;
            case 'linkedin_exchange_code':
                result = await exchangeCode(toolArgs);
                break;
            case 'linkedin_auto_auth':
                result = await autoAuth(toolArgs);
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
                throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
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
    }
    catch (error) {
        console.error('DEBUG - Exception in request handler:', error);
        console.error('DEBUG - Error type:', typeof error);
        console.error('DEBUG - Error instanceof Error:', error instanceof Error);
        if (error instanceof types_js_1.McpError)
            throw error;
        throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
/**
 * Get access token - either from args (backward compatible) or from storage
 */
async function resolveAccessToken(providedToken) {
    if (providedToken) {
        return providedToken; // Use provided token (backward compatible)
    }
    const storedToken = await (0, simple_token_manager_js_1.getValidToken)();
    if (storedToken) {
        return storedToken;
    }
    throw new Error('No valid token available. Run linkedin_auto_auth first to authenticate.');
}
// Tool implementations
function getAuthUrl(args) {
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
async function exchangeCode(args) {
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
    const tokenData = await response.json();
    // Debug logging
    console.error('DEBUG - Token response:', JSON.stringify(tokenData, null, 2));
    if (!tokenData.access_token) {
        throw new Error(`Invalid token response: ${JSON.stringify(tokenData)}`);
    }
    // Auto-save token for future use
    const tokenToSave = {
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in,
        created_at: Date.now(),
        scope: tokenData.scope
    };
    await (0, simple_token_manager_js_1.saveToken)(tokenToSave);
    console.error('DEBUG - Token auto-saved to ~/.linkedin-mcp/tokens/');
    const result = {
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in,
        scope: tokenData.scope,
        message: 'Token obtained successfully and saved! You can now create LinkedIn posts without passing token!',
        expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
        tokenSaved: true
    };
    console.error('DEBUG - Final result:', JSON.stringify(result, null, 2));
    return result;
}
/**
 * Auto-authenticate: opens browser, starts callback server, exchanges code, saves token
 */
async function autoAuth(args) {
    const timeout = (args.timeout || 120) * 1000; // Default 2 minutes
    const state = `state_${Date.now()}`;
    // Generate auth URL
    const scopes = ['openid', 'profile', 'email', 'w_member_social'];
    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('redirect_uri', config.redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', scopes.join(' '));
    return new Promise((resolve, reject) => {
        let server;
        let timeoutId;
        // Create HTTP server to capture callback
        server = (0, http_1.createServer)(async (req, res) => {
            const url = new URL(req.url || '', `http://localhost:3000`);
            if (url.pathname === '/callback') {
                const code = url.searchParams.get('code');
                const returnedState = url.searchParams.get('state');
                const error = url.searchParams.get('error');
                if (error) {
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end('<h1>Authorization Failed</h1><p>Error: ' + error + '</p><p>You can close this window.</p>');
                    clearTimeout(timeoutId);
                    server.close();
                    reject(new Error(`LinkedIn authorization failed: ${error}`));
                    return;
                }
                if (!code) {
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end('<h1>Missing Code</h1><p>No authorization code received.</p>');
                    return;
                }
                if (returnedState !== state) {
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end('<h1>State Mismatch</h1><p>Security check failed.</p>');
                    return;
                }
                try {
                    // Exchange code for token
                    const tokenResult = await exchangeCode({ code });
                    if (tokenResult.error) {
                        res.writeHead(500, { 'Content-Type': 'text/html' });
                        res.end('<h1>Token Exchange Failed</h1><p>' + tokenResult.message + '</p>');
                        clearTimeout(timeoutId);
                        server.close();
                        reject(new Error(tokenResult.message));
                        return;
                    }
                    // Token already saved in exchangeCode, but we have a nice success page
                    // Success response
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
            <html>
              <head><title>LinkedIn Authentication Success</title></head>
              <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #0077B5, #00A0DC);">
                <div style="background: white; padding: 40px; border-radius: 12px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
                  <h1 style="color: #0077B5; margin-bottom: 10px;">Authentication Successful!</h1>
                  <p style="color: #666;">Token saved. You can close this window.</p>
                  <p style="color: #999; font-size: 14px;">Token expires: ${tokenResult.expiresAt}</p>
                </div>
              </body>
            </html>
          `);
                    clearTimeout(timeoutId);
                    server.close();
                    resolve({
                        success: true,
                        message: 'LinkedIn authentication successful! Token saved for future use.',
                        expiresAt: tokenResult.expiresAt,
                        scope: tokenResult.scope,
                        note: 'You can now use linkedin_create_post and other tools without providing accessToken!'
                    });
                }
                catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/html' });
                    res.end('<h1>Error</h1><p>' + (err instanceof Error ? err.message : 'Unknown error') + '</p>');
                    clearTimeout(timeoutId);
                    server.close();
                    reject(err);
                }
            }
        });
        // Start server
        server.listen(3000, () => {
            console.error('Callback server started on port 3000');
            // Open browser automatically (macOS)
            const openCommand = process.platform === 'darwin' ? 'open' :
                process.platform === 'win32' ? 'start' : 'xdg-open';
            (0, child_process_1.exec)(`${openCommand} "${authUrl.toString()}"`, (err) => {
                if (err) {
                    console.error('Could not open browser automatically:', err.message);
                }
            });
        });
        // Timeout handler
        timeoutId = setTimeout(() => {
            server.close();
            reject(new Error(`Authentication timed out after ${timeout / 1000} seconds. Try again with linkedin_auto_auth.`));
        }, timeout);
        server.on('error', (err) => {
            clearTimeout(timeoutId);
            if (err.code === 'EADDRINUSE') {
                reject(new Error('Port 3000 is already in use. Please close any other servers on port 3000 and try again.'));
            }
            else {
                reject(err);
            }
        });
    });
}
// Image upload helper functions
function isUrl(str) {
    return str.startsWith('http://') || str.startsWith('https://');
}
async function getImageBuffer(source) {
    if (isUrl(source)) {
        // Fetch from URL
        const response = await fetch(source);
        if (!response.ok)
            throw new Error(`Failed to fetch image from URL: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        return { buffer: Buffer.from(arrayBuffer), mimeType: contentType };
    }
    else {
        // Read from local file
        const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        const buffer = await fs.readFile(source);
        const ext = path.extname(source).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
            '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp'
        };
        return { buffer, mimeType: mimeTypes[ext] || 'image/jpeg' };
    }
}
async function registerImageUpload(accessToken, ownerUrn) {
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
    return await response.json();
}
async function uploadImageBinary(uploadUrl, buffer, mimeType) {
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
async function getUserInfo(args) {
    const accessToken = await resolveAccessToken(args.accessToken);
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`User info fetch failed: ${response.status}`);
    }
    const userInfo = await response.json();
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
async function createPost(args) {
    const accessToken = await resolveAccessToken(args.accessToken);
    const { text, visibility = 'PUBLIC', image } = args;
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
    const userData = await userResponse.json();
    const authorUrn = `urn:li:person:${userData.sub}`;
    let assetUrn = null;
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
    const shareContent = {
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
    const result = await response.json();
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
async function postProfileUpdate(args) {
    const accessToken = await resolveAccessToken(args.accessToken);
    const { updateType, details } = args;
    const updateMessages = {
        new_role: `🚀 Excited to share that I've started a new role! ${details}`,
        skill_certification: `📜 Just earned a new certification! ${details}. Always learning and growing in this ever-evolving field.`,
        achievement: `🎉 Thrilled to share a recent achievement: ${details}. Grateful for the journey and excited for what's next!`,
        general_update: `📈 Professional update: ${details}. Looking forward to the opportunities ahead!`
    };
    const message = updateMessages[updateType] || details;
    return await createPost({
        accessToken,
        text: message,
        visibility: 'PUBLIC'
    });
}
// Start the server
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error('LinkedIn Complete MCP server running on stdio');
    // Check for existing token at startup
    const tokenInfo = await (0, simple_token_manager_js_1.getTokenInfo)();
    if (tokenInfo && tokenInfo.valid) {
        console.error(`LinkedIn token loaded (expires: ${tokenInfo.expiresAt}, ${tokenInfo.remainingDays} days remaining)`);
    }
    else if (tokenInfo && !tokenInfo.valid) {
        console.error('LinkedIn token expired. Use linkedin_auto_auth to re-authenticate.');
    }
    else {
        console.error('No LinkedIn token found. Use linkedin_auto_auth to authenticate.');
    }
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=linkedin-complete-mcp.js.map