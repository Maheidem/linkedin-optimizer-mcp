// Exchange LinkedIn authorization code for access token
const config = {
  clientId: '77dvmuotbmd8gx',
  clientSecret: 'WPL_AP1.w8905sdXttgXXHCV.pZR0rg==',
  redirectUri: 'http://localhost:3000/callback'
};

async function exchangeToken() {
  const code = 'AQTV4QdKFcvAzuoVImIJ2GM5ETWmIaHYnuThXzEgSaOrW3m8oQBTIXAUJw-9CgkNVZbJ4pqR75imzhYlWo0rlXvErLoE3JTrnFjKxRcuS_wNRIg79fKLBaV4ZaHMQwEep5eL4n5dsAgCefyYWvyXdUuiLY1dlnnXlEOh7hHRdLduG_dChCACVL6PnOweuM47HyILWFrhw72QqXM-zYM';
  
  const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  try {
    console.log('🔄 Exchanging authorization code for access token...');
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Token exchange failed:', response.status, response.statusText);
      console.error('Error details:', errorText);
      return;
    }

    const tokenData = await response.json();
    
    console.log('✅ SUCCESS! Access token obtained:');
    console.log('');
    console.log('🔑 Access Token:', tokenData.access_token);
    console.log('⏰ Expires in:', Math.floor(tokenData.expires_in / 3600), 'hours');
    console.log('🎯 Scope:', tokenData.scope);
    console.log('');
    console.log('💾 Save this token securely - you\'ll need it for API calls!');
    
    // Test the token by getting profile
    console.log('🧪 Testing token by fetching your profile...');
    await testProfile(tokenData.access_token);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testProfile(accessToken) {
  try {
    const profileUrl = 'https://api.linkedin.com/v2/people/~?fields=id,firstName,lastName,headline';
    
    const response = await fetch(profileUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('❌ Profile test failed:', response.status, response.statusText);
      return;
    }

    const profile = await response.json();
    
    console.log('✅ Profile retrieved successfully!');
    console.log('👤 Name:', profile.firstName?.localized?.en_US, profile.lastName?.localized?.en_US);
    console.log('💼 Headline:', profile.headline?.localized?.en_US);
    console.log('🆔 LinkedIn ID:', profile.id);
    console.log('');
    console.log('🎉 Your LinkedIn API integration is working perfectly!');
    
  } catch (error) {
    console.error('❌ Profile test error:', error.message);
  }
}

exchangeToken();