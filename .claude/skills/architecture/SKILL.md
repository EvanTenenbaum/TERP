---
name: architecture
description: "TERP architecture deep dive — full tech stack, project structure, party model with query patterns, authentication flow, actor attribution, key files, and environment variables"
---

# TERP Architecture

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Tailwind CSS 4, shadcn/ui (55+ components), Radix primitives |
| Routing | Wouter (lightweight React router) |
| Forms | React Hook Form + Zod validation |
| State | React Query (@tanstack/react-query) + tRPC |
| API | tRPC v11 with superjson transformer |
| Database | MySQL 8.0, Drizzle ORM |
| Queue | BullMQ |
| Auth | Custom JWT (HTTP-only cookies) |
| Testing | Vitest 4 (unit/integration), Playwright (E2E) |
| Logging | Pino structured logging |
| Hosting | DigitalOcean App Platform |
| Package Manager | pnpm 10.4.1 |

## Project Structure

```
TERP/
├── client/src/
│   ├── components/           # Reusable UI (shadcn/ui base in ui/)
│   │   ├── ui/              # 55+ shadcn/ui components
│   │   ├── accounting/      # Accounting-specific
│   │   ├── dashboard/       # Dashboard widgets
│   │   └── layout/          # AppShell, sidebar, etc.
│   ├── pages/               # Route pages
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities and helpers
│   ├── contexts/            # React context providers
│   └── types/               # TypeScript type definitions
├── server/
│   ├── _core/               # Core: trpc.ts, context.ts, auth, env
│   ├── routers/             # 80+ tRPC routers (domain-based)
│   ├── services/            # Business logic (new code here)
│   ├── db/schema/           # Drizzle schema files
│   └── *Db.ts               # Legacy data access (don't extend)
├── drizzle/
│   ├── schema.ts            # Main MySQL schema
│   ├── schema-vip-portal.ts # VIP portal schema
│   ├── schema-rbac.ts       # RBAC schema
│   └── migrations/          # SQL migration files
├── shared/                   # Shared types and utilities
├── scripts/                  # Automation scripts (50+)
├── tests/                    # Test setup and utilities
├── tests-e2e/               # Playwright E2E tests
└── docs/                     # Documentation
```

## Party Model (Critical)

```
┌─────────────────────────────────────────┐
│              clients                     │
│  (All business entities)                 │
├─────────────────────────────────────────┤
│  id, name, teriCode                      │
│  isSeller (true = supplier)              │
│  isBuyer (true = customer)               │
│  totalOwed (AR balance)                  │
└─────────────────────────────────────────┘
         │ 1:1 (for suppliers only)
         ▼
┌─────────────────────────────────────────┐
│         supplier_profiles                │
├─────────────────────────────────────────┤
│  clientId → clients.id                   │
│  legacyVendorId (migration tracking)     │
│  licenseNumber, paymentTerms             │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      vendors (DEPRECATED — DO NOT USE)   │
└─────────────────────────────────────────┘
```

### Correct Query Patterns

```typescript
// Find suppliers
const suppliers = await db.query.clients.findMany({
  where: eq(clients.isSeller, true),
  with: { supplierProfile: true },
});

// Find customers
const customers = await db.query.clients.findMany({
  where: eq(clients.isBuyer, true),
});

// NEVER: db.query.vendors.findMany()
```

### Actor Attribution

```typescript
// CORRECT — Actor from authenticated context
import { getAuthenticatedUserId } from "../_core/trpc";
const userId = getAuthenticatedUserId(ctx);

// WRONG — Actor from input (security risk)
const createdBy = input.createdBy;  // FORBIDDEN

// VIP portal
const actorId = `vip:${ctx.session.clientId}`;
```

## Authentication & Login

Session-based auth with JWT tokens in HTTP-only cookies.

### Demo Mode

When `DEMO_MODE=true`: visitors are auto-authenticated as Super Admin, role switcher visible.

### Auth Flow

```
Request → Check terp_session cookie
├─ Valid token → Authenticated user
├─ No token + DEMO_MODE=true → Auto-login as Super Admin
└─ No token + DEMO_MODE=false → Public demo user (read-only)
```

### Test Accounts

| Email | Role |
|-------|------|
| qa.superadmin@terp.test | Super Admin (full access) |
| qa.salesmanager@terp.test | Sales Manager |
| qa.salesrep@terp.test | Customer Service |
| qa.inventory@terp.test | Inventory Manager |
| qa.fulfillment@terp.test | Warehouse Staff |
| qa.accounting@terp.test | Accountant |
| qa.auditor@terp.test | Read-Only Auditor |

Password for all: `TerpQA2026!`

### Key Auth Files

| File | Purpose |
|------|---------|
| `server/_core/context.ts` | Request context, user provisioning |
| `server/_core/simpleAuth.ts` | JWT creation, password verification |
| `server/_core/qaAuth.ts` | QA role definitions, DEMO_MODE check |
| `server/_core/env.ts` | Environment variable access |

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `DATABASE_URL` | MySQL connection string | required |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | required |
| `DEMO_MODE` | Auto-login as Super Admin | `false` |
| `QA_AUTH_ENABLED` | Enable QA auth (dev/staging only) | `false` |

## tRPC Conventions

- One router per domain/feature
- `publicProcedure` — unauthenticated
- `protectedProcedure` — requires authenticated user
- `adminProcedure` — requires admin role
- All inputs validated with Zod schemas
- Errors via `TRPCError` with appropriate codes

## Frontend Conventions

- All components are functional with hooks
- React Query for server state, useState/useReducer for local UI state
- Wouter for routing
- React Hook Form + Zod for forms
- Mobile-first — test at 320px minimum
- Import aliases: `@/*` → `client/src/*`, `@shared/*` → `shared/*`
