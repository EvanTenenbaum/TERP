# P2 Seam Specifications — Design

## Approach

Each spec deliverable is produced by reading actual code on the Mac Mini, not summarizing chat history. Every claim must cite file paths and line numbers.

## Seam 4 Audit Method

1. Read `client/src/pages/OrderCreatorPage.tsx` completely
2. Document every data point visible at each stage: client selection, item addition, pricing, finalization
3. Check for credit limit display, balance display, margin display, consignment range display
4. Check `COGSInput.tsx` for below-range warning behavior
5. Check `FloatingOrderPreview.tsx`, `OrderTotalsPanel.tsx`, `ReferralCreditsPanel.tsx` for context panels
6. Compare against TER-1052 and TER-1053 acceptance criteria

## Seam 3 Spec Method

1. Read `strains` table schema — category field (indica/sativa/hybrid)
2. Read `products` table schema — category (product type) + subcategory (grow type already used: "Premium Indoor")
3. Read `tags` table — STRAIN, FLAVOR, EFFECT categories exist
4. Read InventoryWorkSurface.tsx — what identity columns render
5. Read InventoryBrowser.tsx — how products display during order creation
6. Read SalesCatalogueSurface.tsx — how products display in catalogues
7. Propose pattern that uses existing fields, no migration if possible

## Seam 1 Spec Method

1. Read `useInventoryFilters.ts` — full filter state shape
2. Read `SavedViewsDropdown.tsx` — saved view persistence mechanism
3. Read URL param support in `useInventoryFilters` — what already deep-linkable
4. Check if `filtering.ts` portable cut infrastructure connects across surfaces
5. Propose simplest transport: URL params that persist across navigation

## Dependency Graph Format

Mermaid diagram + table mapping original issues to tranche structure.

## Tracker Reconciliation Method

Use Linear API via Mac Mini (LINEAR_API_KEY in ~/.codex/.env) to query current states and update.
