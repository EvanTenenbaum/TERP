# Wave 1: Complete Sales Lifecycle - Complete Agent Prompt

**Copy this entire prompt to give to a new agent.**
**Prerequisites:** Wave 0 must be complete before starting Wave 1.

---

# PART 1: AGENT ONBOARDING

## 🏢 Project Overview

**TERP** is a comprehensive ERP system for cannabis businesses managing inventory, sales, VIP portal, accounting, and operations.

**Production URL:** https://terp-app-b9s35.ondigitalocean.app
**Repository:** https://github.com/EvanTenenbaum/TERP

---

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
❌ Add database columns
❌ Use `: any` types
❌ Add @ts-nocheck or @ts-ignore
❌ Skip tests before committing
```

### ALWAYS DO:
```
✅ Run pnpm check after EVERY change
✅ Run pnpm test after EVERY change
✅ Commit frequently
✅ Verify deployment succeeds
```

---

## 📋 Schema Reference

### Orders Table
```typescript
// ✅ EXIST:
orders.id, orders.orderNumber, orders.orderType
orders.clientId, orders.isDraft
orders.items (JSON), orders.subtotal, orders.total
orders.quoteStatus, orders.saleStatus
orders.fulfillmentStatus, orders.invoiceId
```

### Clients Table
```typescript
// ✅ EXIST:
clients.id, clients.teriCode, clients.name
clients.email, clients.phone
clients.isBuyer, clients.isSeller
clients.creditLimit, clients.totalOwed
```

### Invoices Table
```typescript
// ✅ EXIST:
invoices.id, invoices.invoiceNumber
invoices.orderId, invoices.clientId
invoices.status, invoices.total
invoices.dueDate, invoices.paidAmount
```

---

# PART 2: YOUR TASK - WAVE 1 SALES LIFECYCLE

## 🎯 Mission

Ensure users can complete the entire sales lifecycle from client selection to payment collection.

**Goal:** User can complete: Client → Quote → Order → Pick & Pack → Invoice → Payment
**Estimated Time:** 13-21 hours
**Dependencies:** Wave 0 complete

---

## 📋 Task Checklist

### Task 1: Fix UnifiedSalesPortalPage (3-4 hours)
**Path:** `client/src/pages/UnifiedSalesPortalPage.tsx`

```bash
# Remove @ts-nocheck and check errors
sed -i '1d' client/src/pages/UnifiedSalesPortalPage.tsx
pnpm check 2>&1 | grep "UnifiedSalesPortalPage"
```

**Likely Issues:**
- Client selection type mismatches
- Order item calculations
- Status enum handling

### Task 2: Verify Quote → Order Flow (2-3 hours)

Test the complete flow:
1. Create a new quote for a client
2. Add items to the quote
3. Convert quote to order
4. Verify order appears in orders list

**Files to check:**
- `server/routers/orders.ts`
- `server/routers/quotes.ts`
- `client/src/pages/Quotes.tsx`
- `client/src/pages/Orders.tsx`

### Task 3: Verify Order → Invoice Flow (2-3 hours)

Test the complete flow:
1. Take an existing order
2. Generate invoice from order
3. Verify invoice appears in invoices list
4. Verify invoice totals match order

**Files to check:**
- `server/routers/accounting.ts`
- `client/src/pages/accounting/Invoices.tsx`

### Task 4: Verify Invoice → Payment Flow (2-3 hours)

Test the complete flow:
1. Take an existing invoice
2. Record a payment against it
3. Verify payment reduces balance
4. Verify client's totalOwed updates

**Files to check:**
- `server/routers/accounting.ts`
- `client/src/pages/accounting/Payments.tsx`

### Task 5: Fix Any Blocking Bugs (4-8 hours)

Based on testing, fix any bugs that prevent completing the sales lifecycle.

**Common issues:**
- Type mismatches between frontend and backend
- Missing null checks
- Incorrect status transitions

---

## 🧪 End-to-End Test Script

Create and run this test to verify the complete flow:

```typescript
// tests/e2e/sales-lifecycle.spec.ts
import { test, expect } from '@playwright/test';

test('complete sales lifecycle', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  // ... login steps

  // 2. Create client (or use existing)
  await page.goto('/clients');
  // ... verify client exists

  // 3. Create quote
  await page.goto('/quotes');
  await page.click('[data-testid="new-quote"]');
  // ... create quote

  // 4. Convert to order
  await page.click('[data-testid="convert-to-order"]');
  await expect(page.locator('[data-testid="order-status"]')).toHaveText('PENDING');

  // 5. Generate invoice
  await page.click('[data-testid="generate-invoice"]');
  await expect(page.locator('[data-testid="invoice-number"]')).toBeVisible();

  // 6. Record payment
  await page.click('[data-testid="record-payment"]');
  // ... record payment
  await expect(page.locator('[data-testid="invoice-status"]')).toHaveText('PAID');
});
```

---

## ✅ Exit Criteria

Wave 1 is complete when:

- [ ] `UnifiedSalesPortalPage.tsx` has no @ts-nocheck
- [ ] Can create a new client
- [ ] Can create a quote for a client
- [ ] Can convert quote to order
- [ ] Can fulfill order (pick & pack)
- [ ] Can generate invoice from order
- [ ] Can record payment against invoice
- [ ] `pnpm check` passes
- [ ] `pnpm test` passes
- [ ] Deployment verified successful

---

## 🔄 Git Workflow

```bash
# After each task
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

If you encounter issues:
1. Document in `WAVE_1_BLOCKERS.md`
2. Include file, line, error, attempts
3. Move to next task
4. Flag for human review

---

## 🚀 Getting Started

```bash
cd ~/TERP
git pull origin main
pnpm install
pnpm check  # Must pass (Wave 0 should be complete)

# Start with UnifiedSalesPortalPage
sed -i '1d' client/src/pages/UnifiedSalesPortalPage.tsx
pnpm check 2>&1 | grep "UnifiedSalesPortalPage"
```

**Good luck! Focus on completing the entire sales workflow end-to-end.**
