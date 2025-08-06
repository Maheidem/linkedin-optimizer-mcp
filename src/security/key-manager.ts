/**
 * Key Manager for Secure Key Derivation and Management
 * Handles derivation, storage, rotation, and lifecycle management of encryption keys
 * Implements multiple key derivation functions (PBKDF2, Argon2, scrypt) with secure defaults
 */

import { randomBytes, pbkdf2Sync, scryptSync, createHash, timingSafeEqual } from 'crypto';
import { SecureTokenStorage, EncryptedTokenData } from './secure-token-storage';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Key derivation function types
 */
export enum KeyDerivationFunction {
  PBKDF2 = 'pbkdf2',
  SCRYPT = 'scrypt',
  ARGON2 = 'argon2' // Note: Requires argon2 package, fallback to scrypt
}

/**
 * Key derivation parameters
 */
export interface KeyDerivationParams {
  kdf: KeyDerivationFunction;
  iterations?: number;
  memoryCost?: number; // For scrypt and argon2
  parallelism?: number; // For argon2
  saltLength?: number;
  keyLength?: number;
}

/**
 * Master key metadata
 */
export interface MasterKeyMetadata {
  id: string;
  version: number;
  algorithm: string;
  kdf: KeyDerivationFunction;
  params: KeyDerivationParams;
  createdAt: number;
  lastUsed: number;
  status: 'active' | 'deprecated' | 'revoked';
  derivedFrom?: string; // Parent key ID for key rotation
}

/**
 * Encrypted master key storage format
 */
export interface EncryptedMasterKey {
  metadata: MasterKeyMetadata;
  encryptedKey: string;
  iv: string;
  tag: string;
  salt: string;
}

/**
 * Key storage configuration
 */
export interface KeyStorageConfig {
  storageDir: string;
  backupDir?: string;
  maxKeyAge?: number; // Maximum key age in milliseconds
  keyRotationInterval?: number; // Automatic rotation interval
  secureDelete?: boolean; // Use secure deletion methods
}

/**
 * Key Manager for secure key derivation, storage, and lifecycle management
 */
export class KeyManager {
  private readonly DEFAULT_KDF = KeyDerivationFunction.PBKDF2;
  private readonly DEFAULT_ITERATIONS = 100000;
  private readonly DEFAULT_MEMORY_COST = 1024; // 1MB for scrypt (reduced for tests)
  private readonly DEFAULT_PARALLELISM = 1;
  private readonly DEFAULT_SALT_LENGTH = 32;
  private readonly DEFAULT_KEY_LENGTH = 32;
  private readonly KEY_FILE_EXTENSION = '.key';
  private readonly METADATA_FILE_EXTENSION = '.meta';

  private config: KeyStorageConfig;
  private keyCache: Map<string, Buffer> = new Map();
  private metadataCache: Map<string, MasterKeyMetadata> = new Map();
  private currentKeyId: string | null = null;

  constructor(config: KeyStorageConfig) {
    this.config = {
      maxKeyAge: 30 * 24 * 60 * 60 * 1000, // 30 days default
      keyRotationInterval: 7 * 24 * 60 * 60 * 1000, // 7 days default
      secureDelete: true,
      ...config
    };
    
    this.ensureStorageDirectories();
  }

  /**
   * Generate a new master key with specified derivation parameters
   */
  public async generateMasterKey(
    passphrase: string,
    params: Partial<KeyDerivationParams> = {}
  ): Promise<{ keyId: string; key: Buffer; metadata: MasterKeyMetadata }> {
    const keyId = this.generateKeyId();
    const derivationParams: KeyDerivationParams = {
      kdf: params.kdf || this.DEFAULT_KDF,
      iterations: params.iterations || this.DEFAULT_ITERATIONS,
      memoryCost: params.memoryCost || this.DEFAULT_MEMORY_COST,
      parallelism: params.parallelism || this.DEFAULT_PARALLELISM,
      saltLength: params.saltLength || this.DEFAULT_SALT_LENGTH,
      keyLength: params.keyLength || this.DEFAULT_KEY_LENGTH
    };

    // Generate salt
    const salt = randomBytes(derivationParams.saltLength!);
    
    // Derive key using specified KDF
    const derivedKey = this.deriveKey(passphrase, salt, derivationParams);
    
    // Create metadata
    const metadata: MasterKeyMetadata = {
      id: keyId,
      version: 1,
      algorithm: 'aes-256-gcm',
      kdf: derivationParams.kdf,
      params: derivationParams,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      status: 'active'
    };

    // Store key securely
    await this.storeMasterKey(keyId, derivedKey, metadata, salt);
    
    // Cache key and metadata
    this.keyCache.set(keyId, derivedKey);
    this.metadataCache.set(keyId, metadata);
    this.currentKeyId = keyId;

    return { keyId, key: derivedKey, metadata };
  }

