# PARALLEL Wave 1: Sales Lifecycle - Agent Prompt

**⚡ PARALLEL EXECUTION MODE**
You are running in parallel with Wave 3 (Inventory) and Wave 4 (Operations).
DO NOT touch files outside your assigned scope.

---

# PART 1: AGENT ONBOARDING

## 🏢 Project Overview

**TERP** is a comprehensive ERP system for cannabis businesses managing inventory, sales, VIP portal, accounting, and operations.

**Production URL:** https://terp-app-b9s35.ondigitalocean.app
**Repository:** https://github.com/EvanTenenbaum/TERP

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui |
| **Backend** | Node.js, Express, tRPC |
| **Database** | MySQL (TiDB), Drizzle ORM |

---

## 🚨 CRITICAL CONSTRAINTS

### NEVER DO:
```
❌ Modify drizzle/schema.ts
❌ Run migrations
❌ Use `: any` types
❌ Add @ts-nocheck or @ts-ignore
❌ Touch files outside YOUR SCOPE (see below)
```

### ALWAYS DO:
```
✅ Run pnpm check after EVERY change
✅ Run pnpm test after EVERY change
✅ Commit frequently with clear messages
✅ Verify deployment succeeds
```

---

## 🔒 YOUR EXCLUSIVE FILE SCOPE

**You own these files - ONLY touch these:**

### Client Pages
```
client/src/pages/UnifiedSalesPortalPage.tsx  ← PRIMARY TARGET
client/src/pages/Quotes.tsx
client/src/pages/Orders.tsx
client/src/pages/accounting/Payments.tsx
```

### Server Routers
```
server/routers/orders.ts
server/routers/quotes.ts
server/routers/unifiedSalesPortal.ts  ← HAS @ts-nocheck
```

### Shared (READ ONLY - coordinate before editing)
```
server/routers/accounting.ts  ← Shared with Wave 4
server/routers/clients.ts     ← Shared - READ ONLY
```

**⛔ DO NOT TOUCH (Other agents own these):**
```
# Wave 3 owns:
client/src/pages/PhotographyPage.tsx
server/routers/photography.ts
server/routers/inventory.ts

# Wave 4 owns:
client/src/pages/NotificationsPage.tsx
client/src/pages/settings/NotificationPreferences.tsx
server/routers/notifications.ts
server/routers/calendar.ts
```

---

## 📋 Schema Reference

### Orders Table
```typescript
orders.id, orders.orderNumber, orders.orderType
orders.clientId, orders.isDraft
orders.items (JSON), orders.subtotal, orders.total
orders.quoteStatus, orders.saleStatus
orders.fulfillmentStatus, orders.invoiceId
```

### Clients Table
```typescript
clients.id, clients.teriCode, clients.name
clients.email, clients.phone
clients.isBuyer, clients.isSeller
clients.creditLimit, clients.totalOwed
```

---

# PART 2: YOUR TASK - SALES LIFECYCLE

## 🎯 Mission

Ensure users can complete the entire sales lifecycle.

**Goal:** Client → Quote → Order → Pick & Pack → Invoice → Payment
**Estimated Time:** 13-21 hours

---

## 📋 Task Checklist

### Task 1: Fix UnifiedSalesPortalPage (3-4 hours)
**Path:** `client/src/pages/UnifiedSalesPortalPage.tsx`

```bash
# Check if it has @ts-nocheck
head -3 client/src/pages/UnifiedSalesPortalPage.tsx

# If yes, remove and fix
sed -i '1d' client/src/pages/UnifiedSalesPortalPage.tsx
pnpm check 2>&1 | grep "UnifiedSalesPortalPage"
```

**Likely Issues:**
- Client selection type mismatches
- Order item calculations
- Status enum handling

### Task 2: Fix unifiedSalesPortal Router (3-4 hours)
**Path:** `server/routers/unifiedSalesPortal.ts`

```bash
head -3 server/routers/unifiedSalesPortal.ts
# If @ts-nocheck, remove and fix
```

### Task 3: Verify Quote → Order Flow (2-3 hours)

Test the complete flow:
1. Create a new quote for a client
2. Add items to the quote
3. Convert quote to order
4. Verify order appears in orders list

### Task 4: Verify Order → Invoice → Payment Flow (3-4 hours)

Test:
1. Generate invoice from order
2. Record payment against invoice
3. Verify client's totalOwed updates

---

## 🔧 Common Fixes

### Fix 1: Client Type Handling
```typescript
// Before (error)
const clientName = client.name;

// After (fixed - handle undefined)
const clientName = client?.name ?? 'Unknown Client';
```

### Fix 2: Order Items (JSON field)
```typescript
// Items are stored as JSON
const items = typeof order.items === 'string' 
  ? JSON.parse(order.items) 
  : order.items;
```

### Fix 3: Price Calculations
```typescript
// Prices may be strings in schema
const total = parseFloat(order.total ?? '0');
```

---

## ✅ Exit Criteria

Wave 1 is complete when:

- [ ] `UnifiedSalesPortalPage.tsx` has no @ts-nocheck
- [ ] `server/routers/unifiedSalesPortal.ts` has no @ts-nocheck
- [ ] Can create quote and convert to order
- [ ] Can generate invoice from order
- [ ] Can record payment
- [ ] `pnpm check` passes
- [ ] `pnpm test` passes
- [ ] Deployment verified

---

## 🔄 Git Workflow

```bash
# After each fix
pnpm check && pnpm test
git add -A
git commit -m "fix(sales): [description]"
git push origin main

# Verify deployment
git fetch origin build-status
git show origin/build-status:.github/BUILD_STATUS.md
```

---

## 🆘 Escalation

If blocked:
1. Document in `WAVE_1_BLOCKERS.md`
2. Move to next task
3. Flag for human review

---

## 🚀 Getting Started

```bash
cd ~/TERP
git pull origin main
pnpm install
pnpm check  # Must pass (Wave 0 complete)

# Start with UnifiedSalesPortalPage
head -3 client/src/pages/UnifiedSalesPortalPage.tsx
```

**Remember: Stay in your lane - only touch YOUR files!**
