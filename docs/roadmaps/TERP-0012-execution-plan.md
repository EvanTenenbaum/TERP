# TERP-0012 Execution Plan: Accounting UI Flows

**Task:** Implement UI for accounting flows
**Estimate:** 24-40h
**Created:** 2026-01-26
**Depends On:** ACC-002, ACC-003, ACC-004, ACC-005, ARCH-002, ARCH-003, ARCH-004 (all completed)

## Overview

This task implements frontend UI components to expose the accounting backend functionality completed by Team B. The goal is to provide users with:

1. Visibility into GL reversals and state machine transitions
2. Client balance management with discrepancy detection
3. Financial reports (Balance Sheet, P&L)
4. Enhanced invoice/bill status transitions with validation feedback
5. COGS visibility in order accounting

---

## Existing Pages (For Reference)

| Page                      | Status      | Notes                                          |
| ------------------------- | ----------- | ---------------------------------------------- |
| `AccountingDashboard.tsx` | ✅ Complete | AR/AP aging, quick actions, overdue items      |
| `GeneralLedger.tsx`       | ✅ Complete | Ledger entries, trial balance, journal posting |
| `ChartOfAccounts.tsx`     | ✅ Complete | Full CRUD for accounts                         |
| `FiscalPeriods.tsx`       | ✅ Complete | Period management with status changes          |
| `Invoices.tsx`            | ✅ Complete | Invoice list, payments, status changes         |
| `Bills.tsx`               | ✅ Complete | Bill list, payment tracking                    |
| `Payments.tsx`            | ✅ Complete | Payment records                                |
| `BankAccounts.tsx`        | ✅ Complete | Bank account management                        |
| `BankTransactions.tsx`    | ✅ Complete | Bank transactions                              |
| `Expenses.tsx`            | ✅ Complete | Expense tracking                               |

---

## Implementation Phases

### Phase 1: Client Balance Management (4-6h)

Expose ARCH-002 client balance service in the UI.

| Step | File                                                     | Change                                                               | Est |
| ---- | -------------------------------------------------------- | -------------------------------------------------------------------- | --- |
| 1.1  | `client/src/components/accounting/ClientBalanceCard.tsx` | Create component showing computed vs stored balance with sync button | 45m |
| 1.2  | `client/src/pages/accounting/ClientBalances.tsx`         | Create page to list all clients with balance discrepancies           | 60m |
| 1.3  | `client/src/pages/clients/ClientDetail.tsx`              | Add ClientBalanceCard to client detail view                          | 30m |
| 1.4  | `client/src/pages/accounting/AccountingDashboard.tsx`    | Add balance discrepancy alert widget                                 | 30m |
| 1.5  | `server/routers/accounting.ts`                           | Verify endpoints are exposed (already done)                          | 10m |
| 1.6  | Unit tests                                               | Add tests for ClientBalanceCard component                            | 30m |

**Deliverables:**

- [ ] ClientBalanceCard component with computed/stored/discrepancy display
- [ ] ClientBalances page showing all clients with sync functionality
- [ ] Balance discrepancy widget on dashboard
- [ ] Sync button to trigger `syncClientBalance` mutation

### Phase 2: GL Reversal Visibility (3-4h)

Surface ACC-002/ACC-003 GL reversals in the UI.

| Step | File                                                     | Change                                              | Est |
| ---- | -------------------------------------------------------- | --------------------------------------------------- | --- |
| 2.1  | `client/src/pages/accounting/GeneralLedger.tsx`          | Add reversal indicator badge to entries             | 30m |
| 2.2  | `client/src/components/accounting/GLEntryDetail.tsx`     | Create component showing entry with linked reversal | 45m |
| 2.3  | `client/src/pages/accounting/Invoices.tsx`               | Show GL entries in invoice detail sheet             | 45m |
| 2.4  | `client/src/components/accounting/VoidConfirmDialog.tsx` | Create void confirmation with reversal preview      | 45m |
| 2.5  | `client/src/pages/accounting/Returns.tsx`                | Create returns/credit memos page                    | 60m |

**Deliverables:**

- [ ] GL entries show reversal badge with link to reversing entry
- [ ] Invoice void shows confirmation with GL reversal preview
- [ ] Returns page listing credit memos with GL visibility

### Phase 3: Financial Reports (6-8h)

Create standard accounting reports: Trial Balance (enhanced), Balance Sheet, P&L.

