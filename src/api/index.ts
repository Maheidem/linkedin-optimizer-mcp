/**
 * LinkedIn API v2024 - Main Exports
 * Provides both new versioned API and legacy compatibility layer
 */

// New Versioned API (v2024)
export {
  LinkedInAPIClient,
  LinkedInAPIVersion,
  LinkedInAPIConfig,
  RequestOptions,
  PaginationParams,
  PaginatedResponse,
  LinkedInAPIError,
  RateLimitInfo
} from './linkedin-api-v2024';

export {
  LinkedInEndpoints,
  LinkedInProfile,
  LinkedInPost,
  LinkedInOrganization,
  LinkedInAnalytics
} from './linkedin-endpoints';

export {
  VersionManager,
  VersionFeatures,
  VersionAdapter
} from './version-manager';

// Legacy Compatibility Layer
export {
  LegacyLinkedInClient,
  createLinkedInClient,
  LinkedInError,
  LINKEDIN_SCOPES,
  LEGACY_ENDPOINTS,
  LegacyLinkedInConfig,
  LegacyPaginatedResponse
} from './legacy-compatibility';

// Shared Types
export {
  LinkedInAPIVersion as APIVersion,
  PaginatedResponse as ModernPaginatedResponse,
  LegacyPaginatedResponse
} from './types';

/**
 * Migration Guide for existing applications
 * 
 * ## Quick Start (Legacy Compatible)
 * ```typescript
 * import { createLinkedInClient } from '@maheidem/linkedin-mcp/api';
 * 
 * const client = createLinkedInClient({
 *   clientId: 'your-client-id',
 *   redirectUri: 'http://localhost:3000/callback',
 *   scopes: ['r_basicprofile', 'r_emailaddress']
 * });
 * 
 * // All existing methods still work
 * const profile = await client.getProfile();
 * const posts = await client.createPost('Hello LinkedIn!');
 * ```
 * 
 * ## Modern API (New Features)
 * ```typescript
 * import { LinkedInAPIClient, LinkedInEndpoints, LinkedInAPIVersion } from '@maheidem/linkedin-mcp/api';
 * 
 * const client = new LinkedInAPIClient({
 *   clientId: 'your-client-id',
 *   redirectUri: 'http://localhost:3000/callback',
 *   scopes: ['openid', 'profile', 'email'],
 *   apiVersion: LinkedInAPIVersion.V202411
 * });
 * 
 * const endpoints = new LinkedInEndpoints(client);
 * 
 * // New cursor-based pagination
 * const posts = await client.getCursorPaginated('/posts', { pageSize: 50 });
 * 
 * // Version-aware features
 * if (client.hasFeature('buyNowCTA')) {
 *   const post = await endpoints.createPost({
 *     author: 'urn:li:person:123',
 *     text: 'Check out our product!',
 *     callToAction: {
 *       type: 'BUY_NOW',
 *       url: 'https://example.com/buy',
 *       label: 'Buy Now'
 *     }
 *   });
 * }
 * ```
 * 
 * ## Gradual Migration
 * ```typescript
 * import { createLinkedInClient } from '@maheidem/linkedin-mcp/api';
 * 
 * const legacyClient = createLinkedInClient(config);
 * 
 * // Use legacy methods as needed
 * const profile = await legacyClient.getProfile();
 * 
 * // Access modern features when ready
 * const modernClient = legacyClient.getModernClient();
 * const features = modernClient.getAvailableFeatures();
 * 
 * // Upgrade API version when ready
 * legacyClient.upgradeToVersion(LinkedInAPIVersion.V202411);
 * const migrationGuide = legacyClient.getMigrationGuide(LinkedInAPIVersion.V202411);
 * ```
 */