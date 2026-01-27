# RED Mode QA Review: Golden Flows Beta Roadmap

**Review Date:** 2026-01-27
**Reviewer:** Claude Code Agent (Self-Review)
**Mode:** RED (Adversarial Quality Assurance)
**Document Reviewed:** `GOLDEN_FLOWS_BETA_ROADMAP.md`

---

## Review Methodology

This review applies adversarial analysis to identify:
1. Gaps and missing items
2. Logical flaws and sequencing issues
3. Unrealistic estimates
4. Missing dependencies
5. Protocol compliance violations
6. Security/reliability risks
7. Missing verification steps
8. Unclear or untestable acceptance criteria

---

## Critical Findings (Must Fix)

### CF-001: Missing Root Cause Analysis for Inventory SQL Error

**Issue:** GF-PHASE0-001 (BUG-110) is a 16h estimate but the root cause is unknown. The task checklist says "identify query shape and failure point" but this is investigative work, not fix work.

**Risk:** Could take much longer than estimated if root cause is complex (schema mismatch, migration issue, etc.)

**Recommendation:**
- Split into two tasks: GF-PHASE0-001a (Investigation, 4h) and GF-PHASE0-001b (Fix, 8-16h)
- Add fallback plan if investigation reveals deeper issues
- Consider adding database schema validation step first

---

### CF-002: Missing Payment Recording Backend Dependency

**Issue:** GF-PHASE2-001 assumes backend `trpc.payments.recordPayment` mutation works. While golden_flows.md states it exists, the Jan 26 QA did not verify this.

**Risk:** If backend has issues, frontend fix is blocked.

**Recommendation:**
- Add verification step to confirm backend mutation works before frontend task
- Add to GF-PHASE2-001 checklist: "Verify backend mutation works via direct API call"

---

### CF-003: Test Infrastructure Deferred Too Long

**Issue:** TEST-INFRA issues (07, 08, 09) are in Phase 5, but they affect CI reliability throughout all phases. If tests are flaky, verification at each phase gate is unreliable.

**Risk:** False confidence in phase gate verifications.

**Recommendation:**
- Move test infrastructure fixes to Phase 1 or create a parallel track
- At minimum, document known failing tests to exclude from gate verification

---

### CF-004: No Rollback Plans Defined

**Issue:** RED mode requires rollback plans for critical path changes, but no rollback procedures are defined for any phase.

**Risk:** If a fix breaks something else, no documented recovery path.

**Recommendation:**
- Add rollback section to each phase
- For Phase 0 specifically, add: "If inventory fix causes regression, revert to commit [hash]"
- Document database backup requirements before each phase

---

### CF-005: Missing Data Seeding Verification

**Issue:** Many flows depend on test data existing. The plan doesn't verify seeded data state before starting.

**Risk:** Tasks may fail because required test data doesn't exist.

**Recommendation:**
- Add Phase 0 pre-requisite: Verify and run seeders
- Add checklist item: `pnpm seed:all-defaults` executed
- Add verification for minimum data counts (clients, products, batches)

---

## High Priority Findings (Should Fix)

### HF-001: Phase 3 RBAC Verification May Reveal New Bugs

**Issue:** Phase 3 is purely verification, but if RBAC issues are found, there's no time allocated for fixes.

**Risk:** Phase 3 could expand significantly if permission issues exist.

**Recommendation:**
- Add 8h buffer in Phase 3 for RBAC fixes
- Or move RBAC verification earlier and interleave with Phase 1/2

---

### HF-002: No Parallel Track for Security Items

**Issue:** BUG-103 (QA password hint exposure) and BUG-107 (fallback user ID) are in MASTER_ROADMAP but not in this plan. These are security issues.

**Risk:** Security debt accumulates while focusing on functionality.

**Recommendation:**
- Add security tasks to Phase 1 or Phase 2
- At minimum, add BUG-103 (2h) and BUG-107 (1h) to Phase 5

---

### HF-003: E2E Test Creation Estimates May Be Low

**Issue:** Phase 4 allocates 8h for GF-001 E2E, 16h for GF-003, and 24h for remaining 6 flows (4h each average). Complex flows like GF-002 (PO receiving) may need more.

**Risk:** Phase 4 extends beyond planned duration.

**Recommendation:**
- Revise estimates: 8h per flow minimum
- Total E2E estimate: 64h (8 flows × 8h) vs current 56h
- Or prioritize top 4 flows for Phase 4, defer others to post-beta

---

### HF-004: Missing Error Handling Verification

**Issue:** Tasks verify happy paths but don't explicitly verify error handling. Example: What happens if payment recording fails?

