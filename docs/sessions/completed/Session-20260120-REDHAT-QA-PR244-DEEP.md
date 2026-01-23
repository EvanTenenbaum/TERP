# Session: REDHAT-QA-PR244-DEEP - Expert Red Hat QA Review of PR #244

**Status**: Complete
**Started**: 2026-01-20
**Agent Type**: Opus 4.5 (Expert TERP QA)
**Session ID**: review-terp-pr-244-amkqa

## Executive Summary

This session performs a comprehensive adversarial "Red Hat" QA review of PR #244, which integrates UX Work Surface documentation and atomic roadmap tasks into the TERP master roadmap. As an expert in the TERP codebase and product, this review identifies critical gaps, ambiguities, and missing safeguards across all documentation changes.

**PR #244 Changes Reviewed:**
- `docs/roadmaps/MASTER_ROADMAP.md` (+58, -3)
- `docs/specs/ui-ux-strategy/ATOMIC_ROADMAP.md` (+37, -33)
- `docs/specs/ui-ux-strategy/WORK_SURFACE_HANDOFF_REPORT.md` (updates)
- `docs/sessions/completed/Session-20260120-DOCS-UX-US-PLAN-*.md` (new)

---

## Critical Findings Summary

| Severity | Count | Category |
|----------|-------|----------|
| **CRITICAL** | 4 | Blocking issues requiring immediate resolution |
| **HIGH** | 8 | Significant gaps affecting implementation success |
| **MEDIUM** | 12 | Improvements needed for production readiness |
| **LOW** | 6 | Nice-to-have enhancements |

---

## CRITICAL Findings (Blocking)

### C-001: RBAC Validation Not Mapped to Golden Flows

**Finding**: Golden flows (GF-001 through GF-008) specify entry points and steps but do not map required RBAC permissions per flow.

**Risk**: Developers may implement Work Surfaces that break for users with insufficient permissions, causing production incidents.

**Evidence**: `WORK_SURFACE_HANDOFF_REPORT.md:279-291` lists golden flows without permission requirements.

**Required Fix**: Add RBAC permission matrix to each golden flow:

| Flow | Required Permissions | Owning Roles |
|------|---------------------|--------------|
| GF-001 Direct Intake | `inventory:write`, `batches:create` | Inventory, Super Admin |
| GF-002 Standard PO | `purchase_orders:write` | Inventory, Purchasing |
| GF-003 Sales Order | `orders:write`, `inventory:read` | Sales Rep, Sales Manager |
| GF-004 Invoice & Payment | `invoices:write`, `payments:write` | Accounting |
| GF-005 Pick & Pack | `pick_pack:write`, `inventory:write` | Fulfillment |
| GF-006 Client Ledger | `clients:read`, `ledger:read` | Sales Rep, Accounting |
| GF-007 Inventory Adjust | `inventory:write` | Inventory |
| GF-008 Sample Request | `samples:write` | Sales Rep, Sales Manager |

### C-002: Modal Replacement Inventory Missing

**Finding**: The strategy bans modals in core flows but provides no inventory of existing modals that must be replaced.

**Risk**: Implementation teams will not know which modals to retire, leading to doctrine violations remaining in production.

**Evidence**: `ATOMIC_UX_STRATEGY.md:103` states "No core-flow modals" but no audit exists.

**Required Fix**: Add modal replacement inventory to `ATOMIC_ROADMAP.md`:

| Module | Current Modal | Replacement Pattern | Task ID |
|--------|--------------|---------------------|---------|
| Intake | BatchCreateDialog | Inspector panel | UXS-201 |
| Intake | VendorCreateDialog | Quick-create inline | UXS-201 |
| Orders | LineItemEditDialog | Inspector panel | UXS-301 |
| Orders | DiscountDialog | Inline cell + inspector | UXS-301 |
| Inventory | AdjustmentDialog | Inspector panel | UXS-401 |
| Pick/Pack | AssignDialog | Bulk action bar | UXS-402 |
| Accounting | PaymentDialog | Inspector panel | UXS-501 |

### C-003: Feature Flag Rollout Strategy Undefined

**Finding**: No feature flag strategy for Work Surface rollout exists despite TERP having a mature feature flag system.

**Risk**: Work Surfaces cannot be safely rolled back if production issues arise; no gradual rollout possible.

**Evidence**: TERP has 15 feature flags (per `MASTER_ROADMAP.md:144-149`) but UXS tasks don't reference flags.

**Required Fix**: Define feature flags for Work Surface rollout:

```
WORK_SURFACE_INTAKE (default: false)
WORK_SURFACE_ORDERS (default: false)
WORK_SURFACE_INVENTORY (default: false)
WORK_SURFACE_PICK_PACK (default: false)
WORK_SURFACE_ACCOUNTING (default: false)
```

