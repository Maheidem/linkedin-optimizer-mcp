/**
 * PKCEOAuthManager - OAuth 2.0 with PKCE (RFC 9700) Implementation
 * Compliant with 2025 security standards and LinkedIn requirements
 */

import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { URL, URLSearchParams } from 'url';

/**
 * PKCE OAuth configuration interface
 */
export interface PKCEConfig {
  clientId: string;
  clientSecret?: string; // Optional for public clients
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
}

/**
 * OAuth state storage interface
 */
interface OAuthState {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
  nonce?: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Token response interface
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
  created_at?: number;
}

/**
 * PKCE OAuth Manager Implementation
 * Implements OAuth 2.0 Authorization Code Flow with PKCE extension
 * Compliant with RFC 7636 and RFC 9700 (January 2025 mandatory PKCE)
 */
export class PKCEOAuthManager {
  private config: PKCEConfig;
  private statePath: string;
  private currentState: OAuthState | null = null;
  
  // PKCE parameters constraints (RFC 7636 Section 4.1)
  private readonly CODE_VERIFIER_MIN_LENGTH = 43;
  private readonly CODE_VERIFIER_MAX_LENGTH = 128;
  private readonly STATE_LENGTH = 32;
  
  // Character set for code verifier (unreserved characters)
  // A-Z, a-z, 0-9, hyphen, period, underscore, tilde
  private readonly UNRESERVED_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

  constructor(config: PKCEConfig) {
    this.config = config;
    this.statePath = path.join(os.homedir(), '.linkedin-mcp', 'oauth-state.json');
    this.loadState();
  }

  /**
   * Generate a cryptographically secure code verifier
   * RFC 7636 Section 4.1: code_verifier = high-entropy cryptographic random STRING
   * Length: 43-128 characters from unreserved characters set
   */
  public generateCodeVerifier(): string {
    // Generate random bytes for maximum entropy
    // We need at least 32 bytes (256 bits) for sufficient entropy
    const randomBytes = crypto.randomBytes(64);
    
    // Convert to base64url encoding
    // This ensures we get a string with sufficient length and entropy
    let verifier = this.base64urlEncode(randomBytes);
    
    // Ensure the verifier meets length requirements
    // Trim if too long, regenerate if too short (shouldn't happen with 64 bytes)
    if (verifier.length > this.CODE_VERIFIER_MAX_LENGTH) {
      verifier = verifier.substring(0, this.CODE_VERIFIER_MAX_LENGTH);
    } else if (verifier.length < this.CODE_VERIFIER_MIN_LENGTH) {
      // This shouldn't happen with 64 bytes, but handle it defensively
      throw new Error(`Generated code verifier too short: ${verifier.length} characters`);
    }
    
    // Validate the verifier contains only unreserved characters
    if (!this.validateCodeVerifier(verifier)) {
      throw new Error('Generated code verifier contains invalid characters');
    }
    
    return verifier;
  }

  /**
   * Validate that a code verifier meets all requirements
   */
  private validateCodeVerifier(verifier: string): boolean {
    // Check length requirements
    if (verifier.length < this.CODE_VERIFIER_MIN_LENGTH || 
        verifier.length > this.CODE_VERIFIER_MAX_LENGTH) {
      return false;
    }
    
    // Check character set (base64url uses only unreserved characters minus hyphen/period/tilde)
    // base64url alphabet: A-Z, a-z, 0-9, -, _
    const base64urlRegex = /^[A-Za-z0-9\-_]+$/;
    return base64urlRegex.test(verifier);
  }

  /**
   * Generate code challenge from code verifier using SHA-256
   * RFC 7636 Section 4.2: code_challenge = BASE64URL(SHA256(ASCII(code_verifier)))
   */
  public generateCodeChallenge(codeVerifier: string): string {
    // Validate the code verifier first
    if (!this.validateCodeVerifier(codeVerifier)) {
      throw new Error('Invalid code verifier provided');
    }
    
    // Create SHA-256 hash of the code verifier
    const hash = crypto.createHash('sha256');
    hash.update(codeVerifier, 'ascii');
    const digest = hash.digest();
    
    // Convert to base64url encoding
    const challenge = this.base64urlEncode(digest);
    
    return challenge;
  }

