# Multi-Agent Execution Plan

**Created:** 2026-01-26
**Status:** READY FOR EXECUTION
**Total Tasks:** 25
**Estimated Total Effort:** 150-180h

---

## Dependency Graph

```
                    ┌─────────────────────────────────────────────────┐
                    │           COORDINATOR AGENT                      │
                    │  Manages PRs, resolves conflicts, validates      │
                    └─────────────────────┬───────────────────────────┘
                                          │
        ┌─────────────┬─────────────┬─────┴─────┬─────────────┬─────────────┐
        │             │             │           │             │             │
        ▼             ▼             ▼           ▼             ▼             ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
   │ TEAM A  │  │ TEAM B  │  │ TEAM C  │  │ TEAM D  │  │ TEAM E  │  │ TEAM F  │
   │ Core    │  │ Account │  │ Invent  │  │ Quality │  │ Infra   │  │ Feature │
   │ Reliab. │  │ GL      │  │ Orders  │  │         │  │         │  │         │
   └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘
        │             │           │             │             │             │
        │      ┌──────┘           │             │             │             │
        │      │ (waits for       │             │             │             │
        │      │  ARCH-001)       │             │             │             │
        ▼      ▼                  ▼             ▼             ▼             ▼
   ┌─────────────┐          ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │ ST-050      │          │ INV-001 │   │ LINT-   │   │ ST-005  │   │ FEAT-   │
   │ ST-051      │          │ INV-002 │   │ 001,002 │   │ ST-007  │   │ 021     │
   │ ARCH-001    │          │         │   │ 005     │   │ ST-009  │   │ (sub-   │
   │ ARCH-002    │          │         │   │ TEST-   │   │         │   │ agents) │
   │ ARCH-003    │          │         │   │ 020,021 │   │         │   │         │
   │ ARCH-004    │          │         │   │         │   │         │   │         │
   └──────┬──────┘          └─────────┘   └─────────┘   └─────────┘   └─────────┘
          │
          │ enables
          ▼
   ┌─────────────┐
   │ ACC-002     │
   │ ACC-003     │
   │ ACC-004     │
   └─────────────┘
```

---

## Team Assignments

### Team A: Core Reliability (SEQUENTIAL - Critical Path)

**Branch:** `claude/team-a-core-reliability`
**Estimated Time:** 36-44h
**Dependency:** None (starts first)
**Blocks:** Team B (ACC tasks)

| Order | Task ID  | Description                              | Est  | Depends On |
|-------|----------|------------------------------------------|------|------------|
| 1     | ST-050   | Fix Silent Error Handling in RED Mode    | 4h   | None       |
| 2     | ST-051   | Add Transaction Boundaries               | 8h   | ST-050     |
| 3     | ARCH-001 | Create OrderOrchestrator Service         | 8h   | ST-051     |
| 4     | ARCH-002 | Eliminate Shadow Accounting              | 8h   | ARCH-001   |
| 5     | ARCH-003 | State Machine for Order Transitions      | 4h   | ARCH-001   |
| 6     | ARCH-004 | Fix Bill Status Transitions              | 4h   | ARCH-001   |

---

### Team B: Accounting GL Reversals (PARALLEL after ARCH-001)

**Branch:** `claude/team-b-accounting-gl`
**Estimated Time:** 12-16h
**Dependency:** ARCH-001 complete (needs OrderOrchestrator patterns)
**Blocks:** None

| Order | Task ID | Description                           | Est | Depends On |
|-------|---------|---------------------------------------|-----|------------|
| 1     | ACC-002 | GL Reversals for Invoice Void         | 4h  | ARCH-001   |
| 2     | ACC-003 | GL Reversals for Returns/Credit Memos | 4h  | ACC-002    |
| 3     | ACC-004 | Create COGS GL Entries on Sale        | 4h  | None*      |

*ACC-004 can start immediately as it's additive, not dependent on reversals.

---

### Team C: Inventory & Orders (PARALLEL)

**Branch:** `claude/team-c-inventory`
**Estimated Time:** 6-8h
**Dependency:** None
**Blocks:** None

| Order | Task ID | Description                               | Est | Depends On |
|-------|---------|-------------------------------------------|-----|------------|
| 1     | INV-001 | Inventory Deduction on Ship/Fulfill       | 4h  | None       |
| 2     | INV-002 | Fix Race Condition in Draft Confirmation  | 2h  | None       |

---

