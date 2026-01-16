# TERP Flow Coverage Plan

**Version:** 1.0
**Generated:** 2026-01-09
**Status:** Active

## Overview

This document defines the test coverage strategy for TERP's user flows based on analysis of `USER_FLOW_MATRIX.csv`. It categorizes flows into Tier 1 (critical) and Tier 2 (important) priorities, establishing a systematic approach for automated E2E testing.

## Flow Statistics Summary

| Domain | Total Flows | Client-Wired | API-Only | Tier 1 | Tier 2 |
|--------|-------------|--------------|----------|--------|--------|
| Accounting | 53 | 8 | 45 | 12 | 15 |
| CRM/Clients | 29 | 29 | 0 | 10 | 12 |
| Inventory | 37 | 37 | 0 | 10 | 10 |
| Orders | 37 | 37 | 0 | 15 | 10 |
| Pricing | 17 | 17 | 0 | 5 | 5 |
| Calendar | 35 | 12 | 23 | 4 | 6 |
| Workflow/Todos | 13 | 13 | 0 | 4 | 4 |
| Dashboard | 12 | 12 | 0 | 5 | 3 |
| Analytics | 8 | 7 | 1 | 3 | 3 |
| Admin | 29 | 23 | 6 | 6 | 6 |
| Auth | 4 | 4 | 0 | 4 | 0 |
| **TOTAL** | **274** | **199** | **75** | **78** | **74** |

## Flow ID Convention

All flows use the following ID scheme:
```
FlowID = "<Domain>.<Entity>.<FlowName>[.<Variant>]"
```

**Examples:**
- `Orders.Orders.CreateDraftEnhanced`
- `CRM.Clients.Create`
- `Inventory.Batches.UpdateStatus.ToLive`
- `Accounting.Invoices.GenerateFromOrder`

## Tier Classification Criteria

### Tier 1 (Critical) - 78 Flows
Flows that are:
- **Revenue-impacting**: Order creation, payment processing, invoicing
- **Inventory-affecting**: Stock movements, batch status changes
- **Financial integrity**: COGS, margins, accounting entries
- **Auth/Security**: Login, RBAC enforcement
- **High-frequency**: Daily operations by multiple roles

### Tier 2 (Important) - 74 Flows
Flows that are:
- **Supporting operations**: Reports, analytics, exports
- **Configuration**: Pricing rules, profiles, settings
- **Calendar/Scheduling**: Events, time-off, invitations
- **Workflow**: Tasks, todos, notes

---

## Domain Breakdown

### 1. Orders Domain (Tier 1: 15, Tier 2: 10)

#### Tier 1 Critical Flows

| Flow ID | Procedure | Type | Roles | Priority Reason |
|---------|-----------|------|-------|-----------------|
| `Orders.Orders.CreateDraftEnhanced` | `orders.createDraftEnhanced` | mutation | Sales | Primary order entry point |
| `Orders.Orders.UpdateDraftEnhanced` | `orders.updateDraftEnhanced` | mutation | Sales | Line item modifications |
| `Orders.Orders.ConfirmDraft` | `orders.confirmDraftOrder` | mutation | Sales | Commits inventory |
| `Orders.Orders.FinalizeDraft` | `orders.finalizeDraft` | mutation | Sales | Creates receivables |
| `Orders.Orders.GetById` | `orders.getById` | query | All | Core data access |
| `Orders.Orders.GetWithLineItems` | `orders.getOrderWithLineItems` | query | All | Order detail view |
| `Orders.Orders.UpdateStatus` | `orders.updateOrderStatus` | mutation | Fulfillment | Status tracking |
| `Orders.Fulfillment.Confirm` | `orders.confirmOrder` | mutation | Fulfillment | Initiates picking |
| `Orders.Fulfillment.Fulfill` | `orders.fulfillOrder` | mutation | Fulfillment | Deducts inventory |
| `Orders.Fulfillment.Ship` | `orders.shipOrder` | mutation | Fulfillment | Triggers delivery |
| `Orders.PickPack.GetPickList` | `pickPack.getPickList` | query | Fulfillment | Daily operations |
| `Orders.PickPack.PackItems` | `pickPack.packItems` | mutation | Fulfillment | Packing workflow |
| `Orders.PickPack.MarkOrderReady` | `pickPack.markOrderReady` | mutation | Fulfillment | Ready for ship |
| `Orders.Returns.Process` | `orders.processReturn` | mutation | Sales Mgr | Inventory reconciliation |
| `Orders.Conversion.QuoteToSale` | `orders.convertQuoteToSale` | mutation | Sales | Quote conversion |

