# TER-1070 Adversarial Review

## Review Inputs

- Initial evidence-assisted wrapper run: `/Users/evan/.codex-runs/claude-qa/20260408T022934Z-this-de1006/`
- Initial direct Claude fallback run: `/Users/evan/.codex-runs/claude-qa/20260408T023928Z-ter-1070-api-fallback-tight/`
- Final accepted direct Claude run after the follow-up patch: `/Users/evan/.codex-runs/claude-qa/20260408T024825Z-ter-1070-api-final/`
- Evidence bundle:
  - [TER-1070 evidence index](/Users/evan/spec-erp-docker/TERP/TERP-TER-1070-20260408/docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/evidence/ter-1070/README.md)
  - [runtime summary](/Users/evan/spec-erp-docker/TERP/TERP-TER-1070-20260408/output/playwright/ter-1070-ops-continuity-2026-04-08/summary.md)
  - [receiving queue proof](/Users/evan/spec-erp-docker/TERP/TERP-TER-1070-20260408/output/playwright/ter-1070-ops-continuity-2026-04-08/receiving-queue-expected-today.png)
  - [receiving draft proof](/Users/evan/spec-erp-docker/TERP/TERP-TER-1070-20260408/output/playwright/ter-1070-ops-continuity-2026-04-08/receiving-draft-po-reference.png)
  - [supply settlement proof](/Users/evan/spec-erp-docker/TERP/TERP-TER-1070-20260408/output/playwright/ter-1070-ops-continuity-2026-04-08/relationship-supply-settlement.png)

## Gate Result

- `Accepted with non-blocking follow-ups documented`

## Findings Triage

### Fixed before acceptance

1. Expected-delivery handling previously depended on browser-local calendar math.
   - Fixed by introducing [calendarDates.ts](/Users/evan/spec-erp-docker/TERP/TERP-TER-1070-20260408/client/src/lib/calendarDates.ts) and routing the queue filter, draft persistence, and receiving-label formatting through UTC-stable calendar-date normalization instead of raw local-time comparisons.

2. The receiving-draft normalization contract was under-specified in tests.
   - Fixed by updating [PurchaseOrderSurface.test.tsx](/Users/evan/spec-erp-docker/TERP/TERP-TER-1070-20260408/client/src/components/spreadsheet-native/PurchaseOrderSurface.test.tsx) to assert the exact normalized date, adding an invalid-date branch test, and adding a DOM-level assertion for the `Expected Today` filter.

3. The review requested proof that UTC timestamps still classify as `Today` across timezone boundaries.
   - Fixed by adding [calendarDates.test.ts](/Users/evan/spec-erp-docker/TERP/TERP-TER-1070-20260408/client/src/lib/calendarDates.test.ts), including the UTC-boundary `isCalendarDateToday` case.

4. Legacy local drafts could expose a malformed `Show Purchase Order` action if `poId` was invalid.
   - Fixed by guarding the action in [ProductIntakeSlicePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP-TER-1070-20260408/client/src/components/uiux-slice/ProductIntakeSlicePage.tsx) so it only renders and navigates for positive integer PO IDs.

### Rejected as non-blocking or review-packet-specific

1. The `PO Reference` column repeats draft-level data on every line.
   - Rejected as a release blocker. TER-1070 acceptance requires visible PO linkage in the receiving draft, and the current draft model is intentionally single-PO. The repetition is a future multi-PO draft design decision, not a correctness regression in this tranche.

2. The final direct Claude fallback noted that screenshots were not attached to the narrowed text-only API packet.
   - Rejected as a product blocker. The repo packet does contain the screenshots and runtime summary; the fallback review intentionally used a narrowed text packet after the wrapper path hit the Claude output-token ceiling.

## Review Runner Notes

- The first packaged `claude-qa-review` wrapper run produced a durable blocked artifact rather than a usable verdict:
  - [report.md](/Users/evan/.codex-runs/claude-qa/20260408T022934Z-this-de1006/report.md)
  - blocker: Claude Messages API exhausted its output token budget before returning a text review
- The accepted tranche verdict came from the narrower direct Claude API fallback against the final post-fix diff:
  - [result.json](/Users/evan/.codex-runs/claude-qa/20260408T024825Z-ter-1070-api-final/result.json)

## Residual Follow-Ups

- If TERP later supports multi-PO receiving drafts, move PO linkage onto each `ProductIntakeDraftLine` instead of repeating the draft-level PO reference across every row.
- If the tranche proof packet is ever reviewed outside the repo, include the screenshots directly in the external packet instead of relying on repo-relative links.

## Final Assessment

- TER-1070 has the required hostile-review artifact.
- No remaining adversarial finding blocks PR and merge for this tranche.
