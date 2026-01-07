# Thursday Deployment Verification Checklist

**Date**: ___________
**Tester**: ___________
**Environment**: Production / Staging
**Build Version**: ___________

---

## Pre-Deployment Checks

- [ ] All Wave 1A commits merged (BUG-040, BUG-041, BUG-043)
- [ ] All Wave 1B commits merged (QA-049, QA-050, BUG-042)
- [ ] All Wave 2 commits merged (if applicable)
- [ ] CI/CD pipeline passed
- [ ] `pnpm check` passes with no TypeScript errors
- [ ] `pnpm test` passes with no failures
- [ ] Database migrations reviewed

---

## Automated Smoke Tests

Run before manual testing:

```bash
# Against staging
PLAYWRIGHT_BASE_URL=https://staging-url pnpm test:smoke

# Against production
pnpm test:smoke:prod
```

**Smoke Test Results**:
- [ ] All smoke tests pass
- [ ] Failures documented below

**Failures (if any)**:
___________

---

## Critical Path Tests

### 1. Order Creation Flow (BUG-040)

**Bug Description**: Order Creator fails to load inventory due to empty pricing rules

| Step | Expected | Actual | Pass? |
|------|----------|--------|:-----:|
| Navigate to /orders/create | Page loads without error | | [ ] |
| Click customer dropdown | Customer list appears | | [ ] |
| Select any customer | Customer selected, no crash | | [ ] |
| Wait for inventory | Inventory loads (no "Error" text) | | [ ] |
| Inventory items visible | Items shown with prices | | [ ] |
| Add item to order | Item added to cart | | [ ] |
| Submit order | Order created successfully | | [ ] |

**Notes**: ___________

**Pass/Fail**: [ ] PASS / [ ] FAIL

---

### 2. Batch Detail View (BUG-041)

**Bug Description**: Batch detail drawer crashes when viewing batches with no locations/audit log

| Step | Expected | Actual | Pass? |
|------|----------|--------|:-----:|
| Navigate to /inventory | Page loads with batches | | [ ] |
| Click View on any batch | Drawer opens without crash | | [ ] |
| Check Locations section | Shows locations or "No locations" | | [ ] |
| Check Audit Log section | Shows logs or "No history" | | [ ] |
| Close drawer | Drawer closes cleanly | | [ ] |
| Repeat with different batch | Same behavior, no crash | | [ ] |

**Notes**: ___________

**Pass/Fail**: [ ] PASS / [ ] FAIL

---

### 3. Products Page (QA-049)

**Bug Description**: Products page shows empty state despite 121 products in database

| Step | Expected | Actual | Pass? |
|------|----------|--------|:-----:|
| Navigate to /products | Page loads without error | | [ ] |
| Wait for loading to complete | Skeleton disappears | | [ ] |
| Check product count | Shows "Showing X of 121" or similar | | [ ] |
| Products visible in table | Product rows displayed | | [ ] |
| Toggle archived filter | Count changes appropriately | | [ ] |
| Pagination works | Can navigate between pages | | [ ] |

**Notes**: ___________

**Pass/Fail**: [ ] PASS / [ ] FAIL

---

### 4. Samples Page (QA-050)

**Bug Description**: Samples page shows empty tabs despite 6 samples in database

| Step | Expected | Actual | Pass? |
|------|----------|--------|:-----:|
| Navigate to /samples | Page loads without error | | [ ] |
| Wait for loading to complete | Data appears | | [ ] |
| Check tab counts | Shows "All (6)" or similar | | [ ] |
| Samples visible in table | Sample rows displayed | | [ ] |
| Switch between tabs | Different samples shown | | [ ] |
| Sample details accessible | Can view sample details | | [ ] |

**Notes**: ___________

**Pass/Fail**: [ ] PASS / [ ] FAIL

---

### 5. Global Search (BUG-042)

**Bug Description**: Global search fails to find products/batches

| Step | Expected | Actual | Pass? |
|------|----------|--------|:-----:|
| Click search icon/Cmd+K | Search dialog opens | | [ ] |
| Type "OG" | Search executes | | [ ] |
| Results appear | Products/batches shown | | [ ] |
| Type strain name | Matching items appear | | [ ] |
| Click a result | Navigates to item | | [ ] |
| Empty search returns | Dialog closes or shows hint | | [ ] |

**Notes**: ___________

**Pass/Fail**: [ ] PASS / [ ] FAIL

---

### 6. Permission Handling (BUG-043)

**Bug Description**: Users with no roles get permission errors

| Step | Expected | Actual | Pass? |
|------|----------|--------|:-----:|
| Log in as test user | Successful login | | [ ] |
| Navigate to dashboard | Dashboard loads | | [ ] |
| Try accessing settings | Page loads or shows "No permission" | | [ ] |
| Try accessing admin page | Denied gracefully (not crash) | | [ ] |

**Notes**: ___________

**Pass/Fail**: [ ] PASS / [ ] FAIL

---

## Navigation Check

| Page | URL | Loads? | No 404? | No Crash? |
|------|-----|:------:|:-------:|:---------:|
| Dashboard | / | [ ] | [ ] | [ ] |
| Clients | /clients | [ ] | [ ] | [ ] |
| Orders | /orders | [ ] | [ ] | [ ] |
| Order Create | /orders/create | [ ] | [ ] | [ ] |
| Invoices | /invoices | [ ] | [ ] | [ ] |
| Inventory | /inventory | [ ] | [ ] | [ ] |
| Products | /products | [ ] | [ ] | [ ] |
| Samples | /samples | [ ] | [ ] | [ ] |
| Settings | /settings | [ ] | [ ] | [ ] |
| Calendar | /calendar | [ ] | [ ] | [ ] |
| Reports | /reports | [ ] | [ ] | [ ] |

---

## Browser Console Check

Open DevTools (F12) and check Console tab:

- [ ] No critical JavaScript errors
- [ ] No failed network requests (4xx/5xx)
- [ ] No warning about undefined/null access
- [ ] No React hydration errors

**Console Issues Found**:
___________

---

## Post-Deployment Monitoring

### Immediate (First 15 minutes)

- [ ] Check error tracking (Sentry) for new errors
- [ ] Check server logs for warnings
- [ ] Verify no increase in error rate
- [ ] Monitor response times

### Extended (First hour)

- [ ] Spot check 3 random features
- [ ] Test on mobile device
- [ ] Verify all critical workflows work

---

## Rollback Decision

If critical issues found:

| Issue Type | Action |
|------------|--------|
| Single feature broken | Document and continue monitoring |
| Multiple features broken | Consider rollback |
| Data corruption | Immediate rollback |
| Security vulnerability | Immediate rollback |

---

## Summary

| Test Area | Status |
|-----------|--------|
| Order Creation (BUG-040) | [ ] PASS / [ ] FAIL |
| Batch Detail View (BUG-041) | [ ] PASS / [ ] FAIL |
| Products Page (QA-049) | [ ] PASS / [ ] FAIL |
| Samples Page (QA-050) | [ ] PASS / [ ] FAIL |
| Global Search (BUG-042) | [ ] PASS / [ ] FAIL |
| Permission Handling (BUG-043) | [ ] PASS / [ ] FAIL |
| Navigation | [ ] PASS / [ ] FAIL |
| Console Errors | [ ] PASS / [ ] FAIL |

**Overall Verification Result**: [ ] PASS / [ ] FAIL

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Tester | | | |
| Dev Lead | | | |
| Product Owner | | | |

---

## Notes / Issues to Address

___________

---

*Last Updated: January 2026*
