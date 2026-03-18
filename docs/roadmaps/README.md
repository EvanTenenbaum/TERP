# TERP Roadmaps - Master Index

**Purpose:** Central tracking of all implementation roadmaps for TERP development.

**Last Updated:** January 12, 2026

---

## Active Roadmap

**Current Focus:** [Prioritized Strategic Roadmap](./PRIORITIZED_STRATEGIC_ROADMAP_2026-01-12.md)

**Status:** 🟡 ACTIVE
**Estimated Effort:** 741h total (265h with 4 parallel agents)
**Started:** 2026-01-12
**Current Phase:** Sprint 0 - Foundation (Bugs, API Registration, RBAC)

> **This roadmap supersedes all others for execution purposes.** It consolidates:
>
> - MASTER_ROADMAP.md (v4.9)
> - TERP_STRATEGIC_ROADMAP_2026.md (Customer Meeting items)
> - UNIFIED_STRATEGIC_ROADMAP_2026-01-12.md (Gap Analysis)
> - QA Bug Fix Plans

---

## Focused Execution Backup

**Orders spreadsheet runtime rollout backup:** [2026-03-17-orders-spreadsheet-runtime-rollout.md](./2026-03-17-orders-spreadsheet-runtime-rollout.md)

This file is a repo backup of the active Linear-only execution map for the `Sales -> Orders` spreadsheet runtime rollout. Use it when the milestone sequence, hard gates, or anti-duplication rules need to be checked outside Linear.

---

## All Roadmaps

### 0. Prioritized Strategic Roadmap (ACTIVE)

**Status:** 🟡 ACTIVE
**Priority:** Critical
**Files:**

- [Implementation Roadmap](./PRIORITIZED_STRATEGIC_ROADMAP_2026-01-12.md) - 6-sprint execution plan
- [Customer Meeting Roadmap](./TERP_STRATEGIC_ROADMAP_2026.md) - 75 MEET items source
- [Unified Roadmap](./UNIFIED_STRATEGIC_ROADMAP_2026-01-12.md) - Gap analysis integration
- [Master Roadmap](./MASTER_ROADMAP.md) - Historical task tracking

**Summary:** Frontend-first execution plan with parallel agent support. Consolidates all 75 customer meeting items, bug fixes, API registration, and feature specs into a prioritized sprint structure with QA gates.

**Key Features:**

- 6 Sprints: Foundation → Critical UI → Wave 1-4
- 4 parallel execution tracks per sprint
- Mandatory QA gates between sprints
- Complete dependency matrix
- 100% MEET item traceability (75/75)

**New Specs Created:**

- [FEAT-007-CASH-AUDIT-SPEC.md](../specs/FEAT-007-CASH-AUDIT-SPEC.md) - MEET-001 to MEET-004
- [FEAT-008-INTAKE-VERIFICATION-SPEC.md](../specs/FEAT-008-INTAKE-VERIFICATION-SPEC.md) - MEET-064 to MEET-066
- [FEAT-009-CLIENT-LEDGER-SPEC.md](../specs/FEAT-009-CLIENT-LEDGER-SPEC.md) - MEET-010

---

### 1. Default Values Implementation

**Status:** 🟡 Ready to Start  
**Priority:** High  
**Files:**

- [Implementation Roadmap](./defaults-implementation.md) - 10-phase implementation plan
- [Specifications](./defaults-specifications.md) - Complete user specifications
- [Analysis](./defaults-analysis.md) - Detailed analysis of all areas needing defaults

**Summary:** Implement default values for all dropdowns, customizations, and system settings to ensure smooth first-time user experience.

**Key Deliverables:**

- Master data seeding (locations, categories, grades, expense categories)
- Simplified accounting (cash/crypto payments, simple bank ledger)
- Advanced pricing rules with complex conditional logic
- Per-client pricing profiles (hidden from client view)
- COGS adjustments by Flower subcategory
- Smart low inventory alerts
- Comprehensive dashboard with 6 default KPIs

---

