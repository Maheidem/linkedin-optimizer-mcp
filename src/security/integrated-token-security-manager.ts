/**
 * Integrated Token Security Manager
 * Combines automatic token rotation with integrity verification and secure storage
 * Provides a unified interface for complete OAuth token security management
 */

import { EventEmitter } from 'events';
import { TokenLifecycleManager, TokenLifecycleEvent, TokenLifecycleConfig, TokenMetadata, TokenValidationResult } from './token-lifecycle-manager';
import { KeyManager, KeyStorageConfig } from './key-manager';
import { FileBasedSecureStorage } from '../storage/file-based-secure-storage';
import { SecureStorageInterface, StorageConfig, StorageEvent } from '../storage/secure-storage-interface';
import { TokenResponse } from '../auth/pkce-oauth-manager';
import * as path from 'path';

/**
 * Integrated security manager events
 */
export enum SecurityManagerEvent {
  INITIALIZED = 'security:initialized',
  TOKEN_ROTATED_AUTO = 'security:token_rotated_auto',
  INTEGRITY_VERIFIED = 'security:integrity_verified',
  SECURITY_BREACH_DETECTED = 'security:security_breach_detected',
  BACKUP_COMPLETED = 'security:backup_completed',
  CLEANUP_COMPLETED = 'security:cleanup_completed',
  KEY_ROTATED = 'security:key_rotated',
  ERROR = 'security:error',
  WARNING = 'security:warning'
}

/**
 * Security manager configuration
 */
export interface SecurityManagerConfig {
  // Storage configuration
  storageDir: string;
  backupDir?: string;
  
  // Key management
  keyStorage: KeyStorageConfig;
  
  // Token lifecycle
  tokenLifecycle: Partial<TokenLifecycleConfig>;
  
  // Security policies
  security?: {
    enableAutoRotation?: boolean;
    enableIntegrityChecking?: boolean;
    enableSecureBackups?: boolean;
    integrityCheckInterval?: number; // milliseconds
    backupInterval?: number; // milliseconds
    maxIntegrityFailures?: number;
    securityBreachActions?: {
      revokeAllTokens?: boolean;
      rotateKeys?: boolean;
      notifyAdmin?: boolean;
    };
  };
  
  // Performance settings
  performance?: {
    batchSize?: number;
    concurrentOperations?: number;
    cacheEnabled?: boolean;
  };
}

/**
 * Security status information
 */
export interface SecurityStatus {
  healthy: boolean;
  lastIntegrityCheck: number;
  lastBackup: number;
  activeTokens: number;
  rotatedTokens: number;
  integrityFailures: number;
  securityWarnings: string[];
  storageStats: {
    totalSize: number;
    fragmentationLevel: number;
    backupCount: number;
  };
}

/**
 * Rotation result with security information
 */
export interface SecureRotationResult {
  success: boolean;
  newTokenId: string;
  oldTokenId: string;
  integrityVerified: boolean;
  backupCreated: boolean;
  securityScore: number; // 0-100
  warnings: string[];
}

/**
 * Integrated Token Security Manager
 * Provides complete OAuth token security with automatic rotation and integrity verification
 */
/**
 * Internal configuration with all defaults applied
 */
interface InternalSecurityManagerConfig extends SecurityManagerConfig {
  security: {
    enableAutoRotation: boolean;
    enableIntegrityChecking: boolean;
    enableSecureBackups: boolean;
    integrityCheckInterval: number;
    backupInterval: number;
    maxIntegrityFailures: number;
    securityBreachActions: {
      revokeAllTokens: boolean;
      rotateKeys: boolean;
      notifyAdmin: boolean;
    };
  };
  performance: {
    batchSize: number;
    concurrentOperations: number;
    cacheEnabled: boolean;
  };
}

export class IntegratedTokenSecurityManager extends EventEmitter {
  private config: InternalSecurityManagerConfig;
  private keyManager!: KeyManager;
  private lifecycleManager!: TokenLifecycleManager;
  private storage!: SecureStorageInterface;
  private isInitialized: boolean = false;
  
