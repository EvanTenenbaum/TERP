# Wave 2B: Navigation & Final Verification (Stability-Focused)

**Agent Role**: QA Engineer / Frontend Developer  
**Duration**: 4-5 hours  
**Priority**: P1  
**Deadline**: Day 1 PM - Day 2 AM  
**Can Run Parallel With**: Wave 2A

---

## Stability Requirements (READ FIRST)

Every fix in this wave MUST:
1. ✅ Verify the issue exists first
2. ✅ Understand WHY before fixing
3. ✅ Test all related functionality
4. ✅ Document findings
5. ✅ Add regression tests

---

## Task 1: BUG-070 - Spreadsheet View 404

**Priority**: P2  
**Files**: `client/src/App.tsx`, potentially `client/src/pages/SpreadsheetViewPage.tsx`  
**Time Estimate**: 1-2 hours

### Investigation Protocol (DO THIS FIRST)

**Step 1: Check if route exists**
```bash
# Search for spreadsheet route
grep -rn "spreadsheet" client/src/App.tsx
grep -rn "SpreadsheetViewPage" client/src/
```

**Step 2: Check git history**
```bash
# Was it intentionally removed?
git log --oneline --all -- '**/spreadsheet*'
git log --oneline -- client/src/App.tsx | head -20

# Check for removal commit
git log --all --oneline -S "spreadsheet" -- client/src/App.tsx
```

**Step 3: Check feature flags**
```bash
# Is it behind a feature flag?
grep -rn "spreadsheet" server/routers/featureFlags.ts
grep -rn "SPREADSHEET" client/src/
```

**Step 4: Document findings**
```markdown
## BUG-070 Investigation Results

- Route exists in App.tsx: Yes / No
- Component exists: Yes / No
- Removed in commit: [hash] / Never existed
- Behind feature flag: Yes (flag name) / No
- Intentional removal: Yes / No / Unknown

Decision: Restore / Leave as is / Add feature flag
```

### Possible Scenarios & Fixes

#### Scenario A: Route was accidentally removed
```typescript
// client/src/App.tsx
// Add back the route
<Route path="/spreadsheet" element={<SpreadsheetViewPage />} />
```

#### Scenario B: Component was removed but route exists
```typescript
// Need to restore or recreate SpreadsheetViewPage
// Check git history for the original implementation
git show HEAD~50:client/src/pages/SpreadsheetViewPage.tsx
```

#### Scenario C: Intentionally removed but nav link remains
```typescript
// Remove the nav link instead of restoring the page
// client/src/components/Sidebar.tsx
// Remove: { path: '/spreadsheet', label: 'Spreadsheet View' }
```

#### Scenario D: Should be behind feature flag
```typescript
// client/src/App.tsx
const { data: flags } = trpc.featureFlags.getAll.useQuery();

{flags?.spreadsheetView && (
  <Route path="/spreadsheet" element={<SpreadsheetViewPage />} />
)}

// Also hide nav link when flag is off
{flags?.spreadsheetView && (
  <NavLink to="/spreadsheet">Spreadsheet View</NavLink>
)}
```

---

## Task 2: Navigation Audit

**Priority**: P1  
**Time Estimate**: 2 hours

Verify ALL navigation links work correctly.

### Audit Script

