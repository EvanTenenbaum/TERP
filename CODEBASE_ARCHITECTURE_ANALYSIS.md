# TERP Codebase - Comprehensive Architecture Analysis

**Project**: TERP (Task-driven Execution and Resolution Protocol) - ERP System  
**Status**: Production-Ready & Deployed  
**Repository**: https://github.com/EvanTenenbaum/TERP  
**Live Production**: https://terp-app-b9s35.ondigitalocean.app  
**Analysis Date**: 2025-11-16

---

## 1. TOP-LEVEL DIRECTORY STRUCTURE

### Root Directory Layout

```
TERP/
├── client/                      # Frontend React application (3.2M)
├── server/                      # Backend tRPC API (2.3M)
├── shared/                      # Shared types and utilities (10K)
├── drizzle/                     # Database schema & migrations (3.5M)
├── scripts/                     # Utility & seed scripts (550K)
├── tests/                       # Test configuration & setup (5.5K)
├── tests-e2e/                   # End-to-end tests
├── testing/                     # Test utilities & fixtures
├── docs/                        # Project documentation
├── .github/                     # GitHub workflows & CI/CD
├── .husky/                      # Git hooks configuration
├── .manus/                      # AI agent configuration & prompts
├── migrations/                  # Alternative migration storage
├── patches/                     # pnpm patch dependencies
├── product-management/          # Feature roadmaps & specs
├── agent-prompts/               # Agent execution prompts
├── .do/                         # DigitalOcean configuration
├── .vercel/                     # Vercel deployment config
├── configuration files          # vite.config.ts, tsconfig.json, etc.
└── root documentation           # README.md, CHANGELOG.md, etc.
```

### Directory Size Distribution
- Client: 3.2M (212 component files)
- Server: 2.3M (267 files + 96 routers)
- Database/Schema: 3.5M (110 tables, 5,037 lines)
- Scripts: 550K (seed data, migrations, utilities)
- Tests: Distributed across multiple directories (64 test files)

---

## 2. TECHNOLOGY STACK

### **Frontend Stack**
| Component | Technology | Version |
|-----------|-----------|---------|
| **Framework** | React | 19.1.1 |
| **Language** | TypeScript | 5.9.3 |
| **Build Tool** | Vite | 7.1.12 |
| **CSS Framework** | Tailwind CSS | 4.1.14 |
| **UI Components** | shadcn/ui | Latest |
| **State Management** | TanStack React Query | 5.90.2 |
| **Form Management** | React Hook Form | 7.64.0 |
| **Data Validation** | Zod | 4.1.12 |
| **API Client** | tRPC Client | 11.6.0 |
| **Routing** | Wouter | 3.3.5 |
| **Charts** | Recharts | 2.15.2 |
| **Rich Text Editor** | TipTap | 3.8.0 |
| **Drag & Drop** | dnd-kit | 6.3.1 |
| **Date/Time** | Luxon, date-fns | Latest |
| **Motion** | Framer Motion | 12.23.22 |
| **Notifications** | Sonner | 2.0.7 |
| **Async Utilities** | SuperJSON | 1.13.3 |
| **Radix UI** | 15+ primitives | Latest |

### **Backend Stack**
| Component | Technology | Version |
|-----------|-----------|---------|
| **Runtime** | Node.js | Latest (ESM) |
| **Server Framework** | Express.js | 4.21.2 |
| **API Framework** | tRPC | 11.6.0 |
| **ORM** | Drizzle ORM | 0.44.5 |
| **Database** | MySQL | 8.0 |
| **Driver** | mysql2 | 3.15.0 |
| **Authentication** | Clerk SDK | 5.1.6 |
| **JWT** | jsonwebtoken | 9.0.2 |
| **Security** | bcrypt, bcryptjs | Latest |
| **Logging** | Pino | 10.1.0 |
| **Task Scheduling** | node-cron | 4.2.1 |
| **Real-time** | Socket.io | 4.8.1 |
| **Rate Limiting** | express-rate-limit | 8.1.0 |
| **Error Tracking** | Sentry | 10.22.0 |
| **S3 Storage** | AWS SDK | 3.693.0 |

### **Development Stack**
| Component | Technology | Version |
|-----------|-----------|---------|
| **Testing Framework** | Vitest | 4.0.3 |
| **E2E Testing** | Playwright | 1.56.1 |
| **Test Utilities** | Testing Library | Latest |
| **Linting** | ESLint | 9.38.0 |
| **Formatting** | Prettier | 3.6.2 |
| **Type Checking** | TypeScript Compiler | 5.9.3 |
| **Package Manager** | pnpm | 10.4.1 |
| **Git Hooks** | Husky | 9.1.7 |
| **Build Tool (Backend)** | esbuild | 0.25.0 |
| **Code Generation** | ts-morph | 27.0.2 |
| **Faker Data** | @faker-js/faker | 10.1.0 |

