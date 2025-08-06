/**
 * LinkedIn API Types and Enums
 * Shared types used across the API implementation
 */

/**
 * LinkedIn API version identifiers
 * Format: YYYYMM (e.g., 202411 for November 2024)
 */
export enum LinkedInAPIVersion {
  V202401 = '202401',
  V202404 = '202404',
  V202407 = '202407',
  V202410 = '202410',
  V202411 = '202411', // Latest stable version
  LATEST = V202411
}

/**
 * LinkedIn API configuration
 */
export interface LinkedInAPIConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
  apiVersion?: LinkedInAPIVersion;
  environment?: 'production' | 'sandbox';
  timeout?: number;
  retryAttempts?: number;
  rateLimitStrategy?: 'throttle' | 'queue' | 'reject';
}

/**
 * API request options
 */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  queryParams?: Record<string, any>;
  timeout?: number;
  retry?: boolean;
  apiVersion?: LinkedInAPIVersion;
}

/**
 * Pagination parameters for list operations
 */
export interface PaginationParams {
  pageSize?: number;
  pageToken?: string;
  sort?: 'asc' | 'desc';
  sortBy?: string;
  cursor?: string; // Cursor-based pagination
  count?: number;  // Legacy count parameter
  start?: number;  // Legacy start parameter
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  elements: T[];
  paging: {
    pageSize: number;
    pageToken?: string;
    nextPageToken?: string;
    cursor?: string;       // Current cursor
    nextCursor?: string;   // Next cursor for cursor-based pagination
    total?: number;
    count?: number;        // Legacy count
    start?: number;        // Legacy start
    links?: {              // LinkedIn API v2024 links format
      self?: string;
      next?: string;
      prev?: string;
    };
  };
  metadata?: Record<string, any>;
}

/**
 * API error response
 */
export interface LinkedInAPIError {
  status: number;
  code: string;
  message: string;
  requestId?: string;
  details?: any;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}