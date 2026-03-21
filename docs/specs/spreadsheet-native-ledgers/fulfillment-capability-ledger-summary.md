# Capability Ledger Summary: Fulfillment (Pick & Pack)

Snapshot: commit `7514e3e8` (main, 2026-03-20) | Extracted: 2026-03-20 | Checked Against Code: yes (full component, router, schema)

## Module Family

Queue + Detail — queue of orders, selected-order detail with item-level pack actions.

## Architecture Decision

**Sheet-native queue + sidecar pack/ship actions.** Queue rows = orders. Item-level packing, mark-ready, and ship are explicit sidecar CTAs, not inline cell edits.

## Critical Constraints

1. **"Fulfillment" not "Shipping"** — Tab label, header, and all copy must be renamed (DISC-FUL-001)
2. **Canonical route is `/inventory?tab=shipping`** not `/pick-pack` (redirect stub)
3. **`orders.shipOrder` is a fulfillment mutation** — triggers inventory release (INV-001), FOR UPDATE locks
4. **`markAllPacked` has legacy JSON fallback** — must survive migration
5. **Concurrent-edit detection is inert** — version field never populated (DISC-FUL-005)
6. **Ship button permission mismatch** — UI enables for `orders:fulfill` but server requires `orders:update` (DISC-FUL-006)
7. **Mobile-first: 44px touch targets required** — partially implemented, needs validation
8. **Queue capped at 50 orders, no pagination UI**

## Capabilities (28 total, vs 28 from extraction — but 12 missed items found in code review)

| ID      | Capability                        | Type       | Criticality | Migration Decision              |
| ------- | --------------------------------- | ---------- | ----------- | ------------------------------- |
| FUL-001 | Order queue browse                | Query      | P0          | Adopt                           |
| FUL-002 | Status filter (5 values)          | Query      | P0          | Adopt                           |
| FUL-003 | Text search                       | Query      | P1          | Adopt                           |
| FUL-004 | Sort (6 options)                  | Query      | P1          | Adopt                           |
| FUL-005 | Reset queue view                  | Action     | P2          | Adopt                           |
| FUL-006 | Status summary cards              | View       | P1          | Adapt                           |
| FUL-007 | Manual queue refresh              | Action     | P1          | Adapt                           |
| FUL-008 | Select order from queue           | Action     | P0          | Adopt                           |
| FUL-009 | View order items + bags           | Query      | P0          | Adopt                           |
| FUL-010 | Packing progress per row          | View       | P1          | Adopt                           |
| FUL-011 | Multi-select items for packing    | Action     | P0          | Adopt                           |
| FUL-012 | Select all unpacked               | Action     | P1          | Adopt                           |
| FUL-013 | Pack selected items               | Mutation   | P0          | Preserve                        |
| FUL-014 | Pack all to one bag               | Mutation   | P0          | Preserve                        |
| FUL-015 | Unpack with reason                | Mutation   | P0          | Preserve                        |
| FUL-016 | Undo last pack (Cmd+Z)            | Action     | P1          | Preserve                        |
| FUL-017 | Mark order ready                  | Mutation   | P0          | Preserve                        |
| FUL-018 | Mark order shipped (terminal)     | Mutation   | P0          | Preserve                        |
| FUL-019 | Export manifest CSV               | Export     | P1          | Preserve                        |
| FUL-020 | Item inspector                    | View       | P1          | Adopt                           |
| FUL-021 | Order inspector                   | View       | P1          | Adopt                           |
| FUL-022 | Bag display                       | View       | P1          | Adopt                           |
| FUL-023 | Status filter exit notification   | Behavior   | P1          | Preserve                        |
| FUL-024 | Concurrent edit detection         | Behavior   | P1          | Deferred (inert — DISC-FUL-005) |
| FUL-025 | Full keyboard contract            | Keyboard   | P1          | Adopt                           |
| FUL-026 | Queue eligibility guard           | Behavior   | P0          | Preserve                        |
| FUL-027 | Legacy route redirect             | Navigation | P2          | Preserve                        |
| FUL-028 | Permission tiers (read vs manage) | Permission | P0          | Preserve                        |

## Discrepancies

| ID           | Description                                                                | Severity |
| ------------ | -------------------------------------------------------------------------- | -------- |
| DISC-FUL-001 | "Shipping" label used everywhere — must become "Fulfillment"               | High     |
| DISC-FUL-002 | dateFrom/dateTo/customerId filters exist in API but no UI                  | Medium   |
| DISC-FUL-003 | packItems and markAllPacked have no audit log; only unpackItems logs       | High     |
| DISC-FUL-004 | Ship button shown for RESTOCKED orders (server blocks but UI doesn't)      | Low      |
| DISC-FUL-005 | useConcurrentEditDetection wired but version field never populated — inert | High     |
| DISC-FUL-006 | shipOrder requires orders:update but UI enables for orders:fulfill         | High     |
| DISC-FUL-007 | Dormant PickPackGrid.tsx prototype may confuse migration teams             | Medium   |
| DISC-FUL-008 | KeyboardHintBar shows 5 of 9 shortcuts                                     | Low      |
| DISC-FUL-009 | trackingNumber/carrier/notes fields on shipOrder not exposed in UI         | Medium   |
| DISC-FUL-010 | SHIPPED status has no token — renders as Pending color                     | Low      |

## Classification

- sheet-native: 13 | sheet-plus-sidecar: 14 | deferred: 1
