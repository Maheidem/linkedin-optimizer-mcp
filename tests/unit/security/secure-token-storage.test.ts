/**
 * Unit tests for SecureTokenStorage
 * Tests AES-256-GCM encryption, key derivation, and security features
 */

import { SecureTokenStorage, EncryptedTokenData, TokenStorageUtils } from '../../../src/security/secure-token-storage';
import { TokenResponse } from '../../../src/auth/pkce-oauth-manager';
import { randomBytes, createHash } from 'crypto';

describe('SecureTokenStorage', () => {
  let storage: SecureTokenStorage;
  let sampleToken: TokenResponse;

  beforeEach(() => {
    storage = new SecureTokenStorage();
    sampleToken = {
      access_token: 'test-access-token-12345',
      token_type: 'Bearer',
      expires_in: 5400,
      refresh_token: 'test-refresh-token-67890',
      created_at: Math.floor(Date.now() / 1000)
    };
  });

  afterEach(() => {
    // Ensure keys are wiped after each test
    storage.wipeKeys();
  });

  describe('Constructor and Key Management', () => {
    it('should initialize with default options', () => {
      const newStorage = new SecureTokenStorage();
      expect(newStorage.getKeyVersion()).toBe(1);
      expect(newStorage.isReady()).toBe(false);
    });

    it('should initialize with custom options', () => {
      const customStorage = new SecureTokenStorage({
        keyDerivationRounds: 150000,
        keyVersion: 2,
        masterKey: 'test-master-key-for-encryption'
      });
      
      expect(customStorage.getKeyVersion()).toBe(2);
      expect(customStorage.isReady()).toBe(true);
    });

    it('should set master key from string', () => {
      const masterKey = 'my-secret-master-key';
      storage.setMasterKey(masterKey);
      expect(storage.isReady()).toBe(true);
    });

    it('should set master key from buffer', () => {
      const masterKey = randomBytes(32);
      storage.setMasterKey(masterKey);
      expect(storage.isReady()).toBe(true);
    });

    it('should reject invalid buffer key length', () => {
      const shortKey = randomBytes(16); // Too short
      expect(() => storage.setMasterKey(shortKey)).toThrow('Master key must be 32 bytes');
    });

    it('should generate secure master key', () => {
      const key = storage.generateMasterKey();
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
      expect(storage.isReady()).toBe(true);
    });

    it('should wipe keys from memory', () => {
      storage.generateMasterKey();
      expect(storage.isReady()).toBe(true);
      
      storage.wipeKeys();
      expect(storage.isReady()).toBe(false);
    });
  });

  describe('Token Encryption', () => {
    beforeEach(() => {
      storage.setMasterKey('test-master-key-for-encryption-operations');
    });

    it('should encrypt token successfully', () => {
      const encrypted = storage.encryptToken(sampleToken);
      
      expect(encrypted).toHaveProperty('encryptedToken');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('tag');
      expect(encrypted).toHaveProperty('salt');
      expect(encrypted).toHaveProperty('keyVersion', 1);
      expect(encrypted).toHaveProperty('timestamp');
      expect(encrypted).toHaveProperty('algorithm', 'aes-256-gcm');

      // Verify base64 encoding
      expect(() => Buffer.from(encrypted.iv, 'base64')).not.toThrow();
      expect(() => Buffer.from(encrypted.tag, 'base64')).not.toThrow();
      expect(() => Buffer.from(encrypted.salt, 'base64')).not.toThrow();
    });

    it('should produce different ciphertexts for identical tokens', () => {
      const encrypted1 = storage.encryptToken(sampleToken);
      const encrypted2 = storage.encryptToken(sampleToken);
      
      // Same token should produce different encrypted outputs due to random IV and salt
      expect(encrypted1.encryptedToken).not.toBe(encrypted2.encryptedToken);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
      expect(encrypted1.tag).not.toBe(encrypted2.tag);
    });

    it('should include current key version in encrypted data', () => {
      storage.setKeyVersion(3);
      const encrypted = storage.encryptToken(sampleToken);
      expect(encrypted.keyVersion).toBe(3);
    });

    it('should throw error when master key not set', () => {
      const noKeyStorage = new SecureTokenStorage();
      expect(() => noKeyStorage.encryptToken(sampleToken))
        .toThrow('Master key not set');
    });

    it('should handle encryption errors gracefully', () => {
      // Create invalid token that will cause JSON.stringify to fail
      const invalidToken = {
        access_token: 'test',
        token_type: 'Bearer',
        expires_in: 3600,
        created_at: Date.now(),
        circular: {} as any
      };
      invalidToken.circular.ref = invalidToken; // Circular reference

      expect(() => storage.encryptToken(invalidToken as any))
        .toThrow('Token encryption failed');
    });
  });

  describe('Token Decryption', () => {
    let encryptedToken: EncryptedTokenData;

    beforeEach(() => {
      storage.setMasterKey('test-master-key-for-encryption-operations');
      encryptedToken = storage.encryptToken(sampleToken);
    });

    it('should decrypt token successfully', () => {
      const decrypted = storage.decryptToken(encryptedToken);
      
      expect(decrypted).toEqual(sampleToken);
      expect(decrypted.access_token).toBe(sampleToken.access_token);
      expect(decrypted.token_type).toBe(sampleToken.token_type);
      expect(decrypted.expires_in).toBe(sampleToken.expires_in);
    });

    it('should detect tampered encrypted data', () => {
      // Tamper with encrypted token
      const tamperedData = { ...encryptedToken };
      tamperedData.encryptedToken = tamperedData.encryptedToken.replace(/A/g, 'B');

      expect(() => storage.decryptToken(tamperedData))
        .toThrow('Token integrity verification failed');
    });

    it('should detect tampered authentication tag', () => {
      const tamperedData = { ...encryptedToken };
      const tagBuffer = Buffer.from(tamperedData.tag, 'base64');
      tagBuffer[0] = tagBuffer[0] ^ 1; // Flip one bit
      tamperedData.tag = tagBuffer.toString('base64');

      expect(() => storage.decryptToken(tamperedData))
        .toThrow('Token integrity verification failed');
    });

    it('should validate encrypted data structure', () => {
      const invalidData: Partial<EncryptedTokenData> = { ...encryptedToken };
      delete invalidData.iv;

      expect(() => storage.decryptToken(invalidData as EncryptedTokenData))
        .toThrow('Missing required field: iv');
    });

    it('should reject unsupported algorithm', () => {
      const invalidData = { ...encryptedToken };
      invalidData.algorithm = 'aes-128-cbc';

      expect(() => storage.decryptToken(invalidData))
        .toThrow('Unsupported algorithm: aes-128-cbc');
    });

    it('should validate IV length', () => {
      const invalidData = { ...encryptedToken };
      invalidData.iv = Buffer.from('short').toString('base64');

      expect(() => storage.decryptToken(invalidData))
        .toThrow('Invalid IV length');
    });

    it('should validate tag length', () => {
      const invalidData = { ...encryptedToken };
      invalidData.tag = Buffer.from('short').toString('base64');

      expect(() => storage.decryptToken(invalidData))
        .toThrow('Invalid tag length');
    });

    it('should validate salt length', () => {
      const invalidData = { ...encryptedToken };
      invalidData.salt = Buffer.from('short').toString('base64');

      expect(() => storage.decryptToken(invalidData))
        .toThrow('Invalid salt length');
    });

    it('should throw error when master key not set', () => {
      const noKeyStorage = new SecureTokenStorage();
      expect(() => noKeyStorage.decryptToken(encryptedToken))
        .toThrow('Master key not set');
    });
  });

  describe('Token Structure Validation', () => {
    beforeEach(() => {
      storage.setMasterKey('test-master-key-for-validation-tests');
    });

    it('should validate decrypted token structure', () => {
      // Create encrypted data with invalid token structure
      const invalidToken = {
        access_token: '', // Empty access token
        token_type: 'Bearer',
        expires_in: 3600,
        created_at: Date.now()
      };

      const encrypted = storage.encryptToken(invalidToken as TokenResponse);
      
      expect(() => storage.decryptToken(encrypted))
        .toThrow('Missing or invalid access_token');
    });

    it('should reject token missing token_type', () => {
      const invalidToken = {
        access_token: 'valid-token',
        expires_in: 3600,
        created_at: Date.now()
      };

      const encrypted = storage.encryptToken(invalidToken as TokenResponse);
      
      expect(() => storage.decryptToken(encrypted))
        .toThrow('Missing or invalid token_type');
    });

    it('should reject token with invalid expires_in', () => {
      const invalidToken = {
        access_token: 'valid-token',
        token_type: 'Bearer',
        expires_in: 'invalid',
        created_at: Date.now()
      };

      const encrypted = storage.encryptToken(invalidToken as any);
      
      expect(() => storage.decryptToken(encrypted))
        .toThrow('Missing or invalid expires_in');
    });
  });

  describe('Key Versioning', () => {
    beforeEach(() => {
      storage.setMasterKey('test-master-key-for-versioning-tests');
    });

    it('should set and get key version', () => {
      expect(storage.getKeyVersion()).toBe(1);
      
      storage.setKeyVersion(5);
      expect(storage.getKeyVersion()).toBe(5);
    });

    it('should reject invalid key version', () => {
      expect(() => storage.setKeyVersion(0)).toThrow('Key version must be >= 1');
      expect(() => storage.setKeyVersion(-1)).toThrow('Key version must be >= 1');
    });

    it('should encrypt with specified key version', () => {
      storage.setKeyVersion(3);
      const encrypted = storage.encryptToken(sampleToken);
      expect(encrypted.keyVersion).toBe(3);
    });
  });

  describe('Algorithm Information', () => {
    it('should return correct algorithm information', () => {
      const info = storage.getAlgorithmInfo();
      
      expect(info.algorithm).toBe('aes-256-gcm');
      expect(info.keyLength).toBe(32);
      expect(info.ivLength).toBe(16);
      expect(info.tagLength).toBe(16);
      expect(info.saltLength).toBe(32);
      expect(typeof info.pbkdf2Rounds).toBe('number');
    });
  });

  describe('Cross-Instance Compatibility', () => {
    it('should decrypt tokens encrypted by different instance with same key', () => {
      const storage1 = new SecureTokenStorage();
      const storage2 = new SecureTokenStorage();
      
      const masterKey = 'shared-master-key-for-compatibility-test';
      storage1.setMasterKey(masterKey);
      storage2.setMasterKey(masterKey);
      
      const encrypted = storage1.encryptToken(sampleToken);
      const decrypted = storage2.decryptToken(encrypted);
      
      expect(decrypted).toEqual(sampleToken);
    });

    it('should fail to decrypt with different master key', () => {
      const storage1 = new SecureTokenStorage();
      const storage2 = new SecureTokenStorage();
      
      storage1.setMasterKey('key-one');
      storage2.setMasterKey('key-two');
      
      const encrypted = storage1.encryptToken(sampleToken);
      
      expect(() => storage2.decryptToken(encrypted))
        .toThrow('Token integrity verification failed');
    });
  });
});

