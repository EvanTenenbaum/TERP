# Phase 4 - Linear Mapping

Date: 2026-02-28
Team: Terpcorp (`d88bb32f-ea0a-4809-aac1-fde6ec81bad3`)
Project: TERP - Golden Flows Beta (`79882db1-0cac-448b-b73c-5dd9307c85c8`)

Release-train blocker tickets were updated with post-merge evidence. A later live-health recheck re-opened TER-462.

## Issue Map (Latest Sync)

| Ticket | Title | Final State | Evidence Comment ID | Updated At (UTC) |
| --- | --- | --- | --- | --- |
| TER-459 | RT-07 Recoverable delete UX for inventory + purchase orders | Done | `cfce4cc8-c0ca-4205-9591-706eb9e9fa62` | 2026-02-28T00:15:53Z |
| TER-463 | BUG: Inventory blocked-delete path generic error | Done | `e46bde5b-0f29-4a27-af75-83d84fad8639` | 2026-02-28T00:15:53Z |
| TER-464 | CI: Schema validation fails on main (MySQL reachability) | Done | `d2cb18da-8a12-4dde-8b4d-77028dfcbcf9` | 2026-02-28T00:15:55Z |
| TER-462 | RT-10 Integration regression + release gate package | In Progress | `7622a247-32eb-40ec-bd3f-e8e8cc6a3e06` | 2026-02-28T05:44:49Z |

## Evidence Snapshot Used For Sync

- PR merged: https://github.com/EvanTenenbaum/TERP/pull/447
- Merge commit on `main`: `14b4cf325b633295fab46c23846a72e50f6b583c`
- Main checks (same head SHA):
  - Schema Validation success: https://github.com/EvanTenenbaum/TERP/actions/runs/22508410090
  - Main Branch CI/CD success: https://github.com/EvanTenenbaum/TERP/actions/runs/22508410102
  - TypeScript Baseline Check success: https://github.com/EvanTenenbaum/TERP/actions/runs/22508410087
  - Sync Main → Staging success: https://github.com/EvanTenenbaum/TERP/actions/runs/22508410119
- Live staging proof pack:
  - `docs/execution/2026-02-27-release-train/ui-evidence/post-merge/route-final-urls-post-merge.txt`
  - `docs/execution/2026-02-27-release-train/ui-evidence/post-merge/inventory-api-proof-post-merge.json`
  - `docs/execution/2026-02-27-release-train/ui-evidence/post-merge/inventory-ui-proof-post-merge.json`
- Live blocker proof (re-opened TER-462):
  - `curl https://terp-staging-yicld.ondigitalocean.app/health` => `status: degraded`, `checks.disk.usedPercent: 81`

## Linear URLs

- TER-459: https://linear.app/terpcorp/issue/TER-459/rt-07-recoverable-delete-ux-for-inventory-purchase-orders-undorestore
- TER-462: https://linear.app/terpcorp/issue/TER-462/rt-10-integration-regression-adversarial-sweep-release-gate-package
- TER-463: https://linear.app/terpcorp/issue/TER-463/bug-inventory-blocked-delete-path-shows-generic-unexpected-error
- TER-464: https://linear.app/terpcorp/issue/TER-464/ci-schema-validation-workflow-fails-on-main-due-missing-mysql
