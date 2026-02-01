import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import "@testing-library/jest-dom/vitest";

// Mock ResizeObserver for jsdom (browser global not available in test environment)
// TEST-021, TEST-023: ResizeObserver polyfill with proper constructor
class ResizeObserverMock {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private callback: (entries: any[], observer: any) => void;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(callback: (entries: any[], observer: any) => void) {
    this.callback = callback;
  }

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

// Set ResizeObserver globally for all environments
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).ResizeObserver = ResizeObserverMock;
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).ResizeObserver = ResizeObserverMock;
}

// Cleanup after each test case (for React tests)
// TEST-026: Add vi.clearAllMocks() to prevent test pollution
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock environment variables for tests
process.env.NODE_ENV = "test";
// Set JWT_SECRET for tests (test-only value, not a real secret)
// Using a test value that meets minimum length requirement
const testJwtValue = "test-jwt-value-for-testing-minimum-32-chars";
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = testJwtValue;
}
// Set a test DATABASE_URL to allow modules that check for it to load
// This is a placeholder - actual database connections will fail but pure function tests will work
// NOTE: Some server modules will attempt to connect and log CRITICAL errors - this is expected
// in unit tests and does not affect test results. For integration tests, use a real database.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "mysql://test:test@localhost:3306/terp_test";
}
// Mark this as a test environment to allow server modules to skip health checks
process.env.VITEST = "true";

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

// TEST-INFRA-03, BUG-109: Mock Radix UI Presence to prevent infinite loops in jsdom
// This is a known issue with Radix UI + jsdom: https://github.com/radix-ui/primitives/issues/1822
vi.mock("@radix-ui/react-presence", () => ({
  Presence: ({
    children,
    present,
  }: {
    children: ReactNode;
    present?: boolean;
  }) => (present ? children : null),
}));

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
if (typeof window === "undefined") {
  // @ts-ignore
  global.window = {};
}
Object.defineProperty(global.window, "localStorage", {
  value: localStorageMock,
  writable: true,
});
// Also set on global for direct access
Object.defineProperty(global, "localStorage", {
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
// TEST-024: Add isPending property for newer React Query/tRPC compatibility
const defaultQueryReturn = {
  data: null,
  isLoading: false,
  isPending: false,
  isError: false,
  error: null,
  isSuccess: true,
  isFetching: false,
  refetch: vi.fn(),
  status: "success" as const,
};

const defaultMutationReturn = {
  mutate: vi.fn(),
  mutateAsync: vi.fn(async () => undefined),
  isLoading: false,
  isPending: false,
  isError: false,
  error: null,
  isSuccess: false,
  reset: vi.fn(),
  status: "idle" as const,
};

/**
 * Creates a mock for useUtils/useContext that provides cache invalidation utilities
 * TEST-024: Add useUtils support for tRPC v11
 */
const createUtilsMock = (): unknown => {
  const utilsProxy = new Proxy(
    {},
    {
      get: (_target, prop) => {
        // Handle common utility methods
        if (prop === "invalidate") {
          return vi.fn();
        }
        if (prop === "refetch") {
          return vi.fn();
        }
        if (prop === "cancel") {
          return vi.fn();
        }
        if (prop === "setData") {
          return vi.fn();
        }
        if (prop === "getData") {
          return vi.fn(() => null);
        }
        if (prop === "setInfiniteData") {
          return vi.fn();
        }
        if (prop === "getInfiniteData") {
          return vi.fn(() => null);
        }
        // Return a nested proxy for router paths (e.g., utils.clients.list.invalidate)
        return createUtilsMock();
      },
    }
  );
  return utilsProxy;
};

/**
 * Creates a recursive Proxy handler for tRPC hooks.
 * This allows mocking any depth of router structure (e.g., trpc.user.list.useQuery).
 */
const createTrpcMockProxy = (path: string): unknown => {
  return new Proxy(
    {},
    {
      get: (_target, prop, _receiver) => {
        const fullPath = `${path}.${String(prop)}`;

        // TEST-024: Handle useUtils at the top level (trpc.useUtils())
        if (prop === "useUtils") {
          return vi.fn(() => createUtilsMock());
        }

        // Handle the terminal hook calls (useQuery, useMutation, etc.)
        if (prop === "useQuery") {
          return vi.fn(() => defaultQueryReturn);
        }
        if (prop === "useMutation") {
          return vi.fn(() => defaultMutationReturn);
        }
        if (prop === "useContext") {
          return vi.fn(() => createUtilsMock());
        }
        // Handle useSuspenseQuery for React Suspense
        if (prop === "useSuspenseQuery") {
          return vi.fn(() => ({ ...defaultQueryReturn, data: null }));
        }
        // Handle useInfiniteQuery for pagination
        if (prop === "useInfiniteQuery") {
          return vi.fn(() => ({
            ...defaultQueryReturn,
            data: { pages: [], pageParams: [] },
            fetchNextPage: vi.fn(),
            fetchPreviousPage: vi.fn(),
            hasNextPage: false,
            hasPreviousPage: false,
            isFetchingNextPage: false,
            isFetchingPreviousPage: false,
          }));
        }

        // Handle nested routers - recursively create a new proxy
        return createTrpcMockProxy(fullPath);
      },
    }
  );
};

// Mock the tRPC client module
vi.mock("../client/src/lib/trpc", () => {
  const trpc = createTrpcMockProxy("trpc");
  return {
    trpc,
    useContext: vi.fn(() => trpc),
  };
});
