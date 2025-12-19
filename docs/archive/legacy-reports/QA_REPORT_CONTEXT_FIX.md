# QA Report: Context Creation Fix

## Issues Found

### 1. **Type Mismatch - CRITICAL**
- **Issue**: `TrpcContext` type has `user: User | null` but we guarantee it's never null
- **Impact**: TypeScript type safety violation, potential runtime issues
- **Fix**: Update type to `user: User` (non-nullable)

### 2. **Inconsistent Permission Middleware - HIGH**
- **Issue**: `requireAllPermissions` and `requireAnyPermissions` don't allow public users (id: -1) like `requirePermission` does
- **Impact**: Public users will be rejected for procedures using these middlewares
- **Fix**: Add public user check to both functions

### 3. **Null Return from getOrCreatePublicUser - MEDIUM**
- **Issue**: Function can return `null` but we're not handling it properly
- **Impact**: Potential null reference errors
- **Fix**: Ensure function never returns null, or handle null case explicitly

### 4. **Cookie Access Safety - LOW**
- **Issue**: Accessing `opts.req.cookies?.["terp_session"]` without verifying cookies exist
- **Impact**: Minor - optional chaining handles it, but could be more explicit
- **Fix**: Add explicit check

### 5. **Performance - MEDIUM**
- **Issue**: Calling `getOrCreatePublicUser()` on every anonymous request
- **Impact**: Database query on every request for anonymous users
- **Fix**: Consider caching or in-memory user object

### 6. **Admin Procedure Public User Check - LOW**
- **Issue**: `adminProcedure` doesn't explicitly check for public users before checking role
- **Impact**: Minor - public users will fail role check anyway, but error message could be clearer
- **Fix**: Add explicit public user check with better error message

## Fixes Required

1. Update `TrpcContext` type to make `user` non-nullable
2. Add public user support to `requireAllPermissions` and `requireAnyPermissions`
3. Ensure `getOrCreatePublicUser` never returns null
4. Add explicit cookie existence check
5. Consider caching public user (future optimization)
6. Improve admin procedure error handling

