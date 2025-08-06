/**
 * File-Based Secure Storage Implementation
 * Provides persistent, encrypted storage for OAuth tokens using filesystem with
 * backup, integrity verification, and secure deletion capabilities
 */

import { EventEmitter } from 'events';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import { 
  SecureStorageInterface, 
  StorageConfig, 
  StorageOperationResult, 
  StorageStats, 
  BackupInfo, 
  StorageQuery, 
  StoredTokenMetadata, 
  BatchOperation, 
  StorageEvent, 
  StorageEventData,
  StorageUtils
} from './secure-storage-interface';
import { EncryptedTokenData } from '../security/secure-token-storage';

/**
 * File-based storage structure
 */
interface StorageIndex {
  version: string;
  created: number;
  lastModified: number;
  tokens: Record<string, StoredTokenMetadata>;
  keyRotationHistory: Array<{
    keyId: string;
    rotatedAt: number;
    tokensAffected: number;
  }>;
  stats: {
    totalOperations: number;
    lastBackup?: number;
    lastCleanup?: number;
    lastIntegrityCheck?: number;
  };
}

/**
 * File-based secure storage implementation
 */
export class FileBasedSecureStorage extends SecureStorageInterface {
  private storageIndex: StorageIndex;
  private indexPath: string;
  private tokensDir: string;
  private backupDir: string;
  private encryptionKey: Buffer | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private integrityTimer: NodeJS.Timeout | null = null;
  private backupTimer: NodeJS.Timeout | null = null;

  private readonly VERSION = '1.0.0';
  private readonly INDEX_FILE = 'storage.index';
  private readonly TOKENS_DIR = 'tokens';
  private readonly BACKUP_DIR = 'backups';
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly IV_LENGTH = 16;
  private readonly TAG_LENGTH = 16;

  constructor(config: StorageConfig) {
    super(config);
    this.indexPath = path.join(config.storageDir, this.INDEX_FILE);
    this.tokensDir = path.join(config.storageDir, this.TOKENS_DIR);
    this.backupDir = config.backupDir || path.join(config.storageDir, this.BACKUP_DIR);
    
    // Initialize storage index structure
    this.storageIndex = {
      version: this.VERSION,
      created: Date.now(),
      lastModified: Date.now(),
      tokens: {},
      keyRotationHistory: [],
      stats: {
        totalOperations: 0,
        lastBackup: undefined,
        lastCleanup: undefined,
        lastIntegrityCheck: undefined
      }
    };
  }

