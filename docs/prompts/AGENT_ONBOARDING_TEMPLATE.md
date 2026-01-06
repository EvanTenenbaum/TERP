# TERP Agent Onboarding Template

**Purpose:** This template provides all context a new agent needs to work on TERP effectively. Include this at the start of any task prompt.

---

## 🏢 Project Overview

**TERP** is a comprehensive ERP (Enterprise Resource Planning) system for cannabis businesses. It manages:

- **Inventory**: Products, batches, vendors, purchase orders
- **Sales**: Clients, orders, quotes, invoices, payments
- **VIP Portal**: Client-facing mobile/desktop portal for self-service
- **Accounting**: AR/AP, ledger, bank reconciliation
- **Operations**: Calendar, tasks, notifications, analytics

**Production URL:** https://terp-app-b9s35.ondigitalocean.app

---

## 🛠️ Tech Stack

| Layer        | Technology                                         |
| ------------ | -------------------------------------------------- |
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui |
| **Backend**  | Node.js, Express, tRPC                             |
| **Database** | MySQL (TiDB), Drizzle ORM                          |
| **Auth**     | Custom JWT-based auth                              |
| **Hosting**  | DigitalOcean App Platform                          |
| **Testing**  | Vitest (unit), Playwright (e2e)                    |

---

## 📁 Repository Structure

```
TERP/
├── client/                 # React frontend
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── pages/          # Page components (routes)
│       ├── hooks/          # Custom React hooks
│       └── lib/            # Utilities (trpc client, etc.)
├── server/                 # Node.js backend
│   ├── routers/            # tRPC routers (API endpoints)
│   ├── services/           # Business logic
│   ├── _core/              # Core infrastructure (auth, context)
│   └── db.ts               # Database connection
├── drizzle/
│   ├── schema.ts           # Database schema (Drizzle ORM)
│   └── migrations/         # SQL migration files
├── docs/                   # Documentation
│   ├── roadmaps/           # Strategic roadmaps
│   ├── prompts/            # Agent prompts
│   └── specs/              # Feature specifications
├── tests/                  # Test files
└── .kiro/steering/         # Agent steering files
```

---

## 🚨 CRITICAL CONSTRAINTS

### NEVER DO (Will Break Production):

```
❌ Modify drizzle/schema.ts without explicit approval
❌ Run migrations without explicit approval
❌ Add database columns
❌ Use drizzle-kit push
❌ Use `: any` types in TypeScript
❌ Add @ts-nocheck or @ts-ignore
❌ Skip tests before committing
❌ Push to main without verification
❌ Edit files another agent is working on
```

### ALWAYS DO:

```
✅ Run pnpm check after EVERY code change
✅ Run pnpm test after EVERY code change
✅ Commit working code frequently
✅ Verify deployment succeeds before marking complete
✅ Document issues you cannot resolve
✅ Use existing schema columns only
✅ Follow TDD (write tests first)
```

---

## 🔧 Development Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# TypeScript check (MUST pass before commit)
pnpm check

# Run tests (MUST pass before commit)
pnpm test

# Run linting
pnpm lint

# Build for production
pnpm build
```

---

## 🔐 Authentication & Testing

### Login to Production Site

```bash
# Go to /login and use your credentials
# Or use the admin setup script:
pnpm setup:admin your-email@example.com YourPassword123!
```

### Test Accounts (for E2E Testing)

| Email                            | Role               | Password             |
| -------------------------------- | ------------------ | -------------------- |
| test-superadmin@terp-app.local   | Super Admin        | TestSuperAdmin123!   |
| test-owner@terp-app.local        | Owner/Executive    | TestOwner123!        |
| test-opsmanager@terp-app.local   | Operations Manager | TestOpsManager123!   |
| test-salesmanager@terp-app.local | Sales Manager      | TestSalesManager123! |
| test-accountant@terp-app.local   | Accountant         | TestAccountant123!   |
| test-invmanager@terp-app.local   | Inventory Manager  | TestInvManager123!   |
| test-buyer@terp-app.local        | Buyer/Procurement  | TestBuyer123!        |
| test-custservice@terp-app.local  | Customer Service   | TestCustService123!  |
| test-warehouse@terp-app.local    | Warehouse Staff    | TestWarehouse123!    |
| test-auditor@terp-app.local      | Read-Only Auditor  | TestAuditor123!      |

To seed test accounts: `pnpm seed:test-accounts`

### Get Auth Token for Browser Automation

```bash
# Enable test auth (if not already)
# Set ENABLE_TEST_AUTH=true in .env

# Get token for any test account
pnpm get:auth-token test-superadmin@terp-app.local TestSuperAdmin123! https://terp-app-b9s35.ondigitalocean.app

