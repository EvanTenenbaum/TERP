# TERP Work Surface UX Redesign — Complete Handoff Report

> **Purpose**: Self-contained reference document enabling any AI agent or developer to immediately begin implementation work on the TERP UX redesign without drift from established decisions.
>
> **Last Updated**: 2026-01-20 (Red Hat QA Deep Review)
>
> **Status**: Ready for implementation
>
> **QA Status**: Reviewed 2026-01-20 - Critical gaps addressed

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [UX Redesign Goal](#2-ux-redesign-goal)
3. [Core Design Principles](#3-core-design-principles)
4. [The Work Surface Pattern](#4-the-work-surface-pattern)
5. [Technical Architecture](#5-technical-architecture)
6. [Feature Inventory](#6-feature-inventory)
7. [Implementation Priorities](#7-implementation-priorities)
8. [Feature Flag Rollout Strategy](#8-feature-flag-rollout-strategy)
9. [Product Decisions (Locked)](#9-product-decisions-locked)
10. [Open Questions](#10-open-questions)
11. [Golden Rules](#11-golden-rules)

---

## 1. Product Overview

### What is TERP?

TERP is an **enterprise resource planning (ERP) system** built for cannabis/wholesale distribution operations. It manages:

- **Inventory**: Product intake, batch tracking, multi-location storage, transfers
- **Sales**: Orders, quotes, live shopping, client management, samples
- **Procurement**: Purchase orders, vendor management, receiving
- **Accounting**: Invoices, payments, AR/AP, general ledger, fiscal periods
- **Fulfillment**: Pick & pack, shipping, returns
- **CRM**: Client profiles, needs matching, VIP portal

### Business Context

TERP users perform **high-velocity, repetitive data entry** operations:
- Intake specialists enter 50-100 product lines per session
- Sales reps create multiple orders per day
- Warehouse staff pick/pack dozens of orders continuously

Current pain point: **Modal-heavy workflows** slow down these operations with excessive clicks and context switches.

### Current Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| UI Components | shadcn/ui (Radix primitives) + Tailwind CSS |
| Data Grid | AG Grid Community |
| State/Data | tRPC + React Query |
| Routing | Wouter (lightweight router) |
| Backend | Express + tRPC + Drizzle ORM |
| Database | MySQL |
| Notifications | Sonner (toast library) |

### Codebase Stats

- **86 pages** in `/client/src/pages/`
- **125 tRPC routers** in `/server/src/routers/`
- **258KB database schema** with soft deletes (`deletedAt`) and optimistic locking (`version` field)

---

## 2. UX Redesign Goal

### Problem Statement

> TERP's current UX slows high-velocity operations by overusing modal flows, context switches, and non-deterministic focus behavior. Users want "really simple data entry" and "spreadsheet-like speed" **without** turning TERP into a fragile, unconstrained spreadsheet.

### Success Metrics

| Metric | Target |
|--------|--------|
| Time-to-entry | Reduce median time from opening workflow to committing a valid row |
| Keystroke count | Reduce average keystrokes + pointer interactions per row/record |
| Error recovery time | Reduce time from validation failure to corrected commit |
| Context switching | Minimize view/surface changes per workflow completion |

### Non-Goals

- We are NOT building a general-purpose spreadsheet
- We are NOT removing validation and constraints
- We are NOT changing the underlying data model or schema

---

## 3. Core Design Principles

### UX Doctrine (Non-Negotiable)

These rules must never be violated:

| Priority | Principle | Meaning |
|----------|-----------|---------|
| 1 | **Velocity → Safety → Context** | Always optimize for speed first, then correctness, then information |
| 2 | **Keyboard-first contracts** | Tab/Enter/Esc must work consistently across all Work Surfaces |
| 3 | **Deterministic focus** | No unexpected focus jumps; user always knows where they are |
| 4 | **No core-flow modals** | High-frequency operations never use blocking modals |
| 5 | **Hybrid editing** | Inline for primitives, inspector for complex objects |
| 6 | **Save state always visible** | User always sees: Saved / Saving / Needs attention |

### Explicit Violations (Never Do This)

- Nested modals in core flows
- Field-level selection inside Cmd+K command palette
- Complex multi-field objects edited in grid cells
- Modal-only workflows for high-frequency operations
- Unbounded customization that breaks consistency

---

## 4. The Work Surface Pattern

### What is a Work Surface?

A **Work Surface** is the universal execution shell for high-frequency workflows. It replaces modal-heavy patterns with a consistent, keyboard-driven interface.

### Anatomy

```
┌─────────────────────────────────────────────────────────────────┐
│ CONTEXT HEADER (sticky)                            h: 64-80px   │
│ [Vendor: Acme Corp ▼] [Location: Warehouse A ▼] [Date: Today]   │
├─────────────────────────────────────────────────────┬───────────┤
│                                                     │           │
│                                                     │  INSPECTOR│
│                    PRIMARY GRID                     │  PANEL    │
│                                                     │           │
│  Product     | Qty | Unit | Cost   | Total          │  Details  │
│  Strain A    | 10  | lb   | $50.00 | $500.00        │  History  │
│  Strain B    | 5   | oz   | $25.00 | $125.00        │  Actions  │
│  [+ Add row] |     |      |        |                │           │
│                                                     │  w: 360-  │
│                                                     │  400px    │
├─────────────────────────────────────────────────────┴───────────┤
│ STATUS BAR: 2 items | $625.00 total | ✅ Saved      h: 48px     │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Purpose | Behavior |
|-----------|---------|----------|
| **Context Header** | Batch-level defaults (vendor, location, date) | Sticky; applies to all new rows |
| **Primary Grid** | Fast row entry with inline editing | Keyboard-navigable; virtualized for performance |
| **Inspector Panel** | Complex edits and audit context | Non-modal; Esc closes; never blocks grid |
| **Status Bar** | Save state, totals, error summary | Sticky bottom; always visible |

### When to Use Work Surface vs Other Patterns

| Condition | Use |
|-----------|-----|
| >5 similar actions per session | Work Surface |
| Editing rows in sequence | Work Surface + Primary Grid |
| Single record edited rarely | Form |
| Read-only analysis/reporting | Review Surface |
| Complex fields with audit needs | Inspector Panel |

### Review Surface (Read-Only Variant)

For dashboards, reports, and analysis views:

| Aspect | Work Surface | Review Surface |
|--------|--------------|----------------|
| Primary action | Create/Edit | Filter/Export |
| Grid behavior | Inline edit | Click to navigate |
| Inspector | Edit form | Read-only details |
| Context header | Editable defaults | Filter controls |
| Background | `bg-background` | `bg-muted/30` |

---

## 5. Technical Architecture

### Keyboard Contract (Global)

Every Work Surface must implement this exactly:

| Key | Action |
|-----|--------|
| **Tab** | Move to next field/cell |
| **Shift+Tab** | Move to previous field/cell |
| **Enter** | Commit edit; if row valid, create next row |
| **Esc** | Cancel edit or close inspector |
| **Cmd/Ctrl+Z** | Undo last destructive action |
| **Cmd+K** | Open command palette (navigation/actions ONLY, not field selection) |

### Validation Timing ("Reward Early, Punish Late")

```
User types → No errors shown (success indicators OK)
User blurs field → Validation runs, errors appear
User commits row → Final validation, errors block commit
```

- **Never** show required-field errors while typing
- **Always** validate on blur and commit
- **Server validates everything** regardless of client validation

### Save State Indicator

Only three states allowed:

| State | Visual | Meaning |
|-------|--------|---------|
| ✅ Saved | Green checkmark | Persisted to server |
| 🟡 Saving... | Yellow spinner | Request in flight |
| 🔴 Needs attention | Red warning | Validation error or conflict |

### Responsive Breakpoints

| Breakpoint | Grid | Inspector | Mobile Priority Modules |
|------------|------|-----------|------------------------|
| ≥1440px | Full | 400px fixed right | — |
| 1280-1439px | Full | 360px fixed right | — |
| 1024-1279px | Full | Slide-over sheet | — |
| 768-1023px | Reduced | Full-screen sheet | — |
| <768px | Card layout | Full-screen | **Inventory, Accounting, Todo/Tasks, Dashboard** |

### Grid Specifications

| Property | Value |
|----------|-------|
| Row height | 40px (touch-friendly) |
| Cell padding | 8px horizontal |
| Min column width | 80px |
| Max column width | 400px |
| Header row height | 44px |
| Max visible columns | 8-10 (no horizontal scroll) |

### Animation Tokens

| Animation | Duration | Easing |
|-----------|----------|--------|
| Inspector open | 200ms | ease-out |
| Inspector close | 150ms | ease-in |
| Row creation | 150ms | ease-out |
| Row deletion | 150ms + 100ms collapse | ease-in |
| Save state change | 300ms | ease-in-out |

When `prefers-reduced-motion: reduce`: All animations become instant (0ms).

---

## 6. Feature Inventory

### Summary

| Status | Count | Description |
|--------|-------|-------------|
| ✅ Confirmed | 99 | Features with working UI |
| ⚙️ API-Only | 8 | Backend-only, no UI needed |
| ❌ Missing | 1 | DF-067 Recurring Orders (not implemented) |
| **Total** | **110** | |

### Criticality Breakdown

| Priority | Count | Test Requirement |
|----------|-------|------------------|
| P0 (Critical) | 24 | Full E2E coverage |
| P1 (High) | 48 | E2E coverage |
| P2 (Medium) | 38 | UI smoke tests |

### Modules Requiring Work Surface

| Module | Features | P0 Count | Work Surface Required |
|--------|----------|----------|----------------------|
| Accounting | 22 | 10 | Yes |
| Inventory | 10 | 4 | Yes |
| Sales | 13 | 3 | Yes |
| Fulfillment | 2 | 1 | Yes |
| CRM | 6 | 0 | Partial |

### Golden Flows (Must Never Break)

| Flow | Entry | Key Steps |
|------|-------|-----------|
| **GF-001 Direct Intake** | /spreadsheet | Create session → Add items → Set vendor → Finalize |
| **GF-002 Standard PO** | /purchase-orders | Create PO → Submit → Receive goods |
| **GF-003 Sales Order** | /orders | Select client → Add items → Finalize |
| **GF-004 Invoice & Payment** | /accounting/invoices | Generate → Send → Receive payment |
| **GF-005 Pick & Pack** | /pick-pack | View → Pick → Pack → Ship |
| **GF-006 Client Ledger** | /clients/:id/ledger | View → Filter → Export |
| **GF-007 Inventory Adjust** | /inventory | Select batch → Adjust qty → Confirm |
| **GF-008 Sample Request** | /samples | Create → Approve → Fulfill |

### RBAC Validation Matrix (Per Golden Flow)

> **Critical**: Each golden flow must be tested with the appropriate RBAC role.

| Flow | Required Permissions | Owning Roles | Test Using |
|------|---------------------|--------------|------------|
| GF-001 | `inventory:write`, `batches:create` | Inventory, Super Admin | QA Auth: Inventory role |
| GF-002 | `purchase_orders:write` | Inventory, Purchasing | QA Auth: Inventory role |
| GF-003 | `orders:write`, `inventory:read` | Sales Rep, Sales Manager | QA Auth: Sales Manager |
| GF-004 | `invoices:write`, `payments:write` | Accounting | QA Auth: Accounting role |
| GF-005 | `pick_pack:write`, `inventory:write` | Fulfillment | QA Auth: Fulfillment role |
| GF-006 | `clients:read`, `ledger:read` | Sales Rep, Accounting | QA Auth: Sales Rep |
| GF-007 | `inventory:write` | Inventory | QA Auth: Inventory role |
| GF-008 | `samples:write` | Sales Rep, Sales Manager | QA Auth: Sales Manager |

> **Note**: Use the QA Auth system (AUTH-QA-001) with `/api/qa-auth/login` for deterministic RBAC testing.

### API-Only Features (No UI Needed)

These features intentionally have no UI:

| Feature | Rationale |
|---------|-----------|
| DF-030 Crypto Payments | Backend payment processor integration |
| DF-031 Installment Payments | Payment plan management via API |
| DF-034 Transaction Fees | Automated fee calculation |
| DF-035 Invoice Disputes | Dispute workflow via API |
| DF-038 Catalog Publishing | External integration API |
| DF-046 System Monitoring | Admin diagnostics tool |
| DF-048 Vendor Reminders | Automated notification system |
| DF-057 Deployment Tracking | DevOps tool |

---

## 7. Implementation Priorities

### P0 — Blockers (Before Any Work Surface Deployment)

| Task | Description | Dependencies |
|------|-------------|--------------|
| UXS-101 | Keyboard contract hook | None |
| UXS-102 | Save-state indicator component | None |
| UXS-104 | Validation timing helper | None |
| UXS-703 | Loading skeleton components | None |
| UXS-704 | Error boundary wrapper | None |

### P1 — Production Readiness

| Task | Description | Dependencies |
|------|-------------|--------------|
| UXS-103 | Inspector panel shell | UXS-101 |
| UXS-701 | Responsive breakpoints | UXS-103 |
| UXS-705 | Concurrent edit detection | None |
| UXS-801 | Accessibility audit | UXS-101..104 |

### P2 — Scale

| Task | Description |
|------|-------------|
| UXS-707 | Undo infrastructure |
| UXS-802 | Performance monitoring |
| UXS-803 | Bulk operation limits |
| UXS-901 | Empty state components |
| UXS-902 | Toast standardization |
| UXS-903 | Print stylesheet |
| UXS-904 | Export functionality |

### BETA — Post-Launch

| Task | Description | Notes |
|------|-------------|-------|
| UXS-702 | Offline queue + sync | Deprioritized per product decision |
| UXS-706 | Session timeout handler | Depends on UXS-702 |

---

## 8. Feature Flag Rollout Strategy

### Required Feature Flags

Each Work Surface module requires a dedicated feature flag for safe deployment:

| Flag Name | Default | Controls | Rollout Order |
|-----------|---------|----------|---------------|
| `WORK_SURFACE_INTAKE` | false | UXS-201..203 (Intake/PO pilot) | 1st |
| `WORK_SURFACE_ORDERS` | false | UXS-301..302 (Sales/Orders) | 2nd |
| `WORK_SURFACE_INVENTORY` | false | UXS-401..402 (Inventory/Pick-Pack) | 3rd |
| `WORK_SURFACE_ACCOUNTING` | false | UXS-501..502 (Accounting/Ledger) | 4th |

### Rollout Phases

1. **Internal Testing** (flag: false for all users)
   - QA team tests with flag override
   - Use QA Auth for role-specific validation

2. **Pilot Users** (flag: enabled for specific users)
   - Enable via user override in feature flag system
   - Collect feedback for 1-2 weeks

3. **General Availability** (flag: true by default)
   - Monitor error rates and performance
   - Keep flag available for instant rollback

### Rollback Criteria

Rollback flag to `false` immediately if:
- Error rate increases >5% compared to baseline
- P95 response time degrades >50%
- User-reported critical workflow blocking
- Data integrity issues detected

### Implementation

```typescript
// Example usage in component
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

const IntakePage = () => {
  const useWorkSurface = useFeatureFlag('WORK_SURFACE_INTAKE');

  if (useWorkSurface) {
    return <IntakeWorkSurface />;
  }
  return <IntakeLegacy />;
};
```

---

## 9. Product Decisions (Locked)

These decisions have been made and should not be revisited without explicit product approval:

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Offline Support** | BETA priority (not P0/P1) | Not required for initial release |
| **Mobile Priority Modules** | Inventory, Accounting, Todo/Tasks, Dashboard | These workflows are used on mobile |
| **Other Modules Mobile** | P2 | Desktop-first for other modules |
| **Cmd+K Scope** | Actions/navigation only | Never use for field selection |
| **Direct Intake Schema** | Compress UX, not schema | Auto-create PO + receipt + batch, but keep distinct records |
| **Complex Field Editing** | Inspector panel only | Never inline for multi-field objects |
| **Validation Timing** | Reward early, punish late | Errors on blur/commit only |

### Firm Constraints

- **Do NOT** merge intake/PO schema events
- **Do NOT** add nested modals to core flows
- **Do NOT** route field selection through Cmd+K
- **Do NOT** make grids fully unconstrained like spreadsheets
- **Do NOT** hide save state from users

---

## 10. Open Questions

These require product input before implementation:

| # | Question | Impact |
|---|----------|--------|
| 1 | **Conflict resolution**: Should conflicts auto-resolve (last-write-wins) or always prompt user? | Affects concurrent edit UX |
| 2 | **Export limits**: Is 10,000 row limit acceptable? | Affects large data exports |
| 3 | **Bulk limits**: Is 500 selection / 100 update limit acceptable? | Affects power user workflows |
| 4 | **DF-067 Recurring Orders**: Should this missing feature be added to backlog? | Sales workflow expansion |
| 5 | **API-only features**: Should any of the 8 API-only features get UI surfaces? | Scope expansion |
| 6 | **VIP Portal scope**: Should VIP portal pages be redesigned with Work Surface patterns? | VIP experience |
| 7 | **Hidden routes**: Should any of the 11 hidden routes be surfaced in main navigation? | Discoverability |

---

## 11. Golden Rules

### For Any AI Agent Working on This Project

1. **Read ATOMIC_UX_STRATEGY.md first** — Contains the full doctrine and primitives
2. **Check FEATURE_PRESERVATION_MATRIX.md** — Ensure no feature is lost
3. **Follow PATTERN_APPLICATION_PLAYBOOK.md** — Decision rules for patterns
4. **Update documentation** — Any new pattern or exception must be documented

### Before Writing Any Code

- [ ] Identify which module you're modifying
- [ ] Check if Work Surface or Review Surface applies
- [ ] Confirm keyboard contract will be preserved
- [ ] Verify save-state indicator is visible
- [ ] Ensure validation timing follows "reward early, punish late"

### Before Submitting Any PR

- [ ] Work Surface shell used for high-frequency workflows
- [ ] Inline edits restricted to primitives
- [ ] Complex fields open in inspector
- [ ] Save-state indicator visible at all times
- [ ] Keyboard contract: Tab, Shift+Tab, Enter, Esc work as specified
- [ ] Loading states use skeletons matching layout
- [ ] Errors appear on blur/commit, not during typing
- [ ] Empty states have clear message + CTA
- [ ] Undo available for destructive actions
- [ ] Focus indicators visible (2px, ≥3:1 contrast)
- [ ] Feature Preservation Matrix updated or referenced

### File Reference

| Document | Purpose |
|----------|---------|
| `ATOMIC_UX_STRATEGY.md` | Complete UX doctrine, primitives, and design decisions |
| `ATOMIC_ROADMAP.md` | Implementation tasks with dependencies |
| `FEATURE_PRESERVATION_MATRIX.md` | All 110 features with status and test requirements |
| `PATTERN_APPLICATION_PLAYBOOK.md` | Decision rules for applying patterns |
| `RISK_REGISTER.md` | Known risks with mitigation strategies |
| `ASSUMPTION_LOG.md` | Assumptions requiring validation |

---

## Quick Reference Card

### Work Surface Components

```
Context Header → Batch defaults (vendor, location, date)
Primary Grid   → Fast row entry, keyboard-first
Inspector      → Complex edits, non-modal, Esc closes
Status Bar     → Save state, totals, errors
```

### Keyboard Map

```
Tab        → Next field
Shift+Tab  → Previous field
Enter      → Commit row, create next
Esc        → Cancel edit / close inspector
Cmd+K      → Command palette (nav/actions only)
Cmd+Z      → Undo
```

### Save States

```
✅ Saved           → Green, persisted
🟡 Saving...       → Yellow, in flight
🔴 Needs attention → Red, error/conflict
```

### Module → Pattern

```
Intake, Orders, Pick/Pack  → Work Surface + Grid
Dashboard, Reports         → Review Surface
Settings, Admin            → Forms
Client Profile             → Panel + Review
```

---

**End of Handoff Report**

This document contains everything needed to begin implementation. For detailed specifications, refer to the individual strategy documents listed in the File Reference section.