Each UXS-2xx/3xx/4xx/5xx task must include feature flag integration.

### C-004: Concurrent Edit Policy Unresolved

**Finding**: `ATOMIC_ROADMAP.md:636-637` marks conflict resolution as an open question, but UXS-705 is marked "ready" for implementation.

**Risk**: Implementing concurrent edit detection without policy will cause inconsistent behavior.

**Evidence**: Line 637: "**Conflict resolution**: Should conflicts auto-resolve (last-write-wins) or always prompt user?"

**Required Fix**: Document decision or block UXS-705 until resolved:

**Recommended Policy:**
- **Inventory quantities**: Always prompt (financial risk)
- **Order line items**: Always prompt (customer impact)
- **Notes/comments**: Last-write-wins (low risk)
- **Status fields**: Last-write-wins (operational speed)

---

## HIGH Severity Findings

### H-001: UXS Task Dependencies Not Enforced in Master Roadmap

**Finding**: Master Roadmap adds UXS tasks but doesn't integrate them into the dependency graph with existing reliability tasks.

**Risk**: REL-* tasks that affect optimistic locking (REL-004, REL-006) may not be completed before UXS-705 (concurrent edit detection), causing conflicts.

**Required Fix**: Add dependency matrix:

| UXS Task | Depends On | Blocks |
|----------|-----------|--------|
| UXS-705 | REL-004, REL-006 | UXS-201..502 |
| UXS-707 | REL-007 | None |
| UXS-501..502 | REL-008 | None |

### H-002: Beta Summary Totals Incorrect

**Finding**: Master Roadmap Beta Summary shows 17 open items, but adding UXS tasks should increase this.

**Evidence**: `MASTER_ROADMAP.md:708-711` shows only REL-* tasks in Beta; UXS BETA tasks (UXS-702, UXS-706) not counted.

**Required Fix**: Update Beta Summary to include UXS BETA tasks:

| Category | Completed | Open | Total |
|----------|-----------|------|-------|
| Reliability Program | 0 | 17 | 17 |
| UX Work Surface (BETA) | 0 | 2 | 2 |
| **TOTAL** | **0** | **19** | **19** |

### H-003: Mobile Priority Modules Missing Implementation Criteria

**Finding**: Mobile priority modules (Inventory, Accounting, Todo, Dashboard) are identified but no acceptance criteria for "mobile-ready" exist.

**Risk**: "Done" definition is ambiguous; modules may ship with broken mobile layouts.

**Required Fix**: Define mobile acceptance criteria:

- [ ] Single-column card layout renders at <768px
- [ ] Touch targets are 44x44px minimum
- [ ] No horizontal scrolling required
- [ ] Inspector opens as full-screen sheet
- [ ] Key actions accessible without scrolling
- [ ] Performance: <3s TTI on 3G network

### H-004: Export/Bulk Limits Still Unconfirmed

**Finding**: `ATOMIC_ROADMAP.md:639-640` marks export (10K rows) and bulk (500 selection) limits as requiring product confirmation, but UXS-803 is marked "ready".

**Risk**: Implementing limits without confirmation may frustrate power users or cause performance issues.

**Required Fix**: Mark UXS-803 as "blocked" until product confirms limits, or document limits as provisional with easy-change architecture.

### H-005: Test Plan Gaps for E2E Golden Flow Validation

**Finding**: UXS-602 specifies "Tests cover top 8 golden flows" but doesn't specify RBAC coverage.

**Evidence**: `ATOMIC_ROADMAP.md:302-308` mentions E2E but not per-role testing.

**Required Fix**: Add requirement: "Each golden flow validated under at least one RBAC role that owns the flow."

### H-006: VIP Portal Scope Still Undefined

**Finding**: `ATOMIC_ROADMAP.md:646` asks if VIP portal should be redesigned, but VIP has 8 pages with P1 features.

**Risk**: VIP portal UX may diverge from main application, causing user confusion.

**Required Fix**: Document VIP scope decision:
- **Option A**: Full Work Surface patterns (4-6 weeks effort)
- **Option B**: Light touch (keyboard contracts only, 1-2 weeks)
- **Option C**: Post-launch (defer to beta)

### H-007: Schema Drift Risk Not Addressed

**Finding**: No mention of Work Surface data migration or schema impact.

**Risk**: New UI patterns may require database changes not planned in roadmap.

**Evidence**: TERP has complex schema (258KB) with many relationships.

**Required Fix**: Add verification to UXS-001: "Confirm no schema changes required for Work Surface implementation."

### H-008: Performance Budgets Not Integrated with Monitoring

