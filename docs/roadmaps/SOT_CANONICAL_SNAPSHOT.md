# TERP Source of Truth - Canonical Snapshot

**Version:** 1.0
**Generated:** 2026-01-20
**Derived From:** Multi-source evidence analysis (see ROADMAP_ALIGNMENT_AUDIT.md)

---

## Executive Summary

TERP is a Cannabis ERP system with these deployed modules:
- Core Sales (Orders, Clients, Invoices, Quotes)
- Inventory Management (Batches, Products, COGS)
- Basic Accounting (AR/AP, Payments, GL)
- VIP Client Portal (Self-service + Live Shopping)
- Operations (Pick & Pack, Scheduling, Photography)

**Current State:** MVP 72% complete, Beta 0% started
**Key Blockers:** 8 P0 issues (security, TypeScript, tests, GL posting)

---

## Canonical Roadmap Authority

| Rank | Document | Path | Last Updated |
|------|----------|------|--------------|
| **1** | **MASTER_ROADMAP.md** | `docs/roadmaps/MASTER_ROADMAP.md` | 2026-01-20 |
| 2 | INCOMPLETE_FEATURES_AUDIT | `docs/reports/INCOMPLETE_FEATURES_AUDIT_JAN_2026.md` | 2026-01-20 |
| 3 | FLOW_GUIDE | `docs/reference/FLOW_GUIDE.md` | 2025-12-20 |

**All other roadmap files in `docs/roadmaps/` are historical/superseded.**

---

## Current Module Status

### Production Ready (Shipped)

| Module | Key Routes | tRPC Router | Evidence |
|--------|------------|-------------|----------|
| Clients | `/clients`, `/clients/:id` | `clients.ts` | navigation.ts:52 |
| Orders | `/orders`, `/orders/:id` | `orders.ts` | navigation.ts:53 |
| Inventory | `/inventory` | `batches.ts`, `inventory.ts` | navigation.ts:97-100 |
| Products | `/products` | `products.ts` | navigation.ts:93 |
| Purchase Orders | `/purchase-orders` | `purchaseOrders.ts` | navigation.ts:111-117 |
| Invoices | `/accounting/invoices` | `invoices.ts` | navigation.ts:87-91 |
| Accounting | `/accounting` | `accounting.ts` | navigation.ts:135 |
| Live Shopping | `/live-shopping` | `liveSession.ts` | navigation.ts:76-85 |
| Pick & Pack | `/pick-pack` | `pickPack.ts` | navigation.ts:64-69 |
| Samples | `/samples` | `samples.ts` | navigation.ts:110 |
| Calendar | `/calendar` | `calendar.ts` | navigation.ts:155 |
| Scheduling | `/scheduling` | `scheduling.ts` | navigation.ts:165-170 |

### Built But Not Deployed (9 Primary Work Surfaces)

> Note: The `work-surface/` directory contains 13 .tsx files total.
> 9 are primary Work Surface components (listed below); 4 are shared utilities
> (InspectorPanel, StatusBar, InlinePriceEditor, PaymentInspector).

| Component | Location | Blocker |
|-----------|----------|---------|
| ClientsWorkSurface | `components/work-surface/` | Feature flags off |
| OrdersWorkSurface | `components/work-surface/` | Feature flags off |
| InventoryWorkSurface | `components/work-surface/` | WSQA-002 (lot selection) |
| InvoicesWorkSurface | `components/work-surface/` | WSQA-001 (payment stub) |
| DirectIntakeWorkSurface | `components/work-surface/` | Feature flags off |
| PurchaseOrdersWorkSurface | `components/work-surface/` | Feature flags off |
| PickPackWorkSurface | `components/work-surface/` | Feature flags off |
| QuotesWorkSurface | `components/work-surface/` | Feature flags off |
| ClientLedgerWorkSurface | `components/work-surface/` | Feature flags off |

### Not Implemented (Stubs)

| Feature | API Endpoint | Status | Evidence |
|---------|--------------|--------|----------|
| Email sending | `receipts.sendEmail` | NOT_IMPLEMENTED | receipts.ts |
| SMS sending | `receipts.sendSms` | NOT_IMPLEMENTED | receipts.ts |
| Balance sheet | `reports.generateBalanceSheet` | Skipped test | accounting.test.ts |
| Income statement | `reports.generateIncomeStatement` | Skipped test | accounting.test.ts |
| Stock thresholds | `alerts.setThresholds` | Schema missing | alerts.ts:379 |
| Hour tracking UI | N/A | Backend only | No page exists |

