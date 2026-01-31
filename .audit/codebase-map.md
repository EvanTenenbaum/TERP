# TERP Codebase Map

> **Purpose:** Enable systematic code discovery without local vector search.  
> **Usage:** Read this at session start. Use GitHub code search with keywords from each section.  
> **Last Updated:** 2026-01-31

---

## 🏗️ Architecture Overview

```
TERP/
├── server/           # Backend (tRPC routers, services, DB)
│   ├── _core/        # Auth, trpc setup, middleware, validation
│   ├── routers/      # 110+ tRPC routers (one per domain)
│   ├── services/     # Business logic services
│   ├── db/           # Seed data, queries
│   └── utils/        # Helpers
├── client/src/       # Frontend (React 19)
│   ├── components/   # UI components by domain
│   ├── pages/        # Route pages
│   ├── hooks/        # Custom React hooks
│   └── lib/          # Utils, trpc client
├── drizzle/          # Database schema
│   └── schema*.ts    # Main schema + extensions
├── shared/           # Shared types between server/client
├── tests-e2e/        # Playwright E2E tests
└── docs/             # Documentation, roadmaps
```

---

## 📊 Database Schema

### Main Schema File
- **`drizzle/schema.ts`** - Core tables (269KB, 39 tables)
- **`drizzle/schema-*.ts`** - Feature extensions (RBAC, VIP, scheduling, etc.)

### Critical Tables by Domain

| Domain | Tables | Schema Location |
|--------|--------|-----------------|
| **Users/Auth** | users, rbac_* | schema.ts, schema-rbac.ts |
| **Clients (Party Model)** | clients, supplier_profiles | schema.ts |
| **Inventory** | batches, batchLocations, cogsHistory | schema.ts |
| **Orders** | orders, orderItems | schema.ts |
| **Accounting** | accounts, invoices, payments, bills | schema.ts |
| **Products** | products, strains, categories, grades | schema.ts |

### The Party Model (CRITICAL)

```
clients table = ALL business entities
├── isSeller=true → Supplier (has supplier_profiles)
├── isBuyer=true → Customer
└── Can be BOTH (isSeller=true AND isBuyer=true)

❌ DEPRECATED: vendors table (exists but DO NOT USE)
```

**Search Keywords:** `clients`, `isSeller`, `isBuyer`, `supplier_profiles`, `supplierProfile`

---

## 🔌 API Routers by Domain

### Inventory & Products
| Router | File | Purpose |
|--------|------|---------|
| inventory | `server/routers/inventory.ts` | Batch CRUD, status, cost |
| products | `server/routers/catalog.ts` | Product catalog |
| strains | `server/routers/strains.ts` | Strain management |
| productIntake | `server/routers/productIntake.ts` | Receiving inventory |
| poReceiving | `server/routers/poReceiving.ts` | PO receiving workflow |

### Orders & Sales
| Router | File | Purpose |
|--------|------|---------|
| orders | `server/routers/orders.ts` | Order CRUD |
| quotes | `server/routers/quotes.ts` | Quote management |
| pickPack | `server/routers/pickPack.ts` | Fulfillment |
| salesSheets | `server/routers/salesSheets.ts` | Sales sheets |

### Clients & CRM
| Router | File | Purpose |
|--------|------|---------|
| clients | `server/routers/clients.ts` | Client CRUD |
| clientLedger | `server/routers/clientLedger.ts` | AR ledger |
| client360 | `server/routers/client360.ts` | Client dashboard |
| vendorSupply | `server/routers/vendorSupply.ts` | Supplier supply tracking |

### Accounting
| Router | File | Purpose |
|--------|------|---------|
| accounting | `server/routers/accounting.ts` | GL, accounts |
| invoices | `server/routers/invoices.ts` | Invoice CRUD |
| payments | `server/routers/payments.ts` | Payment processing |
| bills | `server/routers/bills.ts` (via accounting) | AP bills |

### Admin & Config
| Router | File | Purpose |
|--------|------|---------|
| admin | `server/routers/admin.ts` | Admin functions |
| settings | `server/routers/settings.ts` | App settings |
| featureFlags | `server/routers/featureFlags.ts` | Feature toggles |
| rbac-* | `server/routers/rbac-*.ts` | Permissions |

---

## 🖼️ Frontend Pages

### Main Application Pages
| Page | File | Route |
|------|------|-------|
| Dashboard | `client/src/pages/DashboardV3.tsx` | / |
| Inventory | `client/src/pages/Inventory.tsx` | /inventory |
| Orders | `client/src/pages/Orders.tsx` | /orders |
| Clients | `client/src/pages/ClientsListPage.tsx` | /clients |
| Products | `client/src/pages/ProductsPage.tsx` | /products |

