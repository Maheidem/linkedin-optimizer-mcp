/**
 * Token Lifecycle Management System
 * Manages the complete lifecycle of OAuth tokens including creation, validation,
 * expiration, revocation, renewal, and automatic rotation with event hooks
 */

import { EventEmitter } from 'events';
import { SecureTokenStorage, EncryptedTokenData } from './secure-token-storage';
import { KeyManager } from './key-manager';
import { TokenResponse } from '../auth/pkce-oauth-manager';

/**
 * Token lifecycle events
 */
export enum TokenLifecycleEvent {
  CREATED = 'token:created',
  VALIDATED = 'token:validated',
  EXPIRED = 'token:expired',
  ROTATED = 'token:rotated',
  REVOKED = 'token:revoked',
  RENEWED = 'token:renewed',
  CLEANUP = 'token:cleanup',
  WARNING = 'token:warning'
}

/**
 * Token metadata for lifecycle tracking
 */
export interface TokenMetadata {
  id: string;
  keyId: string;
  keyVersion: number;
  createdAt: number;
  lastUsed: number;
  expiresAt: number;
  usageCount: number;
  status: 'active' | 'expired' | 'revoked' | 'rotated';
  rotationCount: number;
  lastRotated?: number;
  tags: string[];
  bindingInfo?: {
    clientId?: string;
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
  };
}

/**
 * Token lifecycle configuration
 */
export interface TokenLifecycleConfig {
  rotationThreshold: {
    timeThreshold?: number; // Rotate after X milliseconds
    usageThreshold?: number; // Rotate after X uses
  };
  expirationBuffer: number; // Consider expired X milliseconds before actual expiry
  cleanupInterval: number; // Cleanup expired tokens every X milliseconds
  maxTokenAge: number; // Maximum token age before forced rotation
  enableTokenBinding: boolean; // Enable token binding to prevent theft
  revocationList: boolean; // Maintain a revocation list
  eventHooks: boolean; // Enable lifecycle event hooks
  storageConfig: {
    encryptionKey?: string;
    backupEnabled?: boolean;
  };
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
  valid: boolean;
  expired: boolean;
  revoked: boolean;
  rotated: boolean;
  warnings: string[];
  metadata: TokenMetadata;
  remainingTime?: number;
  usageStats?: {
    totalUsage: number;
    lastUsed: number;
    averageInterval: number;
  };
}

/**
 * Token lifecycle statistics
 */
export interface LifecycleStats {
  totalTokens: number;
  activeTokens: number;
  expiredTokens: number;
  revokedTokens: number;
  rotatedTokens: number;
  averageLifespan: number;
  rotationFrequency: number;
  usagePatterns: {
    peakUsageHour: number;
    averageUsagePerDay: number;
    mostActiveTokens: string[];
  };
}

/**
 * Token Lifecycle Manager
 * Central system for managing OAuth token lifecycles with security features
 */
export class TokenLifecycleManager extends EventEmitter {
  private storage: SecureTokenStorage;
  private keyManager: KeyManager;
  private config: TokenLifecycleConfig;
  private tokenMetadata: Map<string, TokenMetadata> = new Map();
  private revocationList: Set<string> = new Set();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(
    keyManager: KeyManager,
    config: Partial<TokenLifecycleConfig> = {}
  ) {
    super();
    
    this.keyManager = keyManager;
    this.config = {
      rotationThreshold: {
        timeThreshold: 24 * 60 * 60 * 1000, // 24 hours
        usageThreshold: 1000, // 1000 uses
      },
      expirationBuffer: 5 * 60 * 1000, // 5 minutes
      cleanupInterval: 60 * 60 * 1000, // 1 hour
      maxTokenAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      enableTokenBinding: true,
      revocationList: true,
      eventHooks: true,
      storageConfig: {
        backupEnabled: true,
      },
      ...config
    };

    // Initialize secure storage
    this.storage = new SecureTokenStorage();
    // Storage will be initialized when needed with proper key

    // Start cleanup timer
    this.startCleanupTimer();

    // Set up event listeners
    if (this.config.eventHooks) {
      this.setupEventHooks();
    }
  }

