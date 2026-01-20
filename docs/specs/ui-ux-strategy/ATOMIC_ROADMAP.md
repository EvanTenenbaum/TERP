# ATOMIC_ROADMAP.md

> **Purpose**: Dependency‑safe, PR‑sized implementation order for UX strategy rollout. This is _not_ a release plan.

## Layer 0 — Alignment + Inventory + Scaffolding

### UXS-001 — Create feature preservation matrix baseline

- **Goal**: Establish canonical feature list to prevent scope loss.
- **Why**: Feature preservation is non‑negotiable.
- **Exact scope**: Populate FEATURE_PRESERVATION_MATRIX.md with features from strategy package + repo + flow matrix.
- **Acceptance criteria**:
  - Matrix contains all DF‑001..DF‑070 + ledger/invoice/payment flows.
  - Each item has Status = confirmed/unknown/missing.
- **Files likely touched**: docs/specs/ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md
- **Dependencies**: None
- **Risks**: Missing edge‑case flows.
- **Test plan**: Manual checklist against flow matrix.
- **Rollback plan**: Revert matrix file.

### UXS-002 — Define system primitives + constraints

- **Goal**: Document primitives, guarantees, and boundaries.
- **Why**: Agents need unambiguous building blocks.
- **Exact scope**: Complete ATOMIC_UX_STRATEGY.md primitives section.
- **Acceptance criteria**:
  - Each primitive includes problem, guarantees, tradeoffs, metrics, applies/does‑not‑apply.
- **Files likely touched**: docs/specs/ui-ux-strategy/ATOMIC_UX_STRATEGY.md
- **Dependencies**: UXS-001
- **Risks**: Incomplete primitive definitions.
- **Test plan**: Peer review against doctrine + pattern registry.
- **Rollback plan**: Revert primitive section.

### UXS-003 — Publish pattern application playbook

- **Goal**: Provide decision rules for pattern use.
- **Why**: Prevent UX drift.
- **Exact scope**: Decision tree + rules for Grid vs Form vs Panel, Cmd+K, progressive disclosure, defaults.
- **Acceptance criteria**:
  - Playbook includes rule set and decision tree.
- **Files likely touched**: docs/specs/ui-ux-strategy/PATTERN_APPLICATION_PLAYBOOK.md
- **Dependencies**: UXS-002
- **Risks**: Ambiguous rules.
- **Test plan**: Apply to two modules (Intake + Orders) as examples.
- **Rollback plan**: Revert playbook.

### UXS-004 — Risk + assumption registry

- **Goal**: Explicitly document assumptions and risks.
- **Why**: Required for skeptical QA and safe rollout.
- **Exact scope**: Populate ASSUMPTION_LOG.md and RISK_REGISTER.md.
- **Acceptance criteria**:
  - Each assumption includes validation path.
  - Risk register includes required risks.
- **Files likely touched**: docs/specs/ui-ux-strategy/ASSUMPTION_LOG.md, docs/specs/ui-ux-strategy/RISK_REGISTER.md
- **Dependencies**: UXS-001
- **Risks**: Missing a required risk type.
- **Test plan**: Checklist against strategy package requirements.
- **Rollback plan**: Revert files.

### UXS-005 — Unknown feature validation audit

- **Goal**: Resolve API‑only/unknown UI flows in preservation matrix.
- **Why**: Prevent silent scope loss during redesign.
- **Exact scope**: Review all rows marked **unknown** and confirm UI surface or intended API‑only status.
- **Acceptance criteria**:
  - Each unknown row updated to confirmed or explicitly API‑only with rationale.
  - Validation notes added to ASSUMPTION_LOG.md.
- **Files likely touched**: docs/specs/ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md, docs/specs/ui-ux-strategy/ASSUMPTION_LOG.md
- **Dependencies**: UXS-001
- **Risks**: Missing stakeholder input.
- **Test plan**: Spot‑check against USER_FLOW_MATRIX + SME review.
- **Rollback plan**: Revert matrix entries.

### UXS-006 — Ledger + intake verification UX audit

- **Goal**: Validate ledger reversals/period lock requirements and intake receipt verification workflows.
- **Why**: Financial and compliance surfaces are high‑risk.
- **Exact scope**: Map ledger UX needs (reversals, period locks) and intake receipt public verification + discrepancy resolution to UI patterns.
- **Acceptance criteria**:
  - Ledger requirements documented with UI mapping.
  - Intake receipts verification flow mapped and preserved.
- **Files likely touched**: docs/specs/ui-ux-strategy/ATOMIC_UX_STRATEGY.md, docs/specs/ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md
- **Dependencies**: UXS-001
- **Risks**: Accounting SME availability.
- **Test plan**: Manual walkthrough of ledger flows + intake receipts.
- **Rollback plan**: Revert documentation changes.

---

## Layer 1 — Core Primitives (Shared Infrastructure)

### UXS-101 — Keyboard contract hook

