# Phase 2: Architecture Deep Dive

**Review Date**: December 2, 2025  
**Reviewer**: Kiro AI Agent (Roadmap Manager)  
**Review Type**: Comprehensive Code Review - Phase 2  
**Status**: ✅ COMPLETE

---

## Executive Summary

Phase 2 has successfully mapped the TERP system architecture, documenting frontend routing, backend API structure, database relationships, and integration points. The system follows a **modern full-stack architecture** with React + tRPC + MySQL, featuring **67 tRPC routers**, **107 database tables**, and **49 frontend pages**.

### Key Architectural Patterns

- **Frontend**: React 18 with Wouter routing, TanStack Query for data fetching
- **Backend**: tRPC for type-safe API, Express server, Drizzle ORM
- **Database**: MySQL with comprehensive schema (107 tables)
- **State Management**: React Context API (minimal global state)
- **Authentication**: Custom JWT-based auth with RBAC

---

## 1. Frontend Architecture

### 1.1 Routing Structure

**Router**: Wouter (lightweight React router)  
**Entry Point**: `client/src/App.tsx`  
**Layout System**: Two-tier layout (AppShell + DashboardLayout)

**Route Categories**:

1. **Public Routes** (no authentication):
   - `/login` - Login page
   - `/vip-portal/login` - VIP portal login
   - `/vip-portal/dashboard` - VIP portal dashboard

2. **Protected Routes** (wrapped in AppShell):
   - Dashboard: `/`, `/dashboard`
   - Inventory: `/inventory`, `/inventory/:id`
   - Orders: `/orders`, `/orders/create`, `/orders-debug`
   - Accounting: `/accounting/*` (10 sub-routes)
   - Clients: `/clients`, `/clients/:id`
   - Vendors: `/vendors`, `/vendors/:id`
   - Calendar: `/calendar`
   - Todo Lists: `/todos`, `/todos/:listId`
   - Analytics: `/analytics`
   - Settings: `/settings`, `/settings/cogs`
   - And 20+ more routes

**Total Routes**: 40+ routes across 49 page components

### 1.2 Layout System

**Two-Tier Layout Architecture**:

1. **AppShell** (`client/src/components/layout/AppShell.tsx`):
   - Used for non-dashboard routes
   - Contains AppSidebar and AppHeader
   - Conditionally hidden for dashboard routes (fixes BUG-002)

2. **DashboardLayout** (`client/src/components/DashboardLayout.tsx`):
   - Used exclusively for dashboard routes (`/`, `/dashboard`)
   - Custom sidebar with resizable width (200-480px)
   - Integrated user menu and navigation
   - Mobile-responsive with sidebar trigger

**Layout Decision Logic**:

```typescript
const isDashboardRoute =
  location === "/" ||
  location === "/dashboard" ||
  location.startsWith("/dashboard/");
const shouldShowAppSidebar = !isDashboardRoute;
```

**Why Two Layouts?**:

- Dashboard needs custom sidebar with widgets
- Other pages use standard navigation
- Prevents duplicate navigation (BUG-002 fix)

### 1.3 State Management

**Primary Pattern**: React Context API (minimal global state)

**Contexts**:

1. **ThemeContext** (`client/src/contexts/ThemeContext.tsx`):
   - Manages light/dark theme
   - Persists to localStorage
   - Switchable theme support

2. **DashboardPreferencesContext** (`client/src/contexts/DashboardPreferencesContext.tsx`):
   - Manages dashboard widget configuration
   - Syncs with backend via tRPC
   - Persists to localStorage + database

**Data Fetching**: TanStack Query (React Query)

- Configured in `client/src/main.tsx`
- 5-minute stale time
- 10-minute cache time
- Automatic retry with exponential backoff
- No retry on 401, 403, 404, 429 errors

**Local State**: useState hooks in components (no Redux/Zustand)

### 1.4 Component Architecture

**Component Hierarchy**:

```
App (ErrorBoundary + ThemeProvider)
├── Router (Wouter)
│   ├── Public Routes
│   │   ├── Login
│   │   └── VIP Portal
│   └── Protected Routes (AppShell)
│       ├── Dashboard (DashboardLayout)
│       ├── Inventory
│       ├── Orders
│       ├── Accounting
│       └── ... (40+ routes)
```

**Component Categories**:

- **Pages** (49): Top-level route components
- **Layout** (4): AppShell, DashboardLayout, AppHeader, AppSidebar
- **UI Components** (60+): shadcn/ui library
- **Business Components** (150+): Domain-specific components
- **Widgets** (20+): Dashboard widgets

**Component Patterns**:

