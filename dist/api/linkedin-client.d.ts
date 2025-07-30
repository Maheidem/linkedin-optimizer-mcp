/**
 * Comprehensive LinkedIn API Client
 * Implements ALL LinkedIn API endpoints and authentication flows
 */
interface LinkedInClientConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    apiVersion: string;
    baseUrl?: string;
    legacyBaseUrl?: string;
}
export declare class LinkedInAPIClient {
    private config;
    private accessToken?;
    private refreshToken?;
    private tokenExpiry?;
    private rateLimits;
    people: PeopleAPI;
    organizations: OrganizationsAPI;
    content: ContentAPI;
    socialActions: SocialActionsAPI;
    marketing: MarketingAPI;
    talent: TalentAPI;
    learning: LearningAPI;
    messaging: MessagingAPI;
    events: EventsAPI;
    salesNavigator: SalesNavigatorAPI;
    compliance: ComplianceAPI;
    constructor(config: LinkedInClientConfig);
    getAuthorizationUrl(params: {
        scopes: string[];
        state?: string;
        usePKCE?: boolean;
    }): Promise<any>;
    exchangeCodeForToken(params: {
        code: string;
        state?: string;
        codeVerifier?: string;
    }): Promise<any>;
    refreshAccessToken(params: {
        refreshToken: string;
    }): Promise<any>;
    makeRequest(endpoint: string, options?: {
        method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
        data?: any;
        headers?: Record<string, string>;
        useV2?: boolean;
        apiCategory?: string;
    }): Promise<any>;
    private checkRateLimit;
    private updateRateLimitInfo;
    getRateLimits(params?: {
        apiCategory?: string;
    }): Promise<any>;
    getApiHealth(): Promise<any>;
    setAccessToken(token: string, expiresIn?: number): void;
    setRefreshToken(token: string): void;
}
declare class PeopleAPI {
    private client;
    constructor(client: LinkedInAPIClient);
    getProfile(params?: {
        personId?: string;
        fields?: string[];
    }): Promise<any>;
    searchMembers(params?: {
        keywords?: string;
        facets?: any;
        start?: number;
        count?: number;
    }): Promise<any>;
}
declare class OrganizationsAPI {
    private client;
    constructor(client: LinkedInAPIClient);
    getCompany(params: {
        organizationId: string;
        fields?: string[];
    }): Promise<any>;
    getFollowerStats(params: {
        organizationId: string;
        timeIntervals?: any;
    }): Promise<any>;
}
declare class ContentAPI {
    private client;
    constructor(client: LinkedInAPIClient);
    createPost(params: {
        author: string;
        postType: string;
        text?: string;
        media?: any[];
        articleLink?: string;
        pollOptions?: string[];
        visibility?: string;
    }): Promise<any>;
    getPosts(params?: {
        postId?: string;
        author?: string;
        start?: number;
        count?: number;
    }): Promise<any>;
    updatePost(params: {
        postId: string;
        text?: string;
        visibility?: string;
    }): Promise<any>;
    deletePost(params: {
        postId: string;
    }): Promise<any>;
    createUGCPost(params: {
        author: string;
        text?: string;
        media?: any[];
        visibility?: any;
    }): Promise<any>;
    getUploadUrl(params: {
        mediaType: 'IMAGE' | 'VIDEO';
        owner: string;
        filename?: string;
    }): Promise<any>;
    uploadAsset(params: {
        uploadUrl: string;
        filePath: string;
        mediaType: 'IMAGE' | 'VIDEO';
    }): Promise<any>;
}
declare class SocialActionsAPI {
    private client;
    constructor(client: LinkedInAPIClient);
    like(params: {
        targetUrn: string;
        actor: string;
    }): Promise<any>;
    comment(params: {
        targetUrn: string;
        actor: string;
        text: string;
    }): Promise<any>;
    share(params: {
        targetUrn: string;
        actor: string;
        commentary?: string;
    }): Promise<any>;
}
declare class MarketingAPI {
    private client;
    constructor(client: LinkedInAPIClient);
    createCampaign(params: any): Promise<any>;
    getCampaigns(params?: any): Promise<any>;
    updateCampaign(params: any): Promise<any>;
    getAnalytics(params: any): Promise<any>;
    getTargetingFacets(params: {
        facetType: string;
        locale?: string;
    }): Promise<any>;
}
declare class TalentAPI {
    private client;
    constructor(client: LinkedInAPIClient);
    postJob(params: any): Promise<any>;
    searchJobs(params: any): Promise<any>;
    unifiedSearch(params: any): Promise<any>;
}
declare class LearningAPI {
    private client;
    constructor(client: LinkedInAPIClient);
    getCourses(params: any): Promise<any>;
    getClassifications(params: any): Promise<any>;
}
declare class MessagingAPI {
    private client;
    constructor(client: LinkedInAPIClient);
    sendMessage(params: any): Promise<any>;
    getConversations(params: any): Promise<any>;
}
declare class EventsAPI {
    private client;
    constructor(client: LinkedInAPIClient);
    createEvent(params: any): Promise<any>;
    getEvents(params: any): Promise<any>;
}
declare class SalesNavigatorAPI {
    private client;
    constructor(client: LinkedInAPIClient);
    profileAssociation(params: any): Promise<any>;
}
declare class ComplianceAPI {
    private client;
    constructor(client: LinkedInAPIClient);
    getEvents(params: any): Promise<any>;
}
export {};
//# sourceMappingURL=linkedin-client.d.ts.map