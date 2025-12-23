# RedHat QA Report: Phase 0

## Summary
**FAIL**

While the schema architecture and feature flagging are implemented correctly, the Phase 0 implementation cannot be committed in its current state due to a **Critical Security Vulnerability** in the Staff Authentication middleware and a high risk of memory leaks in the SSE implementation pattern.

## Checklist Results
- [x] **Schema**: **PASS** - `decimal` columns use correct precision/scale. Strict typing is enforced.
- [x] **Relations**: **PASS** - Drizzle relations are syntactically correct, assuming circular dependency management in the main schema file.
- [ ] **Security**: **FAIL** - Staff authentication explicitly uses a mock bypass (`mockStaffIdVerification = true`).
- [x] **Infra**: **PASS** - `setMaxListeners(1000)` is present, preventing immediate `MaxListenersExceededWarning`.

## Critical Issues (Must Fix Before Commit)

### 1. Security Bypass in SSE Middleware (P0)
**File:** `server/api/sseAuth.ts`
**Issue:** The middleware contains a hardcoded bypass for Staff authentication:
```typescript
const mockStaffIdVerification = true; 
if (mockStaffIdVerification) { ... }
```
**Risk:** This allows any request with an `Authorization` header (valid or invalid) to hijack the host session if the `sessionId` is known.
**Fix:** Implement actual JWT verification or session cookie validation matching the `vipPortalAuth` rigor.

### 2. Missing Listener Cleanup / Memory Leak Risk (P0)
**File:** `server/lib/sse/sessionEventManager.ts`
**Issue:** While `setMaxListeners` is increased, the singleton pattern does not provide a mechanism to ensure listeners are removed when an HTTP connection closes.
**Risk:** If the route handler (not provided in review files but implied) adds a listener like `sessionEventManager.on(...)` without a corresponding `req.on("close", () => sessionEventManager.off(...))`, the server will leak memory until it crashes, regardless of the 1000 listener limit.
**Fix:** Ensure the route handler implements listener cleanup.

## High Priority Issues (Should Fix)

### 3. Inconsistent Column Naming (P1)
**File:** `drizzle/schema-live-shopping.ts`
**Issue:** The schema mixes `camelCase` and `snake_case` for timestamps.
- `liveShoppingSessions` uses `deleted_at` (matches legacy `users` table).
- `liveShoppingSessions` uses `createdAt` (camelCase).
- `sessionCartItems` uses `createdAt` (camelCase) but no `deletedAt` or `deleted_at`.
**Fix:** Standardize on `deleted_at` if matching legacy TERP schema, or `deletedAt` if moving to new standard. Be consistent within the file.

### 4. Single-Instance Limitation (P1)
**File:** `server/lib/sse/sessionEventManager.ts`
**Issue:** The `EventEmitter` is in-memory.
**Risk:** This strictly limits the deployment to a single server instance. If the application is deployed to a cluster (Kubernetes/AWS ECS) with >1 pod, the SSE connection might exist on Pod A, but the event trigger (e.g., "Add to Cart") might hit Pod B. Pod A will never receive the event.
**Fix:** For Phase 0, document this limitation clearly. For Phase 1, a Redis adapter (Pub/Sub) is required.

## Medium Priority Issues (Nice to Have)

### 5. Decimal Handling in TypeScript (P2)
**File:** `drizzle/schema-live-shopping.ts`
**Issue:** Drizzle/MySQL driver returns `decimal` columns as `string` to preserve precision.
**Risk:** Mathematical operations on `sessionCartItems.quantity` or `unitPrice` will fail or concatenate strings if not cast to `Number()` or `Big.js` in the application logic.
**Fix:** Add a comment or utility helper for decimal casting to ensure developers don't try `item.price * item.quantity` directly on strings.

### 6. Missing Validation on Room Code (P2)
**File:** `drizzle/schema-live-shopping.ts`
**Issue:** `roomCode` is a `varchar(64)`.
**Suggestion:** Ensure `roomCode` generation (UUID or NanoID) is collision-resistant and handled in the insertion logic, as the DB `unique` constraint will throw an error rather than retry.

## Required Changes Before Commit

### 1. Fix `server/api/sseAuth.ts`
Replace the mock verification with a check against the user session or a verified token.

```typescript
// REPLACE THIS:
// const mockStaffIdVerification = true; 
// if (mockStaffIdVerification) { ... }

// WITH SOMETHING LIKE THIS (Assuming existing auth context):
if (req.user && req.user.role === 'staff') { // Or however your upstream auth populates user
   req.auth = {
     type: "STAFF",
     userId: req.user.id,
     sessionId: parsedSessionId
   };
   return next();
}
```

### 2. Update `drizzle/schema-live-shopping.ts` Consistency
Ensure `deleted_at` vs `deletedAt` consistency.

```typescript
// In liveShoppingSessions
deletedAt: timestamp("deleted_at"), // Keep snake_case if matching legacy users table
```

## Files That Need Updates

1.  **`server/api/sseAuth.ts`**: Remove mock auth logic.
2.  **`drizzle/schema.ts` (Existing)**: 
    *   Must export `clients`, `products`, `batches`, and `orders` to be importable by `schema-live-shopping.ts`.
    *   Should ideally export the *new* tables from `schema-live-shopping.ts` so `drizzle-kit` picks them up.
3.  **`package.json`**: Ensure `@types/events` is present (usually standard, but verify).

## Migration Notes

Run `drizzle-kit generate:mysql` after fixing the schema consistency.
*   **New Tables**: `liveShoppingSessions`, `sessionCartItems`, `sessionPriceOverrides`.
*   **Enums**: `liveSessionStatus`, `addedByRole`.
*   **Indexes**: Review generated SQL to ensure indexes on foreign keys are created successfully.