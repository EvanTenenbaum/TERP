# Public Access Implementation - Diagnostic Report

## Executive Summary

**Goal**: Enable anonymous visitors to access dashboard widgets without authentication.

**Current State**: API returns `UNAUTHORIZED` (401) for all anonymous requests.

**Root Cause**: The `createContext` function is designed to provision a public user, but the middleware chain (`requireUser` → `requirePermission`) is rejecting requests before the context can be fully utilized.

## Analysis

### 1. Code Flow Analysis

**Expected Flow:**
```
Request → createContext() → simpleAuth.authenticateRequest() fails
→ catch error → getOrCreatePublicUser() → return context with public user
→ requireUser middleware → ctx.user exists → PASS
→ requirePermission middleware → ctx.user exists → PASS  
→ Procedure executes
```

**Actual Flow (Based on Logs):**
```
Request → [Simple Auth] logs appear
→ [Context] logs DO NOT appear
→ UNAUTHORIZED error returned
```

### 2. Key Findings

1. **Missing Context Logs**: Despite logging at the start of `createContext()`, no `[Context]` logs appear in production. This suggests:
   - Context creation is failing silently before the first log
   - OR the logger isn't capturing these logs
   - OR there's an exception being swallowed

2. **Simple Auth Logs Present**: `[Simple Auth]` logs appear, indicating `simpleAuth.authenticateRequest()` is being called, but these logs aren't in the current codebase - suggesting they may be from error handling or a different code path.

3. **Middleware Chain**: The `protectedProcedure` uses:
   - `errorHandlingMiddleware` (first)
   - `sanitizationMiddleware` (second)
   - `requireUser` (third) - **This throws if `!ctx.user`**

4. **Permission Middleware**: `requirePermission` also checks `if (!ctx.user)` and throws `UNAUTHORIZED`.

### 3. Critical Issue Identified

**The Problem**: Even if `createContext` successfully creates a public user, there are TWO places that will reject it:

1. `requireUser` middleware (line 78 in `trpc.ts`)
2. `requirePermission` middleware (line 33 in `permissionMiddleware.ts`)

Both check `if (!ctx.user)` and throw `UNAUTHORIZED`. However, if `createContext` is working correctly, `ctx.user` should NEVER be null.

**The Real Issue**: The fact that we're getting `UNAUTHORIZED` means `ctx.user` IS null, which means either:
- `createContext` is not being called
- `createContext` is failing silently
- `createContext` is returning `null` for user somehow

## Solution

### Option 1: Verify Context Creation (Recommended First Step)

Add comprehensive logging and error handling to verify context is being called:

```typescript
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // Use console.log as fallback (bypasses logger issues)
  console.log("[CONTEXT] createContext CALLED", opts.req.url);
  
  try {
    logger.info({ path: opts.req.url }, "[Context] createContext called");
    let user: User | null = null;

    try {
      user = await simpleAuth.authenticateRequest(opts.req);
      logger.info({ userId: user?.id }, "[Context] Authenticated user found");
    } catch (error) {
      logger.info("[Context] No authenticated user, provisioning public user");
      user = null;
    }

    if (!user) {
      console.log("[CONTEXT] No user, provisioning public user");
      try {
        user = await getOrCreatePublicUser();
        console.log("[CONTEXT] Public user created:", user?.id, user?.email);
        logger.info({ userId: user?.id, email: user?.email }, "[Context] Public user provisioned");
      } catch (error) {
        console.error("[CONTEXT] Failed to create public user:", error);
        logger.warn({ error }, "[Public Access] Failed to get/create public user, using synthetic fallback");
        // Fallback to synthetic user
        const now = new Date();
        user = {
          id: -1,
          openId: PUBLIC_USER_ID,
          email: PUBLIC_USER_EMAIL,
          name: "Public Demo User",
          role: "user",
          loginMethod: null,
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
          lastSignedIn: now,
        };
        logger.info("[Context] Using synthetic public user fallback");
      }
    }

    // Ensure user is never null
    if (!user) {
      console.error("[CONTEXT] CRITICAL: User is still null after all attempts!");
      const now = new Date();
      user = {
        id: -1,
        openId: PUBLIC_USER_ID,
        email: PUBLIC_USER_EMAIL,
        name: "Public Demo User",
        role: "user",
        loginMethod: null,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
        lastSignedIn: now,
      };
      logger.warn("[Context] Final fallback: created synthetic user");
    }

    console.log("[CONTEXT] Returning context with user:", user.id, user.email);
    logger.info({ userId: user.id, email: user.email, openId: user.openId }, "[Context] Context created with user");

    return {
      req: opts.req,
      res: opts.res,
      user,
    };
  } catch (error) {
    console.error("[CONTEXT] FATAL ERROR in createContext:", error);
    logger.error({ error }, "[Context] Fatal error in createContext");
    // Even on error, return a public user
    const now = new Date();
    return {
      req: opts.req,
      res: opts.res,
      user: {
        id: -1,
        openId: PUBLIC_USER_ID,
        email: PUBLIC_USER_EMAIL,
        name: "Public Demo User",
        role: "user",
        loginMethod: null,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
        lastSignedIn: now,
      },
    };
  }
}
```