**Risk:** Users encounter poor UX on errors.

**Recommendation:**
- Add error scenario testing to Phase 2 verification
- Add checklist items like: "Verify meaningful error on network failure"

---

### HF-005: No Performance Benchmarks

**Issue:** GF-PHASE1-004 says "PDF completes in <10 seconds" but no other performance requirements defined.

**Risk:** Flows may be slow but functionally correct.

**Recommendation:**
- Add performance criteria: Page loads < 3s, mutations < 2s
- Add to Phase 5: Basic performance audit

---

## Medium Priority Findings (Nice to Have)

### MF-001: Task ID Format Inconsistency

**Issue:** Tasks use `GF-PHASE0-001` format which is new and not in MASTER_ROADMAP convention (`BUG-XXX`, `FEAT-XXX`, etc.)

**Risk:** Confusion about whether to add to MASTER_ROADMAP.

**Recommendation:**
- Clarify: These are execution plan tasks that reference but don't replace MASTER_ROADMAP tasks
- Add note: "Source task BUG-110 in MASTER_ROADMAP should be updated on completion"

---

### MF-002: No Agent Assignment Guidance

**Issue:** GOLDEN_FLOWS_PROD_READY_PLAN_2026 suggested agent pool structure (Agent A: Backend, Agent B: RBAC, etc.) but this isn't reflected in the new roadmap.

**Risk:** Agents may conflict on files if not coordinated.

**Recommendation:**
- Add "Module Ownership" section listing which agent should work on which phase/task
- Add conflict resolution guidance

---

### MF-003: Missing Dependency Graph Visualization

**Issue:** Dependencies are listed per-task but overall flow is hard to visualize.

**Risk:** Agents may attempt tasks before dependencies complete.

**Recommendation:**
- Add dependency graph (ASCII or link to diagram)
- Clearly mark which tasks can be parallelized

---

### MF-004: No Metrics/Success Criteria for Beta

**Issue:** "Beta ready" is defined by checklist, but no quantitative success criteria.

**Recommendation:**
- Add: "95% of E2E tests pass"
- Add: "0 P0 bugs, <3 P1 bugs open"
- Add: "All 8 flows verified by 2 different QA runs"

---

## Protocol Compliance Findings

### PC-001: Missing Prompt Files

**Issue:** CLAUDE.md and MASTER_ROADMAP use `Prompt: docs/prompts/TASK-ID.md` but new tasks don't have prompt files.

**Recommendation:**
- Either create prompt files for complex tasks (Phase 0 at minimum)
- Or note that detailed checklists serve as prompts

---

### PC-002: Estimate Format Partially Compliant

**Issue:** Estimates use hours (4h, 8h, 16h) which is correct, but some could be converted to days for clarity (16h = 2d).

**Recommendation:**
- Keep hours for tasks, add day totals per phase

---

### PC-003: Status Values Correct

**Status:** PASS - All tasks use `ready` status as required.

---

## Recommendations Summary

### Must Implement Before Using Plan

1. **Split GF-PHASE0-001** into investigation and fix phases
2. **Add rollback plans** to each phase
3. **Add data seeding verification** to Phase 0 pre-requisites
4. **Add backend verification** to GF-PHASE2-001
5. **Move or acknowledge** test infrastructure issues

### Should Implement

1. Add RBAC fix buffer to Phase 3
2. Add security tasks (BUG-103, BUG-107)
3. Revise E2E estimates upward
4. Add error scenario verification

### Nice to Have

1. Add dependency visualization
2. Add agent assignment guidance
3. Add quantitative beta success criteria

---

## Revised Estimate After QA

| Phase | Original | Revised | Change |
|-------|----------|---------|--------|
| 0 | 2 days | 3 days | +1 day (investigation split, seeding) |
| 1 | 4 days | 4 days | No change |
| 2 | 4 days | 5 days | +1 day (backend verification, error cases) |
| 3 | 4 days | 5 days | +1 day (RBAC fix buffer) |
| 4 | 6 days | 7 days | +1 day (revised estimates) |
| 5 | 5 days | 6 days | +1 day (security, test infra) |
| **Total** | **25 days** | **30 days** | **+5 days (20% buffer)** |

---

## Review Conclusion

The roadmap is **structurally sound** and covers all Golden Flows. The primary risks are:

1. **Unknown scope** of the root inventory SQL error (could be simple or complex)
2. **Test infrastructure reliability** during verification gates
3. **RBAC issues** potentially expanding Phase 3 scope

With the recommended improvements, the plan is ready for execution.

---

**Review Status:** COMPLETE
**Recommendation:** IMPLEMENT CRITICAL FINDINGS, THEN PROCEED
