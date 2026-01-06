# Strategic Path to Completion - January 6, 2026

## Executive Summary

This document provides a fresh triage of the TERP roadmap with an optimized strategic path to Tier 1 customer testing readiness. It incorporates parallel agent assignments to maximize efficiency and minimize time-to-completion.

**Current State Assessment:**
- Total roadmap items: 267 status entries
- Completed: 18+ items (many more marked complete in recent waves)
- Ready for work: 73 items
- In Progress: 1 item
- Open PRs: 2 (UX polish Wave 2, Memory optimization)

**Estimated Remaining Work:** ~280-340 hours
**Recommended Timeline:** 4-5 weeks with parallel agents

---

## Part 1: Priority Triage

### Tier 0: Critical Blockers (Must Fix Before Any Demo)

| Task ID | Description | Est. Hours | Status |
|---------|-------------|------------|--------|
| QA-001 | Fix 404 Error - Todo Lists Module | 4-8h | Ready |
| QA-002 | Fix 404 Error - Accounting Module | 8-16h | Ready |
| QA-003 | Fix 404 Error - COGS Settings Module | 4-8h | Ready |
| QA-004 | Fix 404 Error - Analytics Module | 8-16h | Ready |
| QA-005 | Fix Systemic Data Access Issues | 16-24h | Ready |
| **Subtotal** | | **40-72h** | |

### Tier 1: High Priority (Required for Production-Ready)

| Task ID | Description | Est. Hours | Status |
|---------|-------------|------------|--------|
| DATA-005 | Implement Optimistic Locking | 32h | Ready |
| REL-002 | Implement Automated Database Backups | 8h | Ready |
| QUAL-004 | Review Referential Integrity | 16h | Ready |
| INFRA-004 | Deployment Monitoring Enforcement | 8-12h | Ready |
| INFRA-007 | Update Swarm Manager | 4-8h | Ready |
| UX-017 | Password Reset Flow (VIP Portal) | 8h | Ready |
| UX-011 | Add Skeleton Loaders | 3h | Ready |
| **Subtotal** | | **79-87h** | |

### Tier 2: Spreadsheet View Feature (Key Differentiator)

| Task ID | Description | Est. Hours | Status |
|---------|-------------|------------|--------|
| FEATURE-021 Phase 1 | Inventory Grid + Client View | 16-20h | Ready |
| FEATURE-021 Phase 2 | Intake Grid | 12-16h | Ready |
| FEATURE-021 Phase 3 | Pick & Pack Grid | 12-20h | Ready |
| TERP-SS-006 | Visual Cues (Color Coding) | 24h | Ready |
| TERP-SS-008 | Inventory Grid Grouping | 16h | Ready |
| TERP-SS-009 | Editing Capabilities | 16h | Ready |
| **Subtotal** | | **96-112h** | |

### Tier 3: QA & Polish (Excellent User Experience)

| Task ID | Description | Est. Hours | Status |
|---------|-------------|------------|--------|
| QA-W2-001 | Fix N+1 query in getBatchCodesByIds | 2h | Ready |
| QA-W2-002 | Complete frontend display for intake qty | 4h | Ready |
| QA-W2-003 | Add unit tests for spreadsheetViewService | 4h | Ready |
| QA-W2-007 | Fix Sidebar Menu Length | 2h | Ready |
| QA-W2-008 | Fix Duplicate Menu Icons | 2h | Ready |
| UX-016 | Convert Settings to Vertical Nav | 3h | Ready |
| UX-018 | Add Drag-and-Drop to Todo Lists | 6h | Ready |
| UX-019 | Implement Filter Persistence | 3h | Ready |
| **Subtotal** | | **26h** | |

### Tier 4: Infrastructure & Cleanup

