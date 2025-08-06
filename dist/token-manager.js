"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenManager = exports.TokenManager = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class TokenManager {
    tokenDir;
    tokenFile;
    tokenCache = null;
    constructor() {
        // Use environment variable or default path
        this.tokenDir = process.env.LINKEDIN_TOKEN_STORAGE_PATH ||
            path.join(os.homedir(), '.linkedin-mcp', 'tokens');
        this.tokenFile = path.join(this.tokenDir, 'linkedin_token.json');
    }
    /**
     * Initialize token storage directory
     */
    async init() {
        await fs.ensureDir(this.tokenDir);
    }
    /**
     * Save token to persistent storage
     */
    async saveToken(tokenData) {
        await this.init();
        // Add creation timestamp if not present
        if (!tokenData.created_at) {
            tokenData.created_at = Date.now();
        }
        // Save to file
        await fs.writeJson(this.tokenFile, tokenData, { spaces: 2 });
        // Update cache
        this.tokenCache = tokenData;
        console.error(`Token saved to ${this.tokenFile}`);
    }
    /**
     * Load token from persistent storage
     */
    async loadToken() {
        // Check cache first
        if (this.tokenCache && this.isTokenValid(this.tokenCache)) {
            return this.tokenCache;
        }
        // Try to load from file
        try {
            if (await fs.pathExists(this.tokenFile)) {
                const tokenData = await fs.readJson(this.tokenFile);
                if (this.isTokenValid(tokenData)) {
                    this.tokenCache = tokenData;
                    return tokenData;
                }
                else {
                    console.error('Token expired or invalid');
                    // Don't delete the file, just return null
                    // User might want to refresh it
                }
            }
        }
        catch (error) {
            console.error('Error loading token:', error);
        }
        return null;
    }
    /**
     * Get access token string
     */
    async getAccessToken() {
        const tokenData = await this.loadToken();
        return tokenData?.access_token || null;
    }
    /**
     * Check if token is valid (not expired)
     */
    isTokenValid(tokenData) {
        if (!tokenData.access_token) {
            return false;
        }
        // If we have expiry information, check it
        if (tokenData.expires_in && tokenData.created_at) {
            const expiryTime = tokenData.created_at + (tokenData.expires_in * 1000);
            const now = Date.now();
            // Consider token expired if less than 5 minutes remaining
            const bufferTime = 5 * 60 * 1000; // 5 minutes
            if (now >= expiryTime - bufferTime) {
                return false;
            }
        }
        return true;
    }
    /**
     * Clear stored token
     */
    async clearToken() {
        this.tokenCache = null;
        try {
            if (await fs.pathExists(this.tokenFile)) {
                await fs.remove(this.tokenFile);
                console.error('Token cleared');
            }
        }
        catch (error) {
            console.error('Error clearing token:', error);
        }
    }
    /**
     * Check if token exists (without validating)
     */
    async hasToken() {
        return await fs.pathExists(this.tokenFile);
    }
    /**
     * Get token info for debugging
     */
    async getTokenInfo() {
        const exists = await this.hasToken();
        const tokenData = exists ? await this.loadToken() : null;
        const valid = tokenData ? this.isTokenValid(tokenData) : false;
        let expiresIn;
        if (tokenData?.expires_in && tokenData.created_at) {
            const expiryTime = tokenData.created_at + (tokenData.expires_in * 1000);
            const remainingMs = expiryTime - Date.now();
            if (remainingMs > 0) {
                const hours = Math.floor(remainingMs / (1000 * 60 * 60));
                const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                expiresIn = `${hours}h ${minutes}m`;
            }
            else {
                expiresIn = 'Expired';
            }
        }
        return {
            exists,
            valid,
            path: this.tokenFile,
            expiresIn
        };
    }
}
exports.TokenManager = TokenManager;
// Export singleton instance
exports.tokenManager = new TokenManager();
//# sourceMappingURL=token-manager.js.map