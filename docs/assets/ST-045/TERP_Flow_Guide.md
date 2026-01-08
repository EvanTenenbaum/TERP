# TERP Flow Guide (Codebase-Derived)

_Generated on 2026-01-08 from server routers, client route map, and RBAC definitions._

## Notes
- This guide is derived strictly from the codebase (router procedures + client references + route registry).
- For lifecycle/state-specific variants, consult the service logic invoked by each procedure and the DB status enums.
- 'API-only / Unreferenced in client' means no direct `trpc.<router>.<procedure>` usage was found in the current client source.


## Accounting


### accounting


#### Action/Operation


##### Lock (`accounting.lock`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Pay Vendor (`accounting.payVendor`)

- **Purpose:** WS-002: Pay vendor (cash out)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Receive Client Payment (`accounting.receiveClientPayment`)

- **Purpose:** WS-001: Receive client payment (cash drop-off)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Reconcile (`accounting.reconcile`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Record Payment (`accounting.recordPayment`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Record Payment (`accounting.recordPayment`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Reopen (`accounting.reopen`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


#### Create


##### Create (`accounting.create`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Create (`accounting.create`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Create (`accounting.create`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Create (`accounting.create`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Create (`accounting.create`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Create (`accounting.create`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Create (`accounting.create`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Create (`accounting.create`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Create (`accounting.create`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Create (`accounting.create`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


#### State Transition/Action


##### Close (`accounting.close`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Post Journal Entry (`accounting.postJournalEntry`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


#### Update


##### Mark Reimbursed (`accounting.markReimbursed`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Update (`accounting.update`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Update (`accounting.update`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Update (`accounting.update`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Update (`accounting.update`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Update (`accounting.update`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Update (`accounting.update`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Update Balance (`accounting.updateBalance`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Update Status (`accounting.updateStatus`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Update Status (`accounting.updateStatus`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


#### View/Search


##### Generate Number (`accounting.generateNumber`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Generate Number (`accounting.generateNumber`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Generate Number (`accounting.generateNumber`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Generate Number (`accounting.generateNumber`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Preview Payment Balance (`accounting.previewPaymentBalance`)

- **Purpose:** WS-001: Preview client balance before payment

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


#### View/Search/Report


##### Get APAging (`accounting.getAPAging`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get APSummary (`accounting.getAPSummary`)

- **Purpose:** Get comprehensive AP summary by vendor

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get ARAging (`accounting.getARAging`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get ARSummary (`accounting.getARSummary`)

- **Purpose:** Get comprehensive AR summary with aging and top debtors

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get Balance (`accounting.getBalance`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get Balance At Date (`accounting.getBalanceAtDate`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get Breakdown By Category (`accounting.getBreakdownByCategory`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get By Id (`accounting.getById`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get By Id (`accounting.getById`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get By Id (`accounting.getById`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get By Id (`accounting.getById`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get By Id (`accounting.getById`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get By Id (`accounting.getById`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get By Id (`accounting.getById`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get By Id (`accounting.getById`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get By Id (`accounting.getById`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get By Id (`accounting.getById`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get By Number (`accounting.getByNumber`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get Chart Of Accounts (`accounting.getChartOfAccounts`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get Client Statement (`accounting.getClientStatement`)

- **Purpose:** Get client statement with invoices and payments

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get Current (`accounting.getCurrent`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get For Bill (`accounting.getForBill`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get For Invoice (`accounting.getForInvoice`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get Outstanding Payables (`accounting.getOutstandingPayables`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get Outstanding Receivables (`accounting.getOutstandingReceivables`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get Overdue Bills (`accounting.getOverdueBills`)

- **Purpose:** Get overdue bills (AP) list

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get Overdue Invoices (`accounting.getOverdueInvoices`)

- **Purpose:** Get overdue invoices list

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get Pending Reimbursements (`accounting.getPendingReimbursements`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get Recent Clients (`accounting.getRecentClients`)

- **Purpose:** Get recent clients for quick selection

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get Recent Vendors (`accounting.getRecentVendors`)

- **Purpose:** Get recent vendors for quick selection

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get Total Cash Balance (`accounting.getTotalCashBalance`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get Total Expenses (`accounting.getTotalExpenses`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get Trial Balance (`accounting.getTrialBalance`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### Get Unreconciled (`accounting.getUnreconciled`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### List (`accounting.list`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### List (`accounting.list`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### List (`accounting.list`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### List (`accounting.list`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### List (`accounting.list`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### List (`accounting.list`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### List (`accounting.list`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### List (`accounting.list`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### List (`accounting.list`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


##### List (`accounting.list`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting, /accounting/bank-accounts, /accounting/bank-transactions, /accounting/bills, /accounting/chart-of-accounts, /accounting/dashboard, /accounting/expenses, /accounting/fiscal-periods, /accounting/general-ledger, /accounting/invoices, /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accounting.ts`


### accountingHooks


#### Action/Operation


##### Reverse GLEntries (`accountingHooks.reverseGLEntries`)

- **Purpose:** /** Reverse GL entries for a transaction

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accountingHooks.ts`


#### Create


##### Seed Accounts (`accountingHooks.seedAccounts`)

- **Purpose:** /** Seed standard chart of accounts

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accountingHooks.ts`


#### View/Search


##### Calculate Inventory Value (`accountingHooks.calculateInventoryValue`)

- **Purpose:** /** Calculate total inventory value

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accountingHooks.ts`


##### Calculate Sale COGS (`accountingHooks.calculateSaleCOGS`)

- **Purpose:** /** Calculate COGS for a sale

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accountingHooks.ts`


##### Calculate Weighted Average COGS (`accountingHooks.calculateWeightedAverageCOGS`)

- **Purpose:** /** Calculate weighted average COGS

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accountingHooks.ts`


#### View/Search/Report


##### Get COGSBreakdown (`accountingHooks.getCOGSBreakdown`)

- **Purpose:** /** Get COGS breakdown by product

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/accountingHooks.ts`


### cogs


#### Update


##### Update Batch Cogs (`cogs.updateBatchCogs`)

- **Purpose:** /** Update batch COGS with audit trail

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** cogs:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /settings/cogs  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inventory/CogsEditModal.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/cogs.ts`


#### View/Search


##### Calculate Impact (`cogs.calculateImpact`)

- **Purpose:** /** Calculate COGS impact for a batch cost change Shows what would happen if COGS is updated

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** cogs:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /settings/cogs  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inventory/CogsEditModal.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/cogs.ts`


#### View/Search/Report


##### Get COGS (`cogs.getCOGS`)

- **Purpose:** /** Get COGS summary for a period Returns total COGS, revenue, gross profit, and margin

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** cogs:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /settings/cogs  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/cogs.ts`


##### Get COGSBy Batch (`cogs.getCOGSByBatch`)

- **Purpose:** /** Get COGS breakdown by batch for a period

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** cogs:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /settings/cogs  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/cogs.ts`


##### Get History (`cogs.getHistory`)

- **Purpose:** /** Get COGS adjustment history for a batch

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** cogs:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /settings/cogs  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/cogs.ts`


### invoices


#### Action/Operation


##### Check Overdue (`invoices.checkOverdue`)

- **Purpose:** /** Check and update overdue invoices

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting/invoices  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/invoices.ts`


##### Generate From Order (`invoices.generateFromOrder`)

- **Purpose:** /** Generate invoice from order Creates an invoice for a shipped/delivered order

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting/invoices  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/invoices.ts`


##### Void (`invoices.void`)

- **Purpose:** /** Void an invoice

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting/invoices  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/invoices.ts`


#### Update


##### Mark Sent (`invoices.markSent`)

- **Purpose:** /** Mark invoice as sent

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting/invoices  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/invoices.ts`


##### Update Status (`invoices.updateStatus`)

- **Purpose:** /** Update invoice status

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting/invoices  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/invoices.ts`


#### View/Search/Report


##### Get By Id (`invoices.getById`)

- **Purpose:** /** Get invoice by ID with line items

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting/invoices  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/invoices.ts`


##### Get Summary (`invoices.getSummary`)

- **Purpose:** /** Get invoice summary statistics

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting/invoices  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/invoices.ts`


##### List (`invoices.list`)

- **Purpose:** /** List invoices with optional filters

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting/invoices  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/invoices.ts`


### payments


#### Action/Operation


##### Record Payment (`payments.recordPayment`)

- **Purpose:** /** Record a payment against an invoice

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/payments.ts`


##### Void (`payments.void`)

- **Purpose:** /** Void a payment

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/payments.ts`


#### View/Search/Report


##### Get By Client (`payments.getByClient`)

- **Purpose:** /** Get payments for a specific client

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/payments.ts`


##### Get By Id (`payments.getById`)

- **Purpose:** /** Get payment by ID

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/payments.ts`


##### Get Client Summary (`payments.getClientSummary`)

- **Purpose:** /** Get payment summary for a client

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/payments.ts`


##### List (`payments.list`)

- **Purpose:** /** List payments with optional filters

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /accounting/payments  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/payments.ts`


## Admin/Settings


### admin


#### Action/Operation


##### Clear Permission Cache (`admin.clearPermissionCache`)

- **Purpose:** /** Clear Permission Cache (BUG-001) Clears the permission cache for a specific user or all users. Requires admin authentication (BUG-035 fix).

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /admin-setup  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/admin.ts`


##### Fix User Permissions (`admin.fixUserPermissions`)

- **Purpose:** /** Fix User Permissions (BUG-001) Makes a user a Super Admin to grant them all permissions. Requires admin authentication (BUG-035 fix).

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /admin-setup  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/admin.ts`


##### Grant Permission (`admin.grantPermission`)

- **Purpose:** /** Grant Permission to User (BUG-001) Grants a specific permission to a user via permission override. Requires admin authentication (BUG-035 fix).

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /admin-setup  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/admin.ts`


#### Link/Associate


##### Assign Super Admin Role (`admin.assignSuperAdminRole`)

- **Purpose:** /** Assign Super Admin Role (BUG-001 FINAL FIX) Assigns the "Super Admin" role to a user by creating a record in user_roles table. This is the correct way to grant full permissions in the RBAC system. Requires admin authentication (BUG-035 fix).

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /admin-setup  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/admin.ts`


#### Update


##### Setup Strain System (`admin.setupStrainSystem`)

- **Purpose:** /** Setup Strain Fuzzy Matching System This endpoint performs all necessary database setup for the strain fuzzy matching system: 1. Adds openthcId and openthcStub columns to strains table 2. Creates performance indexes 3. Imports 12,804 OpenTHC strains Safe to run multiple times (all operations are idempotent).

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** system:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /admin-setup  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/admin.ts`


#### View/Search


##### Verify Strain System (`admin.verifyStrainSystem`)

- **Purpose:** /** Verify Strain System Setup Checks that all components of the strain system are properly configured: - Schema columns exist - Indexes are created - Strains are imported - Performance is acceptable

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** system:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /admin-setup  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/admin.ts`


#### View/Search/Report


##### Get Strain System Status (`admin.getStrainSystemStatus`)

- **Purpose:** /** Get Strain System Status Quick status check without running full verification.

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** system:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /admin-setup  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/admin.ts`


##### List Users (`admin.listUsers`)

- **Purpose:** /** List All Users Returns all users for debugging. Requires admin authentication (BUG-035 fix).

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /admin-setup  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/admin.ts`


### adminDataAugment


#### Action/Operation


##### Run All (`adminDataAugment.runAll`)

- **Purpose:** /** Run all augmentation scripts in order

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** system:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/adminDataAugment.ts`


##### Run Script (`adminDataAugment.runScript`)

- **Purpose:** /** Run individual script

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** system:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/adminDataAugment.ts`


#### View/Search/Report


##### Get Status (`adminDataAugment.getStatus`)

- **Purpose:** /** Get status of last run

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** system:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/adminDataAugment.ts`


### adminImport


#### Create


##### Import Strains Batch (`adminImport.importStrainsBatch`)

- **Purpose:** /** Import strains in batches Returns immediately with status, continues in background

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** system:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/adminImport.ts`


#### View/Search/Report


##### Get Import Progress (`adminImport.getImportProgress`)

- **Purpose:** /** Get import progress

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** system:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/adminImport.ts`


### adminMigrations


#### Action/Operation


##### Run All Migrations (`adminMigrations.runAllMigrations`)

- **Purpose:** /** Run all pending migrations

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/adminMigrations.ts`


#### View/Search


##### Check Migration Status (`adminMigrations.checkMigrationStatus`)

- **Purpose:** /** Check migration status

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/adminMigrations.ts`


### adminQuickFix


#### Create


##### Add Missing Columns (`adminQuickFix.addMissingColumns`)

- **Purpose:** /** Add missing columns one by one

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/adminQuickFix.ts`


##### Add Strain Id To Client Needs (`adminQuickFix.addStrainIdToClientNeeds`)

- **Purpose:** /** Add strainId to client_needs

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/adminQuickFix.ts`


#### View/Search


##### Check Columns (`adminQuickFix.checkColumns`)

- **Purpose:** /** Check if columns exist

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/adminQuickFix.ts`


### adminSchema


#### View/Search


##### Validate (`adminSchema.validate`)

- **Purpose:** /** Run Schema Validation Validates Drizzle schema against actual database structure. Returns validation report with schema drift issues.

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** system:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/adminSchema.ts`


### adminSchemaPush


#### Action/Operation


##### Push Schema (`adminSchemaPush.pushSchema`)

- **Purpose:** /** Push all schema changes to database Applies migrations 0027-0042 that were never applied to production

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/adminSchemaPush.ts`


#### View/Search


##### Verify Schema (`adminSchemaPush.verifySchema`)

- **Purpose:** /** Verify schema was pushed successfully

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/adminSchemaPush.ts`


### adminSetup


#### Action/Operation


##### Promote All To Admin (`adminSetup.promoteAllToAdmin`)

- **Purpose:** /** Promote ALL users to admin (use with caution!) Requires the setup key for security

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /admin-setup  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/AdminSetupPage.tsx  

- **Source:** `server/routers/adminSetup.ts`


##### Promote To Admin (`adminSetup.promoteToAdmin`)

- **Purpose:** /** Promote a user to admin role Requires the setup key for security

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /admin-setup  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/adminSetup.ts`


#### View/Search/Report


##### List Users (`adminSetup.listUsers`)

- **Purpose:** /** List all users (for finding the user to promote) Requires the setup key for security

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /admin-setup  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/adminSetup.ts`


### advancedTagFeatures


#### Action/Operation


##### Bulk Add Tags (`advancedTagFeatures.bulkAddTags`)

- **Purpose:** Bulk operations

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/advancedTagFeatures.ts`


##### Bulk Remove Tags (`advancedTagFeatures.bulkRemoveTags`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/advancedTagFeatures.ts`


#### Create


##### Add To Group (`advancedTagFeatures.addToGroup`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/advancedTagFeatures.ts`


##### Create Group (`advancedTagFeatures.createGroup`)

- **Purpose:** Tag groups

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/advancedTagFeatures.ts`


##### Create Hierarchy (`advancedTagFeatures.createHierarchy`)

- **Purpose:** Tag hierarchy

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/advancedTagFeatures.ts`


#### Link/Associate


##### Merge Tags (`advancedTagFeatures.mergeTags`)

- **Purpose:** Tag maintenance

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/advancedTagFeatures.ts`


#### View/Search


##### Boolean Search (`advancedTagFeatures.booleanSearch`)

- **Purpose:** Boolean tag search

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/advancedTagFeatures.ts`


#### View/Search/Report


##### Get Ancestors (`advancedTagFeatures.getAncestors`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/advancedTagFeatures.ts`


##### Get Children (`advancedTagFeatures.getChildren`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/advancedTagFeatures.ts`


##### Get Group Tags (`advancedTagFeatures.getGroupTags`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/advancedTagFeatures.ts`


##### Get Usage Stats (`advancedTagFeatures.getUsageStats`)

- **Purpose:** Tag statistics

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/advancedTagFeatures.ts`


### audit


#### View/Search/Report


##### Get Account Balance Breakdown (`audit.getAccountBalanceBreakdown`)

- **Purpose:** /** Get account balance breakdown (for accounting module) Note: This is a placeholder - full journal entry support requires additional schema

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/audit.ts`


##### Get Client Tab Breakdown (`audit.getClientTabBreakdown`)

- **Purpose:** /** Get client tab balance breakdown Shows all transactions that contribute to the current balance

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/audit/AuditModal.tsx  

- **Source:** `server/routers/audit.ts`


##### Get Entity History (`audit.getEntityHistory`)

- **Purpose:** /** Get entity history (UI-002: Generic audit trail for any entity) Returns audit logs for a specific entity type and ID

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/audit/AuditIcon.tsx  

- **Source:** `server/routers/audit.ts`


##### Get Inventory Breakdown (`audit.getInventoryBreakdown`)

- **Purpose:** /** Get inventory quantity breakdown Shows all movements that contribute to current quantity

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/audit/AuditModal.tsx  

- **Source:** `server/routers/audit.ts`


##### Get Order Breakdown (`audit.getOrderBreakdown`)

- **Purpose:** /** Get order total breakdown Shows line items, discounts, payments

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/audit/AuditModal.tsx  

- **Source:** `server/routers/audit.ts`


##### Get Vendor Balance Breakdown (`audit.getVendorBalanceBreakdown`)

- **Purpose:** /** Get vendor balance breakdown Shows all bills and payments

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/audit/AuditModal.tsx  

- **Source:** `server/routers/audit.ts`


### auditLogs


#### View/Search


##### Export (`auditLogs.export`)

- **Purpose:** /** Export audit logs to JSON

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** audit:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/auditLogs.ts`


#### View/Search/Report


##### Get Entity Trail (`auditLogs.getEntityTrail`)

- **Purpose:** /** Get audit trail for a specific entity

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** audit:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/auditLogs.ts`


##### Get User History (`auditLogs.getUserHistory`)

- **Purpose:** /** Get user activity history for admin UI (UX-055)

- **Type:** query  

- **Auth wrapper:** strictlyProtectedProcedure  

- **Permissions:** users:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Read-Only Auditor  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/admin/UserAuditTimeline.tsx  

- **Source:** `server/routers/auditLogs.ts`


##### Query (`auditLogs.query`)

- **Purpose:** /** Query audit logs with filters

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** audit:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/auditLogs.ts`


### featureFlags


#### Action/Operation


##### Invalidate All Caches (`featureFlags.invalidateAllCaches`)

- **Purpose:** /** Invalidate all caches (admin utility)

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /settings/feature-flags  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/settings/FeatureFlagsPage.tsx  

- **Source:** `server/routers/featureFlags.ts`


#### Create


##### Create (`featureFlags.create`)

- **Purpose:** /** Create a new flag

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /settings/feature-flags  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/settings/FeatureFlagsPage.tsx  

- **Source:** `server/routers/featureFlags.ts`


##### Seed Defaults (`featureFlags.seedDefaults`)

- **Purpose:** /** Seed default feature flags (admin utility) Idempotent - only creates flags that don't exist

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /settings/feature-flags  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/settings/FeatureFlagsPage.tsx  

- **Source:** `server/routers/featureFlags.ts`


#### Delete/Archive


##### Delete (`featureFlags.delete`)

- **Purpose:** /** Delete a flag (soft delete)

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /settings/feature-flags  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/featureFlags.ts`


##### Remove Role Override (`featureFlags.removeRoleOverride`)

- **Purpose:** /** Remove a role override

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /settings/feature-flags  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/settings/FeatureFlagsPage.tsx  

- **Source:** `server/routers/featureFlags.ts`


##### Remove User Override (`featureFlags.removeUserOverride`)

- **Purpose:** /** Remove a user override

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /settings/feature-flags  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/settings/FeatureFlagsPage.tsx  

- **Source:** `server/routers/featureFlags.ts`


#### Update


##### Set Role Override (`featureFlags.setRoleOverride`)

- **Purpose:** /** Set a role override

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /settings/feature-flags  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/settings/FeatureFlagsPage.tsx  

- **Source:** `server/routers/featureFlags.ts`


##### Set User Override (`featureFlags.setUserOverride`)

- **Purpose:** /** Set a user override CRITICAL: userOpenId is a string (openId), NOT a numeric id

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /settings/feature-flags  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/settings/FeatureFlagsPage.tsx  

- **Source:** `server/routers/featureFlags.ts`


##### Toggle System Enabled (`featureFlags.toggleSystemEnabled`)

- **Purpose:** /** Toggle system enabled status

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /settings/feature-flags  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/settings/FeatureFlagsPage.tsx  

- **Source:** `server/routers/featureFlags.ts`


##### Update (`featureFlags.update`)

- **Purpose:** /** Update an existing flag

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /settings/feature-flags  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/settings/FeatureFlagsPage.tsx  

- **Source:** `server/routers/featureFlags.ts`


#### View/Search


##### Evaluate (`featureFlags.evaluate`)

- **Purpose:** /** Evaluate a flag with full details (for debugging)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /settings/feature-flags  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/featureFlags.ts`


##### Is Enabled (`featureFlags.isEnabled`)

- **Purpose:** /** Check if a specific flag is enabled for the current user

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /settings/feature-flags  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/featureFlags.ts`


##### Test Evaluation (`featureFlags.testEvaluation`)

- **Purpose:** /** Test flag evaluation for a specific user (admin debugging)

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /settings/feature-flags  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/featureFlags.ts`


#### View/Search/Report


##### Get All (`featureFlags.getAll`)

- **Purpose:** /** Get all flags (admin view)

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /settings/feature-flags  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/settings/FeatureFlagsPage.tsx  

- **Source:** `server/routers/featureFlags.ts`


##### Get Audit History (`featureFlags.getAuditHistory`)

- **Purpose:** /** Get audit history for a flag or all flags

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /settings/feature-flags  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/settings/FeatureFlagsPage.tsx  

- **Source:** `server/routers/featureFlags.ts`


##### Get By Id (`featureFlags.getById`)

- **Purpose:** /** Get a single flag by ID

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /settings/feature-flags  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/featureFlags.ts`


##### Get By Key (`featureFlags.getByKey`)

- **Purpose:** /** Get a single flag by key

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /settings/feature-flags  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/featureFlags.ts`


##### Get By Module (`featureFlags.getByModule`)

- **Purpose:** /** Get flags by module

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /settings/feature-flags  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/featureFlags.ts`


##### Get Effective Flags (`featureFlags.getEffectiveFlags`)

- **Purpose:** /** Get effective flags for the current user Used by frontend FeatureFlagContext to load all flags at once

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /settings/feature-flags  

- **Implementation status:** Client-wired  

- **Client references:** client/src/contexts/FeatureFlagContext.tsx  

- **Source:** `server/routers/featureFlags.ts`


##### Get Role Overrides (`featureFlags.getRoleOverrides`)

- **Purpose:** /** Get all role overrides for a flag

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /settings/feature-flags  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/settings/FeatureFlagsPage.tsx  

- **Source:** `server/routers/featureFlags.ts`


##### Get User Overrides (`featureFlags.getUserOverrides`)

- **Purpose:** /** Get all user overrides for a flag

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /settings/feature-flags  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/featureFlags.ts`


### rbac-permissions


#### Create


##### Create (`rbac-permissions.create`)

- **Purpose:** /** Create a new custom permission Requires: rbac:permissions:create permission

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:permissions:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-permissions.ts`


#### Delete/Archive


##### Delete (`rbac-permissions.delete`)

- **Purpose:** /** Delete a custom permission Requires: rbac:permissions:delete permission

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:permissions:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-permissions.ts`


#### Update


##### Update (`rbac-permissions.update`)

- **Purpose:** /** Update a permission's details Requires: rbac:permissions:update permission

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:permissions:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-permissions.ts`


#### View/Search/Report


##### Get By Id (`rbac-permissions.getById`)

- **Purpose:** /** Get a specific permission with its role assignments Requires: rbac:permissions:read permission

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:permissions:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-permissions.ts`


##### Get By Module (`rbac-permissions.getByModule`)

- **Purpose:** /** Get permissions grouped by module Requires: rbac:permissions:read permission

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:permissions:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-permissions.ts`


##### Get Modules (`rbac-permissions.getModules`)

- **Purpose:** /** Get all unique modules Requires: rbac:permissions:read permission

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:permissions:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-permissions.ts`


##### Get Stats (`rbac-permissions.getStats`)

- **Purpose:** /** Get permission statistics Requires: rbac:permissions:read permission

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:permissions:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-permissions.ts`


##### List (`rbac-permissions.list`)

- **Purpose:** /** List all permissions with optional filtering by module Requires: rbac:permissions:read permission

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:permissions:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-permissions.ts`


##### Search (`rbac-permissions.search`)

- **Purpose:** /** Search permissions by name or description Requires: rbac:permissions:read permission

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:permissions:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-permissions.ts`


### rbac-roles


#### Action/Operation


##### Bulk Assign Permissions (`rbac-roles.bulkAssignPermissions`)

- **Purpose:** /** Bulk assign permissions to a role Requires: rbac:roles:assign_permission permission

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:roles:assign_permission (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-roles.ts`


##### Replace Permissions (`rbac-roles.replacePermissions`)

- **Purpose:** /** Replace all permissions for a role Requires: rbac:roles:assign_permission permission

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:roles:assign_permission (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-roles.ts`


#### Create


##### Create (`rbac-roles.create`)

- **Purpose:** /** Create a new custom role Requires: rbac:roles:create permission

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:roles:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-roles.ts`


#### Delete/Archive


##### Delete (`rbac-roles.delete`)

- **Purpose:** /** Delete a custom role System roles cannot be deleted Requires: rbac:roles:delete permission

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:roles:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-roles.ts`


##### Remove Permission (`rbac-roles.removePermission`)

- **Purpose:** /** Remove a permission from a role Requires: rbac:roles:remove_permission permission

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:roles:remove_permission (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-roles.ts`


#### Link/Associate


##### Assign Permission (`rbac-roles.assignPermission`)

- **Purpose:** /** Assign a permission to a role Requires: rbac:roles:assign_permission permission

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:roles:assign_permission (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-roles.ts`


#### Update


##### Update (`rbac-roles.update`)

- **Purpose:** /** Update a role's details System roles cannot be updated Requires: rbac:roles:update permission

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:roles:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-roles.ts`


#### View/Search/Report


##### Get By Id (`rbac-roles.getById`)

- **Purpose:** /** Get a specific role with its permissions Requires: rbac:roles:read permission

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:roles:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-roles.ts`


##### List (`rbac-roles.list`)

- **Purpose:** /** List all roles with their permission counts Requires: rbac:roles:read permission

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:roles:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-roles.ts`


### rbac-users


#### Action/Operation


##### Bulk Assign Roles (`rbac-users.bulkAssignRoles`)

- **Purpose:** /** Bulk assign roles to a user Requires: rbac:users:assign_role permission

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:users:assign_role (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-users.ts`


##### Grant Permission (`rbac-users.grantPermission`)

- **Purpose:** /** Grant a permission override to a user Requires: rbac:users:grant_permission permission

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:users:grant_permission (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-users.ts`


##### Replace Roles (`rbac-users.replaceRoles`)

- **Purpose:** /** Replace all roles for a user Requires: rbac:users:assign_role and rbac:users:remove_role permissions

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/rbac-users.ts`


##### Revoke Permission (`rbac-users.revokePermission`)

- **Purpose:** /** Revoke a permission override from a user Requires: rbac:users:revoke_permission permission

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:users:revoke_permission (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-users.ts`


#### Delete/Archive


##### Remove Permission Override (`rbac-users.removePermissionOverride`)

- **Purpose:** /** Remove a permission override from a user (delete the override entirely) Requires: rbac:users:remove_permission_override permission

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:users:remove_permission_override (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-users.ts`


##### Remove Role (`rbac-users.removeRole`)

- **Purpose:** /** Remove a role from a user Requires: rbac:users:remove_role permission

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:users:remove_role (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-users.ts`


#### Link/Associate


##### Assign Role (`rbac-users.assignRole`)

- **Purpose:** /** Assign a role to a user Requires: rbac:users:assign_role permission

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:users:assign_role (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-users.ts`


#### View/Search/Report


##### Get By Id (`rbac-users.getById`)

- **Purpose:** /** Get a specific user's roles and permissions Requires: rbac:users:read permission

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:users:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-users.ts`


##### Get My Permissions (`rbac-users.getMyPermissions`)

- **Purpose:** /** Get current user's permissions Requires authentication - returns the authenticated user's permissions

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/rbac-users.ts`


##### List (`rbac-users.list`)

- **Purpose:** /** List all users with their assigned roles Requires: rbac:users:read permission

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** rbac:users:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/rbac-users.ts`


### settings


#### Create


##### Create (`settings.create`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /settings, /settings/cogs, /settings/feature-flags, /settings/notifications  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/settings.ts`


##### Create (`settings.create`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /settings, /settings/cogs, /settings/feature-flags, /settings/notifications  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/settings.ts`


##### Create (`settings.create`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /settings, /settings/cogs, /settings/feature-flags, /settings/notifications  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/settings.ts`


##### Create (`settings.create`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /settings, /settings/cogs, /settings/feature-flags, /settings/notifications  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/settings.ts`


##### Seed Database (`settings.seedDatabase`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /settings, /settings/cogs, /settings/feature-flags, /settings/notifications  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/Settings.tsx  

- **Source:** `server/routers/settings.ts`


#### Delete/Archive


##### Delete (`settings.delete`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /settings, /settings/cogs, /settings/feature-flags, /settings/notifications  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/settings.ts`


##### Delete (`settings.delete`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /settings, /settings/cogs, /settings/feature-flags, /settings/notifications  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/settings.ts`


##### Delete (`settings.delete`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /settings, /settings/cogs, /settings/feature-flags, /settings/notifications  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/settings.ts`


##### Delete (`settings.delete`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /settings, /settings/cogs, /settings/feature-flags, /settings/notifications  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/settings.ts`


#### Update


##### Update (`settings.update`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /settings, /settings/cogs, /settings/feature-flags, /settings/notifications  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/settings.ts`


##### Update (`settings.update`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /settings, /settings/cogs, /settings/feature-flags, /settings/notifications  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/settings.ts`


##### Update (`settings.update`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /settings, /settings/cogs, /settings/feature-flags, /settings/notifications  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/settings.ts`


##### Update (`settings.update`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /settings, /settings/cogs, /settings/feature-flags, /settings/notifications  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/settings.ts`


#### View/Search


##### Hello (`settings.hello`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /settings, /settings/cogs, /settings/feature-flags, /settings/notifications  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/settings.ts`


#### View/Search/Report


##### List (`settings.list`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /settings, /settings/cogs, /settings/feature-flags, /settings/notifications  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/settings.ts`


##### List (`settings.list`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /settings, /settings/cogs, /settings/feature-flags, /settings/notifications  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/settings.ts`


##### List (`settings.list`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /settings, /settings/cogs, /settings/feature-flags, /settings/notifications  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/settings.ts`


##### List (`settings.list`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /settings, /settings/cogs, /settings/feature-flags, /settings/notifications  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/settings.ts`


### userManagement


#### Action/Operation


##### Reset Password (`userManagement.resetPassword`)

- **Purpose:** Reset user password - requires authentication and users:manage permission

- **Type:** mutation  

- **Auth wrapper:** strictlyProtectedProcedure  

- **Permissions:** users:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/UserManagement.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/userManagement.ts`


#### Create


##### Create User (`userManagement.createUser`)

- **Purpose:** Create a new user - requires authentication and users:manage permission

- **Type:** mutation  

- **Auth wrapper:** strictlyProtectedProcedure  

- **Permissions:** users:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/UserManagement.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/userManagement.ts`


#### Delete/Archive


##### Delete User (`userManagement.deleteUser`)

- **Purpose:** Delete a user - requires authentication and users:manage permission

- **Type:** mutation  

- **Auth wrapper:** strictlyProtectedProcedure  

- **Permissions:** users:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/UserManagement.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/userManagement.ts`


#### View/Search/Report


##### List Users (`userManagement.listUsers`)

- **Purpose:** List all users - requires authentication and users:read permission

- **Type:** query  

- **Auth wrapper:** strictlyProtectedProcedure  

- **Permissions:** users:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Read-Only Auditor  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/UserManagement.tsx; client/src/components/calendar/EventFormDialog.tsx; client/src/components/calendar/EventInvitationDialog.tsx; client/src/components/calendar/InvitationSettingsDialog.tsx; client/src/components/comments/MentionInput.tsx; client/src/pages/settings/FeatureFlagsPage.tsx  

- **Source:** `server/routers/userManagement.ts`


### users


#### View/Search/Report


##### List (`users.list`)

- **Purpose:** Users Router API endpoints for user management and listing

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /users  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/todos/TodoListForm.tsx  

- **Source:** `server/routers/users.ts`


## CRM


### clientNeedsEnhanced


#### Action/Operation


##### Expire Old (`clientNeedsEnhanced.expireOld`)

- **Purpose:** /** Expire old client needs

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clientNeedsEnhanced.ts`


##### Fulfill (`clientNeedsEnhanced.fulfill`)

- **Purpose:** /** Mark a client need as fulfilled

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clientNeedsEnhanced.ts`


#### Create


##### Create (`clientNeedsEnhanced.create`)

- **Purpose:** /** Create a new client need (with duplicate prevention)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clientNeedsEnhanced.ts`


##### Create And Find Matches (`clientNeedsEnhanced.createAndFindMatches`)

- **Purpose:** /** Create need and immediately find matches

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clientNeedsEnhanced.ts`


##### Create Quote From Match (`clientNeedsEnhanced.createQuoteFromMatch`)

- **Purpose:** /** Create quote from match

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clientNeedsEnhanced.ts`


#### Delete/Archive


##### Delete (`clientNeedsEnhanced.delete`)

- **Purpose:** /** Delete a client need

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clientNeedsEnhanced.ts`


#### State Transition/Action


##### Cancel (`clientNeedsEnhanced.cancel`)

- **Purpose:** /** Cancel a client need

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clientNeedsEnhanced.ts`


#### Update


##### Update (`clientNeedsEnhanced.update`)

- **Purpose:** /** Update a client need

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clientNeedsEnhanced.ts`


#### View/Search/Report


##### Find Matches (`clientNeedsEnhanced.findMatches`)

- **Purpose:** /** Find matches for a specific client need

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clientNeedsEnhanced.ts`


##### Get Active By Client (`clientNeedsEnhanced.getActiveByClient`)

- **Purpose:** /** Get active client needs for a specific client

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clientNeedsEnhanced.ts`


##### Get All (`clientNeedsEnhanced.getAll`)

- **Purpose:** /** Get all client needs with optional filters

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clientNeedsEnhanced.ts`


##### Get All With Matches (`clientNeedsEnhanced.getAllWithMatches`)

- **Purpose:** /** Get client needs with match counts

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clientNeedsEnhanced.ts`


##### Get By Id (`clientNeedsEnhanced.getById`)

- **Purpose:** /** Get a client need by ID

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clientNeedsEnhanced.ts`


##### Get Smart Opportunities (`clientNeedsEnhanced.getSmartOpportunities`)

- **Purpose:** /** Get smart opportunities (top matches)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clientNeedsEnhanced.ts`


### clients


#### Action/Operation


##### Record Payment (`clients.recordPayment`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clients.ts`


#### Create


##### Add (`clients.add`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Sales Manager, Customer Service  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clients.ts`


##### Add (`clients.add`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Sales Manager, Customer Service  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clients.ts`


##### Create (`clients.create`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Sales Manager, Customer Service  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/clients/AddClientWizard.tsx; client/src/components/orders/AddCustomerOverlay.tsx; client/src/hooks/useAppMutation.ts  

- **Source:** `server/routers/clients.ts`


##### Create (`clients.create`)

- **Purpose:** BLOCK-001: Enhanced error handling for duplicate TERI codes

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Sales Manager, Customer Service  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/clients/AddClientWizard.tsx; client/src/components/orders/AddCustomerOverlay.tsx; client/src/hooks/useAppMutation.ts  

- **Source:** `server/routers/clients.ts`


#### Delete/Archive


##### Archive (`clients.archive`)

- **Purpose:** For now, this is an alias for delete until soft delete is implemented

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/ClientsListPage.tsx  

- **Source:** `server/routers/clients.ts`


##### Delete (`clients.delete`)

- **Purpose:** Delete client (hard delete - use archive for soft delete)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clients.ts`


##### Delete (`clients.delete`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clients.ts`


##### Remove (`clients.remove`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clients.ts`


#### Link/Associate


##### Link Note (`clients.linkNote`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clients.ts`


##### Link Transaction (`clients.linkTransaction`)

- **Purpose:** Link transactions (e.g., refund to original sale)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clients.ts`


#### Update


##### Update (`clients.update`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Sales Manager, Customer Service  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/clients/CustomerWishlistCard.tsx; client/src/pages/ClientProfilePage.tsx; client/src/pages/ClientsListPage.tsx  

- **Source:** `server/routers/clients.ts`


##### Update (`clients.update`)

- **Purpose:** Update client (with optimistic locking - DATA-005)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Sales Manager, Customer Service  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/clients/CustomerWishlistCard.tsx; client/src/pages/ClientProfilePage.tsx; client/src/pages/ClientsListPage.tsx  

- **Source:** `server/routers/clients.ts`


##### Update Supplier Profile (`clients.updateSupplierProfile`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Sales Manager, Customer Service  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/clients/SupplierProfileSection.tsx  

- **Source:** `server/routers/clients.ts`


#### View/Search


##### Check Teri Code Available (`clients.checkTeriCodeAvailable`)

- **Purpose:** BLOCK-001: Added for proactive duplicate detection

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clients.ts`


##### Count (`clients.count`)

- **Purpose:** Get total count for pagination

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/ClientsListPage.tsx  

- **Source:** `server/routers/clients.ts`


#### View/Search/Report


##### Get All (`clients.getAll`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clients.ts`


##### Get By Id (`clients.getById`)

- **Purpose:** Get single client by ID

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/credit/CreditStatusCard.tsx; client/src/pages/ClientProfilePage.tsx; client/src/pages/OrderCreatorPage.tsx; client/src/pages/VIPPortalConfigPage.tsx  

- **Source:** `server/routers/clients.ts`


##### Get By Id (`clients.getById`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/credit/CreditStatusCard.tsx; client/src/pages/ClientProfilePage.tsx; client/src/pages/OrderCreatorPage.tsx; client/src/pages/VIPPortalConfigPage.tsx  

- **Source:** `server/routers/clients.ts`


##### Get By Teri Code (`clients.getByTeriCode`)

- **Purpose:** Get client by TERI code

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clients.ts`


##### Get History (`clients.getHistory`)

- **Purpose:** Get transaction history with relationship counts

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clients.ts`


##### Get Note Id (`clients.getNoteId`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clients.ts`


##### Get Supplier Profile (`clients.getSupplierProfile`)

- **Purpose:** Part of Canonical Model Unification - replaces vendor profile functionality

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/clients/SupplierProfileSection.tsx  

- **Source:** `server/routers/clients.ts`


##### Get With Relationships (`clients.getWithRelationships`)

- **Purpose:** Get transaction with relationships

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/clients.ts`


##### List (`clients.list`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/EventFormDialog.tsx; client/src/components/calendar/EventInvitationDialog.tsx; client/src/components/cogs/CogsClientSettings.tsx; client/src/components/spreadsheet/ClientGrid.tsx; client/src/hooks/useClientsData.ts; client/src/pages/ClientsListPage.tsx; client/src/pages/LiveShoppingPage.tsx; client/src/pages/OrderCreatorPage.tsx; client/src/pages/Orders.tsx; client/src/pages/PurchaseOrdersPage.tsx; client/src/pages/Quotes.tsx; client/src/pages/SalesSheetCreatorPage.tsx; client/src/pages/SampleManagement.tsx  

- **Source:** `server/routers/clients.ts`


##### List (`clients.list`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/EventFormDialog.tsx; client/src/components/calendar/EventInvitationDialog.tsx; client/src/components/cogs/CogsClientSettings.tsx; client/src/components/spreadsheet/ClientGrid.tsx; client/src/hooks/useClientsData.ts; client/src/pages/ClientsListPage.tsx; client/src/pages/LiveShoppingPage.tsx; client/src/pages/OrderCreatorPage.tsx; client/src/pages/Orders.tsx; client/src/pages/PurchaseOrdersPage.tsx; client/src/pages/Quotes.tsx; client/src/pages/SalesSheetCreatorPage.tsx; client/src/pages/SampleManagement.tsx  

- **Source:** `server/routers/clients.ts`


##### List (`clients.list`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/EventFormDialog.tsx; client/src/components/calendar/EventInvitationDialog.tsx; client/src/components/cogs/CogsClientSettings.tsx; client/src/components/spreadsheet/ClientGrid.tsx; client/src/hooks/useClientsData.ts; client/src/pages/ClientsListPage.tsx; client/src/pages/LiveShoppingPage.tsx; client/src/pages/OrderCreatorPage.tsx; client/src/pages/Orders.tsx; client/src/pages/PurchaseOrdersPage.tsx; client/src/pages/Quotes.tsx; client/src/pages/SalesSheetCreatorPage.tsx; client/src/pages/SampleManagement.tsx  

- **Source:** `server/routers/clients.ts`


##### List (`clients.list`)

- **Purpose:** BUG-034: Standardized pagination response

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /clients, /clients/:clientId/vip-portal-config, /clients/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/EventFormDialog.tsx; client/src/components/calendar/EventInvitationDialog.tsx; client/src/components/cogs/CogsClientSettings.tsx; client/src/components/spreadsheet/ClientGrid.tsx; client/src/hooks/useClientsData.ts; client/src/pages/ClientsListPage.tsx; client/src/pages/LiveShoppingPage.tsx; client/src/pages/OrderCreatorPage.tsx; client/src/pages/Orders.tsx; client/src/pages/PurchaseOrdersPage.tsx; client/src/pages/Quotes.tsx; client/src/pages/SalesSheetCreatorPage.tsx; client/src/pages/SampleManagement.tsx  

- **Source:** `server/routers/clients.ts`


### vendorReminders


#### Update


##### Mark Completed (`vendorReminders.markCompleted`)

- **Purpose:** /** Mark reminder as completed (harvest received)

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendorReminders.ts`


##### Mark Contacted (`vendorReminders.markContacted`)

- **Purpose:** /** Mark reminder as contacted

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendorReminders.ts`


##### Set Harvest Date (`vendorReminders.setHarvestDate`)

- **Purpose:** /** Set expected harvest date for a vendor

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendorReminders.ts`


#### View/Search/Report


##### Get Stats (`vendorReminders.getStats`)

- **Purpose:** /** Get reminder stats for dashboard

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendorReminders.ts`


##### Get Upcoming (`vendorReminders.getUpcoming`)

- **Purpose:** /** Get upcoming harvest reminders

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendorReminders.ts`


##### Get Vendor History (`vendorReminders.getVendorHistory`)

- **Purpose:** /** Get vendor harvest history

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendorReminders.ts`


### vendorSupply


#### Action/Operation


##### Expire Old (`vendorSupply.expireOld`)

- **Purpose:** /** Expire old vendor supply items

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vendor-supply  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendorSupply.ts`


##### Purchase (`vendorSupply.purchase`)

- **Purpose:** /** Mark a vendor supply item as purchased

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vendor-supply  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendorSupply.ts`


##### Reserve (`vendorSupply.reserve`)

- **Purpose:** /** Mark a vendor supply item as reserved

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vendor-supply  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendorSupply.ts`


#### Create


##### Create (`vendorSupply.create`)

- **Purpose:** /** Create a new vendor supply item

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vendor-supply  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendorSupply.ts`


#### Delete/Archive


##### Delete (`vendorSupply.delete`)

- **Purpose:** /** Delete a vendor supply item

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vendor-supply  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendorSupply.ts`


#### Update


##### Update (`vendorSupply.update`)

- **Purpose:** /** Update a vendor supply item

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vendor-supply  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendorSupply.ts`


#### View/Search/Report


##### Find Buyers (`vendorSupply.findBuyers`)

- **Purpose:** /** Find potential buyers for a vendor supply item

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vendor-supply  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendorSupply.ts`


##### Get All (`vendorSupply.getAll`)

- **Purpose:** /** Get all vendor supply items with optional filters

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vendor-supply  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/VendorSupplyPage.tsx  

- **Source:** `server/routers/vendorSupply.ts`


##### Get All With Matches (`vendorSupply.getAllWithMatches`)

- **Purpose:** /** Get vendor supply with match counts

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vendor-supply  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/MatchmakingServicePage.tsx  

- **Source:** `server/routers/vendorSupply.ts`


##### Get Available (`vendorSupply.getAvailable`)

- **Purpose:** /** Get available vendor supply items

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vendor-supply  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendorSupply.ts`


##### Get By Id (`vendorSupply.getById`)

- **Purpose:** /** Get a vendor supply item by ID

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vendor-supply  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendorSupply.ts`


### vendors


#### Create


##### Create (`vendors.create`)

- **Purpose:** /** Create a new vendor (facade - creates client + supplier_profile) @deprecated Use clients.create with isSeller=true instead

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vendors, /vendors/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendors.ts`


##### Create Note (`vendors.createNote`)

- **Purpose:** /** Create a new note for a vendor Feature: MF-016 Vendor Notes & History

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vendors, /vendors/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendors.ts`


#### Delete/Archive


##### Delete (`vendors.delete`)

- **Purpose:** /** Delete a vendor (facade - soft deletes client) @deprecated Use clients.delete instead

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vendors, /vendors/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendors.ts`


##### Delete Note (`vendors.deleteNote`)

- **Purpose:** /** Delete a vendor note Feature: MF-016 Vendor Notes & History

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vendors, /vendors/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendors.ts`


#### Update


##### Update (`vendors.update`)

- **Purpose:** /** Update an existing vendor (facade - updates client + supplier_profile) @deprecated Use clients.update instead

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vendors, /vendors/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendors.ts`


##### Update Note (`vendors.updateNote`)

- **Purpose:** /** Update a vendor note Feature: MF-016 Vendor Notes & History

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vendors, /vendors/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendors.ts`


#### View/Search/Report


##### Get All (`vendors.getAll`)

- **Purpose:** /** Get all vendors (facade over getAllSuppliers) @deprecated Use clients.list with clientTypes=['seller'] instead

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vendors, /vendors/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/spreadsheet/IntakeGrid.tsx  

- **Source:** `server/routers/vendors.ts`


##### Get By Id (`vendors.getById`)

- **Purpose:** /** Get vendor by ID (facade - tries legacy vendor ID first, then client ID) @deprecated Use clients.getById instead

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vendors, /vendors/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/VendorRedirect.tsx  

- **Source:** `server/routers/vendors.ts`


##### Get History (`vendors.getHistory`)

- **Purpose:** /** Get vendor history from audit logs Feature: MF-016 Vendor Notes & History

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vendors, /vendors/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendors.ts`


##### Get Notes (`vendors.getNotes`)

- **Purpose:** /** Get all notes for a vendor Feature: MF-016 Vendor Notes & History

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vendors, /vendors/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendors.ts`


##### Search (`vendors.search`)

- **Purpose:** /** Search vendors by name (facade over searchSuppliers) @deprecated Use clients.list with search and clientTypes=['seller'] instead

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vendors, /vendors/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vendors.ts`


## Inventory


### catalog


#### Action/Operation


##### Bulk Publish (`catalog.bulkPublish`)

- **Purpose:** /** Bulk publish multiple batches

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/catalog.ts`


##### Publish (`catalog.publish`)

- **Purpose:** /** Publish a batch to the catalog

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/catalog.ts`


##### Sync Quantities (`catalog.syncQuantities`)

- **Purpose:** /** Sync catalog quantities and auto-unpublish sold out items

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/catalog.ts`


##### Unpublish (`catalog.unpublish`)

- **Purpose:** /** Unpublish a batch from the catalog

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/catalog.ts`


#### View/Search/Report


##### Get By Batch Id (`catalog.getByBatchId`)

- **Purpose:** /** Get catalog item by batch ID

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/catalog.ts`


##### Get Public Catalog (`catalog.getPublicCatalog`)

- **Purpose:** /** Get the public catalog (published items)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/catalog.ts`


##### Get Ready For Publishing (`catalog.getReadyForPublishing`)

- **Purpose:** /** Get batches ready for publishing (PHOTOGRAPHY_COMPLETE status)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/catalog.ts`


##### Get Stats (`catalog.getStats`)

- **Purpose:** /** Get catalog statistics

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/catalog.ts`


### inventory


#### Action/Operation


##### Adjust Qty (`inventory.adjustQty`)

- **Purpose:** Adjust batch quantity

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /inventory, /inventory/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/spreadsheet/InventoryGrid.tsx  

- **Source:** `server/routers/inventory.ts`


##### Intake (`inventory.intake`)

- **Purpose:** ✅ ENHANCED: TERP-INIT-005 Phase 2 - Comprehensive validation

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /inventory, /inventory/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inventory/PurchaseModal.tsx; client/src/components/spreadsheet/IntakeGrid.tsx  

- **Source:** `server/routers/inventory.ts`


##### Save (`inventory.save`)

- **Purpose:** Save a new view

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /inventory, /inventory/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/inventory.ts`


##### Upload Media (`inventory.uploadMedia`)

- **Purpose:** BUG-004: File upload endpoint for media files

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager  

- **Related UI routes:** /inventory, /inventory/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inventory/BatchMediaUpload.tsx; client/src/components/inventory/PurchaseModal.tsx  

- **Source:** `server/routers/inventory.ts`


#### Create


##### Seed (`inventory.seed`)

- **Purpose:** Seed inventory data

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /inventory, /inventory/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/inventory.ts`


#### Delete/Archive


##### Delete (`inventory.delete`)

- **Purpose:** Bulk delete

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin  

- **Related UI routes:** /inventory, /inventory/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/inventory.ts`


##### Delete (`inventory.delete`)

- **Purpose:** Delete a view

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin  

- **Related UI routes:** /inventory, /inventory/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/inventory.ts`


#### Update


##### Update Batch (`inventory.updateBatch`)

- **Purpose:** TERP-SS-009: Update batch fields (ticket/unitCogs, notes) for spreadsheet editing

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager  

- **Related UI routes:** /inventory, /inventory/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/spreadsheet/InventoryGrid.tsx  

- **Source:** `server/routers/inventory.ts`


##### Update Status (`inventory.updateStatus`)

- **Purpose:** Bulk update status

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager  

- **Related UI routes:** /inventory, /inventory/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inventory/EditBatchModal.tsx; client/src/components/spreadsheet/InventoryGrid.tsx  

- **Source:** `server/routers/inventory.ts`


##### Update Status (`inventory.updateStatus`)

- **Purpose:** ✅ ENHANCED: TERP-INIT-005 Phase 2 - Comprehensive validation

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager  

- **Related UI routes:** /inventory, /inventory/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inventory/EditBatchModal.tsx; client/src/components/spreadsheet/InventoryGrid.tsx  

- **Source:** `server/routers/inventory.ts`


#### View/Search


##### Batch (`inventory.batch`)

- **Purpose:** Get batch profitability

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /inventory, /inventory/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/inventory.ts`


##### Brands (`inventory.brands`)

- **Purpose:** Get brands (for autocomplete)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /inventory, /inventory/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inventory/PurchaseModal.tsx  

- **Source:** `server/routers/inventory.ts`


##### Top (`inventory.top`)

- **Purpose:** Get top profitable batches

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /inventory, /inventory/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/inventory.ts`


##### Vendors (`inventory.vendors`)

- **Purpose:** Get vendors (for autocomplete)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /inventory, /inventory/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inventory/PurchaseModal.tsx  

- **Source:** `server/routers/inventory.ts`


#### View/Search/Report


##### Dashboard Stats (`inventory.dashboardStats`)

- **Purpose:** Get dashboard statistics

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /inventory, /inventory/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/Inventory.tsx  

- **Source:** `server/routers/inventory.ts`


##### Get Batches By Vendor (`inventory.getBatchesByVendor`)

- **Purpose:** _Requirements: 7.1_

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /inventory, /inventory/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/inventory.ts`


##### Get By Id (`inventory.getById`)

- **Purpose:** ✅ BUG-041 FIX: Always return arrays for locations and auditLogs (never undefined)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /inventory, /inventory/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inventory/BatchDetailDrawer.tsx; client/src/components/inventory/EditBatchModal.tsx  

- **Source:** `server/routers/inventory.ts`


##### List (`inventory.list`)

- **Purpose:** ✅ ENHANCED: TERP-INIT-005 Phase 4 - Cursor-based pagination

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /inventory, /inventory/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/locations/AssignBatchDialog.tsx; client/src/pages/Inventory.tsx; client/src/pages/PurchaseOrdersPage.tsx; client/src/pages/VendorsPage.tsx  

- **Source:** `server/routers/inventory.ts`


##### List (`inventory.list`)

- **Purpose:** Get all views for current user

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /inventory, /inventory/:id  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/locations/AssignBatchDialog.tsx; client/src/pages/Inventory.tsx; client/src/pages/PurchaseOrdersPage.tsx; client/src/pages/VendorsPage.tsx  

- **Source:** `server/routers/inventory.ts`


##### Summary (`inventory.summary`)

- **Purpose:** Get overall summary

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /inventory, /inventory/:id  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/inventory.ts`


### inventoryMovements


#### Action/Operation


##### Adjust (`inventoryMovements.adjust`)

- **Purpose:** Adjust inventory (manual adjustment)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/inventoryMovements.ts`


##### Decrease (`inventoryMovements.decrease`)

- **Purpose:** Inventory Movements Router API endpoints for inventory movement tracking and management

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/inventoryMovements.ts`


##### Increase (`inventoryMovements.increase`)

- **Purpose:** Increase inventory (for refunds)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/inventoryMovements.ts`


##### Record (`inventoryMovements.record`)

- **Purpose:** Inventory Movements Router API endpoints for inventory movement tracking and management

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/inventoryMovements.ts`


##### Reverse (`inventoryMovements.reverse`)

- **Purpose:** Reverse a movement

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/inventoryMovements.ts`


#### View/Search


##### Validate Availability (`inventoryMovements.validateAvailability`)

- **Purpose:** Validate inventory availability

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/inventoryMovements.ts`


#### View/Search/Report


##### Get By Batch (`inventoryMovements.getByBatch`)

- **Purpose:** Get movements for a batch

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/inventoryMovements.ts`


##### Get By Reference (`inventoryMovements.getByReference`)

- **Purpose:** Get movements by reference

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/inventoryMovements.ts`


##### Get Summary (`inventoryMovements.getSummary`)

- **Purpose:** Get movement summary for a batch

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/inventoryMovements.ts`


### locations


#### Create


##### Create (`locations.create`)

- **Purpose:** Create location

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /locations  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/LocationsPage.tsx  

- **Source:** `server/routers/locations.ts`


#### Delete/Archive


##### Delete (`locations.delete`)

- **Purpose:** Delete location (soft delete by setting isActive = 0)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /locations  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/LocationsPage.tsx  

- **Source:** `server/routers/locations.ts`


#### Link/Associate


##### Assign Batch To Location (`locations.assignBatchToLocation`)

- **Purpose:** Assign batch to location

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /locations  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/LocationsPage.tsx  

- **Source:** `server/routers/locations.ts`


#### Update


##### Update (`locations.update`)

- **Purpose:** Update location

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /locations  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/LocationsPage.tsx  

- **Source:** `server/routers/locations.ts`


#### View/Search/Report


##### Get All (`locations.getAll`)

- **Purpose:** Locations Router API endpoints for warehouse location management

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /locations  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/locations/AssignBatchDialog.tsx; client/src/components/spreadsheet/IntakeGrid.tsx; client/src/pages/LocationsPage.tsx  

- **Source:** `server/routers/locations.ts`


##### Get Batch Locations (`locations.getBatchLocations`)

- **Purpose:** Get batch locations (where batches are stored)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /locations  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/locations.ts`


##### Get By Id (`locations.getById`)

- **Purpose:** Locations Router API endpoints for warehouse location management

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /locations  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/locations.ts`


##### Get Location Inventory (`locations.getLocationInventory`)

- **Purpose:** Get location inventory summary

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /locations  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/locations.ts`


### productCatalogue


#### Action/Operation


##### Restore (`productCatalogue.restore`)

- **Purpose:** Restore a soft-deleted product

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/ProductsPage.tsx  

- **Source:** `server/routers/productCatalogue.ts`


#### Create


##### Create (`productCatalogue.create`)

- **Purpose:** Create a new product

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/ProductsPage.tsx  

- **Source:** `server/routers/productCatalogue.ts`


#### Delete/Archive


##### Delete (`productCatalogue.delete`)

- **Purpose:** Soft delete a product

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/ProductsPage.tsx  

- **Source:** `server/routers/productCatalogue.ts`


#### Update


##### Update (`productCatalogue.update`)

- **Purpose:** Update an existing product

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/ProductsPage.tsx  

- **Source:** `server/routers/productCatalogue.ts`


#### View/Search/Report


##### Get Brands (`productCatalogue.getBrands`)

- **Purpose:** Get all brands for dropdown

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/ProductsPage.tsx  

- **Source:** `server/routers/productCatalogue.ts`


##### Get By Id (`productCatalogue.getById`)

- **Purpose:** Get a single product by ID

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/productCatalogue.ts`


##### Get Categories (`productCatalogue.getCategories`)

- **Purpose:** Get all unique categories for filter dropdown

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/ProductsPage.tsx  

- **Source:** `server/routers/productCatalogue.ts`


##### Get Strains (`productCatalogue.getStrains`)

- **Purpose:** Get all strains for dropdown

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/ProductsPage.tsx  

- **Source:** `server/routers/productCatalogue.ts`


##### List (`productCatalogue.list`)

- **Purpose:** Product Catalogue Router API endpoints for unified product catalogue management FEATURE-011: Unified Product Catalogue - Foundation for sales workflow

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/ProductsPage.tsx  

- **Source:** `server/routers/productCatalogue.ts`


### productIntake


#### Create


##### Add Batch (`productIntake.addBatch`)

- **Purpose:** Add batch to intake session

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/productIntake.ts`


##### Create Session (`productIntake.createSession`)

- **Purpose:** Create new intake session

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/productIntake.ts`


#### Delete/Archive


##### Remove Batch (`productIntake.removeBatch`)

- **Purpose:** Remove batch from intake session

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/productIntake.ts`


#### State Transition/Action


##### Cancel Session (`productIntake.cancelSession`)

- **Purpose:** Cancel intake session

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/productIntake.ts`


##### Complete Session (`productIntake.completeSession`)

- **Purpose:** Complete intake session

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/productIntake.ts`


#### Update


##### Update Batch (`productIntake.updateBatch`)

- **Purpose:** Update batch in intake session

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/productIntake.ts`


#### View/Search


##### Generate Receipt (`productIntake.generateReceipt`)

- **Purpose:** Generate vendor receipt

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/productIntake.ts`


#### View/Search/Report


##### Get Session (`productIntake.getSession`)

- **Purpose:** Get intake session details

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/productIntake.ts`


##### List Sessions (`productIntake.listSessions`)

- **Purpose:** List intake sessions

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/productIntake.ts`


### samples


#### Action/Operation


##### Fulfill Request (`samples.fulfillRequest`)

- **Purpose:** Fulfill a sample request

- **Type:** mutation  

- **Auth wrapper:** strictlyProtectedProcedure  

- **Permissions:** samples:allocate (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager  

- **Related UI routes:** /samples  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/samples.ts`


##### Request Return (`samples.requestReturn`)

- **Purpose:** Request a sample return

- **Type:** mutation  

- **Auth wrapper:** strictlyProtectedProcedure  

- **Permissions:** samples:return (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /samples  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/SampleManagement.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/samples.ts`


##### Request Vendor Return (`samples.requestVendorReturn`)

- **Purpose:** Request a vendor return

- **Type:** mutation  

- **Auth wrapper:** strictlyProtectedProcedure  

- **Permissions:** samples:vendorReturn (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /samples  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/SampleManagement.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/samples.ts`


#### Create


##### Create Request (`samples.createRequest`)

- **Purpose:** Create a new sample request

- **Type:** mutation  

- **Auth wrapper:** strictlyProtectedProcedure  

- **Permissions:** samples:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager  

- **Related UI routes:** /samples  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/SampleManagement.tsx  

- **Source:** `server/routers/samples.ts`


#### Link/Associate


##### Link Order To Sample (`samples.linkOrderToSample`)

- **Purpose:** Link an order to a sample request (conversion tracking)

- **Type:** mutation  

- **Auth wrapper:** strictlyProtectedProcedure  

- **Permissions:** samples:track (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Inventory Manager  

- **Related UI routes:** /samples  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/samples.ts`


#### State Transition/Action


##### Approve Return (`samples.approveReturn`)

- **Purpose:** Approve a sample return

- **Type:** mutation  

- **Auth wrapper:** strictlyProtectedProcedure  

- **Permissions:** samples:approve (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /samples  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/SampleManagement.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/samples.ts`


##### Cancel Request (`samples.cancelRequest`)

- **Purpose:** Cancel a sample request

- **Type:** mutation  

- **Auth wrapper:** strictlyProtectedProcedure  

- **Permissions:** samples:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Inventory Manager  

- **Related UI routes:** /samples  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/SampleManagement.tsx  

- **Source:** `server/routers/samples.ts`


##### Complete Return (`samples.completeReturn`)

- **Purpose:** Complete a sample return

- **Type:** mutation  

- **Auth wrapper:** strictlyProtectedProcedure  

- **Permissions:** samples:return (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /samples  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/SampleManagement.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/samples.ts`


##### Confirm Vendor Return (`samples.confirmVendorReturn`)

- **Purpose:** Confirm vendor received the sample

- **Type:** mutation  

- **Auth wrapper:** strictlyProtectedProcedure  

- **Permissions:** samples:vendorReturn (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /samples  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/SampleManagement.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/samples.ts`


##### Ship To Vendor (`samples.shipToVendor`)

- **Purpose:** Ship sample to vendor

- **Type:** mutation  

- **Auth wrapper:** strictlyProtectedProcedure  

- **Permissions:** samples:vendorReturn (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /samples  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/SampleManagement.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/samples.ts`


#### Update


##### Set Expiration Date (`samples.setExpirationDate`)

- **Purpose:** Set expiration date for a sample

- **Type:** mutation  

- **Auth wrapper:** strictlyProtectedProcedure  

- **Permissions:** samples:track (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Inventory Manager  

- **Related UI routes:** /samples  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/samples.ts`


##### Set Monthly Allocation (`samples.setMonthlyAllocation`)

- **Purpose:** Set monthly allocation for a client

- **Type:** mutation  

- **Auth wrapper:** strictlyProtectedProcedure  

- **Permissions:** samples:allocate (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager  

- **Related UI routes:** /samples  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/samples.ts`


##### Update Location (`samples.updateLocation`)

- **Purpose:** Update sample location

- **Type:** mutation  

- **Auth wrapper:** strictlyProtectedProcedure  

- **Permissions:** samples:track (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Inventory Manager  

- **Related UI routes:** /samples  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/SampleManagement.tsx  

- **Source:** `server/routers/samples.ts`


#### View/Search


##### Check Allocation (`samples.checkAllocation`)

- **Purpose:** Check monthly allocation

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** samples:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager, Read-Only Auditor  

- **Related UI routes:** /samples  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/samples.ts`


#### View/Search/Report


##### Get All (`samples.getAll`)

- **Purpose:** Wave 4C: Enhanced logging for database error investigation

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** samples:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager, Read-Only Auditor  

- **Related UI routes:** /samples  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/SampleManagement.tsx  

- **Source:** `server/routers/samples.ts`


##### Get By Client (`samples.getByClient`)

- **Purpose:** Get sample requests by client

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** samples:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager, Read-Only Auditor  

- **Related UI routes:** /samples  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/samples.ts`


##### Get By Id (`samples.getById`)

- **Purpose:** Get a single sample request by ID

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** samples:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager, Read-Only Auditor  

- **Related UI routes:** /samples  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/samples.ts`


##### Get Conversion Report (`samples.getConversionReport`)

- **Purpose:** Analytics: Sample conversion report

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** samples:track (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Inventory Manager  

- **Related UI routes:** /samples  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/samples.ts`


##### Get Cost By Client (`samples.getCostByClient`)

- **Purpose:** Analytics: Sample cost by client

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** samples:track (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Inventory Manager  

- **Related UI routes:** /samples  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/samples.ts`


##### Get Cost By Product (`samples.getCostByProduct`)

- **Purpose:** Analytics: Sample cost by product

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** samples:track (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Inventory Manager  

- **Related UI routes:** /samples  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/samples.ts`


##### Get Distribution Report (`samples.getDistributionReport`)

- **Purpose:** Analytics: Sample distribution report

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** samples:track (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Inventory Manager  

- **Related UI routes:** /samples  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/samples.ts`


##### Get Effectiveness By Product (`samples.getEffectivenessByProduct`)

- **Purpose:** Analytics: Sample effectiveness by product

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** samples:track (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Inventory Manager  

- **Related UI routes:** /samples  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/samples.ts`


##### Get Expiring (`samples.getExpiring`)

- **Purpose:** Get samples expiring within N days

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** samples:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager, Read-Only Auditor  

- **Related UI routes:** /samples  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/samples/ExpiringSamplesWidget.tsx  

- **Source:** `server/routers/samples.ts`


##### Get Location History (`samples.getLocationHistory`)

- **Purpose:** Get location history for a sample

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** samples:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager, Read-Only Auditor  

- **Related UI routes:** /samples  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/samples.ts`


##### Get Monthly Allocation (`samples.getMonthlyAllocation`)

- **Purpose:** Get monthly allocation for a client

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** samples:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager, Read-Only Auditor  

- **Related UI routes:** /samples  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/samples.ts`


##### Get Pending (`samples.getPending`)

- **Purpose:** BUG-034: Standardized pagination response

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** samples:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager, Read-Only Auditor  

- **Related UI routes:** /samples  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/samples.ts`


##### Get ROIAnalysis (`samples.getROIAnalysis`)

- **Purpose:** Analytics: Sample ROI analysis

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** samples:track (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Inventory Manager  

- **Related UI routes:** /samples  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/samples.ts`


### strains


#### Action/Operation


##### Get Or Create (`strains.getOrCreate`)

- **Purpose:** Get or create strain with fuzzy matching

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inventory/StrainInput.tsx  

- **Source:** `server/routers/strains.ts`


#### Create


##### Create (`strains.create`)

- **Purpose:** Create custom strain

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Inventory Manager  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/strains.ts`


##### Import Open THC (`strains.importOpenTHC`)

- **Purpose:** Import OpenTHC strains

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/strains.ts`


##### Seed (`strains.seed`)

- **Purpose:** Seed strains from CSV

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/strains.ts`


#### View/Search


##### Fuzzy Search (`strains.fuzzySearch`)

- **Purpose:** BUG-034: Standardized pagination response

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inventory/StrainInput.tsx; client/src/hooks/useStrainHooks.ts  

- **Source:** `server/routers/strains.ts`


##### Match For Assignment (`strains.matchForAssignment`)

- **Purpose:** Match strain for assignment (with auto/suggest/create logic)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/strains.ts`


#### View/Search/Report


##### Find Exact (`strains.findExact`)

- **Purpose:** Find exact strain match

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/strains.ts`


##### Find Fuzzy (`strains.findFuzzy`)

- **Purpose:** Find fuzzy strain matches

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/strains.ts`


##### Get By Id (`strains.getById`)

- **Purpose:** Get strain by ID

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inventory/StrainInput.tsx  

- **Source:** `server/routers/strains.ts`


##### Get Family (`strains.getFamily`)

- **Purpose:** Get strain family (parent and all variants)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** Client-wired  

- **Client references:** client/src/hooks/useStrainHooks.ts  

- **Source:** `server/routers/strains.ts`


##### Get Family Stats (`strains.getFamilyStats`)

- **Purpose:** Get strain family statistics

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** Client-wired  

- **Client references:** client/src/hooks/useStrainHooks.ts  

- **Source:** `server/routers/strains.ts`


##### Get Products By Family (`strains.getProductsByFamily`)

- **Purpose:** Get products in strain family

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** Client-wired  

- **Client references:** client/src/hooks/useStrainHooks.ts  

- **Source:** `server/routers/strains.ts`


##### List (`strains.list`)

- **Purpose:** BUG-034: Standardized pagination response

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/spreadsheet/IntakeGrid.tsx  

- **Source:** `server/routers/strains.ts`


##### Search (`strains.search`)

- **Purpose:** BUG-034: Standardized pagination response

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/strains.ts`


## Other


### alerts


#### Action/Operation


##### Acknowledge (`alerts.acknowledge`)

- **Purpose:** /** Acknowledge an alert

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/alerts.ts`


#### Update


##### Set Thresholds (`alerts.setThresholds`)

- **Purpose:** /** Set stock alert thresholds for a product NOTE: Disabled - requires minStockLevel/targetStockLevel columns on products

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/alerts.ts`


#### View/Search/Report


##### Get All (`alerts.getAll`)

- **Purpose:** /** Get all active alerts NOTE: LOW_STOCK alerts disabled until schema supports stock thresholds

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/alerts.ts`


##### Get Low Stock (`alerts.getLowStock`)

- **Purpose:** /** Get low stock products NOTE: Disabled - requires minStockLevel/targetStockLevel columns on products

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/alerts.ts`


##### Get Needs For Vip Portal (`alerts.getNeedsForVipPortal`)

- **Purpose:** /** Get needs for VIP portal

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/alerts.ts`


##### Get Stats (`alerts.getStats`)

- **Purpose:** /** Get alert stats for dashboard

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/alerts.ts`


### appointmentRequests


#### Action/Operation


##### Request (`appointmentRequests.request`)

- **Purpose:** Appointment Requests Router (CAL-003) Manages the request/approval workflow for VIP client appointment bookings Production-ready implementation with pessimistic locking

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/appointmentRequests.ts`


#### State Transition/Action


##### Approve (`appointmentRequests.approve`)

- **Purpose:** ============================================================================

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/AppointmentRequestModal.tsx; client/src/components/calendar/AppointmentRequestsList.tsx  

- **Source:** `server/routers/appointmentRequests.ts`


##### Reject (`appointmentRequests.reject`)

- **Purpose:** ============================================================================

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/AppointmentRequestModal.tsx; client/src/components/calendar/AppointmentRequestsList.tsx  

- **Source:** `server/routers/appointmentRequests.ts`


#### View/Search/Report


##### Get By Id (`appointmentRequests.getById`)

- **Purpose:** ============================================================================

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/AppointmentRequestModal.tsx  

- **Source:** `server/routers/appointmentRequests.ts`


##### Get Pending Count (`appointmentRequests.getPendingCount`)

- **Purpose:** Get pending request count (for badge display)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/AppointmentRequestsList.tsx; client/src/pages/CalendarPage.tsx  

- **Source:** `server/routers/appointmentRequests.ts`


##### List (`appointmentRequests.list`)

- **Purpose:** ============================================================================

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/AppointmentRequestsList.tsx  

- **Source:** `server/routers/appointmentRequests.ts`


### auth


#### Action/Operation


##### Change Password (`auth.changePassword`)

- **Purpose:** Change current user's password

- **Type:** mutation  

- **Auth wrapper:** strictlyProtectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /vip-portal/auth/impersonate  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/account/PasswordChangeSection.tsx  

- **Source:** `server/routers/auth.ts`


##### Get Test Token (`auth.getTestToken`)

- **Purpose:** /** Get auth token for automated testing Requires a valid email/password combination Returns the session token that can be set as a cookie Only available when ENABLE_TEST_AUTH=true or NODE_ENV !== 'production' NOTE: This tRPC endpoint bypasses the authLimiter rate limiting that applies to the /api/auth/login REST endpoint (5 requests per 15 minutes). This is intentional for AI agent E2E testing wh

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vip-portal/auth/impersonate  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/auth.ts`


##### Logout (`auth.logout`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vip-portal/auth/impersonate  

- **Implementation status:** Client-wired  

- **Client references:** client/src/_core/hooks/useAuth.ts; client/src/components/layout/AppHeader.tsx  

- **Source:** `server/routers/auth.ts`


#### Update


##### Update Profile (`auth.updateProfile`)

- **Purpose:** Update current user's profile (name, email)

- **Type:** mutation  

- **Auth wrapper:** strictlyProtectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /vip-portal/auth/impersonate  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/account/ProfileSection.tsx  

- **Source:** `server/routers/auth.ts`


#### View/Search


##### Me (`auth.me`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /vip-portal/auth/impersonate  

- **Implementation status:** Client-wired  

- **Client references:** client/src/_core/hooks/useAuth.ts; client/src/components/account/ProfileSection.tsx; client/src/components/comments/CommentItem.tsx; client/src/components/layout/AppHeader.tsx  

- **Source:** `server/routers/auth.ts`


### badDebt


#### Action/Operation


##### Reverse (`badDebt.reverse`)

- **Purpose:** Bad Debt Router API endpoints for bad debt write-off management

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/badDebt.ts`


##### Write Off (`badDebt.writeOff`)

- **Purpose:** Bad Debt Router API endpoints for bad debt write-off management

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/badDebt.ts`


#### View/Search/Report


##### Get Aging Report (`badDebt.getAgingReport`)

- **Purpose:** Get bad debt aging report

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/badDebt.ts`


##### Get By Client (`badDebt.getByClient`)

- **Purpose:** Bad Debt Router API endpoints for bad debt write-off management

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/badDebt.ts`


##### Get Client Total (`badDebt.getClientTotal`)

- **Purpose:** Bad Debt Router API endpoints for bad debt write-off management

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** accounting:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/badDebt.ts`


### comments


#### Action/Operation


##### Resolve (`comments.resolve`)

- **Purpose:** /** Mark a comment as resolved

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** comments:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/comments/CommentItem.tsx  

- **Source:** `server/routers/comments.ts`


##### Unresolve (`comments.unresolve`)

- **Purpose:** /** Mark a comment as unresolved

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** comments:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/comments/CommentItem.tsx  

- **Source:** `server/routers/comments.ts`


#### Create


##### Create (`comments.create`)

- **Purpose:** /** Create a new comment with @mention parsing

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** comments:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/comments/CommentWidget.tsx  

- **Source:** `server/routers/comments.ts`


#### Delete/Archive


##### Delete (`comments.delete`)

- **Purpose:** /** Delete a comment (owner only)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** comments:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Customer Service  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/comments/CommentItem.tsx  

- **Source:** `server/routers/comments.ts`


#### Update


##### Update (`comments.update`)

- **Purpose:** /** Update an existing comment (owner only)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** comments:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/comments/CommentItem.tsx  

- **Source:** `server/routers/comments.ts`


#### View/Search/Report


##### Get By Id (`comments.getById`)

- **Purpose:** /** Get a specific comment by ID

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** comments:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/comments.ts`


##### Get Comment Mentions (`comments.getCommentMentions`)

- **Purpose:** /** Get all mentions for a specific comment

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** comments:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/comments.ts`


##### Get Entity Comments (`comments.getEntityComments`)

- **Purpose:** /** Get all comments for an entity with pagination PERF-003: Added pagination support

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** comments:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/comments/CommentWidget.tsx  

- **Source:** `server/routers/comments.ts`


##### Get My Mentions (`comments.getMyMentions`)

- **Purpose:** /** Get all mentions for the current authenticated user

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** comments:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/comments.ts`


##### Get Unresolved Count (`comments.getUnresolvedCount`)

- **Purpose:** /** Get unresolved comments count for an entity

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** comments:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/comments/CommentWidget.tsx  

- **Source:** `server/routers/comments.ts`


### configuration


#### Action/Operation


##### Apply Preset (`configuration.applyPreset`)

- **Purpose:** /** Apply a configuration preset

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** settings:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/configuration.ts`


##### Reset (`configuration.reset`)

- **Purpose:** /** Reset configuration to defaults

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** settings:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/configuration.ts`


#### Update


##### Set Value (`configuration.setValue`)

- **Purpose:** /** Set a configuration value

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** settings:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/configuration.ts`


#### View/Search


##### Validate (`configuration.validate`)

- **Purpose:** /** Validate configuration

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** settings:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/configuration.ts`


#### View/Search/Report


##### Get (`configuration.get`)

- **Purpose:** /** Get current configuration

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** settings:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/configuration.ts`


##### Get Feature Flags (`configuration.getFeatureFlags`)

- **Purpose:** /** Get feature flags

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** settings:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/configuration.ts`


##### Get History (`configuration.getHistory`)

- **Purpose:** /** Get configuration change history

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** settings:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/configuration.ts`


##### Get Value (`configuration.getValue`)

- **Purpose:** /** Get a specific configuration value

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** settings:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/configuration.ts`


### credit


#### Action/Operation


##### Calculate (`credit.calculate`)

- **Purpose:** Calculate credit limit for a client

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/credit/CreditLimitWidget.tsx; client/src/components/credit/CreditStatusCard.tsx  

- **Source:** `server/routers/credit.ts`


##### Check Order Credit (`credit.checkOrderCredit`)

- **Purpose:** Check credit for order creation (with override support)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/OrderCreatorPage.tsx  

- **Source:** `server/routers/credit.ts`


##### Manual Override (`credit.manualOverride`)

- **Purpose:** Manual override of credit limit

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/credit/CreditOverrideDialog.tsx  

- **Source:** `server/routers/credit.ts`


##### Sync To Client (`credit.syncToClient`)

- **Purpose:** Sync credit limit to clients table (for fast access)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/credit.ts`


#### Update


##### Update Settings (`credit.updateSettings`)

- **Purpose:** Update system settings

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/CreditSettingsPage.tsx  

- **Source:** `server/routers/credit.ts`


##### Update Visibility Settings (`credit.updateVisibilitySettings`)

- **Purpose:** Update visibility settings

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/CreditSettingsPage.tsx  

- **Source:** `server/routers/credit.ts`


#### View/Search/Report


##### Get Audit Log (`credit.getAuditLog`)

- **Purpose:** Get audit log for a client

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/credit.ts`


##### Get By Client Id (`credit.getByClientId`)

- **Purpose:** Get credit limit for a client

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/credit/CreditLimitWidget.tsx; client/src/components/credit/CreditStatusCard.tsx  

- **Source:** `server/routers/credit.ts`


##### Get Settings (`credit.getSettings`)

- **Purpose:** Get system settings

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/credit/CreditLimitWidget.tsx; client/src/pages/CreditSettingsPage.tsx  

- **Source:** `server/routers/credit.ts`


##### Get Signal History (`credit.getSignalHistory`)

- **Purpose:** Get signal history for a client

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/credit.ts`


##### Get Visibility Settings (`credit.getVisibilitySettings`)

- **Purpose:** Get visibility settings

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** Client-wired  

- **Client references:** client/src/hooks/useCreditVisibility.ts; client/src/pages/CreditSettingsPage.tsx  

- **Source:** `server/routers/credit.ts`


### credits


#### Action/Operation


##### Apply Credit (`credits.applyCredit`)

- **Purpose:** Apply credit to an invoice

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/CreditsPage.tsx  

- **Source:** `server/routers/credits.ts`


##### Issue (`credits.issue`)

- **Purpose:** Issue a new credit with enhanced options

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/CreditsPage.tsx  

- **Source:** `server/routers/credits.ts`


##### Void (`credits.void`)

- **Purpose:** Void a credit

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/CreditsPage.tsx  

- **Source:** `server/routers/credits.ts`


#### Create


##### Create (`credits.create`)

- **Purpose:** Create a new credit (legacy endpoint - kept for backwards compatibility)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/credits.ts`


#### Update


##### Mark Expired (`credits.markExpired`)

- **Purpose:** Mark expired credits (admin function, could be run as cron job)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/credits.ts`


#### View/Search/Report


##### Get Applications (`credits.getApplications`)

- **Purpose:** Get applications for a credit

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/credits.ts`


##### Get Balance (`credits.getBalance`)

- **Purpose:** Get client credit balance

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/credits.ts`


##### Get By Client (`credits.getByClient`)

- **Purpose:** Get all credits for a client

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/credits.ts`


##### Get By Id (`credits.getById`)

- **Purpose:** Get credit by ID

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/credits.ts`


##### Get By Number (`credits.getByNumber`)

- **Purpose:** Get credit by number

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/credits.ts`


##### Get History (`credits.getHistory`)

- **Purpose:** Get credit history for a client

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/credits.ts`


##### Get Invoice Applications (`credits.getInvoiceApplications`)

- **Purpose:** Get credits applied to an invoice

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/credits.ts`


##### Get Summary (`credits.getSummary`)

- **Purpose:** Get credit summary statistics

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/CreditsPage.tsx  

- **Source:** `server/routers/credits.ts`


##### List (`credits.list`)

- **Purpose:** Credits Router API endpoints for customer credit management (store credits, promotional credits, etc.) Note: This is separate from the credit.ts router which handles credit limit calculations Wave 5C Enhancement: Added comprehensive credit management features

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** credits:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Accountant  

- **Related UI routes:** /credit-settings  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/CreditsPage.tsx  

- **Source:** `server/routers/credits.ts`


### dataCardMetrics


#### View/Search/Report


##### Get Available Metrics (`dataCardMetrics.getAvailableMetrics`)

- **Purpose:** /** Get all available metric definitions for a module Used for configuration UI to show available options

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/dataCardMetrics.ts`


##### Get For Module (`dataCardMetrics.getForModule`)

- **Purpose:** /** Get metrics for a specific module Returns calculated metric values for the requested metric IDs

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/data-cards/DataCardGrid.tsx  

- **Source:** `server/routers/dataCardMetrics.ts`


### debug


#### View/Search


##### Check Database Schema (`debug.checkDatabaseSchema`)

- **Purpose:** /** DIAG-007: Comprehensive database schema check Lists all tables and checks for migration tracking

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/debug.ts`


##### Check Leaderboard Tables (`debug.checkLeaderboardTables`)

- **Purpose:** /** DIAG-006: Check if leaderboard tables exist

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/debug.ts`


##### Data Display Diagnostics (`debug.dataDisplayDiagnostics`)

- **Purpose:** /** QA-049/QA-050: Data Display Diagnostic Endpoint Comprehensive check of products and samples data at database level Protected: Requires authentication to prevent information disclosure

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/debug.ts`


##### Drizzle Test (`debug.drizzleTest`)

- **Purpose:** /** DIAG-003: Test Drizzle ORM queries specifically Compares queries with and without ENUM columns

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/debug.ts`


##### Leaderboard Table Check (`debug.leaderboardTableCheck`)

- **Purpose:** /** DIAG-005: Check leaderboard_weight_configs table structure

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/debug.ts`


##### Raw Mysql Test (`debug.rawMysqlTest`)

- **Purpose:** /** DIAG-002: Raw MySQL query diagnostic - bypasses Drizzle ORM Tests if the issue is with Drizzle or mysql2/connection

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/debug.ts`


#### View/Search/Report


##### Get Counts (`debug.getCounts`)

- **Purpose:** /** Get counts of all seeded tables (using COUNT instead of SELECT *)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/debug.ts`


### deployments


#### View/Search


##### By Status (`deployments.byStatus`)

- **Purpose:** /** Get deployments by status

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/deployments.ts`


##### Current (`deployments.current`)

- **Purpose:** /** Get current deployment in progress

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/deployments.ts`


##### Latest (`deployments.latest`)

- **Purpose:** /** Get the latest deployment

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/deployments.ts`


#### View/Search/Report


##### Get (`deployments.get`)

- **Purpose:** /** Get a single deployment by ID

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/deployments.ts`


##### Get By Commit (`deployments.getByCommit`)

- **Purpose:** /** Get deployment by commit SHA

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/deployments.ts`


##### List (`deployments.list`)

- **Purpose:** /** List deployments with optional filters

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/deployments.ts`


##### Stats (`deployments.stats`)

- **Purpose:** /** Get deployment statistics

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/deployments.ts`


### health


#### View/Search


##### Check (`health.check`)

- **Purpose:** /** Comprehensive health check Checks database, memory, connection pool, and external services

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/health.ts`


##### Liveness (`health.liveness`)

- **Purpose:** /** Simple liveness check Returns OK if the server is running - used for container health probes

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/health.ts`


##### Metrics (`health.metrics`)

- **Purpose:** /** Runtime metrics Returns detailed metrics for monitoring dashboards

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/health.ts`


##### Readiness (`health.readiness`)

- **Purpose:** /** Readiness check Returns OK if the server can handle requests (database connected, memory ok) Used for load balancer health checks

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/health.ts`


### inbox


#### Action/Operation


##### Auto Archive Old (`inbox.autoArchiveOld`)

- **Purpose:** Auto-archive old completed items

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /inbox  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/inbox.ts`


##### Bulk Mark As Completed (`inbox.bulkMarkAsCompleted`)

- **Purpose:** Bulk mark items as completed

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /inbox  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/inbox.ts`


##### Bulk Mark As Seen (`inbox.bulkMarkAsSeen`)

- **Purpose:** Bulk mark items as seen

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /inbox  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inbox/InboxPanel.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/inbox.ts`


##### Unarchive (`inbox.unarchive`)

- **Purpose:** Unarchive an item

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /inbox  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/inbox.ts`


#### Delete/Archive


##### Archive (`inbox.archive`)

- **Purpose:** Archive an item

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /inbox  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inbox/InboxItem.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/inbox.ts`


##### Delete (`inbox.delete`)

- **Purpose:** Delete an inbox item

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /inbox  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inbox/InboxItem.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/inbox.ts`


#### Update


##### Mark As Completed (`inbox.markAsCompleted`)

- **Purpose:** Mark item as completed

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /inbox  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inbox/InboxItem.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/inbox.ts`


##### Mark As Seen (`inbox.markAsSeen`)

- **Purpose:** Mark item as seen

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /inbox  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inbox/InboxItem.tsx; client/src/components/inbox/InboxWidget.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/inbox.ts`


##### Mark As Unread (`inbox.markAsUnread`)

- **Purpose:** Mark item as unread

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /inbox  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/inbox.ts`


#### View/Search/Report


##### Get By Id (`inbox.getById`)

- **Purpose:** Get a specific inbox item

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /inbox  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/inbox.ts`


##### Get By Status (`inbox.getByStatus`)

- **Purpose:** Inbox Router API endpoints for unified inbox management PERF-003: Added pagination support

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /inbox  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/inbox.ts`


##### Get My Items (`inbox.getMyItems`)

- **Purpose:** Inbox Router API endpoints for unified inbox management PERF-003: Added pagination support

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /inbox  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inbox/InboxPanel.tsx; client/src/components/inbox/InboxWidget.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/inbox.ts`


##### Get Stats (`inbox.getStats`)

- **Purpose:** Get inbox statistics

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /inbox  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inbox/InboxPanel.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/inbox.ts`


##### Get Unread (`inbox.getUnread`)

- **Purpose:** Inbox Router API endpoints for unified inbox management PERF-003: Added pagination support

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /inbox  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inbox/InboxPanel.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/inbox.ts`


### leaderboard


#### Action/Operation


##### Export (`leaderboard.export`)

- **Purpose:** /** Export leaderboard data

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /leaderboard  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/leaderboard/ExportButton.tsx  

- **Source:** `server/routers/leaderboard.ts`


##### Invalidate Cache (`leaderboard.invalidateCache`)

- **Purpose:** /** Invalidate leaderboard cache (admin only)

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /leaderboard  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/leaderboard.ts`


##### Reset (`leaderboard.reset`)

- **Purpose:** /** Reset user's weights to defaults

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /leaderboard  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/leaderboard.ts`


##### Save (`leaderboard.save`)

- **Purpose:** /** Save user's custom weights

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /leaderboard  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/leaderboard.ts`


#### View/Search/Report


##### Get (`leaderboard.get`)

- **Purpose:** /** Get current user's weights (or defaults)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /leaderboard  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/leaderboard.ts`


##### Get Defaults (`leaderboard.getDefaults`)

- **Purpose:** /** Get default weights for a client type

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /leaderboard  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/leaderboard.ts`


##### Get For Client (`leaderboard.getForClient`)

- **Purpose:** /** Get ranking context for a single client (for profile page)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /leaderboard  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/clients/ClientLeaderboardCard.tsx  

- **Source:** `server/routers/leaderboard.ts`


##### Get Metric Configs (`leaderboard.getMetricConfigs`)

- **Purpose:** /** Get available metrics configuration

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /leaderboard  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/leaderboard.ts`


##### Get Widget Data (`leaderboard.getWidgetData`)

- **Purpose:** /** Get dashboard widget data (top/bottom performers)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /leaderboard  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/dashboard/LeaderboardWidget.tsx  

- **Source:** `server/routers/leaderboard.ts`


##### List (`leaderboard.list`)

- **Purpose:** /** Get the full leaderboard with rankings

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /leaderboard  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/LeaderboardPage.tsx  

- **Source:** `server/routers/leaderboard.ts`


### liveShopping


#### Action/Operation


##### End Session (`liveShopping.endSession`)

- **Purpose:** /** End Session and Optionally Convert to Order (Enhanced P4-T01)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /live-shopping, /live-shopping/:sessionId  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/live-shopping/StaffSessionConsole.tsx  

- **Source:** `server/routers/liveShopping.ts`


##### Generate Sales Sheet (`liveShopping.generateSalesSheet`)

- **Purpose:** /** Generate Sales Sheet Snapshot (P4-T02) Can be done without ending session

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /live-shopping, /live-shopping/:sessionId  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/liveShopping.ts`


##### Highlight Product (`liveShopping.highlightProduct`)

- **Purpose:** /** Highlight a product (Showcase)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /live-shopping, /live-shopping/:sessionId  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/live-shopping/StaffSessionConsole.tsx  

- **Source:** `server/routers/liveShopping.ts`


#### Create


##### Add Item With Status (`liveShopping.addItemWithStatus`)

- **Purpose:** /** Add item directly with a specific status Allows adding items as Sample Request, Interested, or To Purchase

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /live-shopping, /live-shopping/:sessionId  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/liveShopping.ts`


##### Add To Cart (`liveShopping.addToCart`)

- **Purpose:** /** Add item to cart

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /live-shopping, /live-shopping/:sessionId  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/liveShopping.ts`


##### Create Session (`liveShopping.createSession`)

- **Purpose:** /** Create a new Live Shopping Session

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /live-shopping, /live-shopping/:sessionId  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/LiveShoppingPage.tsx  

- **Source:** `server/routers/liveShopping.ts`


#### Delete/Archive


##### Remove From Cart (`liveShopping.removeFromCart`)

- **Purpose:** /** Remove item from cart

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /live-shopping, /live-shopping/:sessionId  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/live-shopping/StaffSessionConsole.tsx  

- **Source:** `server/routers/liveShopping.ts`


#### Update


##### Set Override Price (`liveShopping.setOverridePrice`)

- **Purpose:** /** Set Override Price for a product in this session

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /live-shopping, /live-shopping/:sessionId  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/live-shopping/StaffSessionConsole.tsx  

- **Source:** `server/routers/liveShopping.ts`


##### Toggle Cart Item Sample (`liveShopping.toggleCartItemSample`)

- **Purpose:** /** Toggle Sample Status (P4-T03)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /live-shopping, /live-shopping/:sessionId  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/liveShopping.ts`


##### Update Cart Quantity (`liveShopping.updateCartQuantity`)

- **Purpose:** /** Update cart item quantity

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /live-shopping, /live-shopping/:sessionId  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/liveShopping.ts`


##### Update Item Status (`liveShopping.updateItemStatus`)

- **Purpose:** /** Update item status (Sample Request, Interested, To Purchase) Can be called by both staff and clients

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /live-shopping, /live-shopping/:sessionId  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/live-shopping/StaffSessionConsole.tsx  

- **Source:** `server/routers/liveShopping.ts`


##### Update Session Status (`liveShopping.updateSessionStatus`)

- **Purpose:** /** Update Session Status

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /live-shopping, /live-shopping/:sessionId  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/liveShopping.ts`


#### View/Search


##### Check Credit Status (`liveShopping.checkCreditStatus`)

- **Purpose:** /** Check Credit Status (P4-T04) Used by UI to show warnings before checkout

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /live-shopping, /live-shopping/:sessionId  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/liveShopping.ts`


#### View/Search/Report


##### Get Items By Status (`liveShopping.getItemsByStatus`)

- **Purpose:** /** Get items grouped by status for the session

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /live-shopping, /live-shopping/:sessionId  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/live-shopping/StaffSessionConsole.tsx  

- **Source:** `server/routers/liveShopping.ts`


##### Get Session (`liveShopping.getSession`)

- **Purpose:** /** Get single session details

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /live-shopping, /live-shopping/:sessionId  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/live-shopping/StaffSessionConsole.tsx  

- **Source:** `server/routers/liveShopping.ts`


##### List Sessions (`liveShopping.listSessions`)

- **Purpose:** /** List sessions with filters

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /live-shopping, /live-shopping/:sessionId  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/LiveShoppingPage.tsx  

- **Source:** `server/routers/liveShopping.ts`


##### Search Products (`liveShopping.searchProducts`)

- **Purpose:** /** Helper: Search Products for the Host Panel

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /live-shopping, /live-shopping/:sessionId  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/liveShopping.ts`


### matchingEnhanced


#### View/Search


##### Analyze Client Purchase History (`matchingEnhanced.analyzeClientPurchaseHistory`)

- **Purpose:** /** Analyze client purchase history to identify patterns

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/matchingEnhanced.ts`


##### Identify Lapsed Buyers (`matchingEnhanced.identifyLapsedBuyers`)

- **Purpose:** /** Identify lapsed buyers (clients who used to buy but haven't recently)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/matchingEnhanced.ts`


#### View/Search/Report


##### Find Buyers For Inventory (`matchingEnhanced.findBuyersForInventory`)

- **Purpose:** /** Find potential buyers for a specific inventory batch

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/matchingEnhanced.ts`


##### Find Historical Buyers (`matchingEnhanced.findHistoricalBuyers`)

- **Purpose:** /** Find historical buyers for a product/strain

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/matchingEnhanced.ts`


##### Find Matches For Batch (`matchingEnhanced.findMatchesForBatch`)

- **Purpose:** /** Find client needs that match a specific inventory batch

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/matchingEnhanced.ts`


##### Find Matches For Need (`matchingEnhanced.findMatchesForNeed`)

- **Purpose:** /** Find matches for a specific client need

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/matchingEnhanced.ts`


##### Find Matches For Vendor Supply (`matchingEnhanced.findMatchesForVendorSupply`)

- **Purpose:** /** Find client needs that match a specific vendor supply

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/matchingEnhanced.ts`


##### Get All Active Needs With Matches (`matchingEnhanced.getAllActiveNeedsWithMatches`)

- **Purpose:** /** Get all active needs with their matches (for dashboard widgets)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/matchingEnhanced.ts`


##### Get Predictive Reorder Opportunities (`matchingEnhanced.getPredictiveReorderOpportunities`)

- **Purpose:** /** Get predictive reorder opportunities based on purchase history

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/matchingEnhanced.ts`


### monitoring


#### View/Search/Report


##### Get Performance Summary (`monitoring.getPerformanceSummary`)

- **Purpose:** /** Get performance summary Returns a comprehensive overview of system performance

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/monitoring.ts`


##### Get Procedure Metrics (`monitoring.getProcedureMetrics`)

- **Purpose:** /** Get metrics for a specific procedure

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/monitoring.ts`


##### Get Recent Metrics (`monitoring.getRecentMetrics`)

- **Purpose:** /** Get recent performance metrics Returns the last 100 tRPC procedure executions with timing data

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/monitoring.ts`


##### Get Slow Query Stats (`monitoring.getSlowQueryStats`)

- **Purpose:** /** Get slow query statistics Returns aggregated statistics about slow procedures

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/monitoring.ts`


### notifications


#### Action/Operation


##### Vip Mark All Read (`notifications.vipMarkAllRead`)

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /notifications, /settings/notifications  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/notifications.ts`


##### Vip Mark Read (`notifications.vipMarkRead`)

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /notifications, /settings/notifications  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/notifications.ts`


##### Vip Update Preferences (`notifications.vipUpdatePreferences`)

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /notifications, /settings/notifications  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/notifications.ts`


#### Delete/Archive


##### Delete (`notifications.delete`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /notifications, /settings/notifications  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/NotificationsPage.tsx  

- **Source:** `server/routers/notifications.ts`


#### Update


##### Mark All Read (`notifications.markAllRead`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /notifications, /settings/notifications  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/notifications/NotificationBell.tsx; client/src/pages/NotificationsPage.tsx  

- **Source:** `server/routers/notifications.ts`


##### Mark Read (`notifications.markRead`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /notifications, /settings/notifications  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/notifications/NotificationBell.tsx; client/src/pages/NotificationsPage.tsx  

- **Source:** `server/routers/notifications.ts`


##### Update Preferences (`notifications.updatePreferences`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /notifications, /settings/notifications  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/settings/NotificationPreferences.tsx  

- **Source:** `server/routers/notifications.ts`


#### View/Search


##### Vip Get Preferences (`notifications.vipGetPreferences`)

- **Type:** query  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /notifications, /settings/notifications  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/notifications.ts`


##### Vip Get Unread Count (`notifications.vipGetUnreadCount`)

- **Type:** query  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /notifications, /settings/notifications  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/notifications.ts`


##### Vip List (`notifications.vipList`)

- **Type:** query  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /notifications, /settings/notifications  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/notifications.ts`


#### View/Search/Report


##### Get Preferences (`notifications.getPreferences`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /notifications, /settings/notifications  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/settings/NotificationPreferences.tsx  

- **Source:** `server/routers/notifications.ts`


##### Get Unread Count (`notifications.getUnreadCount`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /notifications, /settings/notifications  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/notifications/NotificationBell.tsx  

- **Source:** `server/routers/notifications.ts`


##### List (`notifications.list`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /notifications, /settings/notifications  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/notifications/NotificationBell.tsx; client/src/pages/NotificationsPage.tsx  

- **Source:** `server/routers/notifications.ts`


### photography


#### Action/Operation


##### Start Session (`photography.startSession`)

- **Purpose:** /** Start a photography session for a batch Changes batch from LIVE/AWAITING_INTAKE to in-progress photography

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /photography  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/photography.ts`


##### Upload (`photography.upload`)

- **Purpose:** /** Upload product image

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /photography  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inventory/BatchMediaUpload.tsx  

- **Source:** `server/routers/photography.ts`


##### Upload Photo (`photography.uploadPhoto`)

- **Purpose:** /** Upload a photo for a batch with storage integration

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /photography  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/photography.ts`


#### Delete/Archive


##### Delete (`photography.delete`)

- **Purpose:** /** Delete image

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /photography  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inventory/BatchMediaUpload.tsx  

- **Source:** `server/routers/photography.ts`


##### Delete Photo (`photography.deletePhoto`)

- **Purpose:** /** Delete a photo with cleanup

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /photography  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/photography.ts`


#### State Transition/Action


##### Complete Session (`photography.completeSession`)

- **Purpose:** /** Complete a photography session with validation Requires at least one primary photo

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /photography  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/photography.ts`


#### Update


##### Mark Complete (`photography.markComplete`)

- **Purpose:** /** Mark a batch as photography complete

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /photography  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/PhotographyPage.tsx  

- **Source:** `server/routers/photography.ts`


##### Reorder (`photography.reorder`)

- **Purpose:** /** Reorder images

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /photography  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/photography.ts`


##### Update (`photography.update`)

- **Purpose:** /** Update image details

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /photography  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inventory/BatchMediaUpload.tsx  

- **Source:** `server/routers/photography.ts`


#### View/Search/Report


##### Get Awaiting Photography (`photography.getAwaitingPhotography`)

- **Purpose:** /** Get batches awaiting photography Returns batches in AWAITING_INTAKE or LIVE status without photos

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /photography  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/photography.ts`


##### Get Batch Images (`photography.getBatchImages`)

- **Purpose:** /** Get images for a batch

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /photography  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/inventory/BatchMediaUpload.tsx  

- **Source:** `server/routers/photography.ts`


##### Get Batches Needing Photos (`photography.getBatchesNeedingPhotos`)

- **Purpose:** /** Get batches needing photos

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /photography  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/photography.ts`


##### Get Product Images (`photography.getProductImages`)

- **Purpose:** /** Get images for a product

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /photography  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/photography.ts`


##### Get Queue (`photography.getQueue`)

- **Purpose:** /** Get photography queue for the UI Returns batches that need photos, are being photographed, or have been completed

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /photography  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/PhotographyPage.tsx  

- **Source:** `server/routers/photography.ts`


##### Get Stats (`photography.getStats`)

- **Purpose:** /** Get photography stats

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /photography  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/photography.ts`


### pickPack


#### Action/Operation


##### Pack Items (`pickPack.packItems`)

- **Purpose:** /** Pack selected items into a bag

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /pick-pack  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/PickPackPage.tsx  

- **Source:** `server/routers/pickPack.ts`


##### Unpack Items (`pickPack.unpackItems`)

- **Purpose:** /** Unpack items from a bag (requires confirmation)

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /pick-pack  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/pickPack.ts`


#### Update


##### Mark All Packed (`pickPack.markAllPacked`)

- **Purpose:** /** Mark all items in order as packed

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /pick-pack  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/spreadsheet/PickPackGrid.tsx; client/src/pages/PickPackPage.tsx  

- **Source:** `server/routers/pickPack.ts`


##### Mark Order Ready (`pickPack.markOrderReady`)

- **Purpose:** /** Mark order as ready for shipping

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /pick-pack  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/spreadsheet/PickPackGrid.tsx; client/src/pages/PickPackPage.tsx  

- **Source:** `server/routers/pickPack.ts`


##### Update Status (`pickPack.updateStatus`)

- **Purpose:** /** Update order pick/pack status

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /pick-pack  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/spreadsheet/PickPackGrid.tsx  

- **Source:** `server/routers/pickPack.ts`


#### View/Search/Report


##### Get Order Details (`pickPack.getOrderDetails`)

- **Purpose:** /** Get order details for picking/packing

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /pick-pack  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/PickPackPage.tsx  

- **Source:** `server/routers/pickPack.ts`


##### Get Pick List (`pickPack.getPickList`)

- **Purpose:** /** Get the real-time pick list (orders ready for picking)

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /pick-pack  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/spreadsheet/PickPackGrid.tsx; client/src/pages/PickPackPage.tsx  

- **Source:** `server/routers/pickPack.ts`


##### Get Stats (`pickPack.getStats`)

- **Purpose:** /** Get stats for the pick/pack dashboard

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /pick-pack  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/spreadsheet/PickPackGrid.tsx; client/src/pages/PickPackPage.tsx  

- **Source:** `server/routers/pickPack.ts`


### poReceiving


#### Action/Operation


##### Receive (`poReceiving.receive`)

- **Purpose:** PO Receiving Router API endpoints for receiving purchase orders and updating inventory

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/poReceiving.ts`


##### Receive Goods With Batch (`poReceiving.receiveGoodsWithBatch`)

- **Purpose:** Enhanced goods receiving with batch creation and location assignment

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/poReceiving.ts`


#### View/Search/Report


##### Get Available Locations (`poReceiving.getAvailableLocations`)

- **Purpose:** Get available locations for receiving

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/poReceiving.ts`


##### Get POItems With Receipts (`poReceiving.getPOItemsWithReceipts`)

- **Purpose:** Get PO items with received quantities

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/poReceiving.ts`


##### Get Pending Receiving (`poReceiving.getPendingReceiving`)

- **Purpose:** Get purchase orders pending receiving (CONFIRMED, RECEIVING status)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/poReceiving.ts`


##### Get Receiving History (`poReceiving.getReceivingHistory`)

- **Purpose:** Get receiving history for a PO

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/poReceiving.ts`


##### Get Stats (`poReceiving.getStats`)

- **Purpose:** Get receiving statistics

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/poReceiving.ts`


### pricing


#### Action/Operation


##### Apply Profile To Client (`pricing.applyProfileToClient`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** pricing:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /pricing/profiles, /pricing/rules  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/pricing/PricingConfigTab.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/pricing.ts`


#### Create


##### Create Profile (`pricing.createProfile`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** pricing:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /pricing/profiles, /pricing/rules  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/PricingProfilesPage.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/pricing.ts`


##### Create Rule (`pricing.createRule`)

- **Purpose:** Pricing Router QUAL-002: Updated with proper validation schemas (no z.any())

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** pricing:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /pricing/profiles, /pricing/rules  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/PricingRulesPage.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/pricing.ts`


#### Delete/Archive


##### Delete Profile (`pricing.deleteProfile`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** pricing:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /pricing/profiles, /pricing/rules  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/PricingProfilesPage.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/pricing.ts`


##### Delete Rule (`pricing.deleteRule`)

- **Purpose:** Pricing Router QUAL-002: Updated with proper validation schemas (no z.any())

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** pricing:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /pricing/profiles, /pricing/rules  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/PricingRulesPage.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/pricing.ts`


#### Update


##### Update Profile (`pricing.updateProfile`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** pricing:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /pricing/profiles, /pricing/rules  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/PricingProfilesPage.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/pricing.ts`


##### Update Rule (`pricing.updateRule`)

- **Purpose:** Pricing Router QUAL-002: Updated with proper validation schemas (no z.any())

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** pricing:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /pricing/profiles, /pricing/rules  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/PricingRulesPage.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/pricing.ts`


#### View/Search/Report


##### Get Client Pricing Rules (`pricing.getClientPricingRules`)

- **Purpose:** Client Pricing

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** pricing:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /pricing/profiles, /pricing/rules  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/pricing/PricingConfigTab.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/pricing.ts`


##### Get Profile By Id (`pricing.getProfileById`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** pricing:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /pricing/profiles, /pricing/rules  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/pricing.ts`


##### Get Rule By Id (`pricing.getRuleById`)

- **Purpose:** Pricing Router QUAL-002: Updated with proper validation schemas (no z.any())

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** pricing:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /pricing/profiles, /pricing/rules  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/pricing.ts`


##### List Profiles (`pricing.listProfiles`)

- **Purpose:** Pricing Router QUAL-002: Updated with proper validation schemas (no z.any())

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** pricing:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /pricing/profiles, /pricing/rules  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/pricing/PricingConfigTab.tsx; client/src/pages/PricingProfilesPage.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/pricing.ts`


##### List Rules (`pricing.listRules`)

- **Purpose:** Pricing Router QUAL-002: Updated with proper validation schemas (no z.any())

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** pricing:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /pricing/profiles, /pricing/rules  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/PricingProfilesPage.tsx; client/src/pages/PricingRulesPage.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/pricing.ts`


### pricingDefaults


#### Action/Operation


##### Upsert (`pricingDefaults.upsert`)

- **Purpose:** /** Create or update default margin

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** pricing:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/pricingDefaults.ts`


#### View/Search/Report


##### Get All (`pricingDefaults.getAll`)

- **Purpose:** /** Get all default margins

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** pricing:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/pricingDefaults.ts`


##### Get By Category (`pricingDefaults.getByCategory`)

- **Purpose:** /** Get default margin for category

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** pricing:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/pricingDefaults.ts`


##### Get Margin With Fallback (`pricingDefaults.getMarginWithFallback`)

- **Purpose:** /** Get margin with fallback logic Used by order creation to determine margin

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** pricing:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/pricingDefaults.ts`


### receipts


#### Action/Operation


##### Generate (`receipts.generate`)

- **Purpose:** /** Generate a receipt for a transaction

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/receipts.ts`


##### Send Email (`receipts.sendEmail`)

- **Purpose:** /** Send receipt via email

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/receipts/ReceiptPreview.tsx  

- **Source:** `server/routers/receipts.ts`


##### Send Sms (`receipts.sendSms`)

- **Purpose:** /** Send receipt via SMS

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/receipts/ReceiptPreview.tsx  

- **Source:** `server/routers/receipts.ts`


#### View/Search


##### Download Pdf (`receipts.downloadPdf`)

- **Purpose:** /** Download receipt as PDF Generates actual PDF using jsPDF

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/receipts.ts`


#### View/Search/Report


##### Get By Id (`receipts.getById`)

- **Purpose:** /** Get receipt by ID

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/receipts.ts`


##### Get Client History (`receipts.getClientHistory`)

- **Purpose:** /** Get receipt history for a client

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/receipts.ts`


##### Get Preview (`receipts.getPreview`)

- **Purpose:** /** Get receipt HTML preview

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/receipts/ReceiptPreview.tsx  

- **Source:** `server/routers/receipts.ts`


##### Get Public Receipt (`receipts.getPublicReceipt`)

- **Purpose:** /** Public endpoint to view receipt by receipt number

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/receipts.ts`


##### Get Shareable Link (`receipts.getShareableLink`)

- **Purpose:** /** Get shareable link for receipt

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/receipts/ReceiptPreview.tsx  

- **Source:** `server/routers/receipts.ts`


### referrals


#### Action/Operation


##### Apply Credits To Order (`referrals.applyCreditsToOrder`)

- **Purpose:** /** Apply referral credits to an order

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/orders/ReferralCreditsPanel.tsx  

- **Source:** `server/routers/referrals.ts`


#### Create


##### Create Referral Credit (`referrals.createReferralCredit`)

- **Purpose:** /** Create a referral credit when a referred order is created Called internally when an order with referredByClientId is created

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/referrals.ts`


#### State Transition/Action


##### Cancel Credit (`referrals.cancelCredit`)

- **Purpose:** /** Cancel referral credit (called when referred order is cancelled)

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/referrals.ts`


#### Update


##### Mark Credit Available (`referrals.markCreditAvailable`)

- **Purpose:** /** Mark referral credit as available (called when referred order is finalized)

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/referrals.ts`


##### Update Settings (`referrals.updateSettings`)

- **Purpose:** /** Update referral settings

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/referrals.ts`


#### View/Search/Report


##### Get Credit History (`referrals.getCreditHistory`)

- **Purpose:** /** Get all credits for a client (including applied, for history)

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/referrals.ts`


##### Get Eligible Referrers (`referrals.getEligibleReferrers`)

- **Purpose:** /** Get eligible referrers (all clients) for dropdown NOTE: clients.tier and clients.isActive don't exist in schema

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/orders/ReferredBySelector.tsx  

- **Source:** `server/routers/referrals.ts`


##### Get Pending Credits (`referrals.getPendingCredits`)

- **Purpose:** /** Get pending and available credits for a client (VIP)

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/orders/ReferralCreditsPanel.tsx  

- **Source:** `server/routers/referrals.ts`


##### Get Settings (`referrals.getSettings`)

- **Purpose:** /** Get referral settings (global and per-tier)

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/orders/ReferredBySelector.tsx  

- **Source:** `server/routers/referrals.ts`


##### Get Stats (`referrals.getStats`)

- **Purpose:** /** Get referral statistics for reporting

- **Type:** query  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/referrals.ts`


### refunds


#### Create


##### Create (`refunds.create`)

- **Purpose:** SECURITY: createdBy is derived from authenticated context, not from input

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/refunds.ts`


#### View/Search/Report


##### Get All (`refunds.getAll`)

- **Purpose:** Refunds Router API endpoints for processing refunds on returns

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/refunds.ts`


##### Get By Id (`refunds.getById`)

- **Purpose:** Refunds Router API endpoints for processing refunds on returns

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/refunds.ts`


##### Get By Original Transaction (`refunds.getByOriginalTransaction`)

- **Purpose:** Get refunds for a specific original transaction

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/refunds.ts`


##### Get By Return (`refunds.getByReturn`)

- **Purpose:** Get refunds for a specific return

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/refunds.ts`


##### Get Stats (`refunds.getStats`)

- **Purpose:** Get refund statistics

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/refunds.ts`


### returns


#### Action/Operation


##### Process (`returns.process`)

- **Purpose:** Process a return and optionally issue credit

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /returns  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/returns.ts`


##### Receive (`returns.receive`)

- **Purpose:** Receive items from a return

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /returns  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/returns.ts`


#### Create


##### Create (`returns.create`)

- **Purpose:** Create a return request

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /returns  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/ReturnsPage.tsx  

- **Source:** `server/routers/returns.ts`


#### State Transition/Action


##### Approve (`returns.approve`)

- **Purpose:** Approve a return (updates status from PENDING to APPROVED)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /returns  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/returns.ts`


##### Reject (`returns.reject`)

- **Purpose:** Reject a return

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /returns  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/returns.ts`


#### View/Search/Report


##### Get All (`returns.getAll`)

- **Purpose:** Get all returns (legacy endpoint)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /returns  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/ReturnsPage.tsx  

- **Source:** `server/routers/returns.ts`


##### Get By Id (`returns.getById`)

- **Purpose:** Get return by ID

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /returns  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/returns.ts`


##### Get By Order (`returns.getByOrder`)

- **Purpose:** Get returns by order

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /returns  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/returns.ts`


##### Get Stats (`returns.getStats`)

- **Purpose:** Get return statistics

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /returns  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/ReturnsPage.tsx  

- **Source:** `server/routers/returns.ts`


##### Get Summary (`returns.getSummary`)

- **Purpose:** Get returns summary for dashboard

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /returns  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/returns.ts`


##### List (`returns.list`)

- **Purpose:** List returns with filtering and pagination

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /returns  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/returns.ts`


### salesSheetEnhancements


#### Action/Operation


##### Clone Template (`salesSheetEnhancements.cloneTemplate`)

- **Purpose:** Clone template

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/salesSheetEnhancements.ts`


##### Restore Version (`salesSheetEnhancements.restoreVersion`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/salesSheetEnhancements.ts`


#### Create


##### Create Bulk Orders (`salesSheetEnhancements.createBulkOrders`)

- **Purpose:** Bulk order creation

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/salesSheetEnhancements.ts`


##### Create Version (`salesSheetEnhancements.createVersion`)

- **Purpose:** Version control

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/salesSheetEnhancements.ts`


#### Delete/Archive


##### Deactivate Expired (`salesSheetEnhancements.deactivateExpired`)

- **Purpose:** Consider converting to a scheduled cron job instead of API endpoint

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/salesSheetEnhancements.ts`


#### Update


##### Set Expiration (`salesSheetEnhancements.setExpiration`)

- **Purpose:** Expiration management

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/salesSheetEnhancements.ts`


#### View/Search/Report


##### Get Active Sheets (`salesSheetEnhancements.getActiveSheets`)

- **Purpose:** Active sheets

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/salesSheetEnhancements.ts`


##### Get Client Pricing (`salesSheetEnhancements.getClientPricing`)

- **Purpose:** Client-specific pricing

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/salesSheetEnhancements.ts`


##### Get Usage Stats (`salesSheetEnhancements.getUsageStats`)

- **Purpose:** Usage statistics

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/salesSheetEnhancements.ts`


##### Get Version History (`salesSheetEnhancements.getVersionHistory`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/salesSheetEnhancements.ts`


### salesSheets


#### Action/Operation


##### Convert Draft To Sheet (`salesSheets.convertDraftToSheet`)

- **Purpose:** /** Convert a draft to a finalized sales sheet

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /sales-sheets  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/salesSheets.ts`


##### Save (`salesSheets.save`)

- **Purpose:** History

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /sales-sheets  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/sales/SalesSheetPreview.tsx  

- **Source:** `server/routers/salesSheets.ts`


##### Save Draft (`salesSheets.saveDraft`)

- **Purpose:** /** Save or update a draft If draftId is provided, updates existing; otherwise creates new

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /sales-sheets  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/SalesSheetCreatorPage.tsx  

- **Source:** `server/routers/salesSheets.ts`


#### Create


##### Create Template (`salesSheets.createTemplate`)

- **Purpose:** Templates

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /sales-sheets  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/salesSheets.ts`


#### Delete/Archive


##### Delete (`salesSheets.delete`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /sales-sheets  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/salesSheets.ts`


##### Delete Draft (`salesSheets.deleteDraft`)

- **Purpose:** /** Delete a draft

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /sales-sheets  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/SalesSheetCreatorPage.tsx  

- **Source:** `server/routers/salesSheets.ts`


##### Delete Template (`salesSheets.deleteTemplate`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /sales-sheets  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/salesSheets.ts`


#### View/Search


##### Load Template (`salesSheets.loadTemplate`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /sales-sheets  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/salesSheets.ts`


#### View/Search/Report


##### Get By Id (`salesSheets.getById`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /sales-sheets  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/salesSheets.ts`


##### Get Draft By Id (`salesSheets.getDraftById`)

- **Purpose:** /** Get a specific draft by ID

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /sales-sheets  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/salesSheets.ts`


##### Get Drafts (`salesSheets.getDrafts`)

- **Purpose:** /** Get all drafts for the current user Optionally filter by clientId

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /sales-sheets  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/SalesSheetCreatorPage.tsx  

- **Source:** `server/routers/salesSheets.ts`


##### Get History (`salesSheets.getHistory`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /sales-sheets  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/salesSheets.ts`


##### Get Inventory (`salesSheets.getInventory`)

- **Purpose:** Inventory with Pricing

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /sales-sheets  

- **Implementation status:** Client-wired  

- **Client references:** client/src/hooks/useRetryableQuery.ts; client/src/pages/OrderCreatorPage.tsx; client/src/pages/SalesSheetCreatorPage.tsx  

- **Source:** `server/routers/salesSheets.ts`


##### Get Templates (`salesSheets.getTemplates`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /sales-sheets  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/salesSheets.ts`


### scratchPad


#### Create


##### Create (`scratchPad.create`)

- **Purpose:** Create new note

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** notes:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/dashboard/ScratchPad.tsx  

- **Source:** `server/routers/scratchPad.ts`


#### Delete/Archive


##### Delete (`scratchPad.delete`)

- **Purpose:** Delete note

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** notes:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/dashboard/ScratchPad.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/scratchPad.ts`


#### Update


##### Toggle Complete (`scratchPad.toggleComplete`)

- **Purpose:** Toggle note completion

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** notes:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/dashboard/ScratchPad.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/scratchPad.ts`


##### Update (`scratchPad.update`)

- **Purpose:** Update note content

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** notes:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/dashboard/ScratchPad.tsx  

- **Source:** `server/routers/scratchPad.ts`


#### View/Search


##### Count (`scratchPad.count`)

- **Purpose:** Get note count

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** notes:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/scratchPad.ts`


#### View/Search/Report


##### List (`scratchPad.list`)

- **Purpose:** Get user's notes (infinite scroll)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** notes:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/dashboard/ScratchPad.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/scratchPad.ts`


### search


#### View/Search


##### Global (`search.global`)

- **Purpose:** /** Global search across quotes, customers, products, and batches BUG-042: Expanded to include product names, strains, and categories

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** clients:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /search  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/SampleManagement.tsx; client/src/pages/SearchResultsPage.tsx  

- **Source:** `server/routers/search.ts`


### spreadsheet


#### View/Search/Report


##### Get Client Grid Data (`spreadsheet.getClientGridData`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /spreadsheet-view  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/spreadsheet/ClientGrid.tsx  

- **Source:** `server/routers/spreadsheet.ts`


##### Get Inventory Grid Data (`spreadsheet.getInventoryGridData`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** inventory:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /spreadsheet-view  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/spreadsheet/InventoryGrid.tsx  

- **Source:** `server/routers/spreadsheet.ts`


### timeOffRequests


#### Action/Operation


##### Request (`timeOffRequests.request`)

- **Purpose:** Time Off Requests Router (CAL-004) Manages vacation, sick, and personal time-off requests Integrates with calendar availability to block booking slots

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/TimeOffRequestForm.tsx  

- **Source:** `server/routers/timeOffRequests.ts`


#### State Transition/Action


##### Approve (`timeOffRequests.approve`)

- **Purpose:** ============================================================================

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/TimeOffRequestsList.tsx  

- **Source:** `server/routers/timeOffRequests.ts`


##### Cancel (`timeOffRequests.cancel`)

- **Purpose:** Cancel a pending time-off request (user can cancel their own)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/TimeOffRequestsList.tsx  

- **Source:** `server/routers/timeOffRequests.ts`


##### Reject (`timeOffRequests.reject`)

- **Purpose:** ============================================================================

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/TimeOffRequestsList.tsx  

- **Source:** `server/routers/timeOffRequests.ts`


#### View/Search/Report


##### Get Approved Time Off (`timeOffRequests.getApprovedTimeOff`)

- **Purpose:** ============================================================================

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/timeOffRequests.ts`


##### Get By Id (`timeOffRequests.getById`)

- **Purpose:** ============================================================================

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/timeOffRequests.ts`


##### Get My Pending Count (`timeOffRequests.getMyPendingCount`)

- **Purpose:** Get my pending count

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/TimeOffRequestsList.tsx  

- **Source:** `server/routers/timeOffRequests.ts`


##### Get Team Pending Count (`timeOffRequests.getTeamPendingCount`)

- **Purpose:** Get team pending count (for admins)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/TimeOffRequestsList.tsx; client/src/pages/CalendarPage.tsx  

- **Source:** `server/routers/timeOffRequests.ts`


##### List (`timeOffRequests.list`)

- **Purpose:** ============================================================================

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/TimeOffRequestsList.tsx  

- **Source:** `server/routers/timeOffRequests.ts`


### unifiedSalesPortal


#### Action/Operation


##### Convert Quote To Sale (`unifiedSalesPortal.convertQuoteToSale`)

- **Purpose:** /** Convert a quote to a sale USP-004: Now uses existing ordersDb.convertQuoteToSale function which properly handles: - Quote expiration check - Inventory reduction with row-level locking - Audit log creation - All edge cases

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/UnifiedSalesPortalPage.tsx  

- **Source:** `server/routers/unifiedSalesPortal.ts`


##### Convert Sales Sheet To Quote (`unifiedSalesPortal.convertSalesSheetToQuote`)

- **Purpose:** /** Convert a sales sheet to a quote Creates a new quote order and links it to the original sales sheet USP-004: Now properly copies line items from sales sheet

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/UnifiedSalesPortalPage.tsx  

- **Source:** `server/routers/unifiedSalesPortal.ts`


##### Restore (`unifiedSalesPortal.restore`)

- **Purpose:** /** Restore a soft-deleted pipeline item

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/UnifiedSalesPortalPage.tsx  

- **Source:** `server/routers/unifiedSalesPortal.ts`


##### Soft Delete (`unifiedSalesPortal.softDelete`)

- **Purpose:** /** Soft delete a pipeline item

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/UnifiedSalesPortalPage.tsx  

- **Source:** `server/routers/unifiedSalesPortal.ts`


#### View/Search


##### Check Quote Conversion (`unifiedSalesPortal.checkQuoteConversion`)

- **Purpose:** /** Check if a quote can be converted (for confirmation dialog)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/UnifiedSalesPortalPage.tsx  

- **Source:** `server/routers/unifiedSalesPortal.ts`


#### View/Search/Report


##### Get Pipeline (`unifiedSalesPortal.getPipeline`)

- **Purpose:** /** Get unified pipeline view Combines sales sheets, quotes, and orders into a single timeline By default, excludes: - Deleted items (unless includeDeleted=true) - Terminal status items like REJECTED, EXPIRED, CANCELLED (unless includeClosed=true)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/UnifiedSalesPortalPage.tsx  

- **Source:** `server/routers/unifiedSalesPortal.ts`


##### Get Stats (`unifiedSalesPortal.getStats`)

- **Purpose:** /** Get pipeline statistics

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/UnifiedSalesPortalPage.tsx  

- **Source:** `server/routers/unifiedSalesPortal.ts`


### warehouseTransfers


#### Action/Operation


##### Transfer (`warehouseTransfers.transfer`)

- **Purpose:** Warehouse Transfers Router API endpoints for transferring inventory between warehouse locations

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/warehouseTransfers.ts`


#### View/Search/Report


##### Get Batch Locations (`warehouseTransfers.getBatchLocations`)

- **Purpose:** Get current locations for a batch

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/warehouseTransfers.ts`


##### Get Stats (`warehouseTransfers.getStats`)

- **Purpose:** Get transfer statistics

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/warehouseTransfers.ts`


##### Get Transfer History (`warehouseTransfers.getTransferHistory`)

- **Purpose:** Get transfer history for a batch

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/warehouseTransfers.ts`


## Purchasing


### purchaseOrders


#### Create


##### Add Item (`purchaseOrders.addItem`)

- **Purpose:** Add item to PO

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /purchase-orders  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/purchaseOrders.ts`


##### Create (`purchaseOrders.create`)

- **Purpose:** Supports both supplierClientId (canonical) and vendorId (deprecated, for backward compat)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /purchase-orders  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/PurchaseOrdersPage.tsx  

- **Source:** `server/routers/purchaseOrders.ts`


#### Delete/Archive


##### Delete (`purchaseOrders.delete`)

- **Purpose:** Delete purchase order

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /purchase-orders  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/PurchaseOrdersPage.tsx  

- **Source:** `server/routers/purchaseOrders.ts`


##### Delete Item (`purchaseOrders.deleteItem`)

- **Purpose:** Delete PO item

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /purchase-orders  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/purchaseOrders.ts`


#### State Transition/Action


##### Confirm (`purchaseOrders.confirm`)

- **Purpose:** Confirm PO (vendor has confirmed receipt, changes status from SENT to CONFIRMED)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /purchase-orders  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/purchaseOrders.ts`


##### Submit (`purchaseOrders.submit`)

- **Purpose:** Submit PO to vendor (changes status from DRAFT to SENT)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /purchase-orders  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/purchaseOrders.ts`


#### Update


##### Update (`purchaseOrders.update`)

- **Purpose:** Update purchase order

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /purchase-orders  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/purchaseOrders.ts`


##### Update Item (`purchaseOrders.updateItem`)

- **Purpose:** Update PO item

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /purchase-orders  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/purchaseOrders.ts`


##### Update Status (`purchaseOrders.updateStatus`)

- **Purpose:** Update PO status

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /purchase-orders  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/PurchaseOrdersPage.tsx  

- **Source:** `server/routers/purchaseOrders.ts`


#### View/Search/Report


##### Get All (`purchaseOrders.getAll`)

- **Purpose:** Supports filtering by supplierClientId (canonical) or vendorId (deprecated)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /purchase-orders  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/PurchaseOrdersPage.tsx  

- **Source:** `server/routers/purchaseOrders.ts`


##### Get By Id (`purchaseOrders.getById`)

- **Purpose:** Get purchase order by ID with items

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /purchase-orders  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/purchaseOrders.ts`


##### Get By Id With Details (`purchaseOrders.getByIdWithDetails`)

- **Purpose:** Get PO with full details including items and product info

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /purchase-orders  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/purchaseOrders.ts`


##### Get By Product (`purchaseOrders.getByProduct`)

- **Purpose:** Get PO history for a product

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /purchase-orders  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/purchaseOrders.ts`


##### Get By Supplier (`purchaseOrders.getBySupplier`)

- **Purpose:** Get PO history for a supplier (canonical)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /purchase-orders  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/clients/SupplierProfileSection.tsx  

- **Source:** `server/routers/purchaseOrders.ts`


##### Get By Vendor (`purchaseOrders.getByVendor`)

- **Purpose:** Get PO history for a vendor (DEPRECATED - use getBySupplier instead)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /purchase-orders  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/purchaseOrders.ts`


## Reporting/Analytics


### analytics


#### Action/Operation


##### Export Data (`analytics.exportData`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** analytics:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /analytics  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/AnalyticsPage.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/analytics.ts`


#### View/Search


##### Client Strain Preferences (`analytics.clientStrainPreferences`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** analytics:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /analytics  

- **Implementation status:** Client-wired  

- **Client references:** client/src/hooks/useStrainHooks.ts  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/analytics.ts`


##### Strain Family Trends (`analytics.strainFamilyTrends`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** analytics:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /analytics  

- **Implementation status:** Client-wired  

- **Client references:** client/src/hooks/useStrainHooks.ts  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/analytics.ts`


##### Top Strain Families (`analytics.topStrainFamilies`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** analytics:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /analytics  

- **Implementation status:** Client-wired  

- **Client references:** client/src/hooks/useStrainHooks.ts  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/analytics.ts`


#### View/Search/Report


##### Get Extended Summary (`analytics.getExtendedSummary`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** analytics:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /analytics  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/AnalyticsPage.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/analytics.ts`


##### Get Revenue Trends (`analytics.getRevenueTrends`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** analytics:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /analytics  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/AnalyticsPage.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/analytics.ts`


##### Get Summary (`analytics.getSummary`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** analytics:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /analytics  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/analytics.ts`


##### Get Top Clients (`analytics.getTopClients`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** analytics:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /analytics  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/AnalyticsPage.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/analytics.ts`


### dashboard


#### Action/Operation


##### Reset Layout (`dashboard.resetLayout`)

- **Purpose:** Reset user's layout to role default

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** dashboard:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /accounting/dashboard, /dashboard, /vip-portal/dashboard  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/dashboard.ts`


##### Save Kpi Config (`dashboard.saveKpiConfig`)

- **Purpose:** Save KPI configuration for a role (admin only)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** dashboard:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /accounting/dashboard, /dashboard, /vip-portal/dashboard  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/dashboard.ts`


##### Save Layout (`dashboard.saveLayout`)

- **Purpose:** Save user's widget layout

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** dashboard:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /accounting/dashboard, /dashboard, /vip-portal/dashboard  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/dashboard.ts`


##### Save Role Default (`dashboard.saveRoleDefault`)

- **Purpose:** Save role default layout (admin only)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** dashboard:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /accounting/dashboard, /dashboard, /vip-portal/dashboard  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/dashboard.ts`


#### View/Search/Report


##### Get Cash Collected (`dashboard.getCashCollected`)

- **Purpose:** Cash Collected (24 months by client)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** dashboard:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /accounting/dashboard, /dashboard, /vip-portal/dashboard  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/dashboard/widgets-v2/CashCollectedLeaderboard.tsx  

- **Source:** `server/routers/dashboard.ts`


##### Get Cash Flow (`dashboard.getCashFlow`)

- **Purpose:** Cash Flow (with time period filter)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** dashboard:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /accounting/dashboard, /dashboard, /vip-portal/dashboard  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/dashboard/widgets-v2/CashFlowWidget.tsx  

- **Source:** `server/routers/dashboard.ts`


##### Get Client Debt (`dashboard.getClientDebt`)

- **Purpose:** Client Debt (current debt + aging)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** dashboard:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /accounting/dashboard, /dashboard, /vip-portal/dashboard  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/dashboard/widgets-v2/ClientDebtLeaderboard.tsx  

- **Source:** `server/routers/dashboard.ts`


##### Get Client Profit Margin (`dashboard.getClientProfitMargin`)

- **Purpose:** Client Profit Margin

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** dashboard:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /accounting/dashboard, /dashboard, /vip-portal/dashboard  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/dashboard/widgets-v2/ClientProfitMarginLeaderboard.tsx  

- **Source:** `server/routers/dashboard.ts`


##### Get Inventory Snapshot (`dashboard.getInventorySnapshot`)

- **Purpose:** Inventory Snapshot (by category)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** dashboard:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /accounting/dashboard, /dashboard, /vip-portal/dashboard  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/dashboard/widgets-v2/InventorySnapshotWidget.tsx  

- **Source:** `server/routers/dashboard.ts`


##### Get Kpi Config (`dashboard.getKpiConfig`)

- **Purpose:** Get KPI configuration for user's role

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** dashboard:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /accounting/dashboard, /dashboard, /vip-portal/dashboard  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/dashboard.ts`


##### Get Kpis (`dashboard.getKpis`)

- **Purpose:** Success response

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** dashboard:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /accounting/dashboard, /dashboard, /vip-portal/dashboard  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/dashboard.ts`


##### Get Layout (`dashboard.getLayout`)

- **Purpose:** Get user's widget layout

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** dashboard:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /accounting/dashboard, /dashboard, /vip-portal/dashboard  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/dashboard.ts`


##### Get Role Default (`dashboard.getRoleDefault`)

- **Purpose:** Get role default layout (admin only)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** dashboard:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /accounting/dashboard, /dashboard, /vip-portal/dashboard  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/dashboard.ts`


##### Get Sales By Client (`dashboard.getSalesByClient`)

- **Purpose:** Sales by Client (with time period filter)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** dashboard:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /accounting/dashboard, /dashboard, /vip-portal/dashboard  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/dashboard/widgets-v2/SalesByClientWidget.tsx  

- **Source:** `server/routers/dashboard.ts`


##### Get Sales Comparison (`dashboard.getSalesComparison`)

- **Purpose:** Sales Time Period Comparison

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** dashboard:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /accounting/dashboard, /dashboard, /vip-portal/dashboard  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/dashboard/widgets-v2/SalesComparisonWidget.tsx  

- **Source:** `server/routers/dashboard.ts`


##### Get Total Debt (`dashboard.getTotalDebt`)

- **Purpose:** Total Debt (AR vs AP)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** dashboard:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /accounting/dashboard, /dashboard, /vip-portal/dashboard  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/dashboard/widgets-v2/TotalDebtWidget.tsx  

- **Source:** `server/routers/dashboard.ts`


##### Get Transaction Snapshot (`dashboard.getTransactionSnapshot`)

- **Purpose:** Transaction Snapshot (Today vs This Week)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** dashboard:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /accounting/dashboard, /dashboard, /vip-portal/dashboard  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/dashboard/widgets-v2/TransactionSnapshotWidget.tsx  

- **Source:** `server/routers/dashboard.ts`


### dashboardEnhanced


#### Action/Operation


##### Acknowledge Alert (`dashboardEnhanced.acknowledgeAlert`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/dashboardEnhanced.ts`


##### Generate Alerts (`dashboardEnhanced.generateAlerts`)

- **Purpose:** Inventory Alerts

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/dashboardEnhanced.ts`


##### Resolve Alert (`dashboardEnhanced.resolveAlert`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/dashboardEnhanced.ts`


#### View/Search


##### Export Data (`dashboardEnhanced.exportData`)

- **Purpose:** Export dashboard data

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/dashboardEnhanced.ts`


#### View/Search/Report


##### Get ARAging Report (`dashboardEnhanced.getARAgingReport`)

- **Purpose:** Success response type

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/dashboardEnhanced.ts`


##### Get Active Alerts (`dashboardEnhanced.getActiveAlerts`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/dashboardEnhanced.ts`


##### Get Alert Summary (`dashboardEnhanced.getAlertSummary`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/dashboardEnhanced.ts`


##### Get Dashboard Data (`dashboardEnhanced.getDashboardData`)

- **Purpose:** Success response type

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/dashboardEnhanced.ts`


##### Get Inventory Valuation (`dashboardEnhanced.getInventoryValuation`)

- **Purpose:** Success response type

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/dashboardEnhanced.ts`


##### Get Profitability Metrics (`dashboardEnhanced.getProfitabilityMetrics`)

- **Purpose:** Get profitability metrics

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/dashboardEnhanced.ts`


##### Get Sales Performance (`dashboardEnhanced.getSalesPerformance`)

- **Purpose:** Success response type

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/dashboardEnhanced.ts`


##### Get Top Clients (`dashboardEnhanced.getTopClients`)

- **Purpose:** Success response type

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/dashboardEnhanced.ts`


##### Get Top Products (`dashboardEnhanced.getTopProducts`)

- **Purpose:** Success response type

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/dashboardEnhanced.ts`


### dashboardPreferences


#### Action/Operation


##### Reset Preferences (`dashboardPreferences.resetPreferences`)

- **Purpose:** /** Reset User's Dashboard Preferences Deletes the user's saved preferences from the database. The frontend will fall back to default preferences after reset. @returns Success status

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** dashboard:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** Client-wired  

- **Client references:** client/src/contexts/DashboardPreferencesContext.tsx  

- **Source:** `server/routers/dashboardPreferences.ts`


#### Update


##### Update Preferences (`dashboardPreferences.updatePreferences`)

- **Purpose:** /** Update User's Dashboard Preferences Creates or updates the user's dashboard preferences in the database. Performs an upsert operation: updates if exists, inserts if new. @param input.activeLayout - Selected layout preset @param input.widgetConfig - Array of widget visibility/settings @returns Success status

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** dashboard:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** Client-wired  

- **Client references:** client/src/contexts/DashboardPreferencesContext.tsx  

- **Source:** `server/routers/dashboardPreferences.ts`


#### View/Search/Report


##### Get Defaults (`dashboardPreferences.getDefaults`)

- **Purpose:** /** Get Default Preferences Returns the default dashboard preferences without saving to database. Useful for preview or comparison purposes. @returns Default preferences object

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** dashboard:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/dashboardPreferences.ts`


##### Get Preferences (`dashboardPreferences.getPreferences`)

- **Purpose:** /** Get User's Dashboard Preferences Fetches the user's saved dashboard preferences from the database. Returns default preferences if no saved preferences exist. @returns UserDashboardPreferences or default preferences

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** dashboard:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Implementation status:** Client-wired  

- **Client references:** client/src/contexts/DashboardPreferencesContext.tsx  

- **Source:** `server/routers/dashboardPreferences.ts`


## Sales


### orderEnhancements


#### Action/Operation


##### Pause Recurring Order (`orderEnhancements.pauseRecurringOrder`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orderEnhancements.ts`


##### Resume Recurring Order (`orderEnhancements.resumeRecurringOrder`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orderEnhancements.ts`


#### Create


##### Create Alert Configuration (`orderEnhancements.createAlertConfiguration`)

- **Purpose:** ===== ALERT CONFIGURATION =====

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orderEnhancements.ts`


##### Create Recurring Order (`orderEnhancements.createRecurringOrder`)

- **Purpose:** ===== RECURRING ORDERS =====

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orderEnhancements.ts`


#### Delete/Archive


##### Delete Alert Configuration (`orderEnhancements.deleteAlertConfiguration`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orderEnhancements.ts`


#### State Transition/Action


##### Cancel Recurring Order (`orderEnhancements.cancelRecurringOrder`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orderEnhancements.ts`


#### Update


##### Mark Recurring Order Generated (`orderEnhancements.markRecurringOrderGenerated`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orderEnhancements.ts`


##### Reorder From Previous (`orderEnhancements.reorderFromPrevious`)

- **Purpose:** ===== REORDER FUNCTIONALITY =====

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orderEnhancements.ts`


##### Toggle Alert Configuration (`orderEnhancements.toggleAlertConfiguration`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orderEnhancements.ts`


##### Update Alert Configuration (`orderEnhancements.updateAlertConfiguration`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orderEnhancements.ts`


##### Update Client Payment Terms (`orderEnhancements.updateClientPaymentTerms`)

- **Purpose:** ===== PAYMENT TERMS =====

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orderEnhancements.ts`


##### Update Recurring Order (`orderEnhancements.updateRecurringOrder`)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orderEnhancements.ts`


#### View/Search/Report


##### Get All Active Alert Configurations (`orderEnhancements.getAllActiveAlertConfigurations`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orderEnhancements.ts`


##### Get Client Payment Terms (`orderEnhancements.getClientPaymentTerms`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orderEnhancements.ts`


##### Get Due Recurring Orders (`orderEnhancements.getDueRecurringOrders`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orderEnhancements.ts`


##### Get Frequently Bought Together (`orderEnhancements.getFrequentlyBoughtTogether`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orderEnhancements.ts`


##### Get Product Recommendations (`orderEnhancements.getProductRecommendations`)

- **Purpose:** ===== PRODUCT RECOMMENDATIONS =====

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orderEnhancements.ts`


##### Get Recent Orders For Reorder (`orderEnhancements.getRecentOrdersForReorder`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orderEnhancements.ts`


##### Get Similar Products (`orderEnhancements.getSimilarProducts`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orderEnhancements.ts`


##### Get User Alert Configurations (`orderEnhancements.getUserAlertConfigurations`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orderEnhancements.ts`


##### List All Recurring Orders (`orderEnhancements.listAllRecurringOrders`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orderEnhancements.ts`


##### List Recurring Orders For Client (`orderEnhancements.listRecurringOrdersForClient`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orderEnhancements.ts`


### orders


#### Action/Operation


##### Convert Quote To Sale (`orders.convertQuoteToSale`)

- **Purpose:** /** Convert quote to sale (full name)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/Quotes.tsx  

- **Source:** `server/routers/orders.ts`


##### Convert To Sale (`orders.convertToSale`)

- **Purpose:** /** Convert quote to sale (backward compatibility alias)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orders.ts`


##### Export (`orders.export`)

- **Purpose:** /** Export order

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orders.ts`


##### Fulfill Order (`orders.fulfillOrder`)

- **Purpose:** /** Fulfill order items with pick quantities Records picked quantities and updates inventory

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/orders/OrderFulfillment.tsx  

- **Source:** `server/routers/orders.ts`


##### Process Return (`orders.processReturn`)

- **Purpose:** /** Process return

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/orders/ProcessReturnModal.tsx  

- **Source:** `server/routers/orders.ts`


##### Restore (`orders.restore`)

- **Purpose:** /** Restore deleted order ST-013: Restore a soft-deleted order

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orders.ts`


#### Create


##### Create (`orders.create`)

- **Purpose:** /** Create order (basic version) For backward compatibility with existing code

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/orders/OrderPreview.tsx  

- **Source:** `server/routers/orders.ts`


##### Create Draft Enhanced (`orders.createDraftEnhanced`)

- **Purpose:** /** Create draft order (enhanced with COGS/margin) Preferred method for new order creation

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/OrderCreatorPage.tsx  

- **Source:** `server/routers/orders.ts`


#### Delete/Archive


##### Delete (`orders.delete`)

- **Purpose:** /** Delete order (soft delete) ST-013: Uses soft delete for data recovery

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orders.ts`


##### Delete Draft Order (`orders.deleteDraftOrder`)

- **Purpose:** /** Delete draft order

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/orders/DeleteDraftModal.tsx  

- **Source:** `server/routers/orders.ts`


#### State Transition/Action


##### Confirm Draft Order (`orders.confirmDraftOrder`)

- **Purpose:** /** Confirm draft order

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/orders/ConfirmDraftModal.tsx  

- **Source:** `server/routers/orders.ts`


##### Confirm Order (`orders.confirmOrder`)

- **Purpose:** /** Confirm a pending order Validates inventory and transitions order to confirmed state

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/orders/OrderFulfillment.tsx  

- **Source:** `server/routers/orders.ts`


##### Deliver Order (`orders.deliverOrder`)

- **Purpose:** /** Mark order as delivered Final step in fulfillment workflow

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/orders/OrderFulfillment.tsx  

- **Source:** `server/routers/orders.ts`


##### Finalize Draft (`orders.finalizeDraft`)

- **Purpose:** /** Finalize draft order

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/OrderCreatorPage.tsx  

- **Source:** `server/routers/orders.ts`


##### Ship Order (`orders.shipOrder`)

- **Purpose:** /** Ship an order Records shipping details and updates status to SHIPPED

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/orders/OrderFulfillment.tsx  

- **Source:** `server/routers/orders.ts`


#### Update


##### Update (`orders.update`)

- **Purpose:** /** Update order

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orders.ts`


##### Update Draft Enhanced (`orders.updateDraftEnhanced`)

- **Purpose:** /** Update draft order (enhanced version)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orders.ts`


##### Update Draft Order (`orders.updateDraftOrder`)

- **Purpose:** /** Update draft order (basic version)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orders.ts`


##### Update Line Item COGS (`orders.updateLineItemCOGS`)

- **Purpose:** /** Update COGS for line item Triggers COGS change service

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orders.ts`


##### Update Order Status (`orders.updateOrderStatus`)

- **Purpose:** /** Update order fulfillment status

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/orders/ShipOrderModal.tsx  

- **Source:** `server/routers/orders.ts`


#### View/Search


##### Calculate Price (`orders.calculatePrice`)

- **Purpose:** /** Calculate price from margin

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** Client-wired  

- **Client references:** client/src/hooks/orders/useMarginLookup.ts  

- **Source:** `server/routers/orders.ts`


#### View/Search/Report


##### Get All (`orders.getAll`)

- **Purpose:** /** Get all orders with filtering

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/Orders.tsx; client/src/pages/Quotes.tsx  

- **Source:** `server/routers/orders.ts`


##### Get Audit Log (`orders.getAuditLog`)

- **Purpose:** /** Get audit log for order

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orders.ts`


##### Get By Client (`orders.getByClient`)

- **Purpose:** /** Get orders by client

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orders.ts`


##### Get By Id (`orders.getById`)

- **Purpose:** /** Get order by ID

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/orders.ts`


##### Get Margin For Product (`orders.getMarginForProduct`)

- **Purpose:** /** Get margin for product Returns margin with fallback logic

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** Client-wired  

- **Client references:** client/src/hooks/orders/useMarginLookup.ts  

- **Source:** `server/routers/orders.ts`


##### Get Order Returns (`orders.getOrderReturns`)

- **Purpose:** /** Get order returns

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/orders/ReturnHistorySection.tsx  

- **Source:** `server/routers/orders.ts`


##### Get Order Status History (`orders.getOrderStatusHistory`)

- **Purpose:** /** Get order status history

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/orders/OrderStatusTimeline.tsx  

- **Source:** `server/routers/orders.ts`


##### Get Order With Line Items (`orders.getOrderWithLineItems`)

- **Purpose:** /** Get order with line items (enhanced version)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /orders, /orders/create  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/ReturnsPage.tsx  

- **Source:** `server/routers/orders.ts`


### quotes


#### Action/Operation


##### Accept (`quotes.accept`)

- **Purpose:** /** Accept a quote

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /quotes  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/quotes.ts`


##### Check Expired (`quotes.checkExpired`)

- **Purpose:** /** Check and update expired quotes

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /quotes  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/quotes.ts`


##### Convert To Order (`quotes.convertToOrder`)

- **Purpose:** /** Convert quote to order (sale) This creates a new SALE order from the quote

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /quotes  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/quotes.ts`


##### Send (`quotes.send`)

- **Purpose:** /** Update quote status to SENT

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /quotes  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/quotes.ts`


#### Create


##### Create (`quotes.create`)

- **Purpose:** /** Create a new quote

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /quotes  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/quotes.ts`


#### State Transition/Action


##### Reject (`quotes.reject`)

- **Purpose:** /** Reject a quote

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Customer Service  

- **Related UI routes:** /quotes  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/quotes.ts`


#### View/Search/Report


##### Get By Id (`quotes.getById`)

- **Purpose:** /** Get quote by ID

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /quotes  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/quotes.ts`


##### List (`quotes.list`)

- **Purpose:** /** List quotes with optional filters

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** orders:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Owner/Executive, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service, Warehouse Staff, Read-Only Auditor  

- **Related UI routes:** /quotes  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/quotes.ts`


## VIP Portal


### vipPortal


#### Action/Operation


##### Clear Draft (`vipPortal.clearDraft`)

- **Purpose:** Updated to use vipPortalProcedure for proper session verification (Task 21.2)

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Download Bill Pdf (`vipPortal.downloadBillPdf`)

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Download Invoice Pdf (`vipPortal.downloadInvoicePdf`)

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Login (`vipPortal.login`)

- **Purpose:** VIP Portal Router Client-facing endpoints for the VIP Client Portal

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Logout (`vipPortal.logout`)

- **Purpose:** Logout

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Request (`vipPortal.request`)

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Request Password Reset (`vipPortal.requestPasswordReset`)

- **Purpose:** Request password reset

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Reset Password (`vipPortal.resetPassword`)

- **Purpose:** Reset password with token

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Save (`vipPortal.save`)

- **Purpose:** Updated to use vipPortalProcedure for proper session verification (Task 21.2)

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


#### Create


##### Add To Draft (`vipPortal.addToDraft`)

- **Purpose:** Updated to use vipPortalProcedure for proper session verification (Task 21.2)

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Create (`vipPortal.create`)

- **Purpose:** Create a new price alert

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Create Need (`vipPortal.createNeed`)

- **Purpose:** Updated to use vipPortalProcedure for proper session verification (Task 21.2)

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Create Supply (`vipPortal.createSupply`)

- **Purpose:** Updated to use vipPortalProcedure for proper session verification (Task 21.2)

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


#### Delete/Archive


##### Deactivate (`vipPortal.deactivate`)

- **Purpose:** Deactivate a price alert

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Delete (`vipPortal.delete`)

- **Purpose:** Updated to use vipPortalProcedure for proper session verification (Task 21.2)

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Remove From Draft (`vipPortal.removeFromDraft`)

- **Purpose:** Updated to use vipPortalProcedure for proper session verification (Task 21.2)

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


#### State Transition/Action


##### Cancel Need (`vipPortal.cancelNeed`)

- **Purpose:** Updated to use vipPortalProcedure for proper session verification (Task 21.2)

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Cancel Supply (`vipPortal.cancelSupply`)

- **Purpose:** Updated to use vipPortalProcedure for proper session verification (Task 21.2)

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Submit Interest List (`vipPortal.submitInterestList`)

- **Purpose:** Updated to use vipPortalProcedure for proper session verification (Task 21.2)

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


#### Update


##### Mark All Read (`vipPortal.markAllRead`)

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Mark Read (`vipPortal.markRead`)

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Update Need (`vipPortal.updateNeed`)

- **Purpose:** Updated to use vipPortalProcedure for proper session verification (Task 21.2)

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Update Supply (`vipPortal.updateSupply`)

- **Purpose:** Updated to use vipPortalProcedure for proper session verification (Task 21.2)

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


#### View/Search


##### Verify Session (`vipPortal.verifySession`)

- **Purpose:** Verify session token

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


#### View/Search/Report


##### Get (`vipPortal.get`)

- **Purpose:** Get portal configuration

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Get (`vipPortal.get`)

- **Purpose:** Get catalog with filters

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Get Available Metrics (`vipPortal.getAvailableMetrics`)

- **Purpose:** Get available metrics for VIP Portal configuration

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Get Bills (`vipPortal.getBills`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Get Draft Interests (`vipPortal.getDraftInterests`)

- **Purpose:** Get draft interests

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Get Filter Options (`vipPortal.getFilterOptions`)

- **Purpose:** Get filter options

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Get History (`vipPortal.getHistory`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Get Invoices (`vipPortal.getInvoices`)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Get KPIs (`vipPortal.getKPIs`)

- **Purpose:** Get dashboard KPIs

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Get Leaderboard (`vipPortal.getLeaderboard`)

- **Purpose:** Get leaderboard data for client (enhanced with unified leaderboard services)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Get Needs (`vipPortal.getNeeds`)

- **Purpose:** Get client needs

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Get Slots (`vipPortal.getSlots`)

- **Type:** query  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### Get Supply (`vipPortal.getSupply`)

- **Purpose:** Get client supply listings

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### List (`vipPortal.list`)

- **Purpose:** List saved views

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### List (`vipPortal.list`)

- **Purpose:** Get all active price alerts for the client

- **Type:** query  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### List (`vipPortal.list`)

- **Type:** query  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### List Calendars (`vipPortal.listCalendars`)

- **Type:** query  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


##### List My Requests (`vipPortal.listMyRequests`)

- **Type:** query  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /clients/:clientId/vip-portal-config, /vip-portal, /vip-portal/auth/impersonate, /vip-portal/dashboard, /vip-portal/login, /vip-portal/session-ended  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortal.ts`


### vipPortalAdmin


#### Action/Operation


##### Apply Template (`vipPortalAdmin.applyTemplate`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** vip_portal:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### Copy Config (`vipPortalAdmin.copyConfig`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** vip_portal:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### Enable Vip Portal (`vipPortalAdmin.enableVipPortal`)

- **Purpose:** VIP Portal Admin Router (Streamlined) Admin-facing endpoints for managing VIP client portals Refactored to use service layer for better maintainability

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** vip_portal:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### End Session (`vipPortalAdmin.endSession`)

- **Purpose:** End an impersonation session

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** admin:impersonate (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### Exchange Token (`vipPortalAdmin.exchangeToken`)

- **Purpose:** Exchange one-time token for session token (public endpoint for impersonation page)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### Impersonate (`vipPortalAdmin.impersonate`)

- **Purpose:** VIP Portal Admin Router (Streamlined) Admin-facing endpoints for managing VIP client portals Refactored to use service layer for better maintainability

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** vip_portal:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### Log Action (`vipPortalAdmin.logAction`)

- **Purpose:** Log an action during impersonation

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** admin:impersonate (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### Revoke Session (`vipPortalAdmin.revokeSession`)

- **Purpose:** Revoke an impersonation session (super-admin action)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** admin:impersonate (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### Save Configuration (`vipPortalAdmin.saveConfiguration`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** vip_portal:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/vipPortalAdmin.ts`


#### Create


##### Add To Draft Order (`vipPortalAdmin.addToDraftOrder`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** vip_portal:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### Add To New Order (`vipPortalAdmin.addToNewOrder`)

- **Purpose:** These would need additional service methods or separate order service integration

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** vip_portal:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### Create Impersonation Session (`vipPortalAdmin.createImpersonationSession`)

- **Purpose:** Create a new audited impersonation session

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** admin:impersonate (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortalAdmin.ts`


#### Delete/Archive


##### Deactivate (`vipPortalAdmin.deactivate`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** vip_portal:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### Disable Vip Portal (`vipPortalAdmin.disableVipPortal`)

- **Purpose:** VIP Portal Admin Router (Streamlined) Admin-facing endpoints for managing VIP client portals Refactored to use service layer for better maintainability

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** vip_portal:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/vipPortalAdmin.ts`


#### Update


##### Update (`vipPortalAdmin.update`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** vip_portal:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### Update Config (`vipPortalAdmin.updateConfig`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** vip_portal:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### Update Config (`vipPortalAdmin.updateConfig`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** vip_portal:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### Update Status (`vipPortalAdmin.updateStatus`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** vip_portal:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/vipPortalAdmin.ts`


#### View/Search/Report


##### Get (`vipPortalAdmin.get`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** vip_portal:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### Get Active Sessions (`vipPortalAdmin.getActiveSessions`)

- **Purpose:** Get active impersonation sessions

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** admin:impersonate (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### Get By Client (`vipPortalAdmin.getByClient`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** vip_portal:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### Get By Client (`vipPortalAdmin.getByClient`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** vip_portal:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### Get By Id (`vipPortalAdmin.getById`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** vip_portal:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### Get Config (`vipPortalAdmin.getConfig`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** vip_portal:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### Get Config (`vipPortalAdmin.getConfig`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** vip_portal:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### Get Configuration (`vipPortalAdmin.getConfiguration`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** vip_portal:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### Get Last Login (`vipPortalAdmin.getLastLogin`)

- **Purpose:** VIP Portal Admin Router (Streamlined) Admin-facing endpoints for managing VIP client portals Refactored to use service layer for better maintainability

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** vip_portal:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### Get Session Actions (`vipPortalAdmin.getSessionActions`)

- **Purpose:** Get actions for a specific session

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** admin:impersonate (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### Get Session History (`vipPortalAdmin.getSessionHistory`)

- **Purpose:** Get session history for audit

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** admin:impersonate (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### List (`vipPortalAdmin.list`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** vip_portal:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/vipPortalAdmin.ts`


##### List Vip Clients (`vipPortalAdmin.listVipClients`)

- **Purpose:** VIP Portal Admin Router (Streamlined) Admin-facing endpoints for managing VIP client portals Refactored to use service layer for better maintainability

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** vip_portal:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/vipPortalAdmin.ts`


### vipPortalLiveShopping


#### Action/Operation


##### Join Session (`vipPortalLiveShopping.joinSession`)

- **Purpose:** /** Client joins a session via Room Code Validates that the logged-in client is the intended participant.

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortalLiveShopping.ts`


##### Request Checkout (`vipPortalLiveShopping.requestCheckout`)

- **Purpose:** /** Request Checkout Signals to the Host that the client is done and ready to convert to order.

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/vip-portal/LiveShoppingSession.tsx  

- **Source:** `server/routers/vipPortalLiveShopping.ts`


#### Create


##### Add Item With Status (`vipPortalLiveShopping.addItemWithStatus`)

- **Purpose:** /** Customer adds item directly with a specific status

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortalLiveShopping.ts`


##### Add To Cart (`vipPortalLiveShopping.addToCart`)

- **Purpose:** /** Add Item to Cart (Client Role)

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortalLiveShopping.ts`


#### Delete/Archive


##### Remove Item (`vipPortalLiveShopping.removeItem`)

- **Purpose:** /** Remove Item from Cart

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/vip-portal/LiveShoppingSession.tsx  

- **Source:** `server/routers/vipPortalLiveShopping.ts`


#### Update


##### Update Item Status (`vipPortalLiveShopping.updateItemStatus`)

- **Purpose:** /** Customer updates item status (Sample Request, Interested, To Purchase)

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/vip-portal/LiveShoppingSession.tsx  

- **Source:** `server/routers/vipPortalLiveShopping.ts`


##### Update Quantity (`vipPortalLiveShopping.updateQuantity`)

- **Purpose:** /** Update Item Quantity

- **Type:** mutation  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortalLiveShopping.ts`


#### View/Search/Report


##### Get Batch Details (`vipPortalLiveShopping.getBatchDetails`)

- **Purpose:** /** Get details of a specific batch (used when Host highlights an item) Requires sessionId to verify the client has access to this session

- **Type:** query  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/vipPortalLiveShopping.ts`


##### Get My Items By Status (`vipPortalLiveShopping.getMyItemsByStatus`)

- **Purpose:** /** Get customer's items grouped by status

- **Type:** query  

- **Auth wrapper:** vipPortalProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/vip-portal/LiveShoppingSession.tsx  

- **Source:** `server/routers/vipPortalLiveShopping.ts`


## Workflow/Productivity


### calendar


#### Delete/Archive


##### Delete Event (`calendar.deleteEvent`)

- **Purpose:** Delete event with cascade handling

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /calendar  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendar.ts`


#### Update


##### Update Event (`calendar.updateEvent`)

- **Purpose:** Update event with conflict detection and optimistic locking (CHAOS-006)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /calendar  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/EventFormDialog.tsx  

- **Source:** `server/routers/calendar.ts`


#### View/Search/Report


##### Get Event Attachments (`calendar.getEventAttachments`)

- **Purpose:** Get event attachments

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /calendar  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendar.ts`


##### Get Event By Id (`calendar.getEventById`)

- **Purpose:** Get single event with full details

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /calendar  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/EventFormDialog.tsx  

- **Source:** `server/routers/calendar.ts`


##### Get Event History (`calendar.getEventHistory`)

- **Purpose:** Get event history

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /calendar  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendar.ts`


##### Get Events (`calendar.getEvents`)

- **Purpose:** Calendar Router Core event operations for Calendar & Scheduling Module Version 2.0 - Post-Adversarial QA PRODUCTION-READY - No placeholders

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /calendar  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/CalendarPage.tsx  

- **Source:** `server/routers/calendar.ts`


##### Get Events By Client (`calendar.getEventsByClient`)

- **Purpose:** Get events by client ID

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /calendar  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/clients/ClientCalendarTab.tsx  

- **Source:** `server/routers/calendar.ts`


##### Get Events By Entity (`calendar.getEventsByEntity`)

- **Purpose:** Get events by entity (for linking)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Related UI routes:** /calendar  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendar.ts`


##### Get My Events (`calendar.getMyEvents`)

- **Purpose:** Get events assigned to user

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Related UI routes:** /calendar  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendar.ts`


### calendarFinancials


#### Create


##### Create Payment Due Reminder (`calendarFinancials.createPaymentDueReminder`)

- **Purpose:** Create payment due reminder

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarFinancials.ts`


#### Update


##### Set Sales Sheet Reminder (`calendarFinancials.setSalesSheetReminder`)

- **Purpose:** Set custom reminder for sales sheet

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarFinancials.ts`


#### View/Search/Report


##### Get APARSummary (`calendarFinancials.getAPARSummary`)

- **Purpose:** Get AP/AR summary for date range

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarFinancials.ts`


##### Get Collections Queue (`calendarFinancials.getCollectionsQueue`)

- **Purpose:** Get collections queue (prioritized list)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarFinancials.ts`


##### Get Meeting Financial Context (`calendarFinancials.getMeetingFinancialContext`)

- **Purpose:** Calendar Financials Router Financial context for AP/AR meeting preparation (V2.1 Addition) Version 2.0 - Post-Adversarial QA PRODUCTION-READY - No placeholders

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarFinancials.ts`


##### Get Overdue Payments (`calendarFinancials.getOverduePayments`)

- **Purpose:** Get overdue payment events

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarFinancials.ts`


##### Get Upcoming Sales Sheet Reminders (`calendarFinancials.getUpcomingSalesSheetReminders`)

- **Purpose:** Get upcoming sales sheet reminders

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarFinancials.ts`


### calendarInvitations


#### Action/Operation


##### Admin Override Invitation (`calendarInvitations.adminOverrideInvitation`)

- **Purpose:** /** Admin override invitation status

- **Type:** mutation  

- **Auth wrapper:** adminProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarInvitations.ts`


##### Bulk Send Invitations (`calendarInvitations.bulkSendInvitations`)

- **Purpose:** /** Bulk send invitations

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/EventInvitationDialog.tsx  

- **Source:** `server/routers/calendarInvitations.ts`


##### Respond To Invitation (`calendarInvitations.respondToInvitation`)

- **Purpose:** /** Respond to invitation (accept or decline)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/PendingInvitationsWidget.tsx  

- **Source:** `server/routers/calendarInvitations.ts`


##### Send Invitation (`calendarInvitations.sendInvitation`)

- **Purpose:** /** Send invitation (changes status from DRAFT to PENDING or AUTO_ACCEPTED)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarInvitations.ts`


#### Create


##### Create Invitation (`calendarInvitations.createInvitation`)

- **Purpose:** /** Create a draft invitation

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarInvitations.ts`


#### State Transition/Action


##### Cancel Invitation (`calendarInvitations.cancelInvitation`)

- **Purpose:** /** Cancel invitation

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarInvitations.ts`


#### Update


##### Update Invitation Settings (`calendarInvitations.updateInvitationSettings`)

- **Purpose:** /** Update user's invitation settings

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/InvitationSettingsDialog.tsx  

- **Source:** `server/routers/calendarInvitations.ts`


#### View/Search/Report


##### Get Invitation History (`calendarInvitations.getInvitationHistory`)

- **Purpose:** /** Get invitation history

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarInvitations.ts`


##### Get Invitation Settings (`calendarInvitations.getInvitationSettings`)

- **Purpose:** /** Get user's invitation settings

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/InvitationSettingsDialog.tsx  

- **Source:** `server/routers/calendarInvitations.ts`


##### Get Invitations By Event (`calendarInvitations.getInvitationsByEvent`)

- **Purpose:** /** Get all invitations for an event

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/EventInvitationDialog.tsx  

- **Source:** `server/routers/calendarInvitations.ts`


##### Get Pending Invitations (`calendarInvitations.getPendingInvitations`)

- **Purpose:** /** Get user's pending invitations

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/PendingInvitationsWidget.tsx  

- **Source:** `server/routers/calendarInvitations.ts`


### calendarMeetings


#### State Transition/Action


##### Complete Action Item (`calendarMeetings.completeActionItem`)

- **Purpose:** Mark action item as complete

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarMeetings.ts`


##### Confirm Meeting (`calendarMeetings.confirmMeeting`)

- **Purpose:** Confirm meeting and create history entry

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarMeetings.ts`


#### Update


##### Update Meeting History (`calendarMeetings.updateMeetingHistory`)

- **Purpose:** Update meeting history entry

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarMeetings.ts`


#### View/Search/Report


##### Get Meeting History (`calendarMeetings.getMeetingHistory`)

- **Purpose:** Get meeting history for client

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarMeetings.ts`


##### Get Unconfirmed Meetings (`calendarMeetings.getUnconfirmedMeetings`)

- **Purpose:** Determine meeting type from event context and participants

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarMeetings.ts`


##### Get Upcoming Client Meetings (`calendarMeetings.getUpcomingClientMeetings`)

- **Purpose:** Get upcoming client meetings

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarMeetings.ts`


### calendarParticipants


#### Create


##### Add Participant (`calendarParticipants.addParticipant`)

- **Purpose:** Calendar Participants Router Participant management for calendar events Version 2.1 - QUAL-002 Validation Improvements PRODUCTION-READY - No placeholders

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarParticipants.ts`


##### Add Participants (`calendarParticipants.addParticipants`)

- **Purpose:** Bulk add participants

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarParticipants.ts`


#### Delete/Archive


##### Remove Participant (`calendarParticipants.removeParticipant`)

- **Purpose:** Remove participant from event

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarParticipants.ts`


#### Update


##### Update Response (`calendarParticipants.updateResponse`)

- **Purpose:** Update participant response (RSVP)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarParticipants.ts`


#### View/Search/Report


##### Get Participants (`calendarParticipants.getParticipants`)

- **Purpose:** Calendar Participants Router Participant management for calendar events Version 2.1 - QUAL-002 Validation Improvements PRODUCTION-READY - No placeholders

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarParticipants.ts`


### calendarRecurrence


#### Action/Operation


##### Modify Instance (`calendarRecurrence.modifyInstance`)

- **Purpose:** Modify a specific instance

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarRecurrence.ts`


##### Regenerate All Instances (`calendarRecurrence.regenerateAllInstances`)

- **Purpose:** Regenerate all instances (admin/background job)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** calendar:admin (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/calendarRecurrence.ts`


##### Regenerate Instances (`calendarRecurrence.regenerateInstances`)

- **Purpose:** Regenerate instances (admin/background job)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarRecurrence.ts`


#### Delete/Archive


##### Delete Recurrence Rule (`calendarRecurrence.deleteRecurrenceRule`)

- **Purpose:** Delete recurrence rule (convert to single event)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarRecurrence.ts`


#### State Transition/Action


##### Cancel Instance (`calendarRecurrence.cancelInstance`)

- **Purpose:** Cancel a specific instance

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarRecurrence.ts`


#### Update


##### Update Recurrence Rule (`calendarRecurrence.updateRecurrenceRule`)

- **Purpose:** Update recurrence rule

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarRecurrence.ts`


#### View/Search/Report


##### Get Instances (`calendarRecurrence.getInstances`)

- **Purpose:** Calendar Recurrence Router Recurrence pattern management and instance generation Version 2.1 - QUAL-002 Validation Improvements PRODUCTION-READY - No placeholders

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarRecurrence.ts`


##### Get Recurrence Rule (`calendarRecurrence.getRecurrenceRule`)

- **Purpose:** Calendar Recurrence Router Recurrence pattern management and instance generation Version 2.1 - QUAL-002 Validation Improvements PRODUCTION-READY - No placeholders

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarRecurrence.ts`


### calendarReminders


#### Create


##### Create Reminder (`calendarReminders.createReminder`)

- **Purpose:** Calendar Reminders Router Reminder management for calendar events Version 2.1 - QUAL-002 Validation Improvements PRODUCTION-READY - No placeholders

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarReminders.ts`


#### Delete/Archive


##### Delete Reminder (`calendarReminders.deleteReminder`)

- **Purpose:** Delete reminder

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarReminders.ts`


#### Update


##### Mark Failed (`calendarReminders.markFailed`)

- **Purpose:** Mark reminder as failed (for background job)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarReminders.ts`


##### Mark Sent (`calendarReminders.markSent`)

- **Purpose:** Mark reminder as sent (for background job)

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarReminders.ts`


#### View/Search/Report


##### Get My Upcoming Reminders (`calendarReminders.getMyUpcomingReminders`)

- **Purpose:** Get user's upcoming reminders

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarReminders.ts`


##### Get Pending Reminders (`calendarReminders.getPendingReminders`)

- **Purpose:** Get pending reminders (for background job)

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarReminders.ts`


##### Get Reminders (`calendarReminders.getReminders`)

- **Purpose:** Calendar Reminders Router Reminder management for calendar events Version 2.1 - QUAL-002 Validation Improvements PRODUCTION-READY - No placeholders

- **Type:** query  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarReminders.ts`


### calendarViews


#### Create


##### Create View (`calendarViews.createView`)

- **Purpose:** Calendar Views Router User-specific calendar view configurations Version 2.0 - Post-Adversarial QA PRODUCTION-READY - No placeholders

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarViews.ts`


#### Delete/Archive


##### Delete View (`calendarViews.deleteView`)

- **Purpose:** Delete calendar view

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarViews.ts`


#### Update


##### Set As Default (`calendarViews.setAsDefault`)

- **Purpose:** Set view as default

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarViews.ts`


##### Update View (`calendarViews.updateView`)

- **Purpose:** Update calendar view

- **Type:** mutation  

- **Auth wrapper:** publicProcedure  

- **Roles (inferred from RBAC seeds):** Public (no auth)  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarViews.ts`


#### View/Search/Report


##### Get Default View (`calendarViews.getDefaultView`)

- **Purpose:** Calendar Views Router User-specific calendar view configurations Version 2.0 - Post-Adversarial QA PRODUCTION-READY - No placeholders

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/CalendarPage.tsx  

- **Source:** `server/routers/calendarViews.ts`


##### Get Views (`calendarViews.getViews`)

- **Purpose:** Calendar Views Router User-specific calendar view configurations Version 2.0 - Post-Adversarial QA PRODUCTION-READY - No placeholders

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarViews.ts`


### calendarsAccess


#### Create


##### Add User (`calendarsAccess.addUser`)

- **Purpose:** Calendars Access Router CAL-001: User access and permissions management Extracted from calendarsManagement.ts for better maintainability

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendars/calendarsAccess.ts`


#### Delete/Archive


##### Remove User (`calendarsAccess.removeUser`)

- **Purpose:** Remove user access from a calendar

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendars/calendarsAccess.ts`


#### View/Search/Report


##### List Users (`calendarsAccess.listUsers`)

- **Purpose:** Calendars Access Router CAL-001: User access and permissions management Extracted from calendarsManagement.ts for better maintainability

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendars/calendarsAccess.ts`


### calendarsAppointments


#### Create


##### Create Appointment Type (`calendarsAppointments.createAppointmentType`)

- **Purpose:** Calendars Appointments Router CAL-002: Appointment type management Extracted from calendarsManagement.ts for better maintainability

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendars/calendarsAppointments.ts`


#### Delete/Archive


##### Delete Appointment Type (`calendarsAppointments.deleteAppointmentType`)

- **Purpose:** Delete an appointment type

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendars/calendarsAppointments.ts`


#### Update


##### Update Appointment Type (`calendarsAppointments.updateAppointmentType`)

- **Purpose:** Update an appointment type

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendars/calendarsAppointments.ts`


#### View/Search/Report


##### List Appointment Types (`calendarsAppointments.listAppointmentTypes`)

- **Purpose:** Calendars Appointments Router CAL-002: Appointment type management Extracted from calendarsManagement.ts for better maintainability

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendars/calendarsAppointments.ts`


### calendarsAvailability


#### Create


##### Add Blocked Date (`calendarsAvailability.addBlockedDate`)

- **Purpose:** Add a blocked date

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendars/calendarsAvailability.ts`


#### Delete/Archive


##### Remove Blocked Date (`calendarsAvailability.removeBlockedDate`)

- **Purpose:** Remove a blocked date

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendars/calendarsAvailability.ts`


#### Update


##### Set Availability (`calendarsAvailability.setAvailability`)

- **Purpose:** Calendars Availability Router CAL-002: Availability, blocked dates, and slot management Extracted from calendarsManagement.ts for better maintainability

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendars/calendarsAvailability.ts`


#### View/Search/Report


##### Get Slots (`calendarsAvailability.getSlots`)

- **Purpose:** Get available slots for booking (CAL-002)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendars/calendarsAvailability.ts`


##### List Availability (`calendarsAvailability.listAvailability`)

- **Purpose:** Calendars Availability Router CAL-002: Availability, blocked dates, and slot management Extracted from calendarsManagement.ts for better maintainability

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendars/calendarsAvailability.ts`


##### List Blocked Dates (`calendarsAvailability.listBlockedDates`)

- **Purpose:** List blocked dates

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendars/calendarsAvailability.ts`


### calendarsCore


#### Action/Operation


##### Restore (`calendarsCore.restore`)

- **Purpose:** Restore an archived calendar

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendars/calendarsCore.ts`


#### Create


##### Create (`calendarsCore.create`)

- **Purpose:** Create a new calendar

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendars/calendarsCore.ts`


#### Delete/Archive


##### Archive (`calendarsCore.archive`)

- **Purpose:** Archive a calendar

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendars/calendarsCore.ts`


#### Update


##### Update (`calendarsCore.update`)

- **Purpose:** Update a calendar

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendars/calendarsCore.ts`


#### View/Search/Report


##### Get By Id (`calendarsCore.getById`)

- **Purpose:** Calendars Core Router CAL-001: Calendar CRUD operations Extracted from calendarsManagement.ts for better maintainability

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendars/calendarsCore.ts`


##### List (`calendarsCore.list`)

- **Purpose:** Calendars Core Router CAL-001: Calendar CRUD operations Extracted from calendarsManagement.ts for better maintainability

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendars/calendarsCore.ts`


### calendarsManagement


#### Action/Operation


##### Restore (`calendarsManagement.restore`)

- **Purpose:** Restore an archived calendar

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/settings/CalendarGeneralSettings.tsx  

- **Source:** `server/routers/calendarsManagement.ts`


#### Create


##### Add Blocked Date (`calendarsManagement.addBlockedDate`)

- **Purpose:** Add a blocked date

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/settings/CalendarAvailabilitySettings.tsx  

- **Source:** `server/routers/calendarsManagement.ts`


##### Add User (`calendarsManagement.addUser`)

- **Purpose:** Add user access to a calendar

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarsManagement.ts`


##### Create (`calendarsManagement.create`)

- **Purpose:** Create a new calendar (admin only)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/settings/CalendarGeneralSettings.tsx  

- **Source:** `server/routers/calendarsManagement.ts`


##### Create Appointment Type (`calendarsManagement.createAppointmentType`)

- **Purpose:** Create an appointment type

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/settings/CalendarAppointmentTypes.tsx  

- **Source:** `server/routers/calendarsManagement.ts`


#### Delete/Archive


##### Archive (`calendarsManagement.archive`)

- **Purpose:** Archive a calendar (soft delete)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/settings/CalendarGeneralSettings.tsx  

- **Source:** `server/routers/calendarsManagement.ts`


##### Delete Appointment Type (`calendarsManagement.deleteAppointmentType`)

- **Purpose:** Delete an appointment type

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/settings/CalendarAppointmentTypes.tsx  

- **Source:** `server/routers/calendarsManagement.ts`


##### Remove Blocked Date (`calendarsManagement.removeBlockedDate`)

- **Purpose:** Remove a blocked date

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/settings/CalendarAvailabilitySettings.tsx  

- **Source:** `server/routers/calendarsManagement.ts`


##### Remove User (`calendarsManagement.removeUser`)

- **Purpose:** Remove user access from a calendar

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarsManagement.ts`


#### Update


##### Set Availability (`calendarsManagement.setAvailability`)

- **Purpose:** Set availability for a calendar (replaces all rules for a day)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/settings/CalendarAvailabilitySettings.tsx  

- **Source:** `server/routers/calendarsManagement.ts`


##### Update (`calendarsManagement.update`)

- **Purpose:** Update a calendar

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/settings/CalendarGeneralSettings.tsx  

- **Source:** `server/routers/calendarsManagement.ts`


##### Update Appointment Type (`calendarsManagement.updateAppointmentType`)

- **Purpose:** Update an appointment type

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/settings/CalendarAppointmentTypes.tsx  

- **Source:** `server/routers/calendarsManagement.ts`


#### View/Search/Report


##### Get By Id (`calendarsManagement.getById`)

- **Purpose:** Calendars Management Router CAL-001: Multi-Calendar Architecture CAL-002: Availability & Booking Foundation Production-ready implementation

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarsManagement.ts`


##### Get Slots (`calendarsManagement.getSlots`)

- **Purpose:** ============================================================================

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarsManagement.ts`


##### List (`calendarsManagement.list`)

- **Purpose:** Calendars Management Router CAL-001: Multi-Calendar Architecture CAL-002: Availability & Booking Foundation Production-ready implementation

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/CalendarFilters.tsx; client/src/components/calendar/EventFormDialog.tsx; client/src/components/calendar/settings/CalendarAppointmentTypes.tsx; client/src/components/calendar/settings/CalendarAvailabilitySettings.tsx; client/src/components/calendar/settings/CalendarGeneralSettings.tsx  

- **Source:** `server/routers/calendarsManagement.ts`


##### List Appointment Types (`calendarsManagement.listAppointmentTypes`)

- **Purpose:** List appointment types for a calendar

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/settings/CalendarAppointmentTypes.tsx  

- **Source:** `server/routers/calendarsManagement.ts`


##### List Availability (`calendarsManagement.listAvailability`)

- **Purpose:** List availability rules for a calendar

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/settings/CalendarAvailabilitySettings.tsx  

- **Source:** `server/routers/calendarsManagement.ts`


##### List Blocked Dates (`calendarsManagement.listBlockedDates`)

- **Purpose:** List blocked dates for a calendar

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/calendar/settings/CalendarAvailabilitySettings.tsx  

- **Source:** `server/routers/calendarsManagement.ts`


##### List Users (`calendarsManagement.listUsers`)

- **Purpose:** List users with access to a calendar

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Roles (inferred from RBAC seeds):** Authenticated user  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/calendarsManagement.ts`


### freeformNotes


#### Action/Operation


##### Resolve (`freeformNotes.resolve`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** notes:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/freeformNotes.ts`


##### Share (`freeformNotes.share`)

- **Purpose:** Share note

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** notes:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/freeformNotes.ts`


#### Create


##### Add (`freeformNotes.add`)

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** notes:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/freeformNotes.ts`


##### Create (`freeformNotes.create`)

- **Purpose:** Create new note

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** notes:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/dashboard/widgets-v2/FreeformNoteWidget.tsx  

- **Source:** `server/routers/freeformNotes.ts`


#### Delete/Archive


##### Delete (`freeformNotes.delete`)

- **Purpose:** Delete note

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** notes:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/freeformNotes.ts`


#### Update


##### Toggle Archive (`freeformNotes.toggleArchive`)

- **Purpose:** Toggle archive

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** notes:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/freeformNotes.ts`


##### Toggle Pin (`freeformNotes.togglePin`)

- **Purpose:** Toggle pin

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** notes:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/freeformNotes.ts`


##### Update (`freeformNotes.update`)

- **Purpose:** Update note

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** notes:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/dashboard/widgets-v2/FreeformNoteWidget.tsx  

- **Source:** `server/routers/freeformNotes.ts`


##### Update Last Viewed (`freeformNotes.updateLastViewed`)

- **Purpose:** Update last viewed

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** notes:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin, Operations Manager, Sales Manager, Accountant, Inventory Manager, Buyer/Procurement, Customer Service  

- **Implementation status:** API-only / Unreferenced in client  

- **Source:** `server/routers/freeformNotes.ts`


#### View/Search/Report


##### Get By Id (`freeformNotes.getById`)

- **Purpose:** Get single note by ID

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** notes:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/dashboard/widgets-v2/FreeformNoteWidget.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/freeformNotes.ts`


##### Get By Tag (`freeformNotes.getByTag`)

- **Purpose:** Get notes by tag

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** notes:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/freeformNotes.ts`


##### Get By Template (`freeformNotes.getByTemplate`)

- **Purpose:** Get notes by template

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** notes:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/freeformNotes.ts`


##### List (`freeformNotes.list`)

- **Purpose:** Get all notes for user

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** notes:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/freeformNotes.ts`


##### List (`freeformNotes.list`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** notes:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/freeformNotes.ts`


##### List (`freeformNotes.list`)

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** notes:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/freeformNotes.ts`


##### Search (`freeformNotes.search`)

- **Purpose:** Search notes

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** notes:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/freeformNotes.ts`


### todoActivity


#### View/Search/Report


##### Get My Recent Activity (`todoActivity.getMyRecentActivity`)

- **Purpose:** Todo Activity Router API endpoints for task activity and audit trail

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoActivity.ts`


##### Get Task Activity (`todoActivity.getTaskActivity`)

- **Purpose:** Todo Activity Router API endpoints for task activity and audit trail

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/todos/TaskDetailModal.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoActivity.ts`


### todoLists


#### Create


##### Add Member (`todoLists.addMember`)

- **Purpose:** Add a member to a list

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/todos/ShareListModal.tsx; client/src/components/todos/TodoListForm.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoLists.ts`


##### Create (`todoLists.create`)

- **Purpose:** Todo Lists Router API endpoints for todo list management

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/todos/TodoListForm.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoLists.ts`


#### Delete/Archive


##### Delete (`todoLists.delete`)

- **Purpose:** Delete a list

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/TodoListDetailPage.tsx; client/src/pages/TodoListsPage.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoLists.ts`


##### Remove Member (`todoLists.removeMember`)

- **Purpose:** Remove a member from a list

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/todos/ShareListModal.tsx; client/src/components/todos/TodoListForm.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoLists.ts`


#### Update


##### Update (`todoLists.update`)

- **Purpose:** Todo Lists Router API endpoints for todo list management

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/todos/TodoListForm.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoLists.ts`


##### Update Member Role (`todoLists.updateMemberRole`)

- **Purpose:** Update member role

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/todos/ShareListModal.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoLists.ts`


#### View/Search/Report


##### Get By Id (`todoLists.getById`)

- **Purpose:** Todo Lists Router API endpoints for todo list management

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/TodoListDetailPage.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoLists.ts`


##### Get Members (`todoLists.getMembers`)

- **Purpose:** BUG-034: Standardized pagination response

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/todos/ShareListModal.tsx; client/src/components/todos/TodoListForm.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoLists.ts`


##### Get My Lists (`todoLists.getMyLists`)

- **Purpose:** Todo Lists Router API endpoints for todo list management

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/todos/QuickAddTaskModal.tsx; client/src/pages/TodoListsPage.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoLists.ts`


##### Get My Role (`todoLists.getMyRole`)

- **Purpose:** Get user's role in a list

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoLists.ts`


### todoTasks


#### Action/Operation


##### Uncomplete (`todoTasks.uncomplete`)

- **Purpose:** Mark task as incomplete

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/todos/TaskDetailModal.tsx; client/src/pages/TodoListDetailPage.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoTasks.ts`


#### Create


##### Create (`todoTasks.create`)

- **Purpose:** Create a new task

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:create (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/todos/QuickAddTaskModal.tsx; client/src/components/todos/TaskForm.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoTasks.ts`


#### Delete/Archive


##### Delete (`todoTasks.delete`)

- **Purpose:** Delete a task

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:delete (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/TodoListDetailPage.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoTasks.ts`


#### Link/Associate


##### Assign (`todoTasks.assign`)

- **Purpose:** Assign task to a user

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoTasks.ts`


#### State Transition/Action


##### Complete (`todoTasks.complete`)

- **Purpose:** Mark task as completed

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/todos/TaskDetailModal.tsx; client/src/pages/TodoListDetailPage.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoTasks.ts`


#### Update


##### Reorder (`todoTasks.reorder`)

- **Purpose:** Reorder tasks in a list

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoTasks.ts`


##### Update (`todoTasks.update`)

- **Purpose:** Update a task

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/todos/TaskForm.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoTasks.ts`


#### View/Search/Report


##### Get By Id (`todoTasks.getById`)

- **Purpose:** Get a specific task by ID

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/components/todos/TaskDetailModal.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoTasks.ts`


##### Get Due Soon (`todoTasks.getDueSoon`)

- **Purpose:** BUG-034: Standardized pagination response

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoTasks.ts`


##### Get List Stats (`todoTasks.getListStats`)

- **Purpose:** Get task statistics for a list

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/TodoListDetailPage.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoTasks.ts`


##### Get List Tasks (`todoTasks.getListTasks`)

- **Purpose:** Todo Tasks Router API endpoints for task management within lists PERF-003: Added pagination support

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** Client-wired  

- **Client references:** client/src/pages/TodoListDetailPage.tsx  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoTasks.ts`


##### Get My Tasks (`todoTasks.getMyTasks`)

- **Purpose:** Todo Tasks Router API endpoints for task management within lists PERF-003: Added pagination support

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoTasks.ts`


##### Get Overdue (`todoTasks.getOverdue`)

- **Purpose:** BUG-034: Standardized pagination response

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** todos:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/todoTasks.ts`


### workflow-queue


#### Create


##### Add Batches To Queue (`workflow-queue.addBatchesToQueue`)

- **Purpose:** /** Add multiple batches to workflow queue Permission: workflow:update

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** workflow:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /workflow-queue  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/workflow-queue.ts`


##### Create Status (`workflow-queue.createStatus`)

- **Purpose:** /** Create a new workflow status Permission: workflow:manage

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** workflow:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /workflow-queue  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/workflow-queue.ts`


#### Delete/Archive


##### Delete Status (`workflow-queue.deleteStatus`)

- **Purpose:** /** Delete (soft delete) a workflow status Permission: workflow:manage

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** workflow:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /workflow-queue  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/workflow-queue.ts`


#### Update


##### Reorder Statuses (`workflow-queue.reorderStatuses`)

- **Purpose:** /** Reorder workflow statuses Permission: workflow:manage

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** workflow:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /workflow-queue  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/workflow-queue.ts`


##### Update Batch Status (`workflow-queue.updateBatchStatus`)

- **Purpose:** /** Update a batch's workflow status Permission: workflow:update

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** workflow:update (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /workflow-queue  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/workflow-queue.ts`


##### Update Status (`workflow-queue.updateStatus`)

- **Purpose:** /** Update an existing workflow status Permission: workflow:manage

- **Type:** mutation  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** workflow:manage (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /workflow-queue  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/workflow-queue.ts`


#### View/Search/Report


##### Get Batch History (`workflow-queue.getBatchHistory`)

- **Purpose:** /** Get status change history for a specific batch Permission: workflow:read

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** workflow:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /workflow-queue  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/workflow-queue.ts`


##### Get Batches By Status (`workflow-queue.getBatchesByStatus`)

- **Purpose:** /** Get batches for a specific workflow status Permission: workflow:read

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** workflow:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /workflow-queue  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/workflow-queue.ts`


##### Get Batches Not In Queue (`workflow-queue.getBatchesNotInQueue`)

- **Purpose:** /** Get batches not in workflow queue (statusId is null) Permission: workflow:read

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** workflow:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /workflow-queue  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/workflow-queue.ts`


##### Get Queues (`workflow-queue.getQueues`)

- **Purpose:** /** Get all batches grouped by workflow status Permission: workflow:read

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** workflow:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /workflow-queue  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/workflow-queue.ts`


##### Get Recent Changes (`workflow-queue.getRecentChanges`)

- **Purpose:** /** Get recent status changes across all batches Permission: workflow:read

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** workflow:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /workflow-queue  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/workflow-queue.ts`


##### Get Status (`workflow-queue.getStatus`)

- **Purpose:** /** Get a single workflow status by ID Permission: workflow:read

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** workflow:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /workflow-queue  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/workflow-queue.ts`


##### List Statuses (`workflow-queue.listStatuses`)

- **Purpose:** /** List all active workflow statuses Permission: workflow:read

- **Type:** query  

- **Auth wrapper:** protectedProcedure  

- **Permissions:** workflow:read (mode: all)  

- **Roles (inferred from RBAC seeds):** Super Admin (or legacy-admin bypass)  

- **Related UI routes:** /workflow-queue  

- **Implementation status:** API-only / Unreferenced in client  

- **Notes:** Permission string not present in RBAC seed (likely Super Admin/legacy only until harmonized)  

- **Source:** `server/routers/workflow-queue.ts`