- Functional components with hooks
- React.memo for performance (17 components memoized in PERF-002)
- Custom hooks for reusable logic (17 hooks)
- Compound components for complex UI

---

## 2. Backend Architecture

### 2.1 API Structure (tRPC)

**Total Routers**: 67 tRPC routers  
**Router Configuration**: `server/routers.ts`  
**Base Infrastructure**: `server/_core/trpc.ts`

**Router Categories**:

1. **Core** (5 routers):
   - system, auth, settings, users, userManagement

2. **Inventory Management** (10 routers):
   - inventory, strains, cogs, productIntake, samples
   - inventoryMovements, locations, warehouseTransfers
   - advancedTagFeatures, dataCardMetrics

3. **Order Management** (7 routers):
   - orders, orderEnhancements, salesSheets, salesSheetEnhancements
   - returns, refunds, matching

4. **Client/Vendor Management** (6 routers):
   - clients, clientNeeds, vendors, vendorSupply
   - purchaseOrders, poReceiving

5. **Accounting** (5 routers):
   - accounting, accountingHooks, credits, badDebt, auditLogs

6. **Dashboard & Analytics** (6 routers):
   - dashboard, dashboardEnhanced, dashboardPreferences
   - analytics, freeformNotes, scratchPad

7. **Pricing** (2 routers):
   - pricing, pricingDefaults

8. **Calendar & Tasks** (9 routers):
   - calendar, calendarParticipants, calendarReminders
   - calendarViews, calendarRecurrence, calendarMeetings
   - calendarFinancials, calendarInvitations
   - todoLists, todoTasks, todoActivity

9. **Communication** (2 routers):
   - comments, inbox

10. **VIP Portal** (2 routers):
    - vipPortal, vipPortalAdmin

11. **RBAC** (3 routers):
    - rbacUsers, rbacRoles, rbacPermissions

12. **Admin** (5 routers):
    - admin, adminImport, adminMigrations
    - adminQuickFix, adminSchemaPush

13. **Infrastructure** (4 routers):
    - configuration, workflowQueue, deployments
    - monitoring, search

### 2.2 tRPC Procedure Types

**Three Procedure Types**:

1. **publicProcedure**:
   - No authentication required
   - Error handling middleware applied
   - Used for: login, health checks, public endpoints

2. **protectedProcedure**:
   - Requires authentication
   - Error handling + sanitization middleware
   - Provisions public demo user as fallback
   - Used for: most application endpoints

3. **adminProcedure**:
   - Requires authentication + admin role
   - Error handling + sanitization middleware
   - Blocks public demo user (id: -1)
   - Used for: admin-only operations

**Middleware Stack**:

```typescript
publicProcedure.use(errorHandlingMiddleware);

protectedProcedure
  .use(errorHandlingMiddleware)
  .use(sanitizationMiddleware)
  .use(requireUser);

adminProcedure
  .use(errorHandlingMiddleware)
  .use(sanitizationMiddleware)
  .use(requireAdmin);
```

### 2.3 Service Layer

**Total Services**: 22 service files  
**Location**: `server/services/`

**Service Categories**:

1. **Business Logic**:
   - `marginCalculationService.ts` - Margin calculations
   - `priceCalculationService.ts` - Price calculations
   - `pricingService.ts` - Pricing rules engine
   - `orderValidationService.ts` - Order validation
   - `orderAuditService.ts` - Order audit trail

2. **RBAC & Permissions**:
   - `rbacDefinitions.ts` - Permission definitions (994 lines)
   - `seedRBAC.ts` - RBAC seeding
   - `permissionService.ts` - Permission checks
   - `todoPermissions.ts` - Todo-specific permissions

3. **Data Management**:
   - `liveCatalogService.ts` - VIP portal catalog
   - `strainService.ts` - Strain management
   - `seedDefaults.ts` - Default data seeding

4. **Integration**:
   - `cogsChangeIntegrationService.ts` - COGS change propagation
   - `priceAlertsService.ts` - Price alert notifications
   - `mentionParser.ts` - @mention parsing

5. **Database**:
   - `migrate.ts` - Database migrations
   - `pushSchema.ts` - Schema push utility

**Service Pattern**:

- Pure functions for business logic
- Exported functions (not classes)
- Imported by routers
- Testable in isolation

### 2.4 Database Access Layer

**ORM**: Drizzle ORM  
**Database**: MySQL (DigitalOcean Managed)  
**Schema**: `drizzle/schema.ts` (comprehensive)  
**Migrations**: `drizzle/` directory (15 migration files)

**Database Access Patterns**:

1. **Direct Drizzle Queries** (most common):

