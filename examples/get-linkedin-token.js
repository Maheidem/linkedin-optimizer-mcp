#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');

async function getLinkedInToken() {
  console.log('🔗 LinkedIn MCP Authentication Flow\n');

  // Step 1: Get Authorization URL
  console.log('Step 1: Getting authorization URL...');
  
  const authProcess = spawn('npx', ['-y', '--package=@maheidem/linkedin-mcp', 'linkedin-mcp-server'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const authRequest = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'linkedin_get_auth_url',
      arguments: { state: `auth_${Date.now()}` }
    }
  });

  authProcess.stdin.write(authRequest + '\n');
  authProcess.stdin.end();

  let authResponse = '';
  authProcess.stdout.on('data', (data) => {
    authResponse += data.toString();
  });

  await new Promise((resolve) => {
    authProcess.on('close', () => resolve());
  });

  const authLines = authResponse.split('\n');
  const authResultLine = authLines.find(line => line.startsWith('{"result"'));
  
  if (!authResultLine) {
    console.error('❌ Failed to get authorization URL');
    return;
  }

  const authResult = JSON.parse(authResultLine);
  const authData = JSON.parse(authResult.result.content[0].text);
  
  console.log('✅ Authorization URL generated:');
  console.log(authData.authorizationUrl);
  console.log('\n📋 Instructions:');
  authData.instructions.forEach((instruction, i) => {
    console.log(`   ${i + 1}. ${instruction}`);
  });

  // Step 2: Get authorization code from user
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const code = await new Promise((resolve) => {
    rl.question('\n📝 Paste the authorization code here: ', resolve);
  });
  rl.close();

  if (!code.trim()) {
    console.log('❌ No code provided');
    return;
  }

  // Step 3: Exchange code for token
  console.log('\nStep 3: Exchanging code for access token...');
  
  const tokenProcess = spawn('npx', ['-y', '--package=@maheidem/linkedin-mcp', 'linkedin-mcp-server'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const tokenRequest = JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'linkedin_exchange_code',
      arguments: { code: code.trim() }
    }
  });

  tokenProcess.stdin.write(tokenRequest + '\n');
  tokenProcess.stdin.end();

  let tokenResponse = '';
  tokenProcess.stdout.on('data', (data) => {
    tokenResponse += data.toString();
  });

  let tokenError = '';
  tokenProcess.stderr.on('data', (data) => {
    tokenError += data.toString();
  });

  await new Promise((resolve) => {
    tokenProcess.on('close', () => resolve());
  });

  if (tokenError.includes('Error:')) {
    console.log('❌ Token exchange failed:', tokenError);
    return;
  }

  const tokenLines = tokenResponse.split('\n');
  const tokenResultLine = tokenLines.find(line => line.startsWith('{"result"'));
  
  if (!tokenResultLine) {
    console.error('❌ Failed to exchange code for token');
    return;
  }

  const tokenResult = JSON.parse(tokenResultLine);
  const tokenData = JSON.parse(tokenResult.result.content[0].text);
  
  console.log('✅ Access token obtained!');
  console.log('🔑 Access Token:', tokenData.access_token);
  console.log('⏰ Expires at:', tokenData.expiresAt);
  
  // Step 4: Test the token
  console.log('\nStep 4: Testing token with user info...');
  
  const userProcess = spawn('npx', ['-y', '--package=@maheidem/linkedin-mcp', 'linkedin-mcp-server'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const userRequest = JSON.stringify({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'linkedin_get_user_info',
      arguments: { accessToken: tokenData.access_token }
    }
  });

  userProcess.stdin.write(userRequest + '\n');
  userProcess.stdin.end();

  let userResponse = '';
  userProcess.stdout.on('data', (data) => {
    userResponse += data.toString();
  });

  await new Promise((resolve) => {
    userProcess.on('close', () => resolve());
  });

  const userLines = userResponse.split('\n');
  const userResultLine = userLines.find(line => line.startsWith('{"result"'));
  
  if (userResultLine) {
    const userResult = JSON.parse(userResultLine);
    const userData = JSON.parse(userResult.result.content[0].text);
    
    if (userData.userInfo) {
      console.log('✅ Token is valid!');
      console.log('👤 User:', userData.userInfo.name);
      console.log('📧 Email:', userData.userInfo.email);
      console.log('\n🎉 LinkedIn MCP is fully working!');
      console.log('\n📝 You can now use this token with:');
      console.log('   - linkedin_create_post');
      console.log('   - linkedin_get_feed');
      console.log('   - linkedin_get_user_posts');
      console.log('   - linkedin_generate_optimized_content');
      console.log('   - linkedin_analyze_profile_from_data');
    } else {
      console.log('⚠️ Token exchange succeeded but user info failed');
    }
  } else {
    console.log('⚠️ Could not test token with user info');
  }
}

getLinkedInToken().catch(console.error);