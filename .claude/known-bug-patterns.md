# TERP Known Bug Patterns

This catalog tracks recurring bugs and their root causes. When investigating issues, CHECK THIS FIRST.

## Pattern 1: Inventory $0 Display

**Symptoms:**
- Inventory page shows batches with $0.00 cost
- Quantities appear but costs are missing
- Affects some batches but not others

**Root Cause:**
Status filter enum mismatch. The `inventoryStatus` enum in the schema doesn't match the values being filtered in the UI/router.

**Detection:**
```bash
# Check enum definition
grep -A10 "inventoryStatus" drizzle/schema/inventory.ts

# Check filter usage
grep -rn "status.*=.*'\|inventoryStatus" server/routers/inventory*.ts client/src/
```

**Fix Pattern:**
Ensure the status values in queries match exactly what's in the mysqlEnum definition.

**Occurrences:** 3+ times (Dec 2025, Jan 2026)

---

## Pattern 2: "No Inventory Found" False Negative

**Symptoms:**
- Inventory page shows "No inventory found"
- Database has 300+ batches
- Refreshing doesn't help

**Root Cause:**
Restrictive filters persisted in localStorage. User applied filters in a previous session, and those filters remain active.

**Detection:**
```bash
# Check for localStorage filter persistence
grep -rn "localStorage.*filter\|filter.*localStorage" client/src/
```

**Fix Pattern:**
Either clear filters on page load, or make filter state more visible to users.

**Occurrences:** 2+ times

---

## Pattern 3: mysqlEnum Column Name Mismatch

**Symptoms:**
- Runtime error: "Unknown column 'X' in 'field list'"
- Works in development, fails in production
- New enum added recently

**Root Cause:**
The first argument to `mysqlEnum()` must match the actual database column name, not a semantic name.

**Detection:**
```bash
# Find all mysqlEnum declarations
grep -rn "mysqlEnum(" drizzle/schema/

# Compare with actual column names in table definitions
```

**Fix Pattern:**
```typescript
// WRONG
export const orderStatusEnum = mysqlEnum("orderStatus", [...]);

// CORRECT - matches DB column
export const orderStatusEnum = mysqlEnum("status", [...]);
```

**Occurrences:** 2+ times

---

## Pattern 4: Unresponsive Buttons

**Symptoms:**
- Button appears but clicking does nothing
- No console errors
- Other buttons on same page work

**Root Cause:**
Usually one of:
1. CSS `pointer-events: none` inherited
2. Z-index issue - another element covering button
3. onClick handler has early return
4. Form submission vs button click conflict

**Detection:**
```bash
# Check for pointer-events
grep -rn "pointer-events" client/src/

# Check z-index patterns
grep -rn "z-index\|z-\[" client/src/ --include="*.tsx"

# Check onClick handlers for early returns
grep -B5 -A10 "onClick.*=>" client/src/components/
```

**Fix Pattern:**
Use browser DevTools to inspect actual CSS on element. Check for invisible overlays.

**Occurrences:** Recurring (various buttons)

---

## Pattern 5: Actor From Input (Security)

**Symptoms:**
- Audit shows actions by wrong user
- createdBy/updatedBy fields incorrect
- Security review flags

**Root Cause:**
Code accepts actor ID from client input instead of authenticated context.

**Detection:**
```bash
grep -rn "input\.createdBy\|input\.userId\|input\.actorId" server/
```

**Fix Pattern:**
```typescript
// WRONG
const createdBy = input.createdBy;

// CORRECT
import { getAuthenticatedUserId } from "../_core/trpc";
const createdBy = getAuthenticatedUserId(ctx);
```

**Occurrences:** CI blocks these now, but legacy code may exist

---

## Pattern 6: Vendors Table Usage (Deprecated)

**Symptoms:**
- Query returns empty when data exists
- Join fails silently
- Supplier data missing

**Root Cause:**
Using deprecated `vendors` table instead of `clients` with `isSeller=true`.

**Detection:**
```bash
grep -rn "db\.query\.vendors\|from vendors\|vendors\." server/
grep -rn "vendorId" server/ drizzle/ | grep -v "legacyVendorId"
```

**Fix Pattern:**
```typescript
// WRONG
const suppliers = await db.query.vendors.findMany();

// CORRECT
const suppliers = await db.query.clients.findMany({
  where: eq(clients.isSeller, true),
  with: { supplierProfile: true }
});
```

**Occurrences:** Legacy code cleanup ongoing

---

## Adding New Patterns

When you discover a recurring bug:

1. Add entry to this file with:
   - Symptoms
   - Root Cause
   - Detection commands
   - Fix Pattern
   - Occurrence count

2. Update `.claude/audit-history.log`

3. Add detection to relevant audit command
