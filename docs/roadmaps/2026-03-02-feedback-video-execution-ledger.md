# 2026-03-02 Feedback Video Execution Ledger

## Mission Metadata

- Date context: 2026-03-02 (America/Los_Angeles)
- Execution worktree: `/Users/evan/spec-erp-docker/TERP/TERP-feedback-train`
- Canonical repo: `/Users/evan/spec-erp-docker/TERP/TERP`
- Long-lived branch: `codex/feedback-release-train-20260302`
- Start commit: `c6cf2702`
- Locked decisions:
  - Default mode: `non-shipping sales mode`
  - Left controls: `number of units to add input` + `+` quick add button
  - Post-save policy: `return_to_origin`

## Resume Contract

- Always resume from the latest checkpoint row marked `IN_PROGRESS` or first `TODO`.
- Never re-plan from scratch while this file exists.
- Every ticket transition requires updates to:
  - Ticket status row
  - Checkpoint row
  - Verification and QA notes section

## Checkpoint Status

| Checkpoint | Scope            | Status   | Branch SHA(s)      | Main merge SHA | Staging QA | Blockers / Next Action                                             |
| ---------- | ---------------- | -------- | ------------------ | -------------- | ---------- | ------------------------------------------------------------------ |
| 1          | TER-479..TER-481 | COMPLETE | 9bdac222, 93865748 | 09270483       | PASS       | Rebase delivery branch on latest `origin/main`; start checkpoint 2 |
| 2          | TER-482..TER-487 | TODO     | -                  | -              | -          | Wait for checkpoint 1 PASS                                         |
| 3          | TER-488..TER-491 | TODO     | -                  | -              | -          | Wait for checkpoint 2 PASS                                         |
| 4          | TER-492..TER-506 | TODO     | -                  | -              | -          | Wait for checkpoint 3 PASS                                         |
| 5          | TER-507..TER-516 | TODO     | -                  | -              | -          | Wait for checkpoint 4 PASS                                         |
| 6          | TER-517..TER-522 | TODO     | -                  | -              | -          | Wait for checkpoint 5 PASS                                         |

## Ticket Status Matrix

### Checkpoint 1 (Wave 1)

| Ticket  | Atomic | Risk   | Status | Commit   | Verification                                                                          | QA Gate         | Staging Evidence                                                                                                | Blocker |
| ------- | ------ | ------ | ------ | -------- | ------------------------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------- | ------- |
| TER-479 | CF-001 | STRICT | DONE   | 9bdac222 | check/lint/test/build PASS + targeted `LineItemTable` + manual scan-path review       | QG-1..QG-4 PASS | `.playwright-cli/page-2026-03-02T16-15-35-create-order.png`                                                     | -       |
| TER-480 | CF-002 | STRICT | DONE   | 9bdac222 | check/lint/test/build PASS + targeted `ConsolidatedWorkspaces`                        | QG-1..QG-4 PASS | `.playwright-cli/page-2026-03-02T16-15-55-orders.png`, `.playwright-cli/page-2026-03-02T16-16-01-pick-pack.png` | -       |
| TER-481 | CF-003 | STRICT | DONE   | 9bdac222 | check/lint/test/build PASS + targeted `LineItemTable` + composer hierarchy validation | QG-1..QG-4 PASS | `.playwright-cli/page-2026-03-02T16-15-35-create-order.png`                                                     | -       |

### Checkpoint 2 (Wave 2)

| Ticket  | Atomic | Risk   | Status | Commit | Verification | QA Gate | Staging Evidence | Blocker |
| ------- | ------ | ------ | ------ | ------ | ------------ | ------- | ---------------- | ------- |
| TER-482 | CF-004 | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-483 | CF-005 | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-484 | CF-006 | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-485 | CF-007 | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-486 | CF-008 | RED    | TODO   | -      | -            | -       | -                | -       |
| TER-487 | CF-010 | STRICT | TODO   | -      | -            | -       | -                | -       |

### Checkpoint 3 (Wave 3)

| Ticket  | Atomic | Risk   | Status | Commit | Verification | QA Gate | Staging Evidence | Blocker |
| ------- | ------ | ------ | ------ | ------ | ------------ | ------- | ---------------- | ------- |
| TER-488 | CF-009 | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-489 | CF-011 | RED    | TODO   | -      | -            | -       | -                | -       |
| TER-490 | CF-012 | RED    | TODO   | -      | -            | -       | -                | -       |
| TER-491 | CF-013 | STRICT | TODO   | -      | -            | -       | -                | -       |

### Checkpoint 4 (Wave 4)

