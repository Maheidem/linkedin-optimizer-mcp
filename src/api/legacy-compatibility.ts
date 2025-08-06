/**
 * Legacy API Compatibility Layer
 * Provides backward compatibility for applications using the old LinkedIn API implementation
 * This allows gradual migration to the new versioned API client
 */

import { LinkedInAPIClient, LinkedInAPIVersion, PaginatedResponse, RequestOptions } from './linkedin-api-v2024';
import { LinkedInEndpoints, LinkedInProfile, LinkedInPost, LinkedInOrganization, LinkedInAnalytics } from './linkedin-endpoints';
import { TokenResponse } from '../auth/pkce-oauth-manager';

/**
 * Legacy LinkedIn API configuration (simplified)
 */
export interface LegacyLinkedInConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
  sandbox?: boolean;
}

/**
 * Legacy response format for backward compatibility
 */
export interface LegacyPaginatedResponse<T> {
  elements?: T[];
  values?: T[]; // Legacy field name
  _total?: number;
  _count?: number;
  _start?: number;
  paging?: {
    count: number;
    start: number;
    links?: { [key: string]: string };
  };
}

/**
 * Legacy LinkedIn API Client
 * Maintains the same interface as the previous implementation
 * but uses the new versioned client underneath
 */
export class LegacyLinkedInClient {
  private client: LinkedInAPIClient;
  private endpoints: LinkedInEndpoints;

  constructor(config: LegacyLinkedInConfig) {
    // Convert legacy config to new format
    this.client = new LinkedInAPIClient({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      scopes: config.scopes,
      apiVersion: LinkedInAPIVersion.V202401, // Start with oldest version for compatibility
      environment: config.sandbox ? 'sandbox' : 'production'
    });

    this.endpoints = new LinkedInEndpoints(this.client);
  }

