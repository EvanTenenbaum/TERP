# Seed Script Usage Guide

## Canonical Command

Use this as the single full-system seeding entrypoint:

```bash
pnpm seed:system
```

This command orchestrates:

- Comprehensive transactional seed data
- Module defaults (feature flags, scheduling, storage, gamification, leaderboard)
- RBAC reconciliation
- QA/test account seeding
- QA fixture seeding
- Gap-filling and augmentation
- Final relational integrity verification

## Common Modes

```bash
# Preview only (no writes)
pnpm seed:system --dry-run

# Faster, smaller dataset
pnpm seed:system --light --force

# Full realistic dataset (recommended for end-to-end testing)
pnpm seed:system --force

# Preserve existing rows and only top-up
pnpm seed:system --no-clear --force
```

## Required Environment

```bash
DATABASE_URL="mysql://user:password@host:3306/db?ssl-mode=REQUIRED"
```

## When To Use It

✅ Use for:

- Fresh QA/UAT environments
- End-to-end workflow testing
- Regression testing after schema/logic changes

❌ Avoid for:

- Every deployment
- Production environments with real user data
- CI jobs that should stay lightweight

## Verification

After seeding, run:

```bash
pnpm seed:verify:integrity
```

The command exits non-zero if critical relational integrity checks fail.