```typescript
const batches = await db.query.batches.findMany({
  where: eq(batches.status, "LIVE"),
  with: { product: true },
});
```

2. **Query Builder**:

```typescript
const result = await db
  .select()
  .from(batches)
  .where(eq(batches.status, "LIVE"));
```

3. **Transactions**:

```typescript
await db.transaction(async tx => {
  await tx.insert(orders).values(orderData);
  await tx.insert(orderItems).values(itemsData);
});
```

**Database Utilities**:

- `server/db/index.ts` - Database connection
- `server/_core/db.ts` - Re-exports for compatibility
- `server/db/queries/` - Complex queries

---

## 3. Database Architecture

### 3.1 Schema Overview

**Total Tables**: 107 tables  
**Schema File**: `drizzle/schema.ts`  
**Coverage**: 100% (all tables have data from DATA-001)

**Table Categories**:

1. **Core** (2 tables):
   - users, userDashboardPreferences

2. **Inventory** (20 tables):
   - vendors, vendorNotes, brands, strains, products
   - productSynonyms, productMedia, tags, productTags
   - lots, batches, batchLocations, paymentHistory
   - sales, cogsHistory, sequences
   - categories, subcategories, grades, locations

3. **Purchase Orders** (3 tables):
   - purchaseOrders, purchaseOrderItems, intakeSessions

4. **Orders & Sales** (10 tables):
   - orders, orderItems, quotes, quoteItems
   - returns, returnItems, refunds
   - salesSheets, salesSheetItems, samples

5. **Clients** (5 tables):
   - clients, clientNotes, clientNeeds
   - clientMeetingHistory, clientCommunications

6. **Accounting** (15 tables):
   - accounts, ledgerEntries, fiscalPeriods
   - invoices, invoiceLineItems, bills, billLineItems
   - payments, expenses, bankAccounts, bankTransactions
   - taxRates, journalEntries, accountsReceivable, accountsPayable

7. **Pricing** (5 tables):
   - pricingRules, pricingProfiles, clientPricingProfiles
   - priceAlerts, marginSettings

8. **Dashboard** (5 tables):
   - scratchPadNotes, dashboardWidgetLayouts
   - dashboardKpiConfigs, freeformNotes, dataCards

9. **Calendar** (10 tables):
   - calendarEvents, calendarParticipants
   - calendarReminders, calendarViews, calendarRecurrence
   - calendarMeetings, calendarFinancials
   - calendarEventInvitations, calendarInvitationSettings
   - calendarInvitationHistory

10. **Todo Lists** (3 tables):
    - todoLists, todoTasks, todoListShares

11. **Comments & Inbox** (2 tables):
    - comments, inboxItems

12. **VIP Portal** (5 tables):
    - vipPortalClients, vipPortalSessions
    - liveCatalogItems, liveCatalogViews
    - marketplaceListings

13. **RBAC** (5 tables):
    - roles, permissions, rolePermissions
    - userRoles, permissionCache

14. **Workflow** (3 tables):
    - workflowStatuses, workflowTransitions
    - workflowHistory

15. **Audit & Logs** (3 tables):
    - auditLogs, inventoryMovements, systemLogs

16. **Vendor Supply** (2 tables):
    - vendorSupply, vendorSupplyHistory

17. **Warehouse** (2 tables):
    - warehouseTransfers, warehouseTransferItems

18. **Settings** (2 tables):
    - systemSettings, userSettings

### 3.2 Key Relationships

**Core Relationships**:

1. **Inventory Flow**:

```
vendors → lots → batches → products
                    ↓
              batchLocations
                    ↓
              sales/orderItems
```

2. **Order Flow**:

```
clients → orders → orderItems → batches
            ↓
        invoices → invoiceLineItems
            ↓
        payments → ledgerEntries
```

3. **Accounting Flow**:

```
orders/bills → invoices/bills → payments
                    ↓
              ledgerEntries → accounts
                    ↓
              fiscalPeriods
```

4. **RBAC Flow**:

```
users → userRoles → roles → rolePermissions → permissions
```

5. **Calendar Flow**:

```
calendarEvents → calendarParticipants → users
       ↓
calendarReminders
       ↓
calendarInvitations → calendarInvitationSettings
```

### 3.3 Foreign Key Strategy

**Foreign Key Pattern**: Consistent across all tables

**Naming Convention**: `{table}_id` (e.g., `userId`, `batchId`, `orderId`)

**Cascade Behavior**:

- **CASCADE** (49 instances): Delete child records when parent deleted
- **SET NULL** (15 instances): Nullify reference when parent deleted
- **RESTRICT** (8 instances): Prevent deletion if children exist

**Soft Delete Support** (ST-013):