#### Tier 2 Important Flows
- `Orders.Orders.GetAll`, `Orders.Orders.GetByClient`
- `Orders.Orders.Delete`, `Orders.Orders.Restore`
- `Orders.Pricing.GetMargin`, `Orders.Pricing.Calculate`
- `Orders.Audit.GetLog`, `Orders.Export`

---

### 2. Inventory Domain (Tier 1: 10, Tier 2: 10)

#### Tier 1 Critical Flows

| Flow ID | Procedure | Type | Roles | Priority Reason |
|---------|-----------|------|-------|-----------------|
| `Inventory.Batches.Create` | `batches.create` | mutation | Inv Mgr | New inventory intake |
| `Inventory.Batches.Update` | `batches.update` | mutation | Inv Mgr | Batch modifications |
| `Inventory.Batches.UpdateStatus` | `batches.updateStatus` | mutation | Inv Mgr | Lifecycle management |
| `Inventory.Batches.GetById` | `batches.getById` | query | All | Core data access |
| `Inventory.Batches.GetAvailableQty` | `batches.getAvailableQuantity` | query | All | Stock checking |
| `Inventory.Movements.Record` | `inventoryMovements.record` | mutation | Inv Mgr | Audit trail |
| `Inventory.Movements.Decrease` | `inventoryMovements.decrease` | mutation | Sales | Sale deductions |
| `Inventory.Movements.Increase` | `inventoryMovements.increase` | mutation | Inv Mgr | Returns/adjustments |
| `Inventory.Movements.Adjust` | `inventoryMovements.adjust` | mutation | Inv Mgr | Manual corrections |
| `Inventory.COGS.Update` | `cogs.updateBatchCogs` | mutation | Acct Mgr | Margin calculations |

#### Tier 2 Important Flows
- `Inventory.Batches.List`, `Inventory.Batches.Delete`
- `Inventory.Movements.GetByBatch`, `Inventory.Movements.Reverse`
- `Inventory.Strains.List`, `Inventory.Strains.Create`
- `Inventory.Products.List`, `Inventory.Products.Create`

---

### 3. CRM/Clients Domain (Tier 1: 10, Tier 2: 12)

#### Tier 1 Critical Flows

| Flow ID | Procedure | Type | Roles | Priority Reason |
|---------|-----------|------|-------|-----------------|
| `CRM.Clients.Create` | `clients.create` | mutation | Sales Mgr | New customer onboarding |
| `CRM.Clients.Update` | `clients.update` | mutation | Sales Mgr | Client data maintenance |
| `CRM.Clients.GetById` | `clients.getById` | query | All | Core data access |
| `CRM.Clients.List` | `clients.list` | query | All | Client browsing |
| `CRM.Clients.Archive` | `clients.archive` | mutation | Sales Mgr | Soft delete |
| `CRM.Transactions.Create` | `clients.transactions.create` | mutation | Sales Mgr | Payment recording |
| `CRM.Transactions.RecordPayment` | `clients.transactions.recordPayment` | mutation | Sales | Payment application |
| `CRM.Transactions.List` | `clients.transactions.list` | query | All | Transaction history |
| `CRM.SupplierProfile.Get` | `clients.getSupplierProfile` | query | Purchasing | Vendor data |
| `CRM.SupplierProfile.Update` | `clients.updateSupplierProfile` | mutation | Purchasing | Vendor updates |

#### Tier 2 Important Flows
- `CRM.Clients.GetByTeriCode`, `CRM.Clients.CheckTeriAvailable`
- `CRM.Activity.List`, `CRM.Tags.Add/Remove`
- `CRM.Notes.Link`, `CRM.Communications.Add`

---

### 4. Accounting Domain (Tier 1: 12, Tier 2: 15)