### 2. Realistic Mock Data Generation

**Status:** 🔵 Planned  
**Priority:** High  
**Files:**

- [Implementation Roadmap](./realistic-mock-data-generation.md) - Complete implementation plan

**Summary:**  
Build a comprehensive mock data generation system that creates hyper-realistic business data for TERP with specific business parameters: 1 year of data, $2M/month revenue, 60 clients with whale distribution, consignment tracking, returns/refunds, and realistic AR aging.

**Key Deliverables:**

- Realistic data generation system for all 74 tables
- CLI commands for easy instance management
- Business parameter configuration ($24M annual revenue)
- Client distribution (10 whales = 70% of revenue)
- Consignment tracking (50% sales, 90% intake)
- Returns (0.5%) and refunds (5% of orders get 5% refund)
- AR aging (15% overdue, 50% of overdue is 120+ days)

**Business Parameters:**

- 1 year of transaction history (2024)
- $2M average monthly revenue
- 90% flower sales (indoor at $1800/lb)
- 60 clients (10 whales, 50 regular)
- Long-tail distribution (whales = 70% of purchases)
- No email addresses or physical addresses for clients
- Realistic consignment, returns, and AR aging

---

### 3. QA Bug Fixes - January 2026

**Status:** 🟠 Ready to Start
**Priority:** High
**Files:**

- [Implementation Roadmap](./qa-bug-fixes-january-2026.md) - 5-phase fix plan
- [Execution Plan](./qa-bug-fixes-execution-plan.md) - Detailed implementation steps
- [QA Test Analysis Report](../audits/QA-TEST-ANALYSIS-REPORT-2026-01-11.md) - Source analysis

**Summary:**
Address all bugs and issues identified in the January 2026 QA testing cycle (274 test cases). Includes 16 FAIL cases, 12 TypeScript errors, and navigation improvements for 42 BLOCKED cases.

**Key Deliverables:**

- Fix Calendar database layer (9 FAIL cases)
- Add /batches route (7 FAIL cases)
- Resolve 12 TypeScript compilation errors
- Navigation improvements for blocked features
- Test data seeding infrastructure

---

### 4. [Future Roadmap Name]

**Status:** 🔵 Planned
**Priority:** TBD
**Files:** TBD

---

## Roadmap Status Legend

- 🟢 **Complete** - All phases finished, tested, and deployed
- 🟡 **In Progress** - Currently being worked on
- 🟠 **Ready to Start** - Specifications complete, ready for implementation
- 🔵 **Planned** - Identified but not yet specified
- ⏸️ **Paused** - Started but temporarily on hold
- ⚪ **On Hold** - Paused for dependencies or other reasons
- 🔴 **Blocked** - Cannot proceed due to blockers
- ❌ **Cancelled** - No longer needed or superseded

---

## Priority Levels

- **High** - Critical for core functionality or blocking other work
- **Medium** - Important but not blocking
- **Low** - Nice to have, can be deferred

---

## How to Use This System

### For Development Agents

**Before Starting Work:**

1. Read this README to see the active roadmap
2. Open the active roadmap file
3. Check `../notes/user-feedback.md` for latest feedback (if exists)
4. Review `../HANDOFF_CONTEXT.md` for what the last agent did (if exists)
5. Review `../DEVELOPMENT_PROTOCOLS.md` for development standards

**During Work:**

1. Update the roadmap file as you complete phases
2. Check off completed tasks using `- [x]` syntax
3. Update status and progress notes
4. Commit changes regularly with descriptive messages

**Before Finishing:**

1. Update the roadmap with current status
2. Update `../HANDOFF_CONTEXT.md` with what you did and what's next (if exists)
3. Update `../CHANGELOG.md` with completed work
4. Commit and push all changes

---

### For Project Owner

**Adding New Roadmaps:**

1. Create a new markdown file in this directory
2. Add entry to this README with status and summary
3. Update "Active Roadmap" section if it's the new focus

**Providing Feedback:**

