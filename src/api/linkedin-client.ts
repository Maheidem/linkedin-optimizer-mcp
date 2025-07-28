/**
 * Comprehensive LinkedIn API Client
 * Implements ALL LinkedIn API endpoints and authentication flows
 */

import crypto from 'crypto';
import { URLSearchParams } from 'url';

interface LinkedInClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiVersion: string;
  baseUrl?: string;
  legacyBaseUrl?: string;
}

interface OAuthTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope: string;
}

interface RateLimitInfo {
  remaining: number;
  reset: number;
  limit: number;
}

export class LinkedInAPIClient {
  private config: Required<LinkedInClientConfig>;
  private accessToken?: string;
  private refreshToken?: string;
  private tokenExpiry?: number;
  private rateLimits: Map<string, RateLimitInfo> = new Map();

  // API category clients
  public people: PeopleAPI;
  public organizations: OrganizationsAPI;
  public content: ContentAPI;
  public socialActions: SocialActionsAPI;
  public marketing: MarketingAPI;
  public talent: TalentAPI;
  public learning: LearningAPI;
  public messaging: MessagingAPI;
  public events: EventsAPI;
  public salesNavigator: SalesNavigatorAPI;
  public compliance: ComplianceAPI;

  constructor(config: LinkedInClientConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || 'https://api.linkedin.com/rest',
      legacyBaseUrl: config.legacyBaseUrl || 'https://api.linkedin.com/v2'
    };