### **Infrastructure**
| Component | Technology |
|-----------|-----------|
| **Hosting** | DigitalOcean App Platform |
| **Database** | DigitalOcean Managed MySQL |
| **CDN** | Built-in (DigitalOcean) |
| **SSL/HTTPS** | Automatic |
| **Environment** | Node.js 18+ |
| **Deploy Method** | Git push (auto-deploy) |

---

## 3. APPLICATION ARCHITECTURE

### **Architectural Pattern: Monorepo Full-Stack**

This is a **monorepo with frontend and backend separation** deployed as a unified application.

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
│                    React 19 + Vite                       │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP/JSON + TanStack Query
                 ▼
┌─────────────────────────────────────────────────────────┐
│            Node.js/Express Server                        │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │    tRPC Router (68 domain routers)               │   │
│  │  - auth, inventory, accounting, orders, etc.     │   │
│  └────────────┬─────────────────────────────────────┘   │
│               │                                          │
│  ┌────────────▼────────────────────────────────────┐   │
│  │    Service Layer (Business Logic)                │   │
│  │  - matchingEngine, pricingEngine, etc.           │   │
│  └────────────┬─────────────────────────────────────┘   │
│               │                                          │
│  ┌────────────▼────────────────────────────────────┐   │
│  │    Data Access Layer (Drizzle ORM)              │   │
│  │  - Type-safe queries, migrations                │   │
│  └────────────┬─────────────────────────────────────┘   │
│               │                                          │
└───────────────┼──────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────┐
│        MySQL 8.0 Database (110 tables)                   │
│  - Inventory, Accounting, Orders, Calendar, RBAC, etc.  │
└──────────────────────────────────────────────────────────┘
```

### **Architecture Characteristics**

1. **Not Microservices**: Single monolithic Node.js server
2. **Not Separate Deployments**: Frontend and backend compiled together
3. **Tightly Coupled**: Shared types between client/server
4. **API-Driven**: 68+ tRPC routers as API endpoints
5. **Type-Safe End-to-End**: TypeScript throughout
6. **SPA (Single Page Application)**: Client-side routing with Wouter

### **Key Architectural Patterns**

#### **API Architecture (tRPC)**
- 68 domain-specific routers
- Type-safe RPC calls (no REST)
- Automatic client generation from server types
- Batched requests by default
- SuperJSON for complex data serialization

#### **Database Architecture (Drizzle ORM)**
- Type-safe queries (TypeScript-first)
- MySQL dialect
- 110 database tables across 3 schemas
- Automatic migrations via Drizzle Kit
- Relations and foreign keys

#### **Authentication & Authorization**
- Clerk SDK for modern auth (email, social, MFA)
- JWT for session management
- Simple auth fallback for development
- RBAC (Role-Based Access Control) system
- Permission middleware on routers

#### **Frontend Architecture**
- Component-driven development
- 25+ component categories
- shadcn/ui for consistent design system
- React Query for server state management
- Context API for client state
- Tailwind CSS for styling

---

## 4. CONFIGURATION FILES

### **Core Configuration Files**

| File | Purpose | Key Settings |
|------|---------|--------------|
| **package.json** | Dependencies & scripts | 80+ dev deps, pnpm workspaces |
| **tsconfig.json** | TypeScript compiler | strict mode, path aliases (@/, @shared) |
| **vite.config.ts** | Frontend build tool | React plugin, Tailwind, code splitting |
| **vitest.config.ts** | Testing framework | jsdom + node environments, coverage |
| **drizzle.config.ts** | Database migrations | MySQL dialect, 3 schema files |
| **tailwind.config.ts** | CSS framework | shadcn/ui theme, animations |
| **eslint.config.js** | Code linting | TypeScript, React, React Hooks rules |
| **.prettierrc** | Code formatting | 80 char width, semicolons, trailing commas |
| **playwright.config.ts** | E2E testing | Chromium browser, timeouts |
| **components.json** | shadcn/ui config | Aliases, tailwind paths |
| **vercel.json** | Vercel deployment | Build commands, routes |
| **nixpacks.toml** | DigitalOcean build | Build system configuration |

### **Environment Configuration**

```env
# Required (Application won't function)
DATABASE_URL              # MySQL connection string
JWT_SECRET                # 32+ character random secret

# Authentication (Clerk)
VITE_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY

# Application
VITE_APP_TITLE
VITE_APP_ID
NODE_ENV
PORT

