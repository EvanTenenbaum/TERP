# TERP Roadmaps

This directory contains all development roadmaps for TERP. Each roadmap is a detailed implementation plan for a specific feature, module, or system improvement.

---

## How to Use This Directory

### For Development Agents

1. **Check ACTIVE.md** to see which roadmap is currently being worked on
2. **Read the active roadmap** completely before starting work
3. **Follow the phases** in order
4. **Update status** as you complete phases
5. **Mark complete** when all success criteria are met

### For Planning

1. **Create new roadmaps** following the template below
2. **Save to this directory** with descriptive name
3. **Update this README** to add to the index
4. **Set status and priority**
5. **Wait for activation** (don't implement immediately)

---

## Roadmap Status Legend

- 🔵 **Planned** - Roadmap created, not yet ready to start
- 🟠 **Ready to Start** - All dependencies met, can begin implementation
- 🟢 **In Progress** - Currently being worked on (see ACTIVE.md)
- ✅ **Complete** - All phases finished, success criteria met
- ⏸️ **Paused** - Started but temporarily on hold
- ❌ **Cancelled** - No longer needed or superseded

---

## Priority Levels

- **High** - Critical for core functionality or blocking other work
- **Medium** - Important but not blocking
- **Low** - Nice to have, can be deferred

---

## Roadmap Index

### 1. Realistic Mock Data Generation
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

## Active Roadmap

The currently active roadmap is tracked in `ACTIVE.md` (if it exists).

**To activate a roadmap:**
1. Create `docs/roadmaps/ACTIVE.md`
2. Link to the active roadmap
3. Update status to 🟢 In Progress
4. Development agents will work on this roadmap

**Example ACTIVE.md:**
```markdown
# Currently Active Roadmap

**Roadmap:** [Realistic Mock Data Generation](./realistic-mock-data-generation.md)
**Status:** 🟢 In Progress
**Started:** October 27, 2025
**Current Phase:** Phase 2 - Client Distribution Generator

---

## Progress

- [x] Phase 1: Foundation & Architecture
- [ ] Phase 2: Client Distribution Generator (IN PROGRESS)
- [ ] Phase 3: Inventory & Pricing Generator
- [ ] Phase 4: Order Generation
- [ ] Phase 5: Invoicing & AR
- [ ] Phase 6: Accounting & Ledger
- [ ] Phase 7: Supporting Data
- [ ] Phase 8: CLI & Instance Management
- [ ] Phase 9: Documentation & Testing
```

---

## Roadmap Lifecycle

1. **Created** → Roadmap written and saved
2. **Planned** → Added to index, status set to 🔵
3. **Ready** → Dependencies met, status set to 🟠
4. **Activated** → Added to ACTIVE.md, status set to 🟢
5. **In Progress** → Development agent working on it
6. **Complete** → All phases done, status set to ✅
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
- ✅ Mark status as ✅ Complete
- ✅ Remove from ACTIVE.md
- ✅ Commit and push changes

---

## Questions?

- Check the roadmap itself for detailed guidance
- Review DEVELOPMENT_PROTOCOLS.md (The Bible)
- Check PROJECT_CONTEXT.md for system overview
- Review MANUS_AGENT_CONTEXT.md for quick reference

---

**Last Updated:** October 27, 2025  
**Total Roadmaps:** 1  
**Active Roadmaps:** 0  
**Completed Roadmaps:** 0

