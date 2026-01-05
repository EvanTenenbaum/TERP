# Wave 2: Complete VIP Portal Lifecycle - Complete Agent Prompt

**Copy this entire prompt to give to a new agent.**
**Prerequisites:** Wave 1 must be complete (sales backend must work).

---

# PART 1: AGENT ONBOARDING

## 🏢 Project Overview

**TERP** is a comprehensive ERP system for cannabis businesses. The **VIP Portal** is the client-facing interface that allows customers to:
- Browse live product catalog
- View their account balances (AR/AP)
- Place orders
- Track order status
- Download invoices and documents
- Book appointments

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
❌ Use `: any` types
❌ Add @ts-nocheck or @ts-ignore
❌ Skip tests before committing
```

### ALWAYS DO:
```
✅ Run pnpm check after EVERY change
✅ Run pnpm test after EVERY change
✅ Test on mobile viewport sizes
✅ Verify deployment succeeds
```

---

## 📋 Schema Reference

### VIP Portal Configuration
```typescript
// ✅ EXIST:
vipPortalConfigurations.id
vipPortalConfigurations.clientId
vipPortalConfigurations.moduleDashboardEnabled
vipPortalConfigurations.moduleLiveCatalogEnabled
vipPortalConfigurations.moduleArEnabled
vipPortalConfigurations.moduleApEnabled
vipPortalConfigurations.moduleTransactionHistoryEnabled
```

### Clients (VIP-relevant fields)
```typescript
// ✅ EXIST:
clients.vipPortalEnabled
clients.vipPortalLastLogin
clients.creditLimit
clients.totalOwed
clients.totalSpent
```

---

# PART 2: YOUR TASK - WAVE 2 VIP PORTAL

## 🎯 Mission

Ensure clients can complete the entire purchase journey on mobile/desktop through the VIP Portal.

**Goal:** Client can: Login → Browse → Check Balance → Order → Track → Download
**Estimated Time:** 16-23 hours
**Dependencies:** Wave 1 complete (sales backend must work)

---

## 📁 VIP Portal Files

```
client/src/pages/vip-portal/
├── VIPLogin.tsx              # Login page (OK)
├── VIPDashboard.tsx          # Main dashboard (@ts-nocheck - NEEDS FIX)
├── AppointmentBooking.tsx    # Booking page (OK)
├── DocumentDownloads.tsx     # Document downloads (OK)
├── SessionEndedPage.tsx      # Session timeout (OK)
└── VipNotificationsBell.tsx  # Notifications (OK)

client/src/components/vip-portal/
├── LiveCatalog.tsx           # Product browsing
├── AccountsReceivable.tsx    # AR view
├── AccountsPayable.tsx       # AP view
├── TransactionHistory.tsx    # Transaction list
├── MarketplaceNeeds.tsx      # Needs posting
├── MarketplaceSupply.tsx     # Supply posting
└── Leaderboard.tsx           # VIP leaderboard
```

---

## 📋 Task Checklist

### Task 1: Fix VIPDashboard Components (4-6 hours)
**Path:** `client/src/pages/vip-portal/VIPDashboard.tsx`

The VIPDashboard imports many child components. Fix type issues in:
1. The main dashboard file
2. Each imported component that has errors

```bash
# Check which components have issues
pnpm check 2>&1 | grep "vip-portal"
```

**Likely Issues:**
- VipPortalConfig type mismatches
- Module enable/disable flag types
- Client data type mismatches

### Task 2: Test Catalog Browsing (2-3 hours)

Verify the LiveCatalog component works:
1. Login as a VIP client
2. Browse available products
3. Filter by category
4. View product details

**Mobile Testing:**
```bash
# Open browser dev tools
# Set viewport to mobile (375x667)
# Navigate through catalog
```

### Task 3: Test Order Placement (3-4 hours)

Verify clients can place orders:
1. Add items to cart
2. Review order
3. Submit order
4. Verify order appears in system

**Files to check:**
- `client/src/components/vip-portal/LiveCatalog.tsx`
- `server/routers/vipPortal.ts`

### Task 4: Test Payment/Balance View (2-3 hours)

Verify AR/AP modules work:
1. View accounts receivable
2. View accounts payable
3. Verify balances match backend
4. Check transaction history

**Files to check:**
- `client/src/components/vip-portal/AccountsReceivable.tsx`
- `client/src/components/vip-portal/AccountsPayable.tsx`
- `client/src/components/vip-portal/TransactionHistory.tsx`

### Task 5: Test Document Downloads (2-3 hours)

Verify document functionality:
1. Navigate to documents section
2. Download an invoice
3. Download a receipt
4. Verify files open correctly

### Task 6: Mobile Responsiveness Audit (3-4 hours)

Test all VIP pages on mobile viewports:

| Viewport | Width | Test |
|----------|-------|------|
| iPhone SE | 375px | All pages |
| iPhone 12 | 390px | All pages |
| iPad | 768px | All pages |

**Check for:**
- Text overflow
- Button tap targets (min 44px)
- Horizontal scrolling (should not occur)
- Navigation usability

---

## 🧪 End-to-End Test Script

```typescript
// tests/e2e/vip-portal.spec.ts
import { test, expect } from '@playwright/test';

