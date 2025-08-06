/**
 * LinkedIn API Version Manager
 * Handles API version compatibility and feature detection
 */

import { LinkedInAPIVersion } from './types';

/**
 * Feature availability by API version
 */
export interface VersionFeatures {
  cursorPagination: boolean;
  documentsAPI: boolean;
  communityManagement: boolean;
  connectedTV: boolean;
  buyNowCTA: boolean;
  enhancedTargeting: boolean;
  batchOperations: boolean;
  webhooks: boolean;
  analytics2: boolean;
  videoAPI: boolean;
}

/**
 * Endpoint mapping for different API versions
 */
export interface EndpointMapping {
  path: string;
  method: string;
  deprecated?: boolean;
  replacedBy?: string;
  versionAdded?: LinkedInAPIVersion;
  versionRemoved?: LinkedInAPIVersion;
}

/**
 * Version-specific adapter interface
 */
export interface VersionAdapter {
  transformRequest(data: any): any;
  transformResponse(data: any): any;
  validateRequest(data: any): boolean;
  getEndpointPath(operation: string): string;
}

/**
 * LinkedIn API Version Manager
 * Manages API version compatibility and migrations
 */
export class VersionManager {
  private static readonly FEATURE_MATRIX: Map<LinkedInAPIVersion, VersionFeatures> = new Map([
    [LinkedInAPIVersion.V202401, {
      cursorPagination: true,
      documentsAPI: false,
      communityManagement: false,
      connectedTV: false,
      buyNowCTA: false,
      enhancedTargeting: false,
      batchOperations: true,
      webhooks: false,
      analytics2: false,
      videoAPI: true
    }],
    [LinkedInAPIVersion.V202404, {
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
    }],
    [LinkedInAPIVersion.V202407, {
      cursorPagination: true,
      documentsAPI: true,
      communityManagement: true,
      connectedTV: false,
      buyNowCTA: false,
      enhancedTargeting: true,
      batchOperations: true,
      webhooks: true,
      analytics2: false,
      videoAPI: true
    }],
    [LinkedInAPIVersion.V202410, {
      cursorPagination: true,
      documentsAPI: true,
      communityManagement: true,
      connectedTV: true,
      buyNowCTA: false,
      enhancedTargeting: true,
      batchOperations: true,
      webhooks: true,
      analytics2: true,
      videoAPI: true
    }],
    [LinkedInAPIVersion.V202411, {
      cursorPagination: true,
      documentsAPI: true,
      communityManagement: true,
      connectedTV: true,
      buyNowCTA: true,
      enhancedTargeting: true,
      batchOperations: true,
      webhooks: true,
      analytics2: true,
      videoAPI: true
    }]
  ]);

  private static readonly ENDPOINT_MAPPINGS: Map<string, EndpointMapping[]> = new Map([
    ['createPost', [
      {
        path: '/posts',
        method: 'POST',
        versionAdded: LinkedInAPIVersion.V202401
      },
      {
        path: '/ugcPosts',
        method: 'POST',
        deprecated: true,
        replacedBy: '/posts',
        versionRemoved: LinkedInAPIVersion.V202401
      }
    ]],
    ['getProfile', [
      {
        path: '/me',
        method: 'GET',
        versionAdded: LinkedInAPIVersion.V202401
      },
      {
        path: '/v2/me',
        method: 'GET',
        deprecated: true,
        replacedBy: '/me',
        versionRemoved: LinkedInAPIVersion.V202401
      }
    ]],
    ['getConnections', [
      {
        path: '/connections',
        method: 'GET',
        versionAdded: LinkedInAPIVersion.V202401
      }
    ]],
    ['getOrganizations', [
      {
        path: '/organizationAcls',
        method: 'GET',
        versionAdded: LinkedInAPIVersion.V202401
      }
    ]],
    ['shareContent', [
      {
        path: '/shares',
        method: 'POST',
        versionAdded: LinkedInAPIVersion.V202401
      }
    ]],
    ['uploadImage', [
      {
        path: '/images',
        method: 'POST',
        versionAdded: LinkedInAPIVersion.V202401
      }
    ]],
    ['getAnalytics', [
      {
        path: '/organizationalEntityShareStatistics',
        method: 'GET',
        versionAdded: LinkedInAPIVersion.V202401,
        versionRemoved: LinkedInAPIVersion.V202410
      },
      {
        path: '/analytics/shares',
        method: 'GET',
        versionAdded: LinkedInAPIVersion.V202410
      }
    ]]
  ]);

  private currentVersion: LinkedInAPIVersion;
  private adapters: Map<LinkedInAPIVersion, VersionAdapter> = new Map();

