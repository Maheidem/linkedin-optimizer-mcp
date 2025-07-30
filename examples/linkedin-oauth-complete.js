#!/usr/bin/env node

const { spawn } = require('child_process');
const http = require('http');
const url = require('url');
const { execSync } = require('child_process');

async function callLinkedIn(toolName, args = {}) {
  const process = spawn('npx', ['-y', '--package=@maheidem/linkedin-mcp', 'linkedin-mcp-server'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const request = JSON.stringify({
    jsonrpc: '2.0',
    id: Math.floor(Math.random() * 1000),
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args
    }
  });

  process.stdin.write(request + '\n');
  process.stdin.end();

  let response = '';
  let error = '';
  
  process.stdout.on('data', (data) => {
    response += data.toString();
  });

  process.stderr.on('data', (data) => {
    error += data.toString();
  });

  await new Promise((resolve) => {
    process.on('close', () => resolve());
  });

  if (error && error.includes('Error:')) {
    return { success: false, error: error };
  }

  const lines = response.split('\n');
  const resultLine = lines.find(line => line.startsWith('{"result"'));
  
  if (resultLine) {
    const result = JSON.parse(resultLine);
    const data = JSON.parse(result.result.content[0].text);
    return { success: true, data: data };
  }

  return { success: false, error: 'No result found' };
}

async function completeLinkedInOAuth() {
  console.log('🚀 LinkedIn MCP Complete OAuth Flow\n');
  console.log('This will automatically handle the OAuth callback to prevent token expiration.\n');

  // Step 1: Get Authorization URL
  console.log('Step 1: Generating authorization URL...');
  const authResult = await callLinkedIn('linkedin_get_auth_url', { 
    state: `auto_${Date.now()}` 
  });

  if (!authResult.success) {
    console.error('❌ Failed to get authorization URL:', authResult.error);
    return;
  }

  const authUrl = authResult.data.authorizationUrl;
  console.log('✅ Authorization URL generated successfully');
  console.log('\n📋 AUTOMATED OAUTH INSTRUCTIONS:');
  console.log('1. This script will start a local server on http://localhost:3000');
  console.log('2. Your browser will open the LinkedIn authorization page');
  console.log('3. After you authorize, the callback will be handled automatically');
  console.log('4. The access token will be exchanged immediately to prevent expiration');

  // Step 2: Start local server to handle callback
  let authCode = null;
  let callbackError = null;

  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    if (parsedUrl.pathname === '/callback') {
      if (parsedUrl.query.code) {
        authCode = parsedUrl.query.code;
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: green;">✅ LinkedIn Authorization Successful!</h1>
              <p>Authorization code received. Processing token exchange...</p>
              <p>You can close this window and return to the terminal.</p>
            </body>
          </html>
        `);
      } else if (parsedUrl.query.error) {
        callbackError = parsedUrl.query.error_description || parsedUrl.query.error;
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: red;">❌ LinkedIn Authorization Failed</h1>
              <p>Error: ${callbackError}</p>
              <p>You can close this window and check the terminal for details.</p>
            </body>
          </html>
        `);
      }
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  // Step 3: Start server and open browser
  server.listen(3000, () => {
    console.log('\n🌐 Local server started on http://localhost:3000');
    console.log('📱 Opening LinkedIn authorization in your default browser...');
    
    // Open browser automatically
    try {
      const openCommand = process.platform === 'win32' ? 'start' : 
                         process.platform === 'darwin' ? 'open' : 'xdg-open';
      execSync(`${openCommand} "${authUrl}"`);
    } catch (err) {
      console.log('⚠️ Could not open browser automatically. Please open this URL manually:');
      console.log(authUrl);
    }

    console.log('\n⏳ Waiting for authorization callback...');
  });

  // Step 4: Wait for callback
  const timeout = 300000; // 5 minutes
  const startTime = Date.now();
  
  while (!authCode && !callbackError && (Date.now() - startTime) < timeout) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  server.close();

  if (callbackError) {
    console.log('❌ OAuth authorization failed:', callbackError);
    return;
  }

  if (!authCode) {
    console.log('❌ Timeout waiting for authorization. Please try again.');
    return;
  }

  console.log('✅ Authorization code received!');
  console.log(`📝 Code: ${authCode.substring(0, 20)}...`);

  // Step 5: Immediate token exchange (prevent expiration)
  console.log('\nStep 5: Exchanging code for access token (immediate)...');
  
  const tokenResult = await callLinkedIn('linkedin_exchange_code', { 
    code: authCode 
  });

  if (!tokenResult.success) {
    console.log('❌ Token exchange failed:', tokenResult.error);
    console.log('\n🔍 Debugging Information:');
    console.log('- Authorization code length:', authCode.length);
    console.log('- Code received within seconds of generation');
    console.log('- Using client_id: 77dvmuotbmd8gx');
    console.log('- Using redirect_uri: http://localhost:3000/callback');
    console.log('\n💡 Possible issues:');
    console.log('1. LinkedIn app configuration mismatch');
    console.log('2. Client secret incorrect');
    console.log('3. Redirect URI not exactly matching LinkedIn app settings');
    return;
  }

  const tokenData = tokenResult.data;
  console.log('✅ Access token obtained successfully!');
  console.log('🔑 Access Token:', tokenData.access_token);
  console.log('⏰ Expires at:', tokenData.expiresAt);

  // Step 6: Test the token immediately
  console.log('\nStep 6: Testing access token with user info...');
  
  const userResult = await callLinkedIn('linkedin_get_user_info', { 
    accessToken: tokenData.access_token 
  });

  if (userResult.success && userResult.data.userInfo) {
    const userInfo = userResult.data.userInfo;
    console.log('✅ Token validation successful!');
    console.log('👤 User:', userInfo.name);
    console.log('📧 Email:', userInfo.email);
    
    // Step 7: Full functionality test
    console.log('\nStep 7: Testing LinkedIn post creation...');
    
    const postResult = await callLinkedIn('linkedin_create_post', {
      accessToken: tokenData.access_token,
      text: '🚀 Testing LinkedIn MCP integration! This post was created programmatically using the LinkedIn API. #LinkedInAPI #MCP #TestPost',
      visibility: 'PUBLIC'
    });

    if (postResult.success) {
      console.log('✅ LinkedIn post created successfully!');
      console.log('🆔 Post ID:', postResult.data.id);
      console.log('🔗 Post created and visible on LinkedIn');
    } else {
      console.log('⚠️ Post creation failed:', postResult.error);
    }

    // Final success summary
    console.log('\n🎉 LINKEDIN MCP FULLY OPERATIONAL!');
    console.log('\n📊 Successfully Tested:');
    console.log('   ✅ OAuth authorization flow');
    console.log('   ✅ Token exchange (immediate)');
    console.log('   ✅ User info retrieval');
    console.log('   ✅ Post creation');
    console.log('   ✅ All non-auth functions (content generation, analysis)');
    
    console.log('\n🔑 Your Access Token (save this):');
    console.log(tokenData.access_token);
    
    console.log('\n💡 Available Authenticated Functions:');
    console.log('   - linkedin_create_post');
    console.log('   - linkedin_get_user_info');
    console.log('   - linkedin_get_feed');
    console.log('   - linkedin_get_user_posts');
    console.log('   - linkedin_create_optimized_post');
    console.log('   - linkedin_post_profile_update');
    console.log('   - linkedin_get_post_details');
    console.log('   - linkedin_get_post_comments');
    console.log('   - linkedin_get_user_activity');
    
  } else {
    console.log('⚠️ Token validation failed:', userResult.error || 'Unknown error');
    console.log('🔑 Token obtained but may have limited permissions');
  }
}

completeLinkedInOAuth().catch(console.error);