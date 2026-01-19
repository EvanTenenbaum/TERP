# ASSUMPTION_LOG.md

> **Purpose**: Track assumptions made during UX strategy development with validation status.
>
> **Confidence Key**: High (>80% certain), Medium (50-80%), Low (<50%)
>
> **Status Key**: ✅ Validated, ❓ Pending, ❌ Invalidated, 🔄 Partially Validated
>
> **Last Updated**: 2026-01-19 (Red Hat QA Deep Review)

## Strategy Assumptions (Original)

| ID | Assumption | Risk if wrong | How to validate | Source | Confidence | Status | Validated By | Date |
|----|------------|---------------|-----------------|--------|------------|--------|--------------|------|
| A-001 | Intake sessions + receipts are the canonical intake flow | Rebuild could target wrong flow | Confirm with product owner + flow matrix | Strategy package + repo | High | ❓ | - | - |
| A-002 | Spreadsheet View (AG Grid) is acceptable baseline for Work Surface pilots | Pilot may diverge from intended UX | Validate with user interviews | Repo | Medium | ❓ | - | - |
| A-003 | Cmd+K should not be used for record selection | Users may expect universal search | Observe user behavior + analytics | UX doctrine | High | ❓ | - | - |
| A-004 | Inline primitives are safe to edit without inspector | Complex validation may be missed | Audit field dependencies in each module | UX doctrine | Medium | ❓ | - | - |
| A-005 | Save-state indicator can be derived from existing mutation lifecycle | API may not expose needed signals | Map API responses + loading state | Repo | Medium | ❓ | - | - |
| A-006 | Purchase Orders and Direct Intake are separate schema events | Compression could misrepresent accounting | Confirm with accounting SMEs | Strategy package | High | ❓ | - | - |
| A-007 | Ledger functionality exists and must be preserved | Missing ledger UI could be overlooked | Validate user flow matrix + accounting pages | USER_FLOW_MATRIX | High | ❓ | - | - |
| A-008 | Feature list in USER_FLOWS is comprehensive | Hidden features may be missed | Cross‑check with product owner + QA docs | USER_FLOWS | Medium | ❓ | - | - |
| A-009 | Bulk action undo is feasible for destructive changes | Some operations may be irreversible | Identify irreversible operations and note | UX doctrine | Medium | ❓ | - | - |
| A-010 | Validation timing (blur/commit) works for all modules | Some modules require immediate validation | Module‑level validation audit | UX doctrine | Medium | ❓ | - | - |
| A-011 | Work Surface shell can wrap accounting pages without harming usability | Accounting flows may require specialized forms | Pilot and compare completion times | Strategy package | Medium | ❓ | - | - |
| A-012 | Golden flows can be automated in E2E | E2E suite may be flaky or incomplete | Prototype 2 flows and evaluate | Repo | Medium | ❓ | - | - |
| A-013 | Repo reality matches docs for intake receipts | Missing UI links could exist | Trace UI entry points | Repo + QA docs | Medium | ❓ | - | - |
| A-014 | Active sessions do not conflict with doc updates | Potential merge conflicts | Recheck sessions before commit | ACTIVE_SESSIONS | Low | ❓ | - | - |
| A-015 | API-only flows marked unknown either have UI elsewhere or are intended API-only | Scope loss or missing UI surfacing | Validate with product owner + flow matrix | USER_FLOW_MATRIX | Medium | ❓ | - | - |
| A-016 | Intake receipt verification links and discrepancy workflows require explicit UX preservation | Verification regressions | Walk through intake receipt verification flow | Repo + QA docs | Medium | ❓ | - | - |
| A-017 | Ledger reversals/period lock requirements must be surfaced in UI patterns | Financial control gaps | Accounting SME review | MASTER_ROADMAP (REL-008) | Medium | ❓ | - | - |

---

## Red Hat QA Assumptions (2026-01-19)

