# TER-1069 Evidence Index

## Scope

- Tranche: `TER-1069`
- Child seams:
  - `TER-1074` retrieval-to-commit context placement
  - `TER-1075` outbound identity and terms consistency
- Canonical repo home: `docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/`

## Product Outcome

- The create-order surface now keeps relationship, money, and pricing context beside the commit moment instead of forcing a separate lookup step.
- Portable catalogue cuts carry forward into the order document and keep their cut summary visible after the order route hydrates.
- The order surface now treats imported unavailable inventory as explicit risk instead of letting it disappear into the flow.
- Customer-facing catalogue output now uses one shared descriptor and one shared confirmation-terms voice across chat/export/shared-page rendering.
- Public shared sales sheets now preserve vendor-based identity descriptors instead of dropping them when `brand` is empty.

## Verification Bundle

- `pnpm exec vitest run client/src/components/spreadsheet-native/SalesOrderSurface.test.tsx client/src/components/spreadsheet-native/SalesCatalogueSurface.test.tsx client/src/pages/SharedSalesSheetPage.test.tsx server/routers/salesSheets.test.ts client/src/components/sales/outbound.test.ts client/src/components/sales/filtering.test.ts`
  - Pass, `66` tests including the new blocked-draft, mixed-draft, credit-next-step, outbound, and filtering identity coverage
- `pnpm lint`
  - Pass
- `pnpm check`
  - Pass
- `pnpm build`
  - Pass
- Browser/runtime proof:
  - [summary.md](/Users/evan/spec-erp-docker/TERP/TERP-TER-1069-20260408/output/playwright/ter-1069-retrieval-continuity-2026-04-08/summary.md)
  - [create-order-client-selected.png](/Users/evan/spec-erp-docker/TERP/TERP-TER-1069-20260408/output/playwright/ter-1069-retrieval-continuity-2026-04-08/create-order-client-selected.png)
  - [create-order-imported-cut-after-reload.png](/Users/evan/spec-erp-docker/TERP/TERP-TER-1069-20260408/output/playwright/ter-1069-retrieval-continuity-2026-04-08/create-order-imported-cut-after-reload.png)
  - [shared-sales-sheet-proof.png](/Users/evan/spec-erp-docker/TERP/TERP-TER-1069-20260408/output/playwright/ter-1069-retrieval-continuity-2026-04-08/shared-sales-sheet-proof.png)
  - [blocked-draft-confirm-disabled.png](/Users/evan/spec-erp-docker/TERP/TERP-TER-1069-20260408/output/playwright/ter-1069-retrieval-continuity-2026-04-08/blocked-draft-confirm-disabled.png)
- Claude adversarial review:
  - Accepted report: [2026-04-08-ter-1069-adversarial-review.md](/Users/evan/spec-erp-docker/TERP/TERP-TER-1069-20260408/docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/reviews/2026-04-08-ter-1069-adversarial-review.md)

## Harness Notes

- The create-order route cleared portable cuts when the customer picker changed manually, so the imported-cut proof used the real route state (`clientId=2`) plus a reload after writing the portable cut into `sessionStorage`.
- The seeded local data exposed `Incoming` inventory for the imported cut after reload, which was useful for proving the unavailable-state copy and imported-cut badge without inventing synthetic browser fixtures.
- The shared-page proof used a real local `salesSheetHistory` row plus `setShareToken`, created against the same local proof DB.

## Limitation

- The repo-wide `pnpm test` reset/seed harness remains a known unrelated limitation outside this diff. TER-1069 closeout uses the touched-surface bundle above instead of claiming a false full-suite pass.

## User-Verifiable Deliverables

- Opening `/sales?tab=create-order` and selecting a customer now shows customer context and commit continuity beside the document instead of a contextless order composer.
- Reloading the create-order route with a portable cut for client `2` now restores the cut summary and shows `Imported cut active` while keeping the cut narrowed to `Blue Dream` and `Include unavailable`.
- Opening `/sales?tab=create-order&draftId=51` in the proof environment now shows the blocked-line warning and a disabled `Confirm Order` button together when a draft contains only non-sellable inventory.
- Opening the public shared catalogue proof route now shows `Andy Rhan · Indoor · BT-42` and the standardized payment-terms confirmation note on the page footer.
