/**
 * Unit tests for cursor-based pagination functionality
 * Tests the enhanced pagination features in LinkedInAPIClient
 */

import { LinkedInAPIClient, LinkedInAPIConfig, LinkedInAPIVersion } from '../../../src/api/linkedin-api-v2024';
import { PKCEOAuthManager, TokenResponse } from '../../../src/auth/pkce-oauth-manager';
import * as fs from 'fs-extra';

// Mock dependencies
jest.mock('../../../src/auth/pkce-oauth-manager');
jest.mock('fs-extra');

// Mock fetch
global.fetch = jest.fn();

describe('Cursor-based Pagination', () => {
  let client: LinkedInAPIClient;
  let config: LinkedInAPIConfig;

  beforeEach(() => {
    config = {
      clientId: 'test-client-id',
      redirectUri: 'http://localhost:3000/callback',
      scopes: ['openid', 'profile', 'email'],
      apiVersion: LinkedInAPIVersion.V202411
    };

    // Mock PKCEOAuthManager
    (PKCEOAuthManager as jest.Mock).mockImplementation(() => ({}));

    // Mock fs operations
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.readJsonSync as jest.Mock).mockReturnValue({});
    (fs.ensureDirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeJsonSync as jest.Mock).mockReturnValue(undefined);

    client = new LinkedInAPIClient(config);

    // Set up authentication
    const mockToken: TokenResponse = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
      created_at: Math.floor(Date.now() / 1000)
    };
    client.setToken(mockToken);

    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Cursor Pagination Support', () => {
    it('should use cursor-based pagination when available and requested', async () => {
      const mockResponse = {
        elements: [{ id: '1' }, { id: '2' }],
        paging: {
          pageSize: 50,
          cursor: 'cursor-123',
          nextCursor: 'next-cursor-456',
          links: {
            next: '/endpoint?cursor=next-cursor-456&pageSize=50'
          }
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue(null)
        },
        json: async () => mockResponse
      });

      const result = await client.getCursorPaginated('/posts', {
        cursor: 'cursor-123',
        pageSize: 50
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('cursor=cursor-123'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('pageSize=50'),
        expect.any(Object)
      );

      expect(result.elements).toHaveLength(2);
      expect(result.paging.nextCursor).toBe('next-cursor-456');
    });

    it('should throw error when cursor pagination is not supported', async () => {
      // Mock versionManager.hasFeature to return false for cursor pagination
      const mockHasFeature = jest.spyOn(client['versionManager'], 'hasFeature')
        .mockReturnValue(false);

      await expect(
        client.getCursorPaginated('/posts', { cursor: 'test' })
      ).rejects.toThrow('Cursor-based pagination is not supported in API version 202411');
      
      expect(mockHasFeature).toHaveBeenCalledWith('cursorPagination');
    });

    it('should extract cursor from response links', async () => {
      const mockResponse = {
        elements: [{ id: '1' }, { id: '2' }],
        paging: {
          pageSize: 50,
          links: {
            next: 'https://api.linkedin.com/rest/posts?cursor=extracted-cursor-789&pageSize=50'
          }
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue(null)
        },
        json: async () => mockResponse
      });

      const result = await client.getPaginated('/posts', {
        cursor: 'initial-cursor',
        pageSize: 50
      });

      expect(result.paging.nextCursor).toBe('extracted-cursor-789');
    });
  });

  describe('Legacy Pagination Fallback', () => {
    it('should fall back to pageToken when cursor is not provided', async () => {
      const mockResponse = {
        elements: [{ id: '1' }, { id: '2' }],
        paging: {
          pageSize: 20,
          pageToken: 'token-123',
          nextPageToken: 'next-token-456'
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue(null)
        },
        json: async () => mockResponse
      });

      const result = await client.getPaginated('/posts', {
        pageToken: 'token-123',
        pageSize: 20
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('pageToken=token-123'),
        expect.any(Object)
      );
      expect(result.paging.nextPageToken).toBe('next-token-456');
    });

    it('should use legacy count/start parameters when no cursor or pageToken', async () => {
      const mockResponse = {
        values: [{ id: '1' }, { id: '2' }],
        count: 2,
        start: 0,
        total: 10
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue(null)
        },
        json: async () => mockResponse
      });

      const result = await client.getPaginated('/legacy-endpoint', {
        count: 2,
        start: 0
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('count=2'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('start=0'),
        expect.any(Object)
      );

      expect(result.elements).toHaveLength(2);
      expect(result.paging.start).toBe(0);
      expect(result.paging.total).toBe(10);
    });
  });

  describe('Response Format Handling', () => {
    it('should handle cursor-based response format', async () => {
      const mockResponse = {
        data: [{ id: '1' }, { id: '2' }],
        cursors: {
          before: 'cursor-before',
          after: 'cursor-after'
        },
        summary: {
          total_count: 100
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue(null)
        },
        json: async () => mockResponse
      });

      const result = await client.getPaginated('/cursor-endpoint', {
        cursor: 'test-cursor'
      });

      expect(result.elements).toEqual([{ id: '1' }, { id: '2' }]);
      expect(result.paging.cursor).toBe('cursor-before');
      expect(result.paging.nextCursor).toBe('cursor-after');
      expect(result.paging.total).toBe(100);
    });

    it('should handle legacy values format with pagination calculation', async () => {
      const mockResponse = {
        values: [{ id: '1' }, { id: '2' }, { id: '3' }],
        count: 3,
        start: 0,
        total: 10
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue(null)
        },
        json: async () => mockResponse
      });

      const result = await client.getPaginated('/legacy-values');

      expect(result.elements).toHaveLength(3);
      expect(result.paging.start).toBe(0);
      expect(result.paging.total).toBe(10);
      expect(result.paging.pageToken).toBe('0');
      expect(result.paging.nextPageToken).toBe('3'); // start + count
    });
  });

  describe('getAllPages with Different Pagination Types', () => {
    it('should iterate through all pages using cursor pagination', async () => {
      const page1 = {
        elements: [{ id: '1' }, { id: '2' }],
        paging: { pageSize: 2, nextCursor: 'cursor-page-2' }
      };

      const page2 = {
        elements: [{ id: '3' }, { id: '4' }],
        paging: { pageSize: 2, nextCursor: 'cursor-page-3' }
      };

      const page3 = {
        elements: [{ id: '5' }],
        paging: { pageSize: 1 }
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: {
          get: jest.fn().mockReturnValue(null)
        },
          json: async () => page1
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: {
          get: jest.fn().mockReturnValue(null)
        },
          json: async () => page2
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: {
          get: jest.fn().mockReturnValue(null)
        },
          json: async () => page3
        });

      const allItems: any[] = [];
      for await (const page of client.getAllPages('/posts', { cursor: 'initial' })) {
        allItems.push(...page);
      }

      expect(allItems).toHaveLength(5);
      expect(allItems.map(item => item.id)).toEqual(['1', '2', '3', '4', '5']);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should iterate through all pages using legacy start/total pagination', async () => {
      const page1 = {
        values: [{ id: '1' }, { id: '2' }],
        count: 2,
        start: 0,
        total: 5
      };

      const page2 = {
        values: [{ id: '3' }, { id: '4' }],
        count: 2,
        start: 2,
        total: 5
      };

      const page3 = {
        values: [{ id: '5' }],
        count: 1,
        start: 4,
        total: 5
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: {
          get: jest.fn().mockReturnValue(null)
        },
          json: async () => page1
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: {
          get: jest.fn().mockReturnValue(null)
        },
          json: async () => page2
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: {
          get: jest.fn().mockReturnValue(null)
        },
          json: async () => page3
        });

      const allItems: any[] = [];
      for await (const page of client.getAllPages('/legacy', { start: 0, count: 2 })) {
        allItems.push(...page);
      }

      expect(allItems).toHaveLength(5);
      expect(global.fetch).toHaveBeenCalledTimes(3);

      // Check that start parameter was incremented correctly
      expect(global.fetch).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('start=2'), expect.any(Object));
      expect(global.fetch).toHaveBeenNthCalledWith(3, 
        expect.stringContaining('start=4'), expect.any(Object));
    });

    it('should stop iteration when no more elements', async () => {
      const page1 = {
        elements: [{ id: '1' }, { id: '2' }],
        paging: { pageSize: 2, nextCursor: 'cursor-page-2' }
      };

      const page2 = {
        elements: [],
        paging: { pageSize: 0 }
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: {
          get: jest.fn().mockReturnValue(null)
        },
          json: async () => page1
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: {
          get: jest.fn().mockReturnValue(null)
        },
          json: async () => page2
        });

      const allItems: any[] = [];
      for await (const page of client.getAllPages('/posts', { cursor: 'initial' })) {
        allItems.push(...page);
      }

      expect(allItems).toHaveLength(2);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getAllCursorPages', () => {
    it('should iterate through all pages using cursor-only pagination', async () => {
      const page1 = {
        elements: [{ id: '1' }, { id: '2' }],
        paging: { pageSize: 2, nextCursor: 'cursor-2' }
      };

      const page2 = {
        elements: [{ id: '3' }],
        paging: { pageSize: 1 }
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: {
          get: jest.fn().mockReturnValue(null)
        },
          json: async () => page1
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: {
          get: jest.fn().mockReturnValue(null)
        },
          json: async () => page2
        });

      const allItems: any[] = [];
      for await (const page of client.getAllCursorPages('/posts', { pageSize: 50 })) {
        allItems.push(...page);
      }

      expect(allItems).toHaveLength(3);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error when cursor pagination is not supported', async () => {
      // Mock versionManager.hasFeature to return false for cursor pagination
      const mockHasFeature = jest.spyOn(client['versionManager'], 'hasFeature')
        .mockReturnValue(false);

      const generator = client.getAllCursorPages('/posts');
      
      await expect(generator.next()).rejects.toThrow(
        'Cursor-based pagination is not supported in API version 202411'
      );
      
      expect(mockHasFeature).toHaveBeenCalledWith('cursorPagination');
    });
  });

  describe('getOperationPaginated', () => {
    it('should get paginated results for a specific operation', async () => {
      const mockResponse = {
        elements: [{ id: 'org-1' }, { id: 'org-2' }],
        paging: {
          pageSize: 20,
          nextPageToken: 'token-123'
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue(null)
        },
        json: async () => mockResponse
      });

      const result = await client.getOperationPaginated('getOrganizations', {
        pageSize: 20
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/organizationAcls'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result.elements).toHaveLength(2);
      expect(result.paging.nextPageToken).toBe('token-123');
    });

    it('should throw error for unknown operations', async () => {
      await expect(
        client.getOperationPaginated('unknownOperation')
      ).rejects.toThrow('Unknown operation: unknownOperation');
    });
  });

  describe('Sorting Parameters', () => {
    it('should include sorting parameters in cursor pagination', async () => {
      const mockResponse = {
        elements: [{ id: '1' }],
        paging: { pageSize: 1 }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue(null)
        },
        json: async () => mockResponse
      });

      await client.getCursorPaginated('/posts', {
        pageSize: 10,
        sort: 'desc',
        sortBy: 'createdAt'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sort=desc'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sortBy=createdAt'),
        expect.any(Object)
      );
    });
  });
});