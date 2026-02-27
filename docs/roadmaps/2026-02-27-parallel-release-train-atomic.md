# 2026-02-27 Parallel Release Train (Atomic)

Branch baseline: `origin/codex/consolidated-ux-media-20260226`
Integration target for this sprint: `codex/release-train-20260227`
Linked PR context: #446 (`codex/consolidated-ux-media-20260226` -> `main`)

## Release Train Topology

- Supervisor lane: sequencing, dependency arbitration, evidence QA gate, merge policy.
- Specialist lanes: independent atomic tasks in isolated branches/worktrees.
- Merge rule: no task merges without V4 QA PASS evidence packet.

## Atomic Task Index

| Task ID | Title                                                                                    | Gap(s)                 | Risk Mode | Owner Role                | Effort | Depends On   | Parallel Group |
| ------- | ---------------------------------------------------------------------------------------- | ---------------------- | --------- | ------------------------- | ------ | ------------ | -------------- |
| RT-00   | Supervisor control + evidence scaffold                                                   | all                    | strict    | supervisor                | 2h     | none         | G0             |
| RT-01   | Exclude soft-deleted POs from list/getAll/getById + add restore API                      | GAP-11, GAP-06         | red       | specialist (backend)      | 6h     | RT-00        | G1             |
| RT-02   | Inventory enhanced API full-dataset filter contract (stock/cogs/date/location)           | GAP-01, GAP-02, GAP-03 | red       | specialist (backend)      | 10h    | RT-00        | G1             |
| RT-03   | Inventory UI filter wiring to server contract + correct totals/pagination                | GAP-01, GAP-02, GAP-03 | strict    | specialist (frontend)     | 8h     | RT-02        | G2             |
| RT-04   | Inventory sort contract correction (grade, unitCogs) end-to-end                          | GAP-10                 | strict    | specialist (fullstack)    | 4h     | RT-02        | G2             |
| RT-05   | Workspace-shell route unification for sales/procurement/receiving flows                  | GAP-04, GAP-09         | strict    | specialist (frontend)     | 8h     | RT-00        | G1             |
| RT-06   | Legacy route deprecation/redirect strategy and nav cleanup (`classic`, `spreadsheet`)    | GAP-05                 | strict    | specialist (frontend)     | 4h     | RT-05        | G2             |
| RT-07   | Recoverable delete UX for inventory and purchase orders (undo/restore actions)           | GAP-06                 | strict    | specialist (fullstack)    | 8h     | RT-01, RT-03 | G3             |
| RT-08   | Export UX hardening (truncation consent, progress model, large-job strategy)             | GAP-07                 | strict    | specialist (frontend)     | 6h     | RT-03        | G3             |
| RT-09   | QA debt reduction in flagged suites (`describe.skip`, `it.todo`, DB-skip path hardening) | GAP-08                 | strict    | specialist (qa/fullstack) | 10h    | RT-00        | G1             |
| RT-10   | Integration regression + adversarial sweep + release gate package                        | all                    | red       | supervisor                | 8h     | RT-01..RT-09 | G4             |

## Detailed Task Cards

## RT-00 - Supervisor control + evidence scaffold

- Scope:
  - Create execution artifacts under `docs/execution/2026-02-27-release-train/`.
  - Define branch/worktree map and merge discipline.
  - Enforce evidence-only status updates.
- Verification:
  - Artifact folder + baseline docs present.
  - Dependency graph and branch map documented.
- Rollback:
  - N/A (process-only).

## RT-01 - Exclude soft-deleted POs + restore API

- Scope:
  - Add `deletedAt IS NULL` guards for `purchaseOrders.list`, `purchaseOrders.getAll`, `purchaseOrders.getById` by default.
  - Add explicit restore mutation for PO soft-deletes.
  - Add tests for hidden deleted rows + restore behavior.
- Verification plan:
  - Unit/integration router tests for list/getById exclusion and restore.
  - Manual flow: delete PO -> disappears from default list -> restore -> reappears.
- Blast radius checks:
  - Procurement pages, analytics consumers of PO endpoints, any legacy clients using `getAll`.
- Rollback:
  - Revert router changes; restore previous delete behavior; re-run procurement smoke tests.

## RT-02 - Inventory enhanced API full-dataset filter contract

- Scope:
  - Extend enhanced inventory input contract with server-side filters for stockLevel, cogs range, date range, semantic location.
  - Ensure pagination/total/hasMore reflect full filtered dataset.
  - Align low-stock threshold behavior via explicit threshold parameter contract.
- Verification plan:
  - API-level tests for each filter dimension and combinations across multi-page datasets.
  - Negative/adversarial tests for empty filters and malformed date/location inputs.
- Blast radius checks:
  - Inventory dashboard summaries, list performance, existing filter consumers.
- Rollback:
  - Feature-flag or revert to prior input contract; preserve compatibility shim for old params.

