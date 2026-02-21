# Third-Party QA Audit Risk Register

**Auditor:** Claude Code Opus 4.6
**Date:** 2026-02-21
**Branch:** `codex/uiux-master-plan-v4-20260221`

---

## Active Risks

| ID    | Risk                                                 | Likelihood | Impact   | Severity | Mitigation                                                       | Status   |
| ----- | ---------------------------------------------------- | ---------- | -------- | -------- | ---------------------------------------------------------------- | -------- |
| R-001 | DB-dependent gates not independently reproduced      | Medium     | High     | P2       | Re-run in CI/staging with MySQL before merge                     | OPEN     |
| R-002 | Direct Intake stale-state race not runtime-verified  | Low        | High     | P2       | Code fix confirmed statically; run E2E gf-001 in CI              | OPEN     |
| R-003 | Monolithic commit hard to bisect if regression found | Low        | Medium   | P2       | Accept for this merge; enforce atomic commits going forward      | ACCEPTED |
| R-004 | ESLint strict config gap for tests-e2e               | Low        | Low      | P3       | Standard ESLint still runs; extend strict config in follow-up    | ACCEPTED |
| R-005 | Local paths in docs leak developer environment info  | Very Low   | Very Low | P3       | Replace with repo-relative paths in follow-up commit             | ACCEPTED |
| R-006 | Dead pre-commit-qa-check.sh creates false confidence | Low        | Low      | P3       | Wire into hook chain or delete; CI enforces same patterns        | ACCEPTED |
| R-007 | Large bundle chunks affect initial load performance  | Medium     | Medium   | P3       | Pre-existing issue; address with code splitting in future sprint | ACCEPTED |

## Mitigated Risks (from branch's own QA)

| ID     | Risk                                                          | Resolution                                 | Evidence                                                     |
| ------ | ------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------ |
| RM-001 | Adversarial North Star false negative (purchase-orders 21/24) | Seed warm-up amendment applied             | PAR-INFLIGHT-AMENDMENT-2026-02-21-P6, P6-adversarial-fix1-19 |
| RM-002 | Direct Intake stale selected-row state                        | Ref-synchronized state writes              | P6-direct-intake-remediation-37                              |
| RM-003 | DB connection lost during oracle setup                        | Retry/backoff in db-util.ts                | DEF-P5-002, P5/P6 green runs                                 |
| RM-004 | Seed script had compatibility DDL (schema violation)          | DDL removed, precondition assertions added | DEF-P0-007, SCHEMA_CONTRACT.md                               |
| RM-005 | Lint blockers in slice pages                                  | Hook dependency fixes applied              | DEF-P0-001, DEF-P0-002                                       |
| RM-006 | Failing sidebar and inventory tests                           | Test mocks updated                         | DEF-P0-003, DEF-P0-004                                       |

## Risk Summary

- **P0 risks:** 0
- **P1 risks:** 0
- **P2 risks:** 3 (2 OPEN requiring CI verification, 1 ACCEPTED)
- **P3 risks:** 4 (all ACCEPTED as non-blocking)

**Overall risk posture:** LOW-MEDIUM. No release blockers. Two open items require CI/staging verification before production deployment.