- **Goal**: Implement shared keyboard behavior for Work Surfaces.
- **Why**: Consistency across modules.
- **Exact scope**: Add a shared hook and constants for Tab/Enter/Esc behavior.
- **Acceptance criteria**:
  - Work Surface components use the shared hook.
  - Tab/Enter/Esc behavior consistent in at least 1 pilot surface.
- **Files likely touched**: client/src/components/work-surface/_, client/src/hooks/_
- **Dependencies**: UXS-002
- **Risks**: Conflicts with existing grid key handling.
- **Test plan**: Keyboard E2E test in pilot module.
- **Rollback plan**: Feature flag keyboard hook.

### UXS-102 — Save‑state indicator component

- **Goal**: Standardize Saved/Saving/Needs attention indicator.
- **Why**: User trust + doctrine compliance.
- **Exact scope**: Add reusable component + status contract.
- **Acceptance criteria**:
  - Component supports 3 states only.
  - Integrated into pilot Work Surface.
- **Files likely touched**: client/src/components/ui/_, client/src/components/work-surface/_
- **Dependencies**: UXS-101
- **Risks**: Inconsistent status signals from API.
- **Test plan**: Unit tests for component + integration check.
- **Rollback plan**: Remove component usage.

### UXS-103 — Inspector panel shell

- **Goal**: Provide non‑modal inspector scaffold.
- **Why**: Consistent complex editing pattern.
- **Exact scope**: Create base inspector component with close/esc handling.
- **Acceptance criteria**:
  - Inspector does not block grid and closes on Esc.
- **Files likely touched**: client/src/components/work-surface/InspectorPanel.tsx
- **Dependencies**: UXS-101
- **Risks**: Interaction conflicts with existing dialogs.
- **Test plan**: E2E focus test.
- **Rollback plan**: Revert to existing panel/drawer components.

### UXS-104 — Inline validation timing contract

- **Goal**: Provide reusable validation timing helper.
- **Why**: “Reward early, punish late” enforcement.
- **Exact scope**: Shared helper for blur/commit validation timing.
- **Acceptance criteria**:
  - Field errors do not appear while typing.
- **Files likely touched**: client/src/hooks/_, client/src/components/forms/_
- **Dependencies**: UXS-101
- **Risks**: Existing form libs may conflict.
- **Test plan**: Unit tests for timing helper.
- **Rollback plan**: Disable helper on offending fields.

---

## Layer 2 — Intake / PO Pilot (Primary Work Surface)

### UXS-201 — Direct Intake Work Surface pilot

- **Goal**: Build Work Surface shell for Direct Intake.
- **Why**: Primary high‑velocity workflow.
- **Exact scope**: Shell layout + sticky header + grid + inspector + status.
- **Acceptance criteria**:
  - Header remains sticky; grid supports row creation; inspector opens on selection.
- **Files likely touched**: client/src/pages/SpreadsheetViewPage.tsx, client/src/components/spreadsheet/IntakeGrid.tsx
- **Dependencies**: UXS-101..104
- **Risks**: AG Grid integration with shared keyboard handling.
- **Test plan**: E2E intake happy path.
- **Rollback plan**: Feature flag to old intake UI.

### UXS-202 — Standard PO Work Surface alignment

- **Goal**: Align Purchase Orders page with Work Surface primitives.
- **Why**: Keep PO and Direct Intake consistent.
- **Exact scope**: Introduce Work Surface shell without changing data model.
- **Acceptance criteria**:
  - Same keyboard contract as Direct Intake.
- **Files likely touched**: client/src/pages/PurchaseOrdersPage.tsx
- **Dependencies**: UXS-201
- **Risks**: PO features regression.
- **Test plan**: PO create/edit flows in E2E.
- **Rollback plan**: Revert to existing layout.

### UXS-203 — Intake/PO decision logic banner

- **Goal**: Explicitly differentiate Direct Intake vs Standard PO.
- **Why**: Prevent user confusion.
- **Exact scope**: Mode switcher + explanation in header.
- **Acceptance criteria**:
  - Mode selection persists; status rules applied.
- **Files likely touched**: client/src/pages/SpreadsheetViewPage.tsx, client/src/pages/PurchaseOrdersPage.tsx
- **Dependencies**: UXS-201
- **Risks**: Mislabeling status.
- **Test plan**: Manual check of mode outputs.
- **Rollback plan**: Remove mode switcher.

---

## Layer 3 — Sales / Orders Adaptation

### UXS-301 — Orders Work Surface shell

- **Goal**: Apply Work Surface to orders list + line items.
- **Why**: Orders are high‑frequency execution.
- **Exact scope**: Layout + status bar + inspector stub.
- **Acceptance criteria**:
  - Orders grid uses keyboard contract and save‑state indicator.
- **Files likely touched**: client/src/pages/Orders.tsx, client/src/components/orders/\*
- **Dependencies**: UXS-101..104
- **Risks**: Existing order preview logic conflict.
- **Test plan**: Orders E2E happy path.
- **Rollback plan**: Feature flag Work Surface layout.

