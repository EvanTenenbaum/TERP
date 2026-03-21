# Capability Ledger Summary: Invoices

Snapshot: commit `7514e3e8` (main, 2026-03-20) | Extracted: 2026-03-20 | Checked Against Code: yes

## Module Family

Registry + Actions — hybrid. Registry is sheet-native. PDF/print and payment golden flow are sidecars.

## Architecture Decision

**Hybrid. Registry and status actions are sheet-native. PDF preview/print and payment golden flow remain as sidecars.**

The payment commit is trust-critical (InvoiceToPaymentFlow). PDF generation is server-side with 30s timeout. Print is browser-native. These cannot be inlined. Everything else — browse, filter, status transitions, void, create, AR aging — is sheet-native.

## Critical Constraints

1. **DISC-INV-001 (CRITICAL): Void UI calls wrong endpoint.** `accounting.invoices.updateStatus({status:"VOID"})` has NO GL reversal, no reason, no AR sync. `invoices.void` (correct path) is never called from UI. Financial integrity risk.
2. **DISC-INV-002 (HIGH): Mark as Sent is a toast stub.** `invoices.markSent` exists but is never called.
3. **DISC-INV-003 (HIGH): Invoice number generated client-side** as `INV-${Date.now()}`. `accounting.invoices.generateNumber` exists and should be used.
4. Payment commit owned by InvoiceToPaymentFlow — not absorbed into sheet
5. PDF has 30s server timeout, returns base64
6. Summary metrics computed from loaded page (max 50), not full AR book

## Capabilities (24 total, vs 15 from extraction — 1 false positive)

| ID      | Capability                       | Type       | Criticality | Migration Decision            |
| ------- | -------------------------------- | ---------- | ----------- | ----------------------------- |
| INV-001 | Invoice registry browse          | Query      | P0          | Adopt                         |
| INV-002 | Search by number/customer        | Query      | P0          | Adopt                         |
| INV-003 | Filter by status (8 values)      | Query      | P0          | Adopt                         |
| INV-004 | Filter by client                 | Query      | P1          | Adapt (API exists, no UI)     |
| INV-005 | Deep-link by id/invoiceId/status | Query      | P1          | Preserve                      |
| INV-006 | Summary metrics header           | View       | P1          | Adapt (use server getSummary) |
| INV-007 | AR Aging toggle panel            | Query      | P1          | Adapt                         |
| INV-008 | Invoice detail inspector         | Query      | P0          | Preserve (right-rail)         |
| INV-009 | Payment progress bar             | View       | P1          | Adopt (inline column)         |
| INV-010 | GL reversal status panel         | View       | P1          | Preserve (inspector)          |
| INV-011 | Create standalone invoice        | Mutation   | P1          | Adapt (fix number gen)        |
| INV-012 | Generate from order              | Mutation   | P0          | Preserve (not absorbed)       |
| INV-013 | Mark as paid (one-click)         | Mutation   | P0          | Adopt                         |
| INV-014 | Void invoice (safe path)         | Mutation   | P0          | Preserve (FIX endpoint)       |
| INV-015 | Mark as sent                     | Mutation   | P1          | Adopt (wire markSent)         |
| INV-016 | Record payment (golden flow)     | Mutation   | P0          | Preserve (sidecar)            |
| INV-017 | Download PDF                     | Export     | P1          | Preserve (sidecar)            |
| INV-018 | Print invoice                    | Export     | P2          | Preserve (sidecar)            |
| INV-019 | Export list CSV                  | Export     | P2          | Deferred (false positive)     |
| INV-020 | Keyboard contract                | Keyboard   | P1          | Adopt                         |
| INV-021 | Concurrent edit detection        | Safety     | P1          | Preserve                      |
| INV-022 | Pagination (50/page)             | Query      | P1          | Adopt                         |
| INV-023 | Overdue auto-escalation          | Background | P0          | Preserve (no UI needed)       |
| INV-024 | Send payment reminder            | Mutation   | P2          | Deferred (stub only)          |

## Discrepancies

| ID           | Description                                                          | Severity     |
| ------------ | -------------------------------------------------------------------- | ------------ |
| DISC-INV-001 | Void UI calls updateStatus (no GL reversal) instead of invoices.void | **Critical** |
| DISC-INV-002 | Mark as Sent is toast stub, markSent mutation never called           | High         |
| DISC-INV-003 | Invoice number client-generated via Date.now(), not sequential       | High         |
| DISC-INV-004 | Export in extraction CSV is false positive (JS export keyword)       | Medium       |
| DISC-INV-005 | Summary metrics from loaded page only (50 max), not full book        | Medium       |
| DISC-INV-006 | Client/date/search filters exist in API but no list UI controls      | Medium       |
| DISC-INV-007 | UI updateStatus has no version check; standalone router does         | Medium       |
| DISC-INV-008 | Create dialog allows zero-amount empty-item invoice                  | Low          |

## Classification

- sheet-native: 7 | sheet-plus-sidecar: 11 | preserve-sidecar: 2 | deferred: 3 | background: 1
