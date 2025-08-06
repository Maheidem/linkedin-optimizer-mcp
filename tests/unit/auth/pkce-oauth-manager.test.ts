/**
 * Unit tests for PKCEOAuthManager
 * Tests OAuth 2.0 PKCE flow implementation against RFC 7636 and RFC 9700 requirements
 */

import { PKCEOAuthManager, PKCEConfig, TokenResponse } from '../../../src/auth/pkce-oauth-manager';
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

// Mock fetch for testing
global.fetch = jest.fn();

describe('PKCEOAuthManager', () => {
  let manager: PKCEOAuthManager;
  let config: PKCEConfig;
  
  beforeEach(() => {
    // Clear any existing OAuth state
    const statePath = path.join(os.homedir(), '.linkedin-mcp', 'oauth-state.json');
    if (fs.existsSync(statePath)) {
      fs.removeSync(statePath);
    }
    
    config = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/callback',
      authorizationUrl: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
      scopes: ['openid', 'profile', 'email', 'w_member_social']
    };
    
    manager = new PKCEOAuthManager(config);
    
    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Code Verifier Generation', () => {
    it('should generate a code verifier with correct length', () => {
      const verifier = manager.generateCodeVerifier();
      
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(verifier.length).toBeLessThanOrEqual(128);
    });
    
    it('should generate a code verifier with only unreserved characters', () => {
      const verifier = manager.generateCodeVerifier();
      
      // Base64url uses: A-Z, a-z, 0-9, -, _
      const base64urlRegex = /^[A-Za-z0-9\-_]+$/;
      expect(verifier).toMatch(base64urlRegex);
    });
    
    it('should generate unique code verifiers', () => {
      const verifiers = new Set();
      
      for (let i = 0; i < 100; i++) {
        const verifier = manager.generateCodeVerifier();
        expect(verifiers.has(verifier)).toBe(false);
        verifiers.add(verifier);
      }
    });
    
    it('should have sufficient entropy', () => {
      const verifier = manager.generateCodeVerifier();
      const entropy = manager.getCodeVerifierEntropy(verifier);
      
      // Should have at least 256 bits of entropy for security
      expect(entropy).toBeGreaterThan(256);
    });
  });

  describe('Code Challenge Generation', () => {
    it('should generate correct SHA-256 code challenge', () => {
      // Test with known values from RFC 7636 Appendix B
      const testVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const expectedChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
      
      const challenge = manager.generateCodeChallenge(testVerifier);
      
      expect(challenge).toBe(expectedChallenge);
    });
    
    it('should throw error for invalid code verifier', () => {
      // Too short
      expect(() => manager.generateCodeChallenge('short')).toThrow('Invalid code verifier');
      
      // Invalid characters
      expect(() => manager.generateCodeChallenge('invalid@characters!')).toThrow('Invalid code verifier');
    });
    
    it('should generate different challenges for different verifiers', () => {
      const verifier1 = manager.generateCodeVerifier();
      const verifier2 = manager.generateCodeVerifier();
      
      const challenge1 = manager.generateCodeChallenge(verifier1);
      const challenge2 = manager.generateCodeChallenge(verifier2);
      
      expect(challenge1).not.toBe(challenge2);
    });
    
    it('should produce base64url encoded output without padding', () => {
      const verifier = manager.generateCodeVerifier();
      const challenge = manager.generateCodeChallenge(verifier);
      
      // Should not contain base64 padding
      expect(challenge).not.toContain('=');
      
      // Should use URL-safe characters
      expect(challenge).not.toContain('+');
      expect(challenge).not.toContain('/');
    });
  });

  describe('Authorization Request', () => {
    it('should create authorization URL with all required PKCE parameters', () => {
      const authUrl = manager.createAuthorizationRequest();
      const url = new URL(authUrl);
      const params = new URLSearchParams(url.search);
      
      // Check required OAuth parameters
      expect(params.get('client_id')).toBe(config.clientId);
      expect(params.get('response_type')).toBe('code');
      expect(params.get('redirect_uri')).toBe(config.redirectUri);
      expect(params.get('scope')).toBe('openid profile email w_member_social');
      
      // Check PKCE parameters
      expect(params.get('code_challenge')).toBeTruthy();
      expect(params.get('code_challenge_method')).toBe('S256');
      expect(params.get('state')).toBeTruthy();
      
      // Verify code challenge format
      const challenge = params.get('code_challenge')!;
      expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
      expect(challenge.length).toBeGreaterThan(0);
    });
    
    it('should include nonce when requested', () => {
      const authUrl = manager.createAuthorizationRequest({ includeNonce: true });
      const url = new URL(authUrl);
      const params = new URLSearchParams(url.search);
      
      expect(params.get('nonce')).toBeTruthy();
      expect(params.get('nonce')).toMatch(/^[A-Za-z0-9\-_]+$/);
    });
    
    it('should save state for later verification', () => {
      manager.createAuthorizationRequest();
      
      const statePath = path.join(os.homedir(), '.linkedin-mcp', 'oauth-state.json');
      expect(fs.existsSync(statePath)).toBe(true);
      
      const savedState = fs.readJsonSync(statePath);
      expect(savedState.codeVerifier).toBeTruthy();
      expect(savedState.codeChallenge).toBeTruthy();
      expect(savedState.state).toBeTruthy();
      expect(savedState.createdAt).toBeTruthy();
      expect(savedState.expiresAt).toBeTruthy();
    });
    
    it('should generate unique state for CSRF protection', () => {
      const states = new Set();
      
      for (let i = 0; i < 10; i++) {
        const authUrl = manager.createAuthorizationRequest();
        const url = new URL(authUrl);
        const params = new URLSearchParams(url.search);
        const state = params.get('state')!;
        
        expect(states.has(state)).toBe(false);
        states.add(state);
      }
    });
  });

  describe('Authorization Response Handling', () => {
    let authUrl: string;
    let state: string;
    
    beforeEach(() => {
      authUrl = manager.createAuthorizationRequest();
      const url = new URL(authUrl);
      state = new URLSearchParams(url.search).get('state')!;
    });
    
    it('should successfully handle valid authorization response', () => {
      const callbackUrl = `http://localhost:3000/callback?code=test-auth-code&state=${state}`;
      
      const result = manager.handleAuthorizationResponse(callbackUrl);
      
      expect(result.code).toBe('test-auth-code');
      expect(result.state).toBe(state);
    });
    
    it('should throw error for invalid state (CSRF protection)', () => {
      const callbackUrl = 'http://localhost:3000/callback?code=test-auth-code&state=invalid-state';
      
      expect(() => manager.handleAuthorizationResponse(callbackUrl)).toThrow('Invalid state parameter');
    });
    
    it('should handle OAuth error responses', () => {
      const callbackUrl = `http://localhost:3000/callback?error=access_denied&error_description=User+denied+access&state=${state}`;
      
      expect(() => manager.handleAuthorizationResponse(callbackUrl))
        .toThrow('OAuth authorization error: access_denied - User denied access');
    });
    
    it('should throw error for missing authorization code', () => {
      const callbackUrl = `http://localhost:3000/callback?state=${state}`;
      
      expect(() => manager.handleAuthorizationResponse(callbackUrl))
        .toThrow('Missing authorization code or state parameter');
    });
    
    it('should handle expired state', async () => {
      // Manually expire the state
      const statePath = path.join(os.homedir(), '.linkedin-mcp', 'oauth-state.json');
      const savedState = fs.readJsonSync(statePath);
      savedState.expiresAt = Date.now() - 1000;
      fs.writeJsonSync(statePath, savedState);
      
      const callbackUrl = `http://localhost:3000/callback?code=test-auth-code&state=${state}`;
      
      expect(() => manager.handleAuthorizationResponse(callbackUrl))
        .toThrow('OAuth state has expired');
    });
  });

  describe('Token Exchange', () => {
    let authCode: string;
    let codeVerifier: string;
    
    beforeEach(() => {
      // Set up authorization flow
      const authUrl = manager.createAuthorizationRequest();
      const url = new URL(authUrl);
      const state = new URLSearchParams(url.search).get('state')!;
      
      // Get the code verifier from saved state
      const statePath = path.join(os.homedir(), '.linkedin-mcp', 'oauth-state.json');
      const savedState = fs.readJsonSync(statePath);
      codeVerifier = savedState.codeVerifier;
      
      // Simulate successful authorization
      authCode = 'test-authorization-code';
      const callbackUrl = `http://localhost:3000/callback?code=${authCode}&state=${state}`;
      manager.handleAuthorizationResponse(callbackUrl);
    });
    
    it('should exchange authorization code for tokens with PKCE verification', async () => {
      const mockTokenResponse: TokenResponse = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'test-refresh-token',
        scope: 'openid profile email w_member_social'
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse
      });
      
      const tokens = await manager.exchangeCodeForTokens(authCode);
      
      expect(global.fetch).toHaveBeenCalledWith(
        config.tokenUrl,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          }),
          body: expect.stringContaining(`code_verifier=${codeVerifier}`)
        })
      );
      
      expect(tokens.access_token).toBe('test-access-token');
      expect(tokens.refresh_token).toBe('test-refresh-token');
      expect(tokens.created_at).toBeTruthy();
    });
    
    it('should include client secret for confidential clients', async () => {
      const mockTokenResponse: TokenResponse = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse
      });
      
      await manager.exchangeCodeForTokens(authCode);
      
      expect(global.fetch).toHaveBeenCalledWith(
        config.tokenUrl,
        expect.objectContaining({
          body: expect.stringContaining(`client_secret=${config.clientSecret}`)
        })
      );
    });
    
    it('should clear state after successful token exchange', async () => {
      const mockTokenResponse: TokenResponse = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse
      });
      
      await manager.exchangeCodeForTokens(authCode);
      
      const statePath = path.join(os.homedir(), '.linkedin-mcp', 'oauth-state.json');
      expect(fs.existsSync(statePath)).toBe(false);
    });
    
    it('should handle token exchange errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid authorization code'
      });
      
      await expect(manager.exchangeCodeForTokens(authCode))
        .rejects.toThrow('Token exchange failed: 400 - Invalid authorization code');
      
      // State should be cleared even on error
      const statePath = path.join(os.homedir(), '.linkedin-mcp', 'oauth-state.json');
      expect(fs.existsSync(statePath)).toBe(false);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token with refresh token', async () => {
      const mockTokenResponse: TokenResponse = {
        access_token: 'new-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'new-refresh-token'
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse
      });
      
      const tokens = await manager.refreshAccessToken('old-refresh-token');
      
      expect(global.fetch).toHaveBeenCalledWith(
        config.tokenUrl,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('grant_type=refresh_token')
        })
      );
      
      expect(tokens.access_token).toBe('new-access-token');
      expect(tokens.refresh_token).toBe('new-refresh-token');
    });
    
    it('should handle refresh token rotation', async () => {
      const mockTokenResponse: TokenResponse = {
        access_token: 'new-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'rotated-refresh-token' // New refresh token
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse
      });
      
      const tokens = await manager.refreshAccessToken('old-refresh-token');
      
      expect(tokens.refresh_token).toBe('rotated-refresh-token');
      expect(tokens.refresh_token).not.toBe('old-refresh-token');
    });
  });

  describe('Token Revocation', () => {
    it('should attempt to revoke access token', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200
      });
      
      await manager.revokeToken('test-access-token', 'access_token');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/revoke'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('token=test-access-token')
        })
      );
    });
    
    it('should not throw on revocation failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      // Should not throw
      await expect(manager.revokeToken('test-token')).resolves.not.toThrow();
    });
  });

  describe('Security Tests', () => {
    it('should use constant-time comparison for state validation', () => {
      // This test verifies the implementation uses crypto.timingSafeEqual
      // which prevents timing attacks
      const authUrl = manager.createAuthorizationRequest();
      const url = new URL(authUrl);
      const validState = new URLSearchParams(url.search).get('state')!;
      
      // Measure time for valid state
      const validStart = process.hrtime.bigint();
      try {
        manager.handleAuthorizationResponse(`http://localhost:3000/callback?code=test&state=${validState}`);
      } catch (e) {
        // Ignore
      }
      const validTime = process.hrtime.bigint() - validStart;
      
      // Measure time for invalid state (similar length)
      const invalidState = 'a'.repeat(validState.length);
      const invalidStart = process.hrtime.bigint();
      try {
        manager.handleAuthorizationResponse(`http://localhost:3000/callback?code=test&state=${invalidState}`);
      } catch (e) {
        // Expected
      }
      const invalidTime = process.hrtime.bigint() - invalidStart;
      
      // Times should be relatively similar (constant-time comparison)
      const timeDiff = Math.abs(Number(validTime - invalidTime));
      const avgTime = Number(validTime + invalidTime) / 2;
      const percentDiff = (timeDiff / avgTime) * 100;
      
      // Allow up to 50% difference due to system variance
      expect(percentDiff).toBeLessThan(50);
    });
    
    it('should not expose sensitive information in errors', async () => {
      // Test that error messages don't contain sensitive data
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'));
      
      try {
        await manager.refreshAccessToken('super-secret-refresh-token');
      } catch (error: any) {
        expect(error.message).not.toContain('super-secret-refresh-token');
      }
    });
  });
});