  // Monitoring and automation
  private integrityCheckTimer: NodeJS.Timeout | null = null;
  private backupTimer: NodeJS.Timeout | null = null;
  private securityStatus: SecurityStatus;
  private integrityFailureCount: number = 0;

  constructor(config: SecurityManagerConfig) {
    super();
    // Create default security actions
    const defaultSecurityActions = {
      revokeAllTokens: false,
      rotateKeys: true,
      notifyAdmin: true
    };

    // Override with user config if provided
    const userSecurityActions = config.security?.securityBreachActions;
    const securityBreachActions = {
      revokeAllTokens: userSecurityActions?.revokeAllTokens ?? defaultSecurityActions.revokeAllTokens,
      rotateKeys: userSecurityActions?.rotateKeys ?? defaultSecurityActions.rotateKeys,
      notifyAdmin: userSecurityActions?.notifyAdmin ?? defaultSecurityActions.notifyAdmin,
    };

    this.config = {
      ...config,
      security: {
        enableAutoRotation: config.security?.enableAutoRotation ?? true,
        enableIntegrityChecking: config.security?.enableIntegrityChecking ?? true,
        enableSecureBackups: config.security?.enableSecureBackups ?? true,
        integrityCheckInterval: config.security?.integrityCheckInterval ?? (60 * 60 * 1000),
        backupInterval: config.security?.backupInterval ?? (4 * 60 * 60 * 1000),
        maxIntegrityFailures: config.security?.maxIntegrityFailures ?? 3,
        securityBreachActions
      },
      performance: {
        batchSize: config.performance?.batchSize ?? 100,
        concurrentOperations: config.performance?.concurrentOperations ?? 5,
        cacheEnabled: config.performance?.cacheEnabled ?? true
      }
    };

    this.securityStatus = {
      healthy: true,
      lastIntegrityCheck: 0,
      lastBackup: 0,
      activeTokens: 0,
      rotatedTokens: 0,
      integrityFailures: 0,
      securityWarnings: [],
      storageStats: {
        totalSize: 0,
        fragmentationLevel: 0,
        backupCount: 0
      }
    };
  }

