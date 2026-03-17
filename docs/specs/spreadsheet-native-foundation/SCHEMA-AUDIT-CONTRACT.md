# Schema Audit Contract

This contract defines the approved way to verify schema truth for the spreadsheet-native foundation phase.

## Approved Command

```bash
pnpm audit:schema:contract
```

## What It Runs

1. `pnpm test:schema`
2. `pnpm audit:schema-drift:strict`
3. `pnpm audit:schema-fingerprint:strict`

`test:schema` runs with DB env stripped so it remains a structural verification step, not a live staging-introspection step. The DB-backed audits then run under the approved audit env chain below.

## Env Rule

The audit command must resolve `DATABASE_URL` in this order:

1. existing environment
2. `TERP_AUDIT_ENV_FILE` if provided
3. repo `.env`
4. repo `.env.local`
5. repo `.env.production`
6. `~/.codex/.env` on Evan's local machine
7. derived staging URL from `DO_STAGING_DB_*` variables in the canonical secret file
8. `TEST_DATABASE_URL` if already present
9. deterministic local fallback: `mysql://test:test@localhost:3306/terp_test`

This contract is implemented by:

- [`scripts/_lib/loadAuditEnv.ts`](../../../scripts/_lib/loadAuditEnv.ts)
- [`scripts/audit/run-schema-contract.ts`](../../../scripts/audit/run-schema-contract.ts)

## Foundation Rule

- `test:schema` proves structural verification against the repo schema contract
- `schema-drift` proves database introspection compatibility
- `schema-fingerprint` proves required-check completeness

No single command is sufficient by itself.

## Failure Handling

- missing runtime connectivity is a hard failure once the fallback chain is exhausted
- drift or fingerprint failure blocks pilot implementation
- a passing `test:schema` with failing DB-backed audits means the schema layer is not yet trustworthy enough for fork implementation
- derived staging URL is the preferred no-shell-secrets path on Evan's machine
- local fallback use is acceptable only when no staging DB components are available, and the audit output must record that fallback source explicitly
