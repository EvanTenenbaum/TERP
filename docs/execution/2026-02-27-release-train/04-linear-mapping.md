# Phase 4 - Linear Mapping

Date: 2026-03-01
Team: Terpcorp (`d88bb32f-ea0a-4809-aac1-fde6ec81bad3`)
Project: TERP - Golden Flows Beta (`79882db1-0cac-448b-b73c-5dd9307c85c8`)

Release-train blocker tickets were revalidated against live staging and refreshed with 2026-03-01 evidence. TER-462 is now closed after final gate revalidation.

## Issue Map (Latest Sync)

| Ticket  | Title                                                       | Final State | Evidence Comment ID                    | Updated At (UTC)     |
| ------- | ----------------------------------------------------------- | ----------- | -------------------------------------- | -------------------- |
| TER-459 | RT-07 Recoverable delete UX for inventory + purchase orders | Done        | `da407a30-0721-477e-8b92-4d0b0eb5b183` | 2026-03-01T21:51:12Z |
| TER-463 | BUG: Inventory blocked-delete path generic error            | Done        | `d5deee66-748e-4173-80e2-c1bd32f746e7` | 2026-03-01T21:51:13Z |
| TER-464 | CI: Schema validation fails on main (MySQL reachability)    | Done        | `e74fbc10-c849-4a6f-8d89-5da32d989a88` | 2026-03-01T21:51:13Z |
| TER-462 | RT-10 Integration regression + release gate package         | Done        | `cad6c47f-9792-4c01-80bb-939a8177d981` | 2026-03-01T21:51:17Z |

## Evidence Snapshot Used For Sync

- Canonical earlier RC from PR #446: `03133aff36626f97a0190352bdf122538537f80a`
- Current `origin/main`: `cbe4979e57cb4f2a53dcf6b817c8ff059ad24435` (PR #450)
- Main checks for current head:
  - Main Branch CI/CD success: https://github.com/EvanTenenbaum/TERP/actions/runs/22532690617
  - TypeScript Baseline Check success: https://github.com/EvanTenenbaum/TERP/actions/runs/22532690608
  - Sync Main → Staging success: https://github.com/EvanTenenbaum/TERP/actions/runs/22532690605
- Latest dedicated Schema Validation run on `main`: success https://github.com/EvanTenenbaum/TERP/actions/runs/22508410090
- Live staging build and health:
  - `curl https://terp-staging-yicld.ondigitalocean.app/version.json` => `commit: build-mm71i63x`
  - `curl https://terp-staging-yicld.ondigitalocean.app/health` x3 => `status: healthy`, `checks.disk.usedPercent: 62`
- Live proof pack (2026-03-01):
  - `docs/execution/2026-02-27-release-train/ui-evidence/2026-03-01-live-revalidation/lane-b-evidence.json`
  - `docs/execution/2026-02-27-release-train/ui-evidence/2026-03-01-live-revalidation/route-final-urls-2026-03-01.txt`
  - `docs/execution/2026-02-27-release-train/ui-evidence/2026-03-01-live-revalidation/route-audit-2026-03-01.json`
  - `docs/execution/2026-02-27-release-train/ui-evidence/2026-03-01-live-revalidation/excluded-smoke-rerun-report.json`

## Linear URLs

- TER-459: https://linear.app/terpcorp/issue/TER-459/rt-07-recoverable-delete-ux-for-inventory-purchase-orders-undorestore
- TER-462: https://linear.app/terpcorp/issue/TER-462/rt-10-integration-regression-adversarial-sweep-release-gate-package
- TER-463: https://linear.app/terpcorp/issue/TER-463/bug-inventory-blocked-delete-path-shows-generic-unexpected-error
- TER-464: https://linear.app/terpcorp/issue/TER-464/ci-schema-validation-workflow-fails-on-main-due-missing-mysql
