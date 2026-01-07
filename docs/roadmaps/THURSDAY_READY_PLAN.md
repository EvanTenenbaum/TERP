# TERP Thursday Ready Plan

**Deadline**: Thursday, January 9, 2026  
**Goal**: Reliably working version for user testing and training across ALL flows  
**Philosophy**: Fix what users will see/use. Defer cleanup that doesn't affect UX.

---

## Executive Summary

**Time Available**: ~2.5 days  
**Focus**: User-facing functionality ONLY  
**Deferred**: Code cleanup, technical debt, test coverage, performance optimization

### What Users Need to Do (Training Scenarios)

1. **Create and manage orders** ← BLOCKED by BUG-040
2. **View inventory/batch details** ← BLOCKED by BUG-041
3. **Find products/clients via search** ← BLOCKED by BUG-042
4. **View products catalog** ← BLOCKED by QA-049
5. **Manage samples** ← BLOCKED by QA-050
6. **Navigate all pages without errors**
7. **Complete full sales cycle**
8. **Use VIP Portal**

---

## MUST FIX (Blocks User Testing)

### Tier 1: App Crashes / Core Features Broken (Day 1)

| ID | Issue | Impact | Est. Hours | Fix Complexity |
|----|-------|--------|------------|----------------|
| **BUG-040** | Order Creator can't load inventory | **Can't create orders** | 2-3 | Medium - add empty array check |
| **BUG-041** | Batch Detail View crashes app | **App crashes on click** | 1-2 | Easy - add null checks |
| **QA-049** | Products page shows empty | **Can't see products** | 1-2 | Easy - likely filter issue |
| **QA-050** | Samples page shows empty | **Can't see samples** | 1-2 | Easy - likely filter issue |

**Day 1 Total: 6-9 hours**

### Tier 2: Major UX Broken (Day 1-2)

| ID | Issue | Impact | Est. Hours | Fix Complexity |
|----|-------|--------|------------|----------------|
| **BUG-042** | Global Search returns nothing | **Can't find anything** | 2-3 | Medium - add product fields |
| **BUG-045** | Retry button resets form | **Data loss frustration** | 0.5 | Easy - change to refetch() |
| **BUG-046** | Settings Users tab auth error | **Confusing error** | 1 | Easy - better error message |

**Day 2 Total: 3.5-4.5 hours**

### Tier 3: Pages That Should Work (Day 2)

| ID | Issue | Impact | Est. Hours |
|----|-------|--------|------------|
| **BUG-070** | Spreadsheet View 404 | Page missing | 1-2 |
| **Verify** | All nav links work | No dead ends | 1 |
| **Verify** | All modals open/close | No stuck states | 1 |

**Day 2 Total: 3-4 hours**

---

## SHOULD FIX (Better Training Experience)

### Tier 4: Polish for Training (Day 2-3)

| ID | Issue | Impact | Est. Hours |
|----|-------|--------|------------|
| Empty states | Analytics, Calendar show blank | Confusing | 2-3 |
| Loading states | Tables show nothing while loading | Confusing | 1-2 |
| Error messages | Generic "Authentication required" | Confusing | 1-2 |

**Day 3 Total: 4-7 hours**

---

## DEFER (Post-Thursday)

These won't affect user testing/training:

| Category | Items | Why Defer |
|----------|-------|-----------|
| **SQL Safety** | BUG-043, BUG-044, etc. | Edge cases, won't hit in training |
| **Technical Debt** | 35 TODOs, test mocks | Doesn't affect UX |
| **Performance** | Query optimization, caching | Good enough for training |
| **Integrations** | Email/SMS notifications | Not needed for training |
| **Feature Completion** | Dashboard customization | Nice to have |
| **Code Quality** | @ts-ignore removal | Already done, no impact |

---

## Execution Plan

### Day 1 (Tuesday): Critical Fixes

```
Morning (4 hours):
├── BUG-040: Order Creator inventory loading
│   └── File: server/pricingEngine.ts:332-362
│   └── Fix: Add if (ruleIds.length === 0) return []
│
└── BUG-041: Batch Detail View crash
    └── File: client/src/components/inventory/BatchDetailDrawer.tsx
    └── Fix: Add (locations || []).map() and (auditLogs || []).map()

Afternoon (4 hours):
├── QA-049: Products page empty
│   └── File: client/src/pages/ProductsPage.tsx
│   └── Investigate: Check query filters, archived status
│
└── QA-050: Samples page empty
    └── File: client/src/pages/SamplesPage.tsx  
    └── Investigate: Check query filters, status filter
```

