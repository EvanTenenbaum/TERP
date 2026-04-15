# Foundation Grep Audit

This file records the explicit sweep commands Claude asked for after the first Foundation scorecard rerun.

## TER-1095 — Remaining literal `Badge variant="default"` audit

Command run:

```bash
rg -nUP '<Badge(?:.|\n){0,120}?variant="default"' client/src --glob '*.tsx'
```

Remaining hits after the Foundation fixes:

- `client/src/components/cogs/CogsClientSettings.tsx:59`
- `client/src/components/cogs/CogsClientSettings.tsx:61`
- `client/src/components/inventory/PhotographyModule.tsx:385`
- `client/src/components/credit/CreditLimitWidget.tsx:246`
- `client/src/components/credit/CreditLimitWidget.tsx:275`
- `client/src/pages/MatchmakingServicePage.tsx:719`
- `client/src/components/clients/AddClientWizard.tsx:1032`
- `client/src/components/settings/rbac/PermissionAssignment.tsx:577-578`
- `client/src/components/orders/MarginInput.tsx:115`
- `client/src/components/clients/MobileClientCard.tsx:81`
- `client/src/components/settings/rbac/RoleManagement.tsx:332`
- `client/src/components/settings/rbac/RoleManagement.tsx:408`

Classification:

- Non-operational pricing/discount tags: `CogsClientSettings`, `MarginInput`
- Decorative/selection chips: `PhotographyModule`, `MatchmakingServicePage`, `AddClientWizard`
- Credit/role/system taxonomy badges rather than operational workflow status badges: `CreditLimitWidget`, `PermissionAssignment`, `RoleManagement`, `MobileClientCard`

Operational workflow status badge call sites already routed through the canonical helper:

- `client/src/pages/PhotographyPage.tsx`
- `client/src/pages/TimeClockPage.tsx`
- `client/src/pages/LiveShoppingPage.tsx`
- `client/src/components/vip-portal/LiveCatalogConfig.tsx` including submitted interest-list statuses plus availability / price-alert statuses
- `client/src/components/vip-portal/LiveCatalog.tsx`

Conclusion:

- No remaining literal `variant="default"` hits are operational workflow status badges.

## TER-1096 — Generic empty-state string audit

Command run:

```bash
rg -n 'No data|No data found|No results|No records match this view yet\.' client/src --glob '*.tsx'
```

Remaining hits after the Foundation fixes:

- Search-description copy: `client/src/pages/SearchResultsPage.tsx:405`
- Command palette empty state: `client/src/components/CommandPalette.tsx:284,290`
- Shared empty-state preset titles: `client/src/components/ui/empty-state.tsx:303,419`
- Report explanatory copy: `client/src/components/accounting/BalanceSheetReport.tsx:174`, `client/src/components/accounting/IncomeStatementReport.tsx:220`
- Export toasts: `client/src/components/work-surface/InventoryWorkSurface.tsx:1571`, `client/src/components/ui/export-button.tsx:205,289`, `client/src/components/spreadsheet-native/ExpensesSurface.tsx:409`
- Comments/tests/comments-only references: `VendorSearchWithBrands.tsx`, `MentionInput.tsx`, `DataCardGrid.tsx`, `CommandPalette.test.tsx`, `ClientLeaderboardCard.tsx`
- Shared table default string still defined as copy input: `client/src/components/ui/responsive-table.tsx:89`

Classification:

- `ResponsiveTable` no longer renders a raw `<p>` empty state; it now renders `OperationalEmptyState`
- Remaining hits are intentional search/report/toast/preset copy or comments/tests, not generic operational empty-state regressions

Conclusion:

- The shared generic table/list regression has been removed, and the remaining string hits are intentional non-regression cases.

## TER-1097 — Raw ISO display sweep

Command run:

```bash
rg -n -C 1 'toISOString\(|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z' client/src --glob '*.tsx'
```

Observed hit families:

- React keys and calendar math: `SchedulingPage`, `ShiftScheduleView`, `WeekView`, `MonthView`, `DayView`
- Form defaults / input values / min-date attributes: `ClientProfilePage`, `VendorSupplyPage`, `AppointmentBooking`, `EventFormDialog`, `NeedForm`, `OrderPreview`, `TimeOffRequestForm`, `RecurrencePatternBuilder`, `AddCommunicationModal`, `ClientWantsSection`, `SupplyForm`, `PurchaseOrdersWorkSurface`, `PurchaseOrderSurface`, `BankTransactionsSurface`, `FiscalPeriodsSurface`
- Export/download filenames and telemetry: `Leaderboard/ExportButton`, `export-button.tsx`, `ClientComplexTab`, `ReceiptCapture`, `SimpleDashboard`, `DataCardGrid`
- Internal row normalization or mutation payload shaping before downstream display formatting: `OrdersWorkSurface`, `InventoryWorkSurface`, `BillsSurface`, `InvoicesSurface`, `ReturnsPilotSurface`, `FulfillmentPilotSurface`, golden-flow helpers
- Test fixtures only: `VIPDashboard.test.tsx`, `ClientCommitContextCard.test.tsx`

Confirmed display formatter fixes applied in the raw-date display surfaces found during the Foundation sweep:

- `client/src/components/spreadsheet-native/BankTransactionsSurface.tsx`
  - date column now uses `valueFormatter: formatDate(...)`
- `client/src/components/spreadsheet/PickPackGrid.tsx`
  - date column now uses `valueFormatter: formatDate(...)`
- `client/src/components/spreadsheet-native/FiscalPeriodsSurface.tsx`
  - surface date formatting now defers to shared `formatDate`

Supporting proof:

- `client/src/lib/dateFormat.ts`
- `client/src/lib/dateFormat.test.ts`

Conclusion:

- The remaining `toISOString()` hits are not confirmed raw-display regressions in Foundation scope; they are keys, form/input values, exports, telemetry, normalization, or tests.