### UXS-302 — Quotes + Sales Sheet alignment

- **Goal**: Align quotes/sales sheets with Work Surface primitives where applicable.
- **Why**: Consistent sales flow.
- **Exact scope**: Shared header + status bar + keyboard contract for quotes and sales sheets.
- **Acceptance criteria**:
  - Same Tab/Enter/Esc behavior.
- **Files likely touched**: client/src/pages/SalesSheetCreatorPage.tsx, client/src/pages/QuotesPage.tsx (if exists)
- **Dependencies**: UXS-301
- **Risks**: Legacy templates might not fit Work Surface.
- **Test plan**: Quote create + sales sheet edit flow.
- **Rollback plan**: Revert layout changes.

---

## Layer 4 — Inventory / Pick‑Pack Adaptation

### UXS-401 — Inventory Work Surface alignment

- **Goal**: Align inventory adjustment and batch views to Work Surface.
- **Why**: Inventory is a critical high‑frequency domain.
- **Exact scope**: Add status bar + inspector linkage + keyboard contract.
- **Acceptance criteria**:
  - Inventory grid uses shared keymap and validation timing.
- **Files likely touched**: client/src/pages/Inventory.tsx, client/src/components/inventory/\*
- **Dependencies**: UXS-101..104
- **Risks**: Batch detail drawer conflict.
- **Test plan**: Inventory adjust + batch edit flow.
- **Rollback plan**: Revert to existing drawer.

### UXS-402 — Pick & Pack Work Surface alignment

- **Goal**: Apply Work Surface in fulfillment module.
- **Why**: Pick/pack is bulk action heavy.
- **Exact scope**: Selection model + bulk action bar + inspector.
- **Acceptance criteria**:
  - Bulk actions visible and undo available.
- **Files likely touched**: client/src/pages/PickPackPage.tsx, client/src/components/spreadsheet/PickPackGrid.tsx
- **Dependencies**: UXS-401
- **Risks**: Bulk action confusion.
- **Test plan**: Pick/pack multi‑select E2E.
- **Rollback plan**: Feature flag bulk action bar.

---

## Layer 5 — Ledger / Accounting Adaptation

### UXS-501 — Accounting module Work Surface alignment

- **Goal**: Apply Work Surface primitives to accounting tables.
- **Why**: Ledger and AR/AP require consistent keyboard + save state.
- **Exact scope**: Status bar + inspector for invoices/payments/bills.
- **Acceptance criteria**:
  - Save state visible; inspector opens on row selection.
- **Files likely touched**: client/src/pages/accounting/\*
- **Dependencies**: UXS-101..104
- **Risks**: Complex accounting forms.
- **Test plan**: Invoice create + payment record flow.
- **Rollback plan**: Revert inspector usage.

### UXS-502 — Client ledger Work Surface alignment

- **Goal**: Ensure Client Ledger page follows Work Surface contracts.
- **Why**: Financial trust requires consistent behavior.
- **Exact scope**: Keyboard contract + status bar + inspector for ledger entries.
- **Acceptance criteria**:
  - Keyboard map consistent with other modules.
- **Files likely touched**: client/src/pages/ClientLedger.tsx
- **Dependencies**: UXS-501
- **Risks**: Ledger data density.
- **Test plan**: Client ledger navigation + entry selection.
- **Rollback plan**: Revert to current layout.

---

## Layer 6 — Regression Hardening + Modal Retirement

### UXS-601 — Modal audit + retirement plan

- **Goal**: Identify and remove core‑flow modals in Work Surfaces.
- **Why**: Doctrine bans modal‑heavy workflows.
- **Exact scope**: Inventory, intake, orders, pick/pack modal audit and replacement with inspector/inline.
- **Acceptance criteria**:
  - No nested modal usage in core flows.
- **Files likely touched**: client/src/components/inventory/_, client/src/components/orders/_
- **Dependencies**: UXS-201..502
- **Risks**: Missing functionality hidden in modals.
- **Test plan**: Golden flow checks for each module.
- **Rollback plan**: Restore modal for impacted flow.

### UXS-602 — Golden flow regression suite

- **Goal**: Verify must‑not‑break flows across modules.
- **Why**: Feature preservation enforcement.
- **Exact scope**: Define automated checks for intake, order, pick/pack, invoice, ledger, and samples flows.
- **Acceptance criteria**:
  - Tests cover top 8 golden flows (GF-001 through GF-008) with pass criteria.
  - Each golden flow validated under at least one RBAC role that owns the flow.
  - Modal replacement list documented with inspector/inline equivalents.
- **RBAC Test Matrix**:
  | Flow | Test Role | Required Permissions |
  |------|-----------|---------------------|
  | GF-001 | Inventory | `inventory:write`, `batches:create` |
  | GF-002 | Inventory | `purchase_orders:write` |
  | GF-003 | Sales Rep | `orders:write`, `inventory:read` |
  | GF-004 | Accounting | `invoices:write`, `payments:write` |
  | GF-005 | Fulfillment | `pick_pack:write`, `inventory:write` |
  | GF-006 | Sales Rep | `clients:read`, `ledger:read` |
  | GF-007 | Inventory | `inventory:write` |
  | GF-008 | Sales Rep | `samples:write` |