| Task ID | Description | Est. Hours | Status |
|---------|-------------|------------|--------|
| ST-010 | Implement Caching Layer (Redis) | 16-24h | Ready |
| ST-024 | Remove Comments Feature | 4h | Ready |
| CLEANUP-001 | Remove LLM/AI from Codebase | 8h | Ready |
| IMPROVE-003 | Add Composite Database Indexes | 8h | Ready |
| IMPROVE-004 | Reduce Rate Limiting Thresholds | 2h | Ready |
| QUAL-007 | Final TODO Audit & Documentation | 4h | Ready |
| **Subtotal** | | **42-50h** | |

---

## Part 2: Parallel Agent Execution Strategy

### Wave Numbering Context

**Waves 1-2:** Completed - Bug fixes and UX polish (merged to main)
**Wave 3:** Pending - Spreadsheet UX, Editing/Grouping, QA Follow-up (prompts exist: `WAVE3_AGENT_PROMPT_A/B/C.md`)
**Waves 4-5:** Reserved for Wave 3 follow-up work if needed
**Waves 6-7:** New work defined in this document

### Wave 6: Critical Bug Fixes (3 Parallel Agents)
**Duration:** 2-3 days
**Total Hours:** 40-72h

```
┌─────────────────────────────────────────────────────────────────┐
│                    WAVE 6: CRITICAL FIXES                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Agent 6A                Agent 6B                Agent 6C        │
│  ─────────              ─────────               ─────────        │
│  QA-001: Todo Lists     QA-002: Accounting      QA-005: Data     │
│  (4-8h)                 (8-16h)                 Access Issues    │
│                                                 (16-24h)         │
│  QA-003: COGS Settings  QA-004: Analytics                        │
│  (4-8h)                 (8-16h)                                  │
│                                                                   │
│  Branch: wave-6/        Branch: wave-6/         Branch: wave-6/  │
│  critical-routes        accounting-analytics    data-access      │
└─────────────────────────────────────────────────────────────────┘
```

**File Ownership:**
- Agent 6A: `client/src/pages/TodoPage.tsx`, `client/src/pages/CogsSettingsPage.tsx`, routing
- Agent 6B: `client/src/pages/AccountingPage.tsx`, `client/src/pages/AnalyticsPage.tsx`, routing
- Agent 6C: `server/routers/*`, database queries, auth middleware

### Wave 7: Spreadsheet View (3 Parallel Agents)
**Duration:** 4-5 days
**Total Hours:** 96-112h

```
┌─────────────────────────────────────────────────────────────────┐
│                    WAVE 7: SPREADSHEET VIEW                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Agent 7A                Agent 7B                Agent 7C        │
│  ─────────              ─────────               ─────────        │
│  Phase 1: Inventory     Phase 2: Intake         Phase 3: Pick    │
│  Grid + Client View     Grid                    & Pack Grid      │
│  (16-20h)               (12-16h)                (12-20h)         │
│                                                                   │
│  TERP-SS-006: Visual    TERP-SS-008: Grouping   TERP-SS-009:     │
│  Cues (24h)             (16h)                   Editing (16h)    │
│                                                                   │
│  Branch: wave-7/        Branch: wave-7/         Branch: wave-7/  │
│  spreadsheet-inventory  spreadsheet-intake      spreadsheet-pick │
└─────────────────────────────────────────────────────────────────┘
```

**File Ownership:**
- Agent 7A: `InventoryGrid.tsx`, `ClientGrid.tsx`, `SpreadsheetViewPage.tsx`
- Agent 7B: `IntakeGrid.tsx`, intake service integration
- Agent 7C: `PickPackGrid.tsx`, pick & pack router integration

### Wave 8: Infrastructure & Data Integrity (2 Parallel Agents)
**Duration:** 3-4 days
**Total Hours:** 79-87h