### Option 2: Modify Middleware to Allow Public Users (If Context is Working)

If context creation is working but middleware is rejecting, modify the middleware:

**In `trpc.ts`:**
```typescript
const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  // Allow public demo user (id: -1) or authenticated users
  if (!ctx.user || ctx.user.id === -1) {
    // If no user, try to get public user from context
    // This shouldn't happen if createContext is working, but as a safety net:
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
```

**In `permissionMiddleware.ts`:**
```typescript
export function requirePermission(permissionName: string) {
  return middleware(async ({ ctx, next }) => {
    // Allow public demo user (id: -1) - they get read-only access
    if (!ctx.user) {
      logger.warn({ 
        msg: "Permission check failed: no user", 
        permission: permissionName 
      });
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required to perform this action",
      });
    }

    // Public demo user gets read permissions automatically
    if (ctx.user.id === -1 && permissionName.endsWith(':read')) {
      logger.debug({ 
        msg: "Permission granted to public user for read operation", 
        permission: permissionName 
      });
      return next({ ctx });
    }

    const userId = ctx.user.openId;
    // ... rest of permission checking
  });
}
```

### Option 3: Create a Public Procedure Type (Cleanest Solution)

Create a new procedure type that allows public access:

```typescript
// In trpc.ts
export const publicProcedure = t.procedure
  .use(errorHandlingMiddleware)
  .use(sanitizationMiddleware)
  .use(t.middleware(async ({ ctx, next }) => {
    // Ensure context has a user (public or authenticated)
    if (!ctx.user) {
      // This shouldn't happen if createContext is working
      throw new TRPCError({ 
        code: "INTERNAL_SERVER_ERROR", 
        message: "Context user not set" 
      });
    }
    return next({ ctx });
  }));

// Then create a public permission middleware
export function requirePublicOrPermission(permissionName: string) {
  return middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    // Public user (id: -1) gets read permissions
    if (ctx.user.id === -1 && permissionName.endsWith(':read')) {
      return next({ ctx });
    }

    // Authenticated users go through normal permission check
    const userId = ctx.user.openId;
    const isSA = await isSuperAdmin(userId);
    if (isSA) {
      return next({ ctx });
    }

    const hasIt = await hasPermission(userId, permissionName);
    if (!hasIt) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `You do not have permission. Required: ${permissionName}`,
      });
    }

    return next({ ctx });
  });
}
```

## Recommended Implementation Order

1. **First**: Deploy Option 1 (enhanced logging) to verify context creation
2. **Second**: If context is working, implement Option 3 (cleanest)
3. **Third**: If context is NOT working, debug why and fix context creation

## Testing Plan

1. Deploy with enhanced logging
2. Make API request: `GET /api/trpc/dashboard.getSalesByClient?input={"timePeriod":"LIFETIME"}`
3. Check logs for:
   - `[CONTEXT] createContext CALLED`
   - `[CONTEXT] No user, provisioning public user`
   - `[CONTEXT] Public user created`
   - `[CONTEXT] Returning context with user`
4. If all logs appear → Context is working, implement Option 3
5. If logs don't appear → Debug why context isn't being called

## Expected Outcome

After implementation, anonymous requests should:
- Successfully create/get public user in context
- Pass through `requireUser` middleware
- Pass through `requirePermission` middleware (for read operations)
- Execute procedure and return data