## RT-03 - Inventory UI filter wiring to server contract

- Scope:
  - Remove page-local-only filtering for stock/cogs/date/location.
  - Pass filter contract to backend query.
  - Fix total count/page indicators to backend truth.
- Verification plan:
  - Component tests for query args and count rendering.
  - Manual browser test: filtered result consistency across pages.
- Blast radius checks:
  - Inventory table, chips, filter controls, exports scoped from visible dataset.
- Rollback:
  - Toggle fallback to client-only filter path behind temporary guard.

## RT-04 - Inventory sort contract correction

- Scope:
  - Correct sort mapping for grade and unit COGS.
  - Ensure backend supports matching sort keys and deterministic order.
- Verification plan:
  - Unit tests for sort key mapping and sorted output.
  - Manual check on representative dataset.
- Blast radius checks:
  - Inventory list sort UX, API sort enums.
- Rollback:
  - Revert mapping and enum additions; keep previous sort behavior.

## RT-05 - Workspace-shell route unification

- Scope:
  - Consolidate core routes (`/pick-pack`, `/orders/create`, `/orders/new`, `/receiving`, `/direct-intake`, `/inventory/:id`) under workspace-shell-compatible navigation patterns.
  - Ensure command strips link to canonical workspace tabs.
- Verification plan:
  - Route-level tests/smoke checks.
  - Playwright navigation checks from nav + deep links.
- Blast radius checks:
  - Sales/procurement/inventory workspace tab state, deep links, telemetry hooks.
- Rollback:
  - Revert route mapping and workspace tab additions while preserving backward-compatible redirects.

## RT-06 - Legacy route deprecation/redirect cleanup

- Scope:
  - Handle `/purchase-orders/classic` and `/spreadsheet-view` via canonical redirects or scoped feature-gated compatibility.
  - Update nav + E2E assumptions.
- Verification plan:
  - Route redirect assertions.
  - Regression spec updates + pass.
- Blast radius checks:
  - Navigation config, e2e route sweeps, user bookmarks.
- Rollback:
  - Reinstate legacy route handlers if regression detected.

## RT-07 - Recoverable delete UX

- Scope:
  - Implement undo/restore affordance for inventory batch delete and PO delete.
  - Connect UX affordances to soft-delete/restore APIs.
- Verification plan:
  - Component tests for delete+undo interactions.
  - Manual browser proof with screenshots for both flows.
- Blast radius checks:
  - Mutation side effects, inspector state, audit logging.
- Rollback:
  - Disable undo UI and keep explicit confirm-only path while retaining backend safety.

## RT-08 - Export UX hardening

- Scope:
  - Add explicit truncation acknowledgement and summary before export when row cap exceeded.
  - Improve progress/cancel UX; document large-export strategy.
  - Add tests for truncation + progress callbacks.
- Verification plan:
  - Unit tests for limit policy decisions.
  - Manual export of large dataset with progress evidence.
- Blast radius checks:
  - Inventory export actions, potential reuse of `useExport` in other surfaces.
- Rollback:
  - Revert UX wrapper while preserving existing export hook behavior.

## RT-09 - QA debt reduction

- Scope:
  - Replace/repair `describe.skip` in `EventFormDialog.test.tsx` or move critical behavior to viable integration/E2E coverage.
  - Resolve `it.todo` placeholders in sequence tests with runnable coverage.
  - Harden DB-integrity tests to fail with actionable setup signal (or run in gated DB environment) instead of silent pass-by-skip.
- Verification plan:
  - Targeted test files pass in CI-compatible mode.
  - Document explicit rationale for any remaining deferred tests.
- Blast radius checks:
  - Test runtime, CI stability, flake risk.
- Rollback:
  - Revert brittle tests and quarantine with owner/expiry while keeping net-positive coverage.

## RT-10 - Integration regression + release gate package

- Scope:
  - Run final V4 gate across merged integration branch.
  - Produce release verdict and residual risk register.
- Verification plan:
  - `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build`.
  - Targeted Playwright/manual checks for changed flows.
  - Adversarial checks and blast-radius regressions.
- Rollback:
  - Revert latest integration merges by task order; pause release with `BLOCKED` verdict.

## Parallelization Strategy

- Group G1 (parallel after RT-00): RT-01, RT-02, RT-05, RT-09.
- Group G2 (parallel after prerequisites): RT-03, RT-04, RT-06.
- Group G3 (parallel after prerequisites): RT-07, RT-08.
- Group G4 final: RT-10 only.

## Global V4 Evidence Requirements (per task)

Each task must attach:

- Commit SHA(s)
- PR link(s)
- `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build` results (relevant scope + final full-run)
- Functional proof (screenshots/video/CLI logs)
- Blast-radius summary
- Adversarial review notes
- PASS/BLOCKED verdict
- Rollback reference
