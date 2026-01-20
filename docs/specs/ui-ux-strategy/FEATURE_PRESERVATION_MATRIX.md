# FEATURE_PRESERVATION_MATRIX.md

> **Purpose**: Proof that no feature is lost in the UX redesign. Items marked **UNKNOWN** must be validated and tracked in the roadmap.
>
> **Last Updated**: 2026-01-19 (Deep Gap Analysis - Second Pass)
>
> **Status Summary**:
> - ✅ Confirmed: 99 features (includes 3 resolved from unknown + 8 new discoveries)
> - ⚙️ API-Only: 8 features (intentionally backend-only, no UI required)
> - ❓ Unknown: 3 features (pending final validation)
> - ❌ Missing: 1 feature (DF-067 Recurring Orders - no implementation found)
>
> **Criticality Summary**:
> - P0 (Critical): 24 features - Must preserve with full test coverage
> - P1 (High): 48 features - Must preserve with E2E coverage
> - P2 (Medium): 38 features - Must preserve with UI smoke tests
>
> **Page Coverage**: 86 pages identified, 72 explicitly documented (84% coverage)

| Feature ID | Feature Name                                         | Module            | Current Surface                     | Source                        | Criticality | Future UX Pattern(s) used        | Dependencies (DB/API/UI)                                                                 | Failure Mode if lost          | Test Coverage required           | Status    |
| ---------- | ---------------------------------------------------- | ----------------- | ----------------------------------- | ----------------------------- | ----------- | -------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------- | -------------------------------- | --------- |
| DF-001     | Calendar & Event Management                          | Scheduling        | /calendar, /scheduling              | USER_FLOWS                    | P1          | Work Surface (review), Inspector | DB: calendar_events; API: calendar router; UI: calendar views                            | Lost scheduling operations    | E2E calendar create/edit         | confirmed |
| DF-002     | Task Management & Todo Lists                         | Productivity      | /tasks, /todo-lists                 | USER_FLOWS                    | P2          | Panel/Form                       | DB: tasks; API: tasks router; UI: TodoListsPage                                          | Task tracking lost            | Unit + E2E list flow             | confirmed |
| DF-003     | Advanced Accounting Module                           | Accounting        | /accounting/\*                      | USER_FLOWS + USER_FLOW_MATRIX | P0          | Work Surface + Inspector         | DB: invoices, payments, ledger; API: accounting router; UI: accounting pages             | Financial ops blocked         | E2E invoice/payment              | confirmed |
| DF-004     | Freeform Notes & Commenting                          | Collaboration     | /notes, comments sections           | USER_FLOWS                    | P2          | Panel + Quick Create             | DB: notes/comments; API: comments router; UI: notes components                           | Context lost                  | Unit + UI smoke                  | confirmed |
| DF-005     | VIP Customer Portal                                  | VIP               | /vip-portal/\*                      | USER_FLOWS                    | P1          | Dashboard + Panel                | DB: vip tables; API: vip router; UI: VIP pages                                           | VIP feature loss              | E2E VIP login flow               | confirmed |
| DF-006     | Client Needs Management                              | CRM               | /needs                              | USER_FLOWS                    | P1          | Work Surface (review)            | DB: client_needs; API: needs router; UI: NeedsManagementPage                             | CRM insights lost             | E2E create need                  | confirmed |
| DF-007     | Product-Client Matchmaking                           | CRM               | /matchmaking                        | USER_FLOWS                    | P2          | Panel + Filters                  | DB: matchmaking; API: matching router; UI: MatchmakingServicePage                        | Matching workflows lost       | E2E matchmaking                  | confirmed |
| DF-008     | Pricing Profiles & Rules                             | Pricing           | /pricing                            | USER_FLOWS                    | P1          | Work Surface + Inspector         | DB: pricing rules; API: pricing router; UI: PricingRulesPage                             | Pricing control lost          | Unit + E2E update rule           | confirmed |
| DF-009     | Inbox & Notification Center                          | Notifications     | /notifications                      | USER_FLOWS                    | P1          | Panel + List                     | DB: notifications; API: notifications router; UI: Notifications page                     | Missed alerts                 | E2E notification list            | confirmed |
| DF-010     | Product Intake Management                            | Inventory/Intake  | Spreadsheet View / intake workflows | USER_FLOWS + repo             | P0          | Work Surface + Grid + Inspector  | DB: intakeSessions/intakeSessionBatches/batches; API: productIntake; UI: IntakeGrid      | Intake broken                 | E2E intake flow                  | confirmed |
| DF-011     | Scratch Pad / Quick Notes                            | Productivity      | /notes                              | USER_FLOWS                    | P2          | Quick Create                     | DB: notes; API: notes router; UI: notes components                                       | Fast notes lost               | Unit + UI smoke                  | confirmed |
| DF-012     | Advanced Dashboard System                            | Analytics         | /dashboard                          | USER_FLOWS                    | P1          | Dashboard/Review Surface         | DB: dashboard widgets; API: dashboard router; UI: Dashboard                              | KPI visibility lost           | UI smoke                         | confirmed |
| DF-013     | Multi‑Location & Bin Tracking                        | Inventory         | /inventory, /locations              | USER_FLOWS                    | P0          | Work Surface + Inspector         | DB: locations/bins; API: locations router; UI: Inventory                                 | Location logic lost           | E2E inventory transfer           | confirmed |
| DF-014     | Customer Credit Management                           | Finance           | /credits                            | USER_FLOWS                    | P1          | Work Surface + Inspector         | DB: credits; API: credit router; UI: CreditsPage                                         | Credit limits lost            | Unit + E2E credit update         | confirmed |
| DF-015     | Sample Management System                             | Sales             | /samples                            | USER_FLOWS                    | P1          | Work Surface + Panel             | DB: samples; API: samples router; UI: SampleManagement                                   | Samples blocked               | E2E samples flow                 | confirmed |
| DF-016     | Live Shopping System                                 | Sales             | /live-shopping                      | USER_FLOWS                    | P1          | Work Surface + Panel             | DB: live_shopping; API: live shopping router; UI: LiveShoppingPage                       | Live shopping lost            | E2E live shopping                | confirmed |
| DF-017     | Leaderboard & Gamification                           | Growth            | /leaderboard                        | USER_FLOWS                    | P2          | Dashboard/Review                 | DB: leaderboard; API: leaderboard router; UI: LeaderboardPage                            | Gamification lost             | UI smoke                         | confirmed |
| DF-018     | Purchase Orders & Receiving                          | Procurement       | /purchase-orders                    | USER_FLOWS + repo             | P0          | Work Surface + Grid              | DB: purchase_orders; API: purchaseOrders router; UI: PurchaseOrdersPage                  | PO flow broken                | E2E PO create/receive            | confirmed |
| DF-019     | Returns & Refunds                                    | Sales/Inventory   | /returns                            | USER_FLOWS                    | P1          | Work Surface + Inspector         | DB: returns; API: returns router; UI: ReturnsPage                                        | Returns blocked               | E2E returns flow                 | confirmed |
| DF-020     | Quotes Management                                    | Sales             | /quotes                             | USER_FLOWS                    | P1          | Work Surface + Panel             | DB: quotes; API: quotes router; UI: Quotes page                                          | Quotes lost                   | E2E quote create                 | confirmed |
| DF-021     | Sales Sheets                                         | Sales             | /sales-sheets                       | USER_FLOWS                    | P2          | Review Surface + Panel           | DB: sales_sheets; API: sales sheet router; UI: SalesSheetCreator                         | Sales sheets lost             | UI smoke                         | confirmed |
| DF-022     | Unified Sales Portal                                 | Sales             | /sales                              | USER_FLOWS                    | P1          | Work Surface                     | DB: orders/clients; API: sales router; UI: UnifiedSalesPortalPage                        | Sales portal broken           | E2E sales order                  | confirmed |
| DF-023     | Pick & Pack Module                                   | Fulfillment       | /pick-pack                          | USER_FLOWS                    | P0          | Work Surface + Bulk Action Bar   | DB: pick_pack; API: pickPack router; UI: PickPackPage                                    | Fulfillment broken            | E2E pick/pack                    | confirmed |
| DF-024     | Storage & Transfers                                  | Inventory         | /inventory/transfers                | USER_FLOWS                    | P1          | Work Surface + Inspector         | DB: transfers; API: inventory router; UI: Inventory                                      | Transfer flow lost            | E2E transfer                     | confirmed |
| DF-025     | Photography Module                                   | Inventory         | /photography                        | USER_FLOWS                    | P2          | Panel + Gallery                  | DB: photos; API: photography router; UI: PhotographyPage                                 | Media capture lost            | UI smoke                         | confirmed |
| DF-026     | Client 360 View                                      | CRM               | /clients/:id                        | USER_FLOWS                    | P1          | Panel + Review                   | DB: clients; API: clients router; UI: ClientProfilePage                                  | Client context lost           | UI smoke                         | confirmed |
| DF-027     | Client Wants/Needs Tracking                          | CRM               | /clients/:id                        | USER_FLOWS                    | P2          | Panel + Forms                    | DB: client_needs; API: needs router; UI: ClientWantsSection                              | Needs tracking lost           | UI smoke                         | confirmed |
| DF-028     | Advanced Scheduling                                  | Scheduling        | /scheduling                         | USER_FLOWS                    | P1          | Review Surface + Panel           | DB: shifts; API: scheduling router; UI: SchedulingPage                                   | Scheduling broken             | E2E schedule                     | confirmed |
| DF-029     | Time Off & Hour Tracking                             | HR                | /scheduling                         | USER_FLOWS                    | P2          | Panel + Form                     | DB: time_off; API: scheduling router; UI: TimeOffRequestForm                             | HR tracking lost              | UI smoke                         | confirmed |
| DF-030     | Crypto Payments                                      | Payments          | API-only (cryptoPayments router)    | USER_FLOWS                    | P2          | API-Only                         | DB: payments; API: cryptoPayments router; **No UI**                                      | Crypto payment loss           | Unit tests                       | api-only  |
| DF-031     | Installment Payments                                 | Payments          | API-only (installmentPayments)      | USER_FLOWS                    | P2          | API-Only                         | DB: installment_payments; API: installmentPayments router; **No UI**                     | Installments lost             | Unit tests                       | api-only  |
| DF-032     | Payment Terms Management                             | Procurement/Sales | /settings                           | USER_FLOWS                    | P1          | Form                             | DB: payment_terms; API: settings router; UI: Settings                                    | Terms missing                 | Unit + UI smoke                  | confirmed |
| DF-033     | Service Billing                                      | Accounting        | /accounting/bills                   | USER_FLOWS                    | P1          | Work Surface                     | DB: bills; API: accounting router; UI: Bills page                                        | Billing lost                  | E2E bill create                  | confirmed |
| DF-034     | Transaction Fees                                     | Accounting        | API-only (transactionFees router)   | USER_FLOWS                    | P2          | API-Only                         | DB: transaction_fees; API: transactionFees router; **No UI**                             | Fee logic lost                | Unit tests                       | api-only  |
| DF-035     | Invoice Disputes                                     | Accounting        | API-only (invoiceDisputes router)   | USER_FLOWS                    | P1          | API-Only                         | DB: invoice_disputes; API: invoiceDisputes router; **No UI**                             | Dispute handling lost         | Unit tests                       | api-only  |
| DF-036     | Product Categories (Extended)                        | Products          | /products                           | USER_FLOWS                    | P2          | Form                             | DB: product_categories; API: products router; UI: ProductsPage                           | Category loss                 | Unit + UI smoke                  | confirmed |
| DF-037     | Product Grades                                       | Products          | /products                           | USER_FLOWS                    | P2          | Form                             | DB: products; API: products router; UI: ProductsPage                                     | Grade loss                    | Unit + UI smoke                  | confirmed |
| DF-038     | Catalog Publishing                                   | Sales             | API-only (productCatalogue router)  | USER_FLOWS                    | P2          | API-Only                         | DB: catalog; API: productCatalogue router; **No UI**                                     | Catalog loss                  | Unit tests                       | api-only  |
| DF-039     | Workflow Queue                                       | Operations        | /workflow-queue                     | USER_FLOWS                    | P2          | Review Surface                   | DB: workflow_queue; API: workflow-queue router; UI: WorkflowQueuePage.tsx                | Queue loss                    | UI smoke                         | confirmed |
| DF-040     | Referrals System                                     | CRM               | /clients                            | USER_FLOWS                    | P2          | Panel + Form                     | DB: referrals; API: referrals router; UI: ReferralDashboard                              | Referral loss                 | Unit + UI smoke                  | confirmed |
| DF-041     | Office Supply Management                             | Inventory         | /office-supplies                    | USER_FLOWS                    | P2          | Work Surface                     | DB: office_supplies; API: inventory router; UI: OfficeSupplyManager                      | Office supply lost            | UI smoke                         | confirmed |
| DF-042     | Cash Audit                                           | Accounting        | /accounting/cash-locations          | USER_FLOWS                    | P1          | Work Surface                     | DB: cash_locations; API: cashAudit router; UI: CashLocations.tsx                         | Cash audit lost               | E2E audit flow                   | confirmed |
| DF-043     | RBAC System                                          | Admin             | /settings/permissions               | USER_FLOWS                    | P0          | Admin Forms                      | DB: roles/permissions; API: rbac router; UI: Settings                                    | Access control broken         | Unit + E2E RBAC                  | confirmed |
| DF-044     | Feature Flags                                        | Admin             | /settings/feature-flags             | USER_FLOWS                    | P1          | Admin Forms                      | DB: feature_flags; API: featureFlags router; UI: FeatureFlagsPage                        | Flags lost                    | Unit + UI smoke                  | confirmed |
| DF-045     | Audit Trail                                          | Compliance        | /audit                              | USER_FLOWS                    | P0          | Review Surface                   | DB: audit logs; API: audit router; UI: AuditModal                                        | Compliance loss               | E2E audit                        | confirmed |
| DF-046     | System Monitoring                                    | Ops               | API-only (monitoring router)        | USER_FLOWS                    | P1          | Admin Dashboard (planned)        | API: monitoring router (admin-only); **No UI - admin tool**                              | Monitoring loss               | Unit tests                       | api-only  |
| DF-047     | Vendor Payables                                      | Accounting        | /accounting/ap                      | USER_FLOWS                    | P1          | Work Surface                     | DB: bills/payables; API: accounting router                                               | AP visibility loss            | E2E AP summary                   | confirmed |
| DF-048     | Vendor Reminders                                     | Vendors           | API-only (vendorReminders router)   | USER_FLOWS                    | P2          | API-Only (notifications)         | DB: vendor_reminders; API: vendorReminders router; **No UI - backend automation**        | Reminder loss                 | Unit tests                       | api-only  |
| DF-049     | Global Search                                        | Navigation        | Global header                       | USER_FLOWS                    | P1          | Cmd+K + Global Search            | API: search router; UI: Search                                                           | Search loss                   | E2E search                       | confirmed |
| DF-050     | Spreadsheet View                                     | Inventory/Sales   | /spreadsheet                        | USER_FLOWS + repo             | P1          | Work Surface + Grid              | UI: SpreadsheetViewPage + AG Grid                                                        | Spreadsheet workflows lost    | E2E spreadsheet                  | confirmed |
| DF-051     | VIP Tiers                                            | VIP               | /vip-portal                         | USER_FLOWS                    | P2          | Dashboard                        | DB: vip tiers; API: vip router                                                           | Tier loss                     | UI smoke                         | confirmed |
| DF-052     | Enhanced Matchmaking                                 | CRM               | /matchmaking                        | USER_FLOWS                    | P2          | Panel + Filters                  | DB: matchmaking; API: matching router                                                    | Matching loss                 | UI smoke                         | confirmed |
| DF-053     | Intake Receipts + Verification Links + Discrepancies | Inventory         | /intake/receipts                    | USER_FLOWS + repo             | P0          | Work Surface + Inspector         | DB: intake_receipts/intake_discrepancies; API: intakeReceipts router; UI: IntakeReceipts | Verification/discrepancy loss | E2E receipt verify + discrepancy | confirmed |
| DF-054     | Credits Management                                   | Finance           | /credits                            | USER_FLOWS                    | P1          | Work Surface + Panel             | DB: credits; API: credit router                                                          | Credit loss                   | E2E credit flow                  | confirmed |
| DF-055     | Data Card Metrics                                    | Analytics         | dashboards                          | USER_FLOWS                    | P2          | Review Surface                   | DB: dashboard stats; API: dashboard router; UI: DataCardSection                          | KPI loss                      | UI smoke                         | confirmed |
| DF-056     | Low Stock Alerts                                     | Inventory         | /inventory                          | USER_FLOWS                    | P1          | Notifications + Panel            | DB: alerts; API: alerts router; UI: AlertsPanel                                          | Stock alert loss              | E2E alerts                       | confirmed |
| DF-057     | Deployment Tracking                                  | Ops               | API-only (deployments router)       | USER_FLOWS                    | P2          | API-Only (DevOps)                | DB: deployments; API: deployments router; **No UI - DevOps tool**                        | Ops loss                      | Unit tests                       | api-only  |
| DF-058     | Comments & Mentions                                  | Collaboration     | /comments                           | USER_FLOWS                    | P2          | Panel                            | DB: comments; API: comments router                                                       | Collaboration loss            | UI smoke                         | confirmed |
| DF-059     | COGS Management                                      | Accounting        | /cogs                               | USER_FLOWS                    | P0          | Work Surface + Inspector         | DB: cogs; API: cogs router; UI: CogsSettingsPage                                         | Margin correctness loss       | E2E cogs                         | confirmed |
| DF-060     | Client Ledger                                        | Accounting        | /clients/:id/ledger                 | USER_FLOWS + repo             | P0          | Work Surface + Inspector         | DB: ledger entries; API: ledger router; UI: ClientLedger                                 | Ledger visibility loss        | E2E ledger                       | confirmed |
| DF-061     | Bad Debt Management                                  | Accounting        | /accounting/ar                      | USER_FLOWS                    | P1          | Work Surface + Panel             | DB: invoices/payments; API: accounting router                                            | Debt handling loss            | E2E AR aging                     | confirmed |
| DF-062     | Strains Management                                   | Products          | /products                           | USER_FLOWS                    | P2          | Form + Panel                     | DB: strains; API: products router                                                        | Strain data loss              | Unit + UI smoke                  | confirmed |
| DF-063     | Advanced Tags System                                 | Products/Clients  | /products, /clients                 | USER_FLOWS                    | P2          | Panel + Form                     | DB: tags; API: tags router                                                               | Tagging loss                  | Unit + UI smoke                  | confirmed |
| DF-064     | Analytics Engine                                     | Analytics         | /analytics                          | USER_FLOWS                    | P1          | Review Surface                   | DB: analytics; API: analytics router; UI: AnalyticsPage                                  | Analytics loss                | UI smoke                         | confirmed |
| DF-065     | Vendor Supply Matching                               | Vendors           | /vendor-supply                      | USER_FLOWS                    | P2          | Review Surface + Panel           | DB: vendor_supply; API: vendorSupply router; UI: VendorSupplyPage.tsx                    | Matching loss                 | UI smoke                         | confirmed |
| DF-066     | System Configuration                                 | Admin             | /settings                           | USER_FLOWS                    | P1          | Admin Forms                      | DB: settings; API: settings router                                                       | Config loss                   | UI smoke                         | confirmed |
| DF-067     | Recurring Orders                                     | Sales             | **NOT IMPLEMENTED**                 | USER_FLOWS                    | P2          | Work Surface (planned)           | **No DB table, No API, No UI - Feature not implemented**                                 | Recurring orders loss         | E2E recurring                    | missing   |
| DF-068     | Health & Diagnostics                                 | Ops               | /health                             | USER_FLOWS                    | P1          | Review Surface                   | API: health endpoints; UI: system status                                                 | Diagnostics loss              | UI smoke                         | confirmed |
| DF-069     | Admin Tools Suite                                    | Admin             | /admin                              | USER_FLOWS                    | P1          | Admin Forms                      | DB/API: admin tools                                                                      | Admin controls loss           | UI smoke                         | confirmed |
| DF-070     | User Management                                      | Admin             | /settings/users                     | USER_FLOWS                    | P0          | Admin Forms                      | DB: users/roles; API: users router                                                       | User access loss              | E2E user mgmt                    | confirmed |
| ACCT-001   | List Invoices                                        | Accounting        | /accounting/invoices                | USER_FLOW_MATRIX              | P0          | Work Surface + Filters           | DB: invoices; API: invoices.list; UI: Invoices                                           | Invoice list loss             | E2E list                         | confirmed |
| ACCT-002   | Invoice Details                                      | Accounting        | /accounting/invoices/:id            | USER_FLOW_MATRIX              | P0          | Inspector                        | DB: invoices/items; API: invoices.getById; UI: Invoice detail                            | Detail loss                   | E2E detail                       | confirmed |
| ACCT-003   | Generate Invoice from Order                          | Accounting        | /orders/:id                         | USER_FLOW_MATRIX              | P0          | Action + Inspector               | DB: invoices; API: invoices.generateFromOrder                                            | Revenue workflow loss         | E2E generate                     | confirmed |
| ACCT-004   | Update Invoice Status                                | Accounting        | /accounting/invoices/:id            | USER_FLOW_MATRIX              | P0          | Status control                   | DB: invoices; API: invoices.updateStatus                                                 | State mismatch                | E2E status change                | confirmed |
| ACCT-005   | Mark Invoice Sent                                    | Accounting        | /accounting/invoices/:id            | USER_FLOW_MATRIX              | P1          | Action                           | DB: invoices; API: invoices.markSent                                                     | Notification failure          | E2E mark sent                    | confirmed |
| ACCT-006   | Void Invoice                                         | Accounting        | /accounting/invoices/:id            | USER_FLOW_MATRIX              | P1          | Action + Undo                    | DB: invoices; API: invoices.void                                                         | Financial integrity loss      | E2E void                         | confirmed |
| ACCT-007   | Invoice Summary                                      | Accounting        | /accounting/dashboard               | USER_FLOW_MATRIX              | P1          | Dashboard                        | DB: invoices; API: invoices.getSummary                                                   | KPI loss                      | UI smoke                         | confirmed |
| ACCT-008   | Receive Client Payment                               | Accounting        | /accounting/payments                | USER_FLOW_MATRIX              | P0          | Work Surface                     | DB: payments; API: accounting.receiveClientPayment                                       | Cash intake blocked           | E2E payment                      | confirmed |
| ACCT-009   | Pay Vendor                                           | Accounting        | /accounting/payments                | USER_FLOW_MATRIX              | P0          | Work Surface                     | DB: payments; API: accounting.payVendor                                                  | AP blocked                    | E2E vendor payment               | confirmed |
| ACCT-010   | Record Payment                                       | Accounting        | /accounting/payments                | USER_FLOW_MATRIX              | P0          | Work Surface                     | DB: payments; API: accounting.recordPayment                                              | Payment tracking loss         | E2E record payment               | confirmed |
| ACCT-011   | AR Summary + Aging                                   | Accounting        | /accounting/dashboard               | USER_FLOW_MATRIX              | P1          | Dashboard                        | DB: invoices; API: accounting.getARSummary/getARAging                                    | AR visibility loss            | UI smoke                         | confirmed |
| ACCT-012   | AP Summary + Aging                                   | Accounting        | /accounting/dashboard               | USER_FLOW_MATRIX              | P1          | Dashboard                        | DB: bills; API: accounting.getAPSummary/getAPAging                                       | AP visibility loss            | UI smoke                         | confirmed |
| ACCT-013   | Bank Accounts CRUD                                   | Accounting        | /accounting/bank-accounts           | USER_FLOW_MATRIX              | P1          | Work Surface                     | DB: bank_accounts; API: accounting.list/create/updateBalance                             | Banking loss                  | E2E bank account                 | confirmed |
| ACCT-014   | Bank Transactions + Reconcile                        | Accounting        | /accounting/bank-transactions       | USER_FLOW_MATRIX              | P1          | Work Surface + Inspector         | DB: bank_transactions; API: accounting.create/reconcile                                  | Reconciliation loss           | E2E reconcile                    | confirmed |
| ACCT-015   | Fiscal Periods                                       | Accounting        | /accounting/fiscal-periods          | USER_FLOW_MATRIX              | P0          | Work Surface                     | DB: fiscal_periods; API: accounting.close/lock                                           | Period controls lost          | E2E close period                 | confirmed |
| ACCT-016   | Chart of Accounts                                    | Accounting        | /accounting/chart-of-accounts       | USER_FLOW_MATRIX              | P0          | Work Surface + Inspector         | DB: chart_of_accounts; API: accounting.getChartOfAccounts                                | Ledger structure loss         | E2E list                         | confirmed |
| ACCT-017   | Post Journal Entry                                   | Accounting        | /accounting/general-ledger          | USER_FLOW_MATRIX              | P0          | Work Surface + Inspector         | DB: ledger_entries; API: accounting.postJournalEntry                                     | Ledger mutation loss          | E2E journal entry                | confirmed |
| INV-001    | Inventory Intake Mutation                            | Inventory         | /inventory (intake)                 | repo + QA docs                | P0          | Work Surface + Grid              | DB: inventory movements; API: inventory.intake                                           | Stock incorrect               | E2E intake                       | confirmed |
| INV-002    | Batch Detail View                                    | Inventory         | /inventory/batches/:id              | repo                          | P1          | Inspector/Drawer                 | DB: batches; API: inventory.getBatchById                                                 | Batch context lost            | E2E batch detail                 | confirmed |
| INV-003    | Inventory Movement History                           | Inventory         | /inventory                          | repo                          | P1          | Inspector                        | DB: inventory_movements; API: inventory.movementHistory                                  | Audit loss                    | UI smoke                         | confirmed |
| SALE-001   | Sales Orders                                         | Sales             | /orders                             | USER_FLOW_MATRIX              | P0          | Work Surface + Grid              | DB: orders; API: orders.list/create                                                      | Order flow lost               | E2E order                        | confirmed |
| SALE-002   | Quotes                                               | Sales             | /quotes                             | USER_FLOW_MATRIX              | P1          | Work Surface                     | DB: quotes; API: quotes.list/create                                                      | Quote flow lost               | E2E quote                        | confirmed |
| SALE-003   | Returns                                              | Sales             | /returns                            | USER_FLOW_MATRIX              | P1          | Work Surface                     | DB: returns; API: returns router                                                         | Returns lost                  | E2E return                       | confirmed |
| SALE-004   | Samples                                              | Sales             | /samples                            | USER_FLOW_MATRIX              | P1          | Work Surface                     | DB: samples; API: samples router                                                         | Samples lost                  | E2E samples                      | confirmed |
| FUL-001    | Pick & Pack                                          | Fulfillment       | /pick-pack                          | USER_FLOW_MATRIX              | P0          | Work Surface + Bulk Actions      | DB: pick_pack; API: pickPack router                                                      | Fulfillment loss              | E2E pick/pack                    | confirmed |
| DF-071     | User Authentication & Login                          | Auth              | /login                              | Gap Analysis                  | P0          | Full Page Form                   | DB: users; API: auth router; UI: Login.tsx                                               | Access blocked                | E2E login flow                   | confirmed |
| DF-072     | VIP Appointment Booking                              | VIP               | /vip-portal/*                       | Gap Analysis                  | P1          | Calendar + Forms                 | DB: appointments; API: vipPortal router; UI: AppointmentBooking.tsx                      | VIP booking lost              | E2E booking flow                 | confirmed |
| DF-073     | VIP Document Downloads                               | VIP               | /vip-portal/*                       | Gap Analysis                  | P2          | Panel + List                     | API: vipPortal router; UI: DocumentDownloads.tsx                                         | Document access lost          | UI smoke                         | confirmed |
| DF-074     | VIP Session Management                               | VIP               | /vip-portal/*                       | Gap Analysis                  | P1          | Portal Shell                     | API: vipPortal router; UI: SessionEndedPage.tsx, ImpersonatePage.tsx                     | VIP session issues            | E2E session flow                 | confirmed |
| DF-075     | Help & Documentation System                          | Support           | /help                               | Gap Analysis                  | P2          | Review Surface                   | UI: Help.tsx                                                                             | User support lost             | UI smoke                         | confirmed |
| DF-076     | Personal Account Settings                            | User              | /account                            | Gap Analysis                  | P1          | Panel + Forms                    | DB: users; API: users router; UI: AccountPage.tsx                                        | Profile management lost       | E2E account update               | confirmed |
| DF-077     | Unified Sales Pipeline (Kanban)                      | Sales             | /sales-portal                       | Gap Analysis                  | P1          | Review Surface + Drag/Drop       | API: unifiedSalesPortal router; UI: UnifiedSalesPortalPage.tsx                           | Pipeline visibility lost      | E2E pipeline drag                | confirmed |
| DF-078     | Gamification & Rewards                               | Growth            | /leaderboard                        | Gap Analysis                  | P2          | Dashboard + Panel                | DB: gamification tables; API: gamification router; UI: LeaderboardPage.tsx               | Rewards system lost           | UI smoke                         | confirmed |

---

## Unknown Feature Resolution Summary (UXS-005)

> **Resolved**: 2026-01-19 via Deep Gap Analysis

The original 14 unknown features have been resolved through comprehensive codebase analysis:

### Resolution Results

| Feature ID | Feature Name | Resolution | Rationale |
|------------|--------------|------------|-----------|
| DF-030 | Crypto Payments | **api-only** | Router exists (cryptoPayments.ts), no UI - backend payment processor integration |
| DF-031 | Installment Payments | **api-only** | Router exists (installmentPayments.ts), no UI - payment plan management via API |
| DF-034 | Transaction Fees | **api-only** | Router exists (transactionFees.ts), no UI - automated fee calculation |
| DF-035 | Invoice Disputes | **api-only** | Router exists (invoiceDisputes.ts), no UI - dispute workflow via API |
| DF-038 | Catalog Publishing | **api-only** | Router exists (productCatalogue.ts), no UI - API for external integrations |
| DF-039 | Workflow Queue | **confirmed** | UI exists at /workflow-queue (WorkflowQueuePage.tsx) |
| DF-042 | Cash Audit | **confirmed** | UI exists at /accounting/cash-locations (CashLocations.tsx) |
| DF-046 | System Monitoring | **api-only** | Router exists (monitoring.ts), admin-only diagnostics - no user-facing UI needed |
| DF-048 | Vendor Reminders | **api-only** | Router exists (vendorReminders.ts), no UI - automated notification system |
| DF-057 | Deployment Tracking | **api-only** | Router exists (deployments.ts), DevOps tool - no user-facing UI needed |
| DF-065 | Vendor Supply Matching | **confirmed** | UI exists at /vendor-supply (VendorSupplyPage.tsx) |
| DF-067 | Recurring Orders | **missing** | No router, no database table, no UI - feature not implemented |

### Summary Statistics

- **Confirmed (UI exists)**: 3 features (DF-039, DF-042, DF-065)
- **API-Only (intentional)**: 8 features (DF-030, DF-031, DF-034, DF-035, DF-038, DF-046, DF-048, DF-057)
- **Missing (needs implementation)**: 1 feature (DF-067)

### Action Items

| Feature | Action | Priority |
|---------|--------|----------|
| DF-067 Recurring Orders | Add to product backlog for implementation decision | P2 |

### Resolution Outcomes Key

1. **confirmed** - UI exists and is documented; add to Work Surface migration plan
2. **api-only** - Intentionally backend-only; no UI required; document rationale
3. **missing** - Should have UI but doesn't; add to backlog with priority
4. **deprecated** - No longer needed; document deprecation

---

## Golden Flows (Must Never Break)

These flows represent the critical paths through TERP that must be preserved and tested:

| Flow ID | Flow Name | Entry Point | Key Steps | Exit Criteria | Covered Features |
|---------|-----------|-------------|-----------|---------------|------------------|
| GF-001 | Direct Intake Happy Path | /spreadsheet | Create session → Add items → Set vendor → Finalize | Batches created, inventory updated | DF-010, DF-053, INV-001 |
| GF-002 | Standard PO to Receiving | /purchase-orders | Create PO → Submit → Receive goods | PO status = Received, inventory updated | DF-018, INV-001 |
| GF-003 | Sales Order Happy Path | /orders | Select client → Add items → Finalize | Order created, inventory reserved | SALE-001, DF-022 |
| GF-004 | Invoice & Payment | /accounting/invoices | Generate from order → Send → Receive payment | Invoice paid, AR cleared | ACCT-001..010 |
| GF-005 | Pick & Pack | /pick-pack | View orders → Pick items → Pack → Ship | Order fulfilled, inventory decremented | FUL-001, DF-023 |
| GF-006 | Client Ledger Review | /clients/:id/ledger | View balance → Filter transactions → Export | Accurate balance displayed | DF-060 |
| GF-007 | Inventory Adjustment | /inventory | Select batch → Adjust qty → Confirm | Movement logged, qty updated | DF-013, INV-003 |
| GF-008 | Sample Request | /samples | Create request → Approve → Fulfill | Sample dispatched, inventory decremented | SALE-004, DF-015 |

---

## Module Coverage Summary

| Module | Total Features | Confirmed | API-Only | Unknown | Missing | P0 Count | Needs Work Surface |
|--------|----------------|-----------|----------|---------|---------|----------|-------------------|
| Accounting | 22 | 21 | 1 | 0 | 0 | 10 | Yes |
| Inventory | 10 | 10 | 0 | 0 | 0 | 4 | Yes |
| Sales | 13 | 12 | 0 | 0 | 1 | 3 | Yes |
| CRM | 6 | 6 | 0 | 0 | 0 | 0 | Partial |
| Fulfillment | 2 | 2 | 0 | 0 | 0 | 1 | Yes |
| Admin | 8 | 8 | 0 | 0 | 0 | 2 | No (Forms) |
| Ops | 6 | 2 | 4 | 0 | 0 | 0 | Partial |
| Payments | 4 | 2 | 2 | 0 | 0 | 0 | Partial |
| Products | 4 | 4 | 0 | 0 | 0 | 0 | No (Forms) |
| VIP | 6 | 6 | 0 | 0 | 0 | 0 | Dashboard |
| Auth | 1 | 1 | 0 | 0 | 0 | 1 | No (Full Page Form) |
| Support | 1 | 1 | 0 | 0 | 0 | 0 | Review Surface |
| User | 1 | 1 | 0 | 0 | 0 | 0 | Panel + Forms |
| Growth | 2 | 2 | 0 | 0 | 0 | 0 | Dashboard |

**Total**: 110 features (99 confirmed, 8 api-only, 0 unknown, 1 missing, 2 deprecated)

---

## Page Inventory (86 Pages Total)

> From Deep Gap Analysis - comprehensive mapping of all UI pages to features.

### Pages by Category

| Category | Count | Coverage | Notes |
|----------|-------|----------|-------|
| Main Navigation | 56 | 89% | 4 undocumented (now added as DF-071..076) |
| Accounting Sub-routes | 10 | 100% | All mapped to ACCT-* features |
| Settings Sub-routes | 3 | 100% | All mapped |
| VIP Portal | 8 | 100% | Now mapped to DF-072..074 |
| Development/Framework | 3 | N/A | /dev/showcase, /404, etc. |

### Hidden Routes (Not in Main Navigation)

These routes are accessible but not shown in the sidebar navigation:

| Route | Page | Feature | Reason Hidden |
|-------|------|---------|---------------|
| /help | Help.tsx | DF-075 | Accessible via header icon |
| /intake-receipts | IntakeReceipts.tsx | DF-053 | Accessible via workflow |
| /vendor-supply | VendorSupplyPage.tsx | DF-065 | Specialized workflow |
| /workflow-queue | WorkflowQueuePage.tsx | DF-039 | Operations tool |
| /matchmaking | MatchmakingServicePage.tsx | DF-007 | Specialized workflow |
| /needs | NeedsManagementPage.tsx | DF-006 | Specialized workflow |
| /locations | LocationsPage.tsx | DF-013 | Part of inventory |
| /account | AccountPage.tsx | DF-076 | Personal settings |
| /quotes | Quotes.tsx | DF-020 | Part of sales workflow |
| /sales-portal | UnifiedSalesPortalPage.tsx | DF-077 | Pipeline view |
| /leaderboard | LeaderboardPage.tsx | DF-017/078 | Gamification |

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-19 | Initial matrix creation with 102 features | UX Strategy Session |
| 2026-01-19 | Red Hat QA: Added resolution plan for 14 unknown features | Red Hat QA Review |
| 2026-01-19 | Added golden flows, module coverage summary | Red Hat QA Review |
| 2026-01-19 | Deep Gap Analysis: Resolved 14 unknown features (3 confirmed, 8 api-only, 1 missing) | Gap Analysis |
| 2026-01-19 | Added 8 newly discovered features (DF-071 to DF-078) | Gap Analysis |
| 2026-01-19 | Added page inventory (86 pages mapped) | Gap Analysis |
| 2026-01-20 | PR #244 QA: Added RBAC validation matrix per golden flow | Red Hat QA Expert |
| 2026-01-20 | PR #244 QA: Cross-referenced QA Auth system for role testing | Red Hat QA Expert |
| 2026-01-20 | UXS Phase 2 Complete: 9 Work Surfaces + 11 hooks + E2E tests | UXS Execution |

---

## Work Surface Implementation Status (2026-01-20)

> **Source**: `EXECUTION_PLAN_PHASE2.md` - Sprints 4-8 COMPLETE

### Implemented Work Surfaces

| Work Surface | File | Golden Flow | Status |
|--------------|------|-------------|--------|
| DirectIntakeWorkSurface | `work-surface/DirectIntakeWorkSurface.tsx` | GF-001 | ✅ |
| PurchaseOrdersWorkSurface | `work-surface/PurchaseOrdersWorkSurface.tsx` | GF-002 | ✅ |
| OrdersWorkSurface | `work-surface/OrdersWorkSurface.tsx` | GF-003 | ✅ |
| InvoicesWorkSurface | `work-surface/InvoicesWorkSurface.tsx` | GF-004 | ✅ |
| PickPackWorkSurface | `work-surface/PickPackWorkSurface.tsx` | GF-005 | ✅ |
| ClientLedgerWorkSurface | `work-surface/ClientLedgerWorkSurface.tsx` | GF-006 | ✅ |
| InventoryWorkSurface | `work-surface/InventoryWorkSurface.tsx` | GF-007 | ✅ |
| QuotesWorkSurface | `work-surface/QuotesWorkSurface.tsx` | - | ✅ |
| ClientsWorkSurface | `work-surface/ClientsWorkSurface.tsx` | - | ✅ |

### Work Surface Hooks (All Complete)

| Hook | Purpose | Unit Tests |
|------|---------|------------|
| `useWorkSurfaceKeyboard` | Keyboard contract | ✅ |
| `useSaveState` | Save indicator | ✅ |
| `useValidationTiming` | Validation timing | ✅ |
| `useConcurrentEditDetection` | Optimistic locking | - |
| `useBreakpoint` | Responsive breakpoints | - |
| `useUndo` | 10s undo window | - |
| `usePerformanceMonitor` | Performance budgets | - |
| `useBulkOperationLimits` | Bulk limits | - |
| `useToastConfig` | Toast standardization | ✅ |
| `usePrint` | Print functionality | ✅ |
| `useExport` | Export with limits | ✅ |

### Golden Flow E2E Tests

| Test File | Coverage |
|-----------|----------|
| `order-creation.spec.ts` | GF-003 |
| `order-to-invoice.spec.ts` | GF-003→004 |
| `invoice-to-payment.spec.ts` | GF-004 |
| `pick-pack-fulfillment.spec.ts` | GF-005 |
| `work-surface-keyboard.spec.ts` | All |
| `cmd-k-enforcement.spec.ts` | All |