- **Files likely touched**: tests-e2e/_, docs/specs/ui-ux-strategy/_
- **Dependencies**: UXS-601
- **Risks**: E2E flakiness; RBAC role availability in test environment.
- **Test plan**: Run test suite in CI; use QA Auth system (AUTH-QA-001) for role switching.
- **Rollback plan**: Revert failing test additions.

### UXS-603 — Command palette scope enforcement

- **Goal**: Prevent Cmd+K from becoming field selection/search.
- **Why**: Competing search models undermine UX doctrine.
- **Exact scope**: Add tests/docs to ensure Cmd+K only performs actions/navigation.
- **Acceptance criteria**:
  - Cmd+K does not open field selectors.
  - Local search/typeahead remain primary for grid selection.
- **Files likely touched**: client/src/components/command-palette/_, tests-e2e/_
- **Dependencies**: UXS-003
- **Risks**: Existing shortcut conflicts.
- **Test plan**: E2E test covering Cmd+K usage + local search usage.
- **Rollback plan**: Remove new tests/constraints if they block release.

---

## Layer 7 — Technical Infrastructure (Red Hat QA Additions)

> Tasks identified through comprehensive red-hat adversarial review on 2026-01-19.

### UXS-701 — Responsive breakpoint system

- **Goal**: Ensure Work Surfaces adapt to different screen sizes.
- **Why**: Warehouse tablets, sales rep phones require adaptive layouts.
- **Exact scope**: Implement breakpoint-aware Work Surface shell with responsive inspector behavior.
- **Mobile Priority Modules** (per product decision):
  1. **Inventory** - P1: Quick stock checks, batch lookups
  2. **Accounting** - P1: AR/AP overview, quick payments
  3. **Todo/Tasks** - P1: Task management on the go
  4. **Dashboard** - P1: KPI visibility, alerts
- **Acceptance criteria**:
  - Desktop (≥1280px): Grid + inspector side-by-side
  - Tablet (768-1279px): Inspector as slide-over sheet
  - Mobile (<768px): Single-column card layout for priority modules
- **Files likely touched**: client/src/components/work-surface/WorkSurfaceShell.tsx, client/src/hooks/useBreakpoint.ts
- **Dependencies**: UXS-103
- **Risks**: AG Grid responsiveness limitations.
- **Test plan**: Visual regression tests at each breakpoint.
- **Rollback plan**: Default to desktop-only layout.

### UXS-702 — Offline queue + sync infrastructure ⚠️ BETA PRIORITY

- **Goal**: Prevent data loss during network failures.
- **Why**: Field operations may have spotty connectivity.
- **Priority**: **BETA (P2)** - Per product decision, offline support is not required for initial release. Deprioritized to beta phase.
- **Exact scope**: IndexedDB-backed mutation queue with sync status indicator.
- **Acceptance criteria**:
  - Mutations queued when offline
  - Sync status shown in status bar (🟠 Queued indicator)
  - Automatic retry on reconnection
- **Files likely touched**: client/src/lib/offlineQueue.ts, client/src/hooks/useOfflineSync.ts, client/src/components/ui/SaveStateIndicator.tsx
- **Dependencies**: UXS-102
- **Risks**: Conflict resolution complexity.
- **Test plan**: Simulate offline, queue mutations, verify sync on reconnect.
- **Rollback plan**: Disable offline mode via feature flag.

### UXS-703 — Loading skeleton components

- **Goal**: Provide consistent loading states across Work Surfaces.
- **Why**: Perceived performance improvement; prevents layout shift.
- **Exact scope**: Skeleton components for grid, inspector, context header.
- **Acceptance criteria**:
  - Skeletons match actual content layout
  - Minimum display time of 200ms (prevent flash)
  - Animation respects prefers-reduced-motion
- **Files likely touched**: client/src/components/ui/Skeleton.tsx, client/src/components/work-surface/GridSkeleton.tsx
- **Dependencies**: None
- **Risks**: Maintenance burden if layouts change.
- **Test plan**: Visual snapshot tests.
- **Rollback plan**: Revert to spinner-only loading.

### UXS-704 — Error boundary wrapper

- **Goal**: Graceful error handling in Work Surfaces.
- **Why**: Prevent full page crashes from component errors.
- **Exact scope**: Error boundary component with retry capability.
- **Acceptance criteria**:
  - Component errors caught and displayed inline
  - Retry button available
  - Error reported to monitoring
- **Files likely touched**: client/src/components/ErrorBoundary.tsx, client/src/components/work-surface/WorkSurfaceErrorBoundary.tsx
- **Dependencies**: None
- **Risks**: Error boundary hiding underlying bugs.
- **Test plan**: Intentionally throw error in test component.
- **Rollback plan**: Remove boundary (errors bubble to page level).

