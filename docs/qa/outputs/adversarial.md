# Adversarial Testing Report - Work Surfaces

**Date**: 2026-01-20
**Analyzer**: QA Adversarial Testing Agent
**Scope**: Security and edge case vulnerability analysis

---

## Summary

| Metric | Value |
|--------|-------|
| Scenarios Checked | 5 |
| Vulnerabilities Found | 5 |
| Critical Issues | 2 |
| High Priority Issues | 2 |
| Medium Priority Issues | 1 |

---

## Scenario 1: Concurrent Edit Detection

### Status: ⚠️ PARTIALLY IMPLEMENTED

### Findings

**Infrastructure Exists**:
- Optimistic locking in `/server/_core/optimisticLocking.ts`
- `useConcurrentEditDetection` hook manages version tracking
- Conflict error messages include version information

**Vulnerability: Version Checks Optional**
- **Location**: orders.ts:227
- **Problem**: Version checks marked as "optional for backward compatibility"
- **Impact**: Allows bypassing optimistic locking

```typescript
// Current code (vulnerable)
if (input.version && input.version !== existingOrder.version) {
  throw conflict;
}
// Version check only runs if version is provided
```

**Risk Level**: MEDIUM

**Suggested Fix**:
```typescript
// Make version check mandatory
if (input.version !== existingOrder.version) {
  throw conflict;
}
```

---

## Scenario 2: Rapid State Transitions

### Status: ❌ VULNERABLE

### Findings

**Vulnerability: No Debounce or Deduplication**
- **Location**: OrdersWorkSurface.tsx:613
- **Problem**: No client-side debounce on confirm/status change actions
- **Problem**: No mutex/lock pattern on server for rapid requests

**Attack Scenario**:
1. User rapidly clicks "Confirm Order" twice
2. Both requests reach server nearly simultaneously
3. First request passes validation and updates status
4. Second request checks old status (cached) and also passes
5. Result: Silent double-confirmation or duplicate operations

**Vulnerable Code Pattern**:
```typescript
const handleConfirm = () => {
  confirmMutation.mutate({ orderId });
  // No debounce
  // No disable during pending
  // No request deduplication
};
```

**Risk Level**: HIGH

**Suggested Fix**:
```typescript
const handleConfirm = useDebouncedCallback(() => {
  if (confirmMutation.isPending) return; // Guard
  confirmMutation.mutate({ orderId });
}, 300);

// Also add to button:
<Button disabled={confirmMutation.isPending} onClick={handleConfirm}>
```

---

## Scenario 3: Privilege Escalation

### Status: ✅ WELL PROTECTED

### Findings

**Proper Protection**:
- `requirePermission` middleware enforces RBAC on all mutations
- Permission checks consistently applied:
  - `orders:create`, `orders:read`, `orders:update`, `orders:delete`
- Super admin bypass exists but properly logged
- Public demo user gets read-only permissions
- All work surface mutations require permission validation

**No Critical Vulnerabilities Detected**

**Risk Level**: LOW

---

## Scenario 4: Data Integrity

### Status: ❌ PARTIALLY VULNERABLE

### Finding 1: Inventory Oversell Race Condition
**Severity**: CRITICAL

**Location**: orders.ts:1198-1208

**Problem**: Race condition window between availability check and status update:
```typescript
// confirmOrder flow (simplified)
1. Check availableQty vs item.quantity (READ)
2. [RACE CONDITION WINDOW - another transaction could reserve inventory]
3. Update order status to CONFIRMED (WRITE)
```

**Impact**: Two orders could confirm for same inventory simultaneously, causing oversell.

**Suggested Fix**:
```typescript
// Add FOR UPDATE lock before reading inventory
const batch = await tx.query.batches.findFirst({
  where: eq(batches.id, item.batchId),
  forUpdate: true // Lock row
});
```

---

### Finding 2: No Negative Balance Constraint
**Severity**: MEDIUM

**Location**: Payment recording logic

**Problem**:
- Client validates `amount ≤ amountDue` (InvoicesWorkSurface:459)
- No database-level constraint exists
- Manual override or API bypass could create negative balances

**Suggested Fix**:
```sql
ALTER TABLE invoices
ADD CONSTRAINT positive_amount_due
CHECK (amount_due >= 0);
```

---

### Finding 3: Soft Delete Cascade
**Severity**: MEDIUM

**Location**: orders.ts:246

**Problem**:
- Orders can be soft-deleted
- Related orderLineItems exist but no explicit cascade handling
- Hard delete scenario could orphan records

**Suggested Fix**: Add ON DELETE CASCADE or soft-delete cascade logic.

---

## Scenario 5: Input Validation

### Status: ✅ MOSTLY PROTECTED

### Findings

**Good Protection**:
- Zod schemas on all API endpoints
- Input types strictly defined (orders.ts:39-72)
- React automatically escapes text content (no manual HTML rendering)
- Amount validation in payment dialog (InvoicesWorkSurface:455-461)

**Vulnerability: No Max Length on String Fields**
- **Severity**: MEDIUM
- **Location**: Multiple schemas

**Problem**: Notes fields accept unlimited length strings
```typescript
// Current
notes: z.string().optional()

// Missing max length allows oversized payloads
```

**Suggested Fix**:
```typescript
notes: z.string().max(5000).optional()
productDisplayName: z.string().max(500)
```

---

## Vulnerability Summary Table

| # | Issue | Location | Severity | Status |
|---|-------|----------|----------|--------|
| 1 | Inventory oversell race condition | orders.ts:1198-1220 | **CRITICAL** | Open |
| 2 | Rapid state transition bypass | OrdersWorkSurface.tsx:613 | **HIGH** | Open |
| 3 | Optimistic locking optional | orders.ts:227 | **HIGH** | Open |
| 4 | No max length on string inputs | Multiple schemas | **MEDIUM** | Open |
| 5 | No negative balance constraint | accounting logic | **MEDIUM** | Open |

---

## Attack Vectors Tested

### XSS (Cross-Site Scripting)
**Status**: ✅ NOT VULNERABLE
- React escapes all text content by default
- No dangerouslySetInnerHTML usage found
- No manual HTML string concatenation

### SQL Injection
**Status**: ✅ NOT VULNERABLE
- Drizzle ORM uses parameterized queries
- All inputs validated by Zod schemas
- No raw SQL concatenation found

### CSRF (Cross-Site Request Forgery)
**Status**: ✅ PROTECTED
- tRPC uses POST requests with JSON body
- Session cookies properly configured

### Session Fixation
**Status**: ✅ PROTECTED
- Session regenerated on login
- Proper cookie settings

---

## Recommendations

### P0 - Critical (Address Immediately)
1. Add FOR UPDATE lock in confirmOrder inventory check to prevent oversell
2. Add debounce and mutation guards to prevent rapid state transitions

### P1 - High (Address Soon)
1. Make optimistic locking version checks mandatory (remove backward compatibility)
2. Add database constraints for negative balance prevention

### P2 - Medium (Address When Possible)
1. Add max length validation to all string fields
2. Implement soft-delete cascade for orders → line items
3. Add request deduplication at API layer

---

## Conclusion

**Security Posture: MODERATE**

The Work Surfaces have good foundational security:
- ✅ RBAC properly enforced
- ✅ Input validation via Zod
- ✅ XSS/SQL injection protected

Critical gaps:
- ❌ Race conditions in inventory allocation
- ❌ Rapid state transition vulnerability
- ❌ Optional optimistic locking

These issues should be addressed before high-volume production use.