  /**
   * Base64url encode a buffer (RFC 4648 Section 5)
   * This is URL-safe base64 encoding with padding removed
   */
  private base64urlEncode(buffer: Buffer): string {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')  // Replace + with -
      .replace(/\//g, '_')  // Replace / with _
      .replace(/=/g, '');   // Remove padding
  }

  /**
   * Generate a cryptographically secure state parameter
   * Used to prevent CSRF attacks
   */
  private generateState(): string {
    const stateBytes = crypto.randomBytes(this.STATE_LENGTH);
    return this.base64urlEncode(stateBytes);
  }

  /**
   * Generate a nonce for additional security (optional)
   * Used in OpenID Connect flows
   */
  private generateNonce(): string {
    const nonceBytes = crypto.randomBytes(16);
    return this.base64urlEncode(nonceBytes);
  }

  /**
   * Create the authorization request URL with PKCE parameters
   * RFC 7636 Section 4.3: Authorization Request
   */
  public createAuthorizationRequest(options?: { includeNonce?: boolean }): string {
    // Generate PKCE parameters
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    const state = this.generateState();
    const nonce = options?.includeNonce ? this.generateNonce() : undefined;
    
    // Store the state for later verification
    this.currentState = {
      codeVerifier,
      codeChallenge,
      state,
      nonce,
      createdAt: Date.now(),
      expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes expiry
    };
    this.saveState();
    
    // Build authorization URL
    const authUrl = new URL(this.config.authorizationUrl);
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      state: state,
      scope: this.config.scopes.join(' '),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256' // SHA-256 is the only secure method
    });
    
    // Add nonce if requested (for OpenID Connect)
    if (nonce) {
      params.append('nonce', nonce);
    }
    
