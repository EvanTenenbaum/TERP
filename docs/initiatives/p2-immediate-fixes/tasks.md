# P2 Immediate Fixes — Tasks

All tasks target `main` branch on the Mac Mini repo.

## Task 1: Surface contact info on overdue invoices

- **Linear:** TER-1057 (update status)
- **Files:** `client/src/components/spreadsheet-native/InvoicesSurface.tsx`
- **Steps:**
  1. Find the customer name cell renderer in the overdue invoices table
  2. Add `customerEmail` and `customerPhone` as secondary text below name
  3. Add null guards (only render if data exists)
  4. Verify with `pnpm check && pnpm lint`
  5. Add/update test for contact info rendering
- **Estimate:** 1-2 hours
- **Verification:** Browser screenshot showing contact info on overdue invoice row

## Task 2: Fix Copy for Chat data source

- **Linear:** TER-1054 (update scope)
- **Files:** `client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx`
- **Steps:**
  1. Change `handleCopyForChat` to map over `selectedItems` instead of `inventoryRows`
  2. Update disabled condition to `selectedItems.length === 0`
  3. Add tooltip on disabled state: "Add items to your catalogue first"
  4. Update test assertions for new data source
  5. Verify with `pnpm check && pnpm lint && pnpm test`
- **Estimate:** 1-2 hours
- **Verification:** Component test + browser screenshot with enabled button

## Task 3: Add double-submit guard to RecordPaymentDialog

- **Linear:** New issue or update TER-1058
- **Files:** `client/src/components/accounting/RecordPaymentDialog.tsx`
- **Steps:**
  1. Add `submittingRef = useRef(false)`
  2. Guard submit handler with ref check
  3. Reset ref in finally block
  4. Verify with `pnpm check`
  5. Add test for rapid double-click scenario
- **Estimate:** 30 minutes
- **Verification:** Test passes for double-submit prevention

## Task 4: Post-merge browser QA

- **Linear:** TER-1067 (reconciliation task)
- **Steps:**
  1. Ensure staging reflects latest main
  2. Run Playwright proof scripts for all 6 completed areas
  3. Capture screenshots with features in ACTIVE state
  4. Write summary.json with all checks passing
  5. Save to `output/playwright/p2-phase1-qa/`
- **Estimate:** 2-3 hours
- **Verification:** All screenshots show functional features, summary.json clean
- **Note:** Run AFTER tasks 1-3 are merged so QA captures the fixes

## Execution Order

1. Tasks 1, 2, 3 in parallel (independent changes)
2. Task 4 after merge (validates everything)