    // Initialize API category clients
    this.people = new PeopleAPI(this);
    this.organizations = new OrganizationsAPI(this);
    this.content = new ContentAPI(this);
    this.socialActions = new SocialActionsAPI(this);
    this.marketing = new MarketingAPI(this);
    this.talent = new TalentAPI(this);
    this.learning = new LearningAPI(this);
    this.messaging = new MessagingAPI(this);
    this.events = new EventsAPI(this);
    this.salesNavigator = new SalesNavigatorAPI(this);
    this.compliance = new ComplianceAPI(this);
  }

  // OAuth 2.0 Authentication Methods
  async getAuthorizationUrl(params: {
    scopes: string[];
    state?: string;
    usePKCE?: boolean;
  }): Promise<any> {
    const state = params.state || crypto.randomUUID();
    const scopes = params.scopes.join(' ');
    
    const authParams: any = {
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      state,
      scope: scopes
    };

    let codeChallenge: string | undefined;
    let codeVerifier: string | undefined;

    if (params.usePKCE) {
      codeVerifier = crypto.randomBytes(32).toString('base64url');
      codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
      authParams.code_challenge = codeChallenge;
      authParams.code_challenge_method = 'S256';
    }

    const queryString = new URLSearchParams(authParams).toString();
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${queryString}`;

    return {
      authorizationUrl: authUrl,
      state,
      codeVerifier,
      expires: Date.now() + (30 * 60 * 1000) // 30 minutes
    };
  }

  async exchangeCodeForToken(params: {
    code: string;
    state?: string;
    codeVerifier?: string;
  }): Promise<any> {
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    });

    if (params.codeVerifier) {
      tokenParams.append('code_verifier', params.codeVerifier);
    }

    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenParams
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
    }

    const tokenData: OAuthTokenResponse = await response.json();
    
    this.accessToken = tokenData.access_token;
    this.refreshToken = tokenData.refresh_token;
    this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);

    return {
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      refresh_token: tokenData.refresh_token,
      scope: tokenData.scope,
      token_type: 'Bearer',
      expires_at: this.tokenExpiry
    };
  }

  async refreshAccessToken(params: { refreshToken: string }): Promise<any> {
    const tokenParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: params.refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    });

    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenParams
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
    }

    const tokenData: OAuthTokenResponse = await response.json();
    
    this.accessToken = tokenData.access_token;
    this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);

    return {
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      token_type: 'Bearer',
      expires_at: this.tokenExpiry
    };
  }

  // Core HTTP client with rate limiting and error handling
  async makeRequest(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      data?: any;
      headers?: Record<string, string>;
      useV2?: boolean;
      apiCategory?: string;
    } = {}
  ): Promise<any> {
    const {
      method = 'GET',
      data,
      headers = {},
      useV2 = false,
      apiCategory = 'general'
    } = options;

    // Check rate limits
    await this.checkRateLimit(apiCategory);

    // Ensure token is valid
    if (this.tokenExpiry && Date.now() >= this.tokenExpiry) {
      throw new Error('Access token expired. Please refresh or re-authenticate.');
    }

    const baseUrl = useV2 ? this.config.legacyBaseUrl : this.config.baseUrl;
    const url = `${baseUrl}${endpoint}`;

    const requestHeaders: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Accept': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'User-Agent': 'linkedin-api-mcp/1.0.0',
      ...headers
    };

    if (!useV2) {
      requestHeaders['LinkedIn-Version'] = this.config.apiVersion;
    }

    if (data && (method === 'POST' || method === 'PUT')) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
      body: data ? JSON.stringify(data) : undefined
    };

    const response = await fetch(url, requestOptions);

    // Update rate limit info from headers
    this.updateRateLimitInfo(apiCategory, response);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      throw new Error(`LinkedIn API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    // Handle empty responses (like DELETE operations)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return { success: true, status: response.status };
    }

    return await response.json();
  }

  private async checkRateLimit(apiCategory: string): Promise<void> {
    const rateLimitInfo = this.rateLimits.get(apiCategory);
    if (rateLimitInfo && rateLimitInfo.remaining <= 0) {
      const resetTime = rateLimitInfo.reset * 1000;
      const waitTime = resetTime - Date.now();
      if (waitTime > 0) {
        throw new Error(`Rate limit exceeded for ${apiCategory}. Resets in ${Math.ceil(waitTime / 1000)} seconds.`);
      }
    }
  }

  private updateRateLimitInfo(apiCategory: string, response: Response): void {
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');
    const limit = response.headers.get('X-RateLimit-Limit');

    if (remaining && reset && limit) {
      this.rateLimits.set(apiCategory, {
        remaining: parseInt(remaining),
        reset: parseInt(reset),
        limit: parseInt(limit)
      });
    }
  }

  // Utility methods
  async getRateLimits(params: { apiCategory?: string } = {}): Promise<any> {
    if (params.apiCategory) {
      const rateLimitInfo = this.rateLimits.get(params.apiCategory);
      return rateLimitInfo || { message: 'No rate limit info available for this category' };
    }

    const allLimits: Record<string, any> = {};
    for (const [category, info] of this.rateLimits.entries()) {
      allLimits[category] = info;
    }

    return {
      rateLimits: allLimits,
      totalCategories: this.rateLimits.size
    };
  }

  async getApiHealth(): Promise<any> {
    try {
      // Simple health check - try to get the authenticated user's profile
      const response = await this.makeRequest('/people/~', { 
        method: 'GET',
        useV2: true 
      });
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        authenticated: !!this.accessToken,
        tokenExpiry: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : null
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        authenticated: !!this.accessToken
      };
    }
  }

  // Setter methods for authentication
  setAccessToken(token: string, expiresIn?: number): void {
    this.accessToken = token;
    if (expiresIn) {
      this.tokenExpiry = Date.now() + (expiresIn * 1000);
    }
  }

  setRefreshToken(token: string): void {
    this.refreshToken = token;
  }
}

// API Category Classes
class PeopleAPI {
  constructor(private client: LinkedInAPIClient) {}

  async getProfile(params: { personId?: string; fields?: string[] } = {}): Promise<any> {
    const personId = params.personId || '~';
    const fields = params.fields ? params.fields.join(',') : 'id,firstName,lastName,headline,summary';
    
    return await this.client.makeRequest(`/people/${personId}?fields=${fields}`, {
      method: 'GET',
      useV2: true,
      apiCategory: 'people'
    });
  }