| Ticket  | Atomic       | Risk   | Status | Commit | Verification | QA Gate | Staging Evidence | Blocker |
| ------- | ------------ | ------ | ------ | ------ | ------------ | ------- | ---------------- | ------- |
| TER-492 | XP-A-001-ORD | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-493 | XP-A-001-PPK | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-494 | XP-A-002-ORD | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-495 | XP-A-003-ORD | RED    | TODO   | -      | -            | -       | -                | -       |
| TER-496 | XP-A-003-PPK | RED    | TODO   | -      | -            | -       | -                | -       |
| TER-497 | XP-A-004-ORD | RED    | TODO   | -      | -            | -       | -                | -       |
| TER-498 | XP-A-004-PPK | RED    | TODO   | -      | -            | -       | -                | -       |
| TER-499 | XP-A-005-ORD | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-500 | XP-A-005-PPK | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-501 | XP-A-006-ORD | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-502 | XP-A-006-PPK | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-503 | XP-A-007-ORD | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-504 | XP-A-007-PPK | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-505 | XP-A-008-ORD | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-506 | XP-A-008-PPK | STRICT | TODO   | -      | -            | -       | -                | -       |

### Checkpoint 5 (Wave 5)

| Ticket  | Atomic       | Risk   | Status | Commit | Verification | QA Gate | Staging Evidence | Blocker |
| ------- | ------------ | ------ | ------ | ------ | ------------ | ------- | ---------------- | ------- |
| TER-507 | XP-A-001-ACC | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-508 | XP-A-001-CLI | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-509 | XP-A-002-ACC | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-510 | XP-A-002-CLI | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-511 | XP-A-005-ACC | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-512 | XP-A-005-CLI | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-513 | XP-A-007-ACC | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-514 | XP-A-007-CLI | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-515 | XP-A-008-ACC | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-516 | XP-A-008-CLI | STRICT | TODO   | -      | -            | -       | -                | -       |

### Checkpoint 6 (Wave 6)

| Ticket  | Atomic       | Risk   | Status | Commit | Verification | QA Gate | Staging Evidence | Blocker |
| ------- | ------------ | ------ | ------ | ------ | ------------ | ------- | ---------------- | ------- |
| TER-517 | XP-A-001-INV | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-518 | XP-A-004-INV | RED    | TODO   | -      | -            | -       | -                | -       |
| TER-519 | XP-A-005-INV | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-520 | XP-A-006-INV | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-521 | XP-A-007-INV | STRICT | TODO   | -      | -            | -       | -                | -       |
| TER-522 | XP-A-008-INV | STRICT | TODO   | -      | -            | -       | -                | -       |

## Verification / QA Notes Log

### 2026-03-02

- Ledger initialized.
- Awaiting checkpoint 1 implementation work.
- Baseline verification preflight:
  - `pnpm check`: PASS
  - `pnpm lint`: PASS
  - `pnpm build`: PASS
  - `pnpm test`: FAIL (single flaky timeout in `client/src/components/samples/SampleForm.test.tsx`)
- Preflight stabilization applied: increased timeout for `SampleForm > submits form values` test to reduce false negative full-suite failures.
- Checkpoint 1 implementation completed (local QA pass):
  - `TER-479 / CF-001`: density compaction and hierarchy tightening in order composer and line-item surfaces.
  - `TER-480 / CF-002`: persistent filter/sort/search + stable quick-action placement in Orders and Pick & Pack work surfaces.
  - `TER-481 / CF-003`: composer hierarchy cleanup with customer context grouping and preview/totals ordering.
- Full verification rerun after implementation:
  - `pnpm check`: PASS
  - `pnpm lint`: PASS
  - `pnpm test`: PASS (`215` files, `5613` tests, `19` skipped)
  - `pnpm build`: PASS
- Targeted tests rerun:
  - `pnpm test client/src/components/orders/LineItemTable.test.tsx`: PASS
  - `pnpm test client/src/pages/ConsolidatedWorkspaces.test.tsx`: PASS
- Checkpoint 1 promotion:
  - PR merged: `https://github.com/EvanTenenbaum/TERP/pull/451`
  - Main merge SHA: `09270483d0a99834328deeed65bea991eae8865a`
  - Delivery branch sync commit: `93865748`
- Checkpoint 1 staging QA:
  - Deployment active in `terp-staging` app id `62f2d9f8-3fb5-4576-9f7b-8dd91cf552a6`.
  - Staging health: `https://terp-staging-yicld.ondigitalocean.app/health` (healthy).
  - Version endpoint: `buildTime=2026-03-03T00:04:31.295Z`, `commit=build-mm9uijzn`.
  - UI proof captures:
    - Orders toolbar contract and `New Sale`: `.playwright-cli/page-2026-03-02T16-15-55-orders.png`
    - Pick & Pack toolbar contract: `.playwright-cli/page-2026-03-02T16-16-01-pick-pack.png`
    - Create Order hierarchy + compact layout: `.playwright-cli/page-2026-03-02T16-15-35-create-order.png`
