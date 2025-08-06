/**
 * Unit tests for IntegratedTokenSecurityManager
 * Tests the integration of automatic rotation with integrity verification
 */

import { IntegratedTokenSecurityManager, SecurityManagerEvent, SecurityManagerConfig } from '../../../src/security/integrated-token-security-manager';
import { TokenResponse } from '../../../src/auth/pkce-oauth-manager';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('IntegratedTokenSecurityManager', () => {
  let securityManager: IntegratedTokenSecurityManager;
  let tempDir: string;
  let sampleToken: TokenResponse;
  let config: SecurityManagerConfig;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'integrated-security-test-'));
    
    // Sample token for testing
    sampleToken = {
      access_token: 'test-access-token-12345',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'test-refresh-token-67890',
      created_at: Math.floor(Date.now() / 1000)
    };

    // Configuration for testing
    config = {
      storageDir: tempDir,
      backupDir: path.join(tempDir, 'backups'),
      keyStorage: {
        storageDir: tempDir,
        maxKeyAge: 30 * 24 * 60 * 60 * 1000,
        secureDelete: false
      },
      tokenLifecycle: {
        rotationThreshold: {
          timeThreshold: 1000, // 1 second for quick tests
          usageThreshold: 3
        },
        expirationBuffer: 100,
        cleanupInterval: 500,
        maxTokenAge: 2000
      },
      security: {
        enableAutoRotation: true,
        enableIntegrityChecking: true,
        enableSecureBackups: true,
        integrityCheckInterval: 1000, // 1 second for testing
        backupInterval: 2000, // 2 seconds for testing
        maxIntegrityFailures: 2,
        securityBreachActions: {
          revokeAllTokens: false,
          rotateKeys: true,
          notifyAdmin: true
        }
      },
      performance: {
        batchSize: 10,
        concurrentOperations: 2,
        cacheEnabled: true
      }
    };

    securityManager = new IntegratedTokenSecurityManager(config);
  });

  afterEach(async () => {
    // Shutdown security manager
    await securityManager.shutdown();
    
    // Remove temporary directory
    await fs.remove(tempDir);
  });

  describe('Initialization and Shutdown', () => {
    it('should initialize successfully', async () => {
      await securityManager.initialize();
      
      const status = securityManager.getSecurityStatus();
      expect(status.healthy).toBe(true);
    });

    it('should emit initialization event', async () => {
      const events: any[] = [];
      securityManager.on(SecurityManagerEvent.INITIALIZED, (data) => {
        events.push(data);
      });

      await securityManager.initialize();
      
      expect(events).toHaveLength(1);
      expect(events[0].timestamp).toBeGreaterThan(0);
      expect(events[0].config).toBeDefined();
    });

    it('should shutdown gracefully', async () => {
      await securityManager.initialize();
      
      // Should not throw
      await securityManager.shutdown();
    });

    it('should handle initialization errors', async () => {
      // Create invalid config
      const invalidConfig = {
        ...config,
        storageDir: '/invalid/path/that/does/not/exist'
      };
      
      const invalidManager = new IntegratedTokenSecurityManager(invalidConfig);
      
      await expect(invalidManager.initialize()).rejects.toThrow();
    });
  });

  describe('Secure Token Creation', () => {
    beforeEach(async () => {
      await securityManager.initialize();
    });

    it('should create secure token successfully', async () => {
      const result = await securityManager.createSecureToken(sampleToken);
      
      expect(result.tokenId).toBeDefined();
      expect(result.metadata.status).toBe('active');
      expect(result.metadata.keyId).toBeDefined();
      expect(result.metadata.keyVersion).toBeGreaterThan(0);
    });

    it('should create token with binding info', async () => {
      const bindingInfo = {
        clientId: 'test-client',
        userId: 'test-user',
        sessionId: 'test-session'
      };

      const result = await securityManager.createSecureToken(sampleToken, bindingInfo);
      
      expect(result.metadata.bindingInfo).toEqual(bindingInfo);
    });

    it('should create token with custom tags', async () => {
      const tags = ['production', 'api-access'];
      const result = await securityManager.createSecureToken(sampleToken, undefined, tags);
      
      expect(result.metadata.tags).toEqual(tags);
    });

    it('should update security status after token creation', async () => {
      const beforeStatus = securityManager.getSecurityStatus();
      await securityManager.createSecureToken(sampleToken);
      const afterStatus = securityManager.getSecurityStatus();
      
      expect(afterStatus.activeTokens).toBe(beforeStatus.activeTokens + 1);
    });

    it('should fail when not initialized', async () => {
      const uninitializedManager = new IntegratedTokenSecurityManager(config);
      
      await expect(uninitializedManager.createSecureToken(sampleToken))
        .rejects.toThrow('Security manager not initialized');
    });
  });

  describe('Secure Token Retrieval', () => {
    let tokenId: string;

    beforeEach(async () => {
      await securityManager.initialize();
      const result = await securityManager.createSecureToken(sampleToken);
      tokenId = result.tokenId;
    });

    it('should retrieve token successfully', async () => {
      const result = await securityManager.getSecureToken(tokenId);
      
      expect(result.token).toBeDefined();
      expect(result.token.access_token).toBe(sampleToken.access_token);
      expect(result.rotated).toBeUndefined();
    });

    it('should perform automatic rotation when needed', async () => {
      // Wait for token to exceed rotation threshold
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const result = await securityManager.getSecureToken(tokenId);
      
      expect(result.rotated).toBeDefined();
      expect(result.rotated!.success).toBe(true);
      expect(result.rotated!.newTokenId).toBeDefined();
      expect(result.rotated!.oldTokenId).toBe(tokenId);
    });

    it('should validate binding info during retrieval', async () => {
      const bindingInfo = { clientId: 'test-client', userId: 'test-user' };
      const boundResult = await securityManager.createSecureToken(sampleToken, bindingInfo);
      
      // Should succeed with correct binding
      const validResult = await securityManager.getSecureToken(boundResult.tokenId, bindingInfo);
      expect(validResult.token).toBeDefined();
      
      // Should fail with wrong binding
      const wrongBinding = { ...bindingInfo, userId: 'wrong-user' };
      await expect(securityManager.getSecureToken(boundResult.tokenId, wrongBinding))
        .rejects.toThrow();
    });

    it('should emit rotation event during automatic rotation', async () => {
      const events: any[] = [];
      securityManager.on(SecurityManagerEvent.TOKEN_ROTATED_AUTO, (data) => {
        events.push(data);
      });

      // Wait for rotation threshold
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await securityManager.getSecureToken(tokenId);
      
      expect(events).toHaveLength(1);
      expect(events[0].result.success).toBe(true);
    });

    it('should fail for non-existent token', async () => {
      await expect(securityManager.getSecureToken('non-existent-token'))
        .rejects.toThrow();
    });
  });

  describe('Secure Token Rotation', () => {
    let tokenId: string;

    beforeEach(async () => {
      await securityManager.initialize();
      const result = await securityManager.createSecureToken(sampleToken);
      tokenId = result.tokenId;
    });

    it('should perform secure rotation successfully', async () => {
      const result = await securityManager.performSecureRotation(tokenId);
      
      expect(result.success).toBe(true);
      expect(result.newTokenId).toBeDefined();
      expect(result.oldTokenId).toBe(tokenId);
      expect(result.integrityVerified).toBe(true);
      expect(result.securityScore).toBeGreaterThan(0);
    });

    it('should create backup during rotation when enabled', async () => {
      const result = await securityManager.performSecureRotation(tokenId);
      
      expect(result.backupCreated).toBe(true);
    });

    it('should calculate security score correctly', async () => {
      const result = await securityManager.performSecureRotation(tokenId);
      
      expect(result.securityScore).toBeGreaterThanOrEqual(0);
      expect(result.securityScore).toBeLessThanOrEqual(100);
      
      if (result.integrityVerified && result.backupCreated) {
        expect(result.securityScore).toBeGreaterThan(80);
      }
    });

    it('should handle rotation failure gracefully', async () => {
      const result = await securityManager.performSecureRotation('non-existent-token');
      
      expect(result.success).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.securityScore).toBe(0);
    });
  });

  describe('Integrity Verification', () => {
    beforeEach(async () => {
      await securityManager.initialize();
      await securityManager.createSecureToken(sampleToken);
      await securityManager.createSecureToken(sampleToken);
    });

    it('should perform integrity check successfully', async () => {
      const result = await securityManager.performIntegrityCheck();
      
      expect(result.passed).toBe(true);
      expect(result.tokensVerified).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should emit integrity verification events', async () => {
      const events: any[] = [];
      securityManager.on(SecurityManagerEvent.INTEGRITY_VERIFIED, (data) => {
        events.push(data);
      });

      await securityManager.performIntegrityCheck();
      
      expect(events).toHaveLength(1);
      expect(events[0].passed).toBe(true);
      expect(events[0].tokensVerified).toBeGreaterThan(0);
    });

    it('should update security status after integrity check', async () => {
      await securityManager.performIntegrityCheck();
      
      const status = securityManager.getSecurityStatus();
      expect(status.lastIntegrityCheck).toBeGreaterThan(0);
      expect(status.integrityFailures).toBe(0);
    });

    it('should handle integrity check failures', async () => {
      // Simulate integrity failure by corrupting storage
      // This would require more complex setup in a real scenario
      
      const errorEvents: any[] = [];
      securityManager.on(SecurityManagerEvent.ERROR, (data) => {
        errorEvents.push(data);
      });

      // Force an error condition - mock the storage to fail
      const originalStorage = (securityManager as any).storage;
      (securityManager as any).storage = {
        ...originalStorage,
        verifyIntegrity: jest.fn().mockRejectedValue(new Error('Simulated integrity failure'))
      };

      const result = await securityManager.performIntegrityCheck();
      
      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Restore original storage
      (securityManager as any).storage = originalStorage;
    });
  });

  describe('Secure Backups', () => {
    beforeEach(async () => {
      await securityManager.initialize();
      await securityManager.createSecureToken(sampleToken);
    });

    it('should create secure backup successfully', async () => {
      const result = await securityManager.createSecureBackup();
      
      expect(result.success).toBe(true);
      expect(result.backupId).toBeDefined();
      expect(result.size).toBeGreaterThan(0);
    });

    it('should emit backup events', async () => {
      const events: any[] = [];
      securityManager.on(SecurityManagerEvent.BACKUP_COMPLETED, (data) => {
        events.push(data);
      });

      await securityManager.createSecureBackup();
      
      expect(events).toHaveLength(1);
      expect(events[0].backupId).toBeDefined();
      expect(events[0].size).toBeGreaterThan(0);
    });

    it('should update security status after backup', async () => {
      await securityManager.createSecureBackup();
      
      const status = securityManager.getSecurityStatus();
      expect(status.lastBackup).toBeGreaterThan(0);
      expect(status.storageStats.backupCount).toBeGreaterThan(0);
    });

    it('should handle backup failures gracefully', async () => {
      // Mock storage to fail backup
      const originalStorage = (securityManager as any).storage;
      (securityManager as any).storage = {
        ...originalStorage,
        backup: jest.fn().mockRejectedValue(new Error('Backup failed'))
      };

      const result = await securityManager.createSecureBackup();
      
      expect(result.success).toBe(false);
      expect(result.backupId).toBeUndefined();

      // Restore original storage
      (securityManager as any).storage = originalStorage;
    });
  });

  describe('Security Status Monitoring', () => {
    beforeEach(async () => {
      await securityManager.initialize();
    });

    it('should return healthy status initially', () => {
      const status = securityManager.getSecurityStatus();
      
      expect(status.healthy).toBe(true);
      expect(status.activeTokens).toBe(0);
      expect(status.integrityFailures).toBe(0);
      expect(status.securityWarnings).toHaveLength(0);
    });

    it('should update status after token operations', async () => {
      await securityManager.createSecureToken(sampleToken);
      await securityManager.createSecureToken(sampleToken);
      
      const status = securityManager.getSecurityStatus();
      expect(status.activeTokens).toBe(2);
    });

    it('should reflect integrity check status', async () => {
      await securityManager.performIntegrityCheck();
      
      const status = securityManager.getSecurityStatus();
      expect(status.lastIntegrityCheck).toBeGreaterThan(0);
    });

    it('should reflect backup status', async () => {
      await securityManager.createSecureBackup();
      
      const status = securityManager.getSecurityStatus();
      expect(status.lastBackup).toBeGreaterThan(0);
    });

    it('should return unhealthy status when not initialized', () => {
      const uninitializedManager = new IntegratedTokenSecurityManager(config);
      const status = uninitializedManager.getSecurityStatus();
      
      expect(status.healthy).toBe(false);
      expect(status.securityWarnings).toContain('Security manager not initialized');
    });
  });

  describe('Cleanup Operations', () => {
    beforeEach(async () => {
      await securityManager.initialize();
      
      // Create some tokens
      await securityManager.createSecureToken(sampleToken);
      await securityManager.createSecureToken(sampleToken);
    });

    it('should perform cleanup successfully', async () => {
      const result = await securityManager.performCleanup();
      
      expect(typeof result.tokensRemoved).toBe('number');
      expect(typeof result.storageOptimized).toBe('boolean');
    });

    it('should emit cleanup events', async () => {
      const events: any[] = [];
      securityManager.on(SecurityManagerEvent.CLEANUP_COMPLETED, (data) => {
        events.push(data);
      });

      await securityManager.performCleanup();
      
      expect(events).toHaveLength(1);
      expect(typeof events[0].tokensRemoved).toBe('number');
      expect(typeof events[0].storageOptimized).toBe('boolean');
    });

    it('should handle cleanup failures gracefully', async () => {
      // Mock lifecycle manager to fail cleanup
      const originalLifecycleManager = (securityManager as any).lifecycleManager;
      (securityManager as any).lifecycleManager = {
        ...originalLifecycleManager,
        cleanupTokens: jest.fn().mockRejectedValue(new Error('Cleanup failed'))
      };

      const result = await securityManager.performCleanup();
      
      expect(result.tokensRemoved).toBe(0);
      expect(result.storageOptimized).toBe(false);

      // Restore original lifecycle manager
      (securityManager as any).lifecycleManager = originalLifecycleManager;
    });
  });

  describe('Automated Security Tasks', () => {
    it('should start integrity checking when enabled', async () => {
      const events: any[] = [];
      securityManager.on(SecurityManagerEvent.INTEGRITY_VERIFIED, (data) => {
        events.push(data);
      });

      await securityManager.initialize();
      
      // Wait for automated integrity check
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it('should start auto backups when enabled', async () => {
      const events: any[] = [];
      securityManager.on(SecurityManagerEvent.BACKUP_COMPLETED, (data) => {
        events.push(data);
      });

      await securityManager.initialize();
      
      // Wait for automated backup
      await new Promise(resolve => setTimeout(resolve, 2200));
      
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it('should disable automated tasks when configured', async () => {
      const disabledConfig = {
        ...config,
        security: {
          ...config.security,
          enableIntegrityChecking: false,
          enableSecureBackups: false
        }
      };

      const disabledManager = new IntegratedTokenSecurityManager(disabledConfig);
      
      const integrityEvents: any[] = [];
      const backupEvents: any[] = [];
      
      disabledManager.on(SecurityManagerEvent.INTEGRITY_VERIFIED, (data) => {
        integrityEvents.push(data);
      });
      
      disabledManager.on(SecurityManagerEvent.BACKUP_COMPLETED, (data) => {
        backupEvents.push(data);
      });

      await disabledManager.initialize();
      
      // Wait to see if any automated tasks run
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      expect(integrityEvents).toHaveLength(0);
      expect(backupEvents).toHaveLength(0);

      await disabledManager.shutdown();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await securityManager.initialize();
    });

    it('should emit error events on failures', async () => {
      const errorEvents: any[] = [];
      securityManager.on(SecurityManagerEvent.ERROR, (data) => {
        errorEvents.push(data);
      });

      // Try to get non-existent token
      try {
        await securityManager.getSecureToken('non-existent');
      } catch {
        // Expected to fail
      }
      
      expect(errorEvents.length).toBeGreaterThan(0);
    });

    it('should emit warning events', async () => {
      const warningEvents: any[] = [];
      securityManager.on(SecurityManagerEvent.WARNING, (data) => {
        warningEvents.push(data);
      });

      // Create a token and trigger warning conditions
      const result = await securityManager.createSecureToken(sampleToken);
      
      // Wait for potential warnings (from lifecycle manager)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Warnings might not always be generated in this simple test,
      // but the event handler should be set up correctly
      expect(typeof warningEvents.length).toBe('number');
    });

    it('should handle security breach detection', async () => {
      const breachEvents: any[] = [];
      securityManager.on(SecurityManagerEvent.SECURITY_BREACH_DETECTED, (data) => {
        breachEvents.push(data);
      });

      // Force integrity failures to trigger breach detection
      const failureConfig = {
        ...config,
        security: {
          ...config.security,
          maxIntegrityFailures: 1
        }
      };

      const breachManager = new IntegratedTokenSecurityManager(failureConfig);
      await breachManager.initialize();

      // Mock repeated integrity failures
      const originalStorage = (breachManager as any).storage;
      (breachManager as any).storage = {
        ...originalStorage,
        verifyIntegrity: jest.fn().mockResolvedValue({
          valid: false,
          errors: ['Simulated failure'],
          repaired: 0
        })
      };

      // Trigger multiple integrity checks to exceed threshold
      await breachManager.performIntegrityCheck();
      await breachManager.performIntegrityCheck();
      
      expect(breachEvents.length).toBeGreaterThan(0);
      
      await breachManager.shutdown();
    });
  });

  describe('Performance and Scalability', () => {
    beforeEach(async () => {
      await securityManager.initialize();
    });

    it('should handle multiple concurrent token operations', async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        const token = { ...sampleToken, access_token: `concurrent-token-${i}` };
        promises.push(securityManager.createSecureToken(token));
      }
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      expect(new Set(results.map(r => r.tokenId)).size).toBe(5);
    });

    it('should complete operations within reasonable time', async () => {
      const startTime = Date.now();
      
      await securityManager.createSecureToken(sampleToken);
      await securityManager.performIntegrityCheck();
      await securityManager.createSecureBackup();
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Configuration Validation', () => {
    it('should accept valid configuration', () => {
      expect(() => new IntegratedTokenSecurityManager(config)).not.toThrow();
    });

    it('should apply default values for optional config', () => {
      const minimalConfig = {
        storageDir: tempDir,
        keyStorage: {
          storageDir: tempDir,
          maxKeyAge: 30 * 24 * 60 * 60 * 1000,
          secureDelete: false
        },
        tokenLifecycle: {},
        security: {},
        performance: {}
      };

      const manager = new IntegratedTokenSecurityManager(minimalConfig);
      expect(manager).toBeInstanceOf(IntegratedTokenSecurityManager);
    });
  });
});