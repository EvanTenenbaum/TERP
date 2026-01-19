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
  - Tests cover top 8 golden flows with pass criteria.
- **Files likely touched**: tests-e2e/_, docs/specs/ui-ux-strategy/_
- **Dependencies**: UXS-601
- **Risks**: E2E flakiness.
- **Test plan**: Run test suite in CI.
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