test.describe('VIP Portal', () => {
  test.beforeEach(async ({ page }) => {
    // Login as VIP client
    await page.goto('/vip/login');
    await page.fill('[data-testid="email"]', 'vip@test.com');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/vip/dashboard');
  });

  test('can browse catalog', async ({ page }) => {
    await page.click('[data-testid="catalog-tab"]');
    await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible();
  });

  test('can view balances', async ({ page }) => {
    await page.click('[data-testid="ar-tab"]');
    await expect(page.locator('[data-testid="balance-amount"]')).toBeVisible();
  });

  test('can download documents', async ({ page }) => {
    await page.click('[data-testid="documents-tab"]');
    const download = await page.waitForEvent('download');
    await page.click('[data-testid="download-invoice"]');
    expect(download.suggestedFilename()).toContain('.pdf');
  });
});
```

---

## ✅ Exit Criteria

Wave 2 is complete when:

- [ ] `VIPDashboard.tsx` has no @ts-nocheck
- [ ] Client can log into VIP portal
- [ ] Client can browse live catalog
- [ ] Client can view AR/AP balances
- [ ] Client can place order
- [ ] Client can view order history
- [ ] Client can download documents
- [ ] All pages are mobile-responsive
- [ ] `pnpm check` passes
- [ ] `pnpm test` passes
- [ ] Deployment verified successful

---

## 📱 Mobile Testing Checklist

For each VIP portal page, verify on 375px viewport:

- [ ] VIPLogin - Form fits screen, buttons tappable
- [ ] VIPDashboard - Tabs accessible, content readable
- [ ] LiveCatalog - Products display correctly, filters work
- [ ] AccountsReceivable - Table scrolls horizontally if needed
- [ ] AccountsPayable - Table scrolls horizontally if needed
- [ ] TransactionHistory - Dates and amounts visible
- [ ] DocumentDownloads - Download buttons tappable
- [ ] AppointmentBooking - Calendar usable on mobile

---

## 🔄 Git Workflow

```bash
# After each task
pnpm check && pnpm test
git add -A
git commit -m "fix(vip-portal): [description]"
git push origin main

# Verify deployment
git fetch origin build-status
git show origin/build-status:.github/BUILD_STATUS.md
```

---

## 🆘 Escalation

If you encounter issues:
1. Document in `WAVE_2_BLOCKERS.md`
2. Include file, line, error, attempts
3. Move to next task
4. Flag for human review

---

## 🚀 Getting Started

```bash
cd ~/TERP
git pull origin main
pnpm install
pnpm check  # Must pass

# Start with VIPDashboard
cat client/src/pages/vip-portal/VIPDashboard.tsx | head -5
# If it has @ts-nocheck, remove it and fix errors
```

**Good luck! Focus on the complete client journey through the VIP Portal.**
