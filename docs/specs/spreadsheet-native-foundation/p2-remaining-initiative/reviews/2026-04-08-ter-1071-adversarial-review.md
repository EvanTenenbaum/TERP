# TER-1071 Adversarial Review

## Review Question

Did the deferred decision pass hide unfinished continuity blockers by parking tickets that should have stayed in the active initiative?

## Inputs

- [decision pass](/Users/evan/spec-erp-docker/TERP/TERP-TER-1070-20260408/docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/analysis/2026-04-08-ter-1071-deferred-decision-pass.md)
- [requirements packet](/Users/evan/spec-erp-docker/TERP/TERP-TER-1070-20260408/docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/requirements/README.md)
- [design packet](/Users/evan/spec-erp-docker/TERP/TERP-TER-1070-20260408/docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/design/README.md)

## Challenges

1. Are `TER-1055` and `TER-1056` really deferred, or are they unfinished required UX?
   - Accepted as deferred. The packet explicitly says dashboard KPI expansion and activity feed work must not be silently mixed back into the continuity tranches.

2. Should `TER-1063` be closed instead of deferred because fulfillment manifest/location primitives already exist?
   - Rejected. Existing queue and manifest primitives prove partial capability, but there is no dedicated proof packet for the exact confirmed-order-to-pick-list acceptance story. Closing it here would overclaim.

3. Should `TER-1065` be promoted into active scope because communication primitives already exist?
   - Rejected. Existing communications are generic client-history primitives. Payment follow-up tracking still needs workflow-specific shaping, which is not required to close P2 continuity.

4. Does leaving all four tickets out of the active lane risk losing them?
   - Mitigated. TER-1071 requires explicit Linear comments and backlog-state normalization for each item, so nothing remains as an implied leftover.

## Verdict

- `Accepted`
- TER-1071 can close once the per-ticket Linear writeback is attached.
- No deferred ticket needs to be pulled back into the P2 remaining initiative.
