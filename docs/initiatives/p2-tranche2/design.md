# P2 Tranche 2 — Design

## NOTE: This design depends on Phase 2 (seam specifications) completing first.

The seam 1 and seam 4 designs will be filled in after the audit and spec tasks in Phase 2 produce their findings.

## Seam 1: Portable Cuts (placeholder — will be filled by Phase 2 spec)

Pending: `docs/initiatives/p2-tranche2/seam1-spec.md` from Phase 2

## Seam 4: Retrieval-to-Commit (placeholder — will be filled by Phase 2 audit)

Pending: `docs/initiatives/p2-tranche1/seam4-audit.md` from Phase 2

## Seam 5: Outbound Identity

**Current state:** SharedSalesSheetPage.tsx renders a public view using salesSheetHistory data. Items include name, category, subcategory, strain, grade, vendor.

**Design:** Apply the same product identity hierarchy from Tranche 1 (Seam 3) to the shared view. Add client name + date header. Remove any internal-only fields (batch codes, COGS data) from the shared render.

**Files to change:**

- `client/src/pages/SharedSalesSheetPage.tsx`
- Potentially `server/routers/salesSheets.ts` if shared query needs adjustment
