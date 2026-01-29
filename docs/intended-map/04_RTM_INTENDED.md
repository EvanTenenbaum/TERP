# Requirements Traceability Matrix (RTM)

**Purpose:** Link requirements to flows, rules, states, screens, endpoints, and models
**Created:** 2026-01-29
**CSV Version:** `04_RTM_INTENDED.csv`

---

## Overview

The RTM provides traceability from business requirements through to implementation:

```
Requirement → Flow(s) → Rule(s) → State(s) → Screen(s) → Endpoint(s) → Model(s)
```

This enables:
- **Impact analysis:** What flows/code are affected by a requirement change?
- **Coverage verification:** Are all requirements implemented?
- **Gap identification:** What's missing?

---

## Requirements by Category

### Core Invariants (REQ-001 to REQ-008)

These requirements derive from the 8 core business invariants.

| ReqID | Invariant | Description | Status |
|-------|-----------|-------------|--------|
| REQ-001 | INV-001 | Inventory cannot go negative | Intended&Implemented |
| REQ-002 | INV-001 | Non-negative inventory enforcement | Intended&Implemented |
| REQ-003 | INV-002 | Order total consistency | Intended&Implemented |
| REQ-004 | INV-003 | Invoice balance accuracy | Intended&Implemented |
| REQ-005 | INV-004 | GL entries balance | Intended&Implemented |
| REQ-006 | INV-005 | Client totalOwed accuracy | Intended&Implemented |
| REQ-007 | INV-007 | Audit trail completeness | Intended&Implemented |
| REQ-008 | INV-008 | Valid state transitions | Intended&Implemented |

### Golden Flow Requirements (REQ-009 to REQ-022)

| ReqID | Flow | Description | Status |
|-------|------|-------------|--------|
| REQ-009 | GF-002 | PO creation and tracking | Intended&Implemented |
| REQ-010 | GF-002 | PO goods receipt | **IntendedMissing** |
| REQ-011 | GF-004 | Single invoice payment | Intended&Implemented |
| REQ-012 | GF-004 | Multi-invoice payment | Intended&Implemented |
| REQ-013 | GF-005 | Pick, pack, ship | Intended&Implemented |
| REQ-014 | GF-006 | Client ledger view | Intended&Implemented |
| REQ-015 | GF-007 | Inventory adjustment | Intended&Implemented |
| REQ-016 | GF-007 | Batch status change | Intended&Implemented |
| REQ-017 | GF-008 | Sample request creation | Intended&Implemented |
| REQ-018 | GF-008 | Sample fulfillment | **IntendedMissing** |
| REQ-019 | GF-003 | Order inventory reservation | Intended&Implemented |
| REQ-020 | GF-005 | Ship decrement | Intended&Implemented |
| REQ-021 | GF-001 | Intake verification (FEAT-008) | **IntendedMissing** |
| REQ-022 | GF-004 | PDF invoice generation | Intended&Implemented |

### Supporting Requirements (REQ-023+)

| ReqID | Description | Status |
|-------|-------------|--------|
| REQ-023 | VIP portal access | Intended&Implemented |
| REQ-024 | Feature flag system | Intended&Implemented |
| REQ-025 | QA authentication | Intended&Implemented |

---

## Gap Analysis

### IntendedMissing Requirements

| ReqID | Description | Gap | Remediation |
|-------|-------------|-----|-------------|
| REQ-010 | PO goods receipt UI | API exists, no UI | Build receiving screen |
| REQ-018 | Sample fulfillment UI | API exists, no fulfill button | Add fulfill action to UI |
| REQ-021 | Intake verification (FEAT-008) | Workflow not complete | Complete FEAT-008 implementation |

### Implementation Priority

1. **P0:** REQ-010, REQ-021 (blocks GF-002, GF-001)
2. **P1:** REQ-018 (partial GF-008 functionality)

---

## Traceability by Golden Flow

### GF-001: Direct Intake

| Requirement | Rule | Invariant | Screen | Endpoint | Model |
|-------------|------|-----------|--------|----------|-------|
| REQ-001 | RULE-INV-010 | INV-001, INV-006 | PurchaseModal | inventory.createIntake | batches, lots |
| REQ-021 | - | INV-007 | IntakeVerification | inventory.verify | batches |

### GF-002: Procure-to-Pay

| Requirement | Rule | Invariant | Screen | Endpoint | Model |
|-------------|------|-----------|--------|----------|-------|
| REQ-009 | - | - | PurchaseOrders | purchaseOrders.* | purchase_orders |
| REQ-010 | RULE-INV-011 | INV-001 | **MISSING** | purchaseOrders.receive | batches |

### GF-003: Order-to-Cash

| Requirement | Rule | Invariant | Screen | Endpoint | Model |
|-------------|------|-----------|--------|----------|-------|
| REQ-003 | RULE-005 | INV-002 | OrderForm | orders.create | orders |
| REQ-019 | RULE-INV-001 | INV-001 | Orders | orders.confirm | batches |

### GF-004: Invoice & Payment

| Requirement | Rule | Invariant | Screen | Endpoint | Model |
|-------------|------|-----------|--------|----------|-------|
| REQ-004 | RULE-007 | INV-003 | Invoices | invoices.* | invoices |
| REQ-011 | RULE-008 | INV-003, INV-004 | RecordPaymentDialog | payments.recordPayment | payments |
| REQ-012 | RULE-007 | INV-003 | MultiInvoicePaymentForm | payments.recordMultiInvoicePayment | invoice_payments |
| REQ-022 | - | - | Invoices | vipPortal.documents.downloadInvoicePdf | invoices |

### GF-005: Pick & Pack

| Requirement | Rule | Invariant | Screen | Endpoint | Model |
|-------------|------|-----------|--------|----------|-------|
| REQ-013 | RULE-INV-003 | INV-001, INV-008 | PickPackPage | pickPack.*, orders.shipOrder | orders, bags |
| REQ-020 | RULE-INV-003 | INV-006 | PickPack | orders.shipOrder | batches |

### GF-006: Client Ledger

| Requirement | Rule | Invariant | Screen | Endpoint | Model |
|-------------|------|-----------|--------|----------|-------|
| REQ-006 | - | INV-005 | Dashboard | accounting.syncClientBalance | clients |
| REQ-014 | - | INV-003 | ClientLedger | accounting.getClientLedger | clients, invoices |

### GF-007: Inventory Management

| Requirement | Rule | Invariant | Screen | Endpoint | Model |
|-------------|------|-----------|--------|----------|-------|
| REQ-002 | RULE-INV-013 | INV-001 | Inventory | inventory.adjustQuantity | batches |
| REQ-015 | RULE-INV-012 | INV-006 | BatchDetailDrawer | inventory.adjustQuantity | inventory_movements |
| REQ-016 | RULE-INV-006 | INV-008 | BatchDetailDrawer | inventory.updateStatus | batches |

### GF-008: Sample Request

| Requirement | Rule | Invariant | Screen | Endpoint | Model |
|-------------|------|-----------|--------|----------|-------|
| REQ-017 | RULE-INV-014 | INV-001 | SampleForm | samples.createRequest | sample_requests |
| REQ-018 | RULE-INV-004 | INV-001 | **MISSING** | samples.fulfillRequest | batches |

---

## Coverage Statistics

| Category | Total | Implemented | Missing | Coverage |
|----------|-------|-------------|---------|----------|
| Invariant Requirements | 8 | 8 | 0 | 100% |
| Golden Flow Requirements | 14 | 11 | 3 | 79% |
| Supporting Requirements | 3 | 3 | 0 | 100% |
| **Total** | **25** | **22** | **3** | **88%** |
