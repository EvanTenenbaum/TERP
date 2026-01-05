# Wave 0: Foundation - Complete Agent Prompt

**Copy this entire prompt to give to a new agent.**

---

# PART 1: AGENT ONBOARDING

## 🏢 Project Overview

**TERP** is a comprehensive ERP (Enterprise Resource Planning) system for cannabis businesses. It manages:
- **Inventory**: Products, batches, vendors, purchase orders
- **Sales**: Clients, orders, quotes, invoices, payments
- **VIP Portal**: Client-facing mobile/desktop portal for self-service
- **Accounting**: AR/AP, ledger, bank reconciliation
- **Operations**: Calendar, tasks, notifications, analytics

**Production URL:** https://terp-app-b9s35.ondigitalocean.app
**Repository:** https://github.com/EvanTenenbaum/TERP

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui |
| **Backend** | Node.js, Express, tRPC |
| **Database** | MySQL (TiDB), Drizzle ORM |
| **Auth** | Custom JWT-based auth |
| **Hosting** | DigitalOcean App Platform |
| **Testing** | Vitest (unit), Playwright (e2e) |

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
└── tests/                  # Test files
```

---

## 🚨 CRITICAL CONSTRAINTS

### NEVER DO (Will Break Production):
```
❌ Modify drizzle/schema.ts
❌ Run migrations
❌ Add database columns
❌ Use drizzle-kit push
❌ Use `: any` types in TypeScript
❌ Add @ts-nocheck or @ts-ignore
❌ Skip tests before committing
❌ Push to main without verification
```

### ALWAYS DO:
```
✅ Run pnpm check after EVERY code change
✅ Run pnpm test after EVERY code change
✅ Commit working code frequently
✅ Verify deployment succeeds before marking complete
✅ Document issues you cannot resolve
✅ Use existing schema columns only
```

---

## 🔧 Development Commands

```bash
# Install dependencies
pnpm install

# TypeScript check (MUST pass before commit)
pnpm check

# Run tests (MUST pass before commit)
pnpm test

# Run linting
pnpm lint
```

---

## 📋 Schema Reference (Actual Column Names)

### Products Table
```typescript
// ✅ EXIST:
products.id, products.brandId, products.strainId
products.nameCanonical  // NOT "name"
products.category, products.subcategory

// ❌ DO NOT EXIST:
products.name           // Use nameCanonical
products.sku            // SKU is on batches
products.minStockLevel  // Does not exist
```

### Batches Table
```typescript
// ✅ EXIST:
batches.id, batches.code, batches.sku
batches.productId, batches.lotId
batches.onHandQty       // NOT "quantity"
batches.metadata        // JSON field

// ❌ DO NOT EXIST:
batches.quantity        // Use onHandQty
batches.batchNumber     // Use code
```

### Clients Table
```typescript
// ✅ EXIST:
clients.id, clients.teriCode, clients.name
clients.email, clients.phone
clients.isBuyer, clients.isSeller
clients.vipPortalEnabled, clients.creditLimit

// ❌ DO NOT EXIST:
clients.tier            // Does not exist
clients.clientType      // Use isBuyer/isSeller flags
```

---

## 🔄 Git Workflow

```bash
# After making changes
pnpm check  # Must pass
pnpm test   # Must pass

# Commit
git add -A
git commit -m "fix(scope): description"

# Push
git push origin main

# Verify deployment (MANDATORY)
git fetch origin build-status
git show origin/build-status:.github/BUILD_STATUS.md
```

---

# PART 2: YOUR TASK - WAVE 0 FOUNDATION

## 🎯 Mission

Remove `@ts-nocheck` from the 4 core workflow pages so users can complete end-to-end business processes.

**Priority:** BLOCKING - All other work depends on this
**Estimated Time:** 8-16 hours

---

## 📁 Target Files (Priority Order)

### 1. Inventory.tsx (Inventory Lifecycle)
**Path:** `client/src/pages/Inventory.tsx`
**Impact:** Users cannot view inventory batches

### 2. OrderCreatorPage.tsx (Sales Lifecycle)
**Path:** `client/src/pages/OrderCreatorPage.tsx`
**Impact:** Users cannot create orders

### 3. VIPDashboard.tsx (VIP Portal Lifecycle)
**Path:** `client/src/pages/vip-portal/VIPDashboard.tsx`
**Impact:** Clients cannot use VIP portal

### 4. Invoices.tsx (Financial Lifecycle)
**Path:** `client/src/pages/accounting/Invoices.tsx`
**Impact:** Users cannot manage invoices

---

## 🔧 Fix Strategy

### Step 1: Identify the Errors

For each file, remove the @ts-nocheck comment and run:

```bash
# Remove @ts-nocheck from the file
sed -i '1d' client/src/pages/Inventory.tsx

