# Wave 1C: Test Infrastructure & Verification (NEW - Parallel)

**Agent Role**: QA Engineer / Test Developer  
**Duration**: 3-4 hours  
**Priority**: P1  
**Deadline**: Day 1 (runs parallel with 1A and 1B)  
**Can Run Parallel With**: Wave 1A, Wave 1B

---

## Purpose

While Wave 1A and 1B fix bugs, this wave:
1. Sets up test infrastructure for verification
2. Creates end-to-end test scripts
3. Prepares verification checklist
4. Creates smoke test suite for deployment

This ensures we can VERIFY fixes work before Thursday.

---

## Task 1: Create Smoke Test Suite

**Time Estimate**: 1.5 hours

Create automated smoke tests that can run after each deployment:

```typescript
// tests/smoke/smoke.test.ts

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_URL || 'https://terp-app-b9s35.ondigitalocean.app';

test.describe('Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login once
    await page.goto(`${BASE_URL}/login`);
    // Perform login if needed
  });

  test('Dashboard loads with data', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    
    // Wait for dashboard to load
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // Verify KPIs are present (not loading, not error)
    await expect(page.locator('[data-testid="kpi-revenue"]')).not.toContainText('Loading');
    await expect(page.locator('[data-testid="kpi-revenue"]')).not.toContainText('Error');
  });

  test('Products page shows products (QA-049)', async ({ page }) => {
    await page.goto(`${BASE_URL}/products`);
    
    // Wait for products to load
    await page.waitForSelector('[data-testid="products-table"]');
    
    // Verify products are displayed
    const productRows = page.locator('[data-testid="product-row"]');
    const count = await productRows.count();
    
    expect(count).toBeGreaterThan(0);
    console.log(`Products page shows ${count} products`);
  });

  test('Samples page shows samples (QA-050)', async ({ page }) => {
    await page.goto(`${BASE_URL}/samples`);
    
    await page.waitForSelector('[data-testid="samples-table"]');
    
    const sampleRows = page.locator('[data-testid="sample-row"]');
    const count = await sampleRows.count();
    
    expect(count).toBeGreaterThan(0);
    console.log(`Samples page shows ${count} samples`);
  });

  test('Order Creator loads inventory (BUG-040)', async ({ page }) => {
    await page.goto(`${BASE_URL}/orders/create`);
    
    // Select a customer
    await page.click('[data-testid="customer-select"]');
    await page.click('[data-testid="customer-option"]:first-child');
    
    // Wait for inventory to load
    await page.waitForSelector('[data-testid="inventory-list"]', { timeout: 10000 });
    
    // Verify inventory items are present
    const inventoryItems = page.locator('[data-testid="inventory-item"]');
    const count = await inventoryItems.count();
    
    expect(count).toBeGreaterThan(0);
    console.log(`Order Creator shows ${count} inventory items`);
  });

  test('Batch Detail View opens without crash (BUG-041)', async ({ page }) => {
    await page.goto(`${BASE_URL}/inventory`);
    
    // Click on first batch
    await page.click('[data-testid="batch-row"]:first-child [data-testid="view-button"]');
    
    // Wait for drawer to open
    await expect(page.locator('[data-testid="batch-drawer"]')).toBeVisible();
    
    // Verify no error message
    await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
    
    // Verify content loaded
    await expect(page.locator('[data-testid="batch-details"]')).toBeVisible();
  });

  test('Global Search returns results (BUG-042)', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    
    // Click search
    await page.click('[data-testid="global-search"]');
    
    // Type search query
    await page.fill('[data-testid="search-input"]', 'OG');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Wait for results
    await page.waitForSelector('[data-testid="search-results"]');
    
    // Verify results exist
    const results = page.locator('[data-testid="search-result-item"]');
    const count = await results.count();
    
    expect(count).toBeGreaterThan(0);
    console.log(`Search for "OG" returned ${count} results`);
  });

  test('All main navigation links work', async ({ page }) => {
    const navLinks = [
      { path: '/', name: 'Dashboard' },
      { path: '/clients', name: 'Clients' },
      { path: '/orders', name: 'Orders' },
      { path: '/invoices', name: 'Invoices' },
      { path: '/inventory', name: 'Inventory' },
      { path: '/products', name: 'Products' },
      { path: '/samples', name: 'Samples' },
      { path: '/settings', name: 'Settings' },
    ];

    for (const link of navLinks) {
      await page.goto(`${BASE_URL}${link.path}`);
      
      // Should not show 404
      await expect(page.locator('text=404')).not.toBeVisible();
      await expect(page.locator('text=Page not found')).not.toBeVisible();
      
      console.log(`✓ ${link.name} (${link.path}) loads correctly`);
    }
  });
});
```

