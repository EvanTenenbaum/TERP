# Wave 2B: Navigation & Verification

**Agent Role**: QA/Frontend Developer  
**Duration**: 4-5 hours  
**Priority**: P1 - HIGH  
**Deadline**: Day 2  
**Dependencies**: Wave 1B complete  
**Can Run Parallel With**: Wave 2A

---

## Context

You are fixing navigation issues and verifying all user-facing functionality works. This is the final verification before Thursday's user testing deadline.

---

## Tasks

### Task 1: BUG-070 - Spreadsheet View Returns 404

**Priority**: P2  
**Files**: Route configuration, possibly `client/src/App.tsx`  
**Time Estimate**: 1-2 hours

**Problem**: The Spreadsheet View page (accessible from sidebar) returns a 404 error. Previously it showed an empty grid, now it's completely missing.

**Investigation Steps**:

1. **Check the route exists in App.tsx**:
```bash
grep -n "spreadsheet" client/src/App.tsx
```

2. **Check if the page component exists**:
```bash
ls -la client/src/pages/SpreadsheetViewPage.tsx
```

3. **Check if the route was accidentally removed**:
```bash
git log --oneline -20 -- client/src/App.tsx
git diff HEAD~10 -- client/src/App.tsx | grep -i spreadsheet
```

4. **Check sidebar navigation**:
```bash
grep -rn "spreadsheet" client/src/components/layout/
```

**Likely Fixes**:

```typescript
// Option A: Route was removed - add it back
// In App.tsx routes
<Route path="/spreadsheet" element={<SpreadsheetViewPage />} />

// Option B: Component import missing
import SpreadsheetViewPage from './pages/SpreadsheetViewPage';

// Option C: Feature flag disabled
// Check if there's a feature flag controlling this route
```

**Verification**:
1. Go to https://terp-app-b9s35.ondigitalocean.app/spreadsheet
2. Verify page loads (even if empty)
3. Verify sidebar link works

---

### Task 2: NAV-001 - Verify All Navigation Links Work

**Priority**: P1  
**Time Estimate**: 1 hour

**Checklist**: Click every link in the sidebar and verify no 404s.

| Section | Link | Expected URL | Status |
|---------|------|--------------|--------|
| **SALES** | | | |
| | Dashboard | `/` or `/dashboard` | ☐ |
| | Clients | `/clients` | ☐ |
| | Orders | `/orders` | ☐ |
| | Invoices | `/invoices` | ☐ |
| **INVENTORY** | | | |
| | Products | `/products` | ☐ |
| | Batches | `/inventory` | ☐ |
| | Samples | `/samples` | ☐ |
| | Purchase Orders | `/purchase-orders` | ☐ |
| | Spreadsheet View | `/spreadsheet` | ☐ |
| **FINANCE** | | | |
| | AR/AP | `/accounting` | ☐ |
| | Credits | `/credits` | ☐ |
| | Reports | `/reports` or `/analytics` | ☐ |
| **ADMIN** | | | |
| | Users | `/users` | ☐ |
| | Settings | `/settings` | ☐ |
| | Calendar | `/calendar` | ☐ |

**For Each Link**:
1. Click the link
2. Verify page loads without 404
3. Verify page content appears (not blank)
4. Note any issues in the checklist

**If 404 Found**:
1. Check if route exists in App.tsx
2. Check if component exists
3. Fix and document

---

### Task 3: MODAL-001 - Verify All Modals Open/Close

**Priority**: P1  
**Time Estimate**: 1 hour

**Checklist**: Open and close every modal in the app.

| Page | Modal Trigger | Modal Name | Opens? | Closes? |
|------|---------------|------------|--------|---------|
| Dashboard | Click client row | Client Detail | ☐ | ☐ |
| Clients | "Add New Client" button | New Client Form | ☐ | ☐ |
| Clients | Click client row | Client Detail | ☐ | ☐ |
| Orders | "New Order" button | (navigates to page) | ☐ | N/A |
| Orders | Click order row | Order Detail | ☐ | ☐ |
| Invoices | Click invoice row | Invoice Detail | ☐ | ☐ |
| Invoices | "Receive Payment" | Payment Modal | ☐ | ☐ |
| Products | "Add Product" button | New Product Form | ☐ | ☐ |
| Inventory | "View" button on batch | Batch Detail Drawer | ☐ | ☐ |
| Samples | "New Sample" button | New Sample Form | ☐ | ☐ |
| Settings | Various tabs | Tab content | ☐ | N/A |

**For Each Modal**:
1. Click the trigger
2. Verify modal opens
3. Verify modal content loads
4. Click X or outside to close
5. Verify modal closes
6. Verify no stuck states

**If Modal Stuck**:
1. Check for JavaScript errors in console
2. Check if close handler is wired up
3. Fix and document

---

### Task 4: E2E-001 - Test Order Creation Flow

**Priority**: P0  
**Time Estimate**: 1 hour

**Full End-to-End Test**:

1. **Navigate to Order Creator**
   - Click "Orders" in sidebar
   - Click "New Order" button
   - Verify page loads

2. **Select Customer**
   - Click customer dropdown
   - Select a customer (e.g., "Nolan Distribution")
   - Verify customer info displays

3. **Verify Inventory Loads** (Wave 1A fix)
   - Verify "Failed to load inventory" does NOT appear
   - Verify products are visible

4. **Add Products to Order**
   - Click on a product to add
   - Verify it appears in order summary
   - Adjust quantity
   - Verify totals update

5. **Complete Order**
   - Fill in any required fields
   - Click "Create Order" or similar
   - Verify order is created
   - Verify redirect to order detail or orders list

**Document Any Issues**:
- Screenshot any errors
- Note exact steps to reproduce
- Create bug report if blocking

---

## Git Workflow

```bash
# Create feature branch
git checkout -b fix/wave-2b-navigation

# Fix spreadsheet route if needed
git add client/src/App.tsx
git commit -m "fix(BUG-070): Restore Spreadsheet View route

- Added missing route for /spreadsheet
- Page now loads correctly"

# Document verification results
git add docs/qa/NAVIGATION_VERIFICATION.md
git commit -m "docs: Add navigation verification checklist

- All sidebar links verified
- All modals verified
- E2E order flow verified"

# Push and create PR
git push origin fix/wave-2b-navigation
```

---

## Success Criteria

- [ ] Spreadsheet View page loads
- [ ] All sidebar links work (no 404s)
- [ ] All modals open and close properly
- [ ] Order creation flow works end-to-end
- [ ] No JavaScript errors in console

---

## Verification Report Template

Create `docs/qa/THURSDAY_VERIFICATION.md`:

```markdown
# Thursday Verification Report

**Date**: [Date]
**Tester**: [Name]
**Environment**: https://terp-app-b9s35.ondigitalocean.app

## Navigation Links
- [x] All SALES links work
- [x] All INVENTORY links work
- [x] All FINANCE links work
- [x] All ADMIN links work

## Modals
- [x] All modals open correctly
- [x] All modals close correctly
- [x] No stuck states

## Core Flows
- [x] Order creation works
- [x] Batch viewing works
- [x] Search works

## Issues Found
1. [Issue description]
2. [Issue description]

## Ready for User Testing: YES/NO
```

---

## Handoff

When complete, notify the Wave 3 lead that Wave 2B is ready for integration. Provide the verification report.
