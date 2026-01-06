# Wave 6: Maximum Parallel Execution

**Date**: January 6, 2026  
**Goal**: Complete as much roadmap work as safely possible in parallel  
**Estimated Duration**: 3-5 days with 5 parallel agents

---

## Parallelization Strategy

These 5 agents work on **completely independent** areas with no code overlap:

| Agent | Focus Area                  | Key Files                         | Est. Hours |
| ----- | --------------------------- | --------------------------------- | ---------- |
| 6A    | QA Backlog Cleanup          | docs/roadmaps/QA_TASKS_BACKLOG.md | 8-12h      |
| 6B    | Infrastructure & Monitoring | server/routers/, scripts/         | 8-14h      |
| 6C    | Code Cleanup & Quality      | Various (TODOs, @ts-nocheck)      | 12-16h     |
| 6D    | Feature Enhancements        | drizzle/schema.ts, new pages      | 16-24h     |
| 6E    | Testing & Documentation     | tests/, docs/, README.md          | 12-16h     |

**Total Parallel Work**: 56-82 hours compressed into 3-5 days

---

## Critical Path Information

### File Locations (Verified)

- **Schema**: `drizzle/schema.ts` (single file, MySQL syntax)
- **Router Registration**: `server/routers.ts` (NOT server/routers/index.ts)
- **Main Dashboard**: `client/src/pages/DashboardV3.tsx` (NOT DashboardPage.tsx)
- **Sidebar**: `client/src/components/DashboardLayout.tsx`

### Verified Counts

- **Skipped Tests**: 28
- **TODO/FIXME Comments**: 37
- **@ts-nocheck Files**: 1 (server/db/seed/productionSeed.ts)
- **AI/LLM Code**: None found

### Routes Already Verified to Exist

- `/vendors` → VendorsPage.tsx ✅
- `/purchase-orders` → PurchaseOrdersPage.tsx ✅
- `/todo` and `/todos` → TodoListsPage.tsx ✅
- `/accounting` → AccountingDashboard.tsx ✅
- `/analytics` → AnalyticsPage.tsx ✅
- `/settings/cogs` → CogsSettingsPage.tsx ✅

---

## Agent Prompts

Each agent has a detailed prompt file in `docs/prompts/wave6/`:

| Agent | Prompt File                  |
| ----- | ---------------------------- |
| 6A    | `AGENT_6A_QA_BACKLOG.md`     |
| 6B    | `AGENT_6B_INFRASTRUCTURE.md` |
| 6C    | `AGENT_6C_CLEANUP.md`        |
| 6D    | `AGENT_6D_FEATURES.md`       |
| 6E    | `AGENT_6E_TESTING.md`        |

---

## Merge Order (Critical!)

Merge PRs in this order to minimize conflicts:

1. **Agent 6A** - Documentation only, no code conflicts
2. **Agent 6E** - Tests and docs, minimal code changes
3. **Agent 6C** - Cleanup may remove code others reference
4. **Agent 6B** - Infrastructure additions
5. **Agent 6D** - New features, most likely to need rebase

---

## Quick Launch Commands

### Agent 6A (QA Backlog)

```bash
# Copy prompt from docs/prompts/wave6/AGENT_6A_QA_BACKLOG.md
```

### Agent 6B (Infrastructure)

```bash
# Copy prompt from docs/prompts/wave6/AGENT_6B_INFRASTRUCTURE.md
```

### Agent 6C (Cleanup)

```bash
# Copy prompt from docs/prompts/wave6/AGENT_6C_CLEANUP.md
```

### Agent 6D (Features)

```bash
# Copy prompt from docs/prompts/wave6/AGENT_6D_FEATURES.md
```

### Agent 6E (Testing)

```bash
# Copy prompt from docs/prompts/wave6/AGENT_6E_TESTING.md
```

---

## Success Criteria

All agents must:

- [ ] Pass `pnpm check` with 0 errors
- [ ] Pass `pnpm build` successfully
- [ ] Create PR with descriptive title and body
- [ ] Not break existing functionality

---

## Post-Wave 6

After all 5 PRs are merged, remaining work includes:

- QA-005: Data access investigation (needs production access)
- Additional QA tasks (QA-023 through QA-048)
- Security audit (QA-027)
- Performance optimization
