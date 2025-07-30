import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { homedir } from 'os';
export class TokenManager {
    tokenFilePath;
    encryptionKey;
    constructor(customPath) {
        // Store tokens in user's home directory for security
        const configDir = path.join(homedir(), '.linkedin-mcp');
        this.tokenFilePath = customPath || path.join(configDir, 'tokens.json');
        // Use environment variable for encryption key if available
        const envKey = process.env.LINKEDIN_MCP_ENCRYPTION_KEY;
        if (envKey) {
            this.encryptionKey = Buffer.from(envKey, 'hex');
        }
    }
    async ensureDirectory() {
        const dir = path.dirname(this.tokenFilePath);
        try {
            await fs.access(dir);
        }
        catch {
            await fs.mkdir(dir, { recursive: true, mode: 0o700 }); // Secure directory permissions
        }
    }
    encrypt(text) {
        if (!this.encryptionKey)
            return text;
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }
    decrypt(text) {
        if (!this.encryptionKey)
            return text;
        const parts = text.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    async saveToken(tokenData) {
        await this.ensureDirectory();
        const storedData = {
            ...tokenData,
            created_at: new Date().toISOString(),
            encrypted: !!this.encryptionKey
        };
        // Encrypt sensitive token data
        if (this.encryptionKey) {
            storedData.access_token = this.encrypt(tokenData.access_token);
            if (tokenData.refresh_token) {
                storedData.refresh_token = this.encrypt(tokenData.refresh_token);
            }
        }
        // Save with restricted permissions
        await fs.writeFile(this.tokenFilePath, JSON.stringify(storedData, null, 2), { mode: 0o600 } // Read/write for owner only
        );
    }
    async getToken() {
        try {
            const data = await fs.readFile(this.tokenFilePath, 'utf8');
            const storedData = JSON.parse(data);
            // Decrypt if necessary
            if (storedData.encrypted && this.encryptionKey) {
                storedData.access_token = this.decrypt(storedData.access_token);
                if (storedData.refresh_token) {
                    storedData.refresh_token = this.decrypt(storedData.refresh_token);
                }
            }
            // Check if token is expired
            const expiresAt = new Date(storedData.expires_at);
            if (expiresAt <= new Date()) {
                return null; // Token expired
            }
            // Update last used timestamp
            storedData.last_used = new Date().toISOString();
            await this.saveToken(storedData);
            return storedData;
        }
        catch (error) {
            // File doesn't exist or is corrupted
            return null;
        }
    }
    async clearToken() {
        try {
            await fs.unlink(this.tokenFilePath);
        }
        catch {
            // File doesn't exist, ignore
        }
    }
    async hasValidToken() {
        const token = await this.getToken();
        return token !== null;
    }
    async getTokenExpiryInfo() {
        try {
            const data = await fs.readFile(this.tokenFilePath, 'utf8');
            const storedData = JSON.parse(data);
            const expiresAt = new Date(storedData.expires_at);
            const now = new Date();
            const isValid = expiresAt > now;
            if (isValid) {
                const msRemaining = expiresAt.getTime() - now.getTime();
                const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
                const minutesRemaining = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
                return {
                    isValid,
                    expiresAt,
                    timeRemaining: `${hoursRemaining}h ${minutesRemaining}m`
                };
            }
            return { isValid: false, expiresAt };
        }
        catch {
            return null;
        }
    }
    // Generate a secure encryption key
    static generateEncryptionKey() {
        return crypto.randomBytes(32).toString('hex');
    }
}
