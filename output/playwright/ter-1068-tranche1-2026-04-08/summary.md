# TER-1068 Tranche 1 Browser Proof

- Generated at: 2026-04-07T23:53:21Z
- Base URL: http://127.0.0.1:3210
- Actor: qa.superadmin@terp.test via POST /api/qa-auth/login
- Harness mutation: rebuilt the local light test DB with `pnpm test:db:fresh` after the unrelated `pnpm test` reset/seed failure left `terp-test.users` missing, then restarted the proof server directly against that rebuilt DB.
- Retained artifact note: `order-saved-view-loaded.png` remains from the initial same-day tranche pass because the follow-up TER-1068 fixes did not change saved-view persistence behavior.

## Checks
- order-default-live-first: Direct order entry for Emerald Valley Collective LLC opened with sellable-only default (Available now) and zero visible rows because all seeded inventory was Incoming.
- catalogue-filters-entry-point: The catalogue `Filters` button now opens the advanced filtering panel and exposes the tranche controls instead of leaving them as unreachable component state.
- catalogue-include-unavailable: The catalogue stayed empty by default, then revealed 8 Incoming rows after explicitly broadening scope with Include unavailable and labeled them with plain-language `Incoming` / `Still incoming and not ready to sell` copy.
- order-imported-cut: Converting the broadened catalogue into a sales order carried the portable cut into the real order surface, showed Including unavailable, and rendered Incoming batches with the plain-language note Still incoming and not ready to sell.
- order-cut-summary-stable: After importing the broadened cut, toggling the live filter back to `Available now` preserved the imported-cut badge `Include unavailable`, proving the banner summary stays anchored to the original cut instead of drifting with the current filter state.
- order-saved-view-reload: A client-specific saved view (TER-1068 Incoming Proof 2026-04-07-23-23) restored the unavailable-inclusive filter state after returning the surface to sellable-only defaults.

## Artifacts
- catalogue-filters-open.png
- order-default-available-now.png
- catalogue-include-unavailable.png
- order-imported-cut.png
- order-cut-summary-stable.png
- order-saved-view-loaded.png