| Step | File                                                   | Change                                  | Est |
| ---- | ------------------------------------------------------ | --------------------------------------- | --- |
| 3.1  | `server/routers/accounting.ts`                         | Add Balance Sheet endpoint              | 45m |
| 3.2  | `server/routers/accounting.ts`                         | Add Profit & Loss endpoint              | 45m |
| 3.3  | `client/src/pages/accounting/reports/BalanceSheet.tsx` | Create Balance Sheet page               | 90m |
| 3.4  | `client/src/pages/accounting/reports/ProfitLoss.tsx`   | Create P&L statement page               | 90m |
| 3.5  | `client/src/pages/accounting/reports/TrialBalance.tsx` | Extract trial balance to dedicated page | 45m |
| 3.6  | `client/src/pages/accounting/reports/index.tsx`        | Create reports hub page                 | 30m |
| 3.7  | `client/src/pages/accounting/AccountingDashboard.tsx`  | Add quick links to reports              | 15m |
| 3.8  | Export functionality                                   | Add PDF/CSV export for all reports      | 60m |

**Deliverables:**

- [ ] Balance Sheet page with Assets = Liabilities + Equity verification
- [ ] Profit & Loss statement by period
- [ ] Trial Balance dedicated page
- [ ] Reports hub with navigation
- [ ] Export to PDF/CSV

### Phase 4: Bill Status State Machine UI (3-4h)

Expose ARCH-004 bill state machine in the UI.

| Step | File                                                          | Change                                       | Est |
| ---- | ------------------------------------------------------------- | -------------------------------------------- | --- |
| 4.1  | `client/src/components/accounting/BillStatusBadge.tsx`        | Enhance with valid next statuses dropdown    | 30m |
| 4.2  | `client/src/components/accounting/BillStatusTimeline.tsx`     | Create visual status timeline component      | 60m |
| 4.3  | `client/src/pages/accounting/Bills.tsx`                       | Add status transition UI in detail sheet     | 45m |
| 4.4  | `client/src/components/accounting/StatusTransitionDialog.tsx` | Create confirmation dialog for transitions   | 30m |
| 4.5  | Error handling                                                | Display validation errors from state machine | 30m |

**Deliverables:**

- [ ] Bill detail shows valid next statuses as clickable actions
- [ ] Visual timeline showing bill status history
- [ ] Confirmation dialog for status transitions
- [ ] Clear error messages for invalid transitions

### Phase 5: Order COGS Visibility (2-3h)

Surface ACC-004 COGS GL entries in order accounting.

| Step | File                                                  | Change                                    | Est |
| ---- | ----------------------------------------------------- | ----------------------------------------- | --- |
| 5.1  | `client/src/components/orders/OrderCOGSSummary.tsx`   | Create component showing COGS breakdown   | 45m |
| 5.2  | `client/src/pages/sales/OrderDetail.tsx`              | Add COGS summary to order detail          | 30m |
| 5.3  | `client/src/pages/accounting/AccountingDashboard.tsx` | Add COGS widget showing recent sales COGS | 30m |
| 5.4  | `server/routers/orders.ts`                            | Add endpoint for order COGS summary       | 30m |

**Deliverables:**

- [ ] Order detail shows COGS per line item
- [ ] Total COGS for order
- [ ] GL entry links from COGS summary

### Phase 6: Fiscal Period Validation UI (2-3h)

Surface ACC-005 fiscal period validation in UI.

| Step | File                                                        | Change                                              | Est |
| ---- | ----------------------------------------------------------- | --------------------------------------------------- | --- |
| 6.1  | `client/src/components/accounting/FiscalPeriodSelector.tsx` | Add locked/closed period warning                    | 20m |
| 6.2  | `client/src/components/accounting/JournalEntryForm.tsx`     | Show period status, disable submission for closed   | 30m |
| 6.3  | `client/src/pages/accounting/GeneralLedger.tsx`             | Add current period indicator in header              | 20m |
| 6.4  | Error handling                                              | Display clear errors when posting to closed period  | 30m |
| 6.5  | `client/src/pages/accounting/FiscalPeriods.tsx`             | Add confirmation dialog for closing/locking periods | 30m |

**Deliverables:**

- [ ] FiscalPeriodSelector shows period status visually
- [ ] Journal entry form prevents submission to closed periods
- [ ] Clear error messages when attempting closed period posting
- [ ] Confirmation dialogs for period status changes

### Phase 7: Order State Machine UI (2-3h)