# Use in Playwright/Puppeteer:
await context.addCookies([{
  name: 'app_session_id',
  value: '<token>',
  domain: 'terp-app-b9s35.ondigitalocean.app',
  path: '/'
}]);
```

### Auth System Details

- **Cookie Name**: `app_session_id`
- **Token Type**: JWT (30-day expiry)
- **Super Admin**: Users with "Super Admin" RBAC role OR `role='admin'` bypass all permission checks
- **Documentation**: See [docs/AUTH_SETUP.md](../AUTH_SETUP.md) for full details

---

## 📊 Current Technical State

### @ts-nocheck Files (Need Fixing)

These files have TypeScript errors suppressed and need proper fixes:

**Server Routers (11 files):**

- server/routers/alerts.ts
- server/routers/audit.ts
- server/routers/referrals.ts
- server/routers/receipts.ts
- server/routers/flowerIntake.ts
- server/routers/inventoryShrinkage.ts
- server/routers/photography.ts
- server/routers/quickCustomer.ts
- server/routers/customerPreferences.ts
- server/routers/vendorReminders.ts
- server/routers/analytics.ts

**Client Pages (10 files):**

- client/src/pages/Inventory.tsx
- client/src/pages/OrderCreatorPage.tsx
- client/src/pages/vip-portal/VIPDashboard.tsx
- client/src/pages/accounting/Invoices.tsx
- client/src/pages/UnifiedSalesPortalPage.tsx
- client/src/pages/PhotographyPage.tsx
- client/src/pages/NotificationsPage.tsx
- client/src/pages/settings/FeatureFlagsPage.tsx
- client/src/pages/settings/NotificationPreferences.tsx
- client/src/pages/InterestListPage.tsx

---

## 📋 Schema Reference (Actual Column Names)

### Products Table

```typescript
// ✅ EXIST:
(products.id, products.brandId, products.strainId);
products.nameCanonical; // NOT "name"
(products.category, products.subcategory);
(products.uomSellable, products.description);
(products.createdAt, products.updatedAt, products.deletedAt);

// ❌ DO NOT EXIST:
products.name; // Use nameCanonical
products.sku; // SKU is on batches
products.minStockLevel; // Does not exist
products.targetStockLevel; // Does not exist
```

### Batches Table

```typescript
// ✅ EXIST:
(batches.id, batches.code, batches.sku);
(batches.productId, batches.lotId);
(batches.batchStatus, batches.grade);
batches.onHandQty; // NOT "quantity"
(batches.sampleQty, batches.reservedQty);
batches.metadata; // JSON field

// ❌ DO NOT EXIST:
batches.quantity; // Use onHandQty
batches.batchNumber; // Use code
```

### Clients Table

```typescript
// ✅ EXIST:
(clients.id, clients.teriCode, clients.name);
(clients.email, clients.phone, clients.address);
(clients.isBuyer, clients.isSeller);
(clients.vipPortalEnabled, clients.creditLimit);
clients.totalOwed;

// ❌ DO NOT EXIST:
clients.tier; // Does not exist
clients.clientType; // Use isBuyer/isSeller flags
```

---

## 🔄 Git Workflow

```bash
# Before starting work
git pull origin main
pnpm install
pnpm check  # Must pass

# After making changes
pnpm check  # Must pass
pnpm test   # Must pass

# Commit
git add -A
git commit -m "type(scope): description"

# Push
git push origin main

# Verify deployment (MANDATORY)
# Check .github/BUILD_STATUS.md on build-status branch
git fetch origin build-status
git show origin/build-status:.github/BUILD_STATUS.md
```

### Commit Message Format

```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Scope: component/feature name
Description: imperative mood, lowercase, no period
```

---

## 🚀 Deployment Verification

**CRITICAL:** Every push to main triggers a deployment. You MUST verify it succeeds.

```bash
# Check deployment status
git fetch origin build-status
git show origin/build-status:.github/BUILD_STATUS.md

# Expected output shows:
# - Commit SHA matching your push
# - Status: success
# - Timestamp of completion
```

If deployment fails:

1. Check the error message
2. Fix the issue locally
3. Push the fix
4. Verify again

**Never report "task complete" without deployment verification.**

---

## 📚 Key Documentation

| Document                                     | Purpose                   |
| -------------------------------------------- | ------------------------- |
| `docs/roadmaps/LIFECYCLE_ROADMAP_Q1_2026.md` | Current strategic roadmap |
| `docs/roadmaps/MASTER_ROADMAP.md`            | All tasks and status      |
| `.kiro/steering/01-development-standards.md` | Coding standards          |
| `.kiro/steering/06-architecture-guide.md`    | System architecture       |
| `docs/DEVELOPMENT_PROTOCOLS.md`              | Development protocols     |

---

## ⚠️ Common Pitfalls

1. **Schema Mismatch:** Code references columns that don't exist. Always check `drizzle/schema.ts` for actual column names.

2. **Type Errors:** Many files have `@ts-nocheck`. When fixing, expect null/undefined handling issues.

3. **Price Types:** Prices in schema are `varchar` (strings), not numbers. Parse when needed.

4. **Soft Deletes:** Many tables use `deletedAt` for soft deletes. Filter appropriately.

5. **JSON Fields:** Some data is stored in JSON columns (e.g., `batches.metadata`). Parse carefully.

---

## 🆘 Escalation

If you encounter issues you cannot resolve:

1. **Document the issue** in a `BLOCKERS.md` file
2. **Include:**
   - File name and line number
   - Exact error message
   - What you tried
   - Why it didn't work
3. **Do NOT add workarounds** (@ts-nocheck, any types)
4. **Move to next task** and flag for human review

---

## ✅ Pre-Work Checklist

Before starting any task, verify:

- [ ] `git pull origin main` completed
- [ ] `pnpm install` completed
- [ ] `pnpm check` passes with 0 errors
- [ ] You understand the task requirements
- [ ] You know which files you'll modify
- [ ] No other agent is working on those files

---

_This onboarding template should be included at the start of every agent task prompt._