### Team D: Code Quality (PARALLEL)

**Branch:** `claude/team-d-quality`
**Estimated Time:** 17-20h
**Dependency:** None
**Blocks:** None

| Order | Task ID  | Description                        | Est | Depends On |
|-------|----------|------------------------------------|-----|------------|
| 1     | LINT-001 | Fix React Hooks Violations         | 4h  | None       |
| 2     | LINT-002 | Fix 'React' is not defined         | 2h  | None       |
| 3     | LINT-005 | Replace `any` Types                | 8h  | None       |
| 4     | TEST-020 | Fix permissionMiddleware Mock      | 2h  | None       |
| 5     | TEST-021 | Add ResizeObserver Polyfill        | 1h  | None       |

---

### Team E: Infrastructure (PARALLEL)

**Branch:** `claude/team-e-infrastructure`
**Estimated Time:** 20-28h
**Dependency:** None
**Blocks:** None

| Order | Task ID | Description                    | Est   | Depends On |
|-------|---------|--------------------------------|-------|------------|
| 1     | ST-005  | Add Missing Database Indexes   | 4-6h  | None       |
| 2     | ST-007  | System-Wide Pagination         | 3-4d  | None       |
| 3     | ST-009  | API Monitoring (Datadog)       | 2-3d  | None       |

---

### Team F: Feature Development (PARALLEL with Sub-Agents)

**Branch:** `claude/team-f-spreadsheet`
**Estimated Time:** 40-56h
**Dependency:** None (pure frontend, uses existing tRPC)
**Blocks:** None

| Phase | Description                    | Est     | Sub-Agent |
|-------|--------------------------------|---------|-----------|
| 1     | Inventory Grid + Client View   | 16-20h  | F1        |
| 2     | Intake Grid                    | 12-16h  | F2        |
| 3     | Pick & Pack Grid               | 12-20h  | F3        |

---

## Execution Timeline

```
Week 1:
├── Day 1-2: All teams start in parallel
│   ├── Team A: ST-050, ST-051
│   ├── Team C: INV-001, INV-002 (complete)
│   ├── Team D: LINT-001, LINT-002, TEST-020, TEST-021
│   ├── Team E: ST-005 (complete)
│   └── Team F: Phase 1 begins
│
├── Day 3-4:
│   ├── Team A: ARCH-001
│   ├── Team D: LINT-005 (ongoing)
│   ├── Team E: ST-007 (ongoing)
│   └── Team F: Phase 1 continues
│
├── Day 5:
│   ├── Team A: ARCH-002, ARCH-003, ARCH-004 (parallel)
│   ├── Team B: UNLOCKED - starts ACC-002, ACC-004
│   └── Coordinator: First integration check

Week 2:
├── Day 6-7:
│   ├── Team A: Complete
│   ├── Team B: ACC-003, complete
│   ├── Team E: ST-007 complete, ST-009 begins
│   └── Team F: Phase 2
│
├── Day 8-10:
│   ├── Team E: ST-009 complete
│   ├── Team F: Phase 3
│   └── Coordinator: Final integration, all PRs merged
```

---

## Agent Prompts

### Prompt Location

All prompts stored in: `docs/prompts/agents/`

| Agent | Prompt File |
|-------|-------------|
| Coordinator | `COORDINATOR.md` |
| Team A | `TEAM_A_CORE_RELIABILITY.md` |
| Team B | `TEAM_B_ACCOUNTING_GL.md` |
| Team C | `TEAM_C_INVENTORY.md` |
| Team D | `TEAM_D_QUALITY.md` |
| Team E | `TEAM_E_INFRASTRUCTURE.md` |
| Team F | `TEAM_F_SPREADSHEET.md` |

---

## Launch Commands

```bash
# Launch all parallel teams (Teams A, C, D, E, F)
pnpm agents:launch --teams=A,C,D,E,F

# Launch Team B after ARCH-001 complete
pnpm agents:launch --teams=B --after=ARCH-001

# Monitor progress
pnpm agents:status

# Coordinator review
pnpm agents:coordinate --review
```

---

## Success Criteria

1. All 25 tasks marked complete in MASTER_ROADMAP.md
2. All verification gates pass:
   - `pnpm check` - 0 errors
   - `pnpm lint` - 0 errors
   - `pnpm test` - 95%+ pass rate
   - `pnpm build` - succeeds
3. All PRs merged to main
4. Deployment verified healthy