- `deletedAt` timestamp added to 44 tables
- Maintains audit trail for financial data
- Filters exclude soft-deleted records by default

**Indexes**:

- All foreign keys have indexes (PERF-001)
- Composite indexes for common query patterns
- 100+ indexes across schema

---

## 4. Integration Points

### 4.1 External Services

**Authentication**:

- Custom JWT-based authentication
- Session management via cookies
- RBAC with 5 roles, 50+ permissions

**Error Tracking**:

- Sentry integration (client + server)
- Automatic error capture
- Performance monitoring
- Source maps for production

**AI Services**:

- Gemini API (Google) - Code generation
- OpenAI API - Future features

**Communication**:

- Slack bot integration (mobile workflow)
- GitHub webhooks (deployment triggers)

**Infrastructure**:

- DigitalOcean App Platform (hosting)
- DigitalOcean Managed MySQL (database)
- UptimeRobot (health monitoring)

### 4.2 Internal Integration Patterns

**tRPC Client-Server Communication**:

```typescript
// Client-side
const { data } = trpc.inventory.list.useQuery({
  status: "LIVE",
});

// Server-side
export const inventoryRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string() }))
    .query(async ({ input }) => {
      return await db.query.batches.findMany({
        where: eq(batches.status, input.status),
      });
    }),
});
```

**Benefits**:

- End-to-end type safety
- Automatic serialization (SuperJSON)
- Built-in error handling
- Request batching

**Data Flow**:

```
User Action → React Component → tRPC Hook → HTTP Request
                                              ↓
                                        tRPC Router
                                              ↓
                                        Service Layer
                                              ↓
                                        Database (Drizzle)
                                              ↓
                                        Response → tRPC Hook → React Component
```

### 4.3 File Upload Integration

**Media Upload Flow**:

```
Client → Base64 Encoding → tRPC Mutation → Server
                                              ↓
                                        File System
                                              ↓
                                        Database Record
```

**Storage**:

- Files stored in `uploads/` directory
- Metadata stored in `productMedia` table
- Linked to products/batches

---

## 5. Architecture Patterns

### 5.1 Design Patterns Used

**Frontend Patterns**:

1. **Compound Components**: Complex UI components (Calendar, Dashboard)
2. **Render Props**: Flexible component composition
3. **Custom Hooks**: Reusable logic (useAuth, usePermissions)
4. **Context + Hooks**: Global state management
5. **Higher-Order Components**: ErrorBoundary

**Backend Patterns**:

1. **Repository Pattern**: Service layer abstracts database access
2. **Middleware Chain**: tRPC middleware for auth, sanitization, errors
3. **Factory Pattern**: Database connection management
4. **Strategy Pattern**: COGS calculation modes (FIXED, RANGE)
5. **Observer Pattern**: Event-driven updates (price alerts)

### 5.2 Architectural Decisions

**Why tRPC?**

- End-to-end type safety (TypeScript)
- No code generation needed
- Automatic API documentation
- Better DX than REST

**Why Drizzle ORM?**

- Type-safe queries
- Lightweight (no runtime overhead)
- SQL-like syntax
- Better performance than Prisma

**Why Wouter?**

- Lightweight (1.5KB vs 45KB for React Router)
- Simple API
- Sufficient for SPA routing

**Why React Query?**

- Automatic caching
- Background refetching
- Optimistic updates
- Server state management

**Why MySQL?**

- ACID compliance (financial data)
- Mature ecosystem
- DigitalOcean managed service
- Better for relational data than NoSQL

### 5.3 Scalability Considerations

**Current Limitations**:

- Single database instance (no read replicas)
- No caching layer (Redis not implemented)
- No CDN for static assets
- Limited horizontal scaling (2 instances)

**Scalability Improvements Needed**:

1. Add Redis for caching (session, query results)
2. Implement read replicas for database
3. Add CDN for static assets
4. Implement connection pooling (REL-004)
5. Add API rate limiting (ST-018)
6. Implement pagination (PERF-003)

---

## 6. Security Architecture

### 6.1 Authentication Flow

**JWT-Based Authentication**:

```
Login → Verify Credentials → Generate JWT → Set Cookie
                                              ↓
                                        Client Stores Cookie
                                              ↓
                                        Subsequent Requests Include Cookie
                                              ↓
                                        Server Verifies JWT
```

**Session Management**:

- JWT stored in HTTP-only cookie
- 7-day expiration
- Refresh token not implemented (future)

### 6.2 Authorization (RBAC)

**5 Roles**:

1. Super Admin - Full system access
2. Admin - Administrative access
3. Manager - Management functions
4. User - Standard user access
5. Guest - Limited read-only access

