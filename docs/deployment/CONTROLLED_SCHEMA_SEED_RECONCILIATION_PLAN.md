# Controlled Schema + Seed Reconciliation Plan

Last updated: 2026-02-10  
Linear ticket: TER-172

## Why this exists

We saw a production startup fingerprint mismatch (`6/7`) while running in `AUTO_MIGRATE_MODE=detect-only`.

Root cause found:

- The fingerprint expected `products.product_name`.
- The canonical schema uses `products.nameCanonical`.

This means the detector was out of sync with the real schema contract.

## Safety goals

- No destructive database writes during diagnosis.
- No broad startup seeding in production.
- Every change is reversible and has evidence.
- Keep deploy gates light: detect drift early, do targeted fixes only.

## Phase 1: Detector alignment (no DB writes)

1. Update fingerprint canary definitions to match canonical schema columns/tables.
2. Emit check-by-check pass/fail details instead of only a count.
3. Validate in CI and local tests.

Commands:

```bash
pnpm vitest run server/__tests__/autoMigrateFingerprint.test.ts
pnpm audit:schema-fingerprint
```

Exit criteria:

- Fingerprint output includes named checks.
- No false mismatch from `products.product_name`.

## Phase 2: Drift evidence capture (read-only)

1. Run schema fingerprint audit against target environment.
2. Store report artifact before deployment and after deployment.
3. If mismatch remains, identify exact missing checks.

Commands:

```bash
pnpm audit:schema-fingerprint
pnpm audit:schema-fingerprint:strict
```

Artifact:

- `docs/audits/schema-fingerprint-report.json`

Exit criteria:

- A reproducible report exists for each deploy window.

## Phase 3: Controlled schema reconciliation

1. For each remaining missing check, open a dedicated migration ticket.
2. Use idempotent SQL migrations only (`IF NOT EXISTS`, guarded ALTER patterns).
3. Apply in staging first, then production.
4. Re-run fingerprint report immediately after migration.

Rules:

- One migration scope per ticket.
- No mixed schema + seed changes in one migration.
- Rollback notes required before production apply.

Exit criteria:

- Fingerprint reaches complete (`7/7`) after targeted migration(s).

## Phase 4: Controlled seed reconciliation (RBAC/defaults)

1. Keep `SKIP_SEEDING=true` during schema repair window.
2. Use targeted seeding scripts only (RBAC/default subsets), not full blanket seed.
3. Validate role/permission invariants after each seed run.

Recommended commands:

```bash
pnpm seed:rbac:reconcile:dry-run
pnpm seed:rbac:reconcile
pnpm seed:new:dry-run
```

Validation checks:

- Required role count present.
- Required permission count present.
- Critical permissions exist (including dashboard permissions).

Exit criteria:

- Seed state is complete for required modules without broad data churn.

## Phase 5: Lightweight deployment gate

Pre-deploy:

- Run `pnpm audit:schema-fingerprint:strict`.

Deploy:

- Keep `AUTO_MIGRATE_MODE=detect-only` until schema drift is fully reconciled.

Post-deploy:

- Capture startup log lines showing fingerprint result + missing checks (if any).
- Attach report + log snippet to Linear ticket.

## Rollback strategy

If drift worsens or startup errors increase:

1. Keep `AUTO_MIGRATE_MODE=detect-only` (do not apply auto DDL).
2. Stop seed steps.
3. Revert only the latest migration commit.
4. Re-run fingerprint audit and compare with pre-change artifact.

## Ownership checklist

- Engineering: implement and validate detector + migration scripts.
- QA/Release: verify fingerprint report artifacts are attached.
- PM/Ops: approve production window for schema and seed reconciliation.
