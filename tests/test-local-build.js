#!/usr/bin/env node

const { spawn } = require('child_process');

async function testLocalBuild() {
  console.log('Testing local build directly...\n');

  const process = spawn('node', ['./dist/linkedin-complete-mcp.js'], {
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

  console.log('Sending request to local build:', request);
  
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

  console.log('\n=== LOCAL BUILD STDOUT ===');
  console.log(stdout);
  
  console.log('\n=== LOCAL BUILD STDERR ===');
  console.log(stderr);

  console.log('\n=== ANALYSIS ===');
  if (stderr.includes('DEBUG - exchangeCode called')) {
    console.log('✅ Function was called in local build');
  } else {
    console.log('❌ Function was NOT called in local build');
  }
}

testLocalBuild().catch(console.error);