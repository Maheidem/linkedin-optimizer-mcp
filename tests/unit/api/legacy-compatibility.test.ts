/**
 * Unit tests for Legacy Compatibility Layer
 * Tests backward compatibility for existing LinkedIn API implementations
 */

import { LegacyLinkedInClient, createLinkedInClient, LinkedInError, LINKEDIN_SCOPES } from '../../../src/api/legacy-compatibility';
import { LinkedInAPIVersion } from '../../../src/api/linkedin-api-v2024';
import { PKCEOAuthManager, TokenResponse } from '../../../src/auth/pkce-oauth-manager';
import * as fs from 'fs-extra';

// Mock dependencies
jest.mock('../../../src/auth/pkce-oauth-manager');
jest.mock('fs-extra');

// Mock fetch
global.fetch = jest.fn();

describe('Legacy LinkedIn API Compatibility', () => {
  let legacyClient: LegacyLinkedInClient;

  beforeEach(() => {
    // Mock PKCEOAuthManager
    (PKCEOAuthManager as jest.Mock).mockImplementation(() => ({
      createAuthorizationRequest: jest.fn().mockReturnValue('https://linkedin.com/oauth?client_id=test'),
      handleAuthorizationResponse: jest.fn().mockReturnValue({ code: 'auth-code-123' }),
      exchangeCodeForTokens: jest.fn().mockResolvedValue({
        access_token: 'legacy-token',
        token_type: 'Bearer',
        expires_in: 5400,
        created_at: Math.floor(Date.now() / 1000)
      })
    }));

    // Mock fs operations
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.readJsonSync as jest.Mock).mockReturnValue({});
    (fs.ensureDirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeJsonSync as jest.Mock).mockReturnValue(undefined);

    // Create legacy client
    legacyClient = new LegacyLinkedInClient({
      clientId: 'legacy-client-id',
      redirectUri: 'http://localhost:3000/callback',
      scopes: ['r_basicprofile', 'r_emailaddress']
    });

    // Set up mock token
    const mockToken: TokenResponse = {
      access_token: 'legacy-access-token',
      token_type: 'Bearer',
      expires_in: 5400,
      created_at: Math.floor(Date.now() / 1000)
    };
    legacyClient.setAccessToken(mockToken);

    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with legacy config format', () => {
      const client = new LegacyLinkedInClient({
        clientId: 'test-client',
        redirectUri: 'http://example.com/callback',
        scopes: ['r_basicprofile'],
        sandbox: true
      });

      expect(client).toBeInstanceOf(LegacyLinkedInClient);
    });

    it('should create client using factory function', () => {
      const client = createLinkedInClient({
        clientId: 'test-client',
        redirectUri: 'http://example.com/callback',
        scopes: ['r_basicprofile']
      });

      expect(client).toBeInstanceOf(LegacyLinkedInClient);
    });
  });

  describe('Legacy Authentication', () => {
    it('should generate authorization URL', () => {
      const authUrl = legacyClient.getAuthorizationUrl();
      expect(authUrl).toContain('linkedin.com');
    });

    it('should exchange code for tokens with legacy method signature', async () => {
      const tokens = await legacyClient.exchangeCodeForTokens('auth-code-123');
      
      expect(tokens).toHaveProperty('access_token');
      expect(tokens).toHaveProperty('token_type', 'Bearer');
    });

    it('should accept string token for legacy compatibility', () => {
      expect(() => {
        legacyClient.setAccessToken('simple-string-token');
      }).not.toThrow();
    });

    it('should accept token object', () => {
      const tokenData: TokenResponse = {
        access_token: 'token-123',
        token_type: 'Bearer',
        expires_in: 5400,
        created_at: Math.floor(Date.now() / 1000)
      };

      expect(() => {
        legacyClient.setAccessToken(tokenData);
      }).not.toThrow();
    });
  });

  describe('Legacy Profile Methods', () => {
    it('should get profile using legacy method', async () => {
      const mockProfile = {
        id: 'person-123',
        firstName: { localized: { 'en_US': 'John' } },
        lastName: { localized: { 'en_US': 'Doe' } },
        headline: { localized: { 'en_US': 'Software Engineer' } }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: jest.fn().mockReturnValue(null) },
        json: async () => mockProfile
      });

      const profile = await legacyClient.getProfile();
      
      expect(profile).toEqual(mockProfile);
    });

    it('should filter profile fields when requested', async () => {
      const mockProfile = {
        id: 'person-123',
        firstName: { localized: { 'en_US': 'John' } },
        lastName: { localized: { 'en_US': 'Doe' } },
        headline: { localized: { 'en_US': 'Software Engineer' } },
        emailAddress: 'john@example.com'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: jest.fn().mockReturnValue(null) },
        json: async () => mockProfile
      });

      const profile = await legacyClient.getProfile({ fields: ['id', 'firstName'] });
      
      expect(profile).toEqual({
        id: 'person-123',
        firstName: { localized: { 'en_US': 'John' } }
      });
    });
  });

  describe('Legacy Post Creation', () => {
    it('should create share with content using legacy method', async () => {
      const mockResponse = { id: 'share-123' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: { get: jest.fn().mockReturnValue(null) },
        json: async () => mockResponse
      });

      const result = await legacyClient.createShare({
        author: 'urn:li:person:123',
        text: 'Check out this link!',
        content: {
          title: 'Great Article',
          description: 'This is a great article',
          submittedUrl: 'https://example.com/article'
        }
      });

      expect(result).toEqual(mockResponse);
    });

    it('should create simple post using legacy method', async () => {
      const mockProfile = { id: 'urn:li:person:123' };
      const mockPostResponse = { id: 'post-123' };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: jest.fn().mockReturnValue(null) },
          json: async () => mockProfile
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          headers: { get: jest.fn().mockReturnValue(null) },
          json: async () => mockPostResponse
        });

      const result = await legacyClient.createPost('Hello LinkedIn!', 'PUBLIC');

      expect(result).toEqual(mockPostResponse);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Legacy Organizations', () => {
    it('should get organizations in legacy format', async () => {
      const mockResponse = {
        elements: [
          { id: 'org-1', name: { localized: { 'en_US': 'Company 1' } } },
          { id: 'org-2', name: { localized: { 'en_US': 'Company 2' } } }
        ],
        paging: { pageSize: 20, total: 2 }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: jest.fn().mockReturnValue(null) },
        json: async () => mockResponse
      });

      const result = await legacyClient.getOrganizations();

      expect(result).toHaveProperty('elements');
      expect(result).toHaveProperty('values'); // Legacy field
      expect(result.values).toEqual(result.elements);
      expect(result).toHaveProperty('_total');
      expect(result).toHaveProperty('paging');
    });
  });

  describe('Legacy Analytics', () => {
    it('should get company page statistics', async () => {
      const mockAnalytics = {
        elements: [{
          impressionCount: 1000,
          clickCount: 50,
          likeCount: 25
        }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: jest.fn().mockReturnValue(null) },
        json: async () => mockAnalytics
      });

      const result = await legacyClient.getCompanyPageStatistics('12345', {
        start: '2024-01-01',
        end: '2024-01-31'
      });

      expect(result).toHaveProperty('impressions', 1000);
      expect(result).toHaveProperty('clicks', 50);
      expect(result).toHaveProperty('likes', 25);
    });

    it('should get post statistics', async () => {
      const mockAnalytics = {
        elements: [{
          impressionCount: 500,
          clickCount: 25,
          shareCount: 5
        }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: jest.fn().mockReturnValue(null) },
        json: async () => mockAnalytics
      });

      const result = await legacyClient.getPostStatistics('share-123');

      expect(result).toHaveProperty('impressions', 500);
      expect(result).toHaveProperty('clicks', 25);
      expect(result).toHaveProperty('shares', 5);
    });
  });

  describe('Legacy Pagination', () => {
    it('should handle legacy pagination parameters', async () => {
      const mockResponse = {
        elements: [{ id: '1' }, { id: '2' }],
        paging: { pageSize: 2, start: 0, total: 10 }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: jest.fn().mockReturnValue(null) },
        json: async () => mockResponse
      });

      const result = await legacyClient.getPaginatedResults('/test-endpoint', {
        count: 2,
        start: 0,
        q: 'search-term'
      });

      expect(result).toHaveProperty('values');
      expect(result).toHaveProperty('_count', 2);
      expect(result).toHaveProperty('_start', 0);
      expect(result).toHaveProperty('_total', 10);
    });
  });

  describe('Legacy Search Methods', () => {
    it('should search people with legacy interface', async () => {
      const mockSearchResults = {
        elements: [
          { id: 'person-1', firstName: { localized: { 'en_US': 'Jane' } } }
        ],
        paging: { pageSize: 10 }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: jest.fn().mockReturnValue(null) },
        json: async () => mockSearchResults
      });

      const result = await legacyClient.searchPeople('software engineer', { count: 10 });

      expect(result).toHaveProperty('elements');
      expect(result).toHaveProperty('values');
      expect(result.elements).toHaveLength(1);
    });

    it('should search companies with legacy interface', async () => {
      const mockSearchResults = {
        elements: [
          { id: 'company-1', name: { localized: { 'en_US': 'Tech Corp' } } }
        ],
        paging: { pageSize: 10 }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: jest.fn().mockReturnValue(null) },
        json: async () => mockSearchResults
      });

      const result = await legacyClient.searchCompanies('technology', { count: 10 });

      expect(result).toHaveProperty('elements');
      expect(result).toHaveProperty('values');
      expect(result.elements).toHaveLength(1);
    });
  });

  describe('Legacy Utility Methods', () => {
    it('should check token validity', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: jest.fn().mockReturnValue(null) },
        json: async () => ({ id: 'test-user' })
      });

      const isValid = await legacyClient.isTokenValid();
      expect(isValid).toBe(true);
    });

    it('should provide access to modern client for migration', () => {
      const modernClient = legacyClient.getModernClient();
      expect(modernClient).toBeDefined();
    });

    it('should provide access to modern endpoints for migration', () => {
      const modernEndpoints = legacyClient.getModernEndpoints();
      expect(modernEndpoints).toBeDefined();
    });
  });

  describe('Migration Helpers', () => {
    it('should upgrade to newer API version', () => {
      expect(() => {
        legacyClient.upgradeToVersion(LinkedInAPIVersion.V202411);
      }).not.toThrow();
    });

    it('should get available features', () => {
      const features = legacyClient.getAvailableFeatures();
      expect(features).toBeDefined();
      expect(features).toHaveProperty('cursorPagination');
    });

    it('should provide migration guide', () => {
      const guide = legacyClient.getMigrationGuide(LinkedInAPIVersion.V202411);
      expect(Array.isArray(guide)).toBe(true);
    });
  });

  describe('Legacy Constants', () => {
    it('should export legacy LinkedIn scopes', () => {
      expect(LINKEDIN_SCOPES).toBeDefined();
      expect(LINKEDIN_SCOPES).toHaveProperty('BASIC_PROFILE');
      expect(LINKEDIN_SCOPES).toHaveProperty('EMAIL_ADDRESS');
      expect(LINKEDIN_SCOPES).toHaveProperty('COMPANY_ADMIN');
    });

    it('should export legacy error class', () => {
      const error = new LinkedInError('Test error', 404, 'NOT_FOUND');
      expect(error).toBeInstanceOf(Error);
      expect(error.status).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });
  });

  describe('Response Format Conversion', () => {
    it('should convert modern paginated response to legacy format', async () => {
      const modernResponse = {
        elements: [{ id: 'item-1' }, { id: 'item-2' }],
        paging: {
          pageSize: 20,
          count: 2,
          start: 0,
          total: 50,
          links: { next: '/next-page' }
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: jest.fn().mockReturnValue(null) },
        json: async () => modernResponse
      });

      const result = await legacyClient.getPaginatedResults('/test');

      // Check both modern and legacy fields are present
      expect(result).toHaveProperty('elements');
      expect(result).toHaveProperty('values');
      expect(result.elements).toEqual(result.values);
      
      // Check legacy pagination fields
      expect(result).toHaveProperty('_total', 50);
      expect(result).toHaveProperty('_count', 2);
      expect(result).toHaveProperty('_start', 0);
      
      // Check legacy paging object
      expect(result).toHaveProperty('paging');
      expect(result.paging).toHaveProperty('count', 2);
      expect(result.paging).toHaveProperty('start', 0);
      expect(result.paging).toHaveProperty('links', { next: '/next-page' });
    });
  });
});