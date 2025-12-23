# QUAL-003 Wave 1A: Frontend Auth Fixes

**Wave:** 1 (Security & Auth)  
**Agent:** 1A (Frontend)  
**Priority:** 🔴 CRITICAL - Security vulnerability  
**Estimated Time:** 2 hours  
**Dependencies:** Wave 0 complete

---

## Mission

Fix all hardcoded user IDs (`userId: 1`, `createdBy: 1`) in frontend components by using the authentication context properly.

---

## Files You Own (EXCLUSIVE)

Only you will touch these files. No other agent will modify them.

| File | TODOs |
|------|-------|
| `client/src/components/needs/ClientNeedsTab.tsx` | Lines 70, 91 |
| `client/src/components/inventory/ClientInterestWidget.tsx` | Line 42 |
| `client/src/pages/PurchaseOrdersPage.tsx` | Line 193 |

---

## Task W1-A1: Fix ClientNeedsTab.tsx

**File:** `client/src/components/needs/ClientNeedsTab.tsx`

**Current Code (Line 70):**
```typescript
createdBy: 1, // TODO: Get from auth context
```

**Current Code (Line 91):**
```typescript
userId: 1, // TODO: Get from auth context
```

**Fix:**
```typescript
import { useAuth } from "@/hooks/useAuth"; // or wherever auth hook is

// Inside component:
const { user } = useAuth();

// Line 70:
createdBy: user?.id ?? 0,

// Line 91:
userId: user?.id ?? 0,
```

**Validation:**
- If no user is logged in, the mutation should fail on the server (Wave 1B handles this)
- The frontend should pass the real user ID when available

---

## Task W1-A2: Fix ClientInterestWidget.tsx

**File:** `client/src/components/inventory/ClientInterestWidget.tsx`

**Current Code (Line 42):**
```typescript
userId: 1, // TODO: Get from auth context
```

**Fix:**
```typescript
import { useAuth } from "@/hooks/useAuth";

// Inside component:
const { user } = useAuth();

// Line 42:
userId: user?.id ?? 0,
```

---

## Task W1-A3: Fix PurchaseOrdersPage.tsx

**File:** `client/src/pages/PurchaseOrdersPage.tsx`

**Current Code (Line 193):**
```typescript
createdBy: 1, // TODO: Get from auth context
```

**Fix:**
```typescript
import { useAuth } from "@/hooks/useAuth";

// Inside component:
const { user } = useAuth();

// Line 193:
createdBy: user?.id ?? 0,
```

---

## Implementation Notes

### Finding the Auth Hook

First, find how auth is currently handled in the codebase:

```bash
grep -rn "useAuth\|useUser\|useSession" client/src/ --include="*.tsx" | head -10
```

The auth hook might be:
- `useAuth()` from a custom hook
- `useUser()` from Clerk (if still used)
- `useSession()` from a session context
- Direct context access via `useContext(AuthContext)`

### Pattern to Follow

Look at existing components that correctly use auth:

```bash
grep -rn "user?.id\|user.id" client/src/ --include="*.tsx" | head -10
```

Follow the same pattern used elsewhere in the codebase.

### Handling Missing User

When user is not available:
- Pass `0` or `undefined` to the mutation
- The server-side validation (Wave 1B) will reject unauthorized requests
- Don't block the UI - let the server handle auth errors

---

## Deliverables Checklist

- [ ] `ClientNeedsTab.tsx` - Line 70 fixed (createdBy)
- [ ] `ClientNeedsTab.tsx` - Line 91 fixed (userId)
- [ ] `ClientInterestWidget.tsx` - Line 42 fixed (userId)
- [ ] `PurchaseOrdersPage.tsx` - Line 193 fixed (createdBy)
- [ ] All TODO comments removed from these lines
- [ ] No new hardcoded user IDs introduced

---

## QA Requirements (Before Merge)

```bash
# 1. TypeScript check
pnpm typecheck

# 2. Lint check
pnpm lint

# 3. Verify no hardcoded IDs remain in your files
grep -n "userId: 1\|createdBy: 1" client/src/components/needs/ClientNeedsTab.tsx
grep -n "userId: 1\|createdBy: 1" client/src/components/inventory/ClientInterestWidget.tsx
grep -n "userId: 1\|createdBy: 1" client/src/pages/PurchaseOrdersPage.tsx
# All should return nothing

# 4. Run tests
pnpm test

# 5. Manual test (if possible)
# - Log in as a user
# - Navigate to Client Needs tab
# - Navigate to Inventory page with Client Interest widget
# - Navigate to Purchase Orders page
# - Verify no console errors
```

---

## Do NOT

- ❌ Touch files not in your ownership list
- ❌ Modify server-side code (that's Agent 1B)
- ❌ Add new dependencies
- ❌ Change component logic beyond the auth fix
- ❌ Introduce new TODOs

---

## Coordination

- **Agent 1B** is fixing server-side auth checks
- **Agent 1C** is writing integration tests
- Your changes will be tested by Agent 1C's tests

---

## Success Criteria

Your work is complete when:

- [ ] All 3 files updated
- [ ] No hardcoded user IDs in your files
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] Code merged to main