---

## Task 2: Create Manual Verification Checklist

**Time Estimate**: 1 hour

```markdown
// tests/manual/THURSDAY_VERIFICATION_CHECKLIST.md

# Thursday Deployment Verification Checklist

**Date**: ___________  
**Tester**: ___________  
**Environment**: Production / Staging

---

## Pre-Deployment Checks

- [ ] All Wave 1A commits merged
- [ ] All Wave 1B commits merged
- [ ] All Wave 2 commits merged
- [ ] CI/CD pipeline passed
- [ ] No console errors in browser

---

## Critical Path Tests

### 1. Order Creation Flow (BUG-040)

| Step | Expected | Actual | Pass? |
|------|----------|--------|-------|
| Navigate to /orders/create | Page loads | | |
| Click customer dropdown | Options appear | | |
| Select any customer | Customer selected | | |
| Wait for inventory | Inventory loads (no error) | | |
| Inventory items visible | Items with prices shown | | |
| Add item to order | Item added to cart | | |
| Submit order | Order created successfully | | |

**Notes**: ___________

### 2. Batch Detail View (BUG-041)

| Step | Expected | Actual | Pass? |
|------|----------|--------|-------|
| Navigate to /inventory | Page loads with batches | | |
| Click View on any batch | Drawer opens | | |
| Check Locations section | Shows locations or "No data" | | |
| Check Audit Log section | Shows logs or "No history" | | |
| Close drawer | Drawer closes cleanly | | |

**Notes**: ___________

### 3. Products Page (QA-049)

| Step | Expected | Actual | Pass? |
|------|----------|--------|-------|
| Navigate to /products | Page loads | | |
| Check product count | Shows "Showing X of 121" | | |
| Products visible in table | Product rows displayed | | |
| Toggle archived filter | Count changes appropriately | | |

**Notes**: ___________

### 4. Samples Page (QA-050)

| Step | Expected | Actual | Pass? |
|------|----------|--------|-------|
| Navigate to /samples | Page loads | | |
| Check tab counts | "All 6" or similar | | |
| Samples visible in table | Sample rows displayed | | |
| Switch tabs | Different samples shown | | |

**Notes**: ___________

### 5. Global Search (BUG-042)

| Step | Expected | Actual | Pass? |
|------|----------|--------|-------|
| Click search icon | Search opens | | |
| Type "OG Kush" | Search executes | | |
| Results appear | Products/batches shown | | |
| Click a result | Navigates to item | | |

**Notes**: ___________

### 6. Navigation Check

| Page | URL | Loads? | No 404? |
|------|-----|--------|---------|
| Dashboard | / | | |
| Clients | /clients | | |
| Orders | /orders | | |
| Invoices | /invoices | | |
| Inventory | /inventory | | |
| Products | /products | | |
| Samples | /samples | | |
| Settings | /settings | | |
| Calendar | /calendar | | |
| Reports | /reports | | |

---

## Post-Deployment Monitoring

- [ ] Check error tracking (Sentry) for new errors
- [ ] Check server logs for warnings
- [ ] Verify no increase in error rate
- [ ] Spot check 3 random features

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA | | | |
| Dev Lead | | | |
| Product | | | |
```

---

## Task 3: Create Database Verification Queries

**Time Estimate**: 30 minutes

```sql
-- tests/sql/verify_data.sql

-- Run these queries to verify data state before/after deployment

-- 1. Products count
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE archived = false) as active,
  COUNT(*) FILTER (WHERE archived = true) as archived
FROM products;
-- Expected: total > 0, active = 121

-- 2. Samples count
SELECT 
  status,
  COUNT(*) as count
FROM samples
GROUP BY status
ORDER BY status;
-- Expected: total = 6

-- 3. Batches count
SELECT 
  status,
  COUNT(*) as count
FROM batches
GROUP BY status
ORDER BY status;
-- Expected: multiple batches

-- 4. Clients with pricing rules
SELECT 
  c.id,
  c.name,
  COUNT(pr.id) as rule_count
FROM clients c
LEFT JOIN pricing_rules pr ON c.id = pr.client_id
GROUP BY c.id, c.name
ORDER BY rule_count ASC
LIMIT 10;
-- Check: Are there clients with 0 rules?

-- 5. Users with roles
SELECT 
  u.id,
  u.email,
  COUNT(ur.role_id) as role_count
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
GROUP BY u.id, u.email
ORDER BY role_count ASC
LIMIT 10;
-- Check: Are there users with 0 roles?
```

