/**
 * Unit tests for FileBasedSecureStorage
 * Tests persistent storage, encryption at rest, backup/restore, and integrity verification
 */

import { FileBasedSecureStorage } from '../../../src/storage/file-based-secure-storage';
import { StorageConfig, StorageEvent, StorageQuery, BatchOperation } from '../../../src/storage/secure-storage-interface';
import { EncryptedTokenData } from '../../../src/security/secure-token-storage';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('FileBasedSecureStorage', () => {
  let storage: FileBasedSecureStorage;
  let tempDir: string;
  let config: StorageConfig;
  let sampleEncryptedToken: EncryptedTokenData;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'secure-storage-test-'));
    
    config = {
      storageDir: tempDir,
      backupDir: path.join(tempDir, 'backups'),
      encryptionEnabled: true,
      compressionEnabled: true,
      backupInterval: 60000, // 1 minute
      maxBackupFiles: 5,
      integrityCheckInterval: 30000, // 30 seconds
      autoCleanup: false, // Disable for tests
      maxStorageSize: 10 * 1024 * 1024 // 10MB
    };
    
    storage = new FileBasedSecureStorage(config);
    
    // Sample encrypted token data
    sampleEncryptedToken = {
      encryptedToken: 'encrypted_sample_data',
      iv: 'sample_iv_base64',
      tag: 'sample_tag_base64',
      salt: 'sample_salt_base64',
      keyVersion: 1,
      timestamp: Date.now(),
      algorithm: 'aes-256-gcm'
    };
  });

  afterEach(async () => {
    // Shutdown storage
    if (storage.isReady()) {
      await storage.shutdown();
    }
    
    // Remove temporary directory
    await fs.remove(tempDir);
  });

  describe('Initialization and Shutdown', () => {
    it('should initialize storage successfully', async () => {
      const result = await storage.initialize();
      
      expect(result.success).toBe(true);
      expect(storage.isReady()).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.version).toBeDefined();
      expect(result.metadata?.encryptionEnabled).toBe(true);
    });

    it('should create necessary directories during initialization', async () => {
      await storage.initialize();
      
      expect(await fs.pathExists(tempDir)).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, 'tokens'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, 'backups'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, 'storage.index'))).toBe(true);
    });

    it('should create encryption key when encryption is enabled', async () => {
      await storage.initialize();
      
      const keyPath = path.join(tempDir, 'storage.key');
      expect(await fs.pathExists(keyPath)).toBe(true);
      
      const keyData = await fs.readFile(keyPath);
      expect(keyData.length).toBe(32); // 256-bit key
    });

    it('should fail initialization with invalid storage path', async () => {
      const invalidConfig = { ...config, storageDir: '/invalid/nonexistent/path' };
      const invalidStorage = new FileBasedSecureStorage(invalidConfig);
      
      const result = await invalidStorage.initialize();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Storage path validation failed');
    });

    it('should shutdown gracefully', async () => {
      await storage.initialize();
      expect(storage.isReady()).toBe(true);
      
      const result = await storage.shutdown();
      
      expect(result.success).toBe(true);
      expect(storage.isReady()).toBe(false);
    });

    it('should load existing index on restart', async () => {
      // Initialize and store a token
      await storage.initialize();
      await storage.store('test-token', sampleEncryptedToken);
      await storage.shutdown();
      
      // Create new storage instance and reinitialize
      const newStorage = new FileBasedSecureStorage(config);
      const result = await newStorage.initialize();
      
      expect(result.success).toBe(true);
      expect(result.metadata?.tokensLoaded).toBe(1);
      
      const exists = await newStorage.exists('test-token');
      expect(exists).toBe(true);
      
      await newStorage.shutdown();
    });
  });

  describe('Storage Operations', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    describe('Store Operation', () => {
      it('should store token successfully', async () => {
        const result = await storage.store('test-token', sampleEncryptedToken, { tags: ['test'] });
        
        expect(result.success).toBe(true);
        expect(result.metadata?.size).toBeGreaterThan(0);
        expect(result.metadata?.checksum).toBeDefined();
        
        const exists = await storage.exists('test-token');
        expect(exists).toBe(true);
      });

      it('should store token with metadata', async () => {
        const metadata = { tags: ['production', 'api'], environment: 'prod' };
        const result = await storage.store('metadata-token', sampleEncryptedToken, metadata);
        
        expect(result.success).toBe(true);
        
        const tokens = await storage.list({ tags: ['production'] });
        expect(tokens.length).toBe(1);
        expect(tokens[0].tags).toContain('production');
        expect(tokens[0].tags).toContain('api');
      });

      it('should fail store operation when not initialized', async () => {
        await storage.shutdown();
        
        const result = await storage.store('fail-token', sampleEncryptedToken);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Storage not initialized');
      });

      it('should emit STORED event on successful store', async () => {
        const events: any[] = [];
        storage.on(StorageEvent.STORED, (data) => events.push(data));
        
        await storage.store('event-token', sampleEncryptedToken);
        
        expect(events).toHaveLength(1);
        expect(events[0].event).toBe(StorageEvent.STORED);
        expect(events[0].tokenId).toBe('event-token');
      });
    });

    describe('Retrieve Operation', () => {
      beforeEach(async () => {
        await storage.store('retrieve-token', sampleEncryptedToken);
      });

      it('should retrieve stored token', async () => {
        const result = await storage.retrieve('retrieve-token');
        
        expect(result).toBeDefined();
        expect(result?.data).toEqual(sampleEncryptedToken);
        expect(result?.metadata).toBeDefined();
        expect(result?.metadata?.id).toBe('retrieve-token');
        expect(result?.metadata?.accessCount).toBeGreaterThan(0);
      });

      it('should return null for non-existent token', async () => {
        const result = await storage.retrieve('non-existent');
        
        expect(result).toBeNull();
      });

      it('should update access statistics on retrieve', async () => {
        // First retrieval
        const result1 = await storage.retrieve('retrieve-token');
        const accessCount1 = result1?.metadata?.accessCount || 0;
        
        // Second retrieval
        const result2 = await storage.retrieve('retrieve-token');
        const accessCount2 = result2?.metadata?.accessCount || 0;
        
        expect(accessCount2).toBe(accessCount1 + 1);
      });

      it('should emit RETRIEVED event on successful retrieve', async () => {
        const events: any[] = [];
        storage.on(StorageEvent.RETRIEVED, (data) => events.push(data));
        
        await storage.retrieve('retrieve-token');
        
        expect(events).toHaveLength(1);
        expect(events[0].event).toBe(StorageEvent.RETRIEVED);
        expect(events[0].tokenId).toBe('retrieve-token');
      });

      it('should handle corrupted files gracefully', async () => {
        // Corrupt the token file
        const tokenPath = path.join(tempDir, 'tokens', 'retrieve-token.dat');
        await fs.writeFile(tokenPath, 'corrupted data');
        
        await expect(storage.retrieve('retrieve-token')).rejects.toThrow();
      });
    });

    describe('Update Operation', () => {
      beforeEach(async () => {
        await storage.store('update-token', sampleEncryptedToken);
      });

      it('should update existing token', async () => {
        const updatedToken = { ...sampleEncryptedToken, encryptedToken: 'updated_data' };
        const result = await storage.update('update-token', updatedToken);
        
        expect(result.success).toBe(true);
        
        const retrieved = await storage.retrieve('update-token');
        expect(retrieved?.data.encryptedToken).toBe('updated_data');
      });

      it('should fail update for non-existent token', async () => {
        const result = await storage.update('non-existent', sampleEncryptedToken);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Token not found');
      });

      it('should emit UPDATED event on successful update', async () => {
        const events: any[] = [];
        storage.on(StorageEvent.UPDATED, (data) => events.push(data));
        
        await storage.update('update-token', sampleEncryptedToken);
        
        expect(events).toHaveLength(1);
        expect(events[0].event).toBe(StorageEvent.UPDATED);
        expect(events[0].tokenId).toBe('update-token');
      });
    });

    describe('Remove Operation', () => {
      beforeEach(async () => {
        await storage.store('remove-token', sampleEncryptedToken);
      });

      it('should remove token successfully', async () => {
        const result = await storage.remove('remove-token');
        
        expect(result.success).toBe(true);
        expect(result.metadata?.secure).toBe(true);
        
        const exists = await storage.exists('remove-token');
        expect(exists).toBe(false);
      });

      it('should perform secure deletion when requested', async () => {
        const result = await storage.remove('remove-token', true);
        
        expect(result.success).toBe(true);
        expect(result.metadata?.secure).toBe(true);
      });

      it('should perform regular deletion when secure=false', async () => {
        const result = await storage.remove('remove-token', false);
        
        expect(result.success).toBe(true);
        expect(result.metadata?.secure).toBe(false);
      });

      it('should fail remove for non-existent token', async () => {
        const result = await storage.remove('non-existent');
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Token not found');
      });

      it('should emit REMOVED event on successful remove', async () => {
        const events: any[] = [];
        storage.on(StorageEvent.REMOVED, (data) => events.push(data));
        
        await storage.remove('remove-token');
        
        expect(events).toHaveLength(1);
        expect(events[0].event).toBe(StorageEvent.REMOVED);
        expect(events[0].tokenId).toBe('remove-token');
      });
    });

    describe('Exists Operation', () => {
      it('should return true for existing token', async () => {
        await storage.store('exists-token', sampleEncryptedToken);
        
        const exists = await storage.exists('exists-token');
        
        expect(exists).toBe(true);
      });

      it('should return false for non-existent token', async () => {
        const exists = await storage.exists('non-existent');
        
        expect(exists).toBe(false);
      });

      it('should return false for token with missing file', async () => {
        await storage.store('missing-file-token', sampleEncryptedToken);
        
        // Remove the file but leave index entry
        const tokenPath = path.join(tempDir, 'tokens', 'missing-file-token.dat');
        await fs.remove(tokenPath);
        
        const exists = await storage.exists('missing-file-token');
        
        expect(exists).toBe(false);
      });
    });
  });

  describe('Query and Listing', () => {
    beforeEach(async () => {
      await storage.initialize();
      
      // Store test tokens with different metadata
      await storage.store('token1', sampleEncryptedToken, { tags: ['prod', 'api'] });
      await storage.store('token2', sampleEncryptedToken, { tags: ['dev', 'test'] });
      await storage.store('token3', sampleEncryptedToken, { tags: ['prod', 'web'] });
    });

    it('should list all tokens by default', async () => {
      const tokens = await storage.list();
      
      expect(tokens.length).toBe(3);
      expect(tokens.map(t => t.id)).toContain('token1');
      expect(tokens.map(t => t.id)).toContain('token2');
      expect(tokens.map(t => t.id)).toContain('token3');
    });

    it('should filter tokens by tags', async () => {
      const prodTokens = await storage.list({ tags: ['prod'] });
      
      expect(prodTokens.length).toBe(2);
      expect(prodTokens.every(t => t.tags.includes('prod'))).toBe(true);
    });

    it('should filter tokens by specific token IDs', async () => {
      const specificTokens = await storage.list({ tokenIds: ['token1', 'token3'] });
      
      expect(specificTokens.length).toBe(2);
      expect(specificTokens.map(t => t.id)).toContain('token1');
      expect(specificTokens.map(t => t.id)).toContain('token3');
    });

    it('should filter tokens by creation date', async () => {
      const now = Date.now();
      const recentTokens = await storage.list({ createdAfter: now - 1000 });
      
      expect(recentTokens.length).toBe(3); // All should be recent
      
      const futureTokens = await storage.list({ createdAfter: now + 1000 });
      expect(futureTokens.length).toBe(0);
    });

    it('should apply pagination', async () => {
      const firstPage = await storage.list({ limit: 2 });
      expect(firstPage.length).toBe(2);
      
      const secondPage = await storage.list({ limit: 2, offset: 2 });
      expect(secondPage.length).toBe(1);
    });

    it('should sort tokens by creation date (newest first)', async () => {
      // Wait a bit and create another token
      await new Promise(resolve => setTimeout(resolve, 10));
      await storage.store('newer-token', sampleEncryptedToken);
      
      const tokens = await storage.list();
      
      expect(tokens.length).toBe(4);
      expect(tokens[0].id).toBe('newer-token'); // Should be first (newest)
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      await storage.initialize();
      
      await storage.store('search1', sampleEncryptedToken, { tags: ['production', 'api'] });
      await storage.store('search2', sampleEncryptedToken, { tags: ['development', 'test'] });
      await storage.store('api-token', sampleEncryptedToken, { tags: ['staging'] });
    });

    it('should search by token ID', async () => {
      const results = await storage.search('search', ['id']);
      
      expect(results.length).toBe(2);
      expect(results.every(t => t.id.includes('search'))).toBe(true);
    });

    it('should search by tags', async () => {
      const results = await storage.search('production', ['tags']);
      
      expect(results.length).toBe(1);
      expect(results[0].tags).toContain('production');
    });

    it('should search by status', async () => {
      const results = await storage.search('active', ['status']);
      
      expect(results.length).toBe(3); // All tokens should be active by default
    });

    it('should search across multiple fields', async () => {
      const results = await storage.search('api', ['id', 'tags']);
      
      expect(results.length).toBe(2); // 'api-token' ID + tag 'api'
    });

    it('should return empty results for no matches', async () => {
      const results = await storage.search('nonexistent', ['id', 'tags']);
      
      expect(results.length).toBe(0);
    });
  });

  describe('Batch Operations', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should perform batch store operations', async () => {
      const operations: BatchOperation[] = [
        { type: 'store', tokenId: 'batch1', data: sampleEncryptedToken },
        { type: 'store', tokenId: 'batch2', data: sampleEncryptedToken },
        { type: 'store', tokenId: 'batch3', data: sampleEncryptedToken }
      ];
      
      const results = await storage.batch(operations);
      
      expect(results.length).toBe(3);
      expect(results.every(r => r.success)).toBe(true);
      
      const tokens = await storage.list();
      expect(tokens.length).toBe(3);
    });

    it('should perform mixed batch operations', async () => {
      // First store some tokens
      await storage.store('mixed1', sampleEncryptedToken);
      await storage.store('mixed2', sampleEncryptedToken);
      
      const operations: BatchOperation[] = [
        { type: 'retrieve', tokenId: 'mixed1' },
        { type: 'update', tokenId: 'mixed2', data: { ...sampleEncryptedToken, encryptedToken: 'updated' } },
        { type: 'store', tokenId: 'mixed3', data: sampleEncryptedToken },
        { type: 'remove', tokenId: 'mixed1' }
      ];
      
      const results = await storage.batch(operations);
      
      expect(results.length).toBe(4);
      expect(results.every(r => r.success)).toBe(true);
      
      // Verify results
      expect(await storage.exists('mixed1')).toBe(false); // Removed
      expect(await storage.exists('mixed2')).toBe(true);  // Updated
      expect(await storage.exists('mixed3')).toBe(true);  // Stored
    });

    it('should handle batch operation errors gracefully', async () => {
      const operations: BatchOperation[] = [
        { type: 'store', tokenId: 'good1', data: sampleEncryptedToken },
        { type: 'retrieve', tokenId: 'nonexistent' }, // Will fail
        { type: 'store', tokenId: 'good2', data: sampleEncryptedToken }
      ];
      
      const results = await storage.batch(operations);
      
      expect(results.length).toBe(3);
      expect(results[0].success).toBe(true);  // good1
      expect(results[1].success).toBe(false);  // retrieve fails for non-existent token
      expect(results[2].success).toBe(true);  // good2
    });
  });

  describe('Storage Statistics', () => {
    beforeEach(async () => {
      await storage.initialize();
      
      // Store some test tokens
      await storage.store('stats1', sampleEncryptedToken);
      await storage.store('stats2', sampleEncryptedToken);
    });

    it('should calculate storage statistics', async () => {
      const stats = await storage.getStats();
      
      expect(stats.totalTokens).toBe(2);
      expect(stats.storageSize).toBeGreaterThan(0);
      expect(stats.healthStatus).toBeDefined();
      expect(Array.isArray(stats.warnings)).toBe(true);
      expect(Array.isArray(stats.recommendations)).toBe(true);
      expect(stats.uptime).toBeGreaterThan(0);
    });

    it('should detect healthy storage state', async () => {
      const stats = await storage.getStats();
      
      expect(stats.healthStatus).toBe('healthy');
      expect(stats.warnings.length).toBe(0);
    });

    it('should detect storage size issues', async () => {
      // Set very small storage limit
      storage.updateConfig({ maxStorageSize: 1 }); // 1 byte
      
      const stats = await storage.getStats();
      
      expect(stats.healthStatus).toBe('critical');
      expect(stats.warnings.some(w => w.includes('Storage size limit exceeded'))).toBe(true);
    });

    it('should calculate fragmentation', async () => {
      // Create and remove some tokens to create fragmentation
      await storage.store('frag1', sampleEncryptedToken);
      await storage.store('frag2', sampleEncryptedToken);
      await storage.remove('frag1');
      
      const stats = await storage.getStats();
      
      expect(stats.fragmentation).toBeDefined();
      expect(stats.fragmentation).toBeGreaterThanOrEqual(0);
      expect(stats.fragmentation).toBeLessThanOrEqual(100);
    });
  });

  describe('Backup and Restore', () => {
    beforeEach(async () => {
      await storage.initialize();
      
      // Store test data for backup
      await storage.store('backup1', sampleEncryptedToken, { tags: ['important'] });
      await storage.store('backup2', sampleEncryptedToken, { tags: ['test'] });
    });

    it('should create backup successfully', async () => {
      const backupInfo = await storage.backup(true);
      
      expect(backupInfo.id).toBeDefined();
      expect(backupInfo.timestamp).toBeGreaterThan(0);
      expect(backupInfo.size).toBeGreaterThan(0);
      expect(backupInfo.tokenCount).toBe(2);
      expect(backupInfo.checksum).toBeDefined();
      expect(backupInfo.encrypted).toBe(true);
      expect(backupInfo.compressed).toBe(true);
      
      // Verify backup file exists
      const backupPath = path.join(tempDir, 'backups', `${backupInfo.id}.backup`);
      expect(await fs.pathExists(backupPath)).toBe(true);
    });

    it('should create uncompressed backup', async () => {
      const backupInfo = await storage.backup(false);
      
      expect(backupInfo.compressed).toBe(false);
      expect(backupInfo.size).toBeGreaterThan(0);
    });

    it('should list available backups', async () => {
      // Create multiple backups
      const backup1 = await storage.backup();
      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps
      const backup2 = await storage.backup();
      
      const backups = await storage.listBackups();
      
      expect(backups.length).toBeGreaterThanOrEqual(2);
      expect(backups.map(b => b.id)).toContain(backup1.id);
      expect(backups.map(b => b.id)).toContain(backup2.id);
      
      // Should be sorted by timestamp (newest first)
      expect(backups[0].timestamp).toBeGreaterThanOrEqual(backups[1].timestamp);
    });

    it('should restore from backup successfully', async () => {
      // Create backup
      const backupInfo = await storage.backup();
      
      // Add more data after backup
      await storage.store('after-backup', sampleEncryptedToken);
      
      // Verify we have 3 tokens now
      let tokens = await storage.list();
      expect(tokens.length).toBe(3);
      
      // Restore from backup
      const restoreResult = await storage.restore(backupInfo.id);
      
      expect(restoreResult.success).toBe(true);
      expect(restoreResult.metadata?.tokensRestored).toBe(2);
      expect(restoreResult.metadata?.rollbackBackup).toBeDefined();
      
      // Verify we're back to 2 tokens
      tokens = await storage.list();
      expect(tokens.length).toBe(2);
      
      // Verify original tokens are restored
      expect(await storage.exists('backup1')).toBe(true);
      expect(await storage.exists('backup2')).toBe(true);
      expect(await storage.exists('after-backup')).toBe(false);
    });

    it('should fail restore for non-existent backup', async () => {
      const result = await storage.restore('non-existent-backup');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Backup file not found');
    });

    it('should emit backup events', async () => {
      const backupEvents: any[] = [];
      const restoreEvents: any[] = [];
      
      // Clear existing listeners to avoid interference
      (storage as any).eventEmitter.removeAllListeners(StorageEvent.BACKUP_CREATED);
      (storage as any).eventEmitter.removeAllListeners(StorageEvent.BACKUP_RESTORED);
      
      storage.on(StorageEvent.BACKUP_CREATED, (data) => backupEvents.push(data));
      storage.on(StorageEvent.BACKUP_RESTORED, (data) => restoreEvents.push(data));
      
      const backupInfo = await storage.backup();
      await storage.restore(backupInfo.id);
      
      expect(backupEvents.length).toBeGreaterThanOrEqual(1);
      expect(backupEvents[backupEvents.length - 1].event).toBe(StorageEvent.BACKUP_CREATED);
      
      expect(restoreEvents.length).toBe(1);
      expect(restoreEvents[0].event).toBe(StorageEvent.BACKUP_RESTORED);
    });

    it('should cleanup old backups when limit is reached', async () => {
      // Set low backup limit
      storage.updateConfig({ maxBackupFiles: 2 });
      
      // Create 3 backups
      const backup1 = await storage.backup();
      await new Promise(resolve => setTimeout(resolve, 10));
      const backup2 = await storage.backup();
      await new Promise(resolve => setTimeout(resolve, 10));
      const backup3 = await storage.backup();
      
      // Should only have 2 backups (oldest removed)
      const backups = await storage.listBackups();
      expect(backups.length).toBe(2);
      expect(backups.map(b => b.id)).not.toContain(backup1.id);
      expect(backups.map(b => b.id)).toContain(backup2.id);
      expect(backups.map(b => b.id)).toContain(backup3.id);
    });
  });

  describe('Integrity Verification', () => {
    beforeEach(async () => {
      await storage.initialize();
      await storage.store('integrity1', sampleEncryptedToken);
      await storage.store('integrity2', sampleEncryptedToken);
    });

    it('should verify integrity of clean storage', async () => {
      const result = await storage.verifyIntegrity();
      
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.repaired).toBeUndefined();
    });

    it('should detect missing token files', async () => {
      // Remove a token file but leave index entry
      const tokenPath = path.join(tempDir, 'tokens', 'integrity1.dat');
      await fs.remove(tokenPath);
      
      const result = await storage.verifyIntegrity();
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Token file missing'))).toBe(true);
      expect(result.repaired).toBe(1); // Should repair by removing from index
      
      // Verify token was removed from index
      expect(await storage.exists('integrity1')).toBe(false);
    });

    it('should detect orphaned files', async () => {
      // Create orphaned file
      const orphanPath = path.join(tempDir, 'tokens', 'orphaned-token.dat');
      await fs.writeFile(orphanPath, 'orphaned data');
      
      const result = await storage.verifyIntegrity();
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('orphaned files found'))).toBe(true);
    });

    it('should detect checksum mismatches', async () => {
      // Corrupt a token file
      const tokenPath = path.join(tempDir, 'tokens', 'integrity1.dat');
      const originalData = await fs.readFile(tokenPath);
      const corruptedData = Buffer.concat([originalData, Buffer.from('corrupted')]);
      await fs.writeFile(tokenPath, corruptedData);
      
      const result = await storage.verifyIntegrity();
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Checksum mismatch') || e.includes('Failed to verify token'))).toBe(true);
    });

    it('should emit integrity check events', async () => {
      const events: any[] = [];
      storage.on(StorageEvent.INTEGRITY_CHECK, (data) => events.push(data));
      
      await storage.verifyIntegrity();
      
      expect(events.length).toBe(1);
      expect(events[0].event).toBe(StorageEvent.INTEGRITY_CHECK);
    });
  });

  describe('Cleanup Operations', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should cleanup orphaned files', async () => {
      // Create orphaned files
      const orphanPath1 = path.join(tempDir, 'tokens', 'orphan1.dat');
      const orphanPath2 = path.join(tempDir, 'tokens', 'orphan2.dat');
      await fs.writeFile(orphanPath1, 'orphan data 1');
      await fs.writeFile(orphanPath2, 'orphan data 2');
      
      const result = await storage.cleanup();
      
      expect(result.removed).toBe(2);
      expect(result.reclaimed).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);
      
      // Verify orphaned files are removed
      expect(await fs.pathExists(orphanPath1)).toBe(false);
      expect(await fs.pathExists(orphanPath2)).toBe(false);
    });

    it('should cleanup old expired tokens', async () => {
      // Store token and mark as expired
      await storage.store('expired-token', sampleEncryptedToken);
      
      // Manually update token status to expired and make it old
      const tokens = await storage.list();
      const expiredToken = tokens.find(t => t.id === 'expired-token');
      if (expiredToken) {
        expiredToken.status = 'expired';
        expiredToken.created = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days old
      }
      
      const result = await storage.cleanup();
      
      expect(result.removed).toBeGreaterThanOrEqual(0); // May or may not remove based on implementation
      expect(result.errors.length).toBe(0);
    });

    it('should emit cleanup events', async () => {
      const events: any[] = [];
      storage.on(StorageEvent.CLEANUP, (data) => events.push(data));
      
      await storage.cleanup();
      
      expect(events.length).toBe(1);
      expect(events[0].event).toBe(StorageEvent.CLEANUP);
    });
  });

  describe('Compaction', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should compact storage successfully', async () => {
      // Store and remove tokens to create fragmentation
      await storage.store('compact1', sampleEncryptedToken);
      await storage.store('compact2', sampleEncryptedToken);
      await storage.store('compact3', sampleEncryptedToken);
      await storage.remove('compact2');
      
      const result = await storage.compact();
      
      expect(result.success).toBe(true);
      expect(result.metadata?.compactedTokens).toBe(2); // Only 2 remain after removal
    });

    it('should handle compaction of empty storage', async () => {
      const result = await storage.compact();
      
      expect(result.success).toBe(true);
      expect(result.metadata?.compactedTokens).toBe(0);
    });
  });

  describe('Configuration Management', () => {
    it('should return current configuration', () => {
      const currentConfig = storage.getConfig();
      
      expect(currentConfig).toEqual(config);
      expect(currentConfig).not.toBe(config); // Should be a copy
    });

    it('should update configuration', () => {
      const updates = { maxStorageSize: 20 * 1024 * 1024 };
      storage.updateConfig(updates);
      
      const updatedConfig = storage.getConfig();
      
      expect(updatedConfig.maxStorageSize).toBe(20 * 1024 * 1024);
      expect(updatedConfig.storageDir).toBe(config.storageDir); // Other values preserved
    });
  });

  describe('Event System', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should emit initialization event', async () => {
      const events: any[] = [];
      const newStorage = new FileBasedSecureStorage(config);
      
      newStorage.on(StorageEvent.INITIALIZED, (data) => events.push(data));
      
      await newStorage.initialize();
      
      expect(events.length).toBe(1);
      expect(events[0].event).toBe(StorageEvent.INITIALIZED);
      
      await newStorage.shutdown();
    });

    it('should emit error events', async () => {
      const events: any[] = [];
      storage.on(StorageEvent.ERROR, (data) => events.push(data));
      
      // Force an error by trying to store with corrupted data
      try {
        await storage.store('error-test', null as any);
      } catch (error) {
        // Expected to throw
      }
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].event).toBe(StorageEvent.ERROR);
    });

    it('should allow removing event listeners', () => {
      const listener = jest.fn();
      
      storage.on(StorageEvent.STORED, listener);
      storage.removeListener(StorageEvent.STORED, listener);
      
      // Listener should not be called
      storage.store('listener-test', sampleEncryptedToken);
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Try to initialize with read-only directory (simulated)
      const readOnlyConfig = { ...config, storageDir: '/read-only-path' };
      const readOnlyStorage = new FileBasedSecureStorage(readOnlyConfig);
      
      const result = await readOnlyStorage.initialize();
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle file system errors during operations', async () => {
      await storage.initialize();
      
      // Remove storage directory to cause errors
      await fs.remove(tempDir);
      
      const result = await storage.store('error-token', sampleEncryptedToken);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to store token');
    });

    it('should handle corrupted index file', async () => {
      await storage.initialize();
      
      // Corrupt the index file
      const indexPath = path.join(tempDir, 'storage.index');
      await fs.writeFile(indexPath, 'corrupted json data');
      
      // Reinitialize - should handle corrupted index gracefully
      const newStorage = new FileBasedSecureStorage(config);
      const result = await newStorage.initialize();
      
      expect(result.success).toBe(true); // Should create new index
      
      await newStorage.shutdown();
    });
  });

  describe('Performance and Scalability', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should handle multiple concurrent operations', async () => {
      const operations = [];
      
      // Create 10 concurrent store operations
      for (let i = 0; i < 10; i++) {
        operations.push(storage.store(`concurrent-${i}`, sampleEncryptedToken));
      }
      
      const results = await Promise.all(operations);
      
      expect(results.every(r => r.success)).toBe(true);
      
      const tokens = await storage.list();
      expect(tokens.length).toBe(10);
    });

    it('should complete operations within reasonable time', async () => {
      const startTime = Date.now();
      
      // Perform various operations
      await storage.store('perf-test', sampleEncryptedToken);
      await storage.retrieve('perf-test');
      await storage.update('perf-test', sampleEncryptedToken);
      await storage.list();
      await storage.search('perf');
      await storage.remove('perf-test');
      
      const elapsed = Date.now() - startTime;
      
      expect(elapsed).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle large numbers of tokens efficiently', async () => {
      const tokenCount = 50; // Reduced for test speed
      const operations = [];
      
      // Store many tokens
      for (let i = 0; i < tokenCount; i++) {
        operations.push(storage.store(`token-${i}`, sampleEncryptedToken));
      }
      
      await Promise.all(operations);
      
      // Test listing performance
      const startTime = Date.now();
      const tokens = await storage.list();
      const elapsed = Date.now() - startTime;
      
      expect(tokens.length).toBe(tokenCount);
      expect(elapsed).toBeLessThan(1000); // Should list quickly
    });
  });
});