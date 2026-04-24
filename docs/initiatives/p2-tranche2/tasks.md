# P2 Tranche 2 — Tasks

## NOTE: Detailed tasks for Seams 1 and 4 will be created after Phase 2 specs are complete.

## Task 1: Implement Seam 1 (Portable Cuts)

- **Linear:** TER-1073
- **Depends on:** Seam 1 spec from Phase 2, Seam 2 from Tranche 1
- **Estimate:** 4-6 hours (TBD after spec)

## Task 2: Implement Seam 4 (Retrieval-to-Commit)

- **Linear:** TER-1052, TER-1053, TER-1074
- **Depends on:** Seam 4 audit from Phase 2
- **Estimate:** 4-8 hours (TBD after audit — may be partially done)

## Task 3: Implement Seam 5 (Outbound Identity)

- **Linear:** TER-1050, TER-1075
- **Depends on:** Seam 3 from Tranche 1 (product identity pattern)
- **Files:** SharedSalesSheetPage.tsx, salesSheets router
- **Steps:**
  1. Apply product identity hierarchy to shared catalogue render
  2. Add client name + date header to shared view
  3. Remove internal-only fields from shared render
  4. Verify shared link works with updated format
- **Estimate:** 3-4 hours

## Task 4: Tranche 2 QA

- **Steps:** Same pattern as Tranche 1 (proof + adversarial review)
- **Estimate:** 2-3 hours

## Execution Order

1. Tasks 1 + 2 can run in parallel (different surfaces)
2. Task 3 after Tranche 1 Seam 3 is merged
3. Task 4 after all code merged
