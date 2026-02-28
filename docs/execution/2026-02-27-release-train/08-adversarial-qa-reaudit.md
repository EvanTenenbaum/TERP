# Phase 8 - Adversarial QA Re-Audit

Date: 2026-02-28
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

- Setup: deterministic deletable candidate (`onHandQty=0`).
- Action: select row -> delete confirm -> undo restore.
- Result: PASS.
- Evidence:
  - `ui-evidence/post-merge/inventory-api-proof-post-merge.json`
  - `ui-evidence/post-merge/rt07-ui-01-selected-row.png`
  - `ui-evidence/post-merge/rt07-ui-02-delete-confirm.png`
  - `ui-evidence/post-merge/rt07-ui-03-after-delete.png`
  - `ui-evidence/post-merge/rt07-ui-04-after-undo.png`

### 2) Guard-Path Error Surface (TER-463)

- Setup: blocked candidate (`onHandQty > 0`).
- Expected failure mode: explicit business-rule guidance, no generic fallback.
- Result: PASS.
- Evidence:
  - `ui-evidence/post-merge/ter463-ui-02-blocked-delete-error.png`
  - `ui-evidence/post-merge/inventory-api-proof-post-merge.json` (`BAD_REQUEST` + explicit message)

### 3) Legacy/Deep-Link Route Canonicalization

- Routes exercised: `/spreadsheet-view`, `/purchase-orders/classic`, `/inventory/1`, `/orders/create`, `/receiving`.
- Result: PASS.
- Evidence:
  - `ui-evidence/post-merge/route-final-urls-post-merge.txt`
  - associated `route-*-post-merge.png` captures

### 4) CI Gate Robustness (TER-464)

- Question: does merged head still fail schema validation on `main`?
- Result: PASS (green).
- Evidence:
  - Schema Validation success: `22508410090`
  - Main CI/CD success: `22508410102`

### 5) Live Environment Health Gate

- Question: is staging currently healthy enough for release pass?
- Result: FAIL.
- Evidence:
  - `/health` returns `status: degraded` repeatedly with disk warning at 81%.

## Seeding Capability Review (for deterministic preconditions)

- Available seed surface is broad (`seed:new`, `seed:qa-data`, `seed:qa-accounts`, etc.).
- For shared staging, broad reseed was intentionally avoided.
- Minimal deterministic preconditioning was used for high-signal blocker verification.

## Re-Audit Verdict

`BLOCKED` — feature/CI blockers are closed, but staging health gate is not green.