  /**
   * Initialize storage backend
   */
  async initialize(): Promise<StorageOperationResult> {
    try {
      // Validate storage path
      const pathValidation = StorageUtils.validateStoragePath(this.config.storageDir);
      if (!pathValidation.valid) {
        return {
          success: false,
          error: `Storage path validation failed: ${pathValidation.errors.join(', ')}`,
          timestamp: Date.now()
        };
      }

      // Create necessary directories
      await this.createDirectories();

      // Generate or load encryption key
      if (this.config.encryptionEnabled) {
        await this.initializeEncryption();
      }

      // Load existing index or create new one
      await this.loadOrCreateIndex();

      // Start background tasks
      this.startBackgroundTasks();

      this.isInitialized = true;

      this.emit(StorageEvent.INITIALIZED, {
        event: StorageEvent.INITIALIZED,
        timestamp: Date.now(),
        metadata: { tokensCount: Object.keys(this.storageIndex.tokens).length }
      });

      return {
        success: true,
        timestamp: Date.now(),
        metadata: { 
          version: this.VERSION,
          encryptionEnabled: this.config.encryptionEnabled,
          tokensLoaded: Object.keys(this.storageIndex.tokens).length
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Storage initialization failed: ${errorMessage}`,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Shutdown storage backend gracefully
   */
  async shutdown(): Promise<StorageOperationResult> {
    try {
      // Stop background tasks
      this.stopBackgroundTasks();

      // Save final index
      await this.saveIndex();

      // Clear sensitive data
      if (this.encryptionKey) {
        this.encryptionKey.fill(0);
        this.encryptionKey = null;
      }

      // Clear event listeners
      this.removeAllListeners();

      this.isInitialized = false;

      return {
        success: true,
        timestamp: Date.now()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Storage shutdown failed: ${errorMessage}`,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Store encrypted token data
   */
  async store(tokenId: string, encryptedData: EncryptedTokenData, metadata?: Record<string, any>): Promise<StorageOperationResult> {
    if (!this.isInitialized) {
      return this.createErrorResult('Storage not initialized');
    }

    try {
      const tokenPath = this.getTokenPath(tokenId);
      const serializedData = JSON.stringify(encryptedData);
      let dataToStore = Buffer.from(serializedData, 'utf8');

      // Compress if enabled
      if (this.config.compressionEnabled) {
        dataToStore = await StorageUtils.compress(dataToStore);
      }

      // Encrypt at rest if enabled
      if (this.config.encryptionEnabled && this.encryptionKey) {
        dataToStore = this.encryptAtRest(dataToStore);
      }

      // Calculate checksum before compression/encryption for consistency
      const checksum = StorageUtils.calculateChecksum(Buffer.from(serializedData, 'utf8'));

      // Write to file
      await fs.writeFile(tokenPath, dataToStore);

      // Update index
      const tokenMetadata: StoredTokenMetadata = {
        id: tokenId,
        keyId: encryptedData.keyVersion.toString(),
        keyVersion: encryptedData.keyVersion,
        created: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0,
        status: 'active',
        checksum,
        size: dataToStore.length,
        tags: metadata?.tags || []
      };

      this.storageIndex.tokens[tokenId] = tokenMetadata;
      this.storageIndex.lastModified = Date.now();
      this.storageIndex.stats.totalOperations++;

      await this.saveIndex();

      this.emit(StorageEvent.STORED, {
        event: StorageEvent.STORED,
        tokenId,
        timestamp: Date.now(),
        metadata: { size: dataToStore.length, keyVersion: encryptedData.keyVersion }
      });

      return {
        success: true,
        timestamp: Date.now(),
        metadata: { size: dataToStore.length, checksum }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit(StorageEvent.ERROR, {
        event: StorageEvent.ERROR,
        tokenId,
        timestamp: Date.now(),
        error: errorMessage
      });
      return this.createErrorResult(`Failed to store token: ${errorMessage}`);
    }
  }

  /**
   * Retrieve encrypted token data
   */
  async retrieve(tokenId: string): Promise<{ data: EncryptedTokenData; metadata?: StoredTokenMetadata } | null> {
    if (!this.isInitialized) {
      throw new Error('Storage not initialized');
    }

    try {
      const tokenMetadata = this.storageIndex.tokens[tokenId];
      if (!tokenMetadata) {
        return null;
      }

      const tokenPath = this.getTokenPath(tokenId);
      
      if (!await fs.pathExists(tokenPath)) {
        // File missing, clean up index
        delete this.storageIndex.tokens[tokenId];
        await this.saveIndex();
        return null;
      }

      let dataBuffer = await fs.readFile(tokenPath);

      // Decrypt if encrypted at rest
      if (this.config.encryptionEnabled && this.encryptionKey) {
        dataBuffer = this.decryptAtRest(dataBuffer);
      }

      // Decompress if compressed
      if (this.config.compressionEnabled) {
        dataBuffer = await StorageUtils.decompress(dataBuffer);
      }

      // Parse encrypted data
      const encryptedData = JSON.parse(dataBuffer.toString('utf8')) as EncryptedTokenData;

      // Verify checksum on original JSON data for consistency
      const expectedChecksum = tokenMetadata.checksum;
      const actualChecksum = StorageUtils.calculateChecksum(dataBuffer);
      
      if (expectedChecksum !== actualChecksum) {
        throw new Error(`Checksum mismatch for token ${tokenId}`);
      }

      // Update access statistics
      tokenMetadata.lastAccessed = Date.now();
      tokenMetadata.accessCount++;
      this.storageIndex.lastModified = Date.now();
      await this.saveIndex();

      this.emit(StorageEvent.RETRIEVED, {
        event: StorageEvent.RETRIEVED,
        tokenId,
        timestamp: Date.now(),
        metadata: { accessCount: tokenMetadata.accessCount }
      });

      return {
        data: encryptedData,
        metadata: { ...tokenMetadata }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit(StorageEvent.ERROR, {
        event: StorageEvent.ERROR,
        tokenId,
        timestamp: Date.now(),
        error: errorMessage
      });
      throw new Error(`Failed to retrieve token: ${errorMessage}`);
    }
  }

  /**
   * Update existing token data
   */
  async update(tokenId: string, encryptedData: EncryptedTokenData, metadata?: Record<string, any>): Promise<StorageOperationResult> {
    if (!this.storageIndex.tokens[tokenId]) {
      return this.createErrorResult('Token not found');
    }

    // Update is essentially a store operation for existing token
    const result = await this.store(tokenId, encryptedData, metadata);
    
    if (result.success) {
      this.emit(StorageEvent.UPDATED, {
        event: StorageEvent.UPDATED,
        tokenId,
        timestamp: Date.now(),
        metadata
      });
    }

    return result;
  }

  /**
   * Remove token from storage
   */
  async remove(tokenId: string, secure: boolean = true): Promise<StorageOperationResult> {
    if (!this.isInitialized) {
      return this.createErrorResult('Storage not initialized');
    }

    try {
      const tokenMetadata = this.storageIndex.tokens[tokenId];
      if (!tokenMetadata) {
        return this.createErrorResult('Token not found');
      }

      const tokenPath = this.getTokenPath(tokenId);

      if (await fs.pathExists(tokenPath)) {
        if (secure) {
          await this.secureDelete(tokenPath);
        } else {
          await fs.remove(tokenPath);
        }
      }

      // Remove from index
      delete this.storageIndex.tokens[tokenId];
      this.storageIndex.lastModified = Date.now();
      this.storageIndex.stats.totalOperations++;

      await this.saveIndex();

      this.emit(StorageEvent.REMOVED, {
        event: StorageEvent.REMOVED,
        tokenId,
        timestamp: Date.now(),
        metadata: { secure }
      });

      return {
        success: true,
        timestamp: Date.now(),
        metadata: { secure }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(`Failed to remove token: ${errorMessage}`);
    }
  }

  /**
   * Check if token exists in storage
   */
  async exists(tokenId: string): Promise<boolean> {
    return !!this.storageIndex.tokens[tokenId] && 
           await fs.pathExists(this.getTokenPath(tokenId));
  }

  /**
   * List tokens based on query parameters
   */
  async list(query: StorageQuery = {}): Promise<StoredTokenMetadata[]> {
    let tokens = Object.values(this.storageIndex.tokens);

    // Apply filters
    if (query.keyId) {
      tokens = tokens.filter(t => t.keyId === query.keyId);
    }

    if (query.tokenIds && query.tokenIds.length > 0) {
      tokens = tokens.filter(t => query.tokenIds!.includes(t.id));
    }

    if (query.createdAfter) {
      tokens = tokens.filter(t => t.created > query.createdAfter!);
    }

    if (query.createdBefore) {
      tokens = tokens.filter(t => t.created < query.createdBefore!);
    }

    if (query.status) {
      tokens = tokens.filter(t => t.status === query.status);
    }

    if (query.tags && query.tags.length > 0) {
      tokens = tokens.filter(t => 
        query.tags!.some(tag => t.tags.includes(tag))
      );
    }

    // Sort by creation date (newest first)
    tokens.sort((a, b) => b.created - a.created);

    // Apply pagination
    if (query.offset) {
      tokens = tokens.slice(query.offset);
    }

    if (query.limit) {
      tokens = tokens.slice(0, query.limit);
    }

    return tokens.map(t => ({ ...t }));
  }

  /**
   * Get storage statistics and health information
   */
  async getStats(): Promise<StorageStats> {
    const tokens = Object.values(this.storageIndex.tokens);
    const totalTokens = tokens.length;
    
    // Calculate storage size
    let storageSize = 0;
    for (const tokenMetadata of tokens) {
      storageSize += tokenMetadata.size;
    }

    // Add index size
    if (await fs.pathExists(this.indexPath)) {
      const indexStats = await fs.stat(this.indexPath);
      storageSize += indexStats.size;
    }

    // Health assessment
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check for orphaned files
    const orphanedFiles = await this.findOrphanedFiles();
    if (orphanedFiles.length > 0) {
      warnings.push(`${orphanedFiles.length} orphaned files found`);
      recommendations.push('Run cleanup to remove orphaned files');
      healthStatus = 'warning';
    }

    // Check storage size limits
    if (this.config.maxStorageSize && storageSize > this.config.maxStorageSize) {
      warnings.push('Storage size limit exceeded');
      recommendations.push('Clean up expired tokens or increase storage limit');
      healthStatus = 'critical';
    }

    // Check last backup
    const lastBackup = this.storageIndex.stats.lastBackup;
    if (this.config.backupInterval && lastBackup) {
      const backupAge = Date.now() - lastBackup;
      if (backupAge > this.config.backupInterval * 2) {
        warnings.push('Backup is overdue');
        recommendations.push('Create a backup of token storage');
        if (healthStatus === 'healthy') healthStatus = 'warning';
      }
    }

    return {
      totalTokens,
      storageSize,
      lastBackup: this.storageIndex.stats.lastBackup,
      lastCleanup: this.storageIndex.stats.lastCleanup,
      healthStatus,
      warnings,
      recommendations,
      fragmentation: this.calculateFragmentation(),
      uptime: Date.now() - this.storageIndex.created
    };
  }

  /**
   * Create backup of storage data
   */
  async backup(compress: boolean = true): Promise<BackupInfo> {
    if (!this.isInitialized) {
      throw new Error('Storage not initialized');
    }

    try {
      const backupId = StorageUtils.generateBackupId();
      const backupPath = path.join(this.backupDir, `${backupId}.backup`);
      
      // Create backup data structure
      const backupData = {
        version: this.VERSION,
        timestamp: Date.now(),
        index: this.storageIndex,
        tokens: {} as Record<string, any>
      };

      // Read all token files
      for (const [tokenId, metadata] of Object.entries(this.storageIndex.tokens)) {
        const tokenPath = this.getTokenPath(tokenId);
        if (await fs.pathExists(tokenPath)) {
          const tokenData = await fs.readFile(tokenPath);
          backupData.tokens[tokenId] = {
            data: tokenData.toString('base64'),
            metadata
          };
        }
      }

      let backupBuffer = Buffer.from(JSON.stringify(backupData, null, 2), 'utf8');
      
      // Compress if requested
      if (compress) {
        backupBuffer = await StorageUtils.compress(backupBuffer);
      }

      // Encrypt backup if storage encryption is enabled
      if (this.config.encryptionEnabled && this.encryptionKey) {
        backupBuffer = this.encryptAtRest(backupBuffer);
      }

      // Write backup file
      await fs.ensureDir(path.dirname(backupPath));
      await fs.writeFile(backupPath, backupBuffer);

      // Calculate checksum
      const checksum = StorageUtils.calculateChecksum(backupBuffer);

      const backupInfo: BackupInfo = {
        id: backupId,
        timestamp: Date.now(),
        size: backupBuffer.length,
        tokenCount: Object.keys(backupData.tokens).length,
        checksum,
        encrypted: this.config.encryptionEnabled,
        compressed: compress,
        version: this.VERSION
      };

      // Update stats
      this.storageIndex.stats.lastBackup = Date.now();
      await this.saveIndex();

      // Clean up old backups if limit is set
      if (this.config.maxBackupFiles) {
        await this.cleanupOldBackups();
      }

      this.emit(StorageEvent.BACKUP_CREATED, {
        event: StorageEvent.BACKUP_CREATED,
        timestamp: Date.now(),
        metadata: { backupId, size: backupBuffer.length, tokenCount: backupInfo.tokenCount }
      });

      return backupInfo;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Backup creation failed: ${errorMessage}`);
    }
  }

  /**
   * Restore from backup
   */
  async restore(backupId: string): Promise<StorageOperationResult> {
    try {
      const backupPath = path.join(this.backupDir, `${backupId}.backup`);
      
      if (!await fs.pathExists(backupPath)) {
        return this.createErrorResult('Backup file not found');
      }

      let backupBuffer = await fs.readFile(backupPath);

      // Decrypt if encrypted
      if (this.config.encryptionEnabled && this.encryptionKey) {
        try {
          backupBuffer = this.decryptAtRest(backupBuffer);
        } catch (error) {
          return this.createErrorResult('Failed to decrypt backup - check encryption key');
        }
      }

      // Decompress if compressed
      try {
        const testData = JSON.parse(backupBuffer.toString('utf8'));
        // If parsing succeeds, it's not compressed
      } catch {
        // Try decompressing
        backupBuffer = await StorageUtils.decompress(backupBuffer);
      }

      const backupData = JSON.parse(backupBuffer.toString('utf8'));

      // Validate backup data structure
      if (!backupData.version || !backupData.index || !backupData.tokens) {
        return this.createErrorResult('Invalid backup data structure');
      }

      // Backup current state
      const currentBackup = await this.backup();

      try {
        // Clear current storage
        await this.clearStorage();

        // Restore index
        this.storageIndex = backupData.index;

        // Restore token files
        for (const [tokenId, tokenInfo] of Object.entries(backupData.tokens as Record<string, any>)) {
          const tokenPath = this.getTokenPath(tokenId);
          const tokenData = Buffer.from(tokenInfo.data, 'base64');
          await fs.ensureDir(path.dirname(tokenPath));
          await fs.writeFile(tokenPath, tokenData);
        }

        // Save restored index
        await this.saveIndex();

        this.emit(StorageEvent.BACKUP_RESTORED, {
          event: StorageEvent.BACKUP_RESTORED,
          timestamp: Date.now(),
          metadata: { backupId, tokensRestored: Object.keys(backupData.tokens).length }
        });

        return {
          success: true,
          timestamp: Date.now(),
          metadata: { 
            backupId, 
            tokensRestored: Object.keys(backupData.tokens).length,
            rollbackBackup: currentBackup.id
          }
        };
      } catch (restoreError) {
        // Attempt to rollback
        try {
          await this.restore(currentBackup.id);
        } catch (rollbackError) {
          return this.createErrorResult(`Restore failed and rollback also failed: ${restoreError}`);
        }
        return this.createErrorResult(`Restore failed, rolled back to previous state: ${restoreError}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(`Restore operation failed: ${errorMessage}`);
    }
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<BackupInfo[]> {
    try {
      if (!await fs.pathExists(this.backupDir)) {
        return [];
      }

      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(f => f.endsWith('.backup'));
      const backups: BackupInfo[] = [];

      for (const file of backupFiles) {
        const backupPath = path.join(this.backupDir, file);
        const stats = await fs.stat(backupPath);
        const backupId = file.replace('.backup', '');
        
        // Try to read basic info without full restoration
        try {
          let backupBuffer = await fs.readFile(backupPath, { encoding: null });
          
          // Handle potential decryption/decompression for metadata reading
          const checksum = StorageUtils.calculateChecksum(backupBuffer);
          
          backups.push({
            id: backupId,
            timestamp: stats.mtime.getTime(),
            size: stats.size,
            tokenCount: 0, // Would need full read to determine
            checksum,
            encrypted: this.config.encryptionEnabled,
            version: this.VERSION
          });
        } catch (error) {
          // Skip corrupted backups
          continue;
        }
      }

      return backups.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      return [];
    }
  }

  /**
   * Verify integrity of stored data
   */
  async verifyIntegrity(): Promise<{ valid: boolean; errors: string[]; repaired?: number }> {
    const errors: string[] = [];
    let repaired = 0;

    try {
      // Check index file
      if (!await fs.pathExists(this.indexPath)) {
        errors.push('Index file missing');
        return { valid: false, errors, repaired };
      }

      // Verify each token file
      for (const [tokenId, metadata] of Object.entries(this.storageIndex.tokens)) {
        const tokenPath = this.getTokenPath(tokenId);
        
        if (!await fs.pathExists(tokenPath)) {
          errors.push(`Token file missing: ${tokenId}`);
          // Remove from index
          delete this.storageIndex.tokens[tokenId];
          repaired++;
          continue;
        }

        try {
          // Read and process token data same way as retrieve
          let tokenData = await fs.readFile(tokenPath);
          
          // Decrypt if encrypted at rest
          if (this.config.encryptionEnabled && this.encryptionKey) {
            tokenData = this.decryptAtRest(tokenData);
          }

          // Decompress if compressed
          if (this.config.compressionEnabled) {
            tokenData = await StorageUtils.decompress(tokenData);
          }
          
          // Calculate checksum on processed data
          const actualChecksum = StorageUtils.calculateChecksum(tokenData);
          
          if (metadata.checksum !== actualChecksum) {
            errors.push(`Checksum mismatch for token: ${tokenId}`);
          }

          // Note: size in metadata refers to stored file size, not processed data size
        } catch (error) {
          errors.push(`Failed to verify token ${tokenId}: ${error}`);
        }
      }

      // Find orphaned files
      const orphanedFiles = await this.findOrphanedFiles();
      if (orphanedFiles.length > 0) {
        errors.push(`${orphanedFiles.length} orphaned files found`);
      }

      // Save repaired index if changes were made
      if (repaired > 0) {
        await this.saveIndex();
      }

      this.storageIndex.stats.lastIntegrityCheck = Date.now();
      await this.saveIndex();

      this.emit(StorageEvent.INTEGRITY_CHECK, {
        event: StorageEvent.INTEGRITY_CHECK,
        timestamp: Date.now(),
        metadata: { errors: errors.length, repaired }
      });

      return {
        valid: errors.length === 0,
        errors,
        repaired: repaired > 0 ? repaired : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Integrity check failed: ${errorMessage}`);
      return { valid: false, errors, repaired };
    }
  }

  /**
   * Cleanup expired and invalid entries
   */
  async cleanup(): Promise<{ removed: number; reclaimed: number; errors: string[] }> {
    const errors: string[] = [];
    let removed = 0;
    let reclaimed = 0;

    try {
      // Find orphaned files and remove them
      const orphanedFiles = await this.findOrphanedFiles();
      for (const filePath of orphanedFiles) {
        try {
          const stats = await fs.stat(filePath);
          await fs.remove(filePath);
          reclaimed += stats.size;
          removed++;
        } catch (error) {
          errors.push(`Failed to remove orphaned file ${filePath}`);
        }
      }

      // Remove tokens marked for deletion
      const tokensToRemove: string[] = [];
      for (const [tokenId, metadata] of Object.entries(this.storageIndex.tokens)) {
        if (metadata.status === 'expired' || metadata.status === 'revoked') {
          // Check if token is old enough to be cleaned up (e.g., 7 days)
          const age = Date.now() - metadata.created;
          const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
          
          if (age > maxAge) {
            tokensToRemove.push(tokenId);
          }
        }
      }

      // Remove expired tokens
      for (const tokenId of tokensToRemove) {
        try {
          const result = await this.remove(tokenId, true);
          if (result.success) {
            removed++;
          } else {
            errors.push(`Failed to remove expired token ${tokenId}`);
          }
        } catch (error) {
          errors.push(`Error removing token ${tokenId}: ${error}`);
        }
      }

      this.storageIndex.stats.lastCleanup = Date.now();
      await this.saveIndex();

      this.emit(StorageEvent.CLEANUP, {
        event: StorageEvent.CLEANUP,
        timestamp: Date.now(),
        metadata: { removed, reclaimed, errors: errors.length }
      });

      return { removed, reclaimed, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Cleanup operation failed: ${errorMessage}`);
      return { removed, reclaimed, errors };
    }
  }

  /**
   * Compact storage to reduce fragmentation
   */
  async compact(): Promise<StorageOperationResult> {
    try {
      // For file-based storage, compaction involves:
      // 1. Creating a new clean directory structure
      // 2. Copying all valid tokens to new location
      // 3. Replacing old structure with new one

      const tempDir = path.join(this.config.storageDir, 'temp_compact');
      await fs.ensureDir(tempDir);

      const tempTokensDir = path.join(tempDir, this.TOKENS_DIR);
      await fs.ensureDir(tempTokensDir);

      let compactedTokens = 0;
      let reclaimedSpace = 0;

      // Copy all valid tokens to new structure
      for (const [tokenId, metadata] of Object.entries(this.storageIndex.tokens)) {
        const oldPath = this.getTokenPath(tokenId);
        const newPath = path.join(tempTokensDir, `${tokenId}.dat`);

        if (await fs.pathExists(oldPath)) {
          await fs.copy(oldPath, newPath);
          compactedTokens++;
        } else {
          // Remove missing token from index
          delete this.storageIndex.tokens[tokenId];
        }
      }

      // Calculate space reclaimed
      const oldStats = await this.getDirectorySize(this.tokensDir);
      
      // Replace old structure with compacted one
      const backupDir = path.join(this.config.storageDir, 'backup_before_compact');
      await fs.move(this.tokensDir, backupDir);
      await fs.move(tempTokensDir, this.tokensDir);

      const newStats = await this.getDirectorySize(this.tokensDir);
      reclaimedSpace = oldStats - newStats;

      // Clean up
      await fs.remove(tempDir);
      await fs.remove(backupDir);

      // Save updated index
      await this.saveIndex();

      return {
        success: true,
        timestamp: Date.now(),
        metadata: { compactedTokens, reclaimedSpace }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(`Compaction failed: ${errorMessage}`);
    }
  }

  /**
   * Encrypt storage with new key
   */
  async encryptStorage(newKeyId: string): Promise<StorageOperationResult> {
    try {
      // This would implement key rotation for storage encryption
      // For now, return not implemented
      return this.createErrorResult('Storage encryption rotation not yet implemented');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(`Storage encryption failed: ${errorMessage}`);
    }
  }

  /**
   * Search tokens by content or metadata
   */
  async search(query: string, fields: string[] = ['id', 'tags']): Promise<StoredTokenMetadata[]> {
    const results: StoredTokenMetadata[] = [];
    const searchTerm = query.toLowerCase();

    for (const metadata of Object.values(this.storageIndex.tokens)) {
      let matches = false;

      if (fields.includes('id') && metadata.id.toLowerCase().includes(searchTerm)) {
        matches = true;
      }

      if (fields.includes('tags') && metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm))) {
        matches = true;
      }

      if (fields.includes('status') && metadata.status.toLowerCase().includes(searchTerm)) {
        matches = true;
      }

      if (matches) {
        results.push({ ...metadata });
      }
    }

    return results.sort((a, b) => b.created - a.created);
  }

  /**
   * Batch operations for performance
   */
  async batch(operations: BatchOperation[]): Promise<StorageOperationResult[]> {
    const results: StorageOperationResult[] = [];

    for (const operation of operations) {
      let result: StorageOperationResult;

      try {
        switch (operation.type) {
          case 'store':
            result = await this.store(operation.tokenId, operation.data!, operation.metadata);
            break;
          case 'update':
            result = await this.update(operation.tokenId, operation.data!, operation.metadata);
            break;
          case 'remove':
            result = await this.remove(operation.tokenId);
            break;
          case 'retrieve':
            const retrieved = await this.retrieve(operation.tokenId);
            result = {
              success: retrieved !== null,
              timestamp: Date.now(),
              metadata: retrieved?.metadata
            };
            break;
          default:
            result = this.createErrorResult(`Unknown operation type: ${operation.type}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result = this.createErrorResult(`Batch operation failed: ${errorMessage}`);
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Event handling methods - these are inherited from EventEmitter via SecureStorageInterface
   * No need to override since they're abstract in the parent
   */

  /**
   * Private helper methods
   */

  private async createDirectories(): Promise<void> {
    await fs.ensureDir(this.config.storageDir);
    await fs.ensureDir(this.tokensDir);
    await fs.ensureDir(this.backupDir);
  }

  private async initializeEncryption(): Promise<void> {
    const keyPath = path.join(this.config.storageDir, 'storage.key');
    
    if (await fs.pathExists(keyPath)) {
      // Load existing key (in production, this should be properly secured)
      this.encryptionKey = await fs.readFile(keyPath);
    } else {
      // Generate new key
      this.encryptionKey = crypto.randomBytes(32);
      await fs.writeFile(keyPath, this.encryptionKey, { mode: 0o600 });
    }
  }

  private async loadOrCreateIndex(): Promise<void> {
    if (await fs.pathExists(this.indexPath)) {
      try {
        const indexData = await fs.readJson(this.indexPath);
        this.storageIndex = { ...this.storageIndex, ...indexData };
      } catch (error) {
        // Create new index if existing one is corrupted
        await this.saveIndex();
      }
    } else {
      await this.saveIndex();
    }
  }

  private async saveIndex(): Promise<void> {
    this.storageIndex.lastModified = Date.now();
    await fs.writeJson(this.indexPath, this.storageIndex, { spaces: 2 });
  }

  private getTokenPath(tokenId: string): string {
    return path.join(this.tokensDir, `${tokenId}.dat`);
  }

  private encryptAtRest(data: Buffer): Buffer {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.encryptionKey, iv);
    
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();
    
    // Format: IV + TAG + ENCRYPTED_DATA
    return Buffer.concat([iv, tag, encrypted]);
  }

  private decryptAtRest(data: Buffer): Buffer {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    const iv = data.slice(0, this.IV_LENGTH);
    const tag = data.slice(this.IV_LENGTH, this.IV_LENGTH + this.TAG_LENGTH);
    const encrypted = data.slice(this.IV_LENGTH + this.TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(this.ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(tag);
    
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  private async secureDelete(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      const fd = await fs.open(filePath, 'r+');
      
      // Overwrite with random data multiple times
      for (let i = 0; i < 3; i++) {
        const randomData = crypto.randomBytes(stats.size);
        await fs.write(fd, randomData, 0, stats.size, 0);
        await fs.fsync(fd);
      }
      
      await fs.close(fd);
      await fs.remove(filePath);
    } catch (error) {
      // Fall back to regular deletion
      await fs.remove(filePath);
    }
  }

  private async findOrphanedFiles(): Promise<string[]> {
    const orphaned: string[] = [];
    
    try {
      if (!await fs.pathExists(this.tokensDir)) {
        return orphaned;
      }

      const files = await fs.readdir(this.tokensDir);
      const validTokenIds = new Set(Object.keys(this.storageIndex.tokens));
      
      for (const file of files) {
        const filePath = path.join(this.tokensDir, file);
        const tokenId = file.replace('.dat', '');
        
        if (!validTokenIds.has(tokenId)) {
          orphaned.push(filePath);
        }
      }
    } catch (error) {
      // Ignore errors
    }
    
    return orphaned;
  }

  private calculateFragmentation(): number {
    const totalSlots = Object.keys(this.storageIndex.tokens).length;
    const activeTokens = Object.values(this.storageIndex.tokens)
      .filter(t => t.status === 'active').length;
    
    if (totalSlots === 0) return 0;
    return Math.round(((totalSlots - activeTokens) / totalSlots) * 100);
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    let size = 0;
    
    try {
      if (!await fs.pathExists(dirPath)) {
        return 0;
      }

      const files = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const file of files) {
        const fullPath = path.join(dirPath, file.name);
        
        if (file.isDirectory()) {
          size += await this.getDirectorySize(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          size += stats.size;
        }
      }
    } catch (error) {
      // Ignore errors
    }
    
    return size;
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups();
      
      if (backups.length <= this.config.maxBackupFiles!) {
        return;
      }

      // Sort by timestamp (oldest first) and remove excess
      const sortedBackups = backups.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = sortedBackups.slice(0, backups.length - this.config.maxBackupFiles!);
      
      for (const backup of toRemove) {
        const backupPath = path.join(this.backupDir, `${backup.id}.backup`);
        await fs.remove(backupPath);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  private async clearStorage(): Promise<void> {
    // Remove all token files
    if (await fs.pathExists(this.tokensDir)) {
      await fs.emptyDir(this.tokensDir);
    }
    
    // Reset index
    this.storageIndex = {
      version: this.VERSION,
      created: Date.now(),
      lastModified: Date.now(),
      tokens: {},
      keyRotationHistory: [],
      stats: {
        totalOperations: 0,
        lastBackup: undefined,
        lastCleanup: undefined,
        lastIntegrityCheck: undefined
      }
    };
  }

  private startBackgroundTasks(): void {
    // Auto cleanup
    if (this.config.autoCleanup && this.config.backupInterval) {
      this.cleanupTimer = setInterval(async () => {
        try {
          await this.cleanup();
        } catch (error) {
          this.emit(StorageEvent.ERROR, {
            event: StorageEvent.ERROR,
            timestamp: Date.now(),
            error: `Background cleanup failed: ${error}`
          });
        }
      }, this.config.backupInterval);
    }

    // Integrity checks
    if (this.config.integrityCheckInterval) {
      this.integrityTimer = setInterval(async () => {
        try {
          await this.verifyIntegrity();
        } catch (error) {
          this.emit(StorageEvent.ERROR, {
            event: StorageEvent.ERROR,
            timestamp: Date.now(),
            error: `Background integrity check failed: ${error}`
          });
        }
      }, this.config.integrityCheckInterval);
    }

    // Auto backup
    if (this.config.backupInterval) {
      this.backupTimer = setInterval(async () => {
        try {
          await this.backup(this.config.compressionEnabled);
        } catch (error) {
          this.emit(StorageEvent.ERROR, {
            event: StorageEvent.ERROR,
            timestamp: Date.now(),
            error: `Background backup failed: ${error}`
          });
        }
      }, this.config.backupInterval);
    }
  }

  private stopBackgroundTasks(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.integrityTimer) {
      clearInterval(this.integrityTimer);
      this.integrityTimer = null;
    }

    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }
  }

  private createErrorResult(message: string): StorageOperationResult {
    return {
      success: false,
      error: message,
      timestamp: Date.now()
    };
  }
}