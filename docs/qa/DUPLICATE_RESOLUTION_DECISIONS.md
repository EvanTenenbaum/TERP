# Duplicate Resolution Decisions

**Date:** 2026-01-26
**Agent:** QA & Merge Agent

## Overview

Multiple PRs touch the same files. This document records resolution decisions for overlapping changes.

## Overlapping Files Analysis

| File | PRs | Resolution |
|------|-----|------------|
| `server/services/orderOrchestrator.ts` | #309 (Team A), #313 (Team B) | **Select Team B** - More comprehensive (1224 vs 511 lines), includes GL integration |
| `server/routers/orders.ts` | #308 (Team C), #313 (Team B) | **MERGE BOTH** - Team C has inventory locking (FOR UPDATE), Team B has COGS/margin |
| `server/routers/returns.ts` | #308 (Team C), #313 (Team B) | **MERGE BOTH** - Team C has state machine, Team B has GL reversals |
| `server/services/orderStateMachine.ts` | #308 (Team C), #313 (Team B) | **Select Team B** - Has ARCH-003 updates with more flexible transitions + validateTransition function |
| `server/routers/accounting.ts` | #309 (Team A), #313 (Team B) | **Select Team B** - Team B owns accounting domain |
| `client/src/components/accounting/FiscalPeriodSelector.tsx` | #312 (Team D), #313 (Team B) | **Select Team B** - Team B owns accounting components |
| `client/src/components/accounting/MultiInvoicePaymentForm.tsx` | #310 (Team F), #312 (Team D) | **Select Team D** - Code quality improvements |

## Detailed Analysis

### orderOrchestrator.ts (Team A #309 vs Team B #313)

**Selected:** Team B (PR #313)
**Reason:** 
- Team B's version is significantly more comprehensive (1224 lines vs 511 lines)
- Includes full GL entry integration for accounting
- Has COGS calculation integration
- Contains withRetryableTransaction for proper transaction handling
- Team A's version is a simpler coordination layer

**From Team A to preserve:** 
- Transaction retry logic (already in Team B)
- Validation service integration (Team B has equivalent)

### orders.ts (Team C #308 vs Team B #313)

**Selected:** MERGE BOTH
**Team C contribution:** 
- INV-001/002: `SELECT FOR UPDATE` for inventory locking
- Race condition prevention (BUG-301, BUG-304)
- Inventory validation logic

**Team B contribution:**
- COGS/margin calculation features
- Enhanced draft order creation with COGS
- updateLineItemCOGS procedure

**Resolution:** Apply Team C first (inventory safety), then add Team B's COGS features

### returns.ts (Team C #308 vs Team B #313)

**Selected:** MERGE BOTH
**Team C contribution:**
- SM-003: Return status state machine
- extractReturnStatus function
- Status transition validation

**Team B contribution:**
- ACC-003: GL reversal entries on returns
- reverseGLEntries integration
- GLPostingError handling

**Resolution:** Apply Team C first (state machine), then add Team B's GL reversals

### orderStateMachine.ts (Team C #308 vs Team B #313)

**Selected:** Team B (PR #313)
**Reason:**
- Team B has ARCH-003 updates with more flexible transitions
- Includes validateTransition helper function
- Allows CONFIRMED -> SHIPPED (skip PACKED step)
- Better error messages with order ID references

**Note:** Team C's stricter transitions may be intentional - review with business rules