### UXS-705 — Concurrent edit detection ✅ UNBLOCKED

- **Goal**: Prevent data overwrites when multiple users edit same record.
- **Why**: ERP data integrity is critical.
- **Exact scope**: Version field comparison on save; conflict dialog with customizable policies.
- **Status**: **READY** (Product decision received 2026-01-20)
- **Acceptance criteria**:
  - Stale version detected before save
  - User prompted with conflict resolution options (for prompt-policy fields)
  - Auto-resolve for last-write-wins fields
  - Audit log captures all conflict events
  - **Admin-customizable policy per entity type via Settings**
- **APPROVED Conflict Resolution Policy** (Hybrid + Customization):
  | Data Type | Default Policy | Customizable | Rationale |
  |-----------|----------------|--------------|-----------|
  | Inventory quantities | Always prompt | Yes | Financial risk |
  | Order line items | Always prompt | Yes | Customer impact |
  | Notes/comments | Last-write-wins | Yes | Low risk |
  | Status fields | Last-write-wins | Yes | Operational speed |
  | Pricing/costs | Always prompt | Yes | Revenue impact |
  | Client data | Always prompt | Yes | CRM integrity |
  | Batch details | Always prompt | Yes | Inventory accuracy |
- **Customization Requirements**:
  - Settings page: `/settings/conflict-resolution`
  - Per-entity-type policy configuration
  - Role-based override capability (Super Admin only)
  - Default to hybrid policy if not configured
- **Files likely touched**: client/src/hooks/useOptimisticLocking.ts, server/src/middleware/versionCheck.ts, client/src/pages/settings/ConflictResolutionSettings.tsx
- **Dependencies**: REL-004 (Critical Mutation Wrapper), REL-006 (Inventory Concurrency Hardening)
- **Risks**: User experience friction from conflict dialogs (mitigated by customization).
- **Test plan**: Two-browser test with simultaneous edits; verify both prompt and auto-resolve paths.
- **Rollback plan**: Disable version check (last-write-wins for all).

### UXS-706 — Session timeout handler ⚠️ BETA PRIORITY

- **Goal**: Preserve work when session expires during long data entry.
- **Why**: Users spend extended time on intake sessions.
- **Priority**: **BETA (P2)** - Linked to offline infrastructure; deprioritized to beta phase.
- **Exact scope**: Session expiry warning, auto-save to localStorage, recovery prompt.
- **Acceptance criteria**:
  - Warning at 5 minutes before expiry
  - Draft auto-saved before logout
  - Recovery prompt on re-login
- **Files likely touched**: client/src/hooks/useSessionTimeout.ts, client/src/lib/draftStorage.ts
- **Dependencies**: UXS-702
- **Risks**: localStorage limits for large drafts.
- **Test plan**: Simulate session expiry with pending changes.
- **Rollback plan**: Remove warning (standard session behavior).

### UXS-707 — Undo infrastructure

- **Goal**: Provide consistent undo behavior for destructive actions.
- **Why**: User trust and error recovery.
- **Exact scope**: Undo queue for soft deletes with 10-second window.
- **Acceptance criteria**:
  - Undo toast with countdown
  - Client-side restore within window
  - Server delete only after window expires
- **Files likely touched**: client/src/hooks/useUndo.ts, client/src/components/ui/UndoToast.tsx
- **Dependencies**: None
- **Risks**: Race conditions with server sync.
- **Test plan**: Delete row, undo, verify restoration.
- **Rollback plan**: Immediate delete (current behavior).

---

## Layer 8 — Accessibility + Performance

### UXS-801 — Accessibility audit + fixes

- **Goal**: Achieve WCAG 2.1 AA compliance for Work Surfaces.
- **Why**: Legal compliance; inclusive design.
- **Exact scope**: Audit with axe-core; fix critical issues.
- **Acceptance criteria**:
  - Zero critical/serious axe violations
  - Focus indicators visible (2px ring, ≥3:1 contrast)
  - All interactive elements have accessible names
- **Files likely touched**: client/src/components/\*, client/src/styles/\*
- **Dependencies**: UXS-101..104
- **Risks**: Styling changes may affect visual design.
- **Test plan**: axe-core in CI; manual keyboard navigation test.
- **Rollback plan**: Mark as known issues; schedule follow-up.

### UXS-802 — Performance monitoring integration

- **Goal**: Track performance budgets for Work Surfaces.
- **Why**: Ensure velocity promise is met.
- **Exact scope**: Performance marks for critical operations; alerting dashboard.
- **Acceptance criteria**:
  - Grid render <100ms for 100 rows
  - Inspector open <50ms
  - Keystroke response <50ms
- **Files likely touched**: client/src/lib/performanceMonitor.ts, client/src/hooks/usePerformanceMarks.ts
- **Dependencies**: None
- **Risks**: Performance overhead from monitoring itself.
- **Test plan**: Lighthouse CI checks; manual P95 review.
- **Rollback plan**: Disable monitoring in production.

### UXS-803 — Bulk operation limits + progress UI

