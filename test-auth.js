// Quick test to generate LinkedIn auth URL
const config = {
  clientId: '77dvmuotbmd8gx',
  redirectUri: 'http://localhost:3000/callback'
};

const state = `state_${Date.now()}`;
const scopes = ['openid', 'profile', 'email', 'w_member_social'];

const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', config.clientId);
authUrl.searchParams.set('redirect_uri', config.redirectUri);
authUrl.searchParams.set('state', state);
authUrl.searchParams.set('scope', scopes.join(' '));

console.log('🔗 LinkedIn Authorization URL:');
console.log(authUrl.toString());
console.log('');
console.log('📋 Instructions:');
console.log('1. Copy the URL above and paste it in your browser');
console.log('2. Log in to LinkedIn and authorize the app');
console.log('3. You\'ll be redirected to: http://localhost:3000/callback?code=...');
console.log('4. Copy the "code" parameter from the URL');
console.log('5. Come back here with the code to get your access token');
console.log('');
console.log('State (for verification):', state);