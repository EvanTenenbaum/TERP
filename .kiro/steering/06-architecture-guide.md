---
inclusion: always
---

# 🏗️ TERP Architecture Guide

**Version**: 1.0  
**Last Updated**: 2025-12-16  
**Status**: MANDATORY

This document describes TERP's architecture, structure, and canonical patterns. All agents MUST read this before making changes.

---

## Overview

TERP is a modern ERP system for cannabis businesses built with:

- **Frontend**: React 19, TypeScript, Tailwind CSS, shadcn/ui, Vite
- **Backend**: Node.js, tRPC, Drizzle ORM
- **Database**: MySQL 8.0 (DigitalOcean Managed)
- **Deployment**: DigitalOcean App Platform

---

## Project Structure

```
terp-redesign/
├── client/                      # Frontend React application
│   └── src/
│       ├── components/          # Reusable UI components
│       │   ├── ui/             # shadcn/ui base components (DO NOT MODIFY)
│       │   ├── layout/         # AppShell, AppHeader, AppSidebar
│       │   └── [feature]/      # Feature-specific components
│       ├── pages/              # Page components (routes)
│       ├── hooks/              # Custom React hooks
│       ├── lib/                # Utilities (trpc client, helpers)
│       ├── contexts/           # React contexts
│       └── types/              # TypeScript type definitions
│
├── server/                      # Backend Node.js application
│   ├── _core/                  # Core infrastructure (DO NOT MODIFY without approval)
│   │   ├── trpc.ts            # tRPC setup, procedures, middleware
│   │   ├── context.ts         # Request context creation
│   │   ├── db.ts              # Database connection
│   │   ├── env.ts             # Environment variables
│   │   ├── logger.ts          # Logging infrastructure
│   │   └── errorHandling.ts   # Error handling middleware
│   ├── routers/               # tRPC routers (API endpoints)
│   ├── services/              # Business logic services
│   ├── db/                    # Database queries
│   ├── utils/                 # Server utilities
│   └── [feature]Db.ts         # Legacy data access files
│
├── drizzle/                    # Database schema
│   └── schema.ts              # Main schema file (CRITICAL)
│
├── shared/                     # Shared code between client/server
│   ├── const.ts               # Shared constants
│   └── types.ts               # Shared TypeScript types
│
├── scripts/                    # Utility scripts
│   ├── seed/                  # Database seeding system
│   │   └── seeders/           # Individual seeders
│   ├── audit/                 # Audit and validation scripts
│   └── qa/                    # QA automation scripts
│
├── docs/                       # Documentation
│   ├── protocols/             # Development protocols
│   ├── roadmaps/              # Task roadmaps
│   └── sessions/              # Agent session files
│
└── .kiro/                      # Kiro configuration
    ├── steering/              # Steering files (auto-included)
    └── specs/                 # Feature specifications
```

---

## Backend Architecture

### tRPC Layer

TERP uses tRPC for type-safe API communication.

**Router Structure** (`server/routers.ts`):

```typescript
export const appRouter = router({
  // Core routers
  system: systemRouter,
  auth: authRouter,

  // Domain routers
  clients: clientsRouter,
  orders: ordersRouter,
  inventory: inventoryRouter,
  accounting: accountingRouter,
  // ... 50+ routers
});
```

**Procedure Types** (`server/_core/trpc.ts`):

| Procedure                    | Auth Required     | Use Case                         |
| ---------------------------- | ----------------- | -------------------------------- |
| `publicProcedure`            | No                | Public endpoints, auth flows     |
| `protectedProcedure`         | Yes (allows demo) | General authenticated operations |
| `strictlyProtectedProcedure` | Yes (real user)   | Mutations requiring attribution  |
| `adminProcedure`             | Admin role        | Administrative operations        |
| `vipPortalProcedure`         | VIP session       | VIP portal operations            |

**Creating a New Router**:

```typescript
// server/routers/myFeature.ts
import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";

export const myFeatureRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Implementation
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Use getAuthenticatedUserId(ctx) for mutations
    }),
});
```

### Database Layer

**ORM**: Drizzle ORM with MySQL

**Schema Location**: `drizzle/schema.ts`

**Key Patterns**:

```typescript
// Table definition
export const myTable = mysqlTable(
  "my_table",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    clientId: int("client_id").references(() => clients.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
    deletedAt: timestamp("deleted_at"), // Soft delete
  },
  table => ({
    clientIdIdx: index("idx_my_table_client_id").on(table.clientId),
  })
);

// Relations
export const myTableRelations = relations(myTable, ({ one }) => ({
  client: one(clients, {
    fields: [myTable.clientId],
    references: [clients.id],
  }),
}));
```

### Service Layer

Business logic should be in service files:

```
server/services/
├── pricingService.ts      # Pricing calculations
├── vendorMappingService.ts # Vendor-to-client mapping
├── liveCatalogService.ts  # VIP portal catalog
└── ...
```

---