- **Goal**: Prevent UI freeze and server overload from large bulk operations.
- **Why**: Bulk select 1000+ items causes problems.
- **Exact scope**: Implement selection limits; progress indicators for large operations.
- **Acceptance criteria**:
  - Selection limit: 500 rows
  - Bulk update limit: 100 rows per request
  - Progress indicator for operations >50 items
- **Files likely touched**: client/src/components/work-surface/BulkActionBar.tsx, client/src/hooks/useBulkOperation.ts
- **Dependencies**: UXS-402
- **Risks**: User frustration from limits.
- **Test plan**: Attempt selection beyond limit; verify message.
- **Rollback plan**: Remove limits (accept performance risk).

---

## Layer 9 — Cross-Cutting Infrastructure

### UXS-901 — Empty state components

- **Goal**: Consistent empty states across Work Surfaces.
- **Why**: Clear guidance when no data exists.
- **Exact scope**: Empty state component with illustration, message, CTA.
- **Acceptance criteria**:
  - No data: illustration + "No [items] yet" + create button
  - No results: "No results for [query]" + clear filters
  - Error: "Couldn't load" + retry button
- **Files likely touched**: client/src/components/ui/EmptyState.tsx, client/src/components/work-surface/GridEmptyState.tsx
- **Dependencies**: None
- **Risks**: Illustrations require design input.
- **Test plan**: Visual snapshot tests for each variant.
- **Rollback plan**: Text-only empty states.

### UXS-902 — Toast notification standardization

- **Goal**: Consistent toast behavior in Work Surfaces.
- **Why**: Prevent notification overload; ensure visibility.
- **Exact scope**: Toast positioning, stacking, duration rules.
- **Acceptance criteria**:
  - Position: bottom-right, above status bar
  - Stack limit: 3 visible
  - Success: 3s; Warning: 7s; Error: persistent
- **Files likely touched**: client/src/components/ui/Toast.tsx, client/src/lib/toast.ts
- **Dependencies**: None
- **Risks**: Existing toast usage may not comply.
- **Test plan**: Manual verification of toast scenarios.
- **Rollback plan**: Keep current toast behavior.

### UXS-903 — Print stylesheet support

- **Goal**: Enable print-friendly output from Work Surfaces.
- **Why**: Users print pick lists, invoices, reports.
- **Exact scope**: Print media styles; page break handling.
- **Acceptance criteria**:
  - Grid fills page; navigation hidden
  - Headers repeat on each page
  - No broken rows across pages
- **Files likely touched**: client/src/styles/print.css, client/src/components/work-surface/WorkSurfaceShell.tsx
- **Dependencies**: None
- **Risks**: Browser-specific print rendering.
- **Test plan**: Print preview in Chrome, Safari, Firefox.
- **Rollback plan**: Redirect to dedicated print view.

### UXS-904 — Export functionality standardization

- **Goal**: Consistent export from Work Surfaces.
- **Why**: Data portability requirement.
- **Exact scope**: CSV export for all grids; Excel/PDF for reports.
- **Acceptance criteria**:
  - Export button in status bar
  - CSV: all visible columns
  - Row limit: 10,000 (paginated for more)
- **Files likely touched**: client/src/components/work-surface/ExportButton.tsx, client/src/lib/export.ts
- **Dependencies**: None
- **Risks**: Large export performance.
- **Test plan**: Export 1000 rows; verify completeness.
- **Rollback plan**: Manual data copy.

---

## Dependency Graph Summary

```
Layer 0 (Docs)
├── UXS-001 → UXS-002 → UXS-003
├── UXS-001 → UXS-004
├── UXS-001 → UXS-005
└── UXS-001 → UXS-006

Layer 1 (Primitives)
├── UXS-002 → UXS-101 → UXS-102
├── UXS-101 → UXS-103
└── UXS-101 → UXS-104

Layer 2-5 (Modules) - Depend on Layer 1
├── UXS-101..104 → UXS-201..203
├── UXS-101..104 → UXS-301..302
├── UXS-101..104 → UXS-401..402
└── UXS-101..104 → UXS-501..502

Layer 6 (Hardening) - Depends on all module work
└── UXS-201..502 → UXS-601..603

Layer 7-9 (Infrastructure) - Can parallel with Layers 2-5
├── UXS-103 → UXS-701
├── UXS-102 → UXS-702
├── UXS-702 → UXS-706
└── UXS-402 → UXS-803
```

---

## Implementation Priority (Product-Refined)

> Updated based on product feedback: Offline to beta, mobile focus on inventory/accounting/todo/dashboard.

### P0 — Blockers (must complete before any Work Surface deployment)

| Task | Description | Estimated Effort |
|------|-------------|------------------|
| UXS-101 | Keyboard contract hook | 2 days |
| UXS-102 | Save-state indicator | 1 day |
| UXS-104 | Validation timing | 1 day |
| UXS-704 | Error boundary | 1 day |
| UXS-703 | Loading skeletons | 1 day |