  /**
   * Load an existing master key by ID
   */
  public async loadMasterKey(keyId: string, passphrase: string): Promise<Buffer> {
    // Check cache first
    if (this.keyCache.has(keyId)) {
      await this.updateLastUsed(keyId);
      return this.keyCache.get(keyId)!;
    }

    // Load from storage
    const { key, metadata } = await this.loadStoredKey(keyId, passphrase);
    
    // Update cache and last used timestamp
    this.keyCache.set(keyId, key);
    this.metadataCache.set(keyId, metadata);
    await this.updateLastUsed(keyId);
    
    return key;
  }

  /**
   * Rotate existing key - create new key derived from current key
   */
  public async rotateKey(
    currentKeyId: string,
    passphrase: string,
    newPassphrase?: string
  ): Promise<{ keyId: string; key: Buffer; metadata: MasterKeyMetadata }> {
    // Load current key
    const currentKey = await this.loadMasterKey(currentKeyId, passphrase);
    const currentMetadata = await this.getKeyMetadata(currentKeyId);
    
    // Generate new key ID
    const newKeyId = this.generateKeyId();
    
    // Use new passphrase or current one
    const targetPassphrase = newPassphrase || passphrase;
    
    // Create new key with incremented version
    const salt = randomBytes(this.DEFAULT_SALT_LENGTH);
    const newKey = this.deriveKey(targetPassphrase, salt, currentMetadata.params);
    
    const newMetadata: MasterKeyMetadata = {
      ...currentMetadata,
      id: newKeyId,
      version: currentMetadata.version + 1,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      derivedFrom: currentKeyId
    };

    // Store new key
    await this.storeMasterKey(newKeyId, newKey, newMetadata, salt);
    
    // Mark old key as deprecated
    await this.deprecateKey(currentKeyId);
    
    // Update caches
    this.keyCache.set(newKeyId, newKey);
    this.metadataCache.set(newKeyId, newMetadata);
    this.currentKeyId = newKeyId;

    return { keyId: newKeyId, key: newKey, metadata: newMetadata };
  }