### Day 2 (Wednesday): Search & Verification

```
Morning (4 hours):
├── BUG-042: Global Search
│   └── File: server/routers/search.ts:94-113
│   └── Fix: Add products.name, products.strain to search
│
├── BUG-045: Retry button
│   └── File: client/src/pages/OrderCreatorPage.tsx:575
│   └── Fix: Replace window.location.reload() with refetchInventory()
│
└── BUG-046: Settings Users error
    └── File: server/_core/trpc.ts or permissionMiddleware.ts
    └── Fix: Change error message to "Permission denied" for logged-in users

Afternoon (4 hours):
├── BUG-070: Spreadsheet View
│   └── Check route configuration
│
├── Full Navigation Test
│   └── Click every nav link, verify no 404s
│
└── Full Modal Test
    └── Open/close every modal, verify no stuck states
```

### Day 3 (Thursday Morning): Final Verification

```
Morning (2-3 hours):
├── End-to-end workflow testing
│   └── Create order flow
│   └── View inventory flow
│   └── Search flow
│
├── Fix any remaining issues found
│
└── Deploy to production
```

---

## Quick Reference: Fix Locations

### BUG-040: Order Creator Inventory Loading
```typescript
// server/pricingEngine.ts around line 332-362
// Current: sql.raw(ruleIds.join(",")) fails when ruleIds is empty

// Fix:
if (ruleIds.length === 0) {
  return []; // Return empty array instead of invalid SQL
}
```

### BUG-041: Batch Detail View Crash
```typescript
// client/src/components/inventory/BatchDetailDrawer.tsx
// Current: locations.map() crashes if locations is undefined

// Fix:
{(batch?.locations || []).map(loc => ...)}
{(batch?.auditLogs || []).map(log => ...)}
```

### BUG-042: Global Search
```typescript
// server/routers/search.ts around line 94-113
// Current: Only searches batches.code, batches.sku

// Fix: Add to search query
or(
  ilike(batches.code, searchPattern),
  ilike(batches.sku, searchPattern),
  ilike(products.name, searchPattern),      // ADD
  ilike(products.strain, searchPattern),    // ADD
  ilike(clients.name, searchPattern),       // ADD
  ilike(clients.company, searchPattern),    // ADD
)
```

### BUG-045: Retry Button
```typescript
// client/src/pages/OrderCreatorPage.tsx line 575
// Current: window.location.reload()

// Fix:
onClick={() => refetchInventory()}
```

### QA-049/QA-050: Empty Pages
```typescript
// Likely issue: Default filter excluding all records
// Check for: archived: false, status filters, tenant filters

// Debug: Log the query and results
console.log('Query params:', params);
console.log('Results:', data);
```

---

## Success Criteria for Thursday

### Must Work (Training Blockers)

- [ ] Order Creator loads inventory and allows order creation
- [ ] Batch Detail View opens without crashing
- [ ] Products page shows all 121 products
- [ ] Samples page shows all 6 samples
- [ ] Global Search finds products by name
- [ ] All navigation links work (no 404s)

### Should Work (Better Experience)

- [ ] Retry buttons don't lose data
- [ ] Error messages are clear
- [ ] Empty states show helpful messages
- [ ] Loading states are visible

### Can Skip (Post-Thursday)

- [ ] SQL edge case safety
- [ ] Email/SMS integrations
- [ ] Performance optimization
- [ ] Test coverage
- [ ] Code cleanup

---

## Risk Mitigation

### If Running Behind

1. **Skip Tier 4** (polish) entirely
2. **Workaround QA-049/050** by telling users to use Batches page instead
3. **Workaround BUG-042** by telling users to navigate directly

### If Something Breaks

1. **Rollback** to previous deployment
2. **Feature flag** the broken feature
3. **Document workaround** for training

---

## Post-Thursday Backlog

Everything deferred goes here for next sprint:

1. SQL safety fixes (BUG-043, 044, etc.)
2. Integration completion (email, SMS)
3. Technical debt (TODOs, test mocks)
4. Performance optimization
5. Feature enhancements
6. Code quality improvements