Surface ARCH-003 order state machine enhancements.

| Step | File                                                   | Change                                  | Est |
| ---- | ------------------------------------------------------ | --------------------------------------- | --- |
| 7.1  | `client/src/components/orders/OrderStatusBadge.tsx`    | Enhance with valid next statuses        | 30m |
| 7.2  | `client/src/components/orders/OrderStatusTimeline.tsx` | Create visual status history timeline   | 45m |
| 7.3  | `client/src/pages/sales/OrderDetail.tsx`               | Add status transition actions           | 30m |
| 7.4  | Error handling                                         | Display state machine validation errors | 30m |

**Deliverables:**

- [ ] Order detail shows valid next status actions
- [ ] Visual timeline of order status changes
- [ ] Clear validation error messages

### Phase 8: Integration Testing & Polish (2-4h)

| Step | File                | Change                                       | Est |
| ---- | ------------------- | -------------------------------------------- | --- |
| 8.1  | E2E tests           | Add Playwright tests for client balance flow | 45m |
| 8.2  | E2E tests           | Add tests for GL reversal visibility         | 30m |
| 8.3  | E2E tests           | Add tests for report generation              | 30m |
| 8.4  | Mobile optimization | Ensure all new components are responsive     | 45m |
| 8.5  | Loading states      | Add proper loading/error states              | 30m |
| 8.6  | Documentation       | Update user guide with new features          | 30m |

---

## Verification Checklist

Before marking complete:

- [ ] `pnpm check` - Zero TypeScript errors
- [ ] `pnpm lint` - No linting errors
- [ ] `pnpm test` - All tests pass
- [ ] `pnpm build` - Build succeeds
- [ ] Manual testing of each new feature
- [ ] Mobile responsiveness verified
- [ ] GL balance verification: debits = credits

---

## Risk Notes

1. **Client balance sync** - Batch syncing many clients could be slow; may need progress indicator
2. **Report generation** - Large date ranges could timeout; consider pagination or background generation
3. **State machine validation** - Backend errors must be user-friendly in UI

---

## Rollback Plan

1. All new pages can be disabled via route removal
2. New components are additive, not replacing existing functionality
3. Backend endpoints already verified working
4. Feature flags can be added if needed for gradual rollout

---

## Dependencies

### Backend Endpoints Needed (Most Already Exist)

| Endpoint                                     | Status    | Notes                        |
| -------------------------------------------- | --------- | ---------------------------- |
| `accounting.clientBalance.compute`           | ✅ Ready  | ARCH-002                     |
| `accounting.clientBalance.sync`              | ✅ Ready  | ARCH-002                     |
| `accounting.clientBalance.findDiscrepancies` | ✅ Ready  | ARCH-002                     |
| `accounting.ledger.getByReference`           | 🔲 Needed | For invoice/order GL entries |
| `accounting.reports.balanceSheet`            | 🔲 Needed | Phase 3                      |
| `accounting.reports.profitLoss`              | 🔲 Needed | Phase 3                      |
| `orders.getCOGSSummary`                      | 🔲 Needed | Phase 5                      |

---

## Time Summary

| Phase     | Description                  | Estimate   |
| --------- | ---------------------------- | ---------- |
| 1         | Client Balance Management    | 4-6h       |
| 2         | GL Reversal Visibility       | 3-4h       |
| 3         | Financial Reports            | 6-8h       |
| 4         | Bill Status State Machine UI | 3-4h       |
| 5         | Order COGS Visibility        | 2-3h       |
| 6         | Fiscal Period Validation UI  | 2-3h       |
| 7         | Order State Machine UI       | 2-3h       |
| 8         | Integration Testing & Polish | 2-4h       |
| **Total** |                              | **24-35h** |

Buffer for unknowns: +5h
**Total with buffer: 29-40h** (matches original estimate)

---

## Suggested Execution Order

1. **Phase 6** (Fiscal Period) - Quick win, builds on existing component
2. **Phase 4** (Bill State Machine) - Exposes ARCH-004 work
3. **Phase 7** (Order State Machine) - Exposes ARCH-003 work
4. **Phase 1** (Client Balances) - Key ARCH-002 visibility
5. **Phase 5** (COGS) - Order accounting visibility
6. **Phase 2** (GL Reversals) - ACC-002/003 visibility
7. **Phase 3** (Reports) - Largest phase, saves for when patterns established
8. **Phase 8** (Testing) - Final polish
