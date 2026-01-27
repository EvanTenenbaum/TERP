# Golden Flows Beta Roadmap - Executive Summary

**Date:** 2026-01-27
**For:** Evan Tenenbaum
**Author:** Claude Code Agent

---

## TL;DR

The Jan 26 QA audit revealed that **5 of 8 Golden Flows are completely blocked** by a cascading SQL error in the inventory system. This roadmap provides a **30-day, 6-phase plan** to restore all flows to beta-ready state.

**Key Numbers:**
- **30 tasks** across 6 phases
- **30 estimated days** (includes 20% buffer from QA review)
- **8 Golden Flows** to restore
- **1 root cause** (inventory SQL error) blocks most issues

---

## Current State: RED

| Flow | Status | What's Broken |
|------|--------|---------------|
| GF-001: Direct Intake | **BLOCKED** | Form fields don't render |
| GF-002: Procure-to-Pay | **BLOCKED** | Product dropdown empty |
| GF-003: Order-to-Cash | **BLOCKED** | Inventory SQL error |
| GF-004: Invoice & Payment | Partial | PDF generation timeout |
| GF-005: Pick & Pack | Untested | Blocked by orders |
| GF-006: Client Ledger | Partial | Data inconsistencies |
| GF-007: Inventory Mgmt | **BLOCKED** | Shows 0 batches |
| GF-008: Sample Request | **BLOCKED** | Product selector broken |

**Root Cause:** A SQL query failure prevents inventory from loading, which cascades to break order creation, PO creation, and sample requests.

---

## The Plan: 6 Phases

### Phase 0: Foundation (Days 1-3)
**Fix the root cause blockers**
- Investigate and fix the inventory SQL error
- Fix Sales Rep RBAC (can't view clients)
- Fix dashboard/inventory data mismatch
- Fix order state machine test failures

### Phase 1: Flow Restoration (Days 4-7)
**Make all 8 flows accessible**
- Fix Direct Intake form rendering
- Fix PO product dropdown
- Fix Sample Request product selector
- Fix Invoice PDF generation
- Fix AR/AP data display
- Fix Client creation wizard

### Phase 2: Flow Completion (Days 8-12)
**Complete missing functionality**
- Wire payment recording (currently a stub!)
- Test Pick & Pack flow end-to-end
- Verify GL entries are created properly
- Test complete Order-to-Cash flow

### Phase 3: RBAC Verification (Days 13-17)
**Verify correct roles can use correct flows**
- Sales Rep → GF-003, GF-008
- Inventory Manager → GF-001, GF-007
- Accounting Manager → GF-004, GF-006
- Fulfillment → GF-005, GF-002 receiving
- Auditor → read-only access only

### Phase 4: E2E Automation (Days 18-24)
**Automate testing for all flows**
- Create E2E tests for each Golden Flow
- Integrate into CI pipeline
- Document test coverage

### Phase 5: Beta Hardening (Days 25-30)
**Polish and prepare for beta**
- Fix test infrastructure issues
- Write documentation
- Security review
- Fix security bugs (QA password exposure, fallback user ID)
- Create beta testing materials

---

## Key Risks

1. **Unknown Scope of Inventory Bug** - The SQL error could be simple (query typo) or complex (schema migration issue). Phase 0 starts with investigation before committing to a fix.

2. **Test Infrastructure** - Some tests are known to fail due to infrastructure issues. These are documented and won't block progress.

3. **RBAC Surprises** - Phase 3 might reveal new permission issues requiring additional fixes.

---

## What You Need to Know

### This Plan Prioritizes:
1. **Functionality first** - Get flows working before polishing
2. **Data integrity** - GL entries, audit trails must work
3. **Role correctness** - Right people can do right things

### Security Deferred (But Addressed):
- Security issues moved to Phase 5 (not ignored)
- BUG-103: QA password hint exposed on login
- BUG-107: Fallback user ID pattern in code

### What Success Looks Like:
- All 8 Golden Flows executable end-to-end
- Each flow works with its designated role
- E2E tests verify flows automatically
- Beta testers can use the system

---

## Documents Created

1. **`GOLDEN_FLOWS_BETA_ROADMAP.md`** - Full detailed roadmap (30 tasks with checklists)
2. **`GOLDEN_FLOWS_BETA_ROADMAP_QA_REVIEW.md`** - RED mode QA review findings
3. **`GOLDEN_FLOWS_BETA_SUMMARY.md`** - This summary

---

## Recommended Next Steps

1. **Review the full roadmap** if you want task-level detail
2. **Assign Phase 0 to an agent** to begin investigation
3. **Confirm 30-day timeline** works for beta goals

---

## Questions?

The full roadmap contains:
- Detailed task checklists for agents
- Verification commands for each task
- Rollback plans for each phase
- Dependency graph showing task ordering

All documents are in `docs/roadmaps/`.
