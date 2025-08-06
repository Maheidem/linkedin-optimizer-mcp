/**
 * LinkedIn API Endpoint Implementations
 * High-level endpoint methods using the version-aware LinkedInAPIClient
 */

import { LinkedInAPIClient, LinkedInAPIVersion, PaginatedResponse, RequestOptions } from './linkedin-api-v2024';

/**
 * LinkedIn Profile Information
 */
export interface LinkedInProfile {
  id: string;
  firstName?: {
    localized: Record<string, string>;
    preferredLocale: {
      country: string;
      language: string;
    };
  };
  lastName?: {
    localized: Record<string, string>;
    preferredLocale: {
      country: string;
      language: string;
    };
  };
  profilePicture?: {
    displayImage: string;
  };
  headline?: {
    localized: Record<string, string>;
    preferredLocale: {
      country: string;
      language: string;
    };
  };
  vanityName?: string;
}

/**
 * LinkedIn Post Content
 */
export interface LinkedInPost {
  id?: string;
  author: string;
  text: string;
  commentary?: string;
  visibility?: 'PUBLIC' | 'CONNECTIONS';
  media?: {
    type: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'ARTICLE';
    url?: string;
    title?: string;
    description?: string;
  }[];
  callToAction?: {
    type: 'LEARN_MORE' | 'SIGN_UP' | 'DOWNLOAD' | 'BUY_NOW';
    url: string;
    label: string;
  };
  targetingCriteria?: {
    geo?: string[];
    demographics?: string[];
    interests?: string[];
    connectedTV?: boolean;
  };
  createdAt?: string;
  lastModified?: string;
}

/**
 * LinkedIn Organization Information
 */
export interface LinkedInOrganization {
  id: string;
  name?: {
    localized: Record<string, string>;
    preferredLocale: {
      country: string;
      language: string;
    };
  };
  vanityName?: string;
  logoV2?: {
    original: string;
  };
  description?: {
    localized: Record<string, string>;
    preferredLocale: {
      country: string;
      language: string;
    };
  };
}

/**
 * LinkedIn Analytics Data
 */
export interface LinkedInAnalytics {
  impressions?: number;
  clicks?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  follows?: number;
  engagement?: number;
  reach?: number;
  videoViews?: number;
  videoCompletionRate?: number;
  ctr?: number; // Click-through rate
  cpm?: number; // Cost per mille
  cpc?: number; // Cost per click
  period?: {
    start: string;
    end: string;
  };
}

/**
 * LinkedIn API Endpoints Implementation
 * Provides high-level methods for common LinkedIn operations
 */
export class LinkedInEndpoints {
  constructor(private client: LinkedInAPIClient) {}

  /**
   * Get current user's profile information
   */
  async getProfile(options: RequestOptions = {}): Promise<LinkedInProfile> {
    // Use operation-based request for version compatibility
    return this.client.requestOperation<LinkedInProfile>('getProfile', options);
  }

  /**
   * Get user's organizations/pages they can manage
   */
  async getOrganizations(options: RequestOptions = {}): Promise<PaginatedResponse<LinkedInOrganization>> {
    return this.client.requestOperation<PaginatedResponse<LinkedInOrganization>>('getOrganizations', options);
  }

  /**
   * Create a new LinkedIn post
   */
  async createPost(post: Omit<LinkedInPost, 'id' | 'createdAt' | 'lastModified'>, options: RequestOptions = {}): Promise<LinkedInPost> {
    // Check if advanced features are available
    if (post.callToAction?.type === 'BUY_NOW' && !this.client.hasFeature('buyNowCTA')) {
      throw new Error(`Buy Now CTA is not available in API version ${this.client.getApiVersion()}. Requires v202411 or later.`);
    }

    if (post.targetingCriteria?.connectedTV && !this.client.hasFeature('connectedTV')) {
      throw new Error(`Connected TV targeting is not available in API version ${this.client.getApiVersion()}. Requires v202410 or later.`);
    }

    // Transform post data for the specific API version
    const postData = this.transformPostForVersion(post);

    return this.client.requestOperation<LinkedInPost>('createPost', {
      ...options,
      body: postData
    });
  }