```typescript
// tests/navigation-audit.ts

const routes = [
  // Main navigation
  { path: '/', name: 'Dashboard', shouldWork: true },
  { path: '/clients', name: 'Clients', shouldWork: true },
  { path: '/orders', name: 'Orders', shouldWork: true },
  { path: '/orders/create', name: 'Create Order', shouldWork: true },
  { path: '/invoices', name: 'Invoices', shouldWork: true },
  { path: '/inventory', name: 'Inventory', shouldWork: true },
  { path: '/products', name: 'Products', shouldWork: true },
  { path: '/samples', name: 'Samples', shouldWork: true },
  { path: '/calendar', name: 'Calendar', shouldWork: true },
  { path: '/reports', name: 'Reports', shouldWork: true },
  { path: '/settings', name: 'Settings', shouldWork: true },
  
  // Sub-routes
  { path: '/settings/users', name: 'User Management', shouldWork: true },
  { path: '/settings/locations', name: 'Locations', shouldWork: true },
  { path: '/settings/categories', name: 'Categories', shouldWork: true },
  
  // Accounting
  { path: '/accounting', name: 'Accounting', shouldWork: true },
  { path: '/ar-ap', name: 'AR/AP', shouldWork: true },
  
  // Other
  { path: '/todo', name: 'Todo Lists', shouldWork: true },
  { path: '/vendors', name: 'Vendors', shouldWork: true },
  { path: '/purchase-orders', name: 'Purchase Orders', shouldWork: true },
  { path: '/returns', name: 'Returns', shouldWork: true },
  { path: '/locations', name: 'Locations Page', shouldWork: true },
  
  // Potentially removed/hidden
  { path: '/spreadsheet', name: 'Spreadsheet View', shouldWork: 'CHECK' },
];

async function auditNavigation() {
  const results = [];
  
  for (const route of routes) {
    try {
      const response = await fetch(`https://terp-app-b9s35.ondigitalocean.app${route.path}`);
      const html = await response.text();
      
      const is404 = html.includes('404') || html.includes('Page not found');
      const hasError = html.includes('Error') || html.includes('Something went wrong');
      
      results.push({
        ...route,
        status: response.status,
        is404,
        hasError,
        passed: !is404 && !hasError && response.status === 200,
      });
    } catch (error) {
      results.push({
        ...route,
        status: 'ERROR',
        error: error.message,
        passed: false,
      });
    }
  }
  
  return results;
}
```

### Manual Verification Checklist

```markdown
## Navigation Audit Results

| Route | Expected | Actual | Status |
|-------|----------|--------|--------|
| / | Dashboard loads | | ⬜ |
| /clients | Client list loads | | ⬜ |
| /clients/:id | Client detail loads | | ⬜ |
| /orders | Orders list loads | | ⬜ |
| /orders/create | Order creator loads | | ⬜ |
| /invoices | Invoices list loads | | ⬜ |
| /inventory | Inventory list loads | | ⬜ |
| /products | Products list loads | | ⬜ |
| /samples | Samples list loads | | ⬜ |
| /calendar | Calendar loads | | ⬜ |
| /reports | Reports loads | | ⬜ |
| /settings | Settings loads | | ⬜ |
| /accounting | Accounting loads | | ⬜ |
| /ar-ap | AR/AP loads | | ⬜ |
| /todo | Todo loads | | ⬜ |
| /vendors | Vendors loads | | ⬜ |
| /purchase-orders | PO loads | | ⬜ |
| /returns | Returns loads | | ⬜ |
| /spreadsheet | ??? | | ⬜ |

### Issues Found:
1. 
2. 
3. 
```

---

## Task 3: Modal & Drawer Audit

**Priority**: P1  
**Time Estimate**: 1.5 hours

Verify all modals and drawers open/close correctly.

### Audit Checklist

```markdown
## Modal/Drawer Audit

### Client Modals
- [ ] Add New Client modal opens
- [ ] Add New Client modal closes (X button)
- [ ] Add New Client modal closes (Cancel button)
- [ ] Add New Client modal closes (outside click)
- [ ] Edit Client modal opens
- [ ] Edit Client modal closes

### Order Modals
- [ ] Order detail drawer opens
- [ ] Order detail drawer closes
- [ ] Order actions work (cancel, complete, etc.)

### Invoice Modals
- [ ] Invoice detail modal opens
- [ ] Invoice detail modal closes
- [ ] Receive Payment modal opens
- [ ] Receive Payment modal closes
- [ ] Payment form submits correctly

### Inventory Modals
- [ ] Batch detail drawer opens
- [ ] Batch detail drawer closes (after BUG-041 fix)
- [ ] Add Product modal opens
- [ ] Add Product modal closes
- [ ] Edit Product modal opens
- [ ] Edit Product modal closes

### Sample Modals
- [ ] Create Sample modal opens
- [ ] Create Sample modal closes
- [ ] Sample detail modal opens
- [ ] Sample detail modal closes

### Settings Modals
- [ ] Add Location modal opens/closes
- [ ] Add Category modal opens/closes
- [ ] Add Grade modal opens/closes