describe('TokenStorageUtils', () => {
  describe('Master Key Generation', () => {
    it('should generate secure master key', () => {
      const key = TokenStorageUtils.generateSecureMasterKey();
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
      
      // Generate multiple keys and ensure they're different
      const key2 = TokenStorageUtils.generateSecureMasterKey();
      expect(key.equals(key2)).toBe(false);
    });
  });

  describe('Master Key Validation', () => {
    it('should validate strong master key', () => {
      const strongKey = randomBytes(32);
      const result = TokenStorageUtils.validateMasterKey(strongKey);
      
      expect(result.valid).toBe(true);
      expect(result.entropy).toBeGreaterThan(150);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect weak key with low length', () => {
      const weakKey = randomBytes(16);
      const result = TokenStorageUtils.validateMasterKey(weakKey);
      
      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('Key length less than 256 bits');
    });

    it('should detect patterns in key', () => {
      const patternKey = Buffer.alloc(32, 0x41); // All 'A' characters
      const result = TokenStorageUtils.validateMasterKey(patternKey);
      
      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('Low entropy detected in key');
      expect(result.warnings).toContain('Repeated byte patterns detected');
    });

    it('should calculate entropy correctly', () => {
      // Key with perfect entropy (all different bytes)
      const highEntropyKey = Buffer.from(Array.from({ length: 32 }, (_, i) => i));
      const result = TokenStorageUtils.validateMasterKey(highEntropyKey);
      
      expect(result.entropy).toBeGreaterThan(150);
    });
  });

  describe('Constant Time Comparison', () => {
    it('should return true for identical buffers', () => {
      const buffer1 = Buffer.from('test-data');
      const buffer2 = Buffer.from('test-data');
      
      expect(TokenStorageUtils.constantTimeEquals(buffer1, buffer2)).toBe(true);
    });

    it('should return false for different buffers', () => {
      const buffer1 = Buffer.from('test-data-1');
      const buffer2 = Buffer.from('test-data-2');
      
      expect(TokenStorageUtils.constantTimeEquals(buffer1, buffer2)).toBe(false);
    });

    it('should return false for different length buffers', () => {
      const buffer1 = Buffer.from('short');
      const buffer2 = Buffer.from('longer-buffer');
      
      expect(TokenStorageUtils.constantTimeEquals(buffer1, buffer2)).toBe(false);
    });

    it('should handle empty buffers', () => {
      const empty1 = Buffer.alloc(0);
      const empty2 = Buffer.alloc(0);
      
      expect(TokenStorageUtils.constantTimeEquals(empty1, empty2)).toBe(true);
    });
  });
});