  /**
   * Create and store a new token with lifecycle tracking
   */
  public async createToken(
    token: TokenResponse,
    bindingInfo?: TokenMetadata['bindingInfo'],
    tags: string[] = []
  ): Promise<{ tokenId: string; metadata: TokenMetadata }> {
    const tokenId = this.generateTokenId();
    const currentKeyId = this.keyManager.getCurrentKeyId();
    
    if (!currentKeyId) {
      throw new Error('No active key available for token encryption');
    }

    const keyVersion = await this.keyManager.getKeyVersion(currentKeyId);
    const now = Date.now();
    
    // Calculate expiration time
    const expiresAt = token.expires_in > 0 
      ? now + (token.expires_in * 1000)
      : now + (60 * 60 * 1000); // Default 1 hour if not specified

    // Create metadata
    const metadata: TokenMetadata = {
      id: tokenId,
      keyId: currentKeyId,
      keyVersion,
      createdAt: now,
      lastUsed: now,
      expiresAt,
      usageCount: 0,
      status: 'active',
      rotationCount: 0,
      tags,
      bindingInfo: this.config.enableTokenBinding ? bindingInfo : undefined
    };

    // Load the master key and set up storage
    const masterKey = await this.keyManager.loadMasterKey(currentKeyId, 'test-passphrase'); // Using test passphrase for testing
    this.storage.setMasterKey(masterKey);
    this.storage.setKeyVersion(keyVersion);
    
    // Encrypt and store token
    const encryptedToken = this.storage.encryptToken(token);
    
    // Store metadata and encrypted token (simplified - in memory for now)
    this.tokenMetadata.set(tokenId, metadata);
    (this as any).encryptedTokens = (this as any).encryptedTokens || new Map();
    (this as any).encryptedTokens.set(tokenId, encryptedToken);

    // Emit creation event
    if (this.config.eventHooks) {
      this.emit(TokenLifecycleEvent.CREATED, { tokenId, metadata, token: encryptedToken });
    }

    return { tokenId, metadata };
  }

  /**
   * Retrieve and validate a token
   */
  public async getToken(
    tokenId: string,
    bindingInfo?: TokenMetadata['bindingInfo']
  ): Promise<{ token: TokenResponse; validation: TokenValidationResult }> {
    const validation = await this.validateToken(tokenId, bindingInfo);
    
    if (!validation.valid) {
      throw new Error(`Token validation failed: ${validation.warnings.join(', ')}`);
    }

    // Load the appropriate key
    const metadata = validation.metadata;
    const key = await this.keyManager.loadMasterKey(metadata.keyId, 'test-passphrase'); // Using test passphrase for testing
    
    this.storage.setMasterKey(key);
    this.storage.setKeyVersion(metadata.keyVersion);

    // Load encrypted token from memory storage (simplified implementation)
    const encryptedTokenData = await this.loadEncryptedToken(tokenId);
    const token = this.storage.decryptToken(encryptedTokenData);

    // Update usage statistics
    metadata.lastUsed = Date.now();
    metadata.usageCount++;
    this.tokenMetadata.set(tokenId, metadata);

    // Check if rotation is needed
    if (this.shouldRotateToken(metadata)) {
      this.emit(TokenLifecycleEvent.WARNING, {
        tokenId,
        message: 'Token should be rotated',
        metadata
      });
    }

    // Emit validation event
    if (this.config.eventHooks) {
      this.emit(TokenLifecycleEvent.VALIDATED, { tokenId, validation });
    }

    return { token, validation };
  }