```
┌─────────────────────────────────────────────────────────────────┐
│                    WAVE 6: INFRASTRUCTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Agent 6A                              Agent 6B                  │
│  ─────────                            ─────────                  │
│  DATA-005: Optimistic Locking (32h)   REL-002: DB Backups (8h)   │
│  QUAL-004: Referential Integrity      INFRA-004: Monitoring      │
│  (16h)                                (8-12h)                    │
│                                       INFRA-007: Swarm Mgr       │
│                                       (4-8h)                     │
│                                                                   │
│  Branch: wave-6/                      Branch: wave-6/            │
│  data-integrity                       infrastructure             │
└─────────────────────────────────────────────────────────────────┘
```

**File Ownership:**
- Agent 6A: `drizzle/`, `server/routers/*` (locking/transactions)
- Agent 6B: `scripts/`, deployment configs, monitoring setup

### Wave 9: UX Polish & QA Follow-up (2 Parallel Agents)
**Duration:** 2 days
**Total Hours:** 26h + 42-50h = 68-76h

```
┌─────────────────────────────────────────────────────────────────┐
│                    WAVE 7: POLISH & CLEANUP                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Agent 7A                              Agent 7B                  │
│  ─────────                            ─────────                  │
│  QA-W2-001 to QA-W2-008 (14h)         ST-010: Redis Caching      │
│  UX-011: Skeleton Loaders (3h)        (16-24h)                   │
│  UX-016: Settings Nav (3h)            ST-024: Remove Comments    │
│  UX-017: Password Reset (8h)          (4h)                       │
│  UX-018: Drag-Drop Todo (6h)          CLEANUP-001: Remove AI     │
│  UX-019: Filter Persistence (3h)      (8h)                       │
│                                       IMPROVE-003: Indexes (8h)  │
│                                                                   │
│  Branch: wave-7/                      Branch: wave-7/            │
│  ux-polish                            infrastructure-cleanup     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 3: Timeline Summary

| Wave | Focus | Agents | Duration | Hours | Cumulative |
|------|-------|--------|----------|-------|------------|
| Wave 6 | Critical Bug Fixes | 3 | 2-3 days | 40-72h | 40-72h |
| Wave 7 | Spreadsheet View | 3 | 4-5 days | 96-112h | 136-184h |
| Wave 8 | Infrastructure | 2 | 3-4 days | 79-87h | 215-271h |
| Wave 9 | Polish & Cleanup | 2 | 2 days | 68-76h | 283-347h |
| Integration | Merge & QA | 1 | 2 days | 16h | 299-363h |

**Total Estimated Time:** 13-16 days (with parallel execution)
**Sequential Equivalent:** 37-45 days

---

## Part 4: Agent Prompts

### Agent 6A Prompt: Critical Routes - Todo & COGS

```markdown
# Agent Prompt: Wave 6A - Critical Routes (Todo & COGS)

## Mission
Fix the 404 errors for Todo Lists and COGS Settings modules.

## Repository Setup
gh repo clone EvanTenenbaum/TERP
cd TERP && pnpm install
git checkout -b wave-6/critical-routes

## Tasks
1. **QA-001: Fix Todo Lists 404** (4-8h)
   - Create `/todo` route in `client/src/App.tsx`
   - Implement `TodoPage.tsx` with basic CRUD
   - Connect to existing todo tRPC router (if exists) or create

2. **QA-003: Fix COGS Settings 404** (4-8h)
   - Create `/cogs-settings` route
   - Implement `CogsSettingsPage.tsx`
   - Connect to COGS configuration backend

## File Ownership
- `client/src/pages/TodoPage.tsx` (new)
- `client/src/pages/CogsSettingsPage.tsx` (new)
- `client/src/App.tsx` (routing only)

## Completion Protocol
1. Run `pnpm check` - zero TypeScript errors
2. Run `pnpm test` - all tests pass
3. Create PR with clear description
4. Generate reviewer prompt for QA agent
```

### Agent 6B Prompt: Accounting & Analytics

```markdown
# Agent Prompt: Wave 6B - Accounting & Analytics Modules

## Mission
Fix the 404 errors for Accounting and Analytics modules.

## Repository Setup
gh repo clone EvanTenenbaum/TERP
cd TERP && pnpm install
git checkout -b wave-6/accounting-analytics

