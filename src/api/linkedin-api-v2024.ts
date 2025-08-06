/**
 * LinkedIn API v2024 Client
 * Implements the latest LinkedIn REST API with versioning support
 * Compliant with LinkedIn API v202411 (November 2024)
 */

import { PKCEOAuthManager, TokenResponse } from '../auth/pkce-oauth-manager';
import { VersionManager, VersionAdapter } from './version-manager';
import { 
  LinkedInAPIVersion, 
  LinkedInAPIConfig, 
  RequestOptions, 
  PaginationParams, 
  PaginatedResponse, 
  LinkedInAPIError, 
  RateLimitInfo 
} from './types';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

// Re-export types for backward compatibility
export { 
  LinkedInAPIVersion, 
  LinkedInAPIConfig, 
  RequestOptions, 
  PaginationParams, 
  PaginatedResponse, 
  LinkedInAPIError, 
  RateLimitInfo 
} from './types';

/**
 * LinkedIn API v2024 Client
 * Implements versioned endpoints with proper header management
 */
export class LinkedInAPIClient {
  private readonly BASE_URL = 'https://api.linkedin.com/rest';
  private readonly AUTH_BASE_URL = 'https://www.linkedin.com/oauth/v2';
  private config: LinkedInAPIConfig;
  private oauthManager: PKCEOAuthManager;
  private versionManager: VersionManager;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private rateLimitInfo: Map<string, RateLimitInfo> = new Map();
  private requestQueue: Array<() => Promise<any>> = [];
  private processing = false;

  constructor(config: LinkedInAPIConfig) {
    this.config = {
      ...config,
      apiVersion: config.apiVersion || LinkedInAPIVersion.LATEST,
      environment: config.environment || 'production',
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      rateLimitStrategy: config.rateLimitStrategy || 'queue'
    };

    // Initialize OAuth manager
    this.oauthManager = new PKCEOAuthManager({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      authorizationUrl: `${this.AUTH_BASE_URL}/authorization`,
      tokenUrl: `${this.AUTH_BASE_URL}/accessToken`,
      scopes: config.scopes
    });

    // Initialize version manager
    this.versionManager = new VersionManager(this.config.apiVersion);

    // Load stored token if available
    this.loadStoredToken();
  }

  /**
   * Get required headers for LinkedIn API v2024
   */
  private getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'LinkedIn-Version': this.config.apiVersion!,
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...customHeaders
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  /**
   * Make an authenticated API request with version-aware processing
   */
  public async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    // Ensure we have a valid token
    await this.ensureValidToken();

    // Get version adapter for request/response transformation
    const adapter = this.versionManager.getAdapter();
    const apiVersion = options.apiVersion || this.config.apiVersion;

    // Validate request data if adapter is available
    if (adapter && options.body) {
      adapter.validateRequest(options.body);
    }

    // Transform request body using version adapter
    let transformedBody = options.body;
    if (adapter && options.body) {
      transformedBody = adapter.transformRequest(options.body);
    }

    // Check rate limits
    await this.checkRateLimit(endpoint);

    const url = this.buildUrl(endpoint, options.queryParams);
    const headers = this.getHeaders(options.headers);

    // Override API version if specified in options
    if (apiVersion && apiVersion !== this.config.apiVersion) {
      headers['LinkedIn-Version'] = apiVersion;
    }

    const requestConfig: RequestInit = {
      method: options.method || 'GET',
      headers,
      signal: AbortSignal.timeout(options.timeout || this.config.timeout!)
    };

    if (transformedBody && ['POST', 'PUT', 'PATCH'].includes(requestConfig.method!)) {
      requestConfig.body = JSON.stringify(transformedBody);
    }

