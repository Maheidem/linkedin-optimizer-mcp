#!/usr/bin/env node

const { spawn } = require('child_process');

async function testTokenExchange() {
  console.log('🔍 Testing LinkedIn Token Exchange with Debug Output\n');

  // Get a fresh auth URL first
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
      arguments: { state: `debug_${Date.now()}` }
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
  
  if (authResultLine) {
    const authResult = JSON.parse(authResultLine);
    const authData = JSON.parse(authResult.result.content[0].text);
    console.log('✅ Authorization URL:', authData.authorizationUrl);
    console.log('\n📋 Please:');
    console.log('1. Open the URL in your browser');
    console.log('2. Authorize the LinkedIn app');
    console.log('3. Copy the authorization code from the callback URL');
    console.log('4. Paste it below');
  } else {
    console.log('❌ Failed to get auth URL');
    return;
  }

  // Wait for user to provide auth code
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const authCode = await new Promise((resolve) => {
    rl.question('\n📝 Paste the authorization code: ', resolve);
  });
  rl.close();

  if (!authCode.trim()) {
    console.log('❌ No authorization code provided');
    return;
  }

  console.log('\nStep 2: Testing token exchange with debug output...');
  
  const tokenProcess = spawn('npx', ['-y', '--package=@maheidem/linkedin-mcp', 'linkedin-mcp-server'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const tokenRequest = JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'linkedin_exchange_code',
      arguments: { code: authCode.trim() }
    }
  });

  tokenProcess.stdin.write(tokenRequest + '\n');
  tokenProcess.stdin.end();

  let tokenResponse = '';
  let tokenError = '';
  
  tokenProcess.stdout.on('data', (data) => {
    tokenResponse += data.toString();
  });

  tokenProcess.stderr.on('data', (data) => {
    tokenError += data.toString();
  });

  await new Promise((resolve) => {
    tokenProcess.on('close', () => resolve());
  });

  console.log('\n🔍 Raw stdout response:');
  console.log(tokenResponse);
  
  if (tokenError) {
    console.log('\n🔍 Raw stderr response:');
    console.log(tokenError);
  }

  const tokenLines = tokenResponse.split('\n');
  const tokenResultLine = tokenLines.find(line => line.startsWith('{"result"'));
  
  if (tokenResultLine) {
    console.log('\n✅ Found result line:', tokenResultLine);
    const tokenResult = JSON.parse(tokenResultLine);
    const tokenData = JSON.parse(tokenResult.result.content[0].text);
    console.log('\n🔑 Parsed token data:', JSON.stringify(tokenData, null, 2));
  } else {
    console.log('\n❌ No valid result found in response');
  }
}

testTokenExchange().catch(console.error);