  /**
   * Share content (shares endpoint)
   */
  async shareContent(content: {
    author: string;
    text: string;
    content?: {
      title: string;
      description: string;
      submittedUrl: string;
      submittedImageUrl?: string;
    };
    visibility?: 'PUBLIC' | 'CONNECTIONS';
  }, options: RequestOptions = {}): Promise<any> {
    return this.client.requestOperation('shareContent', {
      ...options,
      body: content
    });
  }

  /**
   * Upload an image for use in posts
   */
  async uploadImage(imageData: {
    filename: string;
    data: Buffer | string;
    contentType?: string;
  }, options: RequestOptions = {}): Promise<{ uploadUrl: string; asset: string }> {
    // Check if this feature is available
    if (!this.client.hasFeature('documentsAPI')) {
      throw new Error(`Image upload is not available in API version ${this.client.getApiVersion()}. Requires v202404 or later.`);
    }

    return this.client.requestOperation('uploadImage', {
      ...options,
      body: {
        filename: imageData.filename,
        fileSize: Buffer.isBuffer(imageData.data) ? imageData.data.length : imageData.data.length,
        contentType: imageData.contentType || 'image/jpeg'
      }
    });
  }

  /**
   * Get analytics data for posts or organizations
   */
  async getAnalytics(params: {
    entity: string; // URN of the entity (post, organization, etc.)
    metrics?: string[];
    timeRange?: {
      start: string;
      end: string;
    };
    timeGranularity?: 'DAY' | 'MONTH';
  }, options: RequestOptions = {}): Promise<LinkedInAnalytics> {
    // Use different endpoints based on API version
    const analytics = await this.client.requestOperation<any>('getAnalytics', {
      ...options,
      queryParams: {
        q: 'entity',
        entity: params.entity,
        metrics: params.metrics?.join(','),
        'timeRange.start': params.timeRange?.start,
        'timeRange.end': params.timeRange?.end,
        timeGranularity: params.timeGranularity || 'DAY'
      }
    });

    return this.transformAnalyticsResponse(analytics);
  }

  /**
   * Get user's connections (if available)
   */
  async getConnections(options: RequestOptions = {}): Promise<PaginatedResponse<LinkedInProfile>> {
    return this.client.requestOperation<PaginatedResponse<LinkedInProfile>>('getConnections', options);
  }

  /**
   * Get posts by the current user or organization
   */
  async getPosts(params: {
    author?: string;
    count?: number;
    start?: number;
  } = {}, options: RequestOptions = {}): Promise<PaginatedResponse<LinkedInPost>> {
    return this.client.getPaginated<LinkedInPost>('/posts', {
      pageSize: params.count || 20,
      pageToken: params.start?.toString()
    }, {
      ...options,
      queryParams: {
        q: 'author',
        author: params.author,
        ...options.queryParams
      }
    });
  }

  /**
   * Search for content or people (if available)
   */
  async search(params: {
    keywords: string;
    type: 'PEOPLE' | 'COMPANIES' | 'POSTS';
    facets?: Record<string, string[]>;
    count?: number;
    start?: number;
  }, options: RequestOptions = {}): Promise<PaginatedResponse<any>> {
    return this.client.getPaginated<any>('/search', {
      pageSize: params.count || 10,
      pageToken: params.start?.toString()
    }, {
      ...options,
      queryParams: {
        keywords: params.keywords,
        type: params.type,
        facets: params.facets ? JSON.stringify(params.facets) : undefined,
        ...options.queryParams
      }
    });
  }

