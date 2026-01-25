import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock ResizeObserver for jsdom (browser global not available in test environment)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof window !== 'undefined' && !(window as any).ResizeObserver) {
  class ResizeObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).ResizeObserver = ResizeObserverMock;
}

// Cleanup after each test case (for React tests)
afterEach(() => {
  cleanup();
});

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
// Set JWT_SECRET for tests (test-only value, not a real secret)
// Using a test value that meets minimum length requirement
const testJwtValue = 'test-jwt-value-for-testing-minimum-32-chars';
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = testJwtValue;
}
// Set a test DATABASE_URL to allow modules that check for it to load
// This is a placeholder - actual database connections will fail but pure function tests will work
// NOTE: Some server modules will attempt to connect and log CRITICAL errors - this is expected
// in unit tests and does not affect test results. For integration tests, use a real database.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/terp_test';
}
// Mark this as a test environment to allow server modules to skip health checks
process.env.VITEST = 'true';

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


// ============================================================================
// tRPC Mock Setup
// ============================================================================

// Define the default mock return values
const defaultQueryReturn = {
  data: null,
  isLoading: false,
  isError: false,
  error: null,
  isSuccess: true,
  isFetching: false,
  refetch: vi.fn(),
};

const defaultMutationReturn = {
  mutate: vi.fn(),
  mutateAsync: vi.fn(async () => undefined),
  isLoading: false,
  isError: false,
  error: null,
  isSuccess: false,
  reset: vi.fn(),
};

/**
 * Creates a recursive Proxy handler for tRPC hooks.
 * This allows mocking any depth of router structure (e.g., trpc.user.list.useQuery).
 */
const createTrpcMockProxy = (path: string): any => {
  return new Proxy(
    {},
    {
      get: (_target, prop, _receiver) => {
        const fullPath = `${path}.${String(prop)}`;
        
        // Handle the terminal hook calls (useQuery, useMutation, etc.)
        if (prop === 'useQuery') {
          return vi.fn(() => defaultQueryReturn);
        }
        if (prop === 'useMutation') {
          return vi.fn(() => defaultMutationReturn);
        }
        if (prop === 'useContext') {
          return vi.fn(() => ({
            invalidate: vi.fn(),
            refetch: vi.fn(),
            cancel: vi.fn(),
          }));
        }
        
        // Handle nested routers - recursively create a new proxy
        return createTrpcMockProxy(fullPath);
      },
    }
  );
};

// Mock the tRPC client module
vi.mock('../client/src/lib/trpc', () => {
  const trpc = createTrpcMockProxy('trpc');
  return {
    trpc,
    useContext: vi.fn(() => trpc),
  };
});
