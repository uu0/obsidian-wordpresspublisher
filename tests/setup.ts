/**
 * Jest test setup file
 * Configure test environment and global mocks
 */

// Extend Jest matchers if needed
expect.extend({});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Set test timeout
jest.setTimeout(10000);

// Mock process.env for testing
process.env.NODE_ENV = 'test';
