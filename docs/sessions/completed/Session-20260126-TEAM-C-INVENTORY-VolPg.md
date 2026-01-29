# Team C: Inventory & Orders

**Session ID:** Session-20260126-TEAM-C-INVENTORY-VolPg
**Agent:** Team C (Claude)
**Started:** 2026-01-26
**Status:** In Progress
**Mode:** STRICT
**Branch:** claude/terp-team-c-setup-VolPg

## Tasks

- [ ] INV-001: Add Inventory Deduction on Ship/Fulfill
- [ ] INV-002: Fix Race Condition in Draft Order Confirmation
- [ ] INV-004: Add Reservation Release on Order Cancellation
- [ ] INV-005: Create Batches on PO Goods Receipt
- [ ] TERP-0007: Surface non-sellable batch status in UI
- [ ] TERP-0008: Standardize batch status constants
- [ ] SM-001: Implement Quote Status Transitions
- [ ] SM-002: Implement Sale Status Transitions
- [ ] SM-003: Implement VendorReturn Status Transitions
- [ ] ORD-002: Validate Positive Prices in Orders
- [ ] ORD-003: Fix Invalid Order State Transitions
- [ ] ORD-004: Add Credit Override Authorization
- [ ] PARTY-001: Add Nullable supplierClientId to POs
- [ ] PARTY-004: Convert Vendor Hard Deletes to Soft

## Execution Plan

### Batch 1 (Critical Inventory - 4h):
- INV-001: Inventory deduction on ship
- INV-002: Race condition fix with FOR UPDATE

### Batch 2 (Batch Status Foundation - 8-16h):
- TERP-0008: Standardize constants

### Batch 3 (Reservation & PO - 4h):
- INV-004: Reservation release on cancel
- INV-005: Batches on PO receipt

### Batch 4 (UI - 4-8h):
- TERP-0007: Batch status in UI

### Batch 5 (State Machines - 12h):
- SM-001/002/003: State machine implementations

### Batch 6 (Order Validations - 6h):
- ORD-002/003/004: Order validations

### Batch 7 (Party Model - 6h):
- PARTY-001/004: Party model fixes

## Progress Notes

### 2026-01-26
- Session started
- Reading codebase to understand current implementations
