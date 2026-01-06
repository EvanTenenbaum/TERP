# TERP Parallel Agent Execution Strategy

## Overview

This document outlines how to parallelize the TERP roadmap completion using multiple AI agents. Tasks are grouped into independent workstreams that can execute simultaneously without conflicts.

## Parallelization Principles

1. **No File Conflicts:** Agents working in parallel must not modify the same files
2. **No Database Conflicts:** Schema changes must be coordinated
3. **Independent Testing:** Each workstream should be testable independently
4. **Clear Boundaries:** Each agent has a defined scope with explicit deliverables

---

## Workstream Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ORCHESTRATOR (You)                           │
│  - Launches agents in parallel                                      │
│  - Reviews PRs before merge                                         │
│  - Resolves conflicts if any                                        │
│  - Merges approved PRs to main                                      │
└─────────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  WORKSTREAM A │     │  WORKSTREAM B │     │  WORKSTREAM C │
│  Spreadsheet  │     │  Bug Fixes &  │     │  Mobile & UX  │
│  View (P0/P1) │     │  New Features │     │  Polish       │
├───────────────┤     ├───────────────┤     ├───────────────┤
│ TERP-SS-001   │     │ CHAOS-005     │     │ CHAOS-011-013 │
│ TERP-SS-002   │     │ CHAOS-008     │     │ CHAOS-016-018 │
│ TERP-SS-003   │     │ CHAOS-009     │     │ CHAOS-021-023 │
│ TERP-SS-004   │     │ CHAOS-025     │     │ CHAOS-026-029 │
│ TERP-SS-005   │     │ QA-TEST-002/3 │     │               │
│ TERP-SS-006-10│     │               │     │               │
├───────────────┤     ├───────────────┤     ├───────────────┤
│ Est: 216h     │     │ Est: 32h      │     │ Est: 31h      │
│ Files: SS*    │     │ Files: Various│     │ Files: UI/CSS │
└───────────────┘     └───────────────┘     └───────────────┘
```

---

## Workstream Definitions

### Workstream A: Spreadsheet View (216 hours)

**Scope:** All spreadsheet view implementation tasks
**Files Owned:**

- `client/src/pages/SpreadsheetViewPage.tsx`
- `client/src/components/spreadsheet/*`
- `server/services/spreadsheetViewService.ts`
- `server/routers/spreadsheet.ts`

**Dependencies:** None (self-contained feature)

### Workstream B: Bug Fixes & New Features (32 hours)

**Scope:** Missing pages, search, and core bug fixes
**Files Owned:**

- `client/src/pages/SearchResultsPage.tsx` (new)
- `client/src/pages/TodoListsPage.tsx` (new)
- `client/src/pages/OrderCreatorPage.tsx` (order draft)
- `server/routers/search.ts` (new)
- `server/routers/todos.ts`

**Dependencies:** None

### Workstream C: Mobile & UX Polish (31 hours)

**Scope:** Mobile responsiveness, UI polish, empty states
**Files Owned:**

- `client/src/components/ui/*` (touch targets, modals)
- `client/src/components/layout/*` (breadcrumbs, sidebar)
- `client/src/styles/*`
- Various page-level CSS adjustments

**Dependencies:** None

---

## Execution Timeline

### Wave 1 (Parallel - Week 1-2)

Launch all three workstreams simultaneously:

| Agent   | Workstream | Tasks                           | Branch Name                 |
| ------- | ---------- | ------------------------------- | --------------------------- |
| Agent 1 | A          | TERP-SS-001, TERP-SS-002        | `feature/spreadsheet-grids` |
| Agent 2 | B          | CHAOS-005, CHAOS-008, CHAOS-009 | `feature/missing-pages`     |
| Agent 3 | C          | CHAOS-011-013, CHAOS-016-018    | `fix/mobile-ux-polish`      |

### Wave 2 (Parallel - Week 3-4)

After Wave 1 PRs merged:

| Agent   | Workstream | Tasks                                 | Branch Name                      |
| ------- | ---------- | ------------------------------------- | -------------------------------- |
| Agent 1 | A          | TERP-SS-003, TERP-SS-004, TERP-SS-005 | `feature/spreadsheet-data-fixes` |
| Agent 2 | B          | CHAOS-025, QA-TEST-002, QA-TEST-003   | `fix/order-draft-tests`          |
| Agent 3 | C          | CHAOS-021-023, CHAOS-026-029          | `fix/ux-polish-wave2`            |

### Wave 3 (Parallel - Week 5-6)

Final polish:

| Agent   | Workstream | Tasks                           | Branch Name                  |
| ------- | ---------- | ------------------------------- | ---------------------------- |
| Agent 1 | A          | TERP-SS-006 through TERP-SS-010 | `feature/spreadsheet-polish` |

---

## Conflict Prevention Rules

1. **Branch Naming:** Each agent uses unique branch prefix
2. **File Ownership:** Agents only modify files in their scope
3. **Schema Changes:** Only Workstream A can modify `drizzle/schema.ts`
4. **Shared Components:** If modification needed, coordinate via PR comments
5. **Testing:** Each agent runs `pnpm check` and `pnpm test` before PR

---

## Merge Protocol

1. Agent completes work and creates PR
2. Orchestrator reviews PR with Gemini Pro
3. If approved, merge to main
4. If conflicts, coordinate with other agents
5. After merge, other agents pull latest main

---

## Success Metrics

- All PRs pass TypeScript check
- All PRs pass existing tests
- No merge conflicts
- Each workstream completes within estimated time
- Live site remains functional after each merge
