---
name: verification-protocol
description: "Full verification protocol for TERP — 12-criteria Definition of Done, V4 QA gate, autonomy modes, verification commands, and completion output template"
---

# TERP Verification Protocol

## Definition of Done (12 Criteria)

A task is NOT complete until ALL pass:

1. `pnpm check` — No TypeScript errors
2. `pnpm lint` — No linting errors
3. `pnpm test` — All tests pass
4. `pnpm build` — Build succeeds
5. `pnpm roadmap:validate` — Roadmap valid (if modified)
6. E2E tests pass (if applicable)
7. Deployment verified (if pushed to main)
8. No new errors in production logs
9. **Live Browser Verification** — Feature works on staging
10. Requirements traceability — every acceptance criterion mapped to evidence
11. Blast radius reviewed — impacted modules verified with targeted regressions
12. Evidence packet posted to Linear/roadmap task before marking complete

## V4 QA Gate (Required for STRICT/RED Mode)

### 1. Requirements Coverage

- Map each acceptance criterion to a test, screenshot, or command output
- Mark any unmet criterion explicitly as blocked (never silently defer)

### 2. Functional Validation

- Run unit/integration/build checks
- Validate user-visible behavior in browser for changed flows

### 3. Blast Radius Assessment

- List touched domains (UI, business logic, auth, DB, integrations)
- Execute targeted regression checks for each impacted domain

### 4. Adversarial Review

- Try likely failure paths and edge cases
- Confirm rollback path and monitoring checks are documented

## Autonomy Mode Details

### SAFE Mode (Green)

- Documentation, simple bug fixes, style changes, test additions
- Standard verification, may batch commits

### STRICT Mode (Yellow)

- New features, database queries (read-only), UI components, business logic
- Full verification at each step, explicit testing

### RED Mode — Critical Paths

- Database migrations, financial calculations, inventory valuation
- Auth/authorization, order fulfillment, accounting, multi-table transactions
- **Requires**: Evan's explicit approval, rollback plan, staging verification, document every step

| Domain               | Why RED                             |
| -------------------- | ----------------------------------- |
| Inventory/Valuation  | Financial accuracy, audit trail     |
| Accounting/Financial | Money movement, compliance          |
| Auth/RBAC            | Security, access control            |
| Orders/Fulfillment   | Customer impact, inventory          |
| Database Migrations  | Data integrity, rollback difficulty |

## Verification Commands

```bash
# Core (run before EVERY commit)
pnpm check          # TypeScript
pnpm lint           # ESLint
pnpm test           # Unit tests
pnpm build          # Build verification

# Roadmap
pnpm roadmap:validate
pnpm validate:sessions

# Schema (requires DATABASE_URL, runs in CI)
pnpm test:schema

# Deployment
./scripts/watch-deploy.sh
./scripts/check-deployment-status.sh $(git rev-parse HEAD | cut -c1-7)
curl https://terp-staging-yicld.ondigitalocean.app/health
./scripts/terp-logs.sh run 100 | grep -i "error"
```

## Completion Output Template

```
VERIFICATION RESULTS
====================
TypeScript: PASS | FAIL (X errors)
Lint:       PASS | FAIL (X warnings)
Tests:      PASS | FAIL (X/Y passing)
Build:      PASS | FAIL
Deployment: VERIFIED | PENDING | FAILED
V4 QA Gate: PASS | FAIL
Blast Radius: [areas reviewed]
Linear Evidence: [ticket + links/artifacts]

[If any failures, list specific errors and fixes applied]
```

## Schema Verification Notes

- `pnpm test:schema` runs integration tests against a real database
- Tests auto-validate ALL tables/columns from `drizzle/schema.ts`
- Uses `COLUMNS_PENDING_MIGRATION` array for known pending migrations
- Runs automatically on PRs via `.github/workflows/schema-validation.yml`
- See `tests/integration/schema-verification.test.ts` for implementation

## Full Testing Reference

See `docs/TESTING.md` for the complete testing guide including:

- All test layers (unit, integration, E2E, oracle, chain, stress)
- Every `pnpm` test command with descriptions
- Test file locations and organization
- Quality gates and QA pipeline
