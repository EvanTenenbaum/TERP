# Testing Roadmap System - Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing and using the **TERP Testing Roadmap System**, a comprehensive framework for tracking test coverage alongside feature development.

---

## What Has Been Created

### 1. Core Roadmap Files

| File | Purpose | Location |
|------|---------|----------|
| **TESTING_ROADMAP.md** | Main testing task roadmap | `docs/roadmaps/TESTING_ROADMAP.md` |
| **TEST_COVERAGE_MAP.md** | Visual coverage tracking | `docs/roadmaps/TEST_COVERAGE_MAP.md` |
| **Module Test Plans** | Module-specific test tasks | `docs/roadmaps/testing/modules/*.md` |
| **Flow Test Plans** | User flow-specific test tasks | `docs/roadmaps/testing/flows/*.md` |
| **Architecture Test Plans** | Component-specific test tasks | `docs/roadmaps/testing/architecture/*.md` |

### 2. Updated Agent Protocols

| File | Changes | Location |
|------|---------|----------|
| **NEW_AGENT_PROMPT_v4.md** | Added testing protocols to all 4 phases | `docs/NEW_AGENT_PROMPT_v4.md` |
| **CLAUDE_WORKFLOW_v2.md** | Integrated testing roadmap into workflow | `docs/CLAUDE_WORKFLOW_v2.md` |
| **MASTER_ROADMAP.md** | Added `Test Status` field to features | `docs/roadmaps/MASTER_ROADMAP.md` |

### 3. Design Documentation

| File | Purpose | Location |
|------|---------|----------|
| **Testing Roadmap System Design** | Complete system architecture | `/home/ubuntu/testing_roadmap_system_design.md` |

---

## How the System Works

### The Three-Layer Model

The system operates on three interconnected layers:

**Layer 1: Feature Development** (MASTER_ROADMAP.md)
- Tracks features, fixes, and infrastructure changes
- Each feature has a `Test Status` field: ⚪ Untested, 🟡 Partially Tested, ✅ Fully Tested, 🔴 Tests Failing

**Layer 2: Test Development** (TESTING_ROADMAP.md)
- Tracks specific testing tasks (Unit, Integration, E2E, etc.)
- Each test task is linked to a feature via `Linked Feature` field

**Layer 3: Coverage Visualization** (TEST_COVERAGE_MAP.md)
- Provides real-time coverage statistics by module, flow, and component
- Auto-updates when tests are completed

---

## Agent Workflows

### Workflow 1: Feature Development

When an agent develops a new feature:

1. **Pick Feature Task** from `MASTER_ROADMAP.md`
2. **Write Code** following TDD (write tests first)
3. **Create Test Task** in `TESTING_ROADMAP.md`:
   - Link to feature ID
   - Set priority = feature priority
   - Set status = "Not Started"
4. **Update Feature** in `MASTER_ROADMAP.md`:
   - Add `Test Status: ⚪ Untested`
5. **Commit & Push** all changes together

### Workflow 2: Test Development

When an agent writes tests:

1. **Pick Test Task** from `TESTING_ROADMAP.md`
2. **Write Tests** according to test scope
3. **Run Tests** and verify coverage >80%
4. **Update Test Task** in `TESTING_ROADMAP.md`:
   - Set status = "✅ Tested"
5. **Update Linked Feature** in `MASTER_ROADMAP.md`:
   - Set `Test Status: ✅ Fully Tested`
6. **Update Coverage Map** in `TEST_COVERAGE_MAP.md`
7. **Commit & Push** all changes together

### Workflow 3: Pre-Merge Quality Gate

Before merging any feature to main:

1. **Check Test Status** in `MASTER_ROADMAP.md`
2. **Apply Gate Logic:**
   - `⚪ Untested` → WARN user
   - `🟡 Partially Tested` → WARN user
   - `🔴 Tests Failing` → BLOCK merge
   - `✅ Fully Tested` → PROCEED
3. **Merge or Fix** based on gate result

---

## Bulk Test Generation

### When You Provide Architecture Map

The system can automatically generate hundreds of test tasks from a single architecture document.

**Process:**

1. **Agent Reads** architecture/user flow document
2. **Agent Identifies:**
   - All modules (e.g., Inventory, Orders, Accounting)
   - All user flows (e.g., Create Order, Vendor Intake)
   - All components (e.g., Database, API, Auth)
3. **Agent Creates:**
   - One test task per module (Unit + Integration tests)
   - One test task per user flow (E2E test)
   - One test task per component (Unit + Integration tests)
4. **Agent Populates:**
   - `TESTING_ROADMAP.md` with all tasks
   - Module/flow/architecture-specific files
   - `TEST_COVERAGE_MAP.md` showing 0% coverage
5. **Agent Commits** all files

**Result:** A comprehensive testing backlog ready for execution.

---

## Test Task Format

Each test task follows this structure:

```markdown
### TEST-XXX: [Test Name]

**Type:** Unit / Integration / E2E / Performance / Security
**Priority:** P0 / P1 / P2 / P3
**Status:** Not Started / In Progress / Tested / Verified
**Linked Feature:** [Feature ID from MASTER_ROADMAP]
**Module:** [Module name]
**User Flow:** [Flow name, if applicable]
**Component:** [Architecture component, if applicable]

**Test Scope:**
[What this test covers]

**Test Cases:**
1. [Test case 1]
2. [Test case 2]

**Acceptance Criteria:**
- [ ] All test cases pass
- [ ] Code coverage > 80%
- [ ] No regressions detected

**Test File Location:** `tests/[path]/[filename].test.ts`
**Estimated Effort:** [2-4 hours / 4-8 hours / 8-16 hours]
**Created:** [Date]
**Last Updated:** [Date]
**Tested By:** [Agent Session ID]
```

---

## Test Status Indicators

| Symbol | Meaning | When to Use |
|--------|---------|-------------|
| ⚪ | Untested | Feature complete but no tests exist |
| 🟡 | Partially Tested | Some tests exist, coverage < 80% |
| ✅ | Fully Tested | All tests passing, coverage > 80% |
| 🔴 | Tests Failing | Tests exist but are currently failing |
| ⏳ | Tests In Progress | Tests being actively written |

---

## Coverage Targets

| Timeframe | Target | Measurement |
|-----------|--------|-------------|
| Month 1 | 50% overall coverage | TEST_COVERAGE_MAP.md |
| Month 2 | 70% overall coverage | TEST_COVERAGE_MAP.md |
| Month 3 | 80% overall coverage | TEST_COVERAGE_MAP.md |
| Ongoing | 80%+ for all new features | Pre-merge checks |

---

## Integration with Existing Workflow

### MASTER_ROADMAP.md Enhancement

All features now include a `Test Status` field:

```markdown
- [x] **Feature Name** (Session-ID) 🔴 HIGH PRIORITY
  - Status: Deployed
  - Test Status: ✅ Fully Tested (TEST-042, TEST-043)
  - Test Coverage: 85%
```

### ACTIVE_SESSIONS.md

No changes required. Sessions continue to track development work as before.

### QA_TASKS_BACKLOG.md

No changes required. This continues to track bugs found during QA, separate from test development tasks.

---

## Next Steps

### Immediate Actions

1. **Review the Design Document** (`testing_roadmap_system_design.md`) to understand the full system architecture
2. **Replace OLD Agent Prompts:**
   - Move `NEW_AGENT_PROMPT.md` to `docs/archive/`
   - Rename `NEW_AGENT_PROMPT_v4.md` to `NEW_AGENT_PROMPT.md`
3. **Replace OLD Workflow:**
   - Move `CLAUDE_WORKFLOW.md` to `docs/archive/`
   - Rename `CLAUDE_WORKFLOW_v2.md` to `CLAUDE_WORKFLOW.md`
4. **Update QUICK_REFERENCE.md** to mention the Testing Roadmap

### Bulk Generation Phase

1. **Provide Architecture Map** - Document all modules, flows, and components
2. **Agent Generates Test Tasks** - Hundreds of tasks created automatically
3. **Populate TESTING_ROADMAP.md** - All tasks added to roadmap
4. **Update TEST_COVERAGE_MAP.md** - Baseline coverage established

### Execution Phase

1. **Agents Pick Test Tasks** - From TESTING_ROADMAP.md
2. **Write Tests** - Following test task specifications
3. **Track Progress** - Via TEST_COVERAGE_MAP.md
4. **Reach 80% Coverage** - Over 3-month period

---

## Key Advantages

### Zero Manual Overhead
- Test tasks auto-created when features are added
- Coverage auto-updated when tests run
- Roadmaps auto-synced by agent protocols

### Complete Visibility
- Test status visible alongside features in MASTER_ROADMAP
- Visual coverage map shows gaps at a glance
- Module/flow/component breakdown for targeted testing

### Enforced Quality
- Pre-merge checks prevent untested code
- Agent protocols ensure tests are created
- Coverage targets drive continuous improvement

### Scalable Architecture
- Works for 10 features or 1000 features
- Module-specific files prevent roadmap bloat
- Hierarchical structure (module → flow → component)

---

## Troubleshooting

### "Agent didn't create a test task after feature development"

**Solution:** Ensure the agent is using `NEW_AGENT_PROMPT_v4.md`. The protocol is mandatory in Phase 3.

### "Coverage map not updating"

**Solution:** The coverage map is currently manually updated. Future enhancement: create a script that parses test output and auto-updates the map.

### "Too many test tasks in TESTING_ROADMAP.md"

**Solution:** Use the module/flow/architecture-specific files in `docs/roadmaps/testing/` for detailed task lists. Keep only high-priority tasks in the main TESTING_ROADMAP.md.

---

## Future Enhancements

- **Automated Coverage Updates:** Script to parse `pnpm test` output and update TEST_COVERAGE_MAP.md
- **Dashboard Visualization:** Web-based dashboard showing real-time coverage
- **CI/CD Integration:** GitHub Actions to enforce pre-merge quality gates
- **Test Data Generation:** Automated generation of realistic test data

---

## Success Metrics

The Testing Roadmap System is successful when:

- ✅ Every feature in MASTER_ROADMAP has a `Test Status`
- ✅ Every test task in TESTING_ROADMAP is linked to a feature
- ✅ TEST_COVERAGE_MAP shows >80% coverage across all modules
- ✅ Pre-merge quality gates prevent untested code from reaching production
- ✅ Agents automatically maintain the system without manual intervention

This system transforms testing from an afterthought into a first-class citizen of the development process.
