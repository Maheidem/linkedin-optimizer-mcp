#!/usr/bin/env node

const { spawn } = require('child_process');

async function testSingleExchange() {
  console.log('Testing single token exchange with fake code...\n');

  const process = spawn('npx', ['-y', '--package=@maheidem/linkedin-mcp', 'linkedin-mcp-server'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const request = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'linkedin_exchange_code',
      arguments: { code: 'FAKE_CODE_FOR_TESTING' }
    }
  });

  console.log('Sending request:', request);
  
  process.stdin.write(request + '\n');
  process.stdin.end();

  let stdout = '';
  let stderr = '';
  
  process.stdout.on('data', (data) => {
    stdout += data.toString();
  });

  process.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  await new Promise((resolve) => {
    process.on('close', () => resolve());
  });

  console.log('\n=== STDOUT ===');
  console.log(stdout);
  
  console.log('\n=== STDERR ===');
  console.log(stderr);

  console.log('\n=== ANALYSIS ===');
  if (stderr.includes('DEBUG - exchangeCode called')) {
    console.log('✅ Function was called');
  } else {
    console.log('❌ Function was NOT called - check if switch case is working');
  }

  if (stderr.includes('Token exchange failed')) {
    console.log('✅ Expected failure with fake code');
  } else {
    console.log('⚠️ Unexpected behavior with fake code');
  }
}

testSingleExchange().catch(console.error);