describe('Security Properties', () => {
  let storage: SecureTokenStorage;
  let sampleToken: TokenResponse;

  beforeEach(() => {
    storage = new SecureTokenStorage();
    storage.setMasterKey('security-test-master-key');
    sampleToken = {
      access_token: 'security-test-token',
      token_type: 'Bearer',
      expires_in: 3600,
      created_at: Date.now()
    };
  });

  afterEach(() => {
    storage.wipeKeys();
  });

  describe('Randomness Properties', () => {
    it('should generate unique IVs for each encryption', () => {
      const encrypted1 = storage.encryptToken(sampleToken);
      const encrypted2 = storage.encryptToken(sampleToken);
      const encrypted3 = storage.encryptToken(sampleToken);
      
      const ivs = [encrypted1.iv, encrypted2.iv, encrypted3.iv];
      const uniqueIvs = new Set(ivs);
      
      expect(uniqueIvs.size).toBe(3); // All should be unique
    });

    it('should generate unique salts for each encryption', () => {
      const encrypted1 = storage.encryptToken(sampleToken);
      const encrypted2 = storage.encryptToken(sampleToken);
      const encrypted3 = storage.encryptToken(sampleToken);
      
      const salts = [encrypted1.salt, encrypted2.salt, encrypted3.salt];
      const uniqueSalts = new Set(salts);
      
      expect(uniqueSalts.size).toBe(3); // All should be unique
    });
  });

  describe('Memory Security', () => {
    it('should clear master key on wipe', () => {
      const originalKey = randomBytes(32);
      storage.setMasterKey(Buffer.from(originalKey));
      
      expect(storage.isReady()).toBe(true);
      
      storage.wipeKeys();
      
      expect(storage.isReady()).toBe(false);
      
      // Verify encryption fails after wipe
      expect(() => storage.encryptToken(sampleToken))
        .toThrow('Master key not set');
    });
  });

  describe('Integrity Protection', () => {
    it('should detect any modification to encrypted data', () => {
      const encrypted = storage.encryptToken(sampleToken);
      
      // Test modification of each field
      const fields: (keyof EncryptedTokenData)[] = ['encryptedToken', 'iv', 'tag', 'salt'];
      
      for (const field of fields) {
        const tampered = { ...encrypted };
        const originalValue = tampered[field] as string;
        
        // Modify the field slightly
        if (typeof originalValue === 'string') {
          const buffer = Buffer.from(originalValue, 'base64');
          buffer[0] = buffer[0] ^ 1; // Flip one bit
          (tampered as any)[field] = buffer.toString('base64');
        }
        
        expect(() => storage.decryptToken(tampered))
          .toThrow('Token integrity verification failed');
      }
    });
  });

  describe('Performance Characteristics', () => {
    it('should complete encryption/decryption within reasonable time', () => {
      const start = Date.now();
      
      for (let i = 0; i < 100; i++) {
        const encrypted = storage.encryptToken(sampleToken);
        const decrypted = storage.decryptToken(encrypted);
        expect(decrypted.access_token).toBe(sampleToken.access_token);
      }
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });
});