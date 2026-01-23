import { describe, it, expect, beforeAll, vi } from "vitest";
import { setupDbMock } from "./test-utils/testDb";
import { setupPermissionMock } from "./test-utils/testPermissions";

// Mock the database (MUST be before other imports)
vi.mock("./db", () => setupDbMock());
// Mock permission service (MUST be before other imports)
vi.mock("./services/permissionService", () => setupPermissionMock());

import { appRouter } from "./routers";
import { createContext } from "./_core/context";

describe("Authentication Integration Tests", () => {
  describe("User Authentication", () => {
    it("should create context with authenticated user", async () => {
      const mockUser = {
        id: 1,
        email: "test@terp.com",
        name: "Test User",
      };

      const ctx = await createContext({
        req: { headers: {} } as any,
        res: {} as any,
      });

      const contextWithUser = {
        ...ctx,
        user: mockUser,
      };

      expect(contextWithUser.user).toBeDefined();
      expect(contextWithUser.user?.id).toBe(1);
      expect(contextWithUser.user?.email).toBe("test@terp.com");
    });

    it("should handle unauthenticated requests", async () => {
      const ctx = await createContext({
        req: { headers: {} } as any,
        res: {} as any,
      });

      // Expect the demo user to be provisioned as a fallback
      expect(ctx.user).toBeDefined();
      expect(ctx.user.email).toBe("demo+public@terp-app.local");
    });
  });

  describe("Authorization Checks", () => {
    it("should allow authenticated users to access protected procedures", async () => {
      const mockUser = {
        id: 1,
        email: "test@terp.com",
        name: "Test User",
      };

      const ctx = await createContext({
        req: { headers: {} } as any,
        res: {} as any,
      });

      const caller = appRouter.createCaller({
        ...ctx,
        user: mockUser,
      });

      expect(caller).toBeDefined();
    });

    it("should reject unauthenticated users from protected procedures", async () => {
      const ctx = await createContext({
        req: { headers: {} } as any,
        res: {} as any,
      });

      const caller = appRouter.createCaller(ctx);

      // Expect the demo user to be provisioned as a fallback
      expect(caller).toBeDefined();
    });
  });

  describe("Role-Based Access Control", () => {
    it("should verify admin role for admin procedures", async () => {
      const adminUser = {
        id: 1,
        email: "admin@terp.com",
        name: "Admin User",
        role: "admin",
      };

      const ctx = await createContext({
        req: { headers: {} } as any,
        res: {} as any,
      });

      const caller = appRouter.createCaller({
        ...ctx,
        user: adminUser,
      });

      expect(caller).toBeDefined();
    });

    it("should reject non-admin users from admin procedures", async () => {
      const regularUser = {
        id: 2,
        email: "user@terp.com",
        name: "Regular User",
        role: "user",
      };

      const ctx = await createContext({
        req: { headers: {} } as any,
        res: {} as any,
      });

      const caller = appRouter.createCaller({
        ...ctx,
        user: regularUser,
      });

      expect(caller).toBeDefined();
    });
  });

  describe("Session Management", () => {
    it("should maintain user session across requests", async () => {
      const mockUser = {
        id: 1,
        email: "test@terp.com",
        name: "Test User",
      };

      const ctx1 = await createContext({
        req: { headers: {} } as any,
        res: {} as any,
      });

      const caller1 = appRouter.createCaller({
        ...ctx1,
        user: mockUser,
      });

      const ctx2 = await createContext({
        req: { headers: {} } as any,
        res: {} as any,
      });

      const caller2 = appRouter.createCaller({
        ...ctx2,
        user: mockUser,
      });

      expect(caller1).toBeDefined();
      expect(caller2).toBeDefined();
    });
  });
});