### Accounting Pages
All in `client/src/pages/accounting/`:
- AccountingDashboard.tsx
- ChartOfAccounts.tsx
- GeneralLedger.tsx
- Invoices.tsx
- Payments.tsx
- Bills.tsx

### Component Directories
| Domain | Path |
|--------|------|
| Inventory | `client/src/components/inventory/` |
| Orders | `client/src/components/orders/` |
| Clients | `client/src/components/clients/` |
| Accounting | `client/src/components/accounting/` |
| Common UI | `client/src/components/ui/` (shadcn) |

---

## ⚠️ Known Problem Areas

### Files with Potential Violations

**`|| 1` fallback pattern (432 matches - mostly false positives):**
```
server/_core/trpc.ts          # Auth helper - MAY be legitimate
server/routers/pickPack.ts    # Check carefully
server/services/orderService.ts
```

**`vendorId` references (79 matches - legacy):**
```
server/routers/vendors.ts       # DEPRECATED router
server/routers/vendorSupply.ts  # Uses legacy field
server/services/vendorMappingService.ts
```

**Enum Definitions (118 enums in schema.ts):**
Common mismatches occur with:
- `batchStatus` / `status` 
- `orderStatus` / `status`
- `paymentStatus` / `payment_status`

---

## 🔍 Search Patterns for Audits

### Forbidden Pattern Detection
```bash
# Fallback user IDs
"|| 1" repo:EvanTenenbaum/TERP path:server
"?? 1" repo:EvanTenenbaum/TERP path:server

# Deprecated vendors usage  
"db.query.vendors" repo:EvanTenenbaum/TERP
"vendorId" repo:EvanTenenbaum/TERP path:server

# Actor from input
"input.createdBy" repo:EvanTenenbaum/TERP
"input.userId" repo:EvanTenenbaum/TERP

# Hard deletes
".delete(" repo:EvanTenenbaum/TERP path:server/routers
```

### Domain-Specific Searches
```bash
# Inventory issues
"inventoryStatus" repo:EvanTenenbaum/TERP
"batchStatus" repo:EvanTenenbaum/TERP
"LIVE" repo:EvanTenenbaum/TERP path:drizzle

# Order flow
"confirmOrder" repo:EvanTenenbaum/TERP
"orderItems" repo:EvanTenenbaum/TERP
"reserveInventory" repo:EvanTenenbaum/TERP

# Client ledger
"totalOwed" repo:EvanTenenbaum/TERP
"clientLedger" repo:EvanTenenbaum/TERP
```

---

## 🧪 Test Infrastructure

### E2E Tests
- **Location:** `tests-e2e/`
- **Config:** `playwright.config.ts`
- **Key files:**
  - `tests-e2e/inventory/` - Inventory flows
  - `tests-e2e/orders/` - Order flows
  - `tests-e2e/auth/` - Auth tests

### Unit/Integration Tests
- **Location:** `server/__tests__/`, `server/routers/*.test.ts`
- **Config:** `vitest.config.ts`

### Test Accounts
- **File:** `server/db/seed/qaAccounts.ts`
- **Roles:** admin, user, viewer

---

## 📋 Existing Documentation

### Protocol Files
| File | Purpose |
|------|---------|
| `CLAUDE.md` | Agent protocol (26KB) |
| `.claude/known-bug-patterns.md` | Recurring bugs |
| `.claude/agents/*.md` | Agent-specific prompts |

### Roadmaps & Planning
| File | Purpose |
|------|---------|
| `docs/roadmaps/MASTER_ROADMAP.md` | Single source of truth |
| `docs/ACTIVE_SESSIONS.md` | Current work |
| `product-management/` | Specs, strategies |

---

## 🔄 Cross-Module Impact Map

When changing code in one area, these other areas may be affected:

| If you change... | Also check... |
|------------------|---------------|
| Inventory status | Orders (reservation), Invoices (line items) |
| Client isSeller/isBuyer | supplierProfile, vendorSupply, PO receiving |
| Order confirmation | Inventory (batch quantities), GL entries, Client ledger |
| Payment posting | Invoice status, Client balance, GL entries |
| Product pricing | Order calculations, Quote generation, COGS |

---

## 📝 Session Workflow

### Starting an Audit Session
1. Read this file (`.audit/codebase-map.md`)
2. Read `.claude/known-bug-patterns.md`
3. Check `docs/ACTIVE_SESSIONS.md` for context
4. Run targeted GitHub searches based on task

### Ending an Audit Session
1. Document findings
2. Update `.claude/known-bug-patterns.md` if new patterns found
3. Create/update issues for critical findings
4. Commit session summary to `docs/sessions/`