**Finding**: `ATOMIC_UX_STRATEGY.md:700-717` defines performance budgets but doesn't reference existing Sentry integration.

**Risk**: Performance regressions won't be detected.

**Required Fix**: Add to UXS-802: "Integrate performance marks with existing Sentry monitoring (per MASTER_ROADMAP.md:68, ST-008)."

---

## MEDIUM Severity Findings

### M-001: Responsive Breakpoints Missing Between-State Behavior

**Finding**: Breakpoints defined but transition behavior at boundaries undefined.

**Required Fix**: Add "At breakpoint boundaries, use smaller layout (e.g., 1440px shows 1280px layout if browser chrome affects width)."

### M-002: Keyboard Contract Exceptions Not Documented

**Finding**: Some modules may have legitimate exceptions (e.g., AG Grid has its own keyboard behavior).

**Required Fix**: Add exceptions process to `PATTERN_APPLICATION_PLAYBOOK.md:89`.

### M-003: Undo Infrastructure Missing Server Integration

**Finding**: UXS-707 describes client-side undo but doesn't address server-side soft-delete timing.

**Required Fix**: Clarify: "Server-side delete only commits after 10s undo window expires; use pending delete status."

### M-004: Empty State Components Missing Error Variants

**Finding**: UXS-901 lists 3 empty state types but `ATOMIC_UX_STRATEGY.md:476-488` lists 4.

**Required Fix**: Align to 4 variants: No data, No results, Filtered empty, Error state.

### M-005: Toast Standardization Missing Undo Toasts

**Finding**: UXS-902 doesn't explicitly include undo toast pattern.

**Required Fix**: Add undo toast to acceptance criteria: "Destructive action toast includes 'Undo' button with 10s countdown."

### M-006: Print Stylesheet Missing Header Repeat

**Finding**: UXS-903 mentions page breaks but not header repetition.

**Required Fix**: Add acceptance criteria: "Context header repeats on each printed page."

### M-007: Missing Integration Test Requirements

**Finding**: Task test plans focus on E2E but not integration tests.

**Required Fix**: Add integration test requirement for hooks: "Unit + integration tests for useKeyboardContract, useSaveState, useValidationTiming."

### M-008: Accessibility Audit Scope Unclear

**Finding**: UXS-801 mentions axe-core but scope unclear (all pages vs Work Surface only).

**Required Fix**: Clarify: "Initial audit scoped to Work Surface components; full app audit follows."

### M-009: Loading Skeleton Minimum Display Time Inconsistent

**Finding**: `ATOMIC_UX_STRATEGY.md:399` says 200ms but some implementations use 0ms.

**Required Fix**: Add to UXS-703: "Minimum skeleton display time: 200ms (prevents flash)."

### M-010: Save State Indicator Missing Offline State

**Finding**: Only 3 states defined but offline support adds "Queued" state.

**Required Fix**: Clarify: "4th state (🟠 Queued) only appears when offline infrastructure (UXS-702) is enabled."

### M-011: Command Palette Scope Enforcement Missing Tests

**Finding**: UXS-603 describes enforcement but no test specification.

**Required Fix**: Add test: "E2E test verifies Cmd+K does not open when focus is in editable grid cell."

### M-012: Inspector Panel Shell Missing Animation Tokens

**Finding**: UXS-103 doesn't reference animation specifications from playbook.

**Required Fix**: Add dependency: "Inspector animations must follow PATTERN_APPLICATION_PLAYBOOK.md Section 12."

---

## LOW Severity Findings

### L-001: Version Numbers Inconsistent

**Finding**: MASTER_ROADMAP.md is v6.2, but last updated date is Jan 16 while UXS changes are Jan 20.

**Required Fix**: Update version to 6.3 and date to Jan 20.

### L-002: Session Documentation Incomplete

**Finding**: PR adds session file but path in PR differs from actual structure.

**Required Fix**: Verify session file exists at documented path.

### L-003: Open Questions Section Partially Resolved

**Finding**: Some questions marked resolved but not removed from "Open Questions."

**Required Fix**: Move resolved questions to "Resolved Questions" section.

### L-004: Module Coverage Table Missing VIP

**Finding**: Module coverage table doesn't explicitly show VIP portal status.

**Required Fix**: Add VIP row to module coverage table.

### L-005: Dependency Graph Summary Outdated

**Finding**: Dependency graph doesn't include all Layer 7-9 tasks.

**Required Fix**: Update graph to include UXS-701..904 dependencies.

### L-006: Change Log Missing This Update

**Finding**: FEATURE_PRESERVATION_MATRIX change log doesn't include PR #244 changes.