### P1 — Required for production readiness

| Task | Description | Estimated Effort |
|------|-------------|------------------|
| UXS-103 | Inspector panel shell | 2 days |
| UXS-701 | Responsive breakpoints (focus: Inventory, Accounting, Todo, Dashboard) | 3 days |
| UXS-705 | Concurrent edit detection | 2 days |
| UXS-801 | Accessibility audit | 3 days |

### P2 — Required for scale

| Task | Description | Estimated Effort |
|------|-------------|------------------|
| UXS-707 | Undo infrastructure | 2 days |
| UXS-802 | Performance monitoring | 2 days |
| UXS-803 | Bulk operation limits | 1 day |
| UXS-901 | Empty states | 1 day |
| UXS-902 | Toast standardization | 1 day |
| UXS-903 | Print styles | 1 day |
| UXS-904 | Export functionality | 2 days |

### BETA — Post-launch improvements

| Task | Description | Estimated Effort |
|------|-------------|------------------|
| UXS-702 | Offline queue + sync | 5 days |
| UXS-706 | Session timeout handler | 2 days |

---

## Open Questions Requiring Product Input

### Resolved Questions

1. ~~**Offline scope**: Should offline support include full CRUD or read-only caching?~~ **RESOLVED**: Offline moved to BETA priority. Scope TBD closer to beta phase.
2. ~~**Session timeout**: What is the current session duration? Can it be extended via heartbeat?~~ **RESOLVED**: Moved to BETA with offline infrastructure.
3. ~~**Mobile support**: Is mobile view P0 or P2? Which workflows are used on mobile?~~ **RESOLVED**: P1 for Inventory, Accounting, Todo/Tasks, Dashboard. Other modules P2.

### Open Questions (Requiring Decision)

| # | Question | Impact | Blocking Task |
|---|----------|--------|---------------|
| 1 | **Export limits**: Is 10,000 row limit acceptable, or do users need unlimited export? | UXS-904 scope | No |
| ~~2~~ | ~~**Conflict resolution**: Should conflicts auto-resolve (last-write-wins) or always prompt user?~~ | ~~UXS-705 implementation~~ | **RESOLVED** |
| 3 | **Bulk limits**: Is 500 selection / 100 update limit acceptable for power users? | UXS-803 scope | No |

> **Question #2 RESOLVED (2026-01-20)**: Use **Hybrid + Customization** approach. Default to "always prompt" for financial/inventory data, "last-write-wins" for notes/status. Allow admin customization per entity type via Settings.

### Additional Questions from Gap Analysis

| # | Question | Impact | Blocking |
|---|----------|--------|----------|
| 4 | **DF-067 Recurring Orders**: Feature is not implemented. Should it be added to the backlog? | Feature scope | No |
| 5 | **API-only features**: 8 features have backend routers but no UI. Should any get UI surfaces? | Feature scope | No |
| 6 | **VIP Portal scope**: VIP portal has 8 pages - should these be redesigned with Work Surface patterns? | Effort estimation | No |
| 7 | **Hidden routes**: 11 routes are not in main navigation - should any be surfaced more prominently? | Navigation design | No |

---

## Modal Replacement Inventory

> **Purpose**: Track modals that must be replaced with inspector/inline patterns per UX doctrine.
> **Source**: Red Hat QA 2026-01-20, verified via codebase grep
> **Total Dialog/Modal usage**: 117 instances across pages (51 Dialog, 49 AlertDialog, 15 ConfirmDialog, plus module-specific)

### Core Flow Modals (High Priority - Must Replace)

| Module | Current Modal | Location | Replacement Pattern | Task | Priority |
|--------|--------------|----------|---------------------|------|----------|
| Intake | VendorCreateDialog | IntakeGrid.tsx | Quick-create inline | UXS-201 | P0 |
| Orders | LineItemEditDialog | OrderCreator | Inspector panel | UXS-301 | P0 |
| Inventory | AdjustmentDialog | Inventory.tsx | Inspector panel | UXS-401 | P0 |
| Inventory | BatchDetailDrawer | Inventory.tsx | Already Sheet-based ✅ | - | Done |
| Pick/Pack | AssignBatchDialog | PickPackPage | Bulk action bar | UXS-402 | P0 |
| Accounting | RecordPaymentDialog | Payments.tsx | Inspector panel | UXS-501 | P0 |
| Accounting | EditInvoiceDialog | Invoices.tsx | Work Surface | UXS-501 | P0 |

### Acceptable Modals (Confirmation/Destructive Actions)

These modals are acceptable per doctrine (rare/destructive actions):

| Type | Count | Usage | Keep? |
|------|-------|-------|-------|
| AlertDialog | 49 | Delete confirmations, warnings | ✅ Keep |
| ConfirmDialog | 15 | Bulk action confirmations | ✅ Keep |
| ConfirmNavigationDialog | 1 | Unsaved changes warning | ✅ Keep |
| ConflictDialog | 1 | Optimistic lock conflict | ✅ Keep |

