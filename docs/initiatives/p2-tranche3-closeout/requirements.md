# P2 Tranche 3 + Closeout — Requirements

## Context

Operations seams + initiative wrap-up. Final phase.

## Seam 6: Operations and Settlement Continuity

### US-1: PO reference on intake rows

**As a** warehouse operator receiving product
**I want** to see which Purchase Order each intake batch came from
**So that** I can match deliveries against what was ordered

**Acceptance Criteria:**

- [ ] Intake table shows PO number column
- [ ] PO number links to the PO detail
- [ ] If no PO exists for a batch, shows "Direct" or empty

### US-2: Expected deliveries today

**As a** warehouse operator starting a shift
**I want** to see what deliveries are expected today
**So that** I know what trucks to expect and can prepare

**Acceptance Criteria:**

- [ ] Filtered view on intake/PO page showing POs with expectedDeliveryDate = today
- [ ] Grouped by vendor/supplier
- [ ] Shows expected items and quantities
- [ ] Accessible from ⌘K or quick navigation

### US-3: Unified contact continuity

**As an** operator viewing a contact who is both buyer and seller
**I want** to see both sides of the relationship in one place
**So that** I understand the full picture before making decisions

**Acceptance Criteria:**

- [ ] Already substantially built in ClientProfilePage (Overview + Sales & Pricing + Money + Supply & Inventory + Activity tabs)
- [ ] Verify all tabs work for dual-role contacts
- [ ] Money tab shows both AR (as buyer) and AP (as seller) correctly
- [ ] Any gaps from the audit are closed

### Linear: TER-1059, TER-1060, TER-1061

## Closeout

### US-4: Human acceptance testing

**Acceptance Criteria:**

- [ ] Evan walks through the 5 key human moments on staging
- [ ] Feedback captured and any issues addressed
- [ ] "Human moments feel continuous" charter check validated

### US-5: Deferred backlog disposition

**Acceptance Criteria:**

- [ ] TER-1055 (Dashboard KPIs) — explicitly deferred or promoted
- [ ] TER-1056 (Activity feed) — explicitly deferred or promoted
- [ ] TER-1063 (Pick list generation) — explicitly deferred or promoted
- [ ] TER-1065 (Communication log) — explicitly deferred or promoted
- [ ] Each decision has a written rationale

### US-6: Tracker reconciliation

**Acceptance Criteria:**

- [ ] All Linear tickets for the initiative match reality
- [ ] Done tickets are Done, remaining are correctly scoped
- [ ] No orphaned or ambiguous tickets

### US-7: Performance hardening

**Acceptance Criteria:**

- [ ] InventoryBrowser has virtualization for 500+ batch performance
- [ ] Selection state cleanup is debounced