### Issues Found:
1. 
2. 
3. 
```

---

## Task 4: Error State Audit

**Priority**: P2  
**Time Estimate**: 1 hour

Verify error states are handled gracefully.

### Test Scenarios

```markdown
## Error State Audit

### Network Errors
- [ ] Disconnect network → Shows offline message
- [ ] Slow network → Shows loading state
- [ ] API timeout → Shows retry option

### Data Errors
- [ ] Empty data → Shows empty state (not blank)
- [ ] Invalid data → Shows error message
- [ ] Missing permissions → Shows permission error

### Form Errors
- [ ] Required field empty → Shows validation error
- [ ] Invalid email → Shows validation error
- [ ] Duplicate entry → Shows appropriate error

### Navigation Errors
- [ ] Invalid route → Shows 404 page
- [ ] Unauthorized route → Redirects to login
- [ ] Forbidden route → Shows permission error

### Issues Found:
1. 
2. 
3. 
```

---

## Task 5: Create Regression Test Suite

**Time Estimate**: 1 hour

```typescript
// tests/e2e/regression.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', process.env.TEST_EMAIL!);
    await page.fill('[name="password"]', process.env.TEST_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test.describe('Navigation', () => {
    const routes = [
      '/',
      '/clients',
      '/orders',
      '/invoices',
      '/inventory',
      '/products',
      '/samples',
      '/settings',
    ];

    for (const route of routes) {
      test(`${route} loads without error`, async ({ page }) => {
        await page.goto(route);
        
        // Should not show 404
        await expect(page.locator('text=404')).not.toBeVisible();
        
        // Should not show error
        await expect(page.locator('text=Something went wrong')).not.toBeVisible();
        
        // Should have main content
        await expect(page.locator('main')).toBeVisible();
      });
    }
  });

  test.describe('Critical Flows', () => {
    test('can view client details', async ({ page }) => {
      await page.goto('/clients');
      await page.click('[data-testid="client-row"]:first-child');
      await expect(page.locator('[data-testid="client-details"]')).toBeVisible();
    });

    test('can open order creator', async ({ page }) => {
      await page.goto('/orders/create');
      await expect(page.locator('[data-testid="customer-select"]')).toBeVisible();
    });

    test('can view invoice details', async ({ page }) => {
      await page.goto('/invoices');
      await page.click('[data-testid="invoice-row"]:first-child');
      await expect(page.locator('[data-testid="invoice-modal"]')).toBeVisible();
    });

    test('can view batch details', async ({ page }) => {
      await page.goto('/inventory');
      await page.click('[data-testid="view-button"]:first-child');
      await expect(page.locator('[data-testid="batch-drawer"]')).toBeVisible();
    });
  });

  test.describe('Modals', () => {
    test('add client modal opens and closes', async ({ page }) => {
      await page.goto('/clients');
      
      // Open
      await page.click('[data-testid="add-client-button"]');
      await expect(page.locator('[data-testid="add-client-modal"]')).toBeVisible();
      
      // Close with X
      await page.click('[data-testid="modal-close"]');
      await expect(page.locator('[data-testid="add-client-modal"]')).not.toBeVisible();
    });
  });
});
```

---

## Git Workflow

```bash
git checkout -b fix/wave-2b-navigation-stable

# BUG-070 fix (if applicable)
git add client/src/App.tsx
git commit -m "fix(BUG-070): [Restore/Remove/Flag] Spreadsheet View

Investigation found: [what you found]
Decision: [what you decided]

Fixes: BUG-070"

# Navigation audit results
git add docs/audits/NAVIGATION_AUDIT.md
git commit -m "docs: Add navigation audit results"

# Regression tests
git add tests/e2e/regression.spec.ts
git commit -m "test: Add regression test suite for critical flows"

# Any additional fixes found during audit
git add [files]
git commit -m "fix: [description of fix found during audit]"

git push origin fix/wave-2b-navigation-stable
```

---

## Success Criteria

- [ ] BUG-070 investigated and resolved
- [ ] All navigation links verified
- [ ] All modals/drawers verified
- [ ] Error states verified
- [ ] Regression tests created
- [ ] Audit documentation complete

---

## Handoff

When complete:
1. Create PR with audit results
2. List any NEW issues found
3. Notify Wave 3 lead
4. Update roadmap status
