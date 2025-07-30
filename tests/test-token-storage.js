const { TokenManager } = require('./dist/token-manager.js');

async function testTokenStorage() {
  console.log('🧪 Testing LinkedIn Token Storage...\n');
  
  const tokenManager = new TokenManager();
  
  // Test 1: Check initial state
  console.log('1️⃣ Checking initial authentication state...');
  const hasToken = await tokenManager.hasValidToken();
  console.log(`   Has valid token: ${hasToken}`);
  
  // Test 2: Save a test token
  console.log('\n2️⃣ Saving test token...');
  const testToken = {
    access_token: 'test-token-12345',
    expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    scope: 'openid profile email w_member_social'
  };
  
  await tokenManager.saveToken(testToken);
  console.log('   Token saved successfully');
  
  // Test 3: Retrieve token
  console.log('\n3️⃣ Retrieving stored token...');
  const storedToken = await tokenManager.getToken();
  console.log(`   Token retrieved: ${storedToken ? 'Yes' : 'No'}`);
  if (storedToken) {
    console.log(`   Access token: ${storedToken.access_token.substring(0, 10)}...`);
    console.log(`   Created at: ${storedToken.created_at}`);
    console.log(`   Expires at: ${storedToken.expires_at}`);
  }
  
  // Test 4: Check expiry info
  console.log('\n4️⃣ Checking token expiry...');
  const expiryInfo = await tokenManager.getTokenExpiryInfo();
  if (expiryInfo) {
    console.log(`   Valid: ${expiryInfo.isValid}`);
    console.log(`   Time remaining: ${expiryInfo.timeRemaining}`);
  }
  
  // Test 5: Clear token
  console.log('\n5️⃣ Clearing token...');
  await tokenManager.clearToken();
  const hasTokenAfterClear = await tokenManager.hasValidToken();
  console.log(`   Token cleared: ${!hasTokenAfterClear}`);
  
  console.log('\n✅ Token storage tests completed!');
  
  // Test 6: Save real token if provided
  const realToken = 'AQWrlZ3yFxQmHmjUFf7crk7isAfN_OtCovgtTVCI0fetxZg8E2dT4ye-H28OCxv4DnByc5UcWvtmrSwxOHs5U0lOOYhvGF-M2BZfwL3P19gvoXGnkQe_98Ijt8fX5Ye3EAg0wqsHA0EDwLGyBYY-rrY57rGEHl7rU1tULg5cB3I_bCH_p9smcyb2xCng5RWLDLc22hwOndFqKmVs2DnDui2ElhK5z4EV-JAdIMehXwnitX10XJfGBPEWHh0SQkP94veAp199ujTqo6UgJvtGwqiIGw98A6GvJUUoKXLYzo6E5AThtYFEuU4DGNvGvdNEZB5FZpNOh9aT-dNGuZ8dvuIjOdaE-BEGjKS1l-on_I2h26bSfyvN6A';
  
  console.log('\n6️⃣ Saving real LinkedIn token for future use...');
  await tokenManager.saveToken({
    access_token: realToken,
    expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
    scope: 'openid profile email w_member_social'
  });
  console.log('   Real token saved! You can now use LinkedIn MCP tools without providing access token.');
}

testTokenStorage().catch(console.error);