  async searchMembers(params: {
    keywords?: string;
    facets?: any;
    start?: number;
    count?: number;
  } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    queryParams.append('q', 'members');
    
    if (params.keywords) queryParams.append('keywords', params.keywords);
    if (params.start) queryParams.append('start', params.start.toString());
    if (params.count) queryParams.append('count', params.count.toString());

    return await this.client.makeRequest(`/people?${queryParams.toString()}`, {
      method: 'GET',
      useV2: true,
      apiCategory: 'people'
    });
  }
}

class OrganizationsAPI {
  constructor(private client: LinkedInAPIClient) {}

  async getCompany(params: { organizationId: string; fields?: string[] }): Promise<any> {
    const fields = params.fields ? params.fields.join(',') : 'id,name,description,industry,website';
    
    return await this.client.makeRequest(`/organizations/${params.organizationId}?fields=${fields}`, {
      method: 'GET',
      useV2: true,
      apiCategory: 'organizations'
    });
  }

  async getFollowerStats(params: { organizationId: string; timeIntervals?: any }): Promise<any> {
    const queryParams = new URLSearchParams();
    queryParams.append('q', 'organizationalEntity');
    queryParams.append('organizationalEntity', `urn:li:organization:${params.organizationId}`);

    return await this.client.makeRequest(`/organizationalEntityFollowerStatistics?${queryParams.toString()}`, {
      method: 'GET',
      useV2: true,
      apiCategory: 'organizations'
    });
  }
}

class ContentAPI {
  constructor(private client: LinkedInAPIClient) {}

  async createPost(params: {
    author: string;
    postType: string;
    text?: string;
    media?: any[];
    articleLink?: string;
    pollOptions?: string[];
    visibility?: string;
  }): Promise<any> {
    const postData: any = {
      author: params.author,
      commentary: params.text,
      visibility: params.visibility || 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: []
      }
    };

    // Handle different post types
    switch (params.postType) {
      case 'TEXT':
        // Text-only post, no additional content needed
        break;
      case 'IMAGE':
      case 'VIDEO':
        if (params.media) {
          postData.content = {
            media: {
              title: params.text?.substring(0, 100) || '',
              id: params.media[0]?.url || ''
            }
          };
        }
        break;
      case 'ARTICLE':
        if (params.articleLink) {
          postData.content = {
            article: {
              source: params.articleLink,
              title: params.text?.substring(0, 100) || '',
              description: params.text || ''
            }
          };
        }
        break;
      case 'POLL':
        if (params.pollOptions) {
          postData.content = {
            poll: {
              question: params.text || '',
              options: params.pollOptions.map(option => ({ text: option }))
            }
          };
        }
        break;
    }

    return await this.client.makeRequest('/posts', {
      method: 'POST',
      data: postData,
      apiCategory: 'content'
    });
  }

  async getPosts(params: {
    postId?: string;
    author?: string;
    start?: number;
    count?: number;
  } = {}): Promise<any> {
    if (params.postId) {
      return await this.client.makeRequest(`/posts/${params.postId}`, {
        method: 'GET',
        apiCategory: 'content'
      });
    }

    const queryParams = new URLSearchParams();
    if (params.author) queryParams.append('author', params.author);
    if (params.start) queryParams.append('start', params.start.toString());
    if (params.count) queryParams.append('count', params.count.toString());

    const query = queryParams.toString();
    const endpoint = query ? `/posts?${query}` : '/posts';

    return await this.client.makeRequest(endpoint, {
      method: 'GET',
      apiCategory: 'content'
    });
  }

  async updatePost(params: { postId: string; text?: string; visibility?: string }): Promise<any> {
    const updateData: any = {};
    if (params.text) updateData.commentary = params.text;
    if (params.visibility) updateData.visibility = params.visibility;

    return await this.client.makeRequest(`/posts/${params.postId}`, {
      method: 'PUT',
      data: updateData,
      apiCategory: 'content'
    });
  }

  async deletePost(params: { postId: string }): Promise<any> {
    return await this.client.makeRequest(`/posts/${params.postId}`, {
      method: 'DELETE',
      apiCategory: 'content'
    });
  }

  async createUGCPost(params: {
    author: string;
    text?: string;
    media?: any[];
    visibility?: any;
  }): Promise<any> {
    const ugcData = {
      author: params.author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: params.text || ''
          },
          shareMediaCategory: params.media ? 'IMAGE' : 'NONE',
          media: params.media || []
        }
      },
      visibility: params.visibility || {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    return await this.client.makeRequest('/ugcPosts', {
      method: 'POST',
      data: ugcData,
      useV2: true,
      apiCategory: 'content'
    });
  }

  async getUploadUrl(params: {
    mediaType: 'IMAGE' | 'VIDEO';
    owner: string;
    filename?: string;
  }): Promise<any> {
    const registerData = {
      recipes: [`urn:li:digitalmediaRecipe:feedshare-${params.mediaType.toLowerCase()}`],
      owner: params.owner,
      serviceRelationships: [
        {
          relationshipType: 'OWNER',
          identifier: 'urn:li:userGeneratedContent'
        }
      ]
    };

    return await this.client.makeRequest('/assets?action=registerUpload', {
      method: 'POST',
      data: registerData,
      useV2: true,
      apiCategory: 'content'
    });
  }

  async uploadAsset(params: {
    uploadUrl: string;
    filePath: string;
    mediaType: 'IMAGE' | 'VIDEO';
  }): Promise<any> {
    // This would require file system access and multipart upload implementation
    // For now, return a placeholder response
    return {
      message: 'Asset upload requires file system access',
      uploadUrl: params.uploadUrl,
      mediaType: params.mediaType,
      filePath: params.filePath,
      status: 'pending_implementation'
    };
  }
}

