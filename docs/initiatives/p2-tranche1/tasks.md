# P2 Tranche 1 — Tasks

## Task 1: LIVE-first default filter

- **Linear:** TER-1048, TER-1072
- **Files:** `client/src/hooks/useInventoryFilters.ts`
- **Steps:**
  1. Change `defaultFilters.status` from `[]` to `["LIVE"]`
  2. Update `clearAllFilters` to reset to `["LIVE"]` not `[]`
  3. Ensure URL deep links with explicit status override the default
  4. Update tests
- **Estimate:** 1 hour

## Task 2: Human-readable status labels

- **Linear:** TER-1064 (collapsed into TER-1048)
- **Files:** `client/src/lib/statusTokens.ts`, all status-rendering components
- **Steps:**
  1. Add BATCH_STATUS_LABELS map to statusTokens.ts
  2. Update BatchStatusBadge to use labels
  3. Update AdvancedFilters checkbox labels
  4. Update FilterChips display text
  5. Update InventoryBrowser status display
  6. Update CommandPalette search result descriptions
  7. Grep for remaining raw enum renders
  8. Verify with pnpm check && pnpm lint
- **Estimate:** 2-3 hours

## Task 3: Product identity consistency

- **Linear:** TER-1051
- **Files:** InventoryWorkSurface, InventoryBrowser, SalesCatalogueSurface, CommandPalette
- **Steps:**
  1. Add category·subcategory badge/subtitle to inventory grid product column
  2. Update InventoryBrowser product display to match
  3. Update SalesCatalogueSurface product display to match
  4. Update CommandPalette product search results to show type
  5. Verify consistency across all 4 surfaces
- **Estimate:** 3-4 hours

## Task 4: Consignment payout narrative

- **Linear:** TER-1076
- **Files:** vendorPayables router, new ConsignmentRangePanel, ClientProfilePage
- **Steps:**
  1. Extend vendorPayables.getByVendor to join orderLineItems for range data
  2. Create ConsignmentRangePanel component
  3. Add panel to ClientProfilePage Money tab for supplier contacts
  4. Add tests for range data query and panel rendering
  5. Verify with pnpm check && pnpm lint && pnpm test
- **Estimate:** 4-5 hours

## Task 5: Tranche 1 QA

- **Steps:**
  1. Run pnpm check && pnpm lint && pnpm test
  2. Run Playwright proof scripts for all 3 seams
  3. Capture screenshots on staging
  4. Run adversarial review
- **Estimate:** 2-3 hours

## Execution Order

1. Tasks 1 + 2 together (both touch status/filter, natural pair)
2. Task 3 (product identity — independent)
3. Task 4 (consignment payout — independent)
4. Task 5 (QA — after all code merged)