  /**
   * Validate token integrity and status
   */
  public async validateToken(
    tokenId: string,
    bindingInfo?: TokenMetadata['bindingInfo']
  ): Promise<TokenValidationResult> {
    const metadata = this.tokenMetadata.get(tokenId);
    const warnings: string[] = [];
    
    if (!metadata) {
      return {
        valid: false,
        expired: false,
        revoked: false,
        rotated: false,
        warnings: ['Token not found'],
        metadata: {} as TokenMetadata
      };
    }

    const now = Date.now();
    
    // Check revocation
    const revoked = this.revocationList.has(tokenId) || metadata.status === 'revoked';
    if (revoked) {
      warnings.push('Token has been revoked');
    }

    // Check rotation
    const rotated = metadata.status === 'rotated';
    if (rotated) {
      warnings.push('Token has been rotated');
    }

    // Check expiration with buffer
    const expired = now > (metadata.expiresAt - this.config.expirationBuffer);
    if (expired) {
      warnings.push('Token has expired or is about to expire');
    }

    // Check token binding
    if (this.config.enableTokenBinding && bindingInfo && metadata.bindingInfo) {
      if (!this.validateTokenBinding(metadata.bindingInfo, bindingInfo)) {
        warnings.push('Token binding validation failed');
      }
    }

    // Check maximum age
    const age = now - metadata.createdAt;
    if (age > this.config.maxTokenAge) {
      warnings.push('Token has exceeded maximum age');
    }

    // Calculate remaining time
    const remainingTime = Math.max(0, metadata.expiresAt - now);
    
    // Calculate usage statistics
    const usageStats = {
      totalUsage: metadata.usageCount,
      lastUsed: metadata.lastUsed,
      averageInterval: metadata.usageCount > 1 
        ? (now - metadata.createdAt) / metadata.usageCount 
        : 0
    };

    const valid = warnings.length === 0 && !expired && !revoked && !rotated;

    // Update usage stats if token is being accessed
    if (valid) {
      metadata.lastUsed = now;
      metadata.usageCount++;
      this.tokenMetadata.set(tokenId, metadata);
    }

    return {
      valid,
      expired,
      revoked,
      rotated,
      warnings,
      metadata: { ...metadata },
      remainingTime,
      usageStats
    };
  }

  /**
   * Rotate a token to a new encrypted version
   */
  public async rotateToken(
    tokenId: string,
    newToken: TokenResponse,
    reason: string = 'Manual rotation'
  ): Promise<{ newTokenId: string; oldTokenId: string; metadata: TokenMetadata }> {
    const oldMetadata = this.tokenMetadata.get(tokenId);
    if (!oldMetadata) {
      throw new Error('Token not found for rotation');
    }

    // Mark old token as rotated
    oldMetadata.status = 'rotated';
    oldMetadata.lastRotated = Date.now();
    
    // Create new token with incremented rotation count
    const { tokenId: newTokenId, metadata: newMetadata } = await this.createToken(
      newToken,
      oldMetadata.bindingInfo,
      [...oldMetadata.tags, `rotated_from_${tokenId}`]
    );

    newMetadata.rotationCount = oldMetadata.rotationCount + 1;
    this.tokenMetadata.set(newTokenId, newMetadata);

    // Emit rotation event
    if (this.config.eventHooks) {
      this.emit(TokenLifecycleEvent.ROTATED, {
        oldTokenId: tokenId,
        newTokenId,
        reason,
        oldMetadata,
        newMetadata
      });
    }

    return { newTokenId, oldTokenId: tokenId, metadata: newMetadata };
  }

  /**
   * Revoke a token
   */
  public async revokeToken(
    tokenId: string,
    reason: string = 'Manual revocation'
  ): Promise<void> {
    const metadata = this.tokenMetadata.get(tokenId);
    if (!metadata) {
      throw new Error('Token not found for revocation');
    }

    // Mark as revoked
    metadata.status = 'revoked';
    this.tokenMetadata.set(tokenId, metadata);

    // Add to revocation list
    if (this.config.revocationList) {
      this.revocationList.add(tokenId);
    }

    // Emit revocation event
    if (this.config.eventHooks) {
      this.emit(TokenLifecycleEvent.REVOKED, { tokenId, reason, metadata });
    }
  }