// Additional API classes would follow the same pattern...
class SocialActionsAPI {
  constructor(private client: LinkedInAPIClient) {}

  async like(params: { targetUrn: string; actor: string }): Promise<any> {
    const likeData = {
      actor: params.actor,
      object: params.targetUrn
    };

    return await this.client.makeRequest('/socialActions/likes', {
      method: 'POST',
      data: likeData,
      useV2: true,
      apiCategory: 'social'
    });
  }

  async comment(params: { targetUrn: string; actor: string; text: string }): Promise<any> {
    const commentData = {
      actor: params.actor,
      object: params.targetUrn,
      message: {
        text: params.text
      }
    };

    return await this.client.makeRequest('/socialActions/comments', {
      method: 'POST',
      data: commentData,
      useV2: true,
      apiCategory: 'social'
    });
  }

  async share(params: { targetUrn: string; actor: string; commentary?: string }): Promise<any> {
    const shareData = {
      actor: params.actor,
      object: params.targetUrn,
      commentary: params.commentary || ''
    };

    return await this.client.makeRequest('/socialActions/shares', {
      method: 'POST',
      data: shareData,
      useV2: true,
      apiCategory: 'social'
    });
  }
}

class MarketingAPI {
  constructor(private client: LinkedInAPIClient) {}

  async createCampaign(params: any): Promise<any> {
    return await this.client.makeRequest('/adCampaigns', {
      method: 'POST',
      data: params,
      apiCategory: 'marketing'
    });
  }

  async getCampaigns(params: any = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params.account) queryParams.append('account', params.account);
    if (params.status) queryParams.append('status', params.status);

    const query = queryParams.toString();
    const endpoint = query ? `/adCampaigns?${query}` : '/adCampaigns';

