# User-Facing Notes
- The canonical scope for this run is all 48 tickets created on April 9, 2026.
- The roadmap and manifest now explicitly cover every ticket from `TER-1092` through `TER-1139`.
- The notifications cluster is already implemented locally.
- The current local implementation spans Foundation, Shell/Header, Workspace Population, Sales & Orders, Inventory, Procurement, Relationships, Accounting, Notifications, and Cross-Cutting Audits, but the train is not closeout-complete until the refreshed operations adversarial review clears.
- `TER-1116` is satisfied by tab separation: direct intake stays on the Inventory `intake` tab while PO-linked intake stays on the `receiving` tab, and that separation now has explicit verification coverage.
- `TER-1128` is now verified as true filtered behavior: the accounting dashboard summary cards switch to the active route-filter working set and return to global totals once filters clear.
- The foundation cleanup now includes a canonical `statusBadge` helper and a compatibility `operational-empty-state` entrypoint to line up the codebase with the original ticket expectations.
- The foundation cleanup now has an explicit audit artifact at `docs/execution/open-ticket-atomic-train-2026-04-09/foundation-audit.md`, covering which remaining default badges are true operational states, which are intentionally non-operational chips, and which `toISOString()` hits are only form/export normalization.
- The procurement visibility audit is now backed by branch-local runtime proof on a seeded queue row, so `Receiving` and `Est. Delivery` are not being counted as passes in an empty-state false positive.
- The operations browser suite now covers ten browser proofs across Chromium, WebKit, and Firefox, including default-sort validation, live role-badge validation, and a real accounting loading-state proof instead of relying on a partial Chromium-only pass.
- The recorded shared unit-test bundle for the operations packet now includes `client/src/pages/ClientProfilePage.test.tsx`, so the page-level TER-1122 badge proof is part of the actual passing verification set instead of just being cited in the packet.
- The operations proof bundle now also includes `client/src/components/spreadsheet-native/PilotSurfaceBoundary.test.tsx`, because the TER-1127 loading-state proof only became real after the suspense fallback bug was fixed.
- The profile-page relationship badge wiring now has a dedicated page-level test in `client/src/pages/ClientProfilePage.test.tsx`.
- A colocated reviewer context file, `docs/execution/open-ticket-atomic-train-2026-04-09/qa-review-context.md`, now exposes the latest runtime audit timestamp, checksum, and procurement-seed facts directly to adversarial review.
- The latest evidence refresh also adds stable accounting invariant fields (`filteredArWithinGlobal`, `filteredApWithinGlobal`) with non-zero filtered overdue counts, a clearer pre-merge staging-deferral note, and an explicit reminder that procurement seed reuse only accepts still-confirmed rows before proving overdue styling.
- The runtime helper itself is now stronger than the earlier packet version, but fresh JSON regeneration is currently blocked by local `429` rate limiting after exhaustive browser runs, so the cross-browser suite is the primary current operations proof artifact.

# Runbook Updates
- When the user gives a canonical same-day issue set, use that as scope even if some tickets are already closed or were filtered out of an earlier query.
- Preserve completed local slices in the roadmap, but reorder the next tranche around shared dependencies.
- For verification-only tickets, close them with explicit UI evidence plus tests or runtime proof instead of leaving the decision implicit in code.
- For branch-local browser proof from a TERP worktree, avoid the shared `pnpm dev` watcher when it thrashes on sibling `node_modules` temp files; prefer a stable no-watch local server for the verification run.
- When procurement-column visibility is part of the acceptance bar, seed at least one local PO row before the runtime pass so a hidden empty-state table cannot count as success.
- When a review packet depends on generated runtime JSON, colocate a tiny `qa-review-context.md` file with the packet so the reviewer can inspect timestamps, checksums, and key excerpts without needing to infer them from line references alone.
- For local scroll-restoration and browser-proof claims, run at least one non-Chromium pass when feasible; Firefox and WebKit both caught up to the same ten-test April 9 operations suite here.

# Follow-Ups
- Regenerate the Claude ticket scorecard from the corrected branch-local evidence set.
- If any ticket still scores below `95`, execute only the atomic upgrade actions needed to raise it to the threshold before PR creation.
- After the scorecard gate is green, proceed to PR / merge / deploy / live browser QA.
