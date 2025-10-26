import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test case (for React tests)
afterEach(() => {
  cleanup();
});

// Mock environment variables for tests
process.env.NODE_ENV = 'test';

// Global test utilities
global.testUtils = {
  // Add any global test utilities here
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
};

