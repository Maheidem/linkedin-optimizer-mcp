#!/usr/bin/env node

const { spawn } = require('child_process');
const http = require('http');
const url = require('url');
const { execSync } = require('child_process');

async function callLinkedInLocal(toolName, args = {}) {
  const process = spawn('node', ['./dist/linkedin-complete-mcp.js'], {
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

  console.log('\n🔍 DEBUG - Raw stdout:', response);
  if (error) {
    console.log('🔍 DEBUG - Raw stderr:', error);
  }

  const lines = response.split('\n');
  const resultLine = lines.find(line => line.startsWith('{"result"'));
  
  if (resultLine) {
    const result = JSON.parse(resultLine);
    const data = JSON.parse(result.result.content[0].text);
    return { success: true, data: data, rawResponse: response };
  }

  return { success: false, error: 'No result found', rawResponse: response, rawError: error };
}

async function testLinkedInOAuthLocal() {
  console.log('🚀 LinkedIn MCP Local OAuth Test\n');
  
  // Step 1: Get Authorization URL
  console.log('Step 1: Generating authorization URL...');
  const authResult = await callLinkedInLocal('linkedin_get_auth_url', { 
    state: `local_test_${Date.now()}` 
  });

  if (!authResult.success) {
    console.error('❌ Failed to get authorization URL:', authResult.error);
    return;
  }

  const authUrl = authResult.data.authorizationUrl;
  console.log('✅ Authorization URL generated successfully');
  
  // Step 2: Start local server to handle callback
  let authCode = null;
  let callbackError = null;

  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    if (parsedUrl.pathname === '/callback') {
      if (parsedUrl.query.code) {
        authCode = parsedUrl.query.code;
        console.log('🔍 DEBUG - Received auth code:', authCode);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>✅ Authorization received! Check terminal.</h1>');
      } else if (parsedUrl.query.error) {
        callbackError = parsedUrl.query.error_description || parsedUrl.query.error;
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h1>❌ Error: ${callbackError}</h1>`);
      }
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  // Step 3: Start server and open browser
  server.listen(3000, () => {
    console.log('\n🌐 Local server started on http://localhost:3000');
    console.log('📱 Opening LinkedIn authorization in your browser...');
    
    try {
      const openCommand = process.platform === 'darwin' ? 'open' : 'xdg-open';
      execSync(`${openCommand} "${authUrl}"`);
    } catch (err) {
      console.log('⚠️ Please open this URL manually:');
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
    console.log('❌ Timeout waiting for authorization.');
    return;
  }

  console.log('\n✅ Authorization code received!');
  console.log(`📝 Code: ${authCode.substring(0, 50)}...`);

  // Step 5: Token exchange with local build
  console.log('\nStep 5: Exchanging code for access token (LOCAL BUILD)...');
  
  const tokenResult = await callLinkedInLocal('linkedin_exchange_code', { 
    code: authCode 
  });

  console.log('\n🔍 COMPLETE TOKEN EXCHANGE DEBUG (LOCAL):');
  console.log('Success:', tokenResult.success);
  console.log('Data:', JSON.stringify(tokenResult.data, null, 2));

  if (tokenResult.success && tokenResult.data && tokenResult.data.access_token) {
    console.log('\n✅ Token exchange successful with LOCAL BUILD!');
    console.log('🔑 Access Token:', tokenResult.data.access_token);
    
    // Test the token
    console.log('\nStep 6: Testing access token...');
    const userResult = await callLinkedInLocal('linkedin_get_user_info', { 
      accessToken: tokenResult.data.access_token 
    });
    
    if (userResult.success && userResult.data.userInfo) {
      console.log('✅ Token validation successful!');
      console.log('👤 User:', userResult.data.userInfo.name);
      console.log('\n🎉 LINKEDIN MCP FULLY WORKING WITH LOCAL BUILD!');
      
      // Test post creation
      const postResult = await callLinkedInLocal('linkedin_create_post', {
        accessToken: tokenResult.data.access_token,
        text: '🚀 Testing LinkedIn MCP local build! This post was created using the fixed OAuth flow. #LinkedInAPI #MCP',
        visibility: 'PUBLIC'
      });
      
      if (postResult.success && postResult.data.id) {
        console.log('✅ LinkedIn post created successfully!');
        console.log('🆔 Post ID:', postResult.data.id);
        console.log('\n🎯 LOCAL BUILD IS FULLY FUNCTIONAL!');
      }
      
    } else {
      console.log('⚠️ Token validation failed:', userResult);
    }
  } else {
    console.log('\n❌ Token exchange failed with local build');
    if (tokenResult.data && tokenResult.data.error) {
      console.log('📋 Error details:', tokenResult.data.message);
    }
  }
}

testLinkedInOAuthLocal().catch(console.error);