**50+ Permissions**:

- Granular permissions per resource
- Permission caching for performance
- Role-based permission inheritance

**Permission Check Flow**:

```
Request → requirePermission() → Check Cache
                                    ↓
                              Load User Roles
                                    ↓
                              Load Role Permissions
                                    ↓
                              Check Permission
                                    ↓
                              Allow/Deny
```

### 6.3 Input Sanitization

**XSS Prevention**:

- Automatic sanitization middleware
- HTML entity encoding
- React's built-in XSS protection

**SQL Injection Prevention**:

- Parameterized queries (Drizzle)
- No raw SQL with string interpolation
- Input validation with Zod

**CSRF Protection**:

- SameSite cookies
- tRPC built-in protection

---

## 7. Performance Architecture

### 7.1 Frontend Performance

**Optimization Techniques**:

1. **Code Splitting**: Lazy loading for routes
2. **React.memo**: 17 components memoized (PERF-002)
3. **useCallback**: Event handler optimization
4. **useMemo**: Expensive computation caching
5. **Virtual Scrolling**: Large lists (not yet implemented)

**Bundle Optimization**:

- Vite for fast builds
- Tree shaking
- Minification
- Source maps for production

**Caching Strategy**:

- React Query: 5-minute stale time
- LocalStorage: Theme, dashboard preferences
- Service Worker: Not implemented

### 7.2 Backend Performance

**Database Optimization**:

- Indexes on all foreign keys (PERF-001)
- Query optimization (avoid N+1)
- Connection pooling (needs improvement - REL-004)
- Row-level locking for transactions (DATA-003)

**API Optimization**:

- Request batching (tRPC)
- Response compression
- Pagination (needs implementation - PERF-003)

**Caching**:

- Permission cache (in-memory)
- No Redis cache (future improvement)

---

## 8. Key Insights

### 8.1 Architectural Strengths

✅ **Type Safety**: End-to-end TypeScript with tRPC  
✅ **Modularity**: 67 routers, 22 services, clear separation  
✅ **Scalability**: Service layer enables horizontal scaling  
✅ **Maintainability**: Clear patterns, consistent structure  
✅ **Security**: RBAC, input sanitization, JWT auth  
✅ **Developer Experience**: tRPC + Drizzle = excellent DX

### 8.2 Architectural Weaknesses

⚠️ **No Caching Layer**: Redis not implemented  
⚠️ **Limited Pagination**: Most endpoints return all records  
⚠️ **Large Routers**: Some routers >1000 lines (needs refactoring)  
⚠️ **No Read Replicas**: Single database instance  
⚠️ **No CDN**: Static assets served from app server  
⚠️ **Connection Pool**: Too small (10 connections)

### 8.3 Architecture Score: 8/10

**Excellent foundation** with modern patterns and type safety. Needs caching, pagination, and performance optimization for scale.

---

## 9. Recommendations

### 9.1 Immediate Improvements

1. **Implement Pagination** (PERF-003)
   - Add to all list endpoints
   - Default limit: 50, max: 500
   - Cursor-based for large datasets

2. **Refactor Large Routers**
   - Extract business logic to services
   - Split routers by subdomain
   - Target: <500 lines per router

3. **Add API Rate Limiting** (ST-018)
   - 100 requests/minute per user
   - 1000 requests/minute per IP
   - Prevent API abuse

### 9.2 Medium-Term Improvements

1. **Implement Redis Caching**
   - Session storage
   - Query result caching
   - Permission cache

2. **Add Read Replicas**
   - Separate read/write databases
   - Load balancing for reads
   - Improved performance

3. **Optimize Connection Pool** (REL-004)
   - Increase from 10 to 25 connections
   - Add queue limit (100)
   - Monitor pool utilization

### 9.3 Long-Term Improvements

1. **Microservices Architecture**
   - Split by domain (inventory, orders, accounting)
   - Independent scaling
   - Better fault isolation

2. **Event-Driven Architecture**
   - Message queue (RabbitMQ/Kafka)
   - Async processing
   - Better scalability

3. **GraphQL Federation**
   - Alternative to tRPC for external APIs
   - Better for mobile apps
   - More flexible queries

---

## 10. Next Steps

### Phase 3: Code Quality Analysis

**Objectives**:

- Deep dive into TypeScript quality
- React component analysis
- Testing quality assessment
- Performance profiling

**Estimated Time**: 3-4 hours

---

**Phase 2 Status**: ✅ COMPLETE  
**Next Phase**: Phase 3 - Code Quality Analysis  
**Generated**: December 2, 2025  
**Reviewer**: Kiro AI Agent (Roadmap Manager)
