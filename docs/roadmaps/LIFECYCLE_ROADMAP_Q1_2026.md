# TERP Lifecycle-First Strategic Roadmap Q1 2026

**Philosophy:** Fix what blocks complete user workflows first. A user should be able to complete an entire business process from start to finish before we add new features.

**Date:** January 5, 2026
**Version:** 1.0

---

## Executive Summary

This roadmap prioritizes **end-to-end workflow completeness** over individual feature fixes. We identify the core business lifecycles and ensure each can be completed fully before moving to enhancements.

### Core Business Lifecycles

```
LIFECYCLE 1: INVENTORY INTAKE
Vendor → Purchase Order → Receive Goods → Create Batch → Assign Location → Photography → Publish

LIFECYCLE 2: SALES CYCLE  
Client → Browse Catalog → Create Quote → Convert to Order → Pick & Pack → Ship → Invoice → Payment

LIFECYCLE 3: VIP PORTAL (Mobile/Desktop)
Client Login → View Catalog → Check Balance → Place Order → Track Status → View History → Download Docs

LIFECYCLE 4: FINANCIAL CLOSE
Orders → Invoices → Payments → Bank Reconciliation → Period Close → Reports

LIFECYCLE 5: OPERATIONS
Calendar → Appointments → Task Management → Notifications → Analytics
```

---

## Current State Assessment

### Lifecycle Health Check

| Lifecycle | Desktop | Mobile/VIP | Blocking Issues |
|-----------|---------|------------|-----------------|
| **Inventory Intake** | ⚠️ 80% | N/A | Inventory.tsx has @ts-nocheck |
| **Sales Cycle** | ⚠️ 85% | ⚠️ 70% | OrderCreatorPage.tsx, UnifiedSalesPortalPage.tsx have @ts-nocheck |
| **VIP Portal** | N/A | ⚠️ 75% | VIPDashboard.tsx has @ts-nocheck |
| **Financial Close** | ⚠️ 70% | N/A | Invoices.tsx has @ts-nocheck |
| **Operations** | ✅ 90% | ⚠️ 60% | NotificationsPage.tsx has @ts-nocheck |

### Files Blocking Complete Workflows

| File | Lifecycle Impact | Priority |
|------|------------------|----------|
| `client/src/pages/Inventory.tsx` | Blocks inventory viewing | P0 |
| `client/src/pages/OrderCreatorPage.tsx` | Blocks order creation | P0 |
| `client/src/pages/vip-portal/VIPDashboard.tsx` | Blocks VIP portal | P0 |
| `client/src/pages/accounting/Invoices.tsx` | Blocks invoicing | P1 |
| `client/src/pages/UnifiedSalesPortalPage.tsx` | Blocks unified sales | P1 |
| `client/src/pages/PhotographyPage.tsx` | Blocks photo workflow | P2 |
| `client/src/pages/NotificationsPage.tsx` | Blocks notifications | P2 |
| `client/src/pages/settings/FeatureFlagsPage.tsx` | Admin only | P3 |
| `client/src/pages/settings/NotificationPreferences.tsx` | Settings only | P3 |
| `client/src/pages/InterestListPage.tsx` | Enhancement | P3 |

---

## Wave Structure

### Wave 0: Foundation (BLOCKING - Must Complete First)
**Goal:** Remove all @ts-nocheck from core workflow pages
**Duration:** 2-3 days
**Success Criteria:** All core pages compile without @ts-nocheck

| Task | File | Lifecycle | Est. Hours |
|------|------|-----------|------------|
| Fix Inventory page types | Inventory.tsx | Intake | 2-4 |
| Fix OrderCreator page types | OrderCreatorPage.tsx | Sales | 2-4 |
| Fix VIPDashboard page types | VIPDashboard.tsx | VIP Portal | 2-4 |
| Fix Invoices page types | Invoices.tsx | Financial | 2-4 |

**Total:** 8-16 hours

### Wave 1: Complete Sales Lifecycle (Desktop)
**Goal:** User can complete entire sale from client selection to payment
**Duration:** 3-5 days
**Dependencies:** Wave 0 complete