---

## Task 4: Create Deployment Runbook

**Time Estimate**: 1 hour

```markdown
// docs/deployment/THURSDAY_DEPLOYMENT_RUNBOOK.md

# Thursday Deployment Runbook

## Pre-Deployment (30 min before)

### 1. Verify All PRs Merged
```bash
# Check main branch has all fixes
git log --oneline -20

# Expected commits:
# - fix(BUG-040): Handle empty pricing rules
# - fix(BUG-041): Prevent crash on undefined arrays
# - fix(BUG-043): Handle empty permission arrays
# - fix(QA-049): Fix Products page
# - fix(QA-050): Fix Samples page
# - fix(BUG-042): Add product search fields
```

### 2. Run Full Test Suite
```bash
pnpm test
# All tests must pass

pnpm test:e2e
# All E2E tests must pass
```

### 3. Check Database Migrations
```bash
pnpm drizzle-kit check
# Should show no pending migrations
```

### 4. Note Current Deployment ID
```bash
# DigitalOcean
doctl apps list-deployments $APP_ID --format ID --no-header | head -1
# Save this for rollback: ___________
```

---

## Deployment

### 1. Trigger Deployment
```bash
git push origin main
# DigitalOcean auto-deploys from main
```

### 2. Monitor Deployment
- Watch DigitalOcean dashboard for build status
- Check build logs for errors
- Expected time: ~5 minutes

### 3. Verify Deployment Complete
```bash
curl https://terp-app-b9s35.ondigitalocean.app/api/health
# Should return: { "status": "ok", "version": "X.X.X" }
```

---

## Post-Deployment Verification (15 min)

### 1. Run Smoke Tests
```bash
TEST_URL=https://terp-app-b9s35.ondigitalocean.app pnpm test:smoke
```

### 2. Manual Spot Checks
- [ ] Dashboard loads
- [ ] Can create order (BUG-040)
- [ ] Can view batch details (BUG-041)
- [ ] Products page shows data (QA-049)
- [ ] Samples page shows data (QA-050)
- [ ] Search works (BUG-042)

### 3. Check Error Monitoring
- Open Sentry dashboard
- Check for new errors in last 15 minutes
- Acceptable: 0 new errors

---

## Rollback Procedure

If critical issues found:

### Option 1: Revert Commit
```bash
git revert HEAD
git push origin main
# Wait for redeploy
```

### Option 2: Rollback Deployment
```bash
# Use saved deployment ID
doctl apps create-deployment $APP_ID --deployment-id $PREVIOUS_DEPLOY_ID
```

### Option 3: Feature Flag Disable
If feature flags are in place:
```bash
# Disable problematic feature
curl -X POST https://terp-app.../api/admin/feature-flags \
  -d '{"flag": "new_order_creator", "enabled": false}'
```

---

## Contacts

| Role | Name | Contact |
|------|------|---------|
| Dev Lead | | |
| Backend Dev | | |
| Frontend Dev | | |
| DevOps | | |

---

## Post-Deployment Report

**Deployment Time**: ___________  
**Deployment Status**: Success / Partial / Failed  
**Issues Found**: ___________  
**Rollback Required**: Yes / No  
**Sign-off**: ___________
```

---

## Git Workflow

```bash
git checkout -b test/wave-1c-verification

git add tests/smoke/smoke.test.ts
git commit -m "test: Add smoke test suite for critical paths"

git add tests/manual/THURSDAY_VERIFICATION_CHECKLIST.md
git commit -m "docs: Add manual verification checklist"

git add tests/sql/verify_data.sql
git commit -m "test: Add database verification queries"

git add docs/deployment/THURSDAY_DEPLOYMENT_RUNBOOK.md
git commit -m "docs: Add deployment runbook for Thursday"

git push origin test/wave-1c-verification
```

---

## Success Criteria

- [ ] Smoke test suite created and runs
- [ ] Manual checklist ready for use
- [ ] Database queries documented
- [ ] Deployment runbook complete
- [ ] All team members know the process

---

## Handoff

When complete:
1. Share checklist with all team members
2. Run smoke tests against current production (baseline)
3. Document any existing failures
4. Notify Wave 3 lead that verification is ready