### Module-Specific Modals (Evaluate Case-by-Case)

| Modal | Module | Frequency | Recommendation |
|-------|--------|-----------|----------------|
| EventFormDialog | Calendar | Medium | Keep (complex form) |
| SaveViewDialog | Reports | Low | Keep (one-time action) |
| CreatePeriodDialog | Accounting | Low | Keep (admin action) |
| ShipOrderModal | Fulfillment | Medium | Evaluate for inspector |
| ProcessReturnModal | Fulfillment | Low | Keep (workflow modal) |
| RoomBookingModal | Calendar | Medium | Evaluate for Work Surface |

### Reference Implementations (Existing Patterns to Follow)

| Pattern | Existing File | Use For |
|---------|--------------|---------|
| Sheet/Drawer inspector | `components/inventory/BatchDetailDrawer.tsx` | Inspector panels |
| Conflict handling | `hooks/useOptimisticLocking.tsx` | Concurrent edit detection |
| Mutation wrapper | `hooks/useAppMutation.ts` | Save state integration |
| Keyboard shortcuts | `hooks/useKeyboardShortcuts.ts` | Extend for Work Surface |
| Feature flags | `hooks/useFeatureFlag.ts` | Safe rollout |

**Audit Status**: ✅ Verified via `grep -r "Dialog\|Modal"` - 117 instances catalogued.

---

## Implementation Scaffolding (Created)

> **Source**: Red Hat QA 2026-01-20 - Skeleton hooks created for 70% effort reduction

| Hook | Path | Status | Effort Saved |
|------|------|--------|--------------|
| `useWorkSurfaceKeyboard` | `hooks/work-surface/useWorkSurfaceKeyboard.ts` | **IN PROGRESS (~70%)** | ~70% |
| `useSaveState` | `hooks/work-surface/useSaveState.ts` | **IN PROGRESS (~70%)** | ~70% |
| `useValidationTiming` | `hooks/work-surface/useValidationTiming.ts` | **IN PROGRESS (~70%)** | ~70% |

These skeleton hooks include:
- Full TypeScript interfaces
- JSDoc documentation with usage examples
- Core logic structure with TODOs for completion
- Integration points with existing hooks
- Reference to existing patterns (useOptimisticLocking, useAppMutation)

---

## Status Corrections (2026-01-20 Roadmap Review)

> **Source**: Comprehensive Roadmap Review - `docs/roadmaps/COMPREHENSIVE_ROADMAP_REVIEW_2026-01-20.md`

The following task statuses have been verified and corrected based on codebase analysis:

### Layer 0 Tasks - COMPLETED

| Task | Original Status | Corrected Status | Evidence |
|------|-----------------|------------------|----------|
| UXS-001 | ready | **COMPLETE** | `FEATURE_PRESERVATION_MATRIX.md` exists (258 lines, 110 features tracked) |
| UXS-002 | ready | **COMPLETE** | `ATOMIC_UX_STRATEGY.md` exists with complete primitives section |
| UXS-003 | ready | **COMPLETE** | `PATTERN_APPLICATION_PLAYBOOK.md` exists with decision trees |
| UXS-004 | ready | **COMPLETE** | `ASSUMPTION_LOG.md` (33 assumptions) + `RISK_REGISTER.md` (32 risks) exist |
| UXS-005 | ready | **COMPLETE** | All 14 unknown features resolved in matrix (3 confirmed, 8 api-only, 1 missing) |

### Layer 1 Tasks - IN PROGRESS

| Task | Original Status | Corrected Status | Evidence |
|------|-----------------|------------------|----------|
| UXS-101 | ready | **IN PROGRESS (~70%)** | `useWorkSurfaceKeyboard.ts` exists (254 lines), needs Tab navigation completion |
| UXS-102 | ready | **IN PROGRESS (~70%)** | `useSaveState.ts` exists (293 lines), needs integration testing |
| UXS-104 | ready | **IN PROGRESS (~70%)** | `useValidationTiming.ts` exists (363 lines), needs integration testing |

### Layer 7 Tasks - COMPLETED

| Task | Original Status | Corrected Status | Evidence |
|------|-----------------|------------------|----------|
| UXS-703 | ready | **COMPLETE** | `skeleton.tsx` + `skeleton-loaders.tsx` exist in `components/ui/` |
| UXS-704 | ready | **COMPLETE** | `ErrorBoundary.tsx` + `PageErrorBoundary.tsx` exist |

### Summary After Corrections

| Category | Count |
|----------|-------|
| **Completed** | 7 tasks (UXS-001..005, UXS-703, UXS-704) |
| **In Progress** | 3 tasks (UXS-101, UXS-102, UXS-104) |
| **Ready (Not Started)** | 26 tasks (including UXS-705 - now unblocked) |
| **Blocked** | 0 tasks |
| **BETA Deferred** | 2 tasks (UXS-702, UXS-706) |

> **UXS-705 UNBLOCKED (2026-01-20)**: Product decision received - Hybrid + Customization approach approved.