    authUrl.search = params.toString();
    return authUrl.toString();
  }

  /**
   * Handle the authorization response and validate the state
   * Protects against CSRF attacks
   */
  public handleAuthorizationResponse(callbackUrl: string): { code: string; state: string } {
    const url = new URL(callbackUrl);
    const params = new URLSearchParams(url.search);
    
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const errorDescription = params.get('error_description');
    
    // Check for OAuth errors
    if (error) {
      throw new Error(`OAuth authorization error: ${error} - ${errorDescription || 'No description'}`);
    }
    
    // Validate required parameters
    if (!code || !state) {
      throw new Error('Missing authorization code or state parameter');
    }
    
    // Validate state to prevent CSRF
    if (!this.validateState(state)) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }
    
    return { code, state };
  }

  /**
   * Validate the returned state parameter
   */
  private validateState(state: string): boolean {
    if (!this.currentState) {
      return false;
    }
    
    // Check if state has expired
    if (Date.now() > this.currentState.expiresAt) {
      this.clearState();
      throw new Error('OAuth state has expired');
    }
    
    // Ensure both buffers are the same length for timing-safe comparison
    const stateBuffer = Buffer.from(state);
    const expectedBuffer = Buffer.from(this.currentState.state);
    
    // If lengths don't match, it's definitely invalid
    if (stateBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(stateBuffer, expectedBuffer);
  }

  /**
   * Exchange authorization code for tokens using PKCE code verifier
   * RFC 7636 Section 4.5: Token Request
   */
  public async exchangeCodeForTokens(authorizationCode: string): Promise<TokenResponse> {
    if (!this.currentState) {
      throw new Error('No OAuth state found - authorization flow not initiated');
    }
    
    // Prepare token request parameters
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: authorizationCode,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
      code_verifier: this.currentState.codeVerifier // PKCE verification
    });
    
    // Add client secret if configured (confidential client)
    if (this.config.clientSecret) {
      params.append('client_secret', this.config.clientSecret);
    }
    
    try {
      // Make token request
      const response = await fetch(this.config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token exchange failed: ${response.status} - ${error}`);
      }
      
      const tokenResponse = await response.json() as TokenResponse;
      
      // Add created_at timestamp if not provided
      if (!tokenResponse.created_at) {
        tokenResponse.created_at = Math.floor(Date.now() / 1000);
      }
      
      // Clear the state after successful exchange
      this.clearState();
      
      return tokenResponse;
    } catch (error) {
      // Clear state on error to prevent reuse
      this.clearState();
      throw error;
    }
  }

  /**
   * Refresh an access token using a refresh token
   * Implements token rotation for enhanced security
   */
  public async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId
    });
    
    // Add client secret if configured
    if (this.config.clientSecret) {
      params.append('client_secret', this.config.clientSecret);
    }
    
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString()
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${response.status} - ${error}`);
    }
    
    const tokenResponse = await response.json() as TokenResponse;
    
    // Add created_at timestamp
    if (!tokenResponse.created_at) {
      tokenResponse.created_at = Math.floor(Date.now() / 1000);
    }
    
    return tokenResponse;
  }

  /**
   * Revoke a token (access or refresh token)
   * Implements RFC 7009 Token Revocation
   */
  public async revokeToken(token: string, tokenType: 'access_token' | 'refresh_token' = 'access_token'): Promise<void> {
    const params = new URLSearchParams({
      token: token,
      token_type_hint: tokenType,
      client_id: this.config.clientId
    });
    
    if (this.config.clientSecret) {
      params.append('client_secret', this.config.clientSecret);
    }
    
    // Note: LinkedIn might not have a revocation endpoint
    // This is a standard OAuth 2.0 revocation implementation
    const revokeUrl = this.config.tokenUrl.replace('/accessToken', '/revoke');
    
    try {
      const response = await fetch(revokeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
      
      // Revocation endpoint should return 200 even if token doesn't exist
      if (!response.ok && response.status !== 200) {
        console.warn(`Token revocation may have failed: ${response.status}`);
      }
    } catch (error) {
      // Revocation failure should not break the flow
      console.warn('Token revocation failed:', error);
    }
  }

  /**
   * Save OAuth state to disk for persistence across sessions
   */
  private saveState(): void {
    if (this.currentState) {
      const dir = path.dirname(this.statePath);
      fs.ensureDirSync(dir);
      fs.writeJsonSync(this.statePath, this.currentState, { spaces: 2 });
    }
  }

  /**
   * Load OAuth state from disk
   */
  private loadState(): void {
    try {
      if (fs.existsSync(this.statePath)) {
        this.currentState = fs.readJsonSync(this.statePath);
        
        // Validate loaded state hasn't expired
        if (this.currentState && Date.now() > this.currentState.expiresAt) {
          this.clearState();
        }
      }
    } catch (error) {
      console.warn('Failed to load OAuth state:', error);
      this.currentState = null;
    }
  }

  /**
   * Clear OAuth state
   */
  private clearState(): void {
    this.currentState = null;
    if (fs.existsSync(this.statePath)) {
      fs.removeSync(this.statePath);
    }
  }

  /**
   * Get entropy estimate for code verifier (for testing)
   */
  public getCodeVerifierEntropy(verifier: string): number {
    // Calculate Shannon entropy
    const charFrequency: { [key: string]: number } = {};
    for (const char of verifier) {
      charFrequency[char] = (charFrequency[char] || 0) + 1;
    }
    
    let entropy = 0;
    const len = verifier.length;
    for (const char in charFrequency) {
      const frequency = charFrequency[char] / len;
      entropy -= frequency * Math.log2(frequency);
    }
    
    return entropy * len; // Total bits of entropy
  }
}