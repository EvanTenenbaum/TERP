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

// Mock localStorage for browser-dependent tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

// Setup global window and localStorage
if (typeof window === 'undefined') {
  // @ts-ignore
  global.window = {};
}
Object.defineProperty(global.window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});
// Also set on global for direct access
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Clear localStorage before each test
afterEach(() => {
  localStorageMock.clear();
});

