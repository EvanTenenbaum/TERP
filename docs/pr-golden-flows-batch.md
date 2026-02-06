# PR: Golden Flows Beta - 13 bug fixes, RBAC hardening, and security review

**Branch:** `claude/golden-flows-agent-team-BqhrR` → `main`
**Type:** Draft PR (DO NOT MERGE without live QA)

---

## Summary

Comprehensive batch of fixes for the Golden Flows beta release, covering 13 tasks across 5 waves.

### WAVE 1: Documentation

- **TER-55**: Updated Golden Flows Runbook (v2.0) with step-by-step guides for all 8 golden flows
- **TER-57**: Enhanced beta testing checklist with onboarding guide, role-based access matrix, and feedback templates

### WAVE 2: UI Bug Fixes

- **TER-33 (GF-001)**: Fixed Direct Intake form field visibility - AG Grid v35 theme conflict resolved by switching from CSS to JS theme API (`themeAlpine` prop)
- **TER-35 (GF-008)**: Fixed Sample Request product selector not loading - removed overly restrictive `enabled` guard on product query
- **TER-36 (GF-004)**: Fixed Invoice PDF generation timeout - wrapped entire async operation in `withTimeout` instead of just the sync PDF call
- **TER-37 (GF-006)**: Fixed AR/AP dashboard data inconsistencies - added "VIEWED" status to debtors filter, fixed vendor name resolution via `supplierProfiles → clients` path (removed deprecated `vendors` table reference)

### WAVE 3: Component Integration

- **TER-43**: Integrated ReturnGLStatus component into Returns page with expandable GL entry viewer, status derived from notes field markers
- **TER-44**: Verified COGS and GL visibility components already integrated in order views (no changes needed)

### WAVE 4: Verification & Testing

- **TER-34 (GF-002)**: Fixed PO product dropdown race condition - fallback query now waits for primary query to settle
- **TER-41**: Verified GL entries for invoices and payments - no silent failures found (code audit only)
- **TER-42**: Fixed missing `syncClientBalance()` calls after invoice creation in both order-to-invoice and direct invoice flows (ARCH-002)

### WAVE 5: Security & RBAC

- **TER-49**: Added `requirePermission()` guards to all vendor supply mutation endpoints (create, update, reserve, purchase, delete)
- **TER-56**: Replaced raw SQL delete with Drizzle typed query in `clientWants` router; comprehensive security audit documented

## Verification Results

```
TypeScript: PASS
Lint:       PASS (changed files - pre-existing errors in other files)
Tests:      PASS (5372/5387 - 2 pre-existing cmdk/jsdom failures)
Build:      PASS
```

## Security Findings (TER-56)

| Finding                                            | Severity | Status                              |
| -------------------------------------------------- | -------- | ----------------------------------- |
| Raw SQL delete in clientWants.ts                   | CRITICAL | Fixed                               |
| Missing RBAC on vendorSupply mutations             | HIGH     | Fixed                               |
| Hard deletes in vipPortal, photography, scheduling | MEDIUM   | Documented (needs schema migration) |
| Fallback user ID patterns                          | -        | None found                          |
| Actor-from-input patterns                          | -        | None found                          |
| Exposed secrets                                    | -        | None found                          |

---

## Runtime Testing Instructions

### Prerequisites

- App running locally or deployed to staging
- Login as **qa.superadmin@terp.test** / **TerpQA2026!** (or use DEMO_MODE=true)
- Have at least one order, one client, and seeded products in the system

### Test 1: Direct Intake Form (TER-33, GF-001)

1. Navigate to **Inventory > Direct Intake** (or the Work Surface with Direct Intake)
2. **Verify**: AG Grid renders with visible column headers and rows
3. **Verify**: Form fields (product, quantity, price, etc.) are visible and interactive
4. **Verify**: No blank/invisible grid - the alpine theme should be applied
5. **Pass criteria**: Grid renders with data, no blank white area where grid should be

### Test 2: PO Product Dropdown (TER-34, GF-002)