## Tasks
1. **QA-002: Fix Accounting 404** (8-16h)
   - Create `/accounting` route
   - Implement `AccountingPage.tsx` with AR/AP views
   - Connect to existing accounting tRPC router

2. **QA-004: Fix Analytics 404** (8-16h)
   - Create `/analytics` route
   - Implement `AnalyticsPage.tsx` with charts
   - Connect to analytics data endpoints

## File Ownership
- `client/src/pages/AccountingPage.tsx` (new)
- `client/src/pages/AnalyticsPage.tsx` (new)
- `client/src/App.tsx` (routing only)

## Completion Protocol
1. Run `pnpm check` - zero TypeScript errors
2. Run `pnpm test` - all tests pass
3. Create PR with clear description
```

### Agent 6C Prompt: Data Access Issues

```markdown
# Agent Prompt: Wave 6C - Systemic Data Access Fix

## Mission
Investigate and fix the widespread "No data found" issues across all modules.

## Repository Setup
gh repo clone EvanTenenbaum/TERP
cd TERP && pnpm install
git checkout -b wave-6/data-access

## Tasks
**QA-005: Fix Systemic Data Access Issues** (16-24h)

Investigation Checklist:
1. Check database connection and credentials
2. Verify authentication/authorization middleware
3. Check API endpoint responses
4. Verify user permissions and roles
5. Check database seeding/migration status

Symptoms to Address:
- Orders module shows 4,400 total orders in metrics but 0 in table
- Inventory shows $96M value but "No inventory found"
- Clients shows "No clients found"

## File Ownership
- `server/routers/*` (query fixes)
- `server/_core/auth/*` (auth middleware)
- Database connection configuration

## Completion Protocol
1. Document root cause in PR description
2. Run `pnpm check` - zero TypeScript errors
3. Verify data displays correctly in all modules
4. Create PR with detailed fix explanation
```

### Agent 7A Prompt: Spreadsheet Inventory Grid

```markdown
# Agent Prompt: Wave 7A - Spreadsheet Inventory & Client Grid

## Mission
Implement Phase 1 of Spreadsheet View and visual cues.

## Key Documents
- `docs/specs/FEATURE-SPREADSHEET-VIEW-SPEC.md`
- `docs/reviews/QA-SPREADSHEET-VIEW-ANALYSIS.md`

## Repository Setup
gh repo clone EvanTenenbaum/TERP
cd TERP && pnpm install
git checkout -b wave-7/spreadsheet-inventory

## Tasks
1. **FEATURE-021 Phase 1** (16-20h)
   - Create `SpreadsheetViewPage.tsx` container with tabs
   - Implement `InventoryGrid.tsx` with AG-Grid
   - Implement `ClientGrid.tsx` with master-detail layout
   - Create `spreadsheetRouter.ts` for data transformation

2. **TERP-SS-006: Visual Cues** (24h)
   - Batch status color coding (Curing=Orange, Office=Cyan)
   - Payment highlighting (green for paid rows)
   - Use AG-Grid `cellClassRules` or `cellStyle`

## File Ownership
- `client/src/pages/SpreadsheetViewPage.tsx`
- `client/src/components/spreadsheet/InventoryGrid.tsx`
- `client/src/components/spreadsheet/ClientGrid.tsx`
- `server/routers/spreadsheet.ts`

## Completion Protocol
1. Run `pnpm check` - zero TypeScript errors
2. Test with sample data
3. Create PR with screenshots
```

### Agent 7B Prompt: Spreadsheet Intake Grid

```markdown
# Agent Prompt: Wave 7B - Spreadsheet Intake Grid

## Mission
Implement Phase 2 of Spreadsheet View - Intake Grid.

## Repository Setup
gh repo clone EvanTenenbaum/TERP
cd TERP && pnpm install
git checkout -b wave-7/spreadsheet-intake