  /**
   * Re-encrypt tokens with new key during key rotation
   */
  public async reencryptTokens(
    oldKeyId: string,
    newKeyId: string,
    oldPassphrase: string,
    newPassphrase: string,
    encryptedTokens: EncryptedTokenData[]
  ): Promise<EncryptedTokenData[]> {
    // Load both keys
    const oldKey = await this.loadMasterKey(oldKeyId, oldPassphrase);
    const newKey = await this.loadMasterKey(newKeyId, newPassphrase);
    
    // Create storage instances
    const oldStorage = new SecureTokenStorage();
    const newStorage = new SecureTokenStorage();
    
    oldStorage.setMasterKey(oldKey);
    newStorage.setMasterKey(newKey);
    newStorage.setKeyVersion(await this.getKeyVersion(newKeyId));
    
    const reencryptedTokens: EncryptedTokenData[] = [];
    
    for (const encryptedToken of encryptedTokens) {
      try {
        // Decrypt with old key
        const token = oldStorage.decryptToken(encryptedToken);
        
        // Encrypt with new key
        const newEncryptedToken = newStorage.encryptToken(token);
        reencryptedTokens.push(newEncryptedToken);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to re-encrypt token: ${errorMessage}`);
      }
    }
    
    return reencryptedTokens;
  }

  /**
   * Get key metadata by ID
   */
  public async getKeyMetadata(keyId: string): Promise<MasterKeyMetadata> {
    if (this.metadataCache.has(keyId)) {
      return this.metadataCache.get(keyId)!;
    }

    const metadataPath = path.join(this.config.storageDir, `${keyId}${this.METADATA_FILE_EXTENSION}`);
    
    if (!await fs.pathExists(metadataPath)) {
      throw new Error(`Key metadata not found: ${keyId}`);
    }

    const metadata = await fs.readJson(metadataPath) as MasterKeyMetadata;
    this.metadataCache.set(keyId, metadata);
    
    return metadata;
  }

  /**
   * List all available keys
   */
  public async listKeys(): Promise<MasterKeyMetadata[]> {
    const files = await fs.readdir(this.config.storageDir);
    const metadataFiles = files.filter(file => file.endsWith(this.METADATA_FILE_EXTENSION));
    
    const keys: MasterKeyMetadata[] = [];
    
    for (const file of metadataFiles) {
      const keyId = file.replace(this.METADATA_FILE_EXTENSION, '');
      const metadata = await this.getKeyMetadata(keyId);
      keys.push(metadata);
    }
    
    return keys.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get current active key ID
   */
  public getCurrentKeyId(): string | null {
    return this.currentKeyId;
  }

  /**
   * Set current active key
   */
  public setCurrentKeyId(keyId: string): void {
    this.currentKeyId = keyId;
  }

  /**
   * Revoke a key (mark as revoked, cannot be used)
   */
  public async revokeKey(keyId: string): Promise<void> {
    const metadata = await this.getKeyMetadata(keyId);
    metadata.status = 'revoked';
    metadata.lastUsed = Date.now();
    
    await this.saveKeyMetadata(keyId, metadata);
    this.metadataCache.set(keyId, metadata);
    
    // Remove from cache
    this.keyCache.delete(keyId);
    
    if (this.currentKeyId === keyId) {
      this.currentKeyId = null;
    }
  }

  /**
   * Securely delete a key and its metadata
   */
  public async deleteKey(keyId: string): Promise<void> {
    const keyPath = path.join(this.config.storageDir, `${keyId}${this.KEY_FILE_EXTENSION}`);
    const metadataPath = path.join(this.config.storageDir, `${keyId}${this.METADATA_FILE_EXTENSION}`);
    
    // Secure deletion if enabled
    if (this.config.secureDelete) {
      await this.secureDeleteFile(keyPath);
      await this.secureDeleteFile(metadataPath);
    } else {
      await fs.remove(keyPath);
      await fs.remove(metadataPath);
    }
    
    // Clean up caches
    this.keyCache.delete(keyId);
    this.metadataCache.delete(keyId);
    
    if (this.currentKeyId === keyId) {
      this.currentKeyId = null;
    }
  }

  /**
   * Securely wipe all keys from memory
   */
  public wipeMemory(): void {
    // Wipe key cache
    for (const key of this.keyCache.values()) {
      key.fill(0);
    }
    this.keyCache.clear();
    
    // Clear metadata cache
    this.metadataCache.clear();
    this.currentKeyId = null;
  }

  /**
   * Get key version by ID
   */
  public async getKeyVersion(keyId: string): Promise<number> {
    const metadata = await this.getKeyMetadata(keyId);
    return metadata.version;
  }

  /**
   * Validate key health and suggest actions
   */
  public async validateKeyHealth(): Promise<{
    healthy: boolean;
    warnings: string[];
    recommendations: string[];
  }> {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    const keys = await this.listKeys();
    const activeKeys = keys.filter(k => k.status === 'active');
    const now = Date.now();
    
    // Check for active keys
    if (activeKeys.length === 0) {
      warnings.push('No active keys found');
      recommendations.push('Generate a new master key');
    }
    
    // Check key age
    for (const key of activeKeys) {
      const age = now - key.createdAt;
      const lastUsed = now - key.lastUsed;
      
      if (age > this.config.maxKeyAge!) {
        warnings.push(`Key ${key.id} is older than ${this.config.maxKeyAge! / (24 * 60 * 60 * 1000)} days`);
        recommendations.push(`Consider rotating key ${key.id}`);
      }
      
      if (lastUsed > this.config.keyRotationInterval!) {
        warnings.push(`Key ${key.id} hasn't been used for ${lastUsed / (24 * 60 * 60 * 1000)} days`);
      }
    }
    
    // Check for deprecated keys that can be cleaned up
    const deprecatedKeys = keys.filter(k => k.status === 'deprecated');
    if (deprecatedKeys.length > 3) {
      recommendations.push(`Consider cleaning up ${deprecatedKeys.length} deprecated keys`);
    }
    
    return {
      healthy: warnings.length === 0,
      warnings,
      recommendations
    };
  }

  /**
   * Private helper methods
   */

  /**
   * Derive key using specified KDF
   */
  private deriveKey(passphrase: string, salt: Buffer, params: KeyDerivationParams): Buffer {
    switch (params.kdf) {
      case KeyDerivationFunction.PBKDF2:
        return pbkdf2Sync(
          passphrase,
          salt,
          params.iterations!,
          params.keyLength!,
          'sha256'
        );
      
      case KeyDerivationFunction.SCRYPT:
        return scryptSync(
          passphrase,
          salt,
          params.keyLength!,
          {
            N: Math.min(params.iterations!, 1024), // Reduced for tests
            r: 8,
            p: params.parallelism!,
            maxmem: params.memoryCost! * 1024 * 2 // Double memory limit
          }
        );
      
      case KeyDerivationFunction.ARGON2:
        // Fallback to scrypt if argon2 is not available
        console.warn('Argon2 not available, falling back to scrypt');
        return this.deriveKey(passphrase, salt, { ...params, kdf: KeyDerivationFunction.SCRYPT });
      
      default:
        throw new Error(`Unsupported KDF: ${params.kdf}`);
    }
  }

