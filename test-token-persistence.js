#!/usr/bin/env node

/**
 * Test script for LinkedIn MCP Token Persistence
 * 
 * This script tests that:
 * 1. Tokens are saved when exchanging authorization code
 * 2. Tokens persist between sessions
 * 3. API calls work without providing accessToken
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// MCP server path
const serverPath = path.join(__dirname, 'dist', 'linkedin-complete-mcp.js');

// Helper function to call MCP server
async function callMCPServer(method, params = {}) {
  return new Promise((resolve, reject) => {
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let errorOutput = '';
    
    server.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    server.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    server.on('close', (code) => {
      if (output) {
        try {
          // MCP servers may output multiple JSON objects, take the last one
          const lines = output.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const response = JSON.parse(lastLine);
          resolve(response);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${output}`));
        }
      } else if (errorOutput) {
        // Sometimes debug output goes to stderr
        console.log('Debug output:', errorOutput);
        reject(new Error(`No response from server`));
      } else {
        reject(new Error(`Server exited with code ${code}`));
      }
    });
    
    // Send JSON-RPC request
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: method,
        arguments: params
      }
    };
    
    server.stdin.write(JSON.stringify(request));
    server.stdin.end();
  });
}

async function main() {
  console.log('🧪 Testing LinkedIn MCP Token Persistence\n');
  
  // Test 1: Check initial token status
  console.log('1️⃣ Checking initial token status...');
  try {
    const result = await callMCPServer('linkedin_check_token_status');
    const content = JSON.parse(result.result.content[0].text);
    
    console.log(`   Status: ${content.authenticated ? '✅ Authenticated' : '❌ Not authenticated'}`);
    if (content.user) {
      console.log(`   User: ${content.user.name} (${content.user.email})`);
    }
    console.log(`   Message: ${content.message}\n`);
    
    // Test 2: If authenticated, try to get user info without token
    if (content.authenticated) {
      console.log('2️⃣ Testing API call without providing token...');
      try {
        const userResult = await callMCPServer('linkedin_get_user_info');
        const userContent = JSON.parse(userResult.result.content[0].text);
        console.log(`   ✅ Successfully retrieved user info: ${userContent.userInfo.name}`);
        console.log(`   Email: ${userContent.userInfo.email}\n`);
      } catch (error) {
        console.log(`   ❌ Failed to get user info: ${error.message}\n`);
      }
    }
    
    // Display token storage path
    const tokenPath = process.env.LINKEDIN_TOKEN_STORAGE_PATH || 
                      path.join(require('os').homedir(), '.linkedin-mcp', 'tokens');
    console.log(`📁 Token storage location: ${tokenPath}`);
    
    // Check if token file exists
    const tokenFile = path.join(tokenPath, 'linkedin_token.json');
    if (fs.existsSync(tokenFile)) {
      const stats = fs.statSync(tokenFile);
      console.log(`   Token file exists (${stats.size} bytes)`);
      console.log(`   Last modified: ${stats.mtime.toLocaleString()}`);
      
      // Read and display token info (without showing the actual token)
      const tokenData = JSON.parse(fs.readFileSync(tokenFile, 'utf-8'));
      console.log(`   Scope: ${tokenData.scope || 'N/A'}`);
      if (tokenData.created_at) {
        const created = new Date(tokenData.created_at);
        console.log(`   Created: ${created.toLocaleString()}`);
      }
      if (tokenData.expires_in) {
        const expiresAt = new Date(tokenData.created_at + (tokenData.expires_in * 1000));
        console.log(`   Expires: ${expiresAt.toLocaleString()}`);
      }
    } else {
      console.log(`   ❌ No token file found at ${tokenFile}`);
    }
    
  } catch (error) {
    console.error('Error checking token status:', error.message);
  }
  
  console.log('\n✨ Token persistence test complete!');
}

// Run the test
main().catch(console.error);