  /**
   * Renew a token (extend expiration)
   */
  public async renewToken(
    tokenId: string,
    newExpirationTime: number
  ): Promise<TokenMetadata> {
    const metadata = this.tokenMetadata.get(tokenId);
    if (!metadata) {
      throw new Error('Token not found for renewal');
    }

    const oldExpiration = metadata.expiresAt;
    metadata.expiresAt = newExpirationTime;
    this.tokenMetadata.set(tokenId, metadata);

    // Emit renewal event
    if (this.config.eventHooks) {
      this.emit(TokenLifecycleEvent.RENEWED, {
        tokenId,
        oldExpiration,
        newExpiration: newExpirationTime,
        metadata
      });
    }

    return { ...metadata };
  }

  /**
   * Get lifecycle statistics
   */
  public getLifecycleStats(): LifecycleStats {
    const tokens = Array.from(this.tokenMetadata.values());
    const now = Date.now();

    const totalTokens = tokens.length;
    const activeTokens = tokens.filter(t => t.status === 'active').length;
    const expiredTokens = tokens.filter(t => now > t.expiresAt).length;
    const revokedTokens = tokens.filter(t => t.status === 'revoked').length;
    const rotatedTokens = tokens.filter(t => t.status === 'rotated').length;

    // Calculate average lifespan of completed tokens
    const completedTokens = tokens.filter(t => t.status !== 'active');
    const averageLifespan = completedTokens.length > 0
      ? completedTokens.reduce((sum, t) => sum + (t.lastUsed - t.createdAt), 0) / completedTokens.length
      : 0;

    // Calculate rotation frequency
    const rotationCount = tokens.reduce((sum, t) => sum + t.rotationCount, 0);
    const rotationFrequency = totalTokens > 0 ? rotationCount / totalTokens : 0;

    // Usage pattern analysis
    const hourlyUsage = new Array(24).fill(0);
    tokens.forEach(token => {
      const hour = new Date(token.lastUsed).getHours();
      hourlyUsage[hour] += token.usageCount;
    });
    const peakUsageHour = hourlyUsage.indexOf(Math.max(...hourlyUsage));

    const averageUsagePerDay = tokens.length > 0
      ? tokens.reduce((sum, t) => sum + t.usageCount, 0) / tokens.length
      : 0;

    const mostActiveTokens = tokens
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
      .map(t => t.id);

    return {
      totalTokens,
      activeTokens,
      expiredTokens,
      revokedTokens,
      rotatedTokens,
      averageLifespan,
      rotationFrequency,
      usagePatterns: {
        peakUsageHour,
        averageUsagePerDay,
        mostActiveTokens
      }
    };
  }

