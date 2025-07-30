const fs = require('fs');
const path = require('path');

// Read stored credentials
const credentialsPath = path.join(process.env.HOME, '.linkedin-mcp/tokens/credentials.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

const clientId = credentials.clientId;
const redirectUri = 'http://localhost:3000/callback'; // Default redirect URI
const scope = 'openid profile email w_member_social';
const state = 'profile-data-retrieval';

// Generate LinkedIn OAuth authorization URL
const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
  `response_type=code&` +
  `client_id=${clientId}&` +
  `redirect_uri=${encodeURIComponent(redirectUri)}&` +
  `state=${state}&` +
  `scope=${encodeURIComponent(scope)}`;

console.log('LinkedIn Authorization URL:');
console.log(authUrl);
console.log('\nInstructions:');
console.log('1. Click the URL above or copy it to your browser');
console.log('2. Log in to LinkedIn and authorize the application');
console.log('3. After authorization, you\'ll be redirected to a page that may not load');
console.log('4. Copy the "code" parameter from the URL bar');
console.log('5. Use that code to exchange for an access token');