---

## RBAC Roles (Production)

| Role | Key Permissions | QA Email |
|------|-----------------|----------|
| Super Admin | All permissions | `qa.superadmin@terp.test` |
| Sales Manager | Clients, Orders, Quotes, Pricing | `qa.salesmanager@terp.test` |
| Sales Rep | Clients (read), Orders (own) | `qa.salesrep@terp.test` |
| Inventory Manager | Inventory, Batches, Products | `qa.inventory@terp.test` |
| Fulfillment | Pick/Pack, Orders (fulfill) | `qa.fulfillment@terp.test` |
| Accounting Manager | AR/AP, Invoices, Payments | `qa.accounting@terp.test` |
| Read-Only Auditor | All read, Audit logs | `qa.auditor@terp.test` |

**Evidence:** `docs/qa/QA_PLAYBOOK.md:7-16`

---

## Deprecated Systems (Do Not Use)

| System | Replacement | Target Removal |
|--------|-------------|----------------|
| `vendors` table | `clients` with `isSeller=true` | Q2 2026 |
| `vendorId` FK (new code) | `supplierClientId` | Q1 2026 |
| Railway deployment | DigitalOcean App Platform | Complete |
| `ordersEnhancedV2Router` | `ordersRouter` | Complete |
| `ctx.user?.id \|\| 1` | `getAuthenticatedUserId(ctx)` | Ongoing |

**Evidence:** `.kiro/steering/07-deprecated-systems.md`

---

## P0 Blockers (Ship Blockers)

| ID | Description | Impact | Estimated Effort |
|----|-------------|--------|------------------|
| SEC-023 | Exposed DB credentials in git | SECURITY | 2-4h |
| TS-001 | 117 TypeScript errors | Build breaks | 16-24h |
| BUG-100 | 122 failing tests | CI broken | 24-40h |
| WSQA-001 | Payment recording is stub | Invoices unusable | 4h |
| WSQA-002 | No flexible lot selection | Inventory blocked | 2d |
| WSQA-003 | Missing RETURNED status | Returns broken | 2d |
| ACC-001 | Silent GL posting failures | Data integrity | 8h |

---

## Feature Flags (Work Surfaces)

All Work Surface flags default to `false`. The master flag is `work-surface-enabled`.

| Flag | Purpose | Default |
|------|---------|---------|
| `work-surface-enabled` | Master toggle | false |
| `work-surface-direct-intake` | Intake module | false |
| `work-surface-purchase-orders` | PO module | false |
| `work-surface-orders` | Orders module | false |
| `work-surface-inventory` | Inventory module | false |
| `work-surface-invoices` | Invoices module | false |
| `work-surface-clients` | Clients module | false |

**To enable Work Surfaces:** Set `work-surface-enabled=true` in feature_flags table.

---

## Key File Locations

| Purpose | Path |
|---------|------|
| Canonical Roadmap | `docs/roadmaps/MASTER_ROADMAP.md` |
| Sidebar Navigation | `client/src/config/navigation.ts` |
| App Routes | `client/src/App.tsx` |
| tRPC Routers | `server/routers/*.ts` |
| Database Schema | `server/db/schema.ts` |
| Feature Flags | `server/routers/featureFlags.ts` |
| RBAC Definitions | `server/services/rbacDefinitions.ts` |
| Deprecation Registry | `.kiro/steering/07-deprecated-systems.md` |

---

## Quick Commands

```bash
# Check TypeScript errors
pnpm run check

# Run tests
pnpm test

# Start development
pnpm dev

# Seed QA accounts
pnpm seed:qa-accounts

# Seed RBAC
pnpm seed:rbac

# Validate roadmap (if script exists)
pnpm roadmap:validate
```

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Core modules status | HIGH | Multiple sources agree, code verifies |
| Work Surfaces completion | MEDIUM | Marked complete but not deployed |
| MVP progress percentage | MEDIUM | Conflicting numbers in MASTER_ROADMAP |
| Deprecated systems | HIGH | Clear documentation, code warnings |
| P0 blocker list | HIGH | Verified against test output, code |

---

*This snapshot represents the best-evidence view of TERP's current state as of 2026-01-20.
All claims are backed by file paths cited in ROADMAP_ALIGNMENT_AUDIT.md.*
