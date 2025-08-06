interface TokenData {
    access_token: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
    created_at?: number;
    refresh_token?: string;
}
export declare class TokenManager {
    private tokenDir;
    private tokenFile;
    private tokenCache;
    constructor();
    /**
     * Initialize token storage directory
     */
    init(): Promise<void>;
    /**
     * Save token to persistent storage
     */
    saveToken(tokenData: TokenData): Promise<void>;
    /**
     * Load token from persistent storage
     */
    loadToken(): Promise<TokenData | null>;
    /**
     * Get access token string
     */
    getAccessToken(): Promise<string | null>;
    /**
     * Check if token is valid (not expired)
     */
    private isTokenValid;
    /**
     * Clear stored token
     */
    clearToken(): Promise<void>;
    /**
     * Check if token exists (without validating)
     */
    hasToken(): Promise<boolean>;
    /**
     * Get token info for debugging
     */
    getTokenInfo(): Promise<{
        exists: boolean;
        valid: boolean;
        path: string;
        expiresIn?: string;
    }>;
}
export declare const tokenManager: TokenManager;
export {};
//# sourceMappingURL=token-manager.d.ts.map