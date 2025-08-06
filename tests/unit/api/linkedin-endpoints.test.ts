/**
 * Unit tests for LinkedInEndpoints
 * Tests high-level LinkedIn API endpoint implementations
 */

import { LinkedInEndpoints, LinkedInPost, LinkedInProfile, LinkedInAnalytics } from '../../../src/api/linkedin-endpoints';
import { LinkedInAPIClient, LinkedInAPIVersion } from '../../../src/api/linkedin-api-v2024';

// Mock the LinkedInAPIClient
jest.mock('../../../src/api/linkedin-api-v2024');

describe('LinkedInEndpoints', () => {
  let endpoints: LinkedInEndpoints;
  let mockClient: jest.Mocked<LinkedInAPIClient>;

  beforeEach(() => {
    // Create mock client
    mockClient = new LinkedInAPIClient({
      clientId: 'test',
      redirectUri: 'test',
      scopes: ['test']
    }) as jest.Mocked<LinkedInAPIClient>;

    // Mock client methods
    mockClient.requestOperation = jest.fn();
    mockClient.getPaginated = jest.fn();
    mockClient.hasFeature = jest.fn();
    mockClient.getApiVersion = jest.fn().mockReturnValue(LinkedInAPIVersion.V202411);
    mockClient.getAvailableFeatures = jest.fn();
    mockClient.getMigrationGuide = jest.fn();

    endpoints = new LinkedInEndpoints(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Profile Operations', () => {
    it('should get user profile', async () => {
      const mockProfile: LinkedInProfile = {
        id: 'test-user-123',
        firstName: {
          localized: { 'en_US': 'John' },
          preferredLocale: { country: 'US', language: 'en' }
        },
        lastName: {
          localized: { 'en_US': 'Doe' },
          preferredLocale: { country: 'US', language: 'en' }
        },
        headline: {
          localized: { 'en_US': 'Software Engineer' },
          preferredLocale: { country: 'US', language: 'en' }
        }
      };

      mockClient.requestOperation.mockResolvedValueOnce(mockProfile);

      const result = await endpoints.getProfile();

      expect(mockClient.requestOperation).toHaveBeenCalledWith('getProfile', {});
      expect(result).toEqual(mockProfile);
    });

    it('should get organizations', async () => {
      const mockOrganizations = {
        elements: [{
          id: 'org-123',
          name: {
            localized: { 'en_US': 'Test Company' },
            preferredLocale: { country: 'US', language: 'en' }
          }
        }],
        paging: { pageSize: 20 }
      };

      mockClient.requestOperation.mockResolvedValueOnce(mockOrganizations);

      const result = await endpoints.getOrganizations();

      expect(mockClient.requestOperation).toHaveBeenCalledWith('getOrganizations', {});
      expect(result).toEqual(mockOrganizations);
    });
  });

  describe('Post Operations', () => {
    it('should create a simple post', async () => {
      const postData: Omit<LinkedInPost, 'id' | 'createdAt' | 'lastModified'> = {
        author: 'urn:li:person:123',
        text: 'Hello LinkedIn!',
        visibility: 'PUBLIC'
      };

      const mockResponse: LinkedInPost = {
        ...postData,
        id: 'post-123',
        createdAt: '2024-01-01T00:00:00Z'
      };

      mockClient.hasFeature.mockReturnValue(true);
      mockClient.requestOperation.mockResolvedValueOnce(mockResponse);

      const result = await endpoints.createPost(postData);

      expect(mockClient.requestOperation).toHaveBeenCalledWith('createPost', {
        body: expect.objectContaining({
          author: 'urn:li:person:123',
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: 'Hello LinkedIn!' },
              shareMediaCategory: 'NONE'
            }
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
          }
        })
      });
      expect(result).toEqual(mockResponse);
    });

    it('should create post with media', async () => {
      const postData: Omit<LinkedInPost, 'id' | 'createdAt' | 'lastModified'> = {
        author: 'urn:li:person:123',
        text: 'Check out this image!',
        media: [{
          type: 'IMAGE',
          url: 'https://example.com/image.jpg',
          title: 'Test Image',
          description: 'A test image'
        }]
      };

      mockClient.hasFeature.mockReturnValue(true);
      mockClient.requestOperation.mockResolvedValueOnce({ id: 'post-123' });

      await endpoints.createPost(postData);

      expect(mockClient.requestOperation).toHaveBeenCalledWith('createPost', {
        body: expect.objectContaining({
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: 'Check out this image!' },
              shareMediaCategory: 'IMAGE',
              media: [{
                status: 'READY',
                originalUrl: 'https://example.com/image.jpg',
                media: 'https://example.com/image.jpg',
                title: 'Test Image',
                description: 'A test image'
              }]
            }
          }
        })
      });
    });

    it('should create post with call-to-action when feature is available', async () => {
      const postData: Omit<LinkedInPost, 'id' | 'createdAt' | 'lastModified'> = {
        author: 'urn:li:person:123',
        text: 'Buy our product!',
        callToAction: {
          type: 'BUY_NOW',
          url: 'https://example.com/buy',
          label: 'Buy Now'
        }
      };

      mockClient.hasFeature.mockImplementation((feature) => {
        return feature === 'buyNowCTA';
      });
      mockClient.requestOperation.mockResolvedValueOnce({ id: 'post-123' });

      await endpoints.createPost(postData);

      expect(mockClient.hasFeature).toHaveBeenCalledWith('buyNowCTA');
      expect(mockClient.requestOperation).toHaveBeenCalledWith('createPost', {
        body: expect.objectContaining({
          callToAction: {
            type: 'BUY_NOW',
            url: 'https://example.com/buy',
            label: 'Buy Now'
          }
        })
      });
    });

    it('should throw error for Buy Now CTA when feature not available', async () => {
      const postData: Omit<LinkedInPost, 'id' | 'createdAt' | 'lastModified'> = {
        author: 'urn:li:person:123',
        text: 'Buy our product!',
        callToAction: {
          type: 'BUY_NOW',
          url: 'https://example.com/buy',
          label: 'Buy Now'
        }
      };

      mockClient.hasFeature.mockReturnValue(false);
      mockClient.getApiVersion.mockReturnValue(LinkedInAPIVersion.V202407);

      await expect(endpoints.createPost(postData)).rejects.toThrow(
        'Buy Now CTA is not available in API version 202407. Requires v202411 or later.'
      );

      expect(mockClient.requestOperation).not.toHaveBeenCalled();
    });

    it('should create post with targeting criteria when features are available', async () => {
      const postData: Omit<LinkedInPost, 'id' | 'createdAt' | 'lastModified'> = {
        author: 'urn:li:person:123',
        text: 'Targeted post',
        targetingCriteria: {
          geo: ['US', 'CA'],
          demographics: ['25-35'],
          connectedTV: true
        }
      };

      mockClient.hasFeature.mockImplementation((feature) => {
        return feature === 'connectedTV' || feature === 'enhancedTargeting';
      });
      mockClient.requestOperation.mockResolvedValueOnce({ id: 'post-123' });

      await endpoints.createPost(postData);

      expect(mockClient.requestOperation).toHaveBeenCalledWith('createPost', {
        body: expect.objectContaining({
          targeting: {
            geo: ['US', 'CA'],
            demographics: ['25-35'],
            connectedTV: true
          }
        })
      });
    });

    it('should throw error for Connected TV when feature not available', async () => {
      const postData: Omit<LinkedInPost, 'id' | 'createdAt' | 'lastModified'> = {
        author: 'urn:li:person:123',
        text: 'TV ad',
        targetingCriteria: {
          connectedTV: true
        }
      };

      mockClient.hasFeature.mockReturnValue(false);
      mockClient.getApiVersion.mockReturnValue(LinkedInAPIVersion.V202407);

      await expect(endpoints.createPost(postData)).rejects.toThrow(
        'Connected TV targeting is not available in API version 202407. Requires v202410 or later.'
      );
    });

    it('should get posts with pagination', async () => {
      const mockPosts = {
        elements: [
          { id: 'post-1', author: 'urn:li:person:123', text: 'Post 1' },
          { id: 'post-2', author: 'urn:li:person:123', text: 'Post 2' }
        ],
        paging: { pageSize: 20 }
      };

      mockClient.getPaginated.mockResolvedValueOnce(mockPosts);

      const result = await endpoints.getPosts({
        author: 'urn:li:person:123',
        count: 10
      });

      expect(mockClient.getPaginated).toHaveBeenCalledWith(
        '/posts',
        { pageSize: 10, pageToken: undefined },
        {
          queryParams: {
            q: 'author',
            author: 'urn:li:person:123'
          }
        }
      );
      expect(result).toEqual(mockPosts);
    });
  });

  describe('Content Operations', () => {
    it('should share content', async () => {
      const contentData = {
        author: 'urn:li:person:123',
        text: 'Check out this link',
        content: {
          title: 'Great Article',
          description: 'This is a great article',
          submittedUrl: 'https://example.com/article'
        }
      };

      mockClient.requestOperation.mockResolvedValueOnce({ id: 'share-123' });

      const result = await endpoints.shareContent(contentData);

      expect(mockClient.requestOperation).toHaveBeenCalledWith('shareContent', {
        body: contentData
      });
      expect(result).toEqual({ id: 'share-123' });
    });

    it('should upload image when feature is available', async () => {
      const imageData = {
        filename: 'test.jpg',
        data: Buffer.from('fake image data'),
        contentType: 'image/jpeg'
      };

      mockClient.hasFeature.mockImplementation((feature) => {
        return feature === 'documentsAPI';
      });
      mockClient.requestOperation.mockResolvedValueOnce({
        uploadUrl: 'https://upload.url',
        asset: 'urn:li:asset:123'
      });

      const result = await endpoints.uploadImage(imageData);

      expect(mockClient.hasFeature).toHaveBeenCalledWith('documentsAPI');
      expect(mockClient.requestOperation).toHaveBeenCalledWith('uploadImage', {
        body: {
          filename: 'test.jpg',
          fileSize: imageData.data.length,
          contentType: 'image/jpeg'
        }
      });
      expect(result).toEqual({
        uploadUrl: 'https://upload.url',
        asset: 'urn:li:asset:123'
      });
    });

    it('should throw error for image upload when feature not available', async () => {
      const imageData = {
        filename: 'test.jpg',
        data: Buffer.from('fake image data')
      };

      mockClient.hasFeature.mockReturnValue(false);
      mockClient.getApiVersion.mockReturnValue(LinkedInAPIVersion.V202401);

      await expect(endpoints.uploadImage(imageData)).rejects.toThrow(
        'Image upload is not available in API version 202401. Requires v202404 or later.'
      );
    });
  });

  describe('Analytics Operations', () => {
    it('should get analytics data', async () => {
      const mockAnalyticsResponse = {
        elements: [{
          impressionCount: 1000,
          clickCount: 50,
          likeCount: 25,
          commentCount: 5,
          shareCount: 10,
          timeRange: {
            start: '2024-01-01',
            end: '2024-01-31'
          }
        }]
      };

      mockClient.requestOperation.mockResolvedValueOnce(mockAnalyticsResponse);

      const result = await endpoints.getAnalytics({
        entity: 'urn:li:share:123',
        metrics: ['impressions', 'clicks'],
        timeRange: { start: '2024-01-01', end: '2024-01-31' }
      });

      expect(mockClient.requestOperation).toHaveBeenCalledWith('getAnalytics', {
        queryParams: {
          q: 'entity',
          entity: 'urn:li:share:123',
          metrics: 'impressions,clicks',
          'timeRange.start': '2024-01-01',
          'timeRange.end': '2024-01-31',
          timeGranularity: 'DAY'
        }
      });

      expect(result).toEqual({
        impressions: 1000,
        clicks: 50,
        likes: 25,
        comments: 5,
        shares: 10,
        ctr: 5, // (50/1000) * 100
        period: {
          start: '2024-01-01',
          end: '2024-01-31'
        }
      });
    });

    it('should handle v202410+ analytics format', async () => {
      const mockAnalyticsResponse = {
        metrics: {
          impressions: 2000,
          clicks: 100,
          engagement: 150
        }
      };

      mockClient.requestOperation.mockResolvedValueOnce(mockAnalyticsResponse);

      const result = await endpoints.getAnalytics({
        entity: 'urn:li:share:456'
      });

      expect(result).toEqual({
        impressions: 2000,
        clicks: 100,
        engagement: 150,
        ctr: 5 // (100/2000) * 100
      });
    });
  });

  describe('Search Operations', () => {
    it('should search for people', async () => {
      const mockSearchResults = {
        elements: [
          { id: 'person-1', firstName: 'John', lastName: 'Doe' },
          { id: 'person-2', firstName: 'Jane', lastName: 'Smith' }
        ],
        paging: { pageSize: 10 }
      };

      mockClient.getPaginated.mockResolvedValueOnce(mockSearchResults);

      const result = await endpoints.search({
        keywords: 'software engineer',
        type: 'PEOPLE',
        count: 10
      });

      expect(mockClient.getPaginated).toHaveBeenCalledWith(
        '/search',
        { pageSize: 10, pageToken: undefined },
        {
          queryParams: {
            keywords: 'software engineer',
            type: 'PEOPLE',
            facets: undefined
          }
        }
      );
      expect(result).toEqual(mockSearchResults);
    });

    it('should search with facets', async () => {
      const mockSearchResults = {
        elements: [],
        paging: { pageSize: 10 }
      };

      mockClient.getPaginated.mockResolvedValueOnce(mockSearchResults);

      await endpoints.search({
        keywords: 'technology',
        type: 'COMPANIES',
        facets: { industry: ['tech', 'software'], location: ['US'] }
      });

      expect(mockClient.getPaginated).toHaveBeenCalledWith(
        '/search',
        { pageSize: 10, pageToken: undefined },
        {
          queryParams: {
            keywords: 'technology',
            type: 'COMPANIES',
            facets: JSON.stringify({ industry: ['tech', 'software'], location: ['US'] })
          }
        }
      );
    });
  });

  describe('Utility Methods', () => {
    it('should get available features', () => {
      const mockFeatures = {
        cursorPagination: true,
        documentsAPI: true,
        communityManagement: false,
        connectedTV: false,
        buyNowCTA: false,
        enhancedTargeting: true,
        batchOperations: true,
        webhooks: false,
        analytics2: false,
        videoAPI: true
      };

      mockClient.getAvailableFeatures.mockReturnValue(mockFeatures);

      const result = endpoints.getAvailableFeatures();

      expect(mockClient.getAvailableFeatures).toHaveBeenCalled();
      expect(result).toEqual(mockFeatures);
    });

    it('should get migration guide', () => {
      const mockGuide = [
        'New feature available: documentsAPI',
        'New feature available: buyNowCTA'
      ];

      mockClient.getMigrationGuide.mockReturnValue(mockGuide);

      const result = endpoints.getMigrationGuide(
        LinkedInAPIVersion.V202401,
        LinkedInAPIVersion.V202411
      );

      expect(mockClient.getMigrationGuide).toHaveBeenCalledWith(
        LinkedInAPIVersion.V202401,
        LinkedInAPIVersion.V202411
      );
      expect(result).toEqual(mockGuide);
    });

    it('should check feature compatibility', () => {
      mockClient.getAvailableFeatures.mockReturnValue({
        cursorPagination: true,
        documentsAPI: true,
        communityManagement: false,
        connectedTV: false,
        buyNowCTA: false,
        enhancedTargeting: true,
        batchOperations: true,
        webhooks: false,
        analytics2: false,
        videoAPI: true
      });

      const result = endpoints.checkFeatureCompatibility([
        'cursorPagination',
        'documentsAPI',
        'buyNowCTA',
        'connectedTV'
      ]);

      expect(result).toEqual({
        compatible: ['cursorPagination', 'documentsAPI'],
        incompatible: ['buyNowCTA', 'connectedTV']
      });
    });
  });

  describe('Connection Operations', () => {
    it('should get connections', async () => {
      const mockConnections = {
        elements: [
          { id: 'person-1', firstName: { localized: { 'en_US': 'John' } } },
          { id: 'person-2', firstName: { localized: { 'en_US': 'Jane' } } }
        ],
        paging: { pageSize: 50 }
      };

      mockClient.requestOperation.mockResolvedValueOnce(mockConnections);

      const result = await endpoints.getConnections();

      expect(mockClient.requestOperation).toHaveBeenCalledWith('getConnections', {});
      expect(result).toEqual(mockConnections);
    });
  });
});