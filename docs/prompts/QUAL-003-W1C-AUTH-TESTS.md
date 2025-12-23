# QUAL-003 Wave 1C: Auth Integration Tests

**Wave:** 1 (Security & Auth)  
**Agent:** 1C (Testing)  
**Priority:** 🔴 CRITICAL - Verify security fixes  
**Estimated Time:** 2 hours  
**Dependencies:** Wave 0 complete

---

## Mission

Create integration tests that verify the authentication and permission fixes made by Agents 1A and 1B work correctly.

---

## Files to CREATE (New Files)

| File | Purpose |
|------|---------|
| `server/routers/auth-integration.test.ts` | Test auth enforcement |
| `server/routers/permission-checks.test.ts` | Test permission middleware |

---

## Task W1-C1: Create auth-integration.test.ts

**File:** `server/routers/auth-integration.test.ts`

Create tests that verify endpoints require authentication:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTestContext, createAuthenticatedContext } from "../_core/testUtils";

describe("Authentication Integration", () => {
  describe("rbac-users router", () => {
    it("should reject unauthenticated requests", async () => {
      const ctx = createTestContext(); // No user
      
      // Call the endpoint that was fixed
      await expect(
        // Replace with actual endpoint call
        caller.rbacUsers.someEndpoint({})
      ).rejects.toThrow("UNAUTHORIZED");
    });

    it("should accept authenticated requests", async () => {
      const ctx = createAuthenticatedContext({ userId: 1, role: "user" });
      
      // Should not throw
      const result = await caller.rbacUsers.someEndpoint({});
      expect(result).toBeDefined();
    });
  });

  describe("Frontend mutations with user context", () => {
    it("should reject mutations with userId: 0", async () => {
      const ctx = createTestContext();
      
      // Mutations that previously had hardcoded userId: 1
      await expect(
        caller.clientNeeds.create({ userId: 0, /* other fields */ })
      ).rejects.toThrow();
    });

    it("should accept mutations with valid userId", async () => {
      const ctx = createAuthenticatedContext({ userId: 42 });
      
      const result = await caller.clientNeeds.create({
        userId: 42,
        /* other fields */
      });
      expect(result).toBeDefined();
    });
  });
});
```

---

## Task W1-C2: Create permission-checks.test.ts

**File:** `server/routers/permission-checks.test.ts`

Create tests that verify permission checks work:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthenticatedContext } from "../_core/testUtils";

describe("Permission Checks", () => {
  describe("calendarRecurrence admin endpoints", () => {
    it("should reject users without calendar:admin permission", async () => {
      const ctx = createAuthenticatedContext({
        userId: 1,
        permissions: ["calendar:read", "calendar:write"], // No admin
      });
      
      await expect(
        caller.calendarRecurrence.adminEndpoint({})
      ).rejects.toThrow("FORBIDDEN");
    });

    it("should accept users with calendar:admin permission", async () => {
      const ctx = createAuthenticatedContext({
        userId: 1,
        permissions: ["calendar:admin"],
      });
      
      const result = await caller.calendarRecurrence.adminEndpoint({});
      expect(result).toBeDefined();
    });

    it("should accept super admin users", async () => {
      const ctx = createAuthenticatedContext({
        userId: 1,
        role: "super_admin",
      });
      
      // Super admin should bypass permission checks
      const result = await caller.calendarRecurrence.adminEndpoint({});
      expect(result).toBeDefined();
    });
  });
});
```

---

## Implementation Notes

### Finding Test Utilities

First, find existing test utilities in the codebase:

```bash
# Find test context creators
grep -rn "createTestContext\|createAuthenticatedContext\|mockContext" server/ --include="*.test.ts" | head -10

# Find how other tests mock auth
grep -rn "ctx.user\|ctx.session" server/ --include="*.test.ts" | head -10
```

### Test Context Pattern

If no test utilities exist, create them:

```typescript
// server/_core/testUtils.ts
export function createTestContext(): Context {
  return {
    user: null,
    session: null,
    // ... other context fields
  };
}

export function createAuthenticatedContext(options: {
  userId: number;
  role?: string;
  permissions?: string[];
}): Context {
  return {
    user: {
      id: options.userId,
      role: options.role ?? "user",
      permissions: options.permissions ?? [],
    },
    session: { /* ... */ },
  };
}
```

### Testing tRPC Routers

Follow the existing test patterns in the codebase:

```bash
# Find existing router tests
ls server/routers/*.test.ts | head -5

# Look at how they create callers
grep -rn "createCaller\|appRouter" server/routers/*.test.ts | head -10
```

---

## Deliverables Checklist

- [ ] `server/routers/auth-integration.test.ts` created
- [ ] Tests for unauthenticated request rejection
- [ ] Tests for authenticated request acceptance
- [ ] Tests for userId validation in mutations
- [ ] `server/routers/permission-checks.test.ts` created
- [ ] Tests for permission rejection
- [ ] Tests for permission acceptance
- [ ] Tests for super admin bypass
- [ ] All tests pass

---

## QA Requirements (Before Merge)

```bash
# 1. Run your new tests
pnpm test auth-integration permission-checks

# 2. Verify tests actually test the fixed code
# Tests should fail if you revert Agent 1A/1B changes

# 3. Run full test suite
pnpm test

# 4. Check test coverage
pnpm test:coverage -- --grep "auth\|permission"
```

---

## Do NOT

- ❌ Touch files not in your ownership list
- ❌ Modify production code (only test files)
- ❌ Write tests that always pass (tests must be meaningful)
- ❌ Skip edge cases
- ❌ Introduce flaky tests

---

## Coordination

- **Agent 1A** is fixing frontend auth context usage
- **Agent 1B** is fixing server-side auth checks
- Your tests verify their work is correct

### Timing

- You can start writing test structure immediately
- Fill in actual endpoint names after 1A/1B share their changes
- Run tests after 1A/1B merge to verify

---

## Success Criteria

Your work is complete when:

- [ ] Both test files created
- [ ] 8+ meaningful tests written
- [ ] All tests pass
- [ ] Tests would fail if auth fixes were reverted
- [ ] `pnpm test` passes
- [ ] Code merged to main
