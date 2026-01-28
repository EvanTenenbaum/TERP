/**
 * Admin Setup Router Security Tests
 *
 * SEC-027: Verify admin setup endpoints are properly protected against:
 * - Unauthenticated access
 * - Non-admin user access
 * - Invalid setup key
 * - Rate limiting bypass attempts
 *
 * @module server/routers/adminSetup.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ============================================================================
// MOCKS - Must be defined before any imports that use them
// ============================================================================

// Mock the debug router module
vi.mock("../routers/debug", () => ({
  debugRouter: {
    getCounts: vi.fn(),
  },
}));

// Import test utilities
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

// Mock the database
vi.mock("../db", () => setupDbMock());

// Mock getDb from _core/db
vi.mock("../_core/db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue({ insertId: 1 }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ changes: 1 }),
      }),
    }),
    execute: vi.fn().mockResolvedValue([]),
  }),
}));

// Mock permission service
vi.mock("../services/permissionService", () => setupPermissionMock());

// Mock logger
vi.mock("../_core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock env
vi.mock("../_core/env", () => ({
  env: {
    isProduction: false,
    PUBLIC_DEMO_USER_EMAIL: "demo@terp.local",
    PUBLIC_DEMO_USER_ID: "demo-user",
  },
}));

import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { isPublicDemoUser } from "../_core/context";
import * as permissionService from "../services/permissionService";

// ============================================================================
// TEST FIXTURES
// ============================================================================

type MockUser = {
  id: number;
  openId: string;
  email: string;
  name: string;
  role: "user" | "admin";
  loginMethod: null;
  deletedAt: null;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

// Regular non-admin user
const regularUser: MockUser = {
  id: 42,
  openId: "user_regular123",
  email: "regular@terp.com",
  name: "Regular User",
  role: "user",
  loginMethod: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

// Admin user
const adminUser: MockUser = {
  id: 1,
  openId: "user_admin",
  email: "admin@terp.com",
  name: "Admin User",
  role: "admin",
  loginMethod: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

// Public demo user (id: -1)
const publicDemoUser: MockUser = {
  id: -1,
  openId: "public-demo-user",
  email: "demo@terp.local",
  name: "Public Demo",
  role: "user",
  loginMethod: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

// Create test caller with specific user
const createCallerWithUser = (user: MockUser | null) => {
  const ctx = {
    user,
    req: {
      headers: { "x-forwarded-for": "127.0.0.1" },
      cookies: {},
      ip: "127.0.0.1",
      url: "/api/trpc/adminSetup.listUsers",
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    isPublicDemoUser: user ? isPublicDemoUser(user) : false,
  };

  return appRouter.createCaller(ctx as unknown as TrpcContext);
};

// ============================================================================
// TESTS
// ============================================================================

describe("Admin Setup Router Security (SEC-027)", () => {
  const VALID_SETUP_KEY = "test-setup-key-12345";
  const INVALID_SETUP_KEY = "wrong-key";

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up environment variable for setup key
    process.env.ADMIN_SETUP_KEY = VALID_SETUP_KEY;
    // Reset permission mocks to deny by default
    vi.mocked(permissionService.hasPermission).mockResolvedValue(false);
    vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);
  });

  afterEach(() => {
    delete process.env.ADMIN_SETUP_KEY;
  });

  describe("Authentication Checks", () => {
    it("should reject unauthenticated users for listUsers", async () => {
      const caller = createCallerWithUser(null);

      await expect(
        caller.adminSetup.listUsers({ setupKey: VALID_SETUP_KEY })
      ).rejects.toThrow();
    });

    it("should reject unauthenticated users for promoteToAdmin", async () => {
      const caller = createCallerWithUser(null);

      await expect(
        caller.adminSetup.promoteToAdmin({
          setupKey: VALID_SETUP_KEY,
          userId: 1,
        })
      ).rejects.toThrow();
    });

    it("should reject unauthenticated users for promoteAllToAdmin", async () => {
      const caller = createCallerWithUser(null);

      await expect(
        caller.adminSetup.promoteAllToAdmin({
          setupKey: VALID_SETUP_KEY,
          confirmPhrase: "I understand this promotes all users",
        })
      ).rejects.toThrow();
    });
  });

  describe("Authorization Checks - Non-Admin Users", () => {
    it("should reject non-admin users for listUsers", async () => {
      const caller = createCallerWithUser(regularUser);

      try {
        await caller.adminSetup.listUsers({ setupKey: VALID_SETUP_KEY });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        if (error instanceof TRPCError) {
          expect(error.code).toBe("FORBIDDEN");
        }
      }
    });

    it("should reject non-admin users for promoteToAdmin", async () => {
      const caller = createCallerWithUser(regularUser);

      try {
        await caller.adminSetup.promoteToAdmin({
          setupKey: VALID_SETUP_KEY,
          userId: 1,
        });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        if (error instanceof TRPCError) {
          expect(error.code).toBe("FORBIDDEN");
        }
      }
    });

    it("should reject non-admin users for promoteAllToAdmin", async () => {
      const caller = createCallerWithUser(regularUser);

      try {
        await caller.adminSetup.promoteAllToAdmin({
          setupKey: VALID_SETUP_KEY,
          confirmPhrase: "I understand this promotes all users",
        });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        if (error instanceof TRPCError) {
          expect(error.code).toBe("FORBIDDEN");
        }
      }
    });
  });

  describe("Authorization Checks - Public Demo Users", () => {
    it("should reject public demo user for listUsers", async () => {
      const caller = createCallerWithUser(publicDemoUser);

      try {
        await caller.adminSetup.listUsers({ setupKey: VALID_SETUP_KEY });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        if (error instanceof TRPCError) {
          expect(error.code).toBe("FORBIDDEN");
        }
      }
    });

    it("should reject public demo user for promoteToAdmin", async () => {
      const caller = createCallerWithUser(publicDemoUser);

      try {
        await caller.adminSetup.promoteToAdmin({
          setupKey: VALID_SETUP_KEY,
          userId: 1,
        });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        if (error instanceof TRPCError) {
          expect(error.code).toBe("FORBIDDEN");
        }
      }
    });
  });

  describe("Setup Key Validation", () => {
    it("should reject invalid setup key for listUsers", async () => {
      const caller = createCallerWithUser(adminUser);

      try {
        await caller.adminSetup.listUsers({ setupKey: INVALID_SETUP_KEY });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        if (error instanceof TRPCError) {
          expect(error.code).toBe("FORBIDDEN");
          expect(error.message).toContain("Invalid setup key");
        }
      }
    });

    it("should reject invalid setup key for promoteToAdmin", async () => {
      const caller = createCallerWithUser(adminUser);

      try {
        await caller.adminSetup.promoteToAdmin({
          setupKey: INVALID_SETUP_KEY,
          userId: 1,
        });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        if (error instanceof TRPCError) {
          expect(error.code).toBe("FORBIDDEN");
          expect(error.message).toContain("Invalid setup key");
        }
      }
    });

    it("should reject invalid setup key for promoteAllToAdmin", async () => {
      const caller = createCallerWithUser(adminUser);

      try {
        await caller.adminSetup.promoteAllToAdmin({
          setupKey: INVALID_SETUP_KEY,
          confirmPhrase: "I understand this promotes all users",
        });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        if (error instanceof TRPCError) {
          expect(error.code).toBe("FORBIDDEN");
          expect(error.message).toContain("Invalid setup key");
        }
      }
    });

    it("should reject when ADMIN_SETUP_KEY env var is not set", async () => {
      delete process.env.ADMIN_SETUP_KEY;
      const caller = createCallerWithUser(adminUser);

      try {
        await caller.adminSetup.listUsers({ setupKey: "any-key" });
        expect.fail("Should have thrown PRECONDITION_FAILED error");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        if (error instanceof TRPCError) {
          expect(error.code).toBe("PRECONDITION_FAILED");
          expect(error.message).toContain("ADMIN_SETUP_KEY");
        }
      }
    });
  });

  describe("Confirmation Phrase Validation", () => {
    it("should reject invalid confirmation phrase for promoteAllToAdmin", async () => {
      const caller = createCallerWithUser(adminUser);

      try {
        await caller.adminSetup.promoteAllToAdmin({
          setupKey: VALID_SETUP_KEY,
          confirmPhrase: "wrong phrase",
        });
        expect.fail("Should have thrown BAD_REQUEST error");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        if (error instanceof TRPCError) {
          expect(error.code).toBe("BAD_REQUEST");
          expect(error.message).toContain("Invalid confirmation phrase");
        }
      }
    });
  });

  describe("Input Validation", () => {
    it("should reject promoteToAdmin without any identifier", async () => {
      const caller = createCallerWithUser(adminUser);

      try {
        await caller.adminSetup.promoteToAdmin({
          setupKey: VALID_SETUP_KEY,
          // No userId, email, or openId provided
        });
        expect.fail("Should have thrown BAD_REQUEST error");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        if (error instanceof TRPCError) {
          expect(error.code).toBe("BAD_REQUEST");
          expect(error.message).toContain("Must provide");
        }
      }
    });
  });

  describe("Security: Procedure Type Verification", () => {
    it("should use adminProcedure (not publicProcedure) - verified via rejection of non-admin", async () => {
      // This test verifies that endpoints use adminProcedure by checking
      // that non-admin users are rejected BEFORE any business logic runs
      const caller = createCallerWithUser(regularUser);

      // If publicProcedure was used, this would reach the setup key check
      // and throw "Invalid setup key" instead of "FORBIDDEN"
      try {
        await caller.adminSetup.listUsers({ setupKey: VALID_SETUP_KEY });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        if (error instanceof TRPCError) {
          // FORBIDDEN means adminProcedure rejected before reaching setup key check
          expect(error.code).toBe("FORBIDDEN");
          // Should NOT be about setup key
          expect(error.message).not.toContain("Invalid setup key");
        }
      }
    });
  });

  describe("Error Response Security", () => {
    it("should not leak sensitive info in error messages for invalid key", async () => {
      const caller = createCallerWithUser(adminUser);

      try {
        await caller.adminSetup.listUsers({ setupKey: INVALID_SETUP_KEY });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        if (error instanceof TRPCError) {
          // Error message should not contain the actual key
          expect(error.message).not.toContain(VALID_SETUP_KEY);
          // Should be generic message
          expect(error.message).toBe("Invalid setup key");
        }
      }
    });
  });
});

describe("Admin Setup Router - Static Code Analysis (SEC-027)", () => {
  it("should verify adminSetup.ts uses adminProcedure via file content", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const filePath = path.join(__dirname, "adminSetup.ts");
    const content = fs.readFileSync(filePath, "utf-8");

    // Verify import includes adminProcedure
    expect(content).toContain('import { z } from "zod"');
    expect(content).toContain("adminProcedure");

    // Verify no publicProcedure usage
    expect(content).not.toMatch(/publicProcedure\.(query|mutation)/);

    // Verify all endpoints use adminProcedure
    const adminProcedureCount = (
      content.match(/adminProcedure\s*\.\s*(query|mutation|input)/g) || []
    ).length;
    expect(adminProcedureCount).toBeGreaterThanOrEqual(3); // listUsers, promoteToAdmin, promoteAllToAdmin

    // Verify rate limiting is implemented
    expect(content).toContain("checkRateLimit");
    expect(content).toContain("TOO_MANY_REQUESTS");

    // Verify audit logging is implemented
    expect(content).toContain("logAdminSetupAction");

    // Verify production environment check exists
    expect(content).toContain("assertAdminSetupAllowed");
    expect(content).toContain("isProductionEnvironment");
  });

  it("should verify adminSetup.ts does not use fallback user ID pattern", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const filePath = path.join(__dirname, "adminSetup.ts");
    const content = fs.readFileSync(filePath, "utf-8");

    // Check for forbidden fallback patterns
    expect(content).not.toMatch(/ctx\.user\?\.(id|openId)\s*\|\|\s*\d/);
    expect(content).not.toMatch(/ctx\.user\?\.(id|openId)\s*\?\?\s*\d/);
  });
});