  constructor(version: LinkedInAPIVersion = LinkedInAPIVersion.LATEST) {
    // Convert LATEST to actual latest version
    this.currentVersion = version === LinkedInAPIVersion.LATEST ? LinkedInAPIVersion.V202411 : version;
    this.initializeAdapters();
  }

  /**
   * Initialize version-specific adapters
   */
  private initializeAdapters(): void {
    // Add adapters for each version
    const versions = [LinkedInAPIVersion.V202401, LinkedInAPIVersion.V202404, LinkedInAPIVersion.V202407, LinkedInAPIVersion.V202410, LinkedInAPIVersion.V202411];
    for (const version of versions) {
      this.adapters.set(version, this.createAdapter(version));
    }
  }

  /**
   * Create a version-specific adapter
   */
  private createAdapter(version: LinkedInAPIVersion): VersionAdapter {
    return {
      transformRequest: (data: any) => this.transformRequestForVersion(data, version),
      transformResponse: (data: any) => this.transformResponseForVersion(data, version),
      validateRequest: (data: any) => this.validateRequestForVersion(data, version),
      getEndpointPath: (operation: string) => this.getEndpointForVersion(operation, version)
    };
  }

  /**
   * Get features available in a specific API version
   */
  public getFeatures(version?: LinkedInAPIVersion): VersionFeatures {
    const targetVersion = version || this.currentVersion;
    return VersionManager.FEATURE_MATRIX.get(targetVersion) || VersionManager.FEATURE_MATRIX.get(LinkedInAPIVersion.LATEST)!;
  }

  /**
   * Check if a feature is available in the current version
   */
  public hasFeature(feature: keyof VersionFeatures): boolean {
    const features = this.getFeatures();
    return features[feature];
  }

  /**
   * Get the appropriate endpoint for an operation
   */
  public getEndpoint(operation: string): EndpointMapping | null {
    const mappings = VersionManager.ENDPOINT_MAPPINGS.get(operation);
    if (!mappings) return null;

    // Find the appropriate endpoint for the current version
    for (const mapping of mappings) {
      if (this.isEndpointValidForVersion(mapping)) {
        return mapping;
      }
    }

    return null;
  }

  /**
   * Check if an endpoint is valid for the current version
   */
  private isEndpointValidForVersion(mapping: EndpointMapping): boolean {
    const version = this.currentVersion;

    // Check if endpoint is added after current version
    if (mapping.versionAdded && this.compareVersions(version, mapping.versionAdded) < 0) {
      return false;
    }

    // Check if endpoint is removed before current version
    if (mapping.versionRemoved && this.compareVersions(version, mapping.versionRemoved) >= 0) {
      return false;
    }

    return !mapping.deprecated;
  }

  /**
   * Compare two API versions
   */
  private compareVersions(v1: LinkedInAPIVersion, v2: LinkedInAPIVersion): number {
    const v1Num = parseInt(v1, 10);
    const v2Num = parseInt(v2, 10);
    return v1Num - v2Num;
  }

  /**
   * Transform request data for a specific version
   */
  private transformRequestForVersion(data: any, version: LinkedInAPIVersion): any {
    // Version-specific transformations
    switch (version) {
      case LinkedInAPIVersion.V202401:
        return this.transformRequestV202401(data);
      case LinkedInAPIVersion.V202404:
        return this.transformRequestV202404(data);
      case LinkedInAPIVersion.V202407:
        return this.transformRequestV202407(data);
      case LinkedInAPIVersion.V202410:
        return this.transformRequestV202410(data);
      case LinkedInAPIVersion.V202411:
        return this.transformRequestV202411(data);
      default:
        return data;
    }
  }

  /**
   * Transform response data for a specific version
   */
  private transformResponseForVersion(data: any, version: LinkedInAPIVersion): any {
    // Version-specific transformations
    switch (version) {
      case LinkedInAPIVersion.V202401:
        return this.transformResponseV202401(data);
      case LinkedInAPIVersion.V202404:
        return this.transformResponseV202404(data);
      case LinkedInAPIVersion.V202407:
        return this.transformResponseV202407(data);
      case LinkedInAPIVersion.V202410:
        return this.transformResponseV202410(data);
      case LinkedInAPIVersion.V202411:
        return this.transformResponseV202411(data);
      default:
        return data;
    }
  }

  /**
   * Validate request data for a specific version
   */
  private validateRequestForVersion(data: any, version: LinkedInAPIVersion): boolean {
    // Version-specific validation
    const features = this.getFeatures(version);

    // Example: Check if cursor pagination is required
    if (data.pagination && !features.cursorPagination) {
      if (data.pagination.pageToken) {
        throw new Error(`Cursor pagination not supported in version ${version}`);
      }
    }

    return true;
  }

