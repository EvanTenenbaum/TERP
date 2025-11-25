# Public Access - Final Solution Implementation

## Root Cause Analysis

After comprehensive review, the issue is clear:

1. **Context creation IS working** - The code provisions a public user correctly
2. **The problem**: The `requireUser` middleware in `trpc.ts` throws `UNAUTHORIZED` if `ctx.user` is null
3. **The logs show**: `[Simple Auth]` errors, but NO `[Context]` logs appear

**Critical Discovery**: The `[Simple Auth]` logs appearing in production are NOT in the current codebase. This suggests:
- The deployed code may be from a different version
- OR there's error handling logging these messages
- OR the context creation is failing silently before logging

## The Real Issue

Even though `createContext` should always return a user (public or authenticated), the middleware chain is rejecting requests. This means either:
1. Context creation is failing and returning `null` user
2. Context creation isn't being called
3. The user is being set but then lost in the middleware chain

## Final Solution

Since the goal is simple: "any visitor should be logged in or login requirements removed", the cleanest solution is to modify the middleware to allow public users through.

### Implementation

**File: `server/_core/trpc.ts`**

Modify `requireUser` middleware to allow public demo user:

```typescript
const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  // Allow public demo user (id: -1) - they are provisioned by createContext
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  // Public users are allowed (they have id: -1)
  // This check ensures context creation worked
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
```

**File: `server/_core/permissionMiddleware.ts`**

Already updated to allow public users read permissions. This is correct.

**File: `server/_core/context.ts`**

The current implementation should work, but let's ensure it ALWAYS returns a user:

```typescript
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // ALWAYS return a user - never null
  let user: User | null = null;

  // Try authenticated user first
  try {
    user = await simpleAuth.authenticateRequest(opts.req);
  } catch (error) {
    // Expected for anonymous users
    user = null;
  }

  // If no authenticated user, use public demo user
  if (!user) {
    try {
      user = await getOrCreatePublicUser();
    } catch (error) {
      // Fallback to synthetic user
      user = {
        id: -1,
        openId: PUBLIC_USER_ID,
        email: PUBLIC_USER_EMAIL,
        name: "Public Demo User",
        role: "user",
        loginMethod: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      };
    }
  }

  // Final safety check - should never be null
  if (!user) {
    user = {
      id: -1,
      openId: PUBLIC_USER_ID,
      email: PUBLIC_USER_EMAIL,
      name: "Public Demo User",
      role: "user",
      loginMethod: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
  }

  return {
    req: opts.req,
    res: opts.res,
    user, // This will NEVER be null
  };
}
```

## Verification Steps

1. Deploy the updated code
2. Make API request: `GET /api/trpc/dashboard.getSalesByClient?input={"timePeriod":"LIFETIME"}`
3. Should return data (not UNAUTHORIZED)
4. Check widgets on frontend - should display data

## Expected Behavior

- Anonymous visitors → `createContext` provisions public user (id: -1)
- `requireUser` middleware → sees user exists → PASSES
- `requirePermission` middleware → sees public user with read permission → PASSES
- Procedure executes → returns data

