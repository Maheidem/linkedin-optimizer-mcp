// Check what we can access with current token and permissions
const accessToken = 'AQWrlZ3yFxQmHmjUFf7crk7isAfN_OtCovgtTVCI0fetxZg8E2dT4ye-H28OCxv4DnByc5UcWvtmrSwxOHs5U0lOOYhvGF-M2BZfwL3P19gvoXGnkQe_98Ijt8fX5Ye3EAg0wqsHA0EDwLGyBYY-rrY57rGEHl7rU1tULg5cB3I_bCH_p9smcyb2xCng5RWLDLc22hwOndFqKmVs2DnDui2ElhK5z4EV-JAdIMehXwnitX10XJfGBPEWHh0SQkP94veAp199ujToKXLYzo6E5AThtYFEuU4DGNvGvdNEZB5FZpNOh9aT-dNGuZ8dvuIjOdaE-BEGjKS1l-on_I2h26bSfyvN6A';

async function checkAccess() {
  console.log('🔍 Checking current LinkedIn API access...\n');
  
  // Test different profile endpoints
  const endpoints = [
    { 
      name: 'Basic Profile (OpenID)', 
      url: 'https://api.linkedin.com/v2/me',
      description: 'OpenID Connect endpoint'
    },
    { 
      name: 'User Info (OpenID)', 
      url: 'https://api.linkedin.com/v2/userinfo',
      description: 'OpenID Connect user info'
    },
    { 
      name: 'Email Address', 
      url: 'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
      description: 'Email address endpoint'
    }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`📡 Testing: ${endpoint.name}`);
    try {
      const response = await fetch(endpoint.url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ SUCCESS: ${endpoint.name}`);
        console.log('📄 Data:', JSON.stringify(data, null, 2));
      } else {
        console.log(`❌ FAILED: ${endpoint.name} (${response.status})`);
        const error = await response.text();
        console.log(`   Error: ${error.substring(0, 200)}`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${endpoint.name} - ${error.message}`);
    }
    console.log('');
  }
  
  console.log('🎯 ANALYSIS:');
  console.log('Based on your LinkedIn app configuration, you have:');
  console.log('✅ OpenID Connect access (basic identity)');
  console.log('✅ Email access scope');
  console.log('✅ Social posting scope (w_member_social)');
  console.log('❌ Missing: Profile API product access');
  console.log('');
  console.log('💡 SOLUTION:');
  console.log('You need to request additional LinkedIn API products:');
  console.log('1. Go to: https://www.linkedin.com/developers/apps/[your-app-id]/products');
  console.log('2. Request access to "Profile API" product');
  console.log('3. This will give you r_liteprofile and r_basicprofile permissions');
  console.log('');
  console.log('🔄 ALTERNATIVE:');
  console.log('For now, we can use the OpenID endpoints for basic profile data');
  console.log('and focus on content creation once we get profile access working.');
}

checkAccess();