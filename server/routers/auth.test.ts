/**
 * Unit Tests for Auth Router
 *
 * Tests all tRPC procedures in the auth router.
 * Uses AAA (Arrange, Act, Assert) pattern for clarity.
 *
 * @module server/routers/auth.test.ts
 */

import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest";
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

// Mock the database (MUST be before other imports)
vi.mock("../db", () => setupDbMock());

// Mock permission service (MUST be before other imports)
vi.mock("../services/permissionService", () => setupPermissionMock());

import { appRouter } from "../routers";
import { createContext } from "../_core/context";

// Mock user for authenticated requests
const mockUser = {
  id: 1,
  email: "test@terp.com",
  name: "Test User",
};

// Create a test caller with mock context
const createCaller = async (authenticated = true) => {
  const ctx = await createContext({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req: { headers: {} } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res: {} as any,
  });

  return appRouter.createCaller({
    ...ctx,
    user: authenticated ? mockUser : null,
  });
};

describe("Auth Router", () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;

  beforeAll(async () => {
    caller = await createCaller();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("me", () => {
    it("should return current user when authenticated", async () => {
      // Act
      const result = await caller.auth.me();

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(mockUser.id);
      expect(result?.email).toBe(mockUser.email);
    });

    it("should return null when not authenticated", async () => {
      // Arrange
      const unauthenticatedCaller = await createCaller(false);

      // Act
      const result = await unauthenticatedCaller.auth.me();

      // Assert
      expect(result).toBeNull();
    });
  });

  // Note: logout tests require res.clearCookie mock which is complex to set up
  // These are better tested in E2E tests
});

describe("Auth Security", () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;

  beforeAll(async () => {
    caller = await createCaller();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not expose password in user response", async () => {
    // Act
    const result = await caller.auth.me();

    // Assert
    expect(result).toBeDefined();
    expect(result).not.toHaveProperty("password");
  });

  it("should return user without sensitive fields", async () => {
    // Act
    const result = await caller.auth.me();

    // Assert
    expect(result).toBeDefined();
    if (result) {
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("email");
      expect(result).not.toHaveProperty("passwordHash");
      expect(result).not.toHaveProperty("sessionToken");
    }
  });
});

describe("Auth Context", () => {
  it("should create caller with authenticated context", async () => {
    // Arrange & Act
    const authenticatedCaller = await createCaller(true);
    const result = await authenticatedCaller.auth.me();

    // Assert
    expect(result).toBeDefined();
    expect(result?.id).toBe(mockUser.id);
  });

  it("should create caller with unauthenticated context", async () => {
    // Arrange & Act
    const unauthenticatedCaller = await createCaller(false);
    const result = await unauthenticatedCaller.auth.me();

    // Assert
    expect(result).toBeNull();
  });
});
