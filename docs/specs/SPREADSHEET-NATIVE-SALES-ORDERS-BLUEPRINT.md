# Blueprint: Spreadsheet-Native Sales -> Orders

**Task:** ARCH-SS-018  
**Status:** Draft  
**Priority:** CRITICAL  
**Spec Date:** 2026-03-14

## 1. Blueprint Purpose

This is the second pilot blueprint for the spreadsheet-native fork.

It inherits:

- Foundation Baseline v2
- the generated schema and router truth pack
- the ownership seams memo
- the primitive pack
- the pilot proof-case contract

## 2. Sheet Shape

Workbook:

- `Sales`

Primary sheet:

- `Orders`

Related sheet:

- `Create / Edit Order`

Archetype:

- `conveyor` for orders queue plus `document` for draft/edit workflow

Layout for `Orders`:

- one dominant primary order queue
- one supporting line-items table for the active order
- one compact selection summary strip
- one secondary inspector for customer context, audit/activity, GL context, and exceptional depth

Width and layout rules:

- the default queue must fit its `P0` columns without horizontal scrolling
- stage partitioning is expressed in the queue itself first; extra lanes are optional views, not the default desktop layout
- the supporting line-items table stacks below the queue by default
- the inspector is capped as a narrow companion panel and must not become the primary action surface

Layout for `Create / Edit Order`:

- document header region
- line-items table
- pricing / credit / referral inspector context
- status bar with autosave state and blocking readiness signals

## 3. Canonical Routes and Boundaries

Canonical workbook routes:

- `/sales?tab=orders`
- `/sales?tab=create-order`

Owned by this workbook:

- orders queue
- order draft create/edit/finalize flow
- route-seeded entry
- quote-to-order and sale conversion
- order activity/audit context
- order-level exports
- payment and shipping handoff initiation

Not owned by this workbook:

- payment execution
- invoice document output execution
- shipping execution
- returns execution surface

## 3.1 Final Target vs Pilot vs Preserved Adjacent Behavior

Final target:

- one dominant queue-based `Orders` sheet with compact stage and next-step cues
- one coherent `Create / Edit Order` document sheet
- direct selection-driven actions for draft, accounting handoff, shipping handoff, and contextual exports

Current pilot:

- one dominant queue pilot
- one linked line-items table
- one compact selection summary strip
- one secondary inspector

Preserved adjacent behavior:

- create/edit composer execution
- finalize and confirm guardrails
- quote conversion execution
- returns execution
- invoice execution and download

## 4. Data Contract

Primary query contract:

- `orders.getAll`
- `orders.getById`
- `orders.getOrderWithLineItems`
- `orders.getOrderStatusHistory`
- `orders.getLineItemAllocations`
- `orders.getNextStatuses`

Primary mutation contract:

- `orders.createDraftEnhanced`
- `orders.updateDraftEnhanced`
- `orders.finalizeDraft`
- `orders.confirmDraftOrder`
- `orders.deleteDraftOrder`
- `orders.confirmOrder`
- `orders.updateOrderStatus`
- `orders.allocateBatchesToLineItem`

Adjacent but linked mutations:

- `orders.processReturn`
- `orders.processRestock`
- `orders.processVendorReturn`
- accounting payment/invoice actions through linked-surface ownership

Primary schema tables:

- `orders`
- `orderLineItems`
- `orderLineItemAllocations`
- `orderStatusHistory`

Adjacent tables:

- `clients`
- `batches`
- `inventoryMovements`
- `returns`
- `payments`
- `invoices`

## 5. Workflow Rules

- Cell edits update draft data only.
- Workflow stage changes remain explicit actions.
- Accounting and Shipping are linked owner surfaces, not hidden child modes inside Orders.
- Customer credit, pricing, and referral logic remain system-owned context, not user-authored spreadsheet logic.

## 5.1 Default Queue Width Budget

Default `P0` queue columns:

- `Stage`
- `Order`
- `Client`
- `Lines`
- `Total`
- `Next`

Default queue exclusions:

- created timestamp
- raw audit counters
- GL counts
- long customer metadata

Those stay in the summary strip, inspector, or alternate views.

## 5.2 Action Execution Matrix

| Action                   | Owner Surface          | Persistence Class                | Trigger                           | Failure Unit         | Undo / Reversal           | Proof Gate                     |
| ------------------------ | ---------------------- | -------------------------------- | --------------------------------- | -------------------- | ------------------------- | ------------------------------ |
| Open draft               | Sales -> Orders        | route handoff                    | selected draft                    | route load           | n/a                       | `SALE-ORD-004`, `SALE-ORD-006` |
| Open composer            | Sales -> Orders        | route handoff                    | queue or command strip            | route load           | n/a                       | `SALE-ORD-004`, `SALE-ORD-016` |
| Accounting handoff       | Accounting             | adjacent-owned handoff           | selected confirmed order          | route/context load   | n/a                       | `SALE-ORD-009`                 |
| Shipping handoff         | Operations -> Shipping | adjacent-owned handoff           | selected confirmed invoiced order | route/context load   | n/a                       | `SALE-ORD-011`                 |
| Generate invoice entry   | Accounting             | adjacent-owned output initiation | selected confirmed order          | action launch        | Accounting-owned reversal | `SALE-ORD-008`                 |
| Confirm / finalize draft | Sales -> Orders        | explicit workflow transition     | composer / draft context          | document transaction | follow document rules     | `SALE-ORD-005`, `SALE-ORD-007` |

## 6. Proof Gate

This blueprint is implementation-ready only after:

- `SALE-ORD-001` through `SALE-ORD-018` each map to a proof case
- `ORD-D005` and `ORD-D007` are resolved through the ownership memo
- `ORD-D010` remains explicitly non-parity until invoice download ownership is implemented or reclassified
