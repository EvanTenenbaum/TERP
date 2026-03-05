# Phase 8 - Adversarial QA Re-Audit

Date: 2026-03-01
Target: `https://terp-staging-yicld.ondigitalocean.app`

## Scope

Post-merge adversarial re-audit focused on previously open release blockers:

- RT-07 recoverable delete safety behavior
- TER-463 blocked-delete messaging behavior
- TER-464 CI schema-validation gate behavior
- Route canonicalization correctness on legacy/deep-link entries
- Live staging health gate status

## Adversarial Checks and Outcomes

### 1) Destructive Flow Safety (RT-07)

- Setup: deterministic deletable candidate (`SKU-0115-0128-199`, `onHandQty=0`).
- Action: select row -> delete confirm -> undo restore.
- Result: PASS.
- Evidence:
  - `ui-evidence/2026-03-01-live-revalidation/lane-b-evidence.json`
  - `ui-evidence/2026-03-01-live-revalidation/delete-undo-selected-row.png`
  - `ui-evidence/2026-03-01-live-revalidation/delete-undo-after-delete.png`
  - `ui-evidence/2026-03-01-live-revalidation/delete-undo-clicked-undo.png`
  - `ui-evidence/2026-03-01-live-revalidation/delete-undo-restored.png`

### 2) Guard-Path Error Surface (TER-463)

- Setup: blocked candidate (`onHandQty > 0`).
- Expected failure mode: explicit business-rule guidance, no generic fallback.
- Result: PASS.
- Evidence:
  - `ui-evidence/2026-03-01-live-revalidation/blocked-delete-guidance-message.png`
  - `ui-evidence/2026-03-01-live-revalidation/lane-b-evidence.json` (`includesBusinessRule=true`, `unexpectedErrorMentions=0`)

### 3) Legacy/Deep-Link Route Canonicalization

- Routes exercised: `/spreadsheet-view`, `/purchase-orders/classic`, `/inventory/1`, `/orders/create`, `/intake`.
- Result: PASS.
- Evidence:
  - `ui-evidence/2026-03-01-live-revalidation/route-final-urls-2026-03-01.txt`
  - associated `route-*.png` captures

### 4) CI Gate Robustness (TER-464)

- Question: does merged head still fail schema validation on `main`?
- Result: PASS (green).
- Evidence:
  - Schema Validation success: `22508410090` (latest dedicated run on `main`)
  - Main CI/CD success: `22532690617` (current main head)

### 5) Live Environment Health Gate

- Question: is staging currently healthy enough for release pass?
- Result: PASS.
- Evidence:
  - `/health` x3 on 2026-03-01T21:50:37Z..21:50:42Z returned `status: healthy`, disk used 62%.

## Seeding Capability Review (for deterministic preconditions)

- Available seed surface is broad (`seed:new`, `seed:qa-data`, `seed:qa-accounts`, etc.).
- For shared staging, broad reseed was intentionally avoided.
- Minimal deterministic preconditioning was used for high-signal blocker verification.

## Re-Audit Verdict

`PASS` — adversarial checks and environment health gate are green with fresh live evidence.