#### Tier 1 Critical Flows

| Flow ID | Procedure | Type | Roles | Priority Reason |
|---------|-----------|------|-------|-----------------|
| `Accounting.Invoices.GenerateFromOrder` | `invoices.generateFromOrder` | mutation | Acct Mgr | AR creation |
| `Accounting.Invoices.UpdateStatus` | `invoices.updateStatus` | mutation | Acct Mgr | Payment tracking |
| `Accounting.Invoices.MarkSent` | `invoices.markSent` | mutation | Acct Mgr | Workflow |
| `Accounting.Invoices.GetById` | `invoices.getById` | query | Acct Mgr | Invoice details |
| `Accounting.Invoices.List` | `invoices.list` | query | Acct Mgr | Invoice browsing |
| `Accounting.Payments.ReceiveClient` | `accounting.receiveClientPayment` | mutation | Acct Mgr | Cash collection |
| `Accounting.Payments.PayVendor` | `accounting.payVendor` | mutation | Acct Mgr | AP disbursement |
| `Accounting.Payments.Record` | `accounting.recordPayment` | mutation | Acct Mgr | Payment application |
| `Accounting.AR.GetSummary` | `accounting.getARSummary` | query | Acct Mgr | AR overview |
| `Accounting.AR.GetAging` | `accounting.getARAging` | query | Acct Mgr | Collection priority |
| `Accounting.Bank.GetTotalBalance` | `accounting.getTotalCashBalance` | query | Acct Mgr | Cash position |
| `Accounting.GL.PostJournalEntry` | `accounting.postJournalEntry` | mutation | Acct Mgr | Manual entries |

#### Tier 2 Important Flows
- `Accounting.Invoices.Void`, `Accounting.Invoices.GetSummary`
- `Accounting.AP.GetSummary`, `Accounting.AP.GetAging`
- `Accounting.FiscalPeriods.Close/Lock`
- `Accounting.Expenses.Create/List`
- `Accounting.BadDebt.WriteOff/Reverse`

---

### 5. Dashboard Domain (Tier 1: 5, Tier 2: 3)

#### Tier 1 Critical Flows

| Flow ID | Procedure | Type | Roles | Priority Reason |
|---------|-----------|------|-------|-----------------|
| `Dashboard.Main.GetData` | `dashboardEnhanced.getDashboardData` | query | All | Primary landing page |
| `Dashboard.Main.GetSalesPerformance` | `dashboardEnhanced.getSalesPerformance` | query | All | KPI display |
| `Dashboard.Main.GetInventoryValuation` | `dashboardEnhanced.getInventoryValuation` | query | All | Asset tracking |
| `Dashboard.Main.GetTopClients` | `dashboardEnhanced.getTopClients` | query | All | Revenue insights |
| `Dashboard.Alerts.GetActive` | `dashboardEnhanced.getActiveAlerts` | query | All | Operational awareness |

---

### 6. Auth Domain (Tier 1: 4)

| Flow ID | Procedure | Type | Roles | Priority Reason |
|---------|-----------|------|-------|-----------------|
| `Auth.User.Me` | `auth.me` | query | All | Session validation |
| `Auth.User.Logout` | `auth.logout` | mutation | All | Session termination |
| `Auth.User.UpdateProfile` | `auth.updateProfile` | mutation | All | User settings |
| `Auth.User.ChangePassword` | `auth.changePassword` | mutation | All | Security |

---

### 7. Admin Domain (Tier 1: 6, Tier 2: 6)

#### Tier 1 Critical Flows

| Flow ID | Procedure | Type | Roles | Priority Reason |
|---------|-----------|------|-------|-----------------|
| `Admin.Users.List` | `userManagement.listUsers` | query | Super Admin | User management |
| `Admin.Users.Create` | `userManagement.createUser` | mutation | Super Admin | Onboarding |
| `Admin.Roles.List` | `rbacRoles.list` | query | Super Admin | RBAC review |
| `Admin.Roles.AssignPermission` | `rbacRoles.assignPermission` | mutation | Super Admin | Access control |
| `Admin.Config.Get` | `configuration.get` | query | Super Admin | Settings |
| `Admin.Config.Set` | `configuration.setValue` | mutation | Super Admin | Configuration |

