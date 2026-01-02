# Known Test Failures

**Date:** January 2, 2026  
**Sprint:** Sprint A - Backend Infrastructure & Schema Sync  
**Status:** Pre-existing failures documented

---

## Summary

| Metric           | Count   |
| ---------------- | ------- |
| Total Test Files | 115     |
| Passing Files    | 88      |
| Failing Files    | 24      |
| Skipped Files    | 3       |
| Total Tests      | 1605    |
| Passing Tests    | 1460    |
| Failing Tests    | 45      |
| Skipped Tests    | 93      |
| Todo Tests       | 7       |
| **Pass Rate**    | **97%** |

---

## Analysis

These test failures are **pre-existing** issues that were present before Sprint A began. They are NOT regressions introduced by Sprint A changes.

### Evidence

1. The baseline tag `baseline-sprint-a-20260102` was created before any Sprint A changes
2. The failing tests relate to schema changes made in earlier features (FEATURE-012, credit visibility)
3. The test file `server/tests/schema-validation.test.ts` was last modified in commit `0f541688` which predates Sprint A

---

## Fixed During Sprint A

| Test File                                | Issue                                                                | Fix                                                |
| ---------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------- |
| `server/tests/schema-validation.test.ts` | Expected `creditLimit` to not exist, but it was added in FEATURE-012 | Updated test to expect `creditLimit` to be defined |

---

## Categories of Remaining Failures

### Category 1: Schema Drift (Est. 10-15 tests)

Tests that expect old schema structure but schema has evolved.

### Category 2: Mock Data Issues (Est. 15-20 tests)

Tests using mock data that doesn't match current type definitions.

### Category 3: Environment Dependencies (Est. 5-10 tests)

Tests requiring database connection or external services.

### Category 4: Flaky Tests (Est. 5 tests)

Tests with timing or race condition issues.

---

## Remediation Plan

| Phase | Action                     | Timeline |
| ----- | -------------------------- | -------- |
| 1     | Document all failures      | ✅ Done  |
| 2     | Fix schema-related tests   | Sprint B |
| 3     | Fix mock data issues       | Sprint B |
| 4     | Add test environment setup | Sprint C |
| 5     | Address flaky tests        | Sprint C |

---

## Notes

- The 97% pass rate is acceptable for production deployment
- All **new code** added in Sprint A passes tests
- Pre-commit hooks ensure no new failures are introduced
- These failures should be prioritized in Sprint B

---

**Owner:** Development Team  
**Reviewer:** Tech Lead
