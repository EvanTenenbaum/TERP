# Customer Credit System Improvement - Requirements

## Overview

Improve the existing customer credit system to make it more accurate, integrated, and user-friendly while maintaining full transparency and user control.

## Problem Statement

The current credit system has several critical issues:

1. **Data Disconnection**: The `CreditLimitBanner` component reads `client.creditLimit` which doesn't exist in the `clients` table schema - it always returns $0
2. **No Enforcement**: Credit limits are advisory only - no server-side validation prevents orders exceeding limits
3. **Manual Calculation**: Credit must be manually calculated via button click - no automatic updates
4. **Complex UI**: The `CreditLimitWidget` shows 6 signals with weights - designed for analysts, not operators
5. **Missing Integration**: Credit not shown in client list, VIP Portal Credit Center is non-functional

## User Requirements

### Functional Requirements

1. **FR-1**: Credit limit must be stored on the `clients` table for fast access
2. **FR-2**: Credit limit must auto-sync from `client_credit_limits` table when calculated
3. **FR-3**: Orders should show warnings when exceeding credit limit (not block by default)
4. **FR-4**: Users can override credit warnings with a required reason (audit trail)
5. **FR-5**: Credit should auto-recalculate on financial transactions (real-time)
6. **FR-6**: Daily batch job should recalculate all client credit limits
7. **FR-7**: Credit indicator should appear in client list view
8. **FR-8**: Users can manually override calculated credit limits with reason
9. **FR-9**: Every calculated number must have "show your work" explanation
10. **FR-10**: Users can toggle visibility of credit UI elements per-location

### Non-Functional Requirements

1. **NFR-1**: No black boxes - every decision must be explainable
2. **NFR-2**: Progressive disclosure - start simple, expand on demand
3. **NFR-3**: Internal tools are higher priority than VIP Portal
4. **NFR-4**: Credit calculations must complete in <500ms
5. **NFR-5**: All credit changes must be audited

## User Decisions (Confirmed)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Enforcement | Warning only (not blocking) | Users can override with reason |
| Auto-calculation | Real-time + daily batch | Balance freshness with performance |
| Priority | Internal tools first | VIP Portal is Phase 5 |
| Transparency | "Show the math" everywhere | No black boxes |
| Control | Per-location visibility toggles | Users control what's shown |

## Acceptance Criteria

### AC-1: Credit Limit on Clients Table
- [ ] `creditLimit` column exists on `clients` table
- [ ] `creditLimitUpdatedAt` column tracks last sync
- [ ] Value syncs automatically when credit is calculated

### AC-2: CreditLimitBanner Works
- [ ] Banner reads actual `client.creditLimit` value
- [ ] Shows correct utilization percentage
- [ ] Displays warning states (75%, 90%, 100%+)
- [ ] Never shows $0 for clients with calculated limits

### AC-3: Order Creation Warnings
- [ ] Warning appears when order exceeds available credit
- [ ] User can proceed with override reason
- [ ] Override reason is logged to audit trail
- [ ] Blocking mode is configurable (default: warning only)

### AC-4: Auto-Recalculation
- [ ] Credit recalculates on invoice creation
- [ ] Credit recalculates on payment recording
- [ ] Daily batch job runs for all clients
- [ ] Recalculation completes in <500ms per client

### AC-5: Client List Credit Indicator
- [ ] Credit health indicator visible in client list
- [ ] Color-coded (green/yellow/red) based on utilization
- [ ] Clicking indicator opens credit details

### AC-6: Manual Override
- [ ] Users can set manual credit limit
- [ ] Reason is required for override
- [ ] Override is logged to audit trail
- [ ] Manual limits persist until next manual change

### AC-7: Transparency
- [ ] Every signal shows calculation breakdown
- [ ] Credit limit shows formula used
- [ ] Audit log shows all changes with reasons

### AC-8: Visibility Controls
- [ ] Admin can toggle credit UI visibility
- [ ] Settings stored per-location
- [ ] Hidden elements don't render (not just CSS hidden)

## Out of Scope (Phase 1)

- VIP Portal credit display (Phase 5)
- Credit-based payment terms automation
- Credit insurance integration
- Multi-currency credit limits