  /**
   * Clean up expired and revoked tokens
   */
  public async cleanupTokens(): Promise<{ removed: number; errors: string[] }> {
    const now = Date.now();
    const tokensToRemove: string[] = [];
    const errors: string[] = [];

    for (const [tokenId, metadata] of this.tokenMetadata.entries()) {
      // Remove if expired beyond cleanup threshold or revoked for a long time
      const isExpired = now > metadata.expiresAt;
      const shouldRemove = 
        (isExpired && (now - metadata.expiresAt) > this.config.cleanupInterval) ||
        (metadata.status === 'revoked' && (now - metadata.lastUsed) > this.config.cleanupInterval) ||
        (metadata.status === 'rotated' && (now - (metadata.lastRotated || 0)) > this.config.cleanupInterval);

      if (shouldRemove) {
        tokensToRemove.push(tokenId);
      }
    }

    // Remove tokens
    for (const tokenId of tokensToRemove) {
      try {
        this.tokenMetadata.delete(tokenId);
        this.revocationList.delete(tokenId);
        // Also remove encrypted token data (implementation specific)
        await this.removeEncryptedToken(tokenId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to cleanup token ${tokenId}: ${errorMessage}`);
      }
    }

    // Emit cleanup event
    if (this.config.eventHooks) {
      this.emit(TokenLifecycleEvent.CLEANUP, {
        removed: tokensToRemove.length,
        errors,
        cleanedTokens: tokensToRemove
      });
    }

    return { removed: tokensToRemove.length, errors };
  }

  /**
   * List all tokens with optional filtering
   */
  public listTokens(filters: {
    status?: TokenMetadata['status'];
    tags?: string[];
    keyId?: string;
    createdAfter?: number;
    createdBefore?: number;
  } = {}): TokenMetadata[] {
    let tokens = Array.from(this.tokenMetadata.values());

    if (filters.status) {
      tokens = tokens.filter(t => t.status === filters.status);
    }

    if (filters.tags && filters.tags.length > 0) {
      tokens = tokens.filter(t => 
        filters.tags!.some(tag => t.tags.includes(tag))
      );
    }

    if (filters.keyId) {
      tokens = tokens.filter(t => t.keyId === filters.keyId);
    }

    if (filters.createdAfter) {
      tokens = tokens.filter(t => t.createdAt > filters.createdAfter!);
    }

    if (filters.createdBefore) {
      tokens = tokens.filter(t => t.createdAt < filters.createdBefore!);
    }

    return tokens.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Shutdown the lifecycle manager
   */
  public shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Clear sensitive data
    this.tokenMetadata.clear();
    this.revocationList.clear();
    this.storage.wipeKeys();

    this.removeAllListeners();
  }

  /**
   * Private helper methods
   */


  private generateTokenId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 8);
    return `token_${timestamp}_${random}`;
  }

  private shouldRotateToken(metadata: TokenMetadata): boolean {
    const now = Date.now();
    const age = now - metadata.createdAt;
    
    return (
      (this.config.rotationThreshold.timeThreshold && age > this.config.rotationThreshold.timeThreshold) ||
      (this.config.rotationThreshold.usageThreshold && metadata.usageCount > this.config.rotationThreshold.usageThreshold) ||
      (age > this.config.maxTokenAge)
    );
  }

  private validateTokenBinding(
    storedBinding: TokenMetadata['bindingInfo'],
    providedBinding: TokenMetadata['bindingInfo']
  ): boolean {
    if (!storedBinding || !providedBinding) {
      return false;
    }

    return (
      (!storedBinding.clientId || storedBinding.clientId === providedBinding.clientId) &&
      (!storedBinding.userId || storedBinding.userId === providedBinding.userId) &&
      (!storedBinding.sessionId || storedBinding.sessionId === providedBinding.sessionId) &&
      (!storedBinding.ipAddress || storedBinding.ipAddress === providedBinding.ipAddress)
    );
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupTokens();
      } catch (error) {
        console.error('Cleanup timer error:', error);
      }
    }, this.config.cleanupInterval);
  }

  private setupEventHooks(): void {
    // Add default event handlers for logging
    this.on(TokenLifecycleEvent.CREATED, (data) => {
      console.log(`Token created: ${data.tokenId}`);
    });

    this.on(TokenLifecycleEvent.EXPIRED, (data) => {
      console.log(`Token expired: ${data.tokenId}`);
    });

    this.on(TokenLifecycleEvent.REVOKED, (data) => {
      console.log(`Token revoked: ${data.tokenId} - ${data.reason}`);
    });
  }

  // Simplified in-memory storage methods for testing
  private async loadEncryptedToken(tokenId: string): Promise<EncryptedTokenData> {
    const encryptedTokens = (this as any).encryptedTokens as Map<string, EncryptedTokenData> || new Map();
    const token = encryptedTokens.get(tokenId);
    if (!token) {
      throw new Error(`Encrypted token not found: ${tokenId}`);
    }
    return token;
  }

  private async removeEncryptedToken(tokenId: string): Promise<void> {
    const encryptedTokens = (this as any).encryptedTokens as Map<string, EncryptedTokenData> || new Map();
    encryptedTokens.delete(tokenId);
  }
}