  /**
   * Legacy authentication methods
   */
  getAuthorizationUrl(): string {
    return this.client.getAuthorizationUrl();
  }

  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    // Legacy method signature - create callback URL
    const callbackUrl = `${this.client['config'].redirectUri}?code=${code}`;
    return this.client.handleAuthorizationCallback(callbackUrl);
  }

  setAccessToken(token: string | TokenResponse): void {
    if (typeof token === 'string') {
      // Legacy string token format
      const tokenData: TokenResponse = {
        access_token: token,
        token_type: 'Bearer',
        expires_in: 5400, // Default LinkedIn token lifetime
        created_at: Math.floor(Date.now() / 1000)
      };
      this.client.setToken(tokenData);
    } else {
      this.client.setToken(token);
    }
  }

  /**
   * Legacy profile methods
   */
  async getProfile(options: { fields?: string[] } = {}): Promise<LinkedInProfile> {
    const profile = await this.endpoints.getProfile();
    
    // Convert to legacy format if needed
    if (options.fields) {
      return this.filterFields(profile, options.fields);
    }
    
    return profile;
  }

  /**
   * Legacy post creation methods
   */
  async createShare(shareData: {
    author: string;
    text: string;
    content?: {
      title: string;
      description: string;
      submittedUrl: string;
      submittedImageUrl?: string;
    };
    visibility?: 'PUBLIC' | 'CONNECTIONS';
  }): Promise<any> {
    if (shareData.content) {
      // Use share content endpoint for backward compatibility
      return this.endpoints.shareContent({
        author: shareData.author,
        text: shareData.text,
        content: shareData.content,
        visibility: shareData.visibility
      });
    } else {
      // Convert to new post format
      const post: Omit<LinkedInPost, 'id' | 'createdAt' | 'lastModified'> = {
        author: shareData.author,
        text: shareData.text,
        visibility: shareData.visibility
      };
      return this.endpoints.createPost(post);
    }
  }

  async createPost(text: string, visibility: 'PUBLIC' | 'CONNECTIONS' = 'PUBLIC'): Promise<any> {
    // Legacy simplified post creation
    const profile = await this.getProfile();
    const post: Omit<LinkedInPost, 'id' | 'createdAt' | 'lastModified'> = {
      author: profile.id,
      text,
      visibility
    };
    return this.endpoints.createPost(post);
  }

  /**
   * Legacy organizations method
   */
  async getOrganizations(): Promise<LegacyPaginatedResponse<LinkedInOrganization>> {
    const result = await this.endpoints.getOrganizations();
    return this.convertToLegacyFormat(result);
  }

  /**
   * Legacy analytics methods
   */
  async getCompanyPageStatistics(
    organizationId: string,
    timeRange: { start: string; end: string }
  ): Promise<LinkedInAnalytics> {
    return this.endpoints.getAnalytics({
      entity: `urn:li:organization:${organizationId}`,
      timeRange,
      metrics: ['impressions', 'clicks', 'likes', 'comments', 'shares', 'follows']
    });
  }

  async getPostStatistics(
    shareId: string,
    timeRange?: { start: string; end: string }
  ): Promise<LinkedInAnalytics> {
    return this.endpoints.getAnalytics({
      entity: shareId.startsWith('urn:li:') ? shareId : `urn:li:share:${shareId}`,
      timeRange,
      metrics: ['impressions', 'clicks', 'likes', 'comments', 'shares']
    });
  }

  /**
   * Legacy pagination methods
   */
  async getPaginatedResults<T>(
    endpoint: string,
    options: {
      count?: number;
      start?: number;
      q?: string;
      [key: string]: any;
    } = {}
  ): Promise<LegacyPaginatedResponse<T>> {
    const { count = 50, start = 0, ...queryParams } = options;
    
    const result = await this.client.getPaginated<T>(endpoint, {
      count,
      start,
      pageSize: count
    }, {
      queryParams
    });

    return this.convertToLegacyFormat(result);
  }

  /**
   * Legacy search methods
   */
  async searchPeople(
    keywords: string,
    options: { count?: number; start?: number } = {}
  ): Promise<LegacyPaginatedResponse<LinkedInProfile>> {
    const result = await this.endpoints.search({
      keywords,
      type: 'PEOPLE',
      count: options.count,
      start: options.start
    });

    return this.convertToLegacyFormat(result);
  }

  async searchCompanies(
    keywords: string,
    options: { count?: number; start?: number } = {}
  ): Promise<LegacyPaginatedResponse<LinkedInOrganization>> {
    const result = await this.endpoints.search({
      keywords,
      type: 'COMPANIES',
      count: options.count,
      start: options.start
    });

    return this.convertToLegacyFormat(result);
  }

  /**
   * Legacy connection methods
   */
  async getConnections(options: { count?: number; start?: number } = {}): Promise<LegacyPaginatedResponse<LinkedInProfile>> {
    const result = await this.endpoints.getConnections();
    return this.convertToLegacyFormat(result);
  }

  /**
   * Legacy utility methods
   */
  async isTokenValid(): Promise<boolean> {
    return this.client.healthCheck();
  }

  /**
   * Advanced features - exposed for users who want to migrate gradually
   */
  getModernClient(): LinkedInAPIClient {
    return this.client;
  }

  getModernEndpoints(): LinkedInEndpoints {
    return this.endpoints;
  }

  /**
   * Migration helpers
   */
  upgradeToVersion(version: LinkedInAPIVersion): void {
    this.client.setApiVersion(version);
  }

  getAvailableFeatures() {
    return this.client.getAvailableFeatures();
  }

  getMigrationGuide(targetVersion: LinkedInAPIVersion) {
    return this.client.getMigrationGuide(this.client.getApiVersion(), targetVersion);
  }

  /**
   * Private helper methods
   */
  private convertToLegacyFormat<T>(modern: PaginatedResponse<T>): LegacyPaginatedResponse<T> {
    return {
      elements: modern.elements,
      values: modern.elements, // Legacy field name
      _total: modern.paging.total,
      _count: modern.paging.count || modern.paging.pageSize,
      _start: modern.paging.start,
      paging: {
        count: modern.paging.count || modern.paging.pageSize,
        start: modern.paging.start || 0,
        links: modern.paging.links
      }
    };
  }

  private filterFields(obj: any, fields: string[]): any {
    const filtered: any = {};
    fields.forEach(field => {
      if (obj[field] !== undefined) {
        filtered[field] = obj[field];
      }
    });
    return filtered;
  }
}

/**
 * Factory function for creating legacy client (backward compatibility)
 */
export function createLinkedInClient(config: LegacyLinkedInConfig): LegacyLinkedInClient {
  return new LegacyLinkedInClient(config);
}

/**
 * Legacy error types for backward compatibility
 */
export class LinkedInError extends Error {
  public status?: number;
  public code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'LinkedInError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Legacy constants
 */
export const LINKEDIN_SCOPES = {
  BASIC_PROFILE: 'r_basicprofile',
  EMAIL_ADDRESS: 'r_emailaddress',
  COMPANY_ADMIN: 'rw_company_admin',
  SHARE: 'w_share'
};

/**
 * Legacy endpoints mapping for backward compatibility
 */
export const LEGACY_ENDPOINTS = {
  PROFILE: '/people/~',
  COMPANIES: '/companies',
  SHARES: '/shares',
  POSTS: '/posts',
  COMPANY_PAGES: '/companyPages'
};