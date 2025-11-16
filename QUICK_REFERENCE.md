# TERP Codebase - Quick Reference

## Project Overview
- **Name**: TERP (ERP System)
- **Status**: Production-ready, deployed on DigitalOcean
- **Type**: Full-stack monorepo (frontend + backend)
- **Live URL**: https://terp-app-b9s35.ondigitalocean.app

---

## Directory Structure Summary

| Directory | Size | Purpose |
|-----------|------|---------|
| `client/` | 3.2M | React frontend (212 component files, 28 pages) |
| `server/` | 2.3M | Node.js backend (267 files, 68 tRPC routers) |
| `drizzle/` | 3.5M | Database schema (110 tables, 3 schemas) |
| `scripts/` | 550K | Seed data, migrations, utilities |
| `docs/` | - | Architecture, specs, guides |
| `tests/` | 5.5K | Test configuration & setup |
| `shared/` | 10K | Shared types and constants |

---

## Technology Stack - At a Glance

### Frontend
- React 19 + TypeScript 5.9
- Vite (build), Tailwind CSS 4, shadcn/ui
- tRPC (type-safe API), TanStack Query (state)
- React Hook Form + Zod (forms)
- 15+ Radix UI primitives

### Backend
- Node.js + Express + tRPC
- Drizzle ORM (MySQL type-safe)
- Clerk (authentication)
- Pino (logging), Socket.io (real-time)

### Database
- MySQL 8.0 (DigitalOcean Managed)
- 110+ tables across 3 schemas
- Automatic migrations via Drizzle

### DevOps
- Deployment: DigitalOcean App Platform
- Testing: Vitest + Playwright
- Linting: ESLint + Prettier
- Git Hooks: Husky + lint-staged

---

## API Architecture

**68 Domain-Specific tRPC Routers:**

1. **Core**: auth, users, system
2. **Inventory**: inventory, strains, vendors, cogs, locations
3. **Accounting**: accounting, credits, badDebt, credit
4. **Orders**: orders, purchaseOrders, salesSheets, returns, refunds
5. **Calendar**: calendar, meetings, financials, invitations, participants
6. **Clients**: clients, clientNeeds, vendorSupply, pricing
7. **Dashboard**: dashboard, analytics, dataCardMetrics
8. **Content**: comments, freeformNotes, inbox, todos
9. **RBAC**: rbacUsers, rbacRoles, rbacPermissions
10. **Admin**: admin, adminImport, adminMigrations, deployments
11. **Advanced**: workflow, vipPortal, advanced tags, matching

**API Characteristics:**
- Type-safe (client types auto-generated from server)
- Batched requests
- SuperJSON serialization for complex types
- Automatic retry with exponential backoff

---

## Entry Points

| Entry Point | File | Purpose |
|-------------|------|---------|
| **Frontend** | `client/src/main.tsx` | React root, tRPC setup |
| **Backend** | `server/_core/index.ts` | Express server, middleware chain |
| **Routers** | `server/routers.ts` | Aggregates 68 domain routers |
| **Database** | `drizzle/schema.ts` | 110 tables, type-safe schema |

---

## Build & Deployment

### Development
```bash
pnpm dev              # Start dev server (tsx watch)
pnpm test:watch       # Watch tests
pnpm check            # TypeScript check
```

### Production Build
```bash
node scripts/generate-version.cjs  # Generate version
vite build                          # Frontend (dist/public)
esbuild server/_core/index.ts       # Backend (dist/index.js)
```

### Deployment
- **Method**: Git push to main (auto-deploy)
- **Host**: DigitalOcean App Platform
- **Build Cmd**: `pnpm build`
- **Run Cmd**: `NODE_ENV=production node dist/index.js`
- **Database**: Managed MySQL with auto-backups

---

## Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts |
| `tsconfig.json` | TypeScript config (strict mode) |
| `vite.config.ts` | Frontend build (code splitting) |
| `vitest.config.ts` | Testing setup (jsdom + node) |
| `drizzle.config.ts` | Database migrations |
| `tailwind.config.ts` | Tailwind theme |
| `eslint.config.js` | Linting rules |
| `.prettierrc` | Code formatting (80 char width) |
| `playwright.config.ts` | E2E testing |

---

## Database Schema Overview

### 110+ Tables Organized By Feature

- **User/Auth**: users, roles, permissions (RBAC)
- **Inventory**: batches, products, vendors, strains, locations
- **Accounting**: accounts, invoices, bills, payments, ledger entries
- **Orders**: orders, purchaseOrders, quotes, returns
- **Calendar**: events, meetings, participants, reminders
- **Matching**: clientNeeds, vendorSupply, matchRecords
- **Content**: comments, notes, todos, inbox
- **Pricing**: pricingRules, pricingProfiles, credits
- **Analytics**: dashboardMetrics, auditLogs, alerts
- **VIP Portal**: liveCatalog, vipPortalUsers

---

## File Count Statistics

- **Total Tracked Files**: 574 (excluding node_modules)
- **Client Components**: 212 files
- **Server Files**: 267 files
- **API Routers**: 96 files (68 routers)
- **Test Files**: 64 test files
- **Database Migrations**: 17 files
- **Production Dependencies**: 60+
- **Dev Dependencies**: 80+

---

## Key Features

1. **Intelligent Needs Matching**: AI-powered matching between client needs and inventory
2. **Double-Entry Accounting**: Full GL, AR/AP, invoicing
3. **Inventory Tracking**: Batch lifecycle (intake → sold)
4. **Dynamic Pricing**: Rules-based pricing engine
5. **Calendar/Events**: Full event management with reminders
6. **RBAC**: Role-based access control with granular permissions
7. **Real-time**: Socket.io for live updates
8. **VIP Portal**: Separate client portal with live catalog
9. **Mobile Optimized**: 100% responsive design
10. **Audit Logs**: Complete audit trail for compliance

---

## Development Environment

### Required
- Node.js 18+ (ESM support)
- pnpm 10.4.1+
- MySQL 8.0

### Environment Variables
```env
DATABASE_URL=mysql://...
JWT_SECRET=<32+ char random>
VITE_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NODE_ENV=development
PORT=3000
```

### Key npm Scripts
```bash
pnpm dev                  # Dev server
pnpm build               # Production build
pnpm test               # Run tests
pnpm test:watch         # Watch tests
pnpm check              # TypeScript check
pnpm format             # Format code
pnpm db:push            # Database migrations
pnpm seed:full          # Seed production data
```

---

## Architecture Type: Full-Stack Monorepo

```
Browser → Vite (React 19)
  ↓
Express Server → tRPC Routers (68 routers)
  ↓
Service Layer (Business Logic)
  ↓
Drizzle ORM → MySQL 8.0 (110 tables)
```

**Key Characteristics:**
- Single deployment unit
- Shared types client→server→db
- Type-safe throughout
- Frontend and backend co-located
- Auto-migrations on startup

---

## Production Metrics

- **Uptime**: Deployed and active
- **Database**: DigitalOcean Managed MySQL
- **Cost**: ~$20/month (App + Database)
- **Performance**: 
  - Code splitting enabled
  - 1-year cache for hashed assets
  - HTML files cache-busted
  - Rate limiting (5 auth, 100 api req/min)

---

## Quick Start for Developers

```bash
# 1. Clone and install
git clone https://github.com/EvanTenenbaum/TERP
cd TERP
pnpm install

# 2. Set environment
cp .env.example .env
# Edit .env with your DATABASE_URL and CLERK keys

# 3. Run development
pnpm dev

# 4. Open browser
# Frontend: http://localhost:5173
# API: http://localhost:3000/api/trpc
```

---

