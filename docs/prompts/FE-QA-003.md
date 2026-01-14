# FE-QA-003: Fix VIP Token Header vs Input Inconsistency

<!-- METADATA (for validation) -->
<!-- TASK_ID: FE-QA-003 -->
<!-- TASK_TITLE: Fix VIP Token Header vs Input Inconsistency -->
<!-- PROMPT_VERSION: 1.0 -->
<!-- LAST_VALIDATED: 2026-01-14 -->

**Repository:** https://github.com/EvanTenenbaum/TERP
**Task ID:** FE-QA-003
**Estimated Time:** 2h
**Module:** VIP Portal components and API

## Context

**Background:**
VIP session token handling is inconsistent:
- Frontend sends: `{ sessionToken }` in input
- Backend expects: `x-vip-session-token` header

This causes:
- Authentication failures
- Confusing error messages
- Inconsistent behavior

**Goal:**
Standardize VIP token handling across frontend and backend.

**Success Criteria:**
- Consistent token transmission method
- All VIP endpoints work correctly
- Clear documentation

## Implementation Guide

### Step 1: Choose Standard Approach

**Recommended: Use HTTP Header**

Headers are better for tokens because:
- Not logged in most request logs
- Can be set globally in HTTP client
- Standard security practice

### Step 2: Update Frontend API Client

```typescript
// utils/vipApiClient.ts
import { httpBatchLink } from "@trpc/client";

export function createVipTrpcClient(sessionToken: string) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "/api/trpc/vip",
        headers() {
          return {
            "x-vip-session-token": sessionToken
          };
        }
      })
    ]
  });
}
```

### Step 3: Update Backend Middleware

```typescript
// server/middleware/vipAuth.ts
export const vipAuthMiddleware = t.middleware(async ({ ctx, next }) => {
  const token = ctx.req.headers["x-vip-session-token"];

  if (!token) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const session = await validateVipSession(token);
  return next({
    ctx: { ...ctx, vipSession: session }
  });
});
```

### Step 4: Remove Token from Input Schemas

Update all VIP procedures:
```typescript
// BEFORE
vipProcedure
  .input(z.object({
    sessionToken: z.string(),
    // other fields
  }))

// AFTER
vipProcedure
  // sessionToken comes from header via middleware
  .input(z.object({
    // other fields only
  }))
```

### Step 5: Update All VIP Components

Find and update all VIP-related components:
```bash
grep -rn "sessionToken" client/src/ --include="*.tsx"
```

## Deliverables

- [ ] Create VIP-specific tRPC client with header
- [ ] Update VIP auth middleware for header extraction
- [ ] Remove sessionToken from input schemas
- [ ] Update all VIP frontend components
- [ ] Test all VIP portal functionality

## Quick Reference

**Files to modify:**
- VIP API client setup
- `server/middleware/vipAuth.ts`
- All VIP router procedures
- VIP Portal frontend components

**Find token usages:**
```bash
grep -rn "sessionToken\|vip-session" --include="*.ts*"
```