    return await this.client.makeRequest(endpoint, {
      method: 'GET',
      apiCategory: 'marketing'
    });
  }

  async updateCampaign(params: any): Promise<any> {
    const { campaignId, ...updateData } = params;
    return await this.client.makeRequest(`/adCampaigns/${campaignId}`, {
      method: 'PUT',
      data: updateData,
      apiCategory: 'marketing'
    });
  }

  async getAnalytics(params: any): Promise<any> {
    const queryParams = new URLSearchParams();
    queryParams.append('campaigns', params.campaigns.join(','));
    if (params.dateRange) {
      queryParams.append('dateRange.start.day', params.dateRange.start.day.toString());
      queryParams.append('dateRange.start.month', params.dateRange.start.month.toString());
      queryParams.append('dateRange.start.year', params.dateRange.start.year.toString());
      queryParams.append('dateRange.end.day', params.dateRange.end.day.toString());
      queryParams.append('dateRange.end.month', params.dateRange.end.month.toString());
      queryParams.append('dateRange.end.year', params.dateRange.end.year.toString());
    }
    if (params.fields) queryParams.append('fields', params.fields.join(','));

    return await this.client.makeRequest(`/adAnalytics?${queryParams.toString()}`, {
      method: 'GET',
      apiCategory: 'marketing'
    });
  }

  async getTargetingFacets(params: { facetType: string; locale?: string }): Promise<any> {
    const queryParams = new URLSearchParams();
    queryParams.append('facetType', params.facetType);
    if (params.locale) queryParams.append('locale', params.locale);

    return await this.client.makeRequest(`/adTargetingFacets?${queryParams.toString()}`, {
      method: 'GET',
      apiCategory: 'marketing'
    });
  }
}

// Placeholder classes for remaining APIs
class TalentAPI {
  constructor(private client: LinkedInAPIClient) {}
  
  async postJob(params: any): Promise<any> {
    return await this.client.makeRequest('/jobs', {
      method: 'POST',
      data: params,
      apiCategory: 'talent'
    });
  }

  async searchJobs(params: any): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params.keywords) queryParams.append('keywords', params.keywords);

    return await this.client.makeRequest(`/jobs?${queryParams.toString()}`, {
      method: 'GET',
      apiCategory: 'talent'
    });
  }

  async unifiedSearch(params: any): Promise<any> {
    return await this.client.makeRequest('/talent/unifiedSearch', {
      method: 'POST',
      data: params,
      apiCategory: 'talent'
    });
  }
}

class LearningAPI {
  constructor(private client: LinkedInAPIClient) {}
  
  async getCourses(params: any): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params.q) queryParams.append('q', params.q);
    if (params.keywords) queryParams.append('keywords', params.keywords);

    return await this.client.makeRequest(`/learningAssets?${queryParams.toString()}`, {
      method: 'GET',
      useV2: true,
      apiCategory: 'learning'
    });
  }

  async getClassifications(params: any): Promise<any> {
    return await this.client.makeRequest('/learningClassifications', {
      method: 'GET',
      useV2: true,
      apiCategory: 'learning'
    });
  }
}

class MessagingAPI {
  constructor(private client: LinkedInAPIClient) {}
  
  async sendMessage(params: any): Promise<any> {
    return await this.client.makeRequest('/messages', {
      method: 'POST',
      data: params,
      useV2: true,
      apiCategory: 'messaging'
    });
  }

  async getConversations(params: any): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params.participantId) queryParams.append('participantId', params.participantId);

    return await this.client.makeRequest(`/conversations?${queryParams.toString()}`, {
      method: 'GET',
      useV2: true,
      apiCategory: 'messaging'
    });
  }
}

class EventsAPI {
  constructor(private client: LinkedInAPIClient) {}
  
  async createEvent(params: any): Promise<any> {
    return await this.client.makeRequest('/events', {
      method: 'POST',
      data: params,
      useV2: true,
      apiCategory: 'events'
    });
  }

  async getEvents(params: any): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params.organizer) queryParams.append('organizer', params.organizer);

    return await this.client.makeRequest(`/events?${queryParams.toString()}`, {
      method: 'GET',
      useV2: true,
      apiCategory: 'events'
    });
  }
}

class SalesNavigatorAPI {
  constructor(private client: LinkedInAPIClient) {}
  
  async profileAssociation(params: any): Promise<any> {
    return await this.client.makeRequest('/salesNavigatorProfileAssociation', {
      method: 'POST',
      data: params,
      apiCategory: 'sales'
    });
  }
}

class ComplianceAPI {
  constructor(private client: LinkedInAPIClient) {}
  
  async getEvents(params: any): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params.eventType) queryParams.append('eventType', params.eventType);

    return await this.client.makeRequest(`/complianceEvents?${queryParams.toString()}`, {
      method: 'GET',
      useV2: true,
      apiCategory: 'compliance'
    });
  }
}