  /**
   * Transform post data based on current API version
   */
  private transformPostForVersion(post: Omit<LinkedInPost, 'id' | 'createdAt' | 'lastModified'>): any {
    const apiVersion = this.client.getApiVersion();
    
    const transformedPost: any = {
      author: post.author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: post.text
          },
          shareMediaCategory: post.media?.length ? 'IMAGE' : 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': post.visibility || 'PUBLIC'
      }
    };

    // Add media if present and supported
    if (post.media?.length) {
      transformedPost.specificContent['com.linkedin.ugc.ShareContent'].media = post.media.map(media => ({
        status: 'READY',
        originalUrl: media.url,
        media: media.url,
        title: media.title,
        description: media.description
      }));
    }

    // Add call-to-action if supported
    if (post.callToAction && this.client.hasFeature('buyNowCTA')) {
      transformedPost.callToAction = {
        type: post.callToAction.type,
        url: post.callToAction.url,
        label: post.callToAction.label
      };
    }

    // Add targeting criteria if supported
    if (post.targetingCriteria) {
      const targeting: any = {};
      
      if (post.targetingCriteria.geo?.length) {
        targeting.geo = post.targetingCriteria.geo;
      }
      
      if (post.targetingCriteria.demographics?.length && this.client.hasFeature('enhancedTargeting')) {
        targeting.demographics = post.targetingCriteria.demographics;
      }
      
      if (post.targetingCriteria.interests?.length && this.client.hasFeature('enhancedTargeting')) {
        targeting.interests = post.targetingCriteria.interests;
      }
      
      if (post.targetingCriteria.connectedTV && this.client.hasFeature('connectedTV')) {
        targeting.connectedTV = true;
      }
      
      if (Object.keys(targeting).length > 0) {
        transformedPost.targeting = targeting;
      }
    }

    return transformedPost;
  }

  /**
   * Transform analytics response based on API version
   */
  private transformAnalyticsResponse(rawAnalytics: any): LinkedInAnalytics {
    // Handle different analytics response formats across versions
    const analytics: LinkedInAnalytics = {};

    if (rawAnalytics.elements?.length) {
      const data = rawAnalytics.elements[0];
      
      // Map common metrics
      analytics.impressions = data.impressionCount || data.impressions;
      analytics.clicks = data.clickCount || data.clicks;
      analytics.likes = data.likeCount || data.likes;
      analytics.comments = data.commentCount || data.comments;
      analytics.shares = data.shareCount || data.shares;
      analytics.follows = data.followerCount || data.follows;
      analytics.engagement = data.engagementCount || data.engagement;
      analytics.reach = data.uniqueImpressionsCount || data.reach;
      
      // Video metrics (if available)
      analytics.videoViews = data.videoViews || data.viewCount;
      analytics.videoCompletionRate = data.videoCompletionRate;
      
      // Calculated metrics
      if (analytics.clicks && analytics.impressions) {
        analytics.ctr = (analytics.clicks / analytics.impressions) * 100;
      }
      
      // Time period
      if (data.timeRange) {
        analytics.period = {
          start: data.timeRange.start,
          end: data.timeRange.end
        };
      }
    }

    // Handle v202410+ analytics format
    if (rawAnalytics.metrics) {
      Object.assign(analytics, rawAnalytics.metrics);
    }

    // Calculate CTR if we have both clicks and impressions but no existing CTR
    if (analytics.clicks && analytics.impressions && !analytics.ctr) {
      analytics.ctr = (analytics.clicks / analytics.impressions) * 100;
    }

    return analytics;
  }

  /**
   * Get available features for the current API version
   */
  getAvailableFeatures() {
    return this.client.getAvailableFeatures();
  }

  /**
   * Get migration guide between API versions
   */
  getMigrationGuide(fromVersion: LinkedInAPIVersion, toVersion: LinkedInAPIVersion) {
    return this.client.getMigrationGuide(fromVersion, toVersion);
  }

  /**
   * Check API version compatibility for specific features
   */
  checkFeatureCompatibility(features: string[]): { compatible: string[]; incompatible: string[] } {
    const availableFeatures = this.client.getAvailableFeatures();
    const compatible: string[] = [];
    const incompatible: string[] = [];

    features.forEach(feature => {
      if (availableFeatures[feature as keyof typeof availableFeatures]) {
        compatible.push(feature);
      } else {
        incompatible.push(feature);
      }
    });

    return { compatible, incompatible };
  }
}