    try {
      const response = await this.executeRequest<any>(url, requestConfig, options);
      
      // Transform response using version adapter
      let transformedResponse = response;
      if (adapter) {
        transformedResponse = adapter.transformResponse(response);
      }
      
      return transformedResponse as T;
    } catch (error) {
      if (options.retry !== false && this.shouldRetry(error)) {
        return this.retryRequest<T>(endpoint, options);
      }
      throw this.handleError(error);
    }
  }

  /**
   * Execute the actual HTTP request
   */
  private async executeRequest<T>(
    url: string,
    config: RequestInit,
    options: RequestOptions
  ): Promise<T> {
    const response = await fetch(url, config);

    // Update rate limit information
    this.updateRateLimitInfo(response);

    if (!response.ok) {
      throw await this.parseErrorResponse(response);
    }

    // Handle empty responses
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T;
    }

    return await response.json() as T;
  }

  /**
   * Get paginated results
   */
  public async getPaginated<T>(
    endpoint: string,
    params: PaginationParams = {},
    options: RequestOptions = {}
  ): Promise<PaginatedResponse<T>> {
    const queryParams: Record<string, any> = {
      ...options.queryParams
    };

    // Use cursor-based pagination if available and supported
    if (params.cursor && this.versionManager.hasFeature('cursorPagination')) {
      queryParams.cursor = params.cursor;
      queryParams.pageSize = params.pageSize || 50; // LinkedIn v2024 default
    }
    // Fall back to pageToken-based pagination
    else if (params.pageToken) {
      queryParams.pageToken = params.pageToken;
      queryParams.pageSize = params.pageSize || 20;
    }
    // Legacy pagination parameters
    else {
      if (params.count !== undefined) {
        queryParams.count = params.count;
      } else if (params.pageSize !== undefined) {
        queryParams.pageSize = params.pageSize;
      } else {
        queryParams.pageSize = 20; // Default page size
      }

      if (params.start !== undefined) {
        queryParams.start = params.start;
      }
    }

    // Add sorting parameters
    if (params.sort) {
      queryParams.sort = params.sort;
    }

    if (params.sortBy) {
      queryParams.sortBy = params.sortBy;
    }

    const response = await this.request<any>(endpoint, {
      ...options,
      queryParams
    });

    // Transform response to standard paginated format
    return this.transformPaginatedResponse<T>(response);
  }

  /**
   * Get all pages of a paginated endpoint
   */
  public async *getAllPages<T>(
    endpoint: string,
    params: PaginationParams = {},
    options: RequestOptions = {}
  ): AsyncGenerator<T[], void, unknown> {
    let currentParams = { ...params };
    
    do {
      const response = await this.getPaginated<T>(endpoint, currentParams, options);

      if (response.elements.length === 0) {
        break;
      }

      yield response.elements;

      // Prepare for next iteration based on pagination type
      // Check for legacy pagination first to preserve start/count parameters
      if (response.paging.start !== undefined && response.paging.total !== undefined) {
        // Legacy offset-based pagination
        const nextStart = (response.paging.start || 0) + (response.paging.count || response.paging.pageSize);
        if (nextStart >= response.paging.total) {
          break;
        }
        currentParams = {
          ...params,
          start: nextStart,
          cursor: undefined,
          pageToken: undefined
        };
      } else if (response.paging.nextCursor) {
        // Cursor-based pagination
        currentParams = {
          ...params,
          cursor: response.paging.nextCursor,
          pageToken: undefined,
          start: undefined
        };
      } else if (response.paging.nextPageToken) {
        // PageToken-based pagination
        currentParams = {
          ...params,
          pageToken: response.paging.nextPageToken,
          cursor: undefined,
          start: undefined
        };
      } else {
        // No more pages
        break;
      }
    } while (true);
  }

  /**
   * Transform API response to standard paginated format
   */
  private transformPaginatedResponse<T>(response: any): PaginatedResponse<T> {
    // Handle LinkedIn API v2024 format with cursor-based pagination
    if ('elements' in response && 'paging' in response) {
      const transformedPaging: any = { ...response.paging };

      // Extract cursor information from links if present
      if (response.paging.links?.next) {
        try {
          const nextUrl = new URL(response.paging.links.next);
          const nextCursor = nextUrl.searchParams.get('cursor');
          if (nextCursor) {
            transformedPaging.nextCursor = nextCursor;
          }
        } catch (error) {
          // Handle relative URLs by trying to extract cursor parameter directly
          const cursorMatch = response.paging.links.next.match(/cursor=([^&]+)/);
          if (cursorMatch) {
            transformedPaging.nextCursor = decodeURIComponent(cursorMatch[1]);
          }
        }
      }

      return {
        elements: response.elements,
        paging: transformedPaging,
        metadata: response.metadata
      };
    }

    // Handle cursor-based pagination response format
    if ('data' in response && response.cursors) {
      return {
        elements: response.data,
        paging: {
          pageSize: response.data?.length || 0,
          cursor: response.cursors.before,
          nextCursor: response.cursors.after,
          total: response.summary?.total_count
        }
      };
    }

    // Legacy format transformation (v1 API)
    if ('values' in response) {
      return {
        elements: response.values,
        paging: {
          pageSize: response.count || response._count || response.values.length,
          count: response.count || response._count,
          start: response.start !== undefined ? response.start : response._start,
          total: response.total !== undefined ? response.total : response._total,
          // Convert start-based pagination to pageToken
          pageToken: (response.start !== undefined ? response.start : response._start)?.toString(),
          nextPageToken: (response.total || response._total) > ((response.start || response._start || 0) + (response.count || response._count || 0)) 
            ? ((response.start || response._start || 0) + (response.count || response._count || 0)).toString()
            : undefined
        }
      };
    }

    // Handle simple paginated arrays with metadata
    if (Array.isArray(response) && response.length > 0 && response[0].paging) {
      return {
        elements: response,
        paging: response[0].paging
      };
    }

    // Wrap non-paginated responses
    return {
      elements: Array.isArray(response) ? response : [response],
      paging: {
        pageSize: Array.isArray(response) ? response.length : 1
      }
    };
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(endpoint: string, queryParams?: Record<string, any>): string {
    const url = new URL(`${this.BASE_URL}${endpoint}`);

    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Check and handle rate limits
   */
  private async checkRateLimit(endpoint: string): Promise<void> {
    const limitInfo = this.rateLimitInfo.get(endpoint);
    
    if (!limitInfo) return;

    if (limitInfo.remaining <= 0 && new Date() < limitInfo.reset) {
      const waitTime = limitInfo.reset.getTime() - Date.now();
      
      switch (this.config.rateLimitStrategy) {
        case 'throttle':
          await this.sleep(waitTime);
          break;
        case 'queue':
          await this.queueRequest(waitTime);
          break;
        case 'reject':
          throw new Error(`Rate limit exceeded for ${endpoint}. Reset at ${limitInfo.reset}`);
      }
    }
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimitInfo(response: Response): void {
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');

    if (limit && remaining && reset) {
      const endpoint = new URL(response.url).pathname;
      this.rateLimitInfo.set(endpoint, {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: new Date(parseInt(reset, 10) * 1000)
      });
    }
  }

  /**
   * Parse error response from API
   */
  private async parseErrorResponse(response: Response): Promise<LinkedInAPIError> {
    try {
      const errorBody = await response.json() as any;
      return {
        status: response.status,
        code: errorBody.code || errorBody.errorCode || 'UNKNOWN_ERROR',
        message: errorBody.message || errorBody.error_description || response.statusText,
        requestId: response.headers.get('X-Request-Id') || undefined,
        details: errorBody.details || errorBody
      };
    } catch {
      return {
        status: response.status,
        code: 'PARSE_ERROR',
        message: response.statusText || 'Unknown error occurred'
      };
    }
  }

  /**
   * Handle and transform errors
   */
  private handleError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === 'object' && error.status) {
      return new Error(`LinkedIn API Error (${error.status}): ${error.message || 'Unknown error'}`);
    }

    return new Error('An unexpected error occurred');
  }

  /**
   * Check if request should be retried
   */
  private shouldRetry(error: any): boolean {
    if (!error.status) return false;
    
    // Retry on server errors and rate limits
    return error.status >= 500 || error.status === 429;
  }

  /**
   * Retry a failed request
   */
  private async retryRequest<T>(
    endpoint: string,
    options: RequestOptions,
    attempt: number = 1
  ): Promise<T> {
    if (attempt >= this.config.retryAttempts!) {
      throw new Error(`Max retry attempts (${this.config.retryAttempts}) exceeded for ${endpoint}`);
    }

    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    await this.sleep(delay);

    try {
      return await this.request<T>(endpoint, options);
    } catch (error) {
      if (this.shouldRetry(error)) {
        return this.retryRequest<T>(endpoint, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Queue a request for later execution
   */
  private async queueRequest(delay: number): Promise<void> {
    return new Promise((resolve) => {
      this.requestQueue.push(async () => {
        await this.sleep(delay);
        resolve();
      });
      this.processQueue();
    });
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.requestQueue.length === 0) return;

    this.processing = true;
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        await request();
      }
    }
    this.processing = false;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || this.isTokenExpired()) {
      throw new Error('No valid access token. Please authenticate first.');
    }
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(): boolean {
    if (!this.tokenExpiry) return true;
    return new Date() >= this.tokenExpiry;
  }

  /**
   * Load stored token from disk
   */
  private loadStoredToken(): void {
    try {
      const tokenPath = path.join(os.homedir(), '.linkedin-mcp', 'tokens', 'default.json');
      if (fs.existsSync(tokenPath)) {
        const tokenData = fs.readJsonSync(tokenPath);
        this.setToken(tokenData);
      }
    } catch (error) {
      console.warn('Failed to load stored token:', error);
    }
  }

  /**
   * Set access token
   */
  public setToken(tokenData: TokenResponse): void {
    this.accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 3600;
    const createdAt = tokenData.created_at || Math.floor(Date.now() / 1000);
    this.tokenExpiry = new Date((createdAt + expiresIn) * 1000);
  }

  /**
   * Get authorization URL for OAuth flow
   */
  public getAuthorizationUrl(): string {
    return this.oauthManager.createAuthorizationRequest();
  }

  /**
   * Exchange authorization code for tokens
   */
  public async handleAuthorizationCallback(callbackUrl: string): Promise<TokenResponse> {
    const { code } = this.oauthManager.handleAuthorizationResponse(callbackUrl);
    const tokens = await this.oauthManager.exchangeCodeForTokens(code);
    
    // Store and set the tokens
    this.setToken(tokens);
    this.saveToken(tokens);
    
    return tokens;
  }

  /**
   * Save token to disk
   */
  private saveToken(tokenData: TokenResponse): void {
    const tokenDir = path.join(os.homedir(), '.linkedin-mcp', 'tokens');
    fs.ensureDirSync(tokenDir);
    fs.writeJsonSync(path.join(tokenDir, 'default.json'), tokenData, { spaces: 2 });
  }

  /**
   * Refresh access token
   */
  public async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const tokens = await this.oauthManager.refreshAccessToken(refreshToken);
    this.setToken(tokens);
    this.saveToken(tokens);
    return tokens;
  }

  /**
   * Get current API version
   */
  public getApiVersion(): LinkedInAPIVersion {
    return this.config.apiVersion!;
  }

  /**
   * Set API version for subsequent requests
   */
  public setApiVersion(version: LinkedInAPIVersion): void {
    this.config.apiVersion = version;
    this.versionManager.setVersion(version);
  }

  /**
   * Get rate limit information for an endpoint
   */
  public getRateLimitInfo(endpoint: string): RateLimitInfo | undefined {
    return this.rateLimitInfo.get(endpoint);
  }

  /**
   * Clear rate limit cache
   */
  public clearRateLimitCache(): void {
    this.rateLimitInfo.clear();
  }

  /**
   * Health check for API connectivity
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.request('/me', {
        method: 'GET',
        retry: false
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get available features for the current API version
   */
  public getAvailableFeatures() {
    return this.versionManager.getFeatures();
  }

  /**
   * Check if a specific feature is available in the current version
   */
  public hasFeature(feature: keyof ReturnType<typeof this.versionManager.getFeatures>) {
    return this.versionManager.hasFeature(feature);
  }

  /**
   * Get endpoint mapping for a specific operation
   */
  public getEndpoint(operation: string) {
    return this.versionManager.getEndpoint(operation);
  }

  /**
   * Get migration guide between two versions
   */
  public getMigrationGuide(fromVersion: LinkedInAPIVersion, toVersion: LinkedInAPIVersion) {
    return this.versionManager.getMigrationGuide(fromVersion, toVersion);
  }

  /**
   * Make a version-specific API request using operation name
   */
  public async requestOperation<T>(
    operation: string,
    options: Omit<RequestOptions, 'method'> = {}
  ): Promise<T> {
    const endpoint = this.versionManager.getEndpoint(operation);
    if (!endpoint) {
      throw new Error(`Unknown operation: ${operation} for API version ${this.config.apiVersion}`);
    }

    return this.request<T>(endpoint.path, {
      ...options,
      method: endpoint.method as RequestOptions['method']
    });
  }

  /**
   * Get paginated results using cursor-based pagination (when available)
   */
  public async getCursorPaginated<T>(
    endpoint: string,
    params: { cursor?: string; pageSize?: number; sort?: 'asc' | 'desc'; sortBy?: string } = {},
    options: RequestOptions = {}
  ): Promise<PaginatedResponse<T>> {
    // Check if cursor pagination is supported
    if (!this.versionManager.hasFeature('cursorPagination')) {
      throw new Error(`Cursor-based pagination is not supported in API version ${this.config.apiVersion}`);
    }

    return this.getPaginated<T>(endpoint, {
      cursor: params.cursor,
      pageSize: params.pageSize || 50,
      sort: params.sort,
      sortBy: params.sortBy
    }, options);
  }

  /**
   * Get all pages using cursor-based pagination
   */
  public async *getAllCursorPages<T>(
    endpoint: string,
    params: { pageSize?: number; sort?: 'asc' | 'desc'; sortBy?: string } = {},
    options: RequestOptions = {}
  ): AsyncGenerator<T[], void, unknown> {
    if (!this.versionManager.hasFeature('cursorPagination')) {
      throw new Error(`Cursor-based pagination is not supported in API version ${this.config.apiVersion}`);
    }

    let cursor: string | undefined;
    
    do {
      const response = await this.getCursorPaginated<T>(endpoint, {
        ...params,
        cursor
      }, options);

      if (response.elements.length === 0) {
        break;
      }

      yield response.elements;

      cursor = response.paging.nextCursor;
    } while (cursor);
  }

  /**
   * Get paginated operation results using cursor-based pagination
   */
  public async getOperationPaginated<T>(
    operation: string,
    params: PaginationParams = {},
    options: Omit<RequestOptions, 'method'> = {}
  ): Promise<PaginatedResponse<T>> {
    const endpoint = this.versionManager.getEndpoint(operation);
    if (!endpoint) {
      throw new Error(`Unknown operation: ${operation} for API version ${this.config.apiVersion}`);
    }

    return this.getPaginated<T>(endpoint.path, params, {
      ...options,
      method: endpoint.method as RequestOptions['method']
    });
  }
}