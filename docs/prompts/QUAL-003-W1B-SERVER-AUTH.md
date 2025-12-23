# QUAL-003 Wave 1B: Server Auth Fixes

**Wave:** 1 (Security & Auth)  
**Agent:** 1B (Server)  
**Priority:** 🔴 CRITICAL - Security vulnerability  
**Estimated Time:** 2 hours  
**Dependencies:** Wave 0 complete

---

## Mission

Fix server-side authentication and permission checks that are currently bypassed or disabled.

---

## Files You Own (EXCLUSIVE)

Only you will touch these files. No other agent will modify them.

| File | TODOs |
|------|-------|
| `server/routers/rbac-users.ts` | Line 582 |
| `server/routers/calendarRecurrence.ts` | Line 216 |

---

## Task W1-B1: Fix rbac-users.ts Authentication

**File:** `server/routers/rbac-users.ts`

**Current Code (Line 582):**
```typescript
// TODO: Re-enable authentication check when ready for secure access
```

**Problem:** Authentication check is disabled, allowing unauthenticated access.

**Fix:**

1. Find the procedure that has this TODO
2. Change from `publicProcedure` to `protectedProcedure`
3. Or re-enable the authentication check that was commented out

```typescript
// Before (likely):
export const someEndpoint = publicProcedure
  .input(...)
  .query(async ({ ctx, input }) => {
    // TODO: Re-enable authentication check when ready for secure access
    // if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
    ...
  });

// After:
export const someEndpoint = protectedProcedure
  .input(...)
  .query(async ({ ctx, input }) => {
    // Authentication is now enforced by protectedProcedure
    const userId = getAuthenticatedUserId(ctx);
    ...
  });
```

**Import Required:**
```typescript
import { protectedProcedure } from "../_core/trpc";
import { getAuthenticatedUserId } from "../_core/trpc";
```

---

## Task W1-B2: Fix calendarRecurrence.ts Permission Check

**File:** `server/routers/calendarRecurrence.ts`

**Current Code (Line 216):**
```typescript
// TODO: Check admin permission
```

**Problem:** Admin permission check is missing.

**Fix:**

1. Find the procedure with this TODO
2. Add permission check using the permission middleware

```typescript
// Before:
export const someAdminEndpoint = protectedProcedure
  .input(...)
  .mutation(async ({ ctx, input }) => {
    // TODO: Check admin permission
    ...
  });

// After:
import { requirePermission } from "../_core/permissionMiddleware";

export const someAdminEndpoint = protectedProcedure
  .use(requirePermission("calendar:admin"))
  .input(...)
  .mutation(async ({ ctx, input }) => {
    // Permission is now enforced
    ...
  });
```

**Alternative (inline check):**
```typescript
export const someAdminEndpoint = protectedProcedure
  .input(...)
  .mutation(async ({ ctx, input }) => {
    // Check admin permission
    if (!ctx.user?.permissions?.includes("calendar:admin")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin permission required",
      });
    }
    ...
  });
```

---

## Implementation Notes

### Understanding the Permission System

First, understand how permissions work in this codebase:

```bash
# Find permission middleware
grep -rn "requirePermission\|requireAllPermissions\|requireAnyPermission" server/ --include="*.ts" | head -10

# Find how other routers check permissions
grep -rn "\.use(require" server/routers/ --include="*.ts" | head -10
```

### Using Wave 0 Utilities

Import the auth helper from Wave 0:

```typescript
import { getCurrentUserId } from "../_core/authHelpers";

// Use in procedures:
const userId = getCurrentUserId(ctx); // Throws if not authenticated
```

### Procedure Types Reference

| Procedure | Auth Required | Use Case |
|-----------|---------------|----------|
| `publicProcedure` | No | Public endpoints only |
| `protectedProcedure` | Yes | General authenticated operations |
| `strictlyProtectedProcedure` | Yes (real user) | Mutations requiring attribution |
| `adminProcedure` | Admin role | Administrative operations |

---

## Deliverables Checklist

- [ ] `rbac-users.ts` - Line 582 TODO resolved
- [ ] `rbac-users.ts` - Authentication check enabled
- [ ] `calendarRecurrence.ts` - Line 216 TODO resolved
- [ ] `calendarRecurrence.ts` - Admin permission check added
- [ ] All TODO comments removed from these lines
- [ ] No new security bypasses introduced

---

## QA Requirements (Before Merge)

```bash
# 1. TypeScript check
pnpm typecheck

# 2. Lint check
pnpm lint

# 3. Verify no auth bypasses remain
grep -n "TODO.*auth\|TODO.*permission" server/routers/rbac-users.ts
grep -n "TODO.*auth\|TODO.*permission" server/routers/calendarRecurrence.ts
# Should return nothing

# 4. Run tests
pnpm test

# 5. Test auth enforcement manually (if possible)
# - Try to access the endpoint without authentication
# - Should receive 401 UNAUTHORIZED
# - Try to access admin endpoint without admin role
# - Should receive 403 FORBIDDEN
```

---

## Do NOT

- ❌ Touch files not in your ownership list
- ❌ Modify frontend code (that's Agent 1A)
- ❌ Disable other security checks
- ❌ Add new public procedures
- ❌ Introduce new TODOs

---

## Coordination

- **Agent 1A** is fixing frontend auth context usage
- **Agent 1C** is writing integration tests
- Your changes will be tested by Agent 1C's tests

---

## Success Criteria

Your work is complete when:

- [ ] Both files updated
- [ ] Authentication enforced on rbac-users endpoint
- [ ] Permission check added to calendarRecurrence endpoint
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] Code merged to main
