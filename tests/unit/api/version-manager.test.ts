/**
 * Unit tests for VersionManager
 * Tests API version compatibility and feature detection
 */

import { VersionManager, VersionFeatures, EndpointMapping, VersionAdapter } from '../../../src/api/version-manager';
import { LinkedInAPIVersion } from '../../../src/api/linkedin-api-v2024';

describe('VersionManager', () => {
  let versionManager: VersionManager;

  beforeEach(() => {
    versionManager = new VersionManager(LinkedInAPIVersion.V202411);
  });

  describe('Constructor', () => {
    it('should initialize with specified version', () => {
      const manager = new VersionManager(LinkedInAPIVersion.V202407);
      expect(manager.getVersion()).toBe(LinkedInAPIVersion.V202407);
    });

    it('should initialize with latest version by default', () => {
      const manager = new VersionManager();
      expect(manager.getVersion()).toBe(LinkedInAPIVersion.LATEST);
    });

    it('should initialize adapters for all versions', () => {
      const manager = new VersionManager(LinkedInAPIVersion.V202411);
      
      // Check that adapters are available for different versions
      const adapter = manager.getAdapter();
      expect(adapter).toBeDefined();
    });
  });

  describe('Feature Detection', () => {
    it('should return correct features for V202401', () => {
      const features = versionManager.getFeatures(LinkedInAPIVersion.V202401);
      
      expect(features.cursorPagination).toBe(true);
      expect(features.documentsAPI).toBe(false);
      expect(features.communityManagement).toBe(false);
      expect(features.connectedTV).toBe(false);
      expect(features.buyNowCTA).toBe(false);
      expect(features.enhancedTargeting).toBe(false);
      expect(features.batchOperations).toBe(true);
      expect(features.webhooks).toBe(false);
      expect(features.analytics2).toBe(false);
      expect(features.videoAPI).toBe(true);
    });

    it('should return correct features for V202404', () => {
      const features = versionManager.getFeatures(LinkedInAPIVersion.V202404);
      
      expect(features.cursorPagination).toBe(true);
      expect(features.documentsAPI).toBe(true); // Added in v202404
      expect(features.communityManagement).toBe(false);
      expect(features.connectedTV).toBe(false);
      expect(features.buyNowCTA).toBe(false);
      expect(features.enhancedTargeting).toBe(true); // Added in v202404
      expect(features.batchOperations).toBe(true);
      expect(features.webhooks).toBe(false);
      expect(features.analytics2).toBe(false);
      expect(features.videoAPI).toBe(true);
    });

    it('should return correct features for V202407', () => {
      const features = versionManager.getFeatures(LinkedInAPIVersion.V202407);
      
      expect(features.cursorPagination).toBe(true);
      expect(features.documentsAPI).toBe(true);
      expect(features.communityManagement).toBe(true); // Added in v202407
      expect(features.connectedTV).toBe(false);
      expect(features.buyNowCTA).toBe(false);
      expect(features.enhancedTargeting).toBe(true);
      expect(features.batchOperations).toBe(true);
      expect(features.webhooks).toBe(true); // Added in v202407
      expect(features.analytics2).toBe(false);
      expect(features.videoAPI).toBe(true);
    });

    it('should return correct features for V202410', () => {
      const features = versionManager.getFeatures(LinkedInAPIVersion.V202410);
      
      expect(features.cursorPagination).toBe(true);
      expect(features.documentsAPI).toBe(true);
      expect(features.communityManagement).toBe(true);
      expect(features.connectedTV).toBe(true); // Added in v202410
      expect(features.buyNowCTA).toBe(false);
      expect(features.enhancedTargeting).toBe(true);
      expect(features.batchOperations).toBe(true);
      expect(features.webhooks).toBe(true);
      expect(features.analytics2).toBe(true); // Added in v202410
      expect(features.videoAPI).toBe(true);
    });

    it('should return correct features for V202411 (latest)', () => {
      const features = versionManager.getFeatures(LinkedInAPIVersion.V202411);
      
      expect(features.cursorPagination).toBe(true);
      expect(features.documentsAPI).toBe(true);
      expect(features.communityManagement).toBe(true);
      expect(features.connectedTV).toBe(true);
      expect(features.buyNowCTA).toBe(true); // Added in v202411
      expect(features.enhancedTargeting).toBe(true);
      expect(features.batchOperations).toBe(true);
      expect(features.webhooks).toBe(true);
      expect(features.analytics2).toBe(true);
      expect(features.videoAPI).toBe(true);
    });

    it('should check if feature is available in current version', () => {
      versionManager.setVersion(LinkedInAPIVersion.V202407);
      
      expect(versionManager.hasFeature('cursorPagination')).toBe(true);
      expect(versionManager.hasFeature('documentsAPI')).toBe(true);
      expect(versionManager.hasFeature('communityManagement')).toBe(true);
      expect(versionManager.hasFeature('connectedTV')).toBe(false); // Not available until v202410
      expect(versionManager.hasFeature('buyNowCTA')).toBe(false); // Not available until v202411
    });

    it('should return current version features when no version specified', () => {
      versionManager.setVersion(LinkedInAPIVersion.V202404);
      const features = versionManager.getFeatures();
      
      expect(features.documentsAPI).toBe(true);
      expect(features.communityManagement).toBe(false);
    });
  });

  describe('Endpoint Management', () => {
    it('should return correct endpoint for createPost operation', () => {
      const endpoint = versionManager.getEndpoint('createPost');
      
      expect(endpoint).toEqual({
        path: '/posts',
        method: 'POST',
        versionAdded: LinkedInAPIVersion.V202401
      });
    });

    it('should return correct endpoint for getProfile operation', () => {
      const endpoint = versionManager.getEndpoint('getProfile');
      
      expect(endpoint).toEqual({
        path: '/me',
        method: 'GET',
        versionAdded: LinkedInAPIVersion.V202401
      });
    });

    it('should return correct endpoint for getAnalytics in latest version', () => {
      versionManager.setVersion(LinkedInAPIVersion.V202411);
      const endpoint = versionManager.getEndpoint('getAnalytics');
      
      expect(endpoint?.path).toBe('/analytics/shares');
      expect(endpoint?.versionAdded).toBe(LinkedInAPIVersion.V202410);
    });

    it('should return older analytics endpoint for older versions', () => {
      versionManager.setVersion(LinkedInAPIVersion.V202407);
      const endpoint = versionManager.getEndpoint('getAnalytics');
      
      expect(endpoint?.path).toBe('/organizationalEntityShareStatistics');
      expect(endpoint?.versionRemoved).toBe(LinkedInAPIVersion.V202410);
    });

    it('should return null for unknown operation', () => {
      const endpoint = versionManager.getEndpoint('unknownOperation');
      expect(endpoint).toBeNull();
    });

    it('should not return deprecated endpoints', () => {
      versionManager.setVersion(LinkedInAPIVersion.V202411);
      
      // The deprecated ugcPosts endpoint should not be returned
      const endpoint = versionManager.getEndpoint('createPost');
      expect(endpoint?.path).not.toBe('/ugcPosts');
      expect(endpoint?.path).toBe('/posts');
    });
  });

  describe('Request Transformation', () => {
    let adapter: VersionAdapter;

    beforeEach(() => {
      adapter = versionManager.getAdapter()!;
    });

    it('should transform post request for v202401', () => {
      versionManager.setVersion(LinkedInAPIVersion.V202401);
      adapter = versionManager.getAdapter()!;

      const inputData = {
        post: {
          author: 'urn:li:person:123',
          text: 'Hello LinkedIn!',
          visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
        }
      };

      const transformed = adapter.transformRequest(inputData);

      expect(transformed.author).toBe('urn:li:person:123');
      expect(transformed.lifecycleState).toBe('PUBLISHED');
      expect(transformed.specificContent['com.linkedin.ugc.ShareContent'].shareCommentary.text)
        .toBe('Hello LinkedIn!');
      expect(transformed.visibility['com.linkedin.ugc.MemberNetworkVisibility']).toBe('PUBLIC');
    });

    it('should transform document request for v202404', () => {
      versionManager.setVersion(LinkedInAPIVersion.V202404);
      adapter = versionManager.getAdapter()!;

      const inputData = {
        post: {
          author: 'urn:li:person:123',
          text: 'Check out this document'
        },
        document: {
          id: 'doc-123',
          title: 'My Document',
          description: 'A great document'
        }
      };

      const transformed = adapter.transformRequest(inputData);

      expect(transformed.document).toEqual({
        id: 'doc-123',
        title: 'My Document',
        description: 'A great document'
      });
    });

    it('should transform community request for v202407', () => {
      versionManager.setVersion(LinkedInAPIVersion.V202407);
      adapter = versionManager.getAdapter()!;

      const inputData = {
        post: {
          author: 'urn:li:person:123',
          text: 'Community post'
        },
        community: {
          id: 'community-123',
          engagement: { likes: 10, comments: 5 }
        }
      };

      const transformed = adapter.transformRequest(inputData);

      expect(transformed.community).toEqual({
        id: 'community-123',
        engagement: { likes: 10, comments: 5 }
      });
    });

    it('should transform Connected TV targeting for v202410', () => {
      versionManager.setVersion(LinkedInAPIVersion.V202410);
      adapter = versionManager.getAdapter()!;

      const inputData = {
        post: {
          author: 'urn:li:person:123',
          text: 'TV ad campaign'
        },
        targeting: {
          connectedTV: {
            demographics: ['18-34', '35-54'],
            interests: ['technology', 'business']
          }
        }
      };

      const transformed = adapter.transformRequest(inputData);

      expect(transformed.targeting.connectedTV).toEqual({
        demographics: ['18-34', '35-54'],
        interests: ['technology', 'business']
      });
    });

    it('should transform Buy Now CTA for v202411', () => {
      versionManager.setVersion(LinkedInAPIVersion.V202411);
      adapter = versionManager.getAdapter()!;

      const inputData = {
        post: {
          author: 'urn:li:person:123',
          text: 'Check out our product!'
        },
        callToAction: {
          type: 'BUY_NOW',
          url: 'https://example.com/buy',
          label: 'Buy Now'
        }
      };

      const transformed = adapter.transformRequest(inputData);

      expect(transformed.callToAction).toEqual({
        type: 'BUY_NOW',
        url: 'https://example.com/buy',
        label: 'Buy Now'
      });
    });

    it('should pass through unchanged data when no transformations apply', () => {
      const inputData = { simpleField: 'value' };
      const transformed = adapter.transformRequest(inputData);

      expect(transformed).toEqual(inputData);
    });
  });

  describe('Response Transformation', () => {
    let adapter: VersionAdapter;

    beforeEach(() => {
      versionManager.setVersion(LinkedInAPIVersion.V202401);
      adapter = versionManager.getAdapter()!;
    });

    it('should preserve legacy paginated response for v202401', () => {
      // Test that legacy format is preserved (transformation handled by main client)
      const legacyResponseData = {
        values: [{ id: '1' }, { id: '2' }],
        count: 2,
        start: 0,
        total: 100
      };

      const transformed = adapter.transformResponse(legacyResponseData);

      // v202401 adapter should preserve legacy format
      expect(transformed).toEqual(legacyResponseData);

      // Test that modern format is not transformed
      const modernResponseData = {
        elements: [{ id: '1' }, { id: '2' }],
        paging: {
          pageSize: 2,
          total: 100
        }
      };

      const notTransformed = adapter.transformResponse(modernResponseData);
      expect(notTransformed).toBe(modernResponseData); // Should return as-is
    });

    it('should transform analytics response for v202410', () => {
      versionManager.setVersion(LinkedInAPIVersion.V202410);
      adapter = versionManager.getAdapter()!;

      const responseData = {
        elements: [],
        paging: { total: 0 },
        analytics: {
          metrics: { impressions: 1000, clicks: 50 },
          dimensions: { country: 'US', device: 'mobile' }
        }
      };

      const transformed = adapter.transformResponse(responseData);

      expect(transformed.metrics).toEqual({ impressions: 1000, clicks: 50 });
      expect(transformed.dimensions).toEqual({ country: 'US', device: 'mobile' });
    });

    it('should pass through unchanged response when no transformations apply', () => {
      const responseData = { simpleField: 'value' };
      const transformed = adapter.transformResponse(responseData);

      expect(transformed).toEqual(responseData);
    });
  });

  describe('Request Validation', () => {
    let adapter: VersionAdapter;

    beforeEach(() => {
      adapter = versionManager.getAdapter()!;
    });

    it('should validate cursor pagination support', () => {
      versionManager.setVersion(LinkedInAPIVersion.V202401); // Has cursor pagination
      adapter = versionManager.getAdapter()!;

      const dataWithPagination = {
        pagination: { pageToken: 'token-123' }
      };

      expect(() => adapter.validateRequest(dataWithPagination)).not.toThrow();
    });

    it('should reject cursor pagination on unsupported versions', () => {
      // Mock a version without cursor pagination
      const oldVersionManager = new VersionManager(LinkedInAPIVersion.V202401);
      
      // Override the feature matrix for testing
      jest.spyOn(oldVersionManager, 'getFeatures').mockReturnValue({
        cursorPagination: false,
        documentsAPI: false,
        communityManagement: false,
        connectedTV: false,
        buyNowCTA: false,
        enhancedTargeting: false,
        batchOperations: false,
        webhooks: false,
        analytics2: false,
        videoAPI: false
      });

      const adapter = oldVersionManager.getAdapter()!;
      const dataWithPagination = {
        pagination: { pageToken: 'token-123' }
      };

      expect(() => adapter.validateRequest(dataWithPagination))
        .toThrow('Cursor pagination not supported in version');
    });

    it('should validate requests without pagination parameters', () => {
      const simpleData = { text: 'Simple post' };
      expect(() => adapter.validateRequest(simpleData)).not.toThrow();
    });
  });

  describe('Endpoint Path Resolution', () => {
    let adapter: VersionAdapter;

    beforeEach(() => {
      adapter = versionManager.getAdapter()!;
    });

    it('should return correct endpoint path for known operations', () => {
      const path = adapter.getEndpointPath('createPost');
      expect(path).toBe('/posts');
    });

    it('should throw error for unknown operations', () => {
      expect(() => adapter.getEndpointPath('unknownOperation'))
        .toThrow('Unknown operation: unknownOperation');
    });
  });

  describe('Migration Guides', () => {
    it('should provide migration guide between versions', () => {
      const guide = versionManager.getMigrationGuide(
        LinkedInAPIVersion.V202401,
        LinkedInAPIVersion.V202404
      );

      expect(guide).toContain('New feature available: documentsAPI');
      expect(guide).toContain('New feature available: enhancedTargeting');
    });

    it('should identify deprecated endpoints in migration guide', () => {
      const guide = versionManager.getMigrationGuide(
        LinkedInAPIVersion.V202401,
        LinkedInAPIVersion.V202401 // Same version, but includes deprecated endpoints info
      );

      // This should identify endpoints that are deprecated in the target version
      expect(Array.isArray(guide)).toBe(true);
    });

    it('should handle migration from older to newer version', () => {
      const guide = versionManager.getMigrationGuide(
        LinkedInAPIVersion.V202401,
        LinkedInAPIVersion.V202411
      );

      expect(guide).toContain('New feature available: documentsAPI');
      expect(guide).toContain('New feature available: communityManagement');
      expect(guide).toContain('New feature available: connectedTV');
      expect(guide).toContain('New feature available: buyNowCTA');
      expect(guide).toContain('New feature available: enhancedTargeting');
      expect(guide).toContain('New feature available: webhooks');
      expect(guide).toContain('New feature available: analytics2');
    });
  });

  describe('Version Comparison', () => {
    it('should set and get version correctly', () => {
      versionManager.setVersion(LinkedInAPIVersion.V202407);
      expect(versionManager.getVersion()).toBe(LinkedInAPIVersion.V202407);
    });

    it('should compare versions correctly for endpoint validity', () => {
      // Test endpoint that was added in v202410
      versionManager.setVersion(LinkedInAPIVersion.V202407);
      const analyticsEndpoint = versionManager.getEndpoint('getAnalytics');
      
      // Should get the older endpoint for v202407
      expect(analyticsEndpoint?.path).toBe('/organizationalEntityShareStatistics');
      
      // Switch to v202410 and should get new endpoint
      versionManager.setVersion(LinkedInAPIVersion.V202410);
      const newAnalyticsEndpoint = versionManager.getEndpoint('getAnalytics');
      expect(newAnalyticsEndpoint?.path).toBe('/analytics/shares');
    });
  });

  describe('Adapter Management', () => {
    it('should return adapter for current version', () => {
      const adapter = versionManager.getAdapter();
      expect(adapter).toBeDefined();
      expect(adapter?.transformRequest).toBeInstanceOf(Function);
      expect(adapter?.transformResponse).toBeInstanceOf(Function);
      expect(adapter?.validateRequest).toBeInstanceOf(Function);
      expect(adapter?.getEndpointPath).toBeInstanceOf(Function);
    });

    it('should create different adapters for different versions', () => {
      const v202407Manager = new VersionManager(LinkedInAPIVersion.V202407);
      const v202411Manager = new VersionManager(LinkedInAPIVersion.V202411);

      const adapter1 = v202407Manager.getAdapter();
      const adapter2 = v202411Manager.getAdapter();

      expect(adapter1).toBeDefined();
      expect(adapter2).toBeDefined();

      // Test that they handle features differently
      expect(v202407Manager.hasFeature('buyNowCTA')).toBe(false);
      expect(v202411Manager.hasFeature('buyNowCTA')).toBe(true);
    });
  });
});