**Required Fix**: Add entry for PR #244 updates.

---

## Recommended Improvements Applied

The following improvements have been made to the PR documentation:

### 1. MASTER_ROADMAP.md Improvements

- Added RBAC validation checkpoints to UXS section
- Updated Beta summary to include UXS BETA tasks
- Added cross-references to feature flag requirements
- Updated version and date

### 2. ATOMIC_ROADMAP.md Improvements

- Added modal replacement inventory
- Added RBAC permission requirements to golden flow regression suite (UXS-602)
- Clarified concurrent edit policy recommendation
- Added feature flag integration requirement to all module tasks
- Updated dependency graph to include REL-* task dependencies
- Marked blocked tasks appropriately

### 3. WORK_SURFACE_HANDOFF_REPORT.md Improvements

- Added RBAC permission matrix per golden flow
- Added feature flag rollout strategy section
- Added modal replacement planning section
- Clarified VIP portal scope options
- Added data migration verification checklist

### 4. New Validation Artifacts

- Created this Red Hat QA report as session documentation
- Updated ASSUMPTION_LOG.md with new validated assumptions
- Added risks to RISK_REGISTER.md for identified gaps

---

## Codebase-Validated Implementation Guidance

Based on deep analysis of the TERP codebase, here are implementation notes for key UXS tasks:

### UXS-101: Keyboard Contract Hook

**Existing Infrastructure:**
- `client/src/hooks/useKeyboardShortcuts.ts` - Global shortcuts (extend, don't replace)
- AG Grid has native keyboard: Tab, Enter, Esc work but need standardization

**Implementation Path:**
```typescript
// Recommended: Create useWorkSurfaceKeyboard.ts
export const useWorkSurfaceKeyboard = ({
  onRowCommit,
  onCancel,
  onUndo,
}: WorkSurfaceKeyboardOptions) => {
  // Wrap existing shortcuts, add Work Surface-specific behavior
};
```

### UXS-102: Save State Indicator

**Existing Infrastructure:**
- `useAppMutation.ts` provides `isLoading`, `isError`, `isSuccess`
- Sonner toasts used for feedback but not persistent indicators

**Implementation Path:**
```typescript
// Add to client/src/components/work-surface/SaveStateIndicator.tsx
type SaveState = 'saved' | 'saving' | 'error' | 'queued';
```

### UXS-103: Inspector Panel Shell

**Existing Infrastructure:**
- `client/src/components/ui/drawer.tsx` - Sheet component from shadcn/ui
- `useOptimisticLocking.tsx` - Conflict handling exists

**Implementation Path:**
Use Sheet component as base; add:
- Fixed widths for breakpoints
- Audit history section integration
- Actions footer pattern

### UXS-705: Concurrent Edit Detection

**Existing Infrastructure:**
- Schema has `version` field on most tables
- `server/_core/optimisticLocking.ts` exists
- `useOptimisticLocking.tsx` has ConflictDialog

**Implementation Path:**
Extend existing hook with:
- Per-field conflict tracking
- Merge vs overwrite options
- Audit logging for conflicts

---

## Handoff Notes

### For Implementation Teams

1. **Start with UXS-101/102/103** - These are foundational; all other tasks depend on them
2. **Feature flag everything** - Use existing feature flag system for safe rollout
3. **Test with QA Auth** - Use QA auth system (AUTH-QA-001) for role-specific testing
4. **Reference existing patterns** - OrderCreatorPage.tsx has auto-save; IntakeGrid.tsx has AG Grid patterns

### Blocked Items Requiring Product Decision

1. Concurrent edit policy (C-004) - Need decision before UXS-705
2. Export/bulk limits (H-004) - Need confirmation before UXS-803
3. VIP portal scope (H-006) - Need decision for planning

### Outstanding Validation Required

1. Mobile module acceptance criteria (H-003) - Need UX sign-off
2. AG Grid keyboard compatibility (A-021) - Need pilot testing
3. Print functionality feasibility (A-028) - Need browser testing

---

## Files Modified in This Session

1. `docs/roadmaps/MASTER_ROADMAP.md` - UXS section improvements
2. `docs/specs/ui-ux-strategy/ATOMIC_ROADMAP.md` - Gap fixes and clarifications
3. `docs/specs/ui-ux-strategy/WORK_SURFACE_HANDOFF_REPORT.md` - RBAC and rollout additions
4. `docs/specs/ui-ux-strategy/ASSUMPTION_LOG.md` - New assumptions
5. `docs/specs/ui-ux-strategy/RISK_REGISTER.md` - New risks
6. `docs/sessions/completed/Session-20260120-REDHAT-QA-PR244-DEEP.md` - This file

---

**Session Complete**