## Frontend Architecture

### Component Hierarchy

```
App.tsx
└── ThemeProvider
    └── TooltipProvider
        └── Router
            └── AppShell (for protected routes)
                └── Page Component
                    └── Feature Components
```

### Routing

**Router**: Wouter (lightweight alternative to React Router)

**Route Structure**:

```typescript
// Public routes (no AppShell)
<Route path="/login" component={Login} />
<Route path="/vip-portal/login" component={VIPLogin} />

// Protected routes (wrapped in AppShell)
<Route path="/" component={DashboardV3} />
<Route path="/clients" component={ClientsListPage} />
<Route path="/clients/:id" component={ClientProfilePage} />
```

### State Management

**Server State**: TanStack Query (via tRPC)

```typescript
// Query
const { data, isLoading } = trpc.clients.list.useQuery();

// Mutation
const mutation = trpc.clients.create.useMutation({
  onSuccess: () => {
    utils.clients.list.invalidate();
  },
});
```

**Local State**: React useState/useReducer
**Global State**: React Context (ThemeContext, DashboardPreferencesContext)

### Component Patterns

**Page Components** (`client/src/pages/`):

- Handle routing and data fetching
- Compose feature components
- Manage page-level state

**Feature Components** (`client/src/components/[feature]/`):

- Reusable within feature domain
- Receive data via props
- Use React.memo for optimization

**UI Components** (`client/src/components/ui/`):

- shadcn/ui base components
- **DO NOT MODIFY** - use composition instead

---

## Canonical Data Model

### Party Model (CRITICAL)

**Single Source of Truth**: `clients` table

```
┌─────────────────────────────────────────────────────────────┐
│                        clients                               │
│  (All business entities: customers AND suppliers)           │
├─────────────────────────────────────────────────────────────┤
│  id              │ Primary key                               │
│  name            │ Business name                             │
│  isSeller        │ true = can sell to TERP (supplier)        │
│  isBuyer         │ true = can buy from TERP (customer)       │
│  vipPortalEnabled│ Has VIP portal access                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1:1 (for suppliers only)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    supplier_profiles                         │
│  (Extended supplier-specific data)                          │
├─────────────────────────────────────────────────────────────┤
│  clientId        │ FK → clients.id                           │
│  legacyVendorId  │ FK → vendors.id (migration tracking)      │
│  licenseNumber   │ State license                             │
│  paymentTerms    │ Net 30, etc.                              │
└─────────────────────────────────────────────────────────────┘
```

### ⚠️ DEPRECATED: vendors Table

The `vendors` table is **DEPRECATED**. Use `clients` with `isSeller=true`.

```typescript
// ❌ WRONG - Don't use vendors table
const vendors = await db.query.vendors.findMany();

// ✅ CORRECT - Use clients with isSeller filter
const suppliers = await db.query.clients.findMany({
  where: eq(clients.isSeller, true),
  with: { supplierProfile: true },
});
```

### Foreign Key Patterns

| Field Pattern               | References   | Notes                        |
| --------------------------- | ------------ | ---------------------------- |
| `clientId`                  | `clients.id` | Canonical party reference    |
| `customerId`                | `clients.id` | **LEGACY** - will be renamed |
| `vendorId` (in payments)    | `clients.id` | Supplier reference           |
| `vendorId` (in lots/brands) | `vendors.id` | **LEGACY** - being migrated  |
| `userId`                    | `users.id`   | Internal user                |
| `createdBy`                 | `users.id`   | Actor attribution            |

---

## Data Seeding System

### Seeding Order (FK Dependencies)

```typescript
const SEEDING_ORDER = [
  "vendors", // No dependencies
  "clients", // No dependencies
  "products", // Depends on: vendors (via brands)
  "purchaseOrders", // Depends on: vendors, products
  "batches", // Depends on: products, vendors
  "orders", // Depends on: clients, batches
  "client_transactions", // Depends on: clients, orders
  "invoices", // Depends on: clients, orders
  "payments", // Depends on: invoices, clients
  "bills", // Depends on: vendors
];
```

### Running Seeds

```bash
# Seed all data
pnpm seed

# Seed specific table
pnpm seed:clients
pnpm seed:orders

# Production seeding (via admin API)
# Use the admin panel or API endpoints
```

---

## Authentication & Authorization

### User Types

| Type            | Storage                 | Use Case               |
| --------------- | ----------------------- | ---------------------- |
| Internal User   | `users` table           | TERP employees, admins |
| VIP Portal User | `vip_portal_auth` table | Client self-service    |
| Demo User       | Synthetic (id: -1)      | Public demo access     |

### Actor Attribution

**All mutations MUST have actor attribution**:

```typescript
// ✅ CORRECT
const userId = getAuthenticatedUserId(ctx);
await db.insert(orders).values({
  ...input,
  createdBy: userId,
});

// ❌ WRONG - Never use fallback patterns
const userId = ctx.user?.id || 1; // FORBIDDEN
```