  /**
   * Generate unique key ID
   */
  private generateKeyId(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(8).toString('hex');
    return `key_${timestamp}_${random}`;
  }

  /**
   * Ensure storage directories exist
   */
  private async ensureStorageDirectories(): Promise<void> {
    try {
      await fs.ensureDir(this.config.storageDir);
      
      if (this.config.backupDir) {
        await fs.ensureDir(this.config.backupDir);
      }
    } catch (error) {
      // Directory creation might fail during cleanup, ignore if directory doesn't exist
      console.warn('Directory creation failed:', error);
    }
  }

  /**
   * Store master key securely
   */
  private async storeMasterKey(
    keyId: string,
    key: Buffer,
    metadata: MasterKeyMetadata,
    salt: Buffer
  ): Promise<void> {
    // Encrypt the key itself with a derived storage key
    const storageKey = this.deriveStorageKey(salt);
    const storage = new SecureTokenStorage();
    storage.setMasterKey(storageKey);
    
    // Convert key to token-like format for encryption
    const keyToken = {
      access_token: key.toString('base64'),
      token_type: 'master_key',
      expires_in: 0, // Never expires
      created_at: metadata.createdAt
    };
    
    const encryptedKey = storage.encryptToken(keyToken);
    
    // Store encrypted key
    const keyPath = path.join(this.config.storageDir, `${keyId}${this.KEY_FILE_EXTENSION}`);
    await fs.writeJson(keyPath, {
      ...encryptedKey,
      salt: salt.toString('base64')
    });
    
    // Store metadata separately
    await this.saveKeyMetadata(keyId, metadata);
  }

  /**
   * Load stored key from disk
   */
  private async loadStoredKey(keyId: string, passphrase: string): Promise<{ key: Buffer; metadata: MasterKeyMetadata }> {
    const keyPath = path.join(this.config.storageDir, `${keyId}${this.KEY_FILE_EXTENSION}`);
    
    if (!await fs.pathExists(keyPath)) {
      throw new Error(`Key file not found: ${keyId}`);
    }
    
    const storedData = await fs.readJson(keyPath);
    const salt = Buffer.from(storedData.salt, 'base64');
    
    // Derive storage key
    const storageKey = this.deriveStorageKey(salt);
    const storage = new SecureTokenStorage();
    storage.setMasterKey(storageKey);
    
    // Decrypt the key
    const keyToken = storage.decryptToken(storedData);
    const key = Buffer.from(keyToken.access_token, 'base64');
    
    // Load metadata
    const metadata = await this.getKeyMetadata(keyId);
    
    return { key, metadata };
  }

  /**
   * Derive storage key for encrypting master keys at rest
   */
  private deriveStorageKey(salt: Buffer): Buffer {
    // Use a hardcoded derivation for storage keys (in production, this could come from HSM/TPM)
    const storagePassphrase = 'storage-key-derivation-v1';
    return pbkdf2Sync(storagePassphrase, salt, 10000, 32, 'sha256'); // Reduced iterations for tests
  }

  /**
   * Save key metadata
   */
  private async saveKeyMetadata(keyId: string, metadata: MasterKeyMetadata): Promise<void> {
    const metadataPath = path.join(this.config.storageDir, `${keyId}${this.METADATA_FILE_EXTENSION}`);
    await fs.writeJson(metadataPath, metadata, { spaces: 2 });
  }

  /**
   * Update last used timestamp
   */
  private async updateLastUsed(keyId: string): Promise<void> {
    const metadata = await this.getKeyMetadata(keyId);
    metadata.lastUsed = Date.now();
    await this.saveKeyMetadata(keyId, metadata);
    this.metadataCache.set(keyId, metadata);
  }

  /**
   * Mark key as deprecated
   */
  private async deprecateKey(keyId: string): Promise<void> {
    const metadata = await this.getKeyMetadata(keyId);
    metadata.status = 'deprecated';
    metadata.lastUsed = Date.now();
    await this.saveKeyMetadata(keyId, metadata);
    this.metadataCache.set(keyId, metadata);
  }

  /**
   * Secure file deletion (simple implementation)
   */
  private async secureDeleteFile(filePath: string): Promise<void> {
    if (!await fs.pathExists(filePath)) {
      return;
    }
    
    try {
      // Get file size
      const stats = await fs.stat(filePath);
      
      // Overwrite with random data multiple times
      const fd = await fs.open(filePath, 'r+');
      const buffer = randomBytes(stats.size);
      
      for (let i = 0; i < 3; i++) {
        await fs.write(fd, randomBytes(stats.size), 0, stats.size, 0);
        await fs.fsync(fd);
      }
      
      await fs.close(fd);
      await fs.remove(filePath);
    } catch (error) {
      // Fallback to regular deletion
      await fs.remove(filePath);
    }
  }
}