1. Navigate to **Purchase Orders** work surface
2. Click to create a new PO or edit an existing one
3. Open the **product dropdown**
4. **Verify**: Products appear immediately (not empty)
5. **Verify**: If the primary endpoint fails (check console for errors), the fallback list loads
6. **Pass criteria**: Dropdown shows product list on first open, no race condition blanking

### Test 3: Invoice PDF Generation (TER-36, GF-004)

1. Navigate to **Accounting > Invoices**
2. Select an invoice and click **Generate PDF** (or the PDF action button)
3. **Verify**: PDF generates within 30 seconds (was timing out before)
4. **Verify**: Console shows timing logs: `dbDurationMs`, `genDurationMs`, `totalDurationMs`
5. **Pass criteria**: PDF downloads/displays without timeout error

### Test 4: AR/AP Dashboard (TER-37, GF-006)

1. Navigate to **Accounting > AR/AP Dashboard**
2. Check the **Top Debtors** section
3. **Verify**: Invoices with "VIEWED" status are included in the totals
4. Check the **Top Vendors Owed** section
5. **Verify**: Vendor names show as actual names (e.g., "Acme Corp"), not "Vendor #123"
6. **Verify**: If a vendor name can't be resolved, it falls back to "Vendor #ID"
7. **Pass criteria**: Both sections show accurate totals with real names

### Test 5: Sample Request Product Selector (TER-35, GF-008)

1. Navigate to **Samples > Create Sample Request**
2. Open the **product selector** dropdown
3. **Verify**: Products load immediately without typing anything
4. Type a search term
5. **Verify**: Results filter correctly with debounce
6. **Pass criteria**: Product list is pre-populated on page load, not empty

### Test 6: Returns GL Status (TER-43)

1. Navigate to **Returns** page
2. Find a return in the list
3. Click **"View GL"** button
4. **Verify**: The GL status card expands below the row
5. **Verify**: Status reflects the actual return state (PENDING/APPROVED/PROCESSED/CANCELLED), NOT always "PROCESSED"
6. **Verify**: For PROCESSED returns, GL reversal entries are shown
7. **Pass criteria**: GL card shows correct status derived from return notes

### Test 7: Client Balance After Invoice (TER-42)

1. Navigate to **Orders** and find a confirmed order without an invoice
2. Generate an invoice from the order (or create a direct invoice in Accounting)
3. Navigate to **Clients** and find the associated client
4. **Verify**: `totalOwed` has been updated to reflect the new invoice amount
5. **Pass criteria**: Client balance updates immediately after invoice creation (no stale value)

### Test 8: Auditor RBAC (TER-49)

1. Log out and log in as **qa.auditor@terp.test** / **TerpQA2026!**
2. Navigate to any page - **Verify**: Read-only data loads correctly
3. Navigate to **Audit Logs** - **Verify**: Full access to view, search, export
4. Attempt to create/edit/delete anything (orders, clients, invoices, etc.)
5. **Verify**: All mutations are blocked with a "Forbidden" or similar permission error
6. Specifically test vendor supply: try to create a new supply item
7. **Verify**: Operation is blocked (previously this was unprotected)
8. **Pass criteria**: Auditor can read everything, write nothing

### Test 9: Documentation (TER-55, TER-57)

1. Open `docs/golden-flows/GOLDEN_FLOWS_RUNBOOK.md` in a markdown viewer
2. **Verify**: Step-by-step instructions for all 8 golden flows are present
3. Open `docs/beta/BETA_TESTING_CHECKLIST.md`
4. **Verify**: Onboarding guide, role matrix, and per-flow checklists are present
5. **Pass criteria**: Docs are comprehensive, accurate, and match current UI

### Known Limitations

- **Hard deletes** remain in `vipPortal.ts`, `photography.ts`, `scheduling.ts`, `calendarManagement.ts` (tables lack `deletedAt` columns - needs schema migration in a future task)
- **clientWants delete** is now Drizzle-typed but still a hard delete (table lacks `deletedAt`)
- **2 pre-existing test failures** in cmdk component (jsdom `scrollIntoView` limitation) - unrelated to this PR