1. Add thoughts to `../notes/user-feedback.md`
2. Agents check this file at start of every session
3. Organize by date with clear headings

**Switching Active Roadmap:**

1. Update "Active Roadmap" section in this README
2. Inform the next agent which roadmap to work on

---

## Creating a New Roadmap

### Template Structure

```markdown
# [Roadmap Name]

**Status:** 🔵 Planned
**Priority:** [High/Medium/Low]
**Estimated Time:** [X days/weeks]
**Created:** [Date]

---

## Overview

[What you're building and why]

## Why This Matters

[Problem and solution]

## Phases

[Break work into logical phases with time estimates]

### Phase 1: [Name] (X hours)

**Tasks:**

1. Task 1
2. Task 2

**Deliverables:**

- Deliverable 1
- Deliverable 2

**Testing:**

- [ ] Test 1
- [ ] Test 2

---

## Dependencies

[What must be done first]

## Key Deliverables

[What will be completed]

## Testing Checklist

[How to verify it works]

## Success Criteria

[How to know it's done]
```

### Naming Convention

- Use lowercase with hyphens
- Be descriptive and specific
- Examples:
  - `realistic-mock-data-generation.md`
  - `defaults-implementation.md`
  - `client-portal.md`
  - `inventory-optimization.md`
  - `reporting-dashboard.md`
  - `mobile-app.md`

### After Creating a Roadmap

1. Save to `docs/roadmaps/[your-roadmap-name].md`
2. Update this README.md to add to the index
3. Set status (🔵 Planned by default)
4. Add priority (High/Medium/Low)
5. Include a brief summary
6. List key deliverables
7. Commit and push to GitHub

```bash
git add docs/roadmaps/
git commit -m "Add [roadmap name] roadmap"
git push origin main
```

---

## Roadmap Lifecycle

1. **Created** → Roadmap written and saved
2. **Planned** → Added to index, status set to 🔵
3. **Ready** → Dependencies met, status set to 🟠
4. **Activated** → Set as active roadmap, status set to 🟡
5. **In Progress** → Development agent working on it
6. **Complete** → All phases done, status set to 🟢
7. **Archived** → Moved to archive/ subdirectory (optional)

---

## Best Practices

### When Creating Roadmaps

- ✅ Be specific and detailed
- ✅ Break into logical phases
- ✅ Include time estimates
- ✅ Define clear success criteria
- ✅ List all dependencies
- ✅ Include testing checklists
- ✅ Provide examples and code snippets

### When Working on Roadmaps

- ✅ Read the entire roadmap first
- ✅ Follow phases in order
- ✅ Update status as you go
- ✅ Test after each phase
- ✅ Document any deviations
- ✅ Update project docs (CHANGELOG, PROJECT_CONTEXT)

### When Completing Roadmaps

- ✅ Verify all success criteria met
- ✅ Run full testing checklist
- ✅ Update documentation
- ✅ Mark status as 🟢 Complete
- ✅ Update this README
- ✅ Commit and push changes

---

## Related Documentation

- [Project Context](../PROJECT_CONTEXT.md) - Overall project state
- [Development Protocols](../DEVELOPMENT_PROTOCOLS.md) - Development standards and rules
- [Changelog](../CHANGELOG.md) - Completed work history
- [Manus Agent Context](../MANUS_AGENT_CONTEXT.md) - Quick reference for AI agents
- [Product Development Strategy](../PRODUCT_DEVELOPMENT_STRATEGY.md) - Future architecture strategy

---

## Questions?

- Check the roadmap itself for detailed guidance
- Review DEVELOPMENT_PROTOCOLS.md (The Bible)
- Check PROJECT_CONTEXT.md for system overview
- Review MANUS_AGENT_CONTEXT.md for quick reference

---

**Last Updated:** January 11, 2026
**Total Roadmaps:** 3
**Active Roadmaps:** 2 (Default Values Implementation, QA Bug Fixes)
**Completed Roadmaps:** 0

---

**Maintained by:** Development agents  
**Reviewed by:** Project owner