| Task | Description | Est. Hours |
|------|-------------|------------|
| Fix UnifiedSalesPortalPage | Remove @ts-nocheck, fix types | 3-4 |
| Verify Quote → Order flow | End-to-end test | 2-3 |
| Verify Order → Invoice flow | End-to-end test | 2-3 |
| Verify Invoice → Payment flow | End-to-end test | 2-3 |
| Fix any blocking bugs found | Based on testing | 4-8 |

**Total:** 13-21 hours

### Wave 2: Complete VIP Portal Lifecycle (Mobile)
**Goal:** Client can complete entire purchase journey on mobile
**Duration:** 3-5 days
**Dependencies:** Wave 1 complete (sales backend must work)

| Task | Description | Est. Hours |
|------|-------------|------------|
| Fix VIPDashboard components | All child components working | 4-6 |
| Test catalog browsing | Mobile-responsive | 2-3 |
| Test order placement | From VIP portal | 3-4 |
| Test payment/balance view | AR/AP modules | 2-3 |
| Test document downloads | Invoices, receipts | 2-3 |
| Mobile responsiveness audit | All VIP pages | 3-4 |

**Total:** 16-23 hours

### Wave 3: Complete Inventory Lifecycle
**Goal:** User can intake, photograph, and publish inventory end-to-end
**Duration:** 3-5 days
**Dependencies:** Wave 0 complete

| Task | Description | Est. Hours |
|------|-------------|------------|
| Fix PhotographyPage | Remove @ts-nocheck | 3-4 |
| Verify intake flow | Vendor → Batch | 2-3 |
| Verify photography flow | Batch → Photos | 2-3 |
| Verify publish flow | Batch → Live catalog | 2-3 |
| Fix server/routers/photography.ts | Remove @ts-nocheck | 3-4 |

**Total:** 12-17 hours

### Wave 4: Complete Operations Lifecycle
**Goal:** Calendar, notifications, and task management work end-to-end
**Duration:** 2-3 days
**Dependencies:** Wave 0 complete

| Task | Description | Est. Hours |
|------|-------------|------------|
| Fix NotificationsPage | Remove @ts-nocheck | 2-3 |
| Fix NotificationPreferences | Remove @ts-nocheck | 2-3 |
| Verify calendar → notification flow | Reminders work | 2-3 |
| Verify task → notification flow | Assignments work | 2-3 |

**Total:** 8-12 hours

### Wave 5: Polish & Enhancement
**Goal:** Fix remaining @ts-nocheck files and enhance UX
**Duration:** 3-5 days
**Dependencies:** Waves 1-4 complete

| Task | Description | Est. Hours |
|------|-------------|------------|
| Fix FeatureFlagsPage | Admin enhancement | 2-3 |
| Fix InterestListPage | Enhancement | 2-3 |
| Remove server @ts-nocheck files | 11 router files | 15-25 |
| Update roadmap documentation | Reflect reality | 2-3 |

**Total:** 21-34 hours

---

## Total Effort Estimate

| Wave | Hours | Calendar Days |
|------|-------|---------------|
| Wave 0: Foundation | 8-16 | 2-3 |
| Wave 1: Sales Lifecycle | 13-21 | 3-5 |
| Wave 2: VIP Portal | 16-23 | 3-5 |
| Wave 3: Inventory | 12-17 | 3-5 |
| Wave 4: Operations | 8-12 | 2-3 |
| Wave 5: Polish | 21-34 | 3-5 |
| **Total** | **78-123** | **16-26** |

---

## Success Metrics

### Wave 0 Success
- [ ] `pnpm check` passes with 0 errors
- [ ] No @ts-nocheck in: Inventory.tsx, OrderCreatorPage.tsx, VIPDashboard.tsx, Invoices.tsx

### Wave 1 Success (Sales Lifecycle)
- [ ] Can create client
- [ ] Can create quote for client
- [ ] Can convert quote to order
- [ ] Can fulfill order (pick & pack)
- [ ] Can generate invoice from order
- [ ] Can record payment against invoice