## Tasks
1. **FEATURE-021 Phase 2** (12-16h)
   - Implement `IntakeGrid.tsx` for new batch entry
   - Integration with existing `inventoryIntakeService`
   - Bulk entry support

2. **TERP-SS-008: Inventory Grid Grouping** (16h)
   - Group by date and vendor
   - Collapsible row groups
   - Summary rows per group

## File Ownership
- `client/src/components/spreadsheet/IntakeGrid.tsx`
- Integration with `server/services/inventoryIntakeService.ts`

## Completion Protocol
1. Run `pnpm check` - zero TypeScript errors
2. Test bulk entry workflow
3. Create PR with demo video/screenshots
```

### Agent 7C Prompt: Spreadsheet Pick & Pack Grid

```markdown
# Agent Prompt: Wave 7C - Spreadsheet Pick & Pack Grid

## Mission
Implement Phase 3 of Spreadsheet View - Pick & Pack Grid.

## Repository Setup
gh repo clone EvanTenenbaum/TERP
cd TERP && pnpm install
git checkout -b wave-7/spreadsheet-pick

## Tasks
1. **FEATURE-021 Phase 3** (12-20h)
   - Implement `PickPackGrid.tsx` for order fulfillment
   - Integration with existing `pickPack` router
   - Status tracking and updates

2. **TERP-SS-009: Editing Capabilities** (16h)
   - Make columns editable: Available, Ticket, Notes
   - Trigger tRPC mutations on cell edit
   - Visual feedback on save (toast notifications)

## File Ownership
- `client/src/components/spreadsheet/PickPackGrid.tsx`
- Integration with `server/routers/pickPack.ts`

## Completion Protocol
1. Run `pnpm check` - zero TypeScript errors
2. Test edit → save → refresh cycle
3. Create PR with workflow documentation
```

---

## Part 5: Success Criteria for Tier 1 Readiness

### Technical Metrics
| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| P0 Bugs (404s) | 4 | 0 | Critical |
| TypeScript Errors | 0 | 0 | Maintain |
| Unit Test Pass Rate | ~92% | >95% | High |
| E2E Test Coverage | ~50% | >70% | Medium |
| Page Load Time | Variable | <3s | High |

### Functional Checklist
- [ ] All navigation routes work (no 404s)
- [ ] Data displays correctly in all modules
- [ ] Spreadsheet view fully functional
- [ ] Mobile responsiveness acceptable
- [ ] User can complete core workflows:
  - [ ] Create/edit orders
  - [ ] Manage inventory
  - [ ] View accounting data
  - [ ] Access analytics
  - [ ] Use todo lists

### Security Checklist
- [ ] No debug code in production
- [ ] Proper authentication on all routes
- [ ] Data access properly scoped to user permissions

---

## Part 6: Merge Strategy

### Merge Order
1. **Wave 6** (Critical Fixes) → main
2. **Wave 7** (Spreadsheet View) → main
3. **Wave 8** (Infrastructure) → main
4. **Wave 9** (Polish) → main

### Integration Protocol
After each wave:
1. Run full test suite
2. Deploy to staging
3. Perform smoke test
4. Merge to main if passing

### Conflict Resolution
- Wave 7 agents have isolated file ownership (no conflicts expected)
- Wave 8 & 9 may have minor conflicts in shared files
- Designate Agent 6A as "integration lead" for conflict resolution

---

## Appendix: Quick Reference

### Branch Naming Convention
```
wave-{number}/agent-{letter}-{description}
Example: wave-7/agent-a-spreadsheet-inventory
```

### PR Title Format
```
feat(module): Brief description [Wave X - Agent Y]
Example: feat(spreadsheet): implement inventory grid [Wave 7 - Agent A]
```

### Agent Communication
- All agents should check `docs/roadmaps/` for updates before starting
- Use PR comments for cross-agent coordination
- Tag `@EvanTenenbaum` for blocking issues

---

**Document Generated:** January 6, 2026
**Author:** Manus AI
**Next Review:** January 13, 2026
