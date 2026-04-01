# Objective

Close the remaining non-classic SO/PO inline-control follow-up work by fixing the SO client route hydration bug, validating quote-mode applicability on the shared sheet-native order surface, strengthening regression coverage, and shipping the result through merge, deploy, and live QA.

# Scope

- In scope:
- Sheet-native sales order route hydration and inline-control behavior
- Sheet-native quote-mode behavior when routed through the shared sales-order surface
- Sheet-native purchase-order inline add behavior and regression coverage
- Targeted local QA, PR/merge flow, staging deploy verification, and live post-merge QA
- Durable execution notes and evidence capture for this tranche
- Out of scope:
- Classic composer/classic UI surfaces
- Unrelated sales registry redesign work
- Broad accounting or infrastructure changes unless directly blocking this tranche

# Assumptions

- Quotes continue to use the shared `SalesOrderSurface` instead of a separate sheet-native composer.
- The repo-seeded QA credentials remain valid for local and staging verification.
- The open follow-up bug `TERP-cg8` remains the main product gap from the prior rollout.

# Decision Hotspots

- Whether the SO client hydration bug lives in route seeding, client data hydration, or page-level timing/state management.
- Whether quote mode needs code changes or only explicit QA/test coverage on the shared surface.
- Whether any additional non-classic sales surfaces need the inline-control pattern beyond SO, PO, and quote-mode on the shared SO surface.

# Constraints

- Work in a clean worktree off current `main`.
- Do not touch clearly demarcated classic UI/UX flows.
- Keep verification targeted until ship points, then run the ship bundle and live staging QA.

# Success Checks

- `/sales?tab=create-order&clientId=<id>` shows the hydrated customer label reliably on the sheet-native surface.
- Shared quote mode on the same surface is verified and covered by tests where applicable.
- SO and PO inline pre-add controls remain covered by targeted tests/E2E.
- Changes land via PR, merge to `main`, deploy to staging, and pass live post-merge QA with evidence.