### Wave 2 Success (VIP Portal)
- [ ] Client can log into VIP portal
- [ ] Client can browse live catalog
- [ ] Client can view AR/AP balances
- [ ] Client can place order
- [ ] Client can view order history
- [ ] Client can download documents
- [ ] All pages mobile-responsive

### Wave 3 Success (Inventory)
- [ ] Can create vendor
- [ ] Can create purchase order
- [ ] Can receive goods and create batch
- [ ] Can photograph batch
- [ ] Can publish batch to catalog

### Wave 4 Success (Operations)
- [ ] Calendar events trigger notifications
- [ ] Task assignments trigger notifications
- [ ] Notification preferences respected
- [ ] Reminders delivered on time

---

## Risk Mitigation

### Risk 1: @ts-nocheck files have deeper issues
**Mitigation:** Start with simplest files first (likely type mismatches). If issues are deeper, document and escalate.

### Risk 2: Fixing one file breaks another
**Mitigation:** Run full test suite after each fix. Commit frequently.

### Risk 3: Database schema doesn't match code expectations
**Mitigation:** DO NOT modify schema. Only modify application code to match existing schema.

### Risk 4: VIP portal has mobile-specific bugs
**Mitigation:** Test on actual mobile devices or emulators, not just responsive mode.

---

## Constraints (CRITICAL)

### DO NOT:
- ❌ Modify `drizzle/schema.ts`
- ❌ Run migrations
- ❌ Add new database columns
- ❌ Use `drizzle-kit push`
- ❌ Add new @ts-nocheck or @ts-ignore
- ❌ Skip testing after fixes

### DO:
- ✅ Only modify application code
- ✅ Use existing schema columns
- ✅ Run `pnpm check` after every change
- ✅ Run `pnpm test` after every change
- ✅ Commit working code frequently
- ✅ Document any issues found

---

## Appendix: File → Lifecycle Mapping

### Inventory Lifecycle Files
```
server/routers/inventory.ts (OK)
server/routers/photography.ts (@ts-nocheck)
server/inventoryIntakeService.ts (OK)
client/src/pages/Inventory.tsx (@ts-nocheck)
client/src/pages/PhotographyPage.tsx (@ts-nocheck)
client/src/pages/ProductsPage.tsx (OK)
client/src/pages/VendorsPage.tsx (OK)
client/src/pages/PurchaseOrdersPage.tsx (OK)
```

### Sales Lifecycle Files
```
server/routers/orders.ts (OK)
server/routers/clients.ts (OK)
server/routers/quotes.ts (OK)
client/src/pages/Orders.tsx (OK)
client/src/pages/OrderCreatorPage.tsx (@ts-nocheck)
client/src/pages/ClientsListPage.tsx (OK)
client/src/pages/Quotes.tsx (OK)
client/src/pages/UnifiedSalesPortalPage.tsx (@ts-nocheck)
```

### VIP Portal Files
```
server/routers/vipPortal.ts (OK)
client/src/pages/vip-portal/VIPDashboard.tsx (@ts-nocheck)
client/src/pages/vip-portal/VIPLogin.tsx (OK)
client/src/pages/vip-portal/AppointmentBooking.tsx (OK)
client/src/pages/vip-portal/DocumentDownloads.tsx (OK)
client/src/components/vip-portal/*.tsx (various)
```

### Financial Lifecycle Files
```
server/routers/accounting.ts (OK)
client/src/pages/accounting/Invoices.tsx (@ts-nocheck)
client/src/pages/accounting/Payments.tsx (OK)
client/src/pages/accounting/AccountingDashboard.tsx (OK)
```

### Operations Files
```
server/routers/calendar.ts (OK)
server/routers/notifications.ts (OK)
client/src/pages/CalendarPage.tsx (OK)
client/src/pages/NotificationsPage.tsx (@ts-nocheck)
client/src/pages/settings/NotificationPreferences.tsx (@ts-nocheck)
```
