/**
 * Secure Storage Interface for OAuth Tokens at Rest
 * Provides abstract interfaces for secure, persistent token storage with encryption,
 * backup, and integrity verification capabilities
 */

import { EventEmitter } from 'events';
import { EncryptedTokenData } from '../security/secure-token-storage';

/**
 * Storage operation result
 */
export interface StorageOperationResult {
  success: boolean;
  error?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Storage statistics and health information
 */
export interface StorageStats {
  totalTokens: number;
  storageSize: number; // in bytes
  lastBackup?: number;
  lastCleanup?: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
  warnings: string[];
  recommendations: string[];
  fragmentation?: number; // percentage
  uptime: number;
}

/**
 * Storage configuration options
 */
export interface StorageConfig {
  storageDir: string;
  backupDir?: string;
  encryptionEnabled: boolean;
  compressionEnabled?: boolean;
  backupInterval?: number; // milliseconds
  maxBackupFiles?: number;
  integrityCheckInterval?: number; // milliseconds
  autoCleanup?: boolean;
  maxStorageSize?: number; // bytes
  shardingEnabled?: boolean;
  replicationEnabled?: boolean;
}

/**
 * Backup metadata
 */
export interface BackupInfo {
  id: string;
  timestamp: number;
  size: number;
  tokenCount: number;
  checksum: string;
  encrypted: boolean;
  compressed?: boolean;
  version: string;
}

/**
 * Storage query parameters
 */
export interface StorageQuery {
  keyId?: string;
  tokenIds?: string[];
  createdAfter?: number;
  createdBefore?: number;
  status?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Token metadata for storage operations
 */
export interface StoredTokenMetadata {
  id: string;
  keyId: string;
  keyVersion: number;
  created: number;
  lastAccessed?: number;
  accessCount: number;
  status: 'active' | 'expired' | 'revoked' | 'rotated';
  checksum: string;
  size: number;
  tags: string[];
}

/**
 * Abstract secure storage interface
 * Provides contract for secure token storage implementations
 */
export abstract class SecureStorageInterface extends EventEmitter {
  protected config: StorageConfig;
  protected isInitialized: boolean = false;

  constructor(config: StorageConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize storage backend
   */
  abstract initialize(): Promise<StorageOperationResult>;

  /**
   * Shutdown storage backend gracefully
   */
  abstract shutdown(): Promise<StorageOperationResult>;

  /**
   * Store encrypted token data
   */
  abstract store(tokenId: string, encryptedData: EncryptedTokenData, metadata?: Record<string, any>): Promise<StorageOperationResult>;

  /**
   * Retrieve encrypted token data
   */
  abstract retrieve(tokenId: string): Promise<{ data: EncryptedTokenData; metadata?: StoredTokenMetadata } | null>;

  /**
   * Update existing token data
   */
  abstract update(tokenId: string, encryptedData: EncryptedTokenData, metadata?: Record<string, any>): Promise<StorageOperationResult>;

  /**
   * Remove token from storage
   */
  abstract remove(tokenId: string, secure?: boolean): Promise<StorageOperationResult>;

  /**
   * Check if token exists in storage
   */
  abstract exists(tokenId: string): Promise<boolean>;

  /**
   * List tokens based on query parameters
   */
  abstract list(query?: StorageQuery): Promise<StoredTokenMetadata[]>;

  /**
   * Get storage statistics and health information
   */
  abstract getStats(): Promise<StorageStats>;

  /**
   * Create backup of storage data
   */
  abstract backup(compress?: boolean): Promise<BackupInfo>;

  /**
   * Restore from backup
   */
  abstract restore(backupId: string): Promise<StorageOperationResult>;

  /**
   * List available backups
   */
  abstract listBackups(): Promise<BackupInfo[]>;

  /**
   * Verify integrity of stored data
   */
  abstract verifyIntegrity(): Promise<{ valid: boolean; errors: string[]; repaired?: number }>;

  /**
   * Cleanup expired and invalid entries
   */
  abstract cleanup(): Promise<{ removed: number; reclaimed: number; errors: string[] }>;

  /**
   * Compact storage to reduce fragmentation
   */
  abstract compact(): Promise<StorageOperationResult>;

  /**
   * Encrypt data at rest (if not already encrypted)
   */
  abstract encryptStorage(newKeyId: string): Promise<StorageOperationResult>;

  /**
   * Search tokens by content or metadata
   */
  abstract search(query: string, fields?: string[]): Promise<StoredTokenMetadata[]>;

  /**
   * Batch operations for performance
   */
  abstract batch(operations: BatchOperation[]): Promise<StorageOperationResult[]>;

  /**
   * Get configuration
   */
  getConfig(): StorageConfig {
    return { ...this.config };
  }

  /**
   * Check if storage is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Event handling methods - inherited from EventEmitter
   * Available: on, emit, removeListener, removeAllListeners, etc.
   */
}

/**
 * Batch operation definition
 */
export interface BatchOperation {
  type: 'store' | 'retrieve' | 'update' | 'remove';
  tokenId: string;
  data?: EncryptedTokenData;
  metadata?: Record<string, any>;
}

/**
 * Storage event types for monitoring
 */
export enum StorageEvent {
  INITIALIZED = 'storage:initialized',
  STORED = 'storage:stored',
  RETRIEVED = 'storage:retrieved',
  UPDATED = 'storage:updated',
  REMOVED = 'storage:removed',
  BACKUP_CREATED = 'storage:backup_created',
  BACKUP_RESTORED = 'storage:backup_restored',
  INTEGRITY_CHECK = 'storage:integrity_check',
  CLEANUP = 'storage:cleanup',
  ERROR = 'storage:error',
  WARNING = 'storage:warning'
}

/**
 * Storage event data
 */
export interface StorageEventData {
  event: StorageEvent;
  tokenId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
  error?: string;
}

/**
 * Storage utilities
 */
export class StorageUtils {
  /**
   * Calculate checksum for data integrity
   */
  static calculateChecksum(data: Buffer | string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
  }

  /**
   * Compress data using gzip
   */
  static async compress(data: Buffer): Promise<Buffer> {
    const zlib = require('zlib');
    return new Promise((resolve, reject) => {
      zlib.gzip(data, (err: Error | null, result: Buffer) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Decompress gzipped data
   */
  static async decompress(data: Buffer): Promise<Buffer> {
    const zlib = require('zlib');
    return new Promise((resolve, reject) => {
      zlib.gunzip(data, (err: Error | null, result: Buffer) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Generate unique backup ID
   */
  static generateBackupId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 8);
    return `backup_${timestamp}_${random}`;
  }

  /**
   * Validate storage path
   */
  static validateStoragePath(path: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const fs = require('fs');

    if (!path) {
      errors.push('Storage path is required');
    } else {
      try {
        const stats = fs.statSync(path);
        if (!stats.isDirectory()) {
          errors.push('Storage path must be a directory');
        }
      } catch (error) {
        errors.push(`Storage path does not exist or is not accessible: ${path}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Format bytes for human reading
   */
  static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Generate secure random filename
   */
  static generateSecureFilename(prefix: string = 'token', extension: string = '.dat'): string {
    const crypto = require('crypto');
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString('hex');
    return `${prefix}_${timestamp}_${random}${extension}`;
  }
}