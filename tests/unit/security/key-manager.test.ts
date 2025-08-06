/**
 * Unit tests for KeyManager
 * Tests secure key derivation, storage, rotation, and lifecycle management
 */

import { KeyManager, KeyDerivationFunction, KeyStorageConfig, MasterKeyMetadata } from '../../../src/security/key-manager';
import { SecureTokenStorage } from '../../../src/security/secure-token-storage';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('KeyManager', () => {
  let keyManager: KeyManager;
  let tempDir: string;
  let config: KeyStorageConfig;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'keymanager-test-'));
    
    config = {
      storageDir: tempDir,
      backupDir: path.join(tempDir, 'backup'),
      maxKeyAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      keyRotationInterval: 7 * 24 * 60 * 60 * 1000, // 7 days
      secureDelete: false // Disable for tests to avoid issues
    };
    
    keyManager = new KeyManager(config);
  });

  afterEach(async () => {
    // Clean up memory
    keyManager.wipeMemory();
    
    // Remove temporary directory
    await fs.remove(tempDir);
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with provided configuration', () => {
      expect(keyManager).toBeInstanceOf(KeyManager);
      expect(keyManager.getCurrentKeyId()).toBeNull();
    });

    it('should create storage directories', async () => {
      expect(await fs.pathExists(config.storageDir)).toBe(true);
      if (config.backupDir) {
        expect(await fs.pathExists(config.backupDir)).toBe(true);
      }
    });

    it('should use default values for missing config options', () => {
      const minimalConfig: KeyStorageConfig = {
        storageDir: tempDir
      };
      
      const manager = new KeyManager(minimalConfig);
      expect(manager).toBeInstanceOf(KeyManager);
    });
  });

  describe('Master Key Generation', () => {
    const passphrase = 'test-passphrase-for-key-generation';

    it('should generate master key with default PBKDF2', async () => {
      const result = await keyManager.generateMasterKey(passphrase);
      
      expect(result.keyId).toBeDefined();
      expect(result.key).toBeInstanceOf(Buffer);
      expect(result.key.length).toBe(32); // 256 bits
      expect(result.metadata).toBeDefined();
      expect(result.metadata.kdf).toBe(KeyDerivationFunction.PBKDF2);
      expect(result.metadata.version).toBe(1);
      expect(result.metadata.status).toBe('active');
      
      expect(keyManager.getCurrentKeyId()).toBe(result.keyId);
    });

    it('should generate master key with custom PBKDF2 parameters', async () => {
      const result = await keyManager.generateMasterKey(passphrase, {
        kdf: KeyDerivationFunction.PBKDF2,
        iterations: 150000,
        keyLength: 32
      });
      
      expect(result.metadata.params.iterations).toBe(150000);
      expect(result.metadata.params.kdf).toBe(KeyDerivationFunction.PBKDF2);
    });

    it('should generate master key with scrypt', async () => {
      const result = await keyManager.generateMasterKey(passphrase, {
        kdf: KeyDerivationFunction.SCRYPT,
        iterations: 16384,
        memoryCost: 8192,
        parallelism: 1
      });
      
      expect(result.metadata.params.kdf).toBe(KeyDerivationFunction.SCRYPT);
      expect(result.metadata.params.memoryCost).toBe(8192);
    });

    it('should generate unique keys for same passphrase', async () => {
      const result1 = await keyManager.generateMasterKey(passphrase);
      const result2 = await keyManager.generateMasterKey(passphrase);
      
      expect(result1.keyId).not.toBe(result2.keyId);
      expect(result1.key.equals(result2.key)).toBe(false);
    });

    it('should store key metadata on disk', async () => {
      const result = await keyManager.generateMasterKey(passphrase);
      
      const metadataPath = path.join(tempDir, `${result.keyId}.meta`);
      const keyPath = path.join(tempDir, `${result.keyId}.key`);
      
      expect(await fs.pathExists(metadataPath)).toBe(true);
      expect(await fs.pathExists(keyPath)).toBe(true);
      
      const storedMetadata = await fs.readJson(metadataPath);
      expect(storedMetadata.id).toBe(result.keyId);
      expect(storedMetadata.status).toBe('active');
    });
  });

  describe('Key Loading', () => {
    let keyId: string;
    let originalKey: Buffer;
    const passphrase = 'test-load-passphrase';

    beforeEach(async () => {
      const result = await keyManager.generateMasterKey(passphrase);
      keyId = result.keyId;
      originalKey = result.key;
      
      // Clear cache to force loading from disk
      keyManager.wipeMemory();
    });

    it('should load existing key from storage', async () => {
      const loadedKey = await keyManager.loadMasterKey(keyId, passphrase);
      
      expect(loadedKey).toBeInstanceOf(Buffer);
      expect(loadedKey.equals(originalKey)).toBe(true);
      expect(keyManager.getCurrentKeyId()).toBeNull(); // Should not change current key ID
    });

    it('should cache loaded keys', async () => {
      // First load
      await keyManager.loadMasterKey(keyId, passphrase);
      
      // Second load should be from cache (faster)
      const startTime = Date.now();
      const cachedKey = await keyManager.loadMasterKey(keyId, passphrase);
      const loadTime = Date.now() - startTime;
      
      expect(cachedKey.equals(originalKey)).toBe(true);
      expect(loadTime).toBeLessThan(10); // Should be very fast from cache
    });

    it('should throw error for non-existent key', async () => {
      await expect(keyManager.loadMasterKey('non-existent-key', passphrase))
        .rejects.toThrow('Key file not found');
    });

    it('should update last used timestamp', async () => {
      const originalMetadata = await keyManager.getKeyMetadata(keyId);
      const originalLastUsed = originalMetadata.lastUsed;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await keyManager.loadMasterKey(keyId, passphrase);
      
      const updatedMetadata = await keyManager.getKeyMetadata(keyId);
      expect(updatedMetadata.lastUsed).toBeGreaterThan(originalLastUsed);
    });
  });

  describe('Key Rotation', () => {
    let originalKeyId: string;
    let originalKey: Buffer;
    const passphrase = 'test-rotation-passphrase';
    const newPassphrase = 'new-rotation-passphrase';

    beforeEach(async () => {
      const result = await keyManager.generateMasterKey(passphrase);
      originalKeyId = result.keyId;
      originalKey = result.key;
    });

    it('should rotate key with same passphrase', async () => {
      const rotationResult = await keyManager.rotateKey(originalKeyId, passphrase);
      
      expect(rotationResult.keyId).not.toBe(originalKeyId);
      expect(rotationResult.key).toBeInstanceOf(Buffer);
      expect(rotationResult.key.equals(originalKey)).toBe(false);
      expect(rotationResult.metadata.version).toBe(2);
      expect(rotationResult.metadata.derivedFrom).toBe(originalKeyId);
      expect(rotationResult.metadata.status).toBe('active');
      
      expect(keyManager.getCurrentKeyId()).toBe(rotationResult.keyId);
    });

    it('should rotate key with new passphrase', async () => {
      const rotationResult = await keyManager.rotateKey(originalKeyId, passphrase, newPassphrase);
      
      expect(rotationResult.keyId).not.toBe(originalKeyId);
      expect(rotationResult.metadata.version).toBe(2);
      
      // Should be able to load with new passphrase
      const loadedKey = await keyManager.loadMasterKey(rotationResult.keyId, newPassphrase);
      expect(loadedKey.equals(rotationResult.key)).toBe(true);
    });

    it('should deprecate old key after rotation', async () => {
      await keyManager.rotateKey(originalKeyId, passphrase);
      
      const oldMetadata = await keyManager.getKeyMetadata(originalKeyId);
      expect(oldMetadata.status).toBe('deprecated');
    });

    it('should maintain key derivation parameters during rotation', async () => {
      const rotationResult = await keyManager.rotateKey(originalKeyId, passphrase);
      
      const originalMetadata = await keyManager.getKeyMetadata(originalKeyId);
      const newMetadata = rotationResult.metadata;
      
      expect(newMetadata.params.kdf).toBe(originalMetadata.params.kdf);
      expect(newMetadata.params.iterations).toBe(originalMetadata.params.iterations);
    });
  });

  describe('Token Re-encryption', () => {
    let oldKeyId: string;
    let newKeyId: string;
    const oldPassphrase = 'old-passphrase';
    const newPassphrase = 'new-passphrase';

    beforeEach(async () => {
      // Generate original key
      const oldResult = await keyManager.generateMasterKey(oldPassphrase);
      oldKeyId = oldResult.keyId;
      
      // Rotate to new key
      const newResult = await keyManager.rotateKey(oldKeyId, oldPassphrase, newPassphrase);
      newKeyId = newResult.keyId;
    });

    it('should re-encrypt tokens with new key', async () => {
      // Create sample encrypted tokens with old key
      const oldKey = await keyManager.loadMasterKey(oldKeyId, oldPassphrase);
      const oldStorage = new SecureTokenStorage();
      oldStorage.setMasterKey(oldKey);
      
      const sampleToken = {
        access_token: 'sample-token',
        token_type: 'Bearer',
        expires_in: 3600,
        created_at: Date.now()
      };
      
      const oldEncryptedToken = oldStorage.encryptToken(sampleToken);
      
      // Re-encrypt with new key
      const reencrypted = await keyManager.reencryptTokens(
        oldKeyId,
        newKeyId,
        oldPassphrase,
        newPassphrase,
        [oldEncryptedToken]
      );
      
      expect(reencrypted).toHaveLength(1);
      expect(reencrypted[0].keyVersion).toBeGreaterThan(oldEncryptedToken.keyVersion);
      
      // Verify we can decrypt with new key
      const newKey = await keyManager.loadMasterKey(newKeyId, newPassphrase);
      const newStorage = new SecureTokenStorage();
      newStorage.setMasterKey(newKey);
      
      const decryptedToken = newStorage.decryptToken(reencrypted[0]);
      expect(decryptedToken.access_token).toBe(sampleToken.access_token);
    });

    it('should handle re-encryption errors gracefully', async () => {
      // Create invalid encrypted token
      const invalidToken = {
        encryptedToken: 'invalid-data',
        iv: 'invalid-iv',
        tag: 'invalid-tag',
        salt: 'invalid-salt',
        keyVersion: 1,
        timestamp: Date.now(),
        algorithm: 'aes-256-gcm'
      };
      
      await expect(keyManager.reencryptTokens(
        oldKeyId,
        newKeyId,
        oldPassphrase,
        newPassphrase,
        [invalidToken as any]
      )).rejects.toThrow('Failed to re-encrypt token');
    });
  });

  describe('Key Metadata Management', () => {
    let keyId: string;
    const passphrase = 'metadata-test-passphrase';

    beforeEach(async () => {
      const result = await keyManager.generateMasterKey(passphrase);
      keyId = result.keyId;
    });

    it('should retrieve key metadata', async () => {
      const metadata = await keyManager.getKeyMetadata(keyId);
      
      expect(metadata.id).toBe(keyId);
      expect(metadata.version).toBe(1);
      expect(metadata.status).toBe('active');
      expect(metadata.createdAt).toBeGreaterThan(0);
      expect(metadata.lastUsed).toBeGreaterThan(0);
    });

    it('should cache metadata', async () => {
      // Load metadata twice
      await keyManager.getKeyMetadata(keyId);
      const startTime = Date.now();
      const cachedMetadata = await keyManager.getKeyMetadata(keyId);
      const loadTime = Date.now() - startTime;
      
      expect(cachedMetadata.id).toBe(keyId);
      expect(loadTime).toBeLessThan(5);
    });

    it('should list all keys', async () => {
      // Generate additional keys
      await keyManager.generateMasterKey('passphrase2');
      await keyManager.generateMasterKey('passphrase3');
      
      const keys = await keyManager.listKeys();
      
      expect(keys.length).toBe(3);
      expect(keys.every(k => k.status === 'active')).toBe(true);
      
      // Should be sorted by creation date (newest first)
      expect(keys[0].createdAt).toBeGreaterThanOrEqual(keys[1].createdAt);
      expect(keys[1].createdAt).toBeGreaterThanOrEqual(keys[2].createdAt);
    });

    it('should get key version', async () => {
      const version = await keyManager.getKeyVersion(keyId);
      expect(version).toBe(1);
    });
  });

  describe('Key Lifecycle Management', () => {
    let keyId: string;
    const passphrase = 'lifecycle-test-passphrase';

    beforeEach(async () => {
      const result = await keyManager.generateMasterKey(passphrase);
      keyId = result.keyId;
    });

    it('should revoke a key', async () => {
      await keyManager.revokeKey(keyId);
      
      const metadata = await keyManager.getKeyMetadata(keyId);
      expect(metadata.status).toBe('revoked');
      expect(keyManager.getCurrentKeyId()).toBeNull();
    });

    it('should delete a key', async () => {
      await keyManager.deleteKey(keyId);
      
      // Files should be removed
      const keyPath = path.join(tempDir, `${keyId}.key`);
      const metadataPath = path.join(tempDir, `${keyId}.meta`);
      
      expect(await fs.pathExists(keyPath)).toBe(false);
      expect(await fs.pathExists(metadataPath)).toBe(false);
      
      // Should not be in cache
      expect(keyManager.getCurrentKeyId()).toBeNull();
    });

    it('should wipe memory', async () => {
      // Load key into cache
      await keyManager.loadMasterKey(keyId, passphrase);
      expect(keyManager.getCurrentKeyId()).toBe(keyId);
      
      // Wipe memory
      keyManager.wipeMemory();
      expect(keyManager.getCurrentKeyId()).toBeNull();
    });
  });

  describe('Key Health Validation', () => {
    it('should report healthy state with active keys', async () => {
      await keyManager.generateMasterKey('test-passphrase');
      
      const health = await keyManager.validateKeyHealth();
      
      expect(health.healthy).toBe(true);
      expect(health.warnings).toHaveLength(0);
    });

    it('should warn about missing active keys', async () => {
      const health = await keyManager.validateKeyHealth();
      
      expect(health.healthy).toBe(false);
      expect(health.warnings).toContain('No active keys found');
      expect(health.recommendations).toContain('Generate a new master key');
    });

    it('should warn about old keys', async () => {
      // Create key manager with very short max age
      const shortAgeConfig = {
        ...config,
        maxKeyAge: 1000 // 1 second
      };
      const shortAgeManager = new KeyManager(shortAgeConfig);
      
      await shortAgeManager.generateMasterKey('test-passphrase');
      
      // Wait for key to become "old"
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const health = await shortAgeManager.validateKeyHealth();
      
      expect(health.warnings.some(w => w.includes('older than'))).toBe(true);
      expect(health.recommendations.some(r => r.includes('Consider rotating'))).toBe(true);
      
      shortAgeManager.wipeMemory();
    });

    it('should recommend cleaning up deprecated keys', async () => {
      const originalResult = await keyManager.generateMasterKey('passphrase');
      
      // Create multiple deprecated keys by rotation
      for (let i = 0; i < 5; i++) {
        await keyManager.rotateKey(keyManager.getCurrentKeyId()!, 'passphrase');
      }
      
      const health = await keyManager.validateKeyHealth();
      
      expect(health.recommendations.some(r => r.includes('cleaning up'))).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid KDF gracefully', async () => {
      await expect(keyManager.generateMasterKey('test', {
        kdf: 'invalid-kdf' as any
      })).rejects.toThrow('Unsupported KDF');
    });

    it('should handle missing key files', async () => {
      await expect(keyManager.getKeyMetadata('non-existent-key'))
        .rejects.toThrow('Key metadata not found');
    });

    it('should handle corrupted key files', async () => {
      const result = await keyManager.generateMasterKey('test-passphrase');
      const keyPath = path.join(tempDir, `${result.keyId}.key`);
      
      // Corrupt the key file
      await fs.writeFile(keyPath, 'corrupted data');
      
      // Clear cache to force reload
      keyManager.wipeMemory();
      
      await expect(keyManager.loadMasterKey(result.keyId, 'test-passphrase'))
        .rejects.toThrow();
    });
  });

  describe('Security Properties', () => {
    it('should generate unique key IDs', async () => {
      const keyIds = new Set<string>();
      
      for (let i = 0; i < 10; i++) {
        const result = await keyManager.generateMasterKey(`passphrase-${i}`);
        keyIds.add(result.keyId);
      }
      
      expect(keyIds.size).toBe(10); // All should be unique
    });

    it('should use different salts for each key', async () => {
      const result1 = await keyManager.generateMasterKey('same-passphrase');
      const result2 = await keyManager.generateMasterKey('same-passphrase');
      
      // Keys should be different even with same passphrase due to different salts
      expect(result1.key.equals(result2.key)).toBe(false);
    });

    it('should securely store keys at rest', async () => {
      const result = await keyManager.generateMasterKey('secure-passphrase');
      const keyPath = path.join(tempDir, `${result.keyId}.key`);
      
      // Read raw key file
      const rawKeyData = await fs.readJson(keyPath);
      
      // Should be encrypted (not contain the actual key)
      const keyDataString = JSON.stringify(rawKeyData);
      expect(keyDataString).not.toContain(result.key.toString('base64'));
      expect(keyDataString).not.toContain('secure-passphrase');
    });
  });

  describe('Performance Tests', () => {
    it('should handle key operations efficiently', async () => {
      const startTime = Date.now();
      
      // Generate, rotate, and load operations
      const result = await keyManager.generateMasterKey('perf-test');
      await keyManager.rotateKey(result.keyId, 'perf-test');
      await keyManager.loadMasterKey(result.keyId, 'perf-test');
      await keyManager.listKeys();
      
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should cache keys for performance', async () => {
      const result = await keyManager.generateMasterKey('cache-test');
      
      // Clear cache to ensure first load is from disk
      keyManager.wipeMemory();
      
      // First load (from disk)
      const start1 = process.hrtime.bigint();
      await keyManager.loadMasterKey(result.keyId, 'cache-test');
      const time1 = Number(process.hrtime.bigint() - start1) / 1000000; // Convert to milliseconds
      
      // Second load (from cache)
      const start2 = process.hrtime.bigint();
      await keyManager.loadMasterKey(result.keyId, 'cache-test');
      const time2 = Number(process.hrtime.bigint() - start2) / 1000000;
      
      // Cache should be faster, but allow for some variance in timing
      expect(time2).toBeLessThan(Math.max(time1, 1)); // At least faster than disk or 1ms
    });
  });
});