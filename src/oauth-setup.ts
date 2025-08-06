#!/usr/bin/env node

/**
 * LinkedIn OAuth Setup Tool
 * Handles the complete OAuth flow during installation
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import * as http from 'http';
import * as url from 'url';
import { spawn } from 'child_process';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface TokenData {
  access_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
  created_at?: number;
}

export class OAuthSetup {
  private tokenDir = path.join(os.homedir(), '.linkedin-mcp', 'tokens');
  private tokenFile = path.join(this.tokenDir, 'linkedin_token.json');
  private credentialsFile = path.join(this.tokenDir, 'credentials.json');
  private config: OAuthConfig = {
    clientId: '',
    clientSecret: '',
    redirectUri: 'http://localhost:3000/callback'
  };

  async setup(): Promise<boolean> {
    console.log(chalk.blue('\n🔐 LinkedIn OAuth Setup\n'));

    // Check if already authenticated
    if (await this.checkExistingToken()) {
      const { reauth } = await inquirer.prompt([{
        type: 'confirm',
        name: 'reauth',
        message: 'You are already authenticated. Re-authenticate?',
        default: false
      }]);
      
      if (!reauth) {
        console.log(chalk.green('✅ Using existing authentication'));
        return true;
      }
    }

    // Load or get credentials
    if (!await this.loadOrGetCredentials()) {
      return false;
    }

    // Start OAuth flow
    console.log(chalk.yellow('\n📋 Starting OAuth flow...\n'));
    
    // Generate auth URL
    const authUrl = this.getAuthorizationUrl();
    console.log(chalk.cyan('Authorization URL:'));
    console.log(authUrl);
    console.log();

    // Start local server to catch callback
    const code = await this.startCallbackServer();
    
    if (!code) {
      console.log(chalk.red('❌ Failed to get authorization code'));
      return false;
    }

    // Exchange code for token
    console.log(chalk.yellow('\n🔄 Exchanging code for access token...'));
    const token = await this.exchangeCodeForToken(code);
    
    if (!token) {
      console.log(chalk.red('❌ Failed to get access token'));
      return false;
    }

    // Save token
    await this.saveToken(token);
    
    // Verify by getting user info
    const userInfo = await this.verifyToken(token.access_token);
    
    if (userInfo) {
      console.log(chalk.green('\n✅ Authentication successful!'));
      console.log(chalk.green(`Logged in as: ${userInfo.name} (${userInfo.email})`));
      console.log(chalk.green(`Token expires in: ${Math.floor(token.expires_in / 86400)} days`));
      return true;
    }

    return false;
  }

  private async checkExistingToken(): Promise<boolean> {
    try {
      if (await fs.pathExists(this.tokenFile)) {
        const tokenData = await fs.readJson(this.tokenFile);
        
        // Check if token is valid
        if (tokenData.access_token && tokenData.created_at && tokenData.expires_in) {
          const expiryTime = tokenData.created_at + (tokenData.expires_in * 1000);
          const now = Date.now();
          
          if (now < expiryTime - 300000) { // 5 minute buffer
            // Verify token works
            const userInfo = await this.verifyToken(tokenData.access_token);
            if (userInfo) {
              console.log(chalk.green(`✅ Authenticated as: ${userInfo.name}`));
              return true;
            }
          }
        }
      }
    } catch (error) {
      // Token doesn't exist or is invalid
    }
    
    return false;
  }

  private async loadOrGetCredentials(): Promise<boolean> {
    // Try to load existing credentials
    try {
      if (await fs.pathExists(this.credentialsFile)) {
        const creds = await fs.readJson(this.credentialsFile);
        if (creds.clientId && creds.clientSecret) {
          this.config.clientId = creds.clientId;
          this.config.clientSecret = creds.clientSecret;
          console.log(chalk.green('✅ Loaded existing OAuth credentials'));
          return true;
        }
      }
    } catch (error) {
      // Credentials don't exist
    }

    // Ask for credentials
    console.log(chalk.yellow('📝 LinkedIn OAuth Credentials Required\n'));
    console.log('Get these from: https://www.linkedin.com/developers/');
    console.log('1. Create an app');
    console.log('2. Add redirect URI: http://localhost:3000/callback');
    console.log('3. Copy Client ID and Client Secret\n');

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'clientId',
        message: 'Client ID:',
        validate: (input) => input.length > 0 || 'Client ID is required'
      },
      {
        type: 'password',
        name: 'clientSecret',
        message: 'Client Secret:',
        mask: '*',
        validate: (input) => input.length > 0 || 'Client Secret is required'
      }
    ]);

    this.config.clientId = answers.clientId;
    this.config.clientSecret = answers.clientSecret;

    // Save credentials
    await fs.ensureDir(this.tokenDir);
    await fs.writeJson(this.credentialsFile, {
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      redirectUri: this.config.redirectUri
    }, { spaces: 2 });

    console.log(chalk.green('✅ Credentials saved'));
    return true;
  }

  private getAuthorizationUrl(): string {
    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', this.config.clientId);
    authUrl.searchParams.set('redirect_uri', this.config.redirectUri);
    authUrl.searchParams.set('state', `state_${Date.now()}`);
    authUrl.searchParams.set('scope', 'openid profile email w_member_social');
    return authUrl.toString();
  }

  private async startCallbackServer(): Promise<string | null> {
    return new Promise((resolve) => {
      const server = http.createServer((req, res) => {
        const parsedUrl = url.parse(req.url || '', true);
        
        if (parsedUrl.pathname === '/callback') {
          const code = parsedUrl.query.code as string;
          
          if (code) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                  <h1>✅ Authorization Successful!</h1>
                  <p>You can close this window and return to the terminal.</p>
                  <script>setTimeout(() => window.close(), 3000);</script>
                </body>
              </html>
            `);
            
            server.close();
            resolve(code);
          } else {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<h1>❌ Authorization failed - no code received</h1>');
            server.close();
            resolve(null);
          }
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      server.listen(3000, () => {
        console.log(chalk.yellow('\n🌐 Callback server listening on http://localhost:3000'));
        console.log(chalk.cyan('\n👉 Opening browser for authorization...'));
        
        // Open browser
        const authUrl = this.getAuthorizationUrl();
        const platform = os.platform();
        
        let command: string;
        let args: string[];
        
        if (platform === 'darwin') {
          command = 'open';
          args = [authUrl];
        } else if (platform === 'win32') {
          command = 'cmd';
          args = ['/c', 'start', authUrl];
        } else {
          command = 'xdg-open';
          args = [authUrl];
        }
        
        spawn(command, args, { detached: true }).unref();
        
        console.log(chalk.yellow('\nWaiting for authorization...'));
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        resolve(null);
      }, 300000);
    });
  }

  private async exchangeCodeForToken(code: string): Promise<TokenData | null> {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      });

      const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: params,
      });

      if (response.ok) {
        const tokenData = await response.json() as TokenData;
        tokenData.created_at = Date.now();
        return tokenData;
      } else {
        const error = await response.text();
        console.error(chalk.red('Token exchange failed:'), error);
        return null;
      }
    } catch (error) {
      console.error(chalk.red('Token exchange error:'), error);
      return null;
    }
  }

  private async saveToken(token: TokenData): Promise<void> {
    await fs.ensureDir(this.tokenDir);
    await fs.writeJson(this.tokenFile, token, { spaces: 2 });
    console.log(chalk.green('✅ Token saved to:', this.tokenFile));
  }

  private async verifyToken(accessToken: string): Promise<any> {
    try {
      const response = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error(chalk.red('Token verification error:'), error);
    }
    
    return null;
  }
}

// Run if called directly
if (require.main === module) {
  const setup = new OAuthSetup();
  setup.setup().then((success) => {
    process.exit(success ? 0 : 1);
  });
}