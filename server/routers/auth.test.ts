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
import { createMockContext } from "../../tests/unit/mocks/db.mock";

// Mock user for authenticated requests
const mockUser = {
  id: 1,
  email: "test@terp.com",
  name: "Test User",
};

// Create a test caller with mock context
const createCaller = (authenticated = true) => {
  const ctx = createMockContext({ user: authenticated ? mockUser : null });
  return appRouter.createCaller(ctx);
};

describe("Auth Router", () => {
  let caller: ReturnType<typeof createCaller>;

  beforeAll(() => {
    caller = createCaller();
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
      const unauthenticatedCaller = createCaller(false);

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
  let caller: ReturnType<typeof createCaller>;

  beforeAll(() => {
    caller = createCaller();
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

describe("getTestToken", () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;

  beforeAll(async () => {
    caller = await createCaller(false); // getTestToken is a public procedure
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should be defined as a public procedure", async () => {
    // Assert - the endpoint exists
    expect(caller.auth.getTestToken).toBeDefined();
  });

  it("should validate email format", async () => {
    // Act & Assert - invalid email format should fail zod validation
    await expect(
      caller.auth.getTestToken({
        email: "not-an-email",
        password: "anypassword",
      })
    ).rejects.toThrow();
  });

  it("should require both email and password", async () => {
    // Act & Assert - missing password should fail zod validation
    await expect(
      // @ts-expect-error - testing invalid input
      caller.auth.getTestToken({
        email: "test@example.com",
      })
    ).rejects.toThrow();
  });

  // Note: Full integration tests for getTestToken (valid credentials, invalid
  // credentials, ENABLE_TEST_AUTH behavior) require getUserByEmail, bcrypt,
  // and simpleAuth mocks. These are tested in auth-integration.test.ts
  // with a proper test database setup.
});