# Optional (External services)
SENTRY_DSN                # Error tracking
ARGOS_TOKEN               # Visual testing
GITHUB_WEBHOOK_SECRET     # CI/CD
FEATURE_LIVE_CATALOG      # Feature flags
```

### **Build Configuration**

```typescript
// Vite bundling
- React vendor chunk (react, react-dom)
- tRPC vendor chunk (@trpc/*)
- UI vendor chunk (@radix-ui/*)
- Calendar chunk (luxon, date-fns)
- Chunk size warning limit: 600KB

// esbuild (Backend)
- Platform: node
- Format: ESM
- Bundle: external packages
```

---

## 5. BUILD AND DEPLOYMENT SETUP

### **Development Workflow**

```bash
pnpm install           # Install dependencies
pnpm dev              # Run dev server (tsx watch server/_core/index.ts)
pnpm check            # TypeScript check
pnpm test             # Unit tests
pnpm test:watch       # Watch tests
pnpm format           # Format code
```

### **Production Build Process**

```bash
# 1. Generate version info
node scripts/generate-version.cjs

# 2. Build frontend (Vite)
vite build
Output: dist/public/

# 3. Bundle backend (esbuild)
esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# 4. Final output
dist/
├── index.js           # Backend entry point
├── public/            # Frontend assets
├── node_modules       # Dependencies
```

### **Deployment Architecture**

#### **DigitalOcean App Platform**
```yaml
Build Command: pnpm build
Run Command: NODE_ENV=production node dist/index.js
Port: 3000
Auto-deploy: On git push to main
```

#### **Database Deployment**
- Managed MySQL 8.0 on DigitalOcean
- Automatic backups
- SSL connections
- Connection pooling via Drizzle

#### **Static Asset Serving**
- Hashed assets (JS, CSS): 1-year cache
- HTML files: no cache
- Served from dist/public

#### **Caching Strategy**
```typescript
// HTML files: no cache (always check)
Cache-Control: no-cache, no-store, must-revalidate

// Hashed assets: long-term cache
Cache-Control: public, max-age=31536000, immutable

// Other assets: 1-day cache
Cache-Control: public, max-age=86400
```

### **Deployment Scripts**
- `apply-workflow-fixes.sh` - Apply workflow patches
- `deploy-production.sh` - Manual production deployment
- `PRODUCTION_DEPLOYMENT_SCRIPT.sh` - Alternative deployment
- Auto-deploy via GitHub push to main

---

## 6. ENTRY POINTS

### **Frontend Entry Point**

**File**: `/home/user/TERP/client/src/main.tsx`

```typescript
// 1. Creates tRPC client with httpBatchLink
// 2. Sets up TanStack Query with caching rules
// 3. Renders React app with providers
// 4. Mounting point: document.getElementById("root")

Key features:
- SuperJSON transformer for complex types
- Automatic retry logic (max 2 retries)
- Exponential backoff
- Credentials: include (for authentication)
```

### **Backend Entry Point**

**File**: `/home/user/TERP/server/_core/index.ts`

```typescript
// 1. Initialize monitoring (Sentry)
// 2. Replace console with structured logger
// 3. Seed default data & create admin user
// 4. Assign RBAC roles
// 5. Find available port (3000-3020)
// 6. Create Express server
// 7. Setup tRPC middleware
// 8. Register auth routes
// 9. Setup Vite dev server
// 10. Start listening

Middleware chain:
- Request logger
- Auth limiter (5 req/min)
- API limiter (100 req/min)
- Cookie parser
- tRPC handler
- Error handler
- Graceful shutdown handler
```

### **Application Router Entry**

**File**: `/home/user/TERP/server/routers.ts`

```typescript
// 68 domain routers merged into single appRouter
export const appRouter = router({
  system, auth, inventory, settings, strains, cogs, scratchPad,
  dashboard, accounting, freeformNotes, clients, credit, credits,
  badDebt, inventoryMovements, pricing, salesSheets, orders,
  auditLogs, configuration, accountingHooks, samples,
  dashboardEnhanced, salesSheetEnhancements, advancedTagFeatures,
  productIntake, orderEnhancements, clientNeeds, vendorSupply,
  vendors, purchaseOrders, locations, returns, refunds,
  warehouseTransfers, poReceiving, matching, userManagement,
  dataCardMetrics, admin, adminImport, analytics,
  adminMigrations, adminQuickFix, adminSchemaPush,
  vipPortal, vipPortalAdmin, ordersEnhancedV2, pricingDefaults,
  dashboardPreferences, todoLists, todoTasks, comments, users,
  inbox, todoActivity, calendar, calendarParticipants,
  calendarReminders, calendarViews, calendarRecurrence,
  calendarMeetings, calendarFinancials, calendarInvitations,
  rbacUsers, rbacRoles, rbacPermissions, workflowQueue, deployments,
});
```

### **Database Connection Entry**

**File**: `/home/user/TERP/drizzle.config.ts`

```typescript
// MySQL dialect
// 3 schema files:
// - schema.ts (main, 4634 lines, 110 tables)
// - schema-vip-portal.ts (271 lines)
// - schema-rbac.ts (132 lines)

// Migrations stored in: drizzle/migrations/
```

---

## 7. DETAILED FILE STRUCTURE

### **CLIENT DIRECTORY** (3.2M, 304 files)

```
client/
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Root app component
│   ├── index.css             # Global styles
│   ├── const.ts              # Constants
│   │
│   ├── components/ (212 files)
│   │   ├── ui/               # shadcn/ui components (30+ files)
│   │   │   ├── button.tsx, input.tsx, dialog.tsx, etc.
│   │   │   └── Radix UI wrappers for Tailwind
│   │   │
│   │   ├── accounting/       # Accounting module components
│   │   ├── calendar/         # Calendar widgets & dialogs
│   │   ├── clients/          # Client management UI
│   │   ├── cogs/             # COGS calculation UI
│   │   ├── comments/         # Comment system
│   │   ├── common/           # Shared components
│   │   ├── credit/           # Credit management
│   │   ├── dashboard/        # Dashboard variations (v2, v3)
│   │   ├── data-cards/       # Metric cards
│   │   ├── inbox/            # Inbox/messaging
│   │   ├── inventory/        # Inventory tracking
│   │   ├── layout/           # Layout components
│   │   ├── needs/            # Needs matching UI
│   │   ├── orders/           # Order management
│   │   ├── pricing/          # Pricing module
│   │   ├── sales/            # Sales sheet UI
│   │   ├── settings/         # Settings (including RBAC)
│   │   ├── strain/           # Strain management
│   │   ├── supply/           # Vendor supply UI
│   │   ├── todos/            # Task management
│   │   ├── vip-portal/       # VIP client portal
│   │   ├── workflow/         # Workflow editor
│   │   ├── DashboardLayout.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── UserManagement.tsx
│   │
│   ├── pages/ (28 pages, .tsx files)
│   │   ├── AnalyticsPage.tsx
│   │   ├── CalendarPage.tsx
│   │   ├── ClientProfilePage.tsx
│   │   ├── ClientsListPage.tsx
│   │   ├── CogsSettingsPage.tsx
│   │   ├── ComponentShowcase.tsx
│   │   ├── CreditSettingsPage.tsx
│   │   ├── DashboardV3.tsx
│   │   ├── Inventory.tsx
│   │   ├── MatchmakingServicePage.tsx
│   │   ├── NeedsManagementPage.tsx
│   │   ├── Orders.tsx
│   │   ├── PricingProfilesPage.tsx
│   │   ├── PricingRulesPage.tsx
│   │   ├── PurchaseOrdersPage.tsx
│   │   ├── Quotes.tsx
│   │   ├── ReturnsPage.tsx
│   │   ├── Settings.tsx
│   │   ├── TodoListDetailPage.tsx
│   │   └── More...
│   │
│   ├── _core/
│   │   ├── AppRoutes.tsx       # All route definitions
│   │   └── types.ts
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── Others...
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTrpc.ts
│   │   └── Custom hooks...
│   │
│   ├── lib/
│   │   ├── trpc.ts             # tRPC client setup
│   │   ├── utils.ts            # Utility functions
│   │   └── Other utilities
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   └── utils/
│       └── Helper utilities
│
├── public/                     # Static assets
│   └── Assets served as-is
│
├── index.html                  # HTML entry point
└── vite.svg                    # Vite logo
```

### **SERVER DIRECTORY** (2.3M, 267 files)

```
server/
├── _core/ (45 files, 7,313 lines total)
│   ├── index.ts                    # Server startup
│   ├── trpc.ts                     # tRPC initialization
│   ├── context.ts                  # tRPC context
│   ├── systemRouter.ts             # System endpoints
│   │
│   ├── Authentication & Auth
│   │   ├── authProvider.ts (219 lines)
│   │   ├── simpleAuth.ts (242 lines)
│   │   ├── permissionService.ts (447 lines)
│   │   ├── permissionMiddleware.ts (205 lines)
│   │   └── authProvider.test.ts
│   │
│   ├── Database & Data
│   │   ├── db.ts
│   │   ├── dataProvider.ts
│   │   ├── dbTransaction.ts
│   │   ├── dbLocking.ts
│   │   ├── connectionPool.ts
│   │   ├── dataIntegrityService.ts (435 lines)
│   │   └── Tests...
│   │
│   ├── Environment & Validation
│   │   ├── env.ts
│   │   ├── envValidator.ts (188 lines)
│   │   ├── validation.ts (310 lines)
│   │   └── envValidator.test.ts
│   │
│   ├── Error & Request Handling
│   │   ├── errorHandling.ts (294 lines)
│   │   ├── errors.ts (185 lines)
│   │   ├── requestLogger.ts
│   │   ├── monitoring.ts
│   │   ├── healthCheck.ts (187 lines)
│   │   ├── gracefulShutdown.ts
│   │   └── errorHandling.test.ts
│   │
│   ├── Logging & Monitoring
│   │   ├── logger.ts (263 lines)
│   │   ├── monitoring.ts
│   │   ├── notification.ts
│   │   └── rateLimiter.ts
│   │
│   ├── Features & Services
│   │   ├── llm.ts (332 lines)
│   │   ├── instanceGenerationService.ts (369 lines)
│   │   ├── voiceTranscription.ts (284 lines)
│   │   ├── timezoneService.ts (294 lines)
│   │   ├── imageGeneration.ts
│   │   └── calendarJobs.ts (216 lines)
│   │
│   ├── Utilities
│   │   ├── cache.ts
│   │   ├── cookies.ts
│   │   ├── vite.ts
│   │   ├── sanitization.ts
│   │   ├── ulid.ts
│   │   └── dataApi.ts
│   │
│   └── Tests
│       ├── authProvider.test.ts
│       ├── dataProvider.test.ts
│       ├── envValidator.test.ts
│       ├── errorHandling.test.ts
│       ├── timezoneService.test.ts
│       └── More...
│
├── routers/ (96 files, 68 domain routers)
│   ├── Core Routers
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── userManagement.ts
│   │   └── admin*.ts (6 files)
│   │
│   ├── Inventory Routers
│   │   ├── inventory.ts
│   │   ├── inventoryMovements.ts
│   │   ├── productIntake.ts
│   │   ├── locations.ts
│   │   ├── vendors.ts
│   │   ├── strains.ts
│   │   ├── samples.ts
│   │   ├── cogs.ts
│   │   └── Tests...
│   │
│   ├── Accounting Routers
│   │   ├── accounting.ts
│   │   ├── accountingHooks.ts
│   │   ├── credit.ts
│   │   ├── credits.ts
│   │   ├── badDebt.ts
│   │   └── accounting.test.ts
│   │
│   ├── Order Management Routers
│   │   ├── orders.ts
│   │   ├── ordersEnhancedV2.ts
│   │   ├── orderEnhancements.ts
│   │   ├── purchaseOrders.ts
│   │   ├── poReceiving.ts
│   │   ├── salesSheets.ts
│   │   ├── salesSheetEnhancements.ts
│   │   └── Tests...
│   │
│   ├── Pricing & Commerce
│   │   ├── pricing.ts
│   │   ├── pricingDefaults.ts
│   │   └── pricing.test.ts
│   │
│   ├── Client Management
│   │   ├── clients.ts
│   │   ├── clientNeedsEnhanced.ts
│   │   ├── vendorSupply.ts
│   │   ├── matchingEnhanced.ts
│   │   └── Tests...
│   │
│   ├── Dashboard & Analytics
│   │   ├── dashboard.ts
│   │   ├── dashboardEnhanced.ts
│   │   ├── dashboardPreferences.ts
│   │   ├── dataCardMetrics.ts
│   │   ├── analytics.ts
│   │   └── Tests...
│   │
│   ├── Calendar & Events
│   │   ├── calendar.ts
│   │   ├── calendarParticipants.ts
│   │   ├── calendarReminders.ts
│   │   ├── calendarViews.ts
│   │   ├── calendarRecurrence.ts
│   │   ├── calendarMeetings.ts
│   │   ├── calendarFinancials.ts
│   │   ├── calendarInvitations.ts
│   │   └── Tests...
│   │
│   ├── Content & Communication
│   │   ├── freeformNotes.ts
│   │   ├── comments.ts
│   │   ├── inbox.ts
│   │   ├── todoLists.ts
│   │   ├── todoTasks.ts
│   │   ├── todoActivity.ts
│   │   └── Tests...
│   │
│   ├── RBAC & Security
│   │   ├── rbac-users.ts
│   │   ├── rbac-roles.ts
│   │   ├── rbac-permissions.ts
│   │   └── Tests...
│   │
│   ├── Advanced Features
│   │   ├── warehouseTransfers.ts
│   │   ├── returns.ts
│   │   ├── refunds.ts
│   │   ├── advancedTagFeatures.ts
│   │   ├── vipPortal.ts
│   │   ├── vipPortalAdmin.ts
│   │   ├── workflow-queue.ts
│   │   ├── deployments.ts
│   │   ├── scratchPad.ts
│   │   ├── configuration.ts
│   │   ├── settings.ts
│   │   ├── auditLogs.ts
│   │   └── Tests...
│   │
│   └── Tests (20 test files)
│       ├── accounting.test.ts
│       ├── admin-security.test.ts
│       ├── analytics.test.ts
│       ├── badDebt.test.ts
│       ├── calendar*.test.ts
│       ├── calendarFinancials.test.ts
│       ├── calendarInvitations.test.ts
│       ├── clients.test.ts
│       ├── comments.test.ts
│       ├── credits.test.ts
│       ├── dashboard.test.ts
│       ├── inventory.test.ts
│       ├── orders.test.ts
│       ├── pricing.test.ts
│       ├── rbac*.test.ts
│       ├── salesSheets.test.ts
│       ├── vipPortal*.test.ts
│       ├── vendors.test.ts
│       └── workflow-queue.test.ts
│
├── db/ (Data Access Layer)
│   ├── queries/                 # Parameterized DB queries
│   └── Specific DB access modules
│
├── db*.ts (50+ database files)
│   ├── accountingDb.ts (14KB)
│   ├── inventoryDb.ts (36KB)
│   ├── ordersDb.ts (37KB)
│   ├── clientsDb.ts (22KB)
│   ├── matchingEngine.ts (15KB)
│   ├── matchingEngineEnhanced.ts (23KB)
│   ├── pricingEngine.ts (12KB)
│   ├── calendarDb.ts (21KB)
│   ├── creditsDb.ts (14KB)
│   ├── badDebtDb.ts (15KB)
│   ├── vendorSupplyDb.ts (8KB)
│   ├── samplesDb.ts (12KB)
│   ├── And 40+ more...
│
├── services/
│   ├── seedDefaults.ts
│   ├── seedRBAC.ts
│   └── Other services
│
├── test-utils/
│   ├── testPermissions.ts
│   └── Test helper utilities
│
├── webhooks/
│   └── Webhook handlers
│
├── cron/
│   └── priceAlertsCron.ts
│
├── scripts/
│   └── Additional utility scripts
│
├── utils/
│   └── Utility functions
│
├── routers.ts                  # Router aggregation & export
├── index.ts                    # Server entry point
└── test-setup.ts               # Test configuration
```

### **DATABASE DIRECTORY** (3.5M, 5,037 lines)

```
drizzle/
├── schema.ts (4,634 lines)
│   ├── User Management (5 tables)
│   │   ├── users
│   │   ├── dashboardPreferences
│   │   ├── dashboardWidgets
│   │   ├── sessionTokens
│   │   └── More...
│   │
│   ├── Inventory (8 tables)
│   │   ├── batches
│   │   ├── products
│   │   ├── brands
│   │   ├── vendors
│   │   ├── strains
│   │   ├── samples
│   │   ├── inventoryMovements
│   │   └── locations
│   │
│   ├── Accounting (12 tables)
│   │   ├── accounts
│   │   ├── ledgerEntries
│   │   ├── fiscalPeriods
│   │   ├── invoices
│   │   ├── invoiceLineItems
│   │   ├── bills
│   │   ├── billLineItems
│   │   ├── payments
│   │   ├── bankAccounts
│   │   ├── bankTransactions
│   │   ├── expenses
│   │   └── expenseCategories
│   │
│   ├── Orders & Sales (6 tables)
│   │   ├── orders
│   │   ├── orderLineItems
│   │   ├── salesSheets
│   │   ├── purchaseOrders
│   │   ├── quotes
│   │   └── returns
│   │
│   ├── Needs & Matching (3 tables)
│   │   ├── clientNeeds
│   │   ├── vendorSupply
│   │   └── matchRecords
│   │
│   ├── Calendar & Events (8 tables)
│   │   ├── events
│   │   ├── eventParticipants
│   │   ├── eventReminders
│   │   ├── eventRecurrence
│   │   ├── meetingNotes
│   │   ├── meetings
│   │   ├── financialEvents
│   │   └── eventInvitations
│   │
│   ├── Content & Communication (5 tables)
│   │   ├── comments
│   │   ├── freeformNotes
│   │   ├── todoLists
│   │   ├── todoTasks
│   │   └── todoActivity
│   │
│   ├── Messaging & Notifications (2 tables)
│   │   ├── inbox
│   │   └── notifications
│   │
│   ├── Analytics (4 tables)
│   │   ├── dashboardMetrics
│   │   ├── auditLogs
│   │   ├── dataCardMetrics
│   │   └── More...
│   │
│   ├── Pricing & Credits (4 tables)
│   │   ├── pricingRules
│   │   ├── pricingProfiles
│   │   ├── credits
│   │   └── creditTransactions
│   │
│   ├── Configuration (5 tables)
│   │   ├── configuration
│   │   ├── alertConfiguration
│   │   ├── tagManagement
│   │   ├── advancedTags
│   │   └── More...
│   │
│   ├── Product & Inventory (4 tables)
│   │   ├── productIntake
│   │   ├── productIntakeQueue
│   │   ├── badDebt
│   │   └── More...
│   │
│   └── And 40+ more tables...
│
├── schema-vip-portal.ts (271 lines)
│   ├── liveCatalog
│   ├── liveCatalogProducts
│   ├── liveCatalogOrders
│   ├── liveCatalogOrderItems
│   ├── vipPortalUsers
│   └── vipPortalAuditLogs
│
├── schema-rbac.ts (132 lines)
│   ├── roles
│   ├── permissions
│   ├── rolePermissions
│   ├── userRoles
│   └── permissionAuditLogs
│
├── migrations/
│   └── 17 migration files
│       ├── 0000_*.sql
│       ├── 0001_*.sql
│       └── Up to 0016_*.sql
│
├── meta/
│   └── _journal.json
│       └── Migration tracking metadata
│
└── rollback/
    └── Rollback migration files
```

### **SCRIPTS DIRECTORY** (550K)

```
scripts/
├── Database & Seeding
│   ├── seed-realistic-main.ts
│   ├── seed-live-database.ts
│   ├── reseed-production-safe.ts
│   ├── verify_seed.js
│   └── More seed scripts...
│
├── Generators/ (Complex data generation)
│   ├── generators/lists-tasks.ts
│   ├── generators/products.ts
│   ├── generators/strains.ts
│   ├── generators/inventory.ts
│   ├── generators/clients.ts
│   ├── generators/orders.ts
│   ├── generators/pricing.ts
│   ├── generators/events-calendar.ts
│   └── More generators...
│
├── Utilities
│   ├── roadmap.ts (Roadmap management)
│   ├── check-dashboard-data.ts
│   ├── validate-session-cleanup.ts
│   ├── apply-rbac-to-routers.ts
│   └── generate-version.cjs
│
└── Shell Scripts
    ├── apply-workflow-fixes.sh
    ├── apply_dashboard_migration.sh
    ├── deploy-production.sh
    ├── fix_db_pattern.sh
    └── More shell scripts...
```

### **TESTS DIRECTORY**

```
tests/ (5.5K)
├── setup.ts                    # Test configuration
└── Test setup & utilities

tests-e2e/
├── E2E tests with Playwright
└── Visual regression tests

server/tests/
├── Unit tests for backend
└── Integration test setups

testing/
├── fixtures/
│   └── Mock data & test data
└── db-util.ts
    └── Test database utilities
```

### **SHARED DIRECTORY** (10K)

```
shared/
├── types.ts                    # Shared TypeScript types
├── const.ts                    # Shared constants
└── _core/
    └── errors.ts               # Shared error definitions
```

### **DOCUMENTATION DIRECTORY**

```
docs/
├── Architecture & Design
│   ├── ROADMAP_SYSTEM_*.md
│   ├── DEVELOPMENT_PROTOCOLS.md
│   └── More...
│
├── Features
│   ├── CLERK_AUTHENTICATION.md
│   ├── NEEDS_AND_MATCHING_MODULE.md
│   ├── DEPLOYMENT_STATUS.md
│   └── More...
│
├── specs/
│   └── Feature specifications
│
├── prompts/
│   └── Agent execution prompts
│
├── testing/
│   └── Testing documentation
│
└── More completion reports & analyses
```

---

## 8. KEY METRICS

### **Codebase Size**
- **Total Files**: 574 tracked files (excluding node_modules)
- **Client Code**: 304 files (3.2M)
- **Server Code**: 267 files (2.3M)
- **Database Schemas**: 5,037 lines across 3 files
- **API Routers**: 96 files (68 domain routers)
- **Components**: 212 component files
- **Test Files**: 64 test files
- **Migrations**: 17 database migration files

### **Database**
- **Tables**: 110+ production tables
- **Schemas**: 3 (main, vip-portal, rbac)
- **Relationships**: Complex foreign key relations
- **Database Size**: 3.5M (schema files)

### **API Surface**
- **tRPC Routers**: 68 domain-specific routers
- **API Endpoints**: 200+ endpoints across all routers
- **Route Types**: Procedures (queries, mutations, subscriptions)

### **Dependencies**
- **Production Dependencies**: 60+
- **Dev Dependencies**: 80+
- **Total Dependencies**: 140+ (managed by pnpm)
- **Lock File Size**: 435KB

### **Code Quality**
- **TypeScript**: Strict mode enabled
- **Tests**: 64 test files (unit + integration + e2e)
- **Linting**: ESLint + Prettier configured
- **Type Coverage**: Full end-to-end type safety

---

## 9. ARCHITECTURE HIGHLIGHTS

### **Strengths**

1. **Type-Safe Throughout**: TypeScript from client to database
2. **Modern UI Framework**: React 19 with latest patterns
3. **Real-time Capable**: Socket.io integrated
4. **Comprehensive**: 110+ database tables for complex ERP operations
5. **Scalable Architecture**: Modular routers, service layer separation
6. **Production Ready**: Error handling, logging, monitoring
7. **Security**: RBAC, authentication middleware, input validation
8. **Testing**: Multi-level testing (unit, integration, e2e)
9. **Development Experience**: Hot reload, typed APIs, code generation
10. **DevOps**: Auto-deploy, database migrations, health checks

### **Architecture Decisions**

1. **Monorepo > Microservices**: Simpler deployment, shared code
2. **tRPC > REST**: Type safety, less boilerplate
3. **Drizzle > Query Builder**: Type-safe queries, migrations
4. **MySQL > NoSQL**: ACID transactions for accounting
5. **Clerk > Custom Auth**: Modern UX, less maintenance
6. **Vite > Webpack**: Faster builds, better DX
7. **Tailwind > CSS-in-JS**: Performance, maintainability
8. **shadcn/ui > Component Library**: Customizable, copy-paste
9. **Single Deployment > Separate Services**: Easier operations

---

## 10. DEPLOYMENT & INFRASTRUCTURE

### **Current Deployment**
- **Platform**: DigitalOcean App Platform
- **Database**: DigitalOcean Managed MySQL 8.0
- **Auto-Deploy**: Git push to main triggers deployment
- **SSL/HTTPS**: Automatic
- **Live URL**: https://terp-app-b9s35.ondigitalocean.app
- **Cost**: ~$20/month (App + Database)

### **Build Pipeline**
1. Git push to main
2. DigitalOcean detects change
3. Runs `pnpm build` (Vite + esbuild)
4. Generates version info
5. Bundles frontend (dist/public)
6. Bundles backend (dist/index.js)
7. Runs on Node.js with MySQL connection
8. Health checks validate deployment

### **Performance Considerations**
- Code splitting for large modules
- Asset caching (1 year for hashed files)
- Connection pooling for database
- Rate limiting (5 req/min auth, 100 req/min api)
- Graceful shutdown handling

---

## 11. DEVELOPMENT WORKFLOW

### **Local Development**
```bash
# 1. Install dependencies
pnpm install

# 2. Start development server
pnpm dev
# Runs: tsx watch server/_core/index.ts
# Client auto-builds via Vite (5173)
# Server runs on 3000

# 3. Watch tests
pnpm test:watch

# 4. Type check
pnpm check

# 5. Format code
pnpm format
```

### **Database Development**
```bash
# Create new table/modify schema
# Edit drizzle/schema.ts

# Generate migration
drizzle-kit generate

# Apply migration
drizzle-kit migrate

# Reset test database
pnpm test:db:reset

# Seed development data
pnpm seed:light
pnpm seed:full
pnpm seed:chaos
```

### **Git Workflow**
- Branch: claude/codebase-analysis-review-01EoAkqyExXUXm5eGfhj48QA
- Husky hooks (lint, format on commit)
- lint-staged for modified files
- Pre-commit code quality checks

---

## 12. KEY TECHNOLOGIES AT A GLANCE

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Web Frontend** | React 19 | UI framework |
| **Web Framework** | Vite | Build & dev server |
| **Styling** | Tailwind CSS 4 | Utility CSS |
| **Components** | shadcn/ui | UI component library |
| **API Client** | tRPC + TanStack Query | Server communication |
| **State** | React Context + Query | State management |
| **Forms** | React Hook Form + Zod | Form handling |
| **Backend Server** | Express.js | HTTP server |
| **API Framework** | tRPC | RPC layer |
| **Database ORM** | Drizzle ORM | Type-safe DB |
| **Database** | MySQL 8.0 | Data persistence |
| **Auth** | Clerk SDK | Authentication |
| **Sessions** | JWT | Token-based sessions |
| **Real-time** | Socket.io | WebSocket support |
| **Logging** | Pino | Structured logging |
| **Testing** | Vitest + Playwright | Test runners |
| **Linting** | ESLint | Code quality |
| **Formatting** | Prettier | Code formatting |
| **Deployment** | DigitalOcean | Hosting platform |

---

## CONCLUSION

TERP is a **production-grade, full-stack ERP application** with:

- **Modern Architecture**: React + Node.js with tRPC
- **Enterprise Grade**: 110+ database tables, comprehensive features
- **Type Safe**: End-to-end TypeScript
- **Well Organized**: Clear separation of concerns
- **Scalable**: Modular router-based API
- **Battle Tested**: 64 test files, comprehensive test coverage
- **Production Ready**: Error handling, logging, monitoring, RBAC
- **Developer Friendly**: Hot reload, typed APIs, excellent tooling

The codebase is suitable for enterprise use and demonstrates best practices in modern full-stack development.

---

