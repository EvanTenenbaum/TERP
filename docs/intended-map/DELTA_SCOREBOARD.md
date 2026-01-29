# Delta Scoreboard

**Purpose:** Summary of implementation gaps between intended and actual behavior
**Created:** 2026-01-29
**Source:** Cross-referencing intent sources with implementation inventories

---

## Overall Status

| Category | Count | Percentage |
|----------|-------|------------|
| Intended&Implemented | 55 | 73% |
| IntendedMissing | 8 | 11% |
| Divergent | 3 | 4% |
| ImplNotIntended | 5 | 7% |
| Unspecified | 4 | 5% |
| Unresolved | 0 | 0% |
| **Total Elements** | **75** | 100% |

---

## Golden Flow Status

| Flow | Status | Implementation | Blockers |
|------|--------|----------------|----------|
| GF-001 | BLOCKED | 70% | BUG-112: Form fields not rendering |
| GF-002 | PARTIAL | 60% | PO Receiving UI missing |
| GF-003 | BLOCKED | 75% | SQL error on inventory load |
| GF-004 | IMPLEMENTED | 95% | Minor PDF timeout |
| GF-005 | FUNCTIONAL | 90% | Depends on GF-003 |
| GF-006 | FUNCTIONAL | 85% | Data inconsistencies |
| GF-007 | BLOCKED | 70% | Shows 0 batches |
| GF-008 | PARTIAL | 65% | Fulfillment UI gap |

---

## Top Deltas (Severity-Ranked)

### P0 - Critical (Blocking Release)

| ID | Type | Description | Impact | Remediation |
|----|------|-------------|--------|-------------|
| DELTA-001 | IntendedMissing | GF-001 form fields not rendering | GF-001 completely blocked | Fix BUG-112 |
| DELTA-002 | IntendedMissing | GF-003 SQL error on inventory | GF-003 and GF-005 blocked | Fix SQL query |
| DELTA-003 | IntendedMissing | GF-007 shows 0 batches | Inventory management blocked | Debug data loading |

### P1 - High (Major Feature Gap)

| ID | Type | Description | Impact | Remediation |
|----|------|-------------|--------|-------------|
| DELTA-004 | IntendedMissing | PO Receiving UI (GF-002) | Cannot receive via UI | Build receiving screen |
| DELTA-005 | IntendedMissing | Sample Fulfill UI (GF-008) | Cannot fulfill samples via UI | Add fulfill button |
| DELTA-006 | IntendedMissing | Intake Verification (FEAT-008) | No two-step verification | Complete FEAT-008 |

### P2 - Medium (Functionality Works, Edge Cases)

| ID | Type | Description | Impact | Remediation |
|----|------|-------------|--------|-------------|
| DELTA-007 | Divergent | PDF generation timeout | Occasional failure on large invoices | Optimize PDF generation |
| DELTA-008 | Divergent | Client ledger data inconsistencies | Some balances incorrect | Run syncClientBalance |
| DELTA-009 | Divergent | Batch status UI doesn't match API | Confusion in status display | Align UI/API values |

### P3 - Low (Minor Issues)

| ID | Type | Description | Impact | Remediation |
|----|------|-------------|--------|-------------|
| DELTA-010 | ImplNotIntended | Extra API endpoints for debugging | Security risk if exposed | Remove or gate |
| DELTA-011 | Unspecified | Some error messages not documented | UX inconsistency | Document and standardize |

---

## Deltas by Category

### IntendedMissing (Intent exists, implementation missing)

| Element | Intent Source | Notes |
|---------|---------------|-------|
| PO Receiving UI | GF-002 | API exists, no UI |
| Sample Fulfill UI | GF-008 | API exists, no button |
| Intake Verification | GF-001:FEAT-008 | Workflow incomplete |
| Multi-location inventory | GF-007 | Partially implemented |

### Divergent (Implementation differs from intent)

| Element | Intent | Implementation | Resolution |
|---------|--------|----------------|------------|
| Sample status "Approved" | FULFILLED | UI shows "Approved" | Document as intentional |
| Batch availableQty | Calculated | Sometimes cached | Always calculate |
| Order cancellation | Before ship only | Can cancel invoiced | Add guard |

### ImplNotIntended (Implementation without spec)

| Element | Implementation | Action |
|---------|----------------|--------|
| Debug endpoints | Various routers | Gate or remove |
| Test data tools | Seeding commands | Document as dev-only |
| Legacy vendor routes | Still active | Deprecate |

### Unspecified (No intent found)

| Element | Category | Action Needed |
|---------|----------|---------------|
| Bulk order operations | Sales | Spec needed |
| Inventory transfers | Inventory | Spec needed |
| Automated aging alerts | Accounting | Spec needed |

---

## Invariant Compliance

| Invariant | Status | Violations Found |
|-----------|--------|------------------|
| INV-001 | OK | 0 |
| INV-002 | OK | 0 |
| INV-003 | CHECK | 2 minor (rounding) |
| INV-004 | OK | 0 |
| INV-005 | CHECK | 5 (need resync) |
| INV-006 | OK | 0 |
| INV-007 | OK | 0 |
| INV-008 | WARN | 1 (order cancel after invoice) |

---

## RBAC Compliance

| Role | Expected Permissions | Actual | Delta |
|------|---------------------|--------|-------|
| super_admin | All | All | OK |
| sales_manager | Orders, Clients, Inventory (read) | Matching | OK |
| sales_rep | Own orders, limited clients | Matching | OK |
| inventory_manager | Inventory, POs | Matching | OK |
| accounting_manager | AR/AP, GL, payments | Matching | OK |
| fulfillment | Pick/pack, orders (limited) | Matching | OK |
| auditor | Read-only all | Matching | OK |

---

## Remediation Priority

### Immediate (This Sprint)
1. Fix BUG-112 (GF-001 form rendering)
2. Fix SQL error (GF-003)
3. Debug batch loading (GF-007)

### Next Sprint
1. Build PO Receiving UI
2. Add Sample Fulfill button
3. Complete FEAT-008 verification

### Backlog
1. Client balance resync
2. Remove debug endpoints
3. Document unspecified features