| ID | Assumption | Risk if wrong | How to validate | Source | Confidence | Status | Validated By | Date |
|----|------------|---------------|-----------------|--------|------------|--------|--------------|------|
| A-018 | IndexedDB is available and sufficient for offline queue | Offline feature won't work | Browser compatibility matrix + storage quota testing | Web APIs | High | ❓ | - | - |
| A-019 | Schema already has `version` field for optimistic locking | Need schema migration | Check drizzle/schema.ts | Codebase exploration | High | ✅ | Red Hat QA | 2026-01-19 |
| A-020 | Session duration is configurable via server config | Cannot implement timeout warning | Check auth middleware | Codebase | Medium | ❓ | - | - |
| A-021 | AG Grid Community Edition supports required keyboard navigation | May need AG Grid Enterprise | Review AG Grid docs + test pilot | AG Grid docs | Medium | ❓ | - | - |
| A-022 | tRPC mutation lifecycle exposes enough state for save indicators | Custom middleware may be needed | Map tRPC hooks to save states | tRPC docs + repo | Medium | ❓ | - | - |
| A-023 | Existing DataTable and AG Grid can coexist in same codebase | Pattern fragmentation | Audit current usage + migration plan | Repo | High | ✅ | Red Hat QA | 2026-01-19 |
| A-024 | shadcn/ui Sheet component suitable for inspector panel | May need custom component | Test responsive behavior | Component library | High | ❓ | - | - |
| A-025 | Users accept 10-second undo window as sufficient | Users want longer/shorter window | User research + analytics | UX doctrine | Medium | ❓ | - | - |
| A-026 | 500 row bulk selection limit is acceptable | Power users need more | User interviews | UX doctrine | Low | ❓ | - | - |
| A-027 | Mobile usage is primarily read-only or quick updates | Full Work Surface needed on mobile | Usage analytics | Unknown | Low | ❓ | - | - |
| A-028 | Print functionality can use CSS @media print | Complex layouts may need PDF generation | Print preview testing | Web APIs | Medium | ❓ | - | - |
| A-029 | Existing toast library (Sonner) meets notification requirements | May need custom implementation | Review Sonner capabilities | Repo | High | ✅ | Red Hat QA | 2026-01-19 |
| A-030 | axe-core CI integration is sufficient for accessibility testing | Manual testing also required | Accessibility audit | Industry practice | High | ❓ | - | - |
| A-031 | Performance budgets can be enforced via Lighthouse CI | May need custom performance monitoring | CI/CD capabilities | DevOps | Medium | ❓ | - | - |
| A-032 | Concurrent edit conflicts are rare enough for optimistic locking | Need pessimistic locking | User behavior analysis | Unknown | Medium | ❓ | - | - |
| A-033 | Warehouse staff have reliable WiFi for most operations | Offline mode is P0 not P2 | Site survey | Operations | Low | ❓ | - | - |

---

## Codebase-Validated Facts (from Red Hat QA exploration)

These are not assumptions—they are verified facts from codebase analysis:

| Fact ID | Observation | Source File(s) | Implications |
|---------|-------------|----------------|--------------|
| F-001 | Schema has `version` field on most tables | drizzle/schema.ts | Optimistic locking is feasible |
| F-002 | AG Grid Community Edition is installed | package.json | Enterprise features unavailable |
| F-003 | Sonner is the toast library | client/src/components/ui/ | Customization may be limited |
| F-004 | tRPC React Query is the data layer | client/src/lib/trpc.ts | Mutation lifecycle available |
| F-005 | shadcn/ui Sheet component exists | client/src/components/ui/sheet.tsx | Inspector can use Sheet |
| F-006 | useKeyboardShortcuts hook exists | client/src/hooks/useKeyboardShortcuts.ts | Keyboard infra partially exists |
| F-007 | Soft delete pattern using `deletedAt` | drizzle/schema.ts | Undo can leverage soft delete |
| F-008 | 130+ tRPC routers exist | server/routers.ts | Complex API surface |
| F-009 | 60+ pages exist | client/src/pages/ | Large migration scope |
| F-010 | OrderCreatorPage has auto-save pattern | client/src/pages/OrderCreatorPage.tsx | Reference implementation exists |

---

## Validation Process

### How to Validate an Assumption

1. **Identify validator**: Who can definitively answer this?
   - Product Owner: Business logic, user needs
   - Accounting SME: Financial flows
   - Frontend Eng: Technical feasibility
   - User Research: User behavior

2. **Gather evidence**: What would confirm/deny this?
   - Code inspection
   - User interviews
   - Analytics data
   - SME consultation

3. **Update status**: Mark as ✅, ❌, or 🔄

4. **Document outcome**: Add validation notes and date

### Validation Cadence

- **P0 assumptions** (blocking deployment): Validate before implementation starts
- **P1 assumptions** (blocking GA): Validate during implementation
- **P2 assumptions** (nice to have): Validate opportunistically

---

## Assumption Invalidation Protocol

When an assumption is invalidated:

1. Update status to ❌
2. Document what was wrong
3. Assess impact on dependent tasks
4. Create corrective roadmap item if needed
5. Update RISK_REGISTER.md if new risk identified
6. Notify downstream consumers (agents, developers)

---

## Owner Assignments

| Assumption Category | Primary Owner | Backup |
|---------------------|---------------|--------|
| Business logic | Product Owner | PM |
| Financial flows | Accounting SME | CFO |
| Technical feasibility | Tech Lead | Senior Eng |
| User behavior | UX Researcher | Product Owner |
| Infrastructure | DevOps | Tech Lead |
