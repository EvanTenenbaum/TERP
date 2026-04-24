# TER-1069 Adversarial Review

## Review Inputs

- Primary accepted hostile pass run: `/Users/evan/.codex-runs/claude-qa/20260408T012716Z-private-tmp-ter-1069-review-diff-964984/`
- Prior structured run for comparison: `/Users/evan/.codex-runs/claude-qa/20260408T012201Z-private-tmp-ter-1069-review-diff-611c6e/`
- Evidence bundle:
  - [TER-1069 evidence index](/Users/evan/spec-erp-docker/TERP/TERP-TER-1069-20260408/docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/evidence/ter-1069/README.md)
  - [runtime summary](/Users/evan/spec-erp-docker/TERP/TERP-TER-1069-20260408/output/playwright/ter-1069-retrieval-continuity-2026-04-08/summary.md)
  - [blocked draft proof](/Users/evan/spec-erp-docker/TERP/TERP-TER-1069-20260408/output/playwright/ter-1069-retrieval-continuity-2026-04-08/blocked-draft-confirm-disabled.png)
  - [imported cut proof](/Users/evan/spec-erp-docker/TERP/TERP-TER-1069-20260408/output/playwright/ter-1069-retrieval-continuity-2026-04-08/create-order-imported-cut-after-reload.png)
  - [shared sales sheet proof](/Users/evan/spec-erp-docker/TERP/TERP-TER-1069-20260408/output/playwright/ter-1069-retrieval-continuity-2026-04-08/shared-sales-sheet-proof.png)

## Gate Result

- `Accepted with non-blocking follow-ups documented`

## Findings Triage

### Fixed before acceptance

1. Blocked-draft screenshot originally failed to show the disabled `Confirm Order` button.
   - Fixed by recapturing [blocked-draft-confirm-disabled.png](/Users/evan/spec-erp-docker/TERP/TERP-TER-1069-20260408/output/playwright/ter-1069-retrieval-continuity-2026-04-08/blocked-draft-confirm-disabled.png) from the scrollable `main.terp-main-shell` container so the warning panel and disabled action bar appear in the same frame.

2. Vendor fallback was previously only inferable through wrapper tests.
   - Fixed by adding direct source-of-truth coverage in [filtering.test.ts](/Users/evan/spec-erp-docker/TERP/TERP-TER-1069-20260408/client/src/components/sales/filtering.test.ts) and an inline clarification in [filtering.ts](/Users/evan/spec-erp-docker/TERP/TERP-TER-1069-20260408/client/src/components/sales/filtering.ts).

3. Shared page summary grammar was incorrect (`1 items`).
   - Fixed in [SharedSalesSheetPage.tsx](/Users/evan/spec-erp-docker/TERP/TERP-TER-1069-20260408/client/src/pages/SharedSalesSheetPage.tsx) and refreshed in [shared-sales-sheet-proof.png](/Users/evan/spec-erp-docker/TERP/TERP-TER-1069-20260408/output/playwright/ter-1069-retrieval-continuity-2026-04-08/shared-sales-sheet-proof.png).

### Rejected as non-blocking or already-covered

1. `Incoming` rows appear addable in the imported-cut screenshot.
   - Rejected as a code blocker. The behavioral guard is already covered by [SalesOrderSurface.test.tsx](/Users/evan/spec-erp-docker/TERP/TERP-TER-1069-20260408/client/src/components/spreadsheet-native/SalesOrderSurface.test.tsx), specifically the non-sellable-row add blocking case, and the screenshot’s low-contrast disabled affordance is an evidence-quality issue rather than a demonstrated runtime regression.

2. Mixed sellable-plus-blocked drafts are not hard-blocked.
   - Rejected as a scope blocker. TER-1069 acceptance requires that drafts made only of unavailable or blocked rows cannot finalize unnoticed. Mixed drafts remain allowed but now surface explicit blocked-line warning copy and badge coverage in [SalesOrderSurface.test.tsx](/Users/evan/spec-erp-docker/TERP/TERP-TER-1069-20260408/client/src/components/spreadsheet-native/SalesOrderSurface.test.tsx).

3. Commit Continuity and credit sections are visually separated from the final action bar.
   - Rejected for this tranche under the “do not redesign TERP” guardrail. This is a future UX refinement candidate, not a correctness blocker for TER-1069.

4. Duplicate imported-cut state signaling between the chip row and Commit Continuity badge.
   - Rejected for this tranche as a follow-up usability refinement. The duplicated signal does not create incorrect behavior or invalidate the retrieval-to-commit continuity acceptance criteria.

## Residual Follow-Ups

- Consider improving the low-contrast disabled `+ Add` affordance for non-sellable imported rows in a later UX polish pass.
- Consider renaming `Imported LIVE cut` when `Include unavailable` is active if product wants the badge text to reflect the currently broadened view rather than the source cut name.
- Consider moving or mirroring blocked-line explanation nearer to the action bar in a later continuity polish tranche.

## Final Assessment

- TER-1069 has the required hostile review artifact.
- No remaining adversarial finding blocks PR and merge for this tranche.