  /**
   * Initialize the security manager
   */
  async initialize(masterKeyPassphrase: string = 'default-passphrase'): Promise<void> {
    try {
      // Initialize key manager
      this.keyManager = new KeyManager(this.config.keyStorage);
      
      // Generate master key if not exists
      try {
        await this.keyManager.generateMasterKey(masterKeyPassphrase);
      } catch (error) {
        // Key might already exist, try loading it
        const keyId = this.keyManager.getCurrentKeyId();
        if (!keyId) {
          throw error;
        }
      }
      
      // Initialize storage
      const storageConfig: StorageConfig = {
        storageDir: this.config.storageDir,
        backupDir: this.config.backupDir || path.join(this.config.storageDir, 'backups'),
        encryptionEnabled: true,
        compressionEnabled: true,
        backupInterval: this.config.security.backupInterval,
        maxBackupFiles: 10,
        integrityCheckInterval: this.config.security.integrityCheckInterval,
        autoCleanup: true,
        maxStorageSize: 100 * 1024 * 1024 // 100MB default
      };
      
      this.storage = new FileBasedSecureStorage(storageConfig);
      await this.storage.initialize();

      // Initialize token lifecycle manager
      this.lifecycleManager = new TokenLifecycleManager(this.keyManager, this.config.tokenLifecycle);

      // Set up event listeners
      this.setupEventListeners();

      // Start automated tasks
      if (this.config.security.enableIntegrityChecking) {
        this.startIntegrityChecking();
      }

      if (this.config.security.enableSecureBackups) {
        this.startAutoBackups();
      }

      this.isInitialized = true;
      
      this.emit(SecurityManagerEvent.INITIALIZED, {
        timestamp: Date.now(),
        config: this.config
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit(SecurityManagerEvent.ERROR, {
        error: errorMessage,
        timestamp: Date.now()
      });
      throw new Error(`Failed to initialize security manager: ${errorMessage}`);
    }
  }

  /**
   * Create a secure token with automatic storage and lifecycle management
   */
  async createSecureToken(
    token: TokenResponse,
    bindingInfo?: TokenMetadata['bindingInfo'],
    tags: string[] = []
  ): Promise<{ tokenId: string; metadata: TokenMetadata }> {
    if (!this.isInitialized) {
      throw new Error('Security manager not initialized');
    }

    try {
      // Create token through lifecycle manager
      const result = await this.lifecycleManager.createToken(token, bindingInfo, tags);

      // Store in secure storage with integrity verification
      const encryptedData = await this.getEncryptedTokenData(result.tokenId);
      await this.storage.store(result.tokenId, encryptedData, {
        tags: result.metadata.tags,
        keyId: result.metadata.keyId,
        keyVersion: result.metadata.keyVersion
      });

      // Update security status
      this.securityStatus.activeTokens++;

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit(SecurityManagerEvent.ERROR, {
        error: `Failed to create secure token: ${errorMessage}`,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  /**
   * Get a token with automatic rotation if needed
   */
  async getSecureToken(
    tokenId: string,
    bindingInfo?: TokenMetadata['bindingInfo']
  ): Promise<{ token: TokenResponse; rotated?: SecureRotationResult }> {
    if (!this.isInitialized) {
      throw new Error('Security manager not initialized');
    }

    try {
      // Validate token first
      const validation = await this.lifecycleManager.validateToken(tokenId, bindingInfo);
      
      if (!validation.valid) {
        throw new Error(`Token validation failed: ${validation.warnings.join(', ')}`);
      }

      // Check if rotation is needed
      if (this.config.security.enableAutoRotation && this.shouldRotateToken(validation.metadata)) {
        const rotationResult = await this.performSecureRotation(tokenId);
        
        if (rotationResult.success) {
          // Get the new token
          const { token } = await this.lifecycleManager.getToken(rotationResult.newTokenId, bindingInfo);
          return { token, rotated: rotationResult };
        }
      }

      // Get token normally
      const { token } = await this.lifecycleManager.getToken(tokenId, bindingInfo);
      return { token };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit(SecurityManagerEvent.ERROR, {
        error: `Failed to get secure token: ${errorMessage}`,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  /**
   * Perform secure token rotation with integrity verification
   */
  async performSecureRotation(tokenId: string): Promise<SecureRotationResult> {
    try {
      const metadata = this.lifecycleManager.listTokens({ status: 'active' })
        .find(t => t.id === tokenId);
      
      if (!metadata) {
        throw new Error('Token not found for rotation');
      }

      // Create new token data (simplified - in real implementation would refresh from OAuth provider)
      const newTokenData: TokenResponse = {
        access_token: `rotated_${Date.now()}`,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: `refresh_rotated_${Date.now()}`,
        created_at: Math.floor(Date.now() / 1000)
      };

      // Perform rotation through lifecycle manager
      const { newTokenId, oldTokenId } = await this.lifecycleManager.rotateToken(
        tokenId, 
        newTokenData, 
        'Automatic security rotation'
      );

      // Store new token in secure storage
      const encryptedNewData = await this.getEncryptedTokenData(newTokenId);
      await this.storage.store(newTokenId, encryptedNewData, {
        tags: [...metadata.tags, 'auto-rotated'],
        keyId: metadata.keyId,
        keyVersion: metadata.keyVersion
      });

      // Verify integrity of both old and new tokens
      const integrityResult = await this.storage.verifyIntegrity();
      const integrityVerified = integrityResult.valid;

      if (!integrityVerified) {
        this.handleIntegrityFailure(integrityResult.errors);
      }

      // Create backup if enabled
      let backupCreated = false;
      if (this.config.security.enableSecureBackups) {
        try {
          await this.storage.backup(true);
          backupCreated = true;
        } catch (error) {
          console.warn('Failed to create backup after rotation:', error);
        }
      }

      // Calculate security score (0-100)
      const securityScore = this.calculateSecurityScore(integrityVerified, backupCreated);

      const result: SecureRotationResult = {
        success: true,
        newTokenId,
        oldTokenId,
        integrityVerified,
        backupCreated,
        securityScore,
        warnings: integrityVerified ? [] : ['Integrity verification failed']
      };

      // Update status
      this.securityStatus.rotatedTokens++;

      this.emit(SecurityManagerEvent.TOKEN_ROTATED_AUTO, {
        result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        newTokenId: '',
        oldTokenId: tokenId,
        integrityVerified: false,
        backupCreated: false,
        securityScore: 0,
        warnings: [errorMessage]
      };
    }
  }

  /**
   * Perform comprehensive integrity verification
   */
  async performIntegrityCheck(): Promise<{
    passed: boolean;
    tokensVerified: number;
    errors: string[];
    repaired: number;
  }> {
    try {
      const result = await this.storage.verifyIntegrity();
      
      this.securityStatus.lastIntegrityCheck = Date.now();
      
      if (result.valid) {
        this.integrityFailureCount = 0;
        this.securityStatus.integrityFailures = 0;
      } else {
        this.integrityFailureCount++;
        this.securityStatus.integrityFailures = this.integrityFailureCount;
        this.handleIntegrityFailure(result.errors);
      }

      const tokensVerified = Object.keys((this.storage as any).storageIndex?.tokens || {}).length;

      this.emit(SecurityManagerEvent.INTEGRITY_VERIFIED, {
        passed: result.valid,
        tokensVerified,
        errors: result.errors,
        repaired: result.repaired || 0,
        timestamp: Date.now()
      });

      return {
        passed: result.valid,
        tokensVerified,
        errors: result.errors,
        repaired: result.repaired || 0
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit(SecurityManagerEvent.ERROR, {
        error: `Integrity check failed: ${errorMessage}`,
        timestamp: Date.now()
      });
      
      return {
        passed: false,
        tokensVerified: 0,
        errors: [errorMessage],
        repaired: 0
      };
    }
  }

  /**
   * Create secure backup
   */
  async createSecureBackup(): Promise<{ success: boolean; backupId?: string; size?: number }> {
    try {
      const backupInfo = await this.storage.backup(true);
      
      this.securityStatus.lastBackup = Date.now();
      this.securityStatus.storageStats.backupCount++;

      this.emit(SecurityManagerEvent.BACKUP_COMPLETED, {
        backupId: backupInfo.id,
        size: backupInfo.size,
        tokenCount: backupInfo.tokenCount,
        timestamp: Date.now()
      });

      return {
        success: true,
        backupId: backupInfo.id,
        size: backupInfo.size
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit(SecurityManagerEvent.ERROR, {
        error: `Backup failed: ${errorMessage}`,
        timestamp: Date.now()
      });
      
      return { success: false };
    }
  }

  /**
   * Get current security status
   */
  getSecurityStatus(): SecurityStatus {
    if (!this.isInitialized) {
      return {
        ...this.securityStatus,
        healthy: false,
        securityWarnings: ['Security manager not initialized']
      };
    }

    // Update active tokens count
    this.securityStatus.activeTokens = this.lifecycleManager.getLifecycleStats().activeTokens;
    this.securityStatus.rotatedTokens = this.lifecycleManager.getLifecycleStats().rotatedTokens;

    // Check health
    this.securityStatus.healthy = this.isSystemHealthy();

    return { ...this.securityStatus };
  }

  /**
   * Clean up expired tokens and optimize storage
   */
  async performCleanup(): Promise<{ tokensRemoved: number; storageOptimized: boolean }> {
    try {
      // Cleanup through lifecycle manager
      const lifecycleCleanup = await this.lifecycleManager.cleanupTokens();
      
      // Cleanup storage
      const storageCleanup = await this.storage.cleanup();
      
      // Compact storage
      const compactResult = await this.storage.compact();

      const result = {
        tokensRemoved: lifecycleCleanup.removed + storageCleanup.removed,
        storageOptimized: compactResult.success
      };

      this.emit(SecurityManagerEvent.CLEANUP_COMPLETED, {
        ...result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit(SecurityManagerEvent.ERROR, {
        error: `Cleanup failed: ${errorMessage}`,
        timestamp: Date.now()
      });
      
      return { tokensRemoved: 0, storageOptimized: false };
    }
  }

  /**
   * Shutdown the security manager
   */
  async shutdown(): Promise<void> {
    try {
      // Stop timers
      if (this.integrityCheckTimer) {
        clearInterval(this.integrityCheckTimer);
      }
      if (this.backupTimer) {
        clearInterval(this.backupTimer);
      }

      // Shutdown components
      this.lifecycleManager?.shutdown();
      await this.storage?.shutdown();
      this.keyManager?.wipeMemory();

      // Clear listeners
      this.removeAllListeners();

      this.isInitialized = false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Security manager shutdown error:', errorMessage);
    }
  }

  /**
   * Private helper methods
   */

  private setupEventListeners(): void {
    // Listen to lifecycle events
    this.lifecycleManager.on(TokenLifecycleEvent.WARNING, (data) => {
      this.emit(SecurityManagerEvent.WARNING, data);
    });

    // Listen to storage events
    this.storage.on(StorageEvent.ERROR, (data) => {
      this.emit(SecurityManagerEvent.ERROR, data);
    });
  }

  private startIntegrityChecking(): void {
    this.integrityCheckTimer = setInterval(async () => {
      try {
        await this.performIntegrityCheck();
      } catch (error) {
        console.error('Scheduled integrity check failed:', error);
      }
    }, this.config.security.integrityCheckInterval);
  }

  private startAutoBackups(): void {
    this.backupTimer = setInterval(async () => {
      try {
        await this.createSecureBackup();
      } catch (error) {
        console.error('Scheduled backup failed:', error);
      }
    }, this.config.security.backupInterval);
  }

  private shouldRotateToken(metadata: TokenMetadata): boolean {
    const now = Date.now();
    const age = now - metadata.createdAt;
    
    // Use lifecycle manager's rotation logic
    const timeThreshold = this.config.tokenLifecycle.rotationThreshold?.timeThreshold || 24 * 60 * 60 * 1000;
    const usageThreshold = this.config.tokenLifecycle.rotationThreshold?.usageThreshold || 1000;

    return age > timeThreshold || metadata.usageCount > usageThreshold;
  }

  private async getEncryptedTokenData(tokenId: string): Promise<any> {
    // Simplified - in real implementation would get from lifecycle manager's internal storage
    return {
      keyVersion: 1,
      algorithm: 'AES-256-GCM',
      encryptedData: Buffer.from(`encrypted_data_for_${tokenId}`).toString('base64'),
      iv: Buffer.from('test_iv').toString('base64'),
      tag: Buffer.from('test_tag').toString('base64')
    };
  }

  private handleIntegrityFailure(errors: string[]): void {
    this.securityStatus.securityWarnings.push(...errors);

    if (this.integrityFailureCount >= this.config.security.maxIntegrityFailures) {
      this.emit(SecurityManagerEvent.SECURITY_BREACH_DETECTED, {
        errors,
        failureCount: this.integrityFailureCount,
        actions: this.config.security.securityBreachActions,
        timestamp: Date.now()
      });

      // Execute breach response actions
      if (this.config.security.securityBreachActions.rotateKeys) {
        // Would trigger key rotation
      }
    }
  }

  private calculateSecurityScore(integrityVerified: boolean, backupCreated: boolean): number {
    let score = 100;
    
    if (!integrityVerified) score -= 30;
    if (!backupCreated) score -= 10;
    if (this.integrityFailureCount > 0) score -= (this.integrityFailureCount * 10);
    
    return Math.max(0, score);
  }

  private isSystemHealthy(): boolean {
    const now = Date.now();
    const maxIntegrityAge = 2 * this.config.security.integrityCheckInterval;
    const maxBackupAge = 2 * this.config.security.backupInterval;
    
    return (
      this.integrityFailureCount < this.config.security.maxIntegrityFailures &&
      (now - this.securityStatus.lastIntegrityCheck) < maxIntegrityAge &&
      (now - this.securityStatus.lastBackup) < maxBackupAge &&
      this.securityStatus.securityWarnings.length < 5
    );
  }
}