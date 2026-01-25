# Sprint Team Prompts

**Generated:** 2026-01-25
**Strategy Document:** `/docs/roadmaps/PARALLEL_SPRINT_TEAMS_2026-01-25.md`

---

## Quick Start

1. **Read the strategy document** first to understand the overall plan
2. **Claim your team** by updating `/docs/ACTIVE_SESSIONS.md`
3. **Read your team's prompt** below
4. **Create your feature branch** and start working

---

## Team Prompts

| Team | Focus | File | Branch |
|------|-------|------|--------|
| **Team A** | Core Stability | [TEAM_A_CORE_STABILITY.md](./TEAM_A_CORE_STABILITY.md) | `claude/sprint-team-a-stability` |
| **Team B** | Frontend UX | [TEAM_B_FRONTEND_UX.md](./TEAM_B_FRONTEND_UX.md) | `claude/sprint-team-b-frontend` |
| **Team C** | Backend API | [TEAM_C_BACKEND_API.md](./TEAM_C_BACKEND_API.md) | `claude/sprint-team-c-backend` |
| **Team D** | Data & Schema | [TEAM_D_DATA_SCHEMA.md](./TEAM_D_DATA_SCHEMA.md) | `claude/sprint-team-d-data` |
| **Team E** | Integration | [TEAM_E_INTEGRATION.md](./TEAM_E_INTEGRATION.md) | `claude/sprint-team-e-integration` |

---

## Task Distribution

| Team | P0 | P1 | P2 | P3 | Total |
|------|----|----|----|----|-------|
| Team A | 6 | 8 | 4 | 0 | **18** |
| Team B | 0 | 6 | 18 | 1 | **25** |
| Team C | 0 | 7 | 9 | 2 | **18** |
| Team D | 1 | 5 | 9 | 1 | **16** |
| Team E | 3 | 17 | 16 | 0 | **36** |
| **Total** | **10** | **43** | **56** | **4** | **113** |

---

## Execution Order

```
┌────────────────────────────────────────────────────────────────┐
│ Week 1, Days 1-2: Teams A, B, C, D work in parallel            │
│                                                                 │
│   Team A: TypeScript + Tests (P0)                              │
│   Team B: Navigation + Quick Wins                               │
│   Team C: API Implementations                                   │
│   Team D: Security + Seeding                                    │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ Week 1, Day 5: First Integration Checkpoint                     │
│                                                                 │
│   All teams create PRs to staging branch                        │
│   Integration testing                                           │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ Week 2, Days 6-10: Team E starts                                │
│                                                                 │
│   Work Surfaces QA Blockers                                     │
│   Reliability Program                                           │
│   Work Surfaces Deployment                                      │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ Week 3: Final Integration                                       │
│                                                                 │
│   Staging → Main merge                                          │
│   Production deployment                                         │
│   Verification                                                  │
└────────────────────────────────────────────────────────────────┘
```

---

## Coordination

### Cross-Team Requests

Create a file in `/docs/sprint-coordination/` when you need something from another team:

```markdown
# COORD-XXX: [Brief Description]

**Requesting Team:** Team X
**Owning Team:** Team Y
**File/Resource:** [what you need]
**Status:** PENDING / APPROVED / COMPLETED
**Created:** YYYY-MM-DD

## Request Details
[Describe what you need and why]

## Response
[Owning team fills this in]
```

### Daily Updates

Post updates in `/docs/sprint-updates/`:

```markdown
# Team [X] Update - YYYY-MM-DD

## Completed
- [TASK-ID] Description

## In Progress
- [TASK-ID] Description (X% complete)

## Blocked
- [TASK-ID] Reason

## Tomorrow
- [TASK-ID] Plan
```

---

## File Ownership

See the strategy document for the complete file ownership matrix.

**Golden Rule:** Never modify files owned by another team without explicit approval.

---

## Questions?

- Create a coordination ticket
- Ask Evan directly
- Check `/CLAUDE.md` for protocols