# Check what errors appear
pnpm check 2>&1 | grep "Inventory.tsx"
```

### Step 2: Categorize Errors

Most errors will be one of these types:

| Error Type | Example | Fix |
|------------|---------|-----|
| **Null/undefined mismatch** | `Type 'string \| undefined' is not assignable to type 'string'` | Add `?.` or `??` |
| **Property doesn't exist** | `Property 'name' does not exist on type` | Use correct property name |
| **Type inference failure** | `Argument of type 'X' is not assignable` | Add explicit type annotations |

### Step 3: Common Fixes

#### Fix 1: Null/Undefined Handling
```typescript
// Before (error)
const name = client.name;

// After (fixed)
const name = client?.name ?? 'Unknown';
```

#### Fix 2: Property Name Mismatch
```typescript
// Before (error - products.name doesn't exist)
const productName = product.name;

// After (fixed - use actual column name)
const productName = product.nameCanonical;
```

#### Fix 3: Type Narrowing
```typescript
// Before (error)
function handleClient(client: Client | undefined) {
  return client.name; // Error: client might be undefined
}

// After (fixed)
function handleClient(client: Client | undefined) {
  if (!client) return 'Unknown';
  return client.name;
}
```

#### Fix 4: Explicit Type Annotations
```typescript
// Before (error - type inference fails)
const [data, setData] = useState([]);

// After (fixed)
const [data, setData] = useState<BatchWithDetails[]>([]);
```

---

## 📝 File-Specific Guidance

### Inventory.tsx
**Likely Issues:**
1. Batch type mismatches (quantity vs onHandQty)
2. Product name references (name vs nameCanonical)
3. Null handling for optional fields

### OrderCreatorPage.tsx
**Likely Issues:**
1. Client type mismatches
2. Order item type definitions
3. Price calculation types (string vs number)

**Note:** Prices in the schema are often `varchar` (strings), not numbers.

### VIPDashboard.tsx
**Likely Issues:**
1. VIP portal config type mismatches
2. Module enable/disable flags
3. Client data type mismatches

### Invoices.tsx
**Likely Issues:**
1. Invoice line item types
2. Payment status types
3. Date handling (Date vs string)

---

## ✅ Testing Each Fix

After fixing each file:

```bash
# 1. Check TypeScript compiles
pnpm check

# 2. Run tests
pnpm test

# 3. If both pass, commit
git add -A
git commit -m "fix: remove @ts-nocheck from [filename]"
```

---

## 🏁 Exit Criteria

Wave 0 is complete when:

- [ ] `client/src/pages/Inventory.tsx` has no @ts-nocheck
- [ ] `client/src/pages/OrderCreatorPage.tsx` has no @ts-nocheck
- [ ] `client/src/pages/vip-portal/VIPDashboard.tsx` has no @ts-nocheck
- [ ] `client/src/pages/accounting/Invoices.tsx` has no @ts-nocheck
- [ ] `pnpm check` passes with 0 errors
- [ ] `pnpm test` passes
- [ ] All changes committed and pushed
- [ ] Deployment verified successful

---

## 🆘 Escalation

If you encounter issues you cannot resolve:

1. **Document the exact error** in `WAVE_0_BLOCKERS.md`
2. **Include:**
   - File name
   - Line number
   - Exact error message
   - What you tried
   - Why it didn't work
3. **Do NOT add @ts-nocheck back**
4. **Move to the next file** and continue

---

## 📊 Success Verification

When you think you're done:

```bash
# Full verification
cd ~/TERP
git pull origin main
pnpm install
pnpm check    # Must show 0 errors
pnpm test     # Must pass

# Verify no @ts-nocheck in target files
grep -l "@ts-nocheck" client/src/pages/Inventory.tsx client/src/pages/OrderCreatorPage.tsx client/src/pages/vip-portal/VIPDashboard.tsx client/src/pages/accounting/Invoices.tsx
# Should return nothing (no matches)

# Verify deployment
git fetch origin build-status
git show origin/build-status:.github/BUILD_STATUS.md
```

---

## 🚀 Getting Started

```bash
# 1. Clone the repository
gh repo clone EvanTenenbaum/TERP
cd TERP

# 2. Install dependencies
pnpm install

# 3. Verify starting state
pnpm check  # Should show 0 errors

# 4. Start with first file
sed -i '1d' client/src/pages/Inventory.tsx
pnpm check 2>&1 | grep "Inventory.tsx"

# 5. Fix errors, test, commit, repeat
```

**Good luck! Remember: NO schema changes, code-only fixes.**