---

## Key Modules

### Inventory Module

- **Tables**: `batches`, `products`, `brands`, `lots`
- **Router**: `inventory`, `inventoryMovements`
- **Status Flow**: AWAITING_INTAKE → LIVE → SOLD_OUT → CLOSED

### Accounting Module

- **Tables**: `invoices`, `bills`, `payments`, `ledgerEntries`
- **Router**: `accounting`
- **Features**: Double-entry bookkeeping, AR/AP aging

### Orders Module

- **Tables**: `orders`, `orderItems`
- **Router**: `orders`
- **Types**: QUOTE, SALE

### Calendar Module

- **Tables**: `calendar_events`, `calendar_participants`
- **Router**: `calendar`, `calendarParticipants`, etc.
- **Features**: Recurring events, reminders, invitations

### VIP Portal

- **Tables**: `vip_portal_auth`, `vip_portal_sessions`
- **Router**: `vipPortal`, `vipPortalAdmin`
- **Features**: Client self-service, live catalog

---

## Common Pitfalls to Avoid

### 1. Using Deprecated Systems

```typescript
// ❌ WRONG - vendors table is deprecated
await db.query.vendors.findMany();

// ✅ CORRECT - use clients with isSeller
await db.query.clients.findMany({
  where: eq(clients.isSeller, true),
});
```

### 2. Missing Actor Attribution

```typescript
// ❌ WRONG - no actor attribution
await db.insert(orders).values(input);

// ✅ CORRECT - include createdBy
await db.insert(orders).values({
  ...input,
  createdBy: getAuthenticatedUserId(ctx),
});
```

### 3. Missing Foreign Key Indexes

```typescript
// ❌ WRONG - FK without index
export const myTable = mysqlTable("my_table", {
  clientId: int("client_id").references(() => clients.id),
});

// ✅ CORRECT - FK with index
export const myTable = mysqlTable(
  "my_table",
  {
    clientId: int("client_id").references(() => clients.id),
  },
  table => ({
    clientIdIdx: index("idx_my_table_client_id").on(table.clientId),
  })
);
```

### 4. Hard Deletes Instead of Soft Deletes

```typescript
// ❌ WRONG - hard delete
await db.delete(clients).where(eq(clients.id, id));

// ✅ CORRECT - soft delete
await db
  .update(clients)
  .set({ deletedAt: new Date() })
  .where(eq(clients.id, id));
```

### 5. Modifying Core Infrastructure

**DO NOT MODIFY** without explicit approval:

- `server/_core/*` - Core infrastructure
- `client/src/components/ui/*` - shadcn/ui components
- `drizzle/schema.ts` - Database schema (requires migration)

### 6. Breaking Seeding Order

When adding new tables with FKs, update `SEEDING_ORDER` in `scripts/seed/seeders/index.ts`.

---

## Migration Guidelines

### Adding a New Table

1. Add schema to `drizzle/schema.ts`
2. Add relations
3. Add indexes for all FKs
4. Generate migration: `pnpm db:generate`
5. Test migration locally
6. Update seeding order if needed
7. Create seeder if needed

### Modifying Existing Tables

1. **Never** modify columns directly in production
2. Create migration with `pnpm db:generate`
3. Test migration on staging
4. Deploy via normal process
5. Verify data integrity

### Renaming Columns

1. Add new column
2. Dual-write period (write to both)
3. Migrate data
4. Update application code
5. Remove old column

---

## Testing Requirements

### Test Files Location

```
server/
├── routers/
│   ├── clients.ts
│   └── clients.test.ts      # Router tests
├── services/
│   ├── pricingService.ts
│   └── pricingService.test.ts # Service tests
└── tests/                    # Integration tests

scripts/
└── seed/seeders/
    ├── seed-clients.ts
    └── seed-clients.test.ts  # Seeder tests
```

### Running Tests

```bash
pnpm test              # All tests
pnpm test clients      # Specific file
pnpm test:coverage     # With coverage
```

---

## Quick Reference

### Essential Commands

```bash
# Development
pnpm dev               # Start dev server
pnpm build             # Build for production
pnpm check             # TypeScript check
pnpm lint              # ESLint check

# Database
pnpm db:generate       # Generate migration
pnpm db:migrate        # Apply migrations
pnpm db:push           # Push schema (dev only)

# Testing
pnpm test              # Run tests
pnpm test:coverage     # With coverage

# Roadmap
pnpm roadmap:validate  # Validate roadmap
```

### Key Files

| File                     | Purpose          |
| ------------------------ | ---------------- |
| `drizzle/schema.ts`      | Database schema  |
| `server/routers.ts`      | All API routers  |
| `server/_core/trpc.ts`   | tRPC setup       |
| `client/src/App.tsx`     | Frontend routing |
| `client/src/lib/trpc.ts` | tRPC client      |

---

**This architecture guide is the authoritative source for TERP's technical structure. Follow it precisely.**
