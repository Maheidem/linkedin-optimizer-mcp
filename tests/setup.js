// Jest setup file for LinkedIn MCP tests

// Global test configuration
global.testConfig = {
  timeout: 30000,
  retries: 3
};

// Mock sensitive environment variables
process.env.NODE_ENV = 'test';
process.env.LINKEDIN_CLIENT_ID = 'test-client-id';
process.env.LINKEDIN_CLIENT_SECRET = 'test-client-secret';

// Mock console methods to reduce noise during tests (optional)
if (process.env.SILENT_TESTS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}

// Global test utilities
global.testUtils = {
  // Generate test access token
  generateTestToken: () => {
    return 'test-access-token-' + Date.now();
  },
  
  // Mock LinkedIn API responses
  mockLinkedInResponse: (data) => {
    return {
      status: 200,
      data: data || { success: true }
    };
  },
  
  // Wait for async operations
  wait: (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// Cleanup after tests
afterEach(() => {
  jest.clearAllMocks();
});