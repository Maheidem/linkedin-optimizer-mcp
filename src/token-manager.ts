import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

interface TokenData {
  access_token: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  created_at?: number;
  refresh_token?: string;
}

export class TokenManager {
  private tokenDir: string;
  private tokenFile: string;
  private tokenCache: TokenData | null = null;

  constructor() {
    // Use environment variable or default path
    this.tokenDir = process.env.LINKEDIN_TOKEN_STORAGE_PATH || 
                    path.join(os.homedir(), '.linkedin-mcp', 'tokens');
    this.tokenFile = path.join(this.tokenDir, 'linkedin_token.json');
  }

  /**
   * Initialize token storage directory
   */
  async init(): Promise<void> {
    await fs.ensureDir(this.tokenDir);
  }

  /**
   * Save token to persistent storage
   */
  async saveToken(tokenData: TokenData): Promise<void> {
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
  async loadToken(): Promise<TokenData | null> {
    // Check cache first
    if (this.tokenCache && this.isTokenValid(this.tokenCache)) {
      return this.tokenCache;
    }

    // Try to load from file
    try {
      if (await fs.pathExists(this.tokenFile)) {
        const tokenData = await fs.readJson(this.tokenFile) as TokenData;
        
        if (this.isTokenValid(tokenData)) {
          this.tokenCache = tokenData;
          return tokenData;
        } else {
          console.error('Token expired or invalid');
          // Don't delete the file, just return null
          // User might want to refresh it
        }
      }
    } catch (error) {
      console.error('Error loading token:', error);
    }

    return null;
  }

  /**
   * Get access token string
   */
  async getAccessToken(): Promise<string | null> {
    const tokenData = await this.loadToken();
    return tokenData?.access_token || null;
  }

  /**
   * Check if token is valid (not expired)
   */
  private isTokenValid(tokenData: TokenData): boolean {
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
  async clearToken(): Promise<void> {
    this.tokenCache = null;
    
    try {
      if (await fs.pathExists(this.tokenFile)) {
        await fs.remove(this.tokenFile);
        console.error('Token cleared');
      }
    } catch (error) {
      console.error('Error clearing token:', error);
    }
  }

  /**
   * Check if token exists (without validating)
   */
  async hasToken(): Promise<boolean> {
    return await fs.pathExists(this.tokenFile);
  }

  /**
   * Get token info for debugging
   */
  async getTokenInfo(): Promise<{
    exists: boolean;
    valid: boolean;
    path: string;
    expiresIn?: string;
  }> {
    const exists = await this.hasToken();
    const tokenData = exists ? await this.loadToken() : null;
    const valid = tokenData ? this.isTokenValid(tokenData) : false;
    
    let expiresIn: string | undefined;
    if (tokenData?.expires_in && tokenData.created_at) {
      const expiryTime = tokenData.created_at + (tokenData.expires_in * 1000);
      const remainingMs = expiryTime - Date.now();
      
      if (remainingMs > 0) {
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        expiresIn = `${hours}h ${minutes}m`;
      } else {
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

// Export singleton instance
export const tokenManager = new TokenManager();