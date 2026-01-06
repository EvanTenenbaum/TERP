# TERP Parallel Agent Orchestration Instructions

## Overview

This document provides step-by-step instructions for you (the orchestrator) to manage multiple AI agents working in parallel on the TERP roadmap.

---

## Prerequisites

Before launching agents, ensure:

1. The TERP repository is up to date (`git pull origin main`)
2. All previous PRs have been merged
3. The live site is operational (https://terp-app-b9s35.ondigitalocean.app)

---

## Wave 1 Execution (Week 1-2)

### Step 1: Launch Agents in Parallel

Open **3 separate Manus sessions** (or AI agent instances) and give each one its respective prompt:

| Session   | Agent   | Prompt File                                 |
| --------- | ------- | ------------------------------------------- |
| Session 1 | Agent A | `docs/prompts/AGENT_PROMPT_WORKSTREAM_A.md` |
| Session 2 | Agent B | `docs/prompts/AGENT_PROMPT_WORKSTREAM_B.md` |
| Session 3 | Agent C | `docs/prompts/AGENT_PROMPT_WORKSTREAM_C.md` |

**Copy the full contents of each prompt file and paste it as the initial message to each agent.**

### Step 2: Monitor Progress

Each agent will:

1. Clone the repo
2. Create their feature branch
3. Implement their assigned tasks
4. Create a PR when complete

**Check in periodically** to ensure agents are not blocked.

### Step 3: Review and Merge PRs

When an agent notifies you that their PR is ready:

1. **Review the PR** using Gemini Pro:

   ```
   Use Gemini Pro to Red Hat QA the PR at [PR URL]. Check for:
   - Code quality
   - Potential bugs
   - Security issues
   - Adherence to the task requirements
   ```

2. **If approved**, merge to main:

   ```bash
   cd /home/ubuntu/TERP
   git checkout main
   git pull origin main
   git merge origin/[branch-name] -m "Merge [description]"
   git push origin main
   ```

3. **If changes needed**, provide feedback to the agent and ask them to revise.

### Step 4: Sync Other Agents

After merging a PR, notify other agents to pull the latest main:

```
Your branch may be out of date. Please run:
git fetch origin
git rebase origin/main
```

---

## Wave 2 Execution (Week 3-4)

After all Wave 1 PRs are merged, launch Wave 2 with updated prompts.

### Wave 2 Prompts

**Agent A (Spreadsheet Data Fixes):**

```markdown
# Agent Prompt: Workstream A - Wave 2

## Tasks

- TERP-SS-003: Fix Client Grid Vendor/Batch Code Mapping (24h)
- TERP-SS-004: Fix Inventory Grid Original Intake Quantity (20h)
- TERP-SS-005: Display Payment Amounts in Client Grid (16h)

## Branch Name

feature/spreadsheet-data-fixes

## File Ownership

Same as Wave 1 (spreadsheet files only)

## Completion Protocol

Same as Wave 1
```

**Agent B (Order Draft & Tests):**

```markdown
# Agent Prompt: Workstream B - Wave 2

## Tasks

- CHAOS-025: Order Draft Auto-Save (6h)
- QA-TEST-002: Fix VIP appointment hardcoded dates (1h)
- QA-TEST-003: Review 93 skipped tests (4h)

## Branch Name

fix/order-draft-tests

## File Ownership

- client/src/pages/OrderCreatorPage.tsx
- server/routers/\*.test.ts

## Completion Protocol

Same as Wave 1
```

**Agent C (UX Polish Wave 2):**

```markdown
# Agent Prompt: Workstream C - Wave 2

## Tasks

- CHAOS-021: Add Breadcrumb Navigation (4h)
- CHAOS-022: Fix Sidebar Menu Length (2h)
- CHAOS-023: Add Filter Persistence (4h)
- CHAOS-026: Fix Duplicate Menu Icons (1h)
- CHAOS-027: Add Version Number to Header (1h)
- CHAOS-028: Explain TERI Code Terminology (1h)
- CHAOS-029: Fix Tooltips on Mobile (2h)

## Branch Name

fix/ux-polish-wave2

## File Ownership

Same as Wave 1 (UI/layout files only)

## Completion Protocol

Same as Wave 1
```

---

## Wave 3 Execution (Week 5-6)

Final polish for spreadsheet view.

**Agent A (Spreadsheet Polish):**

```markdown
# Agent Prompt: Workstream A - Wave 3

## Tasks

- TERP-SS-006: Implement Visual Cues (Color Coding) (24h)
- TERP-SS-007: Complete Client Grid Summary Calculations (12h)
- TERP-SS-008: Configure Inventory Grid Date/Vendor Grouping (16h)
- TERP-SS-009: Add Editing Capabilities to Inventory Grid (28h)
- TERP-SS-010: Standardize Source/Brand/Vendor Terminology (4h)

## Branch Name

feature/spreadsheet-polish

## File Ownership

Same as Wave 1 (spreadsheet files only)

## Completion Protocol

Same as Wave 1
```

---

## Conflict Resolution

If two agents accidentally modify the same file:

1. **Identify the conflict** by reviewing the PR diffs
2. **Decide which changes to keep** (or merge both)
3. **Manually resolve** the conflict:
   ```bash
   git checkout main
   git merge origin/[branch-1]
   git merge origin/[branch-2]
   # Resolve conflicts in editor
   git add .
   git commit -m "Resolve merge conflict between [branch-1] and [branch-2]"
   git push origin main
   ```

---

## Final Verification

After all waves are complete:

1. **Run full test suite:**

   ```bash
   pnpm check
   pnpm test
   ```

2. **Verify live site:**
   - Test all critical user flows
   - Verify spreadsheet view is fully functional
   - Check mobile responsiveness

3. **Update roadmap:**
   - Mark all completed tasks as ✅
   - Update `docs/roadmaps/MASTER_ROADMAP.md`

---

## Troubleshooting

### Agent is Stuck

- Check if they need clarification on requirements
- Provide additional context from the codebase
- Suggest alternative approaches

### PR Has Failing Checks

- Ask the agent to fix TypeScript errors
- If pre-existing errors, use `--no-verify` flag

### Agent Modified Wrong Files

- Ask them to revert changes to files outside their scope
- Review the diff carefully before merging

---

## Timeline Summary

| Wave      | Duration    | Agents | Total Hours |
| --------- | ----------- | ------ | ----------- |
| Wave 1    | 2 weeks     | 3      | 101h        |
| Wave 2    | 2 weeks     | 3      | 78h         |
| Wave 3    | 2 weeks     | 1      | 84h         |
| **Total** | **6 weeks** | -      | **263h**    |

With 3 agents working in parallel, the 263 hours of work can be completed in approximately 6 weeks instead of 8+ weeks with a single agent.

---

## Success Criteria

- [ ] All Wave 1, 2, and 3 PRs merged
- [ ] TypeScript check passes
- [ ] Unit tests pass (>95%)
- [ ] Live site is fully functional
- [ ] Spreadsheet view is complete
- [ ] Mobile UX is polished
- [ ] All roadmap tasks marked complete

Good luck orchestrating!
