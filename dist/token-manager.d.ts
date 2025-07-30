interface TokenData {
    access_token: string;
    expires_at: string;
    refresh_token?: string;
    scope: string;
    encrypted?: boolean;
}
interface StoredTokenData extends TokenData {
    created_at: string;
    last_used?: string;
}
export declare class TokenManager {
    private tokenFilePath;
    private encryptionKey?;
    constructor(customPath?: string);
    private ensureDirectory;
    private encrypt;
    private decrypt;
    saveToken(tokenData: TokenData): Promise<void>;
    getToken(): Promise<StoredTokenData | null>;
    clearToken(): Promise<void>;
    hasValidToken(): Promise<boolean>;
    getTokenExpiryInfo(): Promise<{
        isValid: boolean;
        expiresAt?: Date;
        timeRemaining?: string;
    } | null>;
    static generateEncryptionKey(): string;
}
export {};
//# sourceMappingURL=token-manager.d.ts.map