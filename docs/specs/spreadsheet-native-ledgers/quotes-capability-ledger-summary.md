# Capability Ledger Summary: Quotes

Snapshot: commit `7514e3e8` (main, 2026-03-20) | Extracted: 2026-03-20 | Checked Against Code: yes

## Module Family

Registry + Actions — but Quotes is a conversion funnel into Orders, not a standalone document type.

## Architecture Decision

**Quotes is a hybrid: sheet-native registry grid + shared OrderCreatorPage composer.**

Quote creation/editing runs through `OrderCreatorPage` (same composer as orders). Conversion produces a SALE order. The registry handles browse/filter/act. The composer is shared, not quote-specific.

The `quotes.*` router (list, getById, create, accept, reject, checkExpired) is unused by the UI — everything routes through `orders.*`. This is a maintenance liability.

## Critical Constraints

1. Conversion is inventory-modifying — `convertQuoteToSale` acquires FOR UPDATE locks on batches
2. Status machine enforced server-side (UNSENT → SENT → VIEWED → CONVERTED/REJECTED/EXPIRED)
3. Email status coupling — failed email send does NOT update status to SENT
4. Convert blocks if expired (but NULL validUntil bypasses check — see DISC-QUO-005)
5. No rejection UI exists — `quotes.reject` is API-only (DISC-QUO-003)
6. Invoice creation deferred to fulfillment — conversion does NOT create invoice

## Capabilities (30 total, vs 11 from extraction)

| ID      | Capability                       | Type           | Criticality | Migration Decision             |
| ------- | -------------------------------- | -------------- | ----------- | ------------------------------ |
| QUO-001 | Quote registry browse            | Query          | P0          | Adopt                          |
| QUO-002 | Filter by status (7 values)      | Query          | P0          | Adopt                          |
| QUO-003 | Search by number/client          | Query          | P1          | Adopt                          |
| QUO-004 | Header stats band                | View           | P1          | Adapt                          |
| QUO-005 | Arrow key navigation             | Keyboard       | P1          | Adopt                          |
| QUO-006 | Cmd+K search focus               | Keyboard       | P2          | Adopt                          |
| QUO-007 | Cmd+N new quote                  | Keyboard       | P2          | Adopt                          |
| QUO-008 | Inspector — quote info           | View           | P1          | Adopt                          |
| QUO-009 | Inspector — line items           | View           | P1          | Adopt                          |
| QUO-010 | Inspector — totals               | View           | P1          | Adopt                          |
| QUO-011 | Inspector — notes                | View           | P2          | Adopt                          |
| QUO-012 | Edit quote (UNSENT only)         | Navigation     | P0          | Preserve                       |
| QUO-013 | Send to client                   | Mutation       | P0          | Preserve                       |
| QUO-014 | Send dialog — custom message     | Mutation-stage | P1          | Preserve                       |
| QUO-015 | Convert to sales order           | Mutation       | P0          | Preserve                       |
| QUO-016 | Convert confirm dialog           | View           | P0          | Preserve                       |
| QUO-017 | Duplicate quote                  | Navigation     | P1          | Preserve                       |
| QUO-018 | Delete quote (UNSENT only)       | Mutation       | P0          | Preserve                       |
| QUO-019 | Save state indicator             | View           | P1          | Adopt                          |
| QUO-020 | Creation via OrderCreatorPage    | Mutation       | P0          | Preserve (shared composer)     |
| QUO-021 | Editing via OrderCreatorPage     | Mutation       | P0          | Preserve (shared composer)     |
| QUO-022 | Duplication via OrderCreatorPage | Mutation       | P1          | Preserve (shared composer)     |
| QUO-023 | Confirm/finalize quote           | Mutation       | P0          | Preserve                       |
| QUO-024 | Sales Sheet → Quote import       | Navigation     | P1          | Preserve                       |
| QUO-025 | Expiry display (validUntil)      | View           | P1          | Adopt                          |
| QUO-026 | Quote rejection (staff)          | Mutation       | P1          | Build-new (no UI exists)       |
| QUO-027 | Quote acceptance (client)        | Mutation       | P2          | Intentionally deferred         |
| QUO-028 | Bulk expire job                  | Mutation       | P1          | Intentionally deferred (infra) |
| QUO-029 | Email capability probe           | Query          | P2          | Adopt                          |
| QUO-030 | Status badge with icon           | View           | P2          | Adopt                          |

## Discrepancies

| ID           | Description                                                                     | Severity |
| ------------ | ------------------------------------------------------------------------------- | -------- |
| DISC-QUO-001 | UI uses orders.getAll not quotes.list — entire quotes.\* router is dead from UI | High     |
| DISC-QUO-002 | Three conversion endpoints route to same function — maintenance liability       | Medium   |
| DISC-QUO-003 | quotes.reject exists but no UI — staff cannot reject quotes                     | High     |
| DISC-QUO-004 | quotes.checkExpired has no scheduler — quotes never auto-expire                 | High     |
| DISC-QUO-005 | Quotes via OrderCreatorPage have NULL validUntil — bypass expiry enforcement    | High     |
| DISC-QUO-006 | Send dialog custom message not persisted to quote record                        | Medium   |

## Classification

- sheet-native: 5 | sheet-plus-sidecar: 18 | document-mode-shared: 5 | build-new: 1 | deferred: 2