---

### 8. Other Domains Summary

| Domain | Tier 1 Flows | Tier 2 Flows | Notes |
|--------|--------------|--------------|-------|
| Pricing | 5 | 5 | Rule/profile management |
| Calendar | 4 | 6 | Event CRUD, time-off |
| Workflow/Todos | 4 | 4 | Task management |
| Analytics | 3 | 3 | Reporting |

---

## Test Oracle Strategy

### Oracle Components

Each test oracle defines:

1. **Preconditions**
   - Required seed data (client, batch, user role)
   - Database state prerequisites
   - Feature flags

2. **UI Steps**
   - Navigation actions
   - Form interactions
   - Button clicks
   - Data selections

3. **Expected UI State**
   - URL patterns
   - Visible elements
   - Field values
   - Status indicators

4. **Expected DB State**
   - Row existence/values
   - Relationship integrity
   - Calculated fields
   - Audit records

### Invariants (Global Oracles)

These are checked after every flow:

1. **Inventory Consistency**: `SUM(movements) = batch.currentQuantity`
2. **Financial Balance**: `AR total = SUM(unpaid invoices)`
3. **Order Integrity**: Line items sum = order total
4. **Audit Trail**: All mutations logged
5. **No Console Errors**: No uncaught exceptions
6. **No 5xx Responses**: No server errors

---

## QA Account Matrix

| Role | Email | Domain Access |
|------|-------|---------------|
| Super Admin | `qa.superadmin@terp.test` | All |
| Sales Manager | `qa.salesmanager@terp.test` | CRM, Orders, Pricing |
| Sales Rep | `qa.salesrep@terp.test` | CRM (read), Orders, Inventory (read) |
| Inventory Manager | `qa.inventory@terp.test` | Inventory, COGS |
| Fulfillment | `qa.fulfillment@terp.test` | Orders, Pick-Pack |
| Accounting Manager | `qa.accounting@terp.test` | Accounting, Reports |
| Read-Only Auditor | `qa.auditor@terp.test` | All (read-only) |

Password for all QA accounts: `TerpQA2026!`

---

## Execution Plan

### Phase 1: Core Infrastructure (This Sprint)
- [x] Analyze USER_FLOW_MATRIX.csv
- [ ] Design Test Oracle DSL schema
- [ ] Build Playwright oracle executor
- [ ] Create QA role authentication fixtures
- [ ] Implement DB assertion helpers

### Phase 2: Tier 1 Coverage
- [ ] Orders domain (15 oracles)
- [ ] Inventory domain (10 oracles)
- [ ] CRM domain (10 oracles)
- [ ] Accounting domain (12 oracles)
- [ ] Auth domain (4 oracles)

### Phase 3: Tier 2 Coverage
- [ ] Remaining Orders flows
- [ ] Dashboard flows
- [ ] Admin flows
- [ ] Pricing flows

### Phase 4: Extended Coverage
- [ ] Calendar flows
- [ ] Workflow/Todos
- [ ] Analytics
- [ ] Negative test cases

---

## Run Commands

```bash
# Run Tier 1 critical flow tests
pnpm qa:test:core

# Run all oracle-based tests
pnpm qa:test:all

# Run specific domain
pnpm qa:test:orders
pnpm qa:test:inventory
pnpm qa:test:clients
pnpm qa:test:accounting

# Run with headed browser (debugging)
pnpm qa:test:core --headed

# Generate test coverage report
pnpm qa:coverage
```

---

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Tier 1 Flow Coverage | 100% | 0% |
| Tier 2 Flow Coverage | 80% | 0% |
| Test Pass Rate | > 95% | N/A |
| Execution Time (Core) | < 5 min | N/A |
| DB Invariant Violations | 0 | N/A |

---

## References

- [USER_FLOW_MATRIX.csv](../reference/USER_FLOW_MATRIX.csv)
- [FLOW_GUIDE.md](../reference/FLOW_GUIDE.md)
- [QA Auth Documentation](../auth/QA_AUTH.md)
- [Test Oracle DSL Schema](./TEST_ORACLE_SCHEMA.md)
