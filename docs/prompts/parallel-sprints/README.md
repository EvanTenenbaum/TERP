# Parallel Sprint Agent Prompts

This directory contains detailed prompts for AI engineering agents executing the parallel sprint plan.

## Sprint Overview

| Sprint | Focus | Hours | Prompt |
|--------|-------|-------|--------|
| **🔵 A** | Backend Infrastructure & Schema | 60h | Execute independently (see `PARALLEL_SPRINT_PLAN.md`) |
| **🟢 B** | Frontend UX & UI Components | 66h | [SPRINT-B-FRONTEND-UX.md](./SPRINT-B-FRONTEND-UX.md) |
| **🟠 C** | Accounting & VIP Portal | 54h | [SPRINT-C-ACCOUNTING-VIP.md](./SPRINT-C-ACCOUNTING-VIP.md) |
| **🟣 D** | Sales, Inventory & QA | 58h | [SPRINT-D-SALES-INVENTORY-QA.md](./SPRINT-D-SALES-INVENTORY-QA.md) |

## Execution Order

1. **Sprint A** completes first (prerequisite for B, C, D)
2. **Sprints B, C, D** run in parallel
3. **Merge order:** A → B → C → D

## Key Principles

### File Ownership
Each sprint has exclusive write access to specific files. Agents must NOT modify files outside their domain.

### Redhat QA Gates
Each sprint has multiple QA checkpoints that must pass before proceeding:
- Phase completion gates
- Final sprint gate
- All gates require verification and documentation

### Rollback Procedures
Each prompt includes rollback procedures at multiple levels:
- Level 1: Revert last commit
- Level 2: Revert to phase checkpoint
- Level 3: Abandon branch and restart

## Agent Instructions

1. Read the full prompt before starting
2. Verify Sprint A is complete
3. Create your feature branch
4. Complete phases in order
5. Pass all Redhat QA gates
6. Submit branch for integration

## Integration Protocol

After all sprints complete:
1. Each branch undergoes independent QA review
2. Branches merge in order: A → B → C → D
3. Full E2E test suite runs after each merge
4. Production deployment after final merge

---

*Created: January 2, 2026*
*Version: 1.0*
