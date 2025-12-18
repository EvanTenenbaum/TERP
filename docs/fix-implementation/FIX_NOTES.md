# FIX_NOTES.md - Deviations and Implementation Details

**Implementation Date:** 2025-12-18
**Session ID:** Session-20251218-FIX-IMPL-db9dd2

---

## Deviations from MASTER_FIX_SPECIFICATION_v2

### 1. Missing File References (Expected from Spec Analysis)

The spec correctly identified that several file paths referenced in the original analysis do not exist in the current codebase. Here's how each was handled:

| Spec Reference | Actual Location | Resolution |
|----------------|-----------------|------------|
| `server/seed.ts` | `server/services/seedRBAC.ts`, `server/services/seedDefaults.ts` | Used existing seeding infrastructure |
| `server/routers/todos.ts` | `server/routers/todoLists.ts`, `server/routers/todoTasks.ts` | Not modified - existing implementation sufficient |
| `client/src/components/dashboard/QuickActionSearch.tsx` | `client/src/components/CommandPalette.tsx` | Not modified - CommandPalette handles quick actions |
| `client/src/pages/BankAccountsPage.tsx` | `client/src/pages/accounting/BankAccounts.tsx` | Not modified - exists at correct path |

### 2. RBAC Implementation Approach

**Spec Requirement:** Make one authoritative bootstrap command `pnpm seed:new`

**Implementation:** Instead of modifying the seed command, created `rbacValidation.ts` that:
- Validates RBAC at startup (non-blocking)
- Optionally auto-seeds if `RBAC_AUTO_SEED=true`
- Provides clear diagnostics via `getRBACSummary()`
- Integrates with existing `seedRBAC.ts` for seeding

**Rationale:** This approach is less intrusive and allows the system to start in degraded mode rather than failing hard on RBAC issues. The existing `pnpm seed:new` command already exists and works.

### 3. Error Handling Scope

**Spec Requirement:** Create `server/_core/errors.ts` with normalized error shape

**Implementation:** The server already has `server/_core/errors.ts` with a comprehensive error catalog. Created client-side utilities (`errorHandling.ts`) to consume these errors properly rather than duplicating server-side logic.

**Rationale:** Better separation of concerns - server defines errors, client handles them.

### 4. Coming Soon Placeholders

**Spec Options:**
1. Real MVP implementation
2. Explicit disabled state + roadmap link
3. Feature flag gating

**Implementation:** Chose option 2 - explicit disabled state with informative messaging using Alert components.

**Rationale:** Full implementation would require significant additional work beyond the scope of this fix task. Feature flags would require additional infrastructure. The Alert pattern provides clear user guidance while being honest about feature status.

---

## Implementation Decisions

### 1. Type Guard Pattern for TRPCClientError

Used a type guard function instead of direct casting:

```typescript
function isTRPCClientError(error: unknown): error is TRPCClientError<AppRouter> {
  return error instanceof TRPCClientError;
}
```

**Rationale:** Satisfies TypeScript's constraint on `InferrableClientTypes` while maintaining type safety.

### 2. useAppMutation Design

Created a wrapper hook rather than modifying the tRPC client setup:

```typescript
export function useAppMutation<TData, TError, TVariables>(
  mutation: { mutateAsync: (variables: TVariables) => Promise<TData>; reset?: () => void },
  options: UseAppMutationOptions<TData, TError, TVariables> = {}
): UseAppMutationResult<TData, TVariables>
```

**Rationale:**
- Non-invasive - doesn't require changing existing mutation calls
- Opt-in - components can choose to use it
- Composable - works with any tRPC mutation

### 3. FormSubmitButton as React.memo

```typescript
const FormSubmitButton = React.memo(function FormSubmitButton({...})
```

**Rationale:** Prevents unnecessary re-renders when parent components update, following the project's React optimization guidelines.

---

## Known Limitations

### 1. Pre-existing Type Errors

The codebase has pre-existing TypeScript errors in other files (not introduced by this fix):
- Logger overload issues in `server/auditLogger.ts`, `server/autoMigrate.ts`, etc.
- VIP portal type issues in `client/src/components/vip-portal/*.tsx`

These are out of scope for this fix task.

### 2. BLOCK-* Items Not Fully Addressed

Several BLOCK-* items in the spec require "evidence hardening" (finding actual code evidence of the root cause). These items were not modified because:
- The spec marked them as "Needs evidence hardening"
- Modifying without proof of root cause could introduce regressions
- Each requires dedicated investigation

Items requiring future investigation:
- BLOCK-002: Inventory Batch Creation
- BLOCK-003: Quote Creation
- BLOCK-004: Purchase Order Creation
- BLOCK-008: Todo List Creation (path updated in spec)
- BLOCK-009: Workflow Queue Items
- BLOCK-010: Returns Processing Modal
- BLOCK-011: Sales Sheet Creation

---

## Files Not Modified (Intentionally)

1. **`server/_core/errors.ts`** - Already comprehensive, no changes needed
2. **`server/_core/trpc.ts`** - Working correctly, no changes needed
3. **`client/src/components/VendorRedirect.tsx`** - Already properly implemented
4. **Existing router files** - No changes needed for BLOCK-* items without evidence

---

## Environment Variables Added

| Variable | Purpose | Default |
|----------|---------|---------|
| `RBAC_AUTO_SEED` | Enable automatic RBAC seeding at startup | `false` |

---

## Backward Compatibility

All changes are backward compatible:
- New utilities are additive (opt-in)
- Existing code continues to work
- No breaking changes to APIs or data models