  /**
   * Get endpoint path for a specific version
   */
  private getEndpointForVersion(operation: string, version: LinkedInAPIVersion): string {
    const endpoint = this.getEndpoint(operation);
    if (!endpoint) {
      throw new Error(`Unknown operation: ${operation}`);
    }
    return endpoint.path;
  }

  // Version-specific transformation methods

  private transformRequestV202401(data: any): any {
    // Transform for v202401
    if (data.post) {
      // Convert post format
      return {
        author: data.post.author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: data.post.text
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: data.post.visibility || {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };
    }
    return data;
  }

  private transformRequestV202404(data: any): any {
    // Transform for v202404 - adds Documents API support
    const transformed = this.transformRequestV202401(data);
    
    if (data.document) {
      return {
        ...transformed,
        document: {
          id: data.document.id,
          title: data.document.title,
          description: data.document.description
        }
      };
    }
    
    return transformed;
  }

  private transformRequestV202407(data: any): any {
    // Transform for v202407 - adds Community Management
    const transformed = this.transformRequestV202404(data);
    
    if (data.community) {
      return {
        ...transformed,
        community: {
          id: data.community.id,
          engagement: data.community.engagement
        }
      };
    }
    
    return transformed;
  }

  private transformRequestV202410(data: any): any {
    // Transform for v202410 - adds Connected TV and Analytics v2
    const transformed = this.transformRequestV202407(data);
    
    if (data.targeting?.connectedTV) {
      return {
        ...transformed,
        targeting: {
          ...transformed.targeting,
          connectedTV: data.targeting.connectedTV
        }
      };
    }
    
    return transformed;
  }

  private transformRequestV202411(data: any): any {
    // Transform for v202411 - adds Buy Now CTA
    const transformed = this.transformRequestV202410(data);
    
    if (data.callToAction?.type === 'BUY_NOW') {
      return {
        ...transformed,
        callToAction: {
          type: 'BUY_NOW',
          url: data.callToAction.url,
          label: data.callToAction.label
        }
      };
    }
    
    return transformed;
  }

  private transformResponseV202401(data: any): any {
    // For v202401, don't transform legacy responses - let the main transformPaginatedResponse handle it
    // This preserves all the original fields (start, count, total, etc.)
    return data;
  }

  private transformResponseV202404(data: any): any {
    // Transform response for v202404
    return this.transformResponseV202401(data);
  }

  private transformResponseV202407(data: any): any {
    // Transform response for v202407
    return this.transformResponseV202404(data);
  }

  private transformResponseV202410(data: any): any {
    // Transform response for v202410
    const transformed = this.transformResponseV202407(data);
    
    // Add analytics v2 format
    if (data.analytics) {
      return {
        ...transformed,
        metrics: data.analytics.metrics,
        dimensions: data.analytics.dimensions
      };
    }
    
    return transformed;
  }

  private transformResponseV202411(data: any): any {
    // Transform response for v202411
    return this.transformResponseV202410(data);
  }

  /**
   * Get migration guide for upgrading versions
   */
  public getMigrationGuide(fromVersion: LinkedInAPIVersion, toVersion: LinkedInAPIVersion): string[] {
    const guide: string[] = [];
    
    const fromFeatures = this.getFeatures(fromVersion);
    const toFeatures = this.getFeatures(toVersion);
    
    // Check for new features
    for (const [feature, available] of Object.entries(toFeatures)) {
      if (available && !fromFeatures[feature as keyof VersionFeatures]) {
        guide.push(`New feature available: ${feature}`);
      }
    }
    
    // Check for deprecated endpoints
    for (const [operation, mappings] of VersionManager.ENDPOINT_MAPPINGS.entries()) {
      for (const mapping of mappings) {
        if (mapping.deprecated && mapping.versionRemoved === toVersion) {
          guide.push(`Endpoint deprecated: ${mapping.path} - Use ${mapping.replacedBy} instead`);
        }
      }
    }
    
    return guide;
  }

  /**
   * Set current API version
   */
  public setVersion(version: LinkedInAPIVersion): void {
    this.currentVersion = version;
  }

  /**
   * Get current API version
   */
  public getVersion(): LinkedInAPIVersion {
    return this.currentVersion;
  }

  /**
   * Get adapter for current version
   */
  public getAdapter(): VersionAdapter | undefined {
    return this.adapters.get(this.currentVersion);
  }
}