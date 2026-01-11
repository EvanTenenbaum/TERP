# QA Bug Fixes Roadmap - January 2026

**Status:** 🟠 Ready to Start
**Priority:** High
**Estimated Time:** 3-5 days
**Created:** January 11, 2026
**Source:** QA Test Analysis Report (274 test cases)

---

## Overview

This roadmap addresses all bugs, TypeScript errors, and systemic issues identified in the January 2026 QA testing cycle. The fixes are organized into 5 phases, prioritized by severity and user impact.

## Why This Matters

- **16 FAIL cases** blocking core functionality
- **12 TypeScript errors** compromising build integrity
- **42 BLOCKED tests** indicating navigation/UX gaps
- Calendar module entirely non-functional for read operations
- Batch management inaccessible via direct URLs

---

## Phases

### Phase 1: Critical Calendar Fix (8h)

**Objective:** Restore Calendar module functionality

**Tasks:**

#### QA-001: Fix Calendar Database Layer

**Status:** ready
**Priority:** HIGH
**Estimate:** 4-8h
**Module:** `server/calendarDb.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/QA-001.md`

**Problem:**
Calendar database layer has duplicate availability checks and incomplete filter implementation, causing all calendar read operations to fail.

**Objectives:**

1. Remove duplicate database availability checks throughout calendarDb.ts
2. Implement proper filter logic for modules, eventTypes, statuses, and priorities
3. Add comprehensive error handling with meaningful messages

**Deliverables:**

- [ ] Remove 30+ duplicate `if (!db) throw` statements
- [ ] Implement dynamic query building for `getEventsByDateRange()` filters
- [ ] Add unit tests for calendar database layer
- [ ] Verify calendar.getEvents returns filtered results
- [ ] Confirm all 9 FAIL cases now pass

---

### Phase 2: Routing Fixes (4h)

**Objective:** Fix navigation and routing issues

**Tasks:**

#### QA-002: Add Batches Route

**Status:** ready
**Priority:** HIGH
**Estimate:** 2h
**Module:** `client/src/App.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/QA-002.md`

**Problem:**
Users navigating to `/batches` receive 404 error. Batch functionality exists but is only accessible through `/inventory`.

**Objectives:**

1. Add proper routing for `/batches` URL
2. Ensure consistency between navigation and direct URL access
3. Maintain backward compatibility with existing `/inventory` route

**Deliverables:**

- [ ] Add `/batches` route to App.tsx (redirect or dedicated page)
- [ ] Update navigation config if needed
- [ ] Add route test coverage
- [ ] Verify all 7 batch FAIL cases resolve
- [ ] Update any documentation referencing `/batches`

---

#### QA-003: Add Invoice Route Redirect

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 1h
**Module:** `client/src/App.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/QA-003.md`

**Problem:**
Navigation inconsistency: `/invoices` returns 404 while correct path is `/accounting/invoices`.

**Objectives:**

1. Add redirect from `/invoices` to `/accounting/invoices`
2. Prevent user confusion from broken bookmarks/links
3. Maintain SEO-friendly URL structure

**Deliverables:**

- [ ] Add redirect route for `/invoices`
- [ ] Test redirect works correctly
- [ ] Verify no circular redirect issues
- [ ] Update any hardcoded `/invoices` links
- [ ] Add to route documentation

---

### Phase 3: TypeScript Error Fixes (8h)

**Objective:** Resolve all TypeScript compilation errors

**Tasks:**

#### QA-004: Fix Client-Side TypeScript Errors

**Status:** ready
**Priority:** HIGH
**Estimate:** 4-8h
**Module:** `client/src/`
**Dependencies:** None
**Prompt:** `docs/prompts/QA-004.md`

**Problem:**
9 TypeScript errors in client code preventing clean builds and compromising type safety.

**Objectives:**

1. Fix all type mismatches in sales and shopping components
2. Resolve undefined variable references
3. Ensure proper null handling throughout

**Deliverables:**

- [ ] Fix `SalesSheetPreview.tsx:286` - Add missing `priceMarkup` property
- [ ] Fix `LiveShoppingSession.tsx:636` - Define or remove `priceChange` variable
- [ ] Fix `OrderCreatorPage.tsx:188` - Add required `version` property
- [ ] Fix `SalesSheetCreatorPage.tsx:323` - Resolve type incompatibility
- [ ] Fix `SearchResultsPage.tsx` (4 errors) - Proper type assertions
- [ ] Fix `LiveShoppingPage.tsx:67` - Handle null case properly
- [ ] Verify `pnpm tsc --noEmit` passes with 0 errors

---

#### QA-005: Fix Server-Side TypeScript Errors

**Status:** ready
**Priority:** HIGH
**Estimate:** 2h
**Module:** `server/routers/`
**Dependencies:** None
**Prompt:** `docs/prompts/QA-005.md`

**Problem:**
2 TypeScript errors in server routers affecting order and live shopping functionality.

**Objectives:**

1. Fix property access errors in order router
2. Resolve SQL type mismatch in VIP portal router
3. Maintain backward compatibility

**Deliverables:**

- [ ] Fix `orders.ts:349` - Add or correct `productCategory` property access
- [ ] Fix `vipPortalLiveShopping.ts:485` - Correct SQL comparison types
- [ ] Add type guards where needed
- [ ] Verify server builds without errors
- [ ] Run affected unit tests

---

### Phase 4: Navigation Improvements (8h)

**Objective:** Enable testing of blocked features

**Tasks:**

#### QA-006: Add Navigation for Blocked Features

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 8h
**Module:** `client/src/config/navigation.ts`, `client/src/App.tsx`
**Dependencies:** QA-002, QA-003
**Prompt:** `docs/prompts/QA-006.md`

**Problem:**
27 test cases blocked due to navigation issues. Features exist but aren't accessible through standard navigation.

**Objectives:**

1. Add navigation paths for client sub-features (activity, tags, notes, communications)
2. Expose workflow/todo features in sidebar
3. Add analytics and auth profile access

**Deliverables:**

- [ ] Add Client Activity tab/link on client detail page
- [ ] Add Client Tags management UI access
- [ ] Add Client Notes section navigation
- [ ] Add Client Communications panel access
- [ ] Add Todo Lists to sidebar navigation
- [ ] Add Analytics page to sidebar (currently only "Reports" label)
- [ ] Add user profile/account settings link
- [ ] Update navigation tests

---

### Phase 5: Test Infrastructure (16h)

**Objective:** Enable comprehensive test coverage

**Tasks:**

#### QA-007: Create Test Data Seeding

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 8h
**Module:** `scripts/`, `tests/fixtures/`
**Dependencies:** None
**Prompt:** `docs/prompts/QA-007.md`

**Problem:**
9 test cases blocked due to missing data (no confirmed orders, no draft orders, specific invoice states).

**Objectives:**

1. Create repeatable test data seeding script
2. Include various order states (draft, confirmed, completed)
3. Include various invoice states (pending, sent, paid, void-eligible)

**Deliverables:**

- [ ] Create `scripts/seed-test-data.ts` script
- [ ] Add draft order fixtures
- [ ] Add confirmed order fixtures
- [ ] Add completed order fixtures (for invoice generation)
- [ ] Add invoice fixtures in various states
- [ ] Document seeding process
- [ ] Add npm script for test data seeding

---

#### QA-008: Add Safe Test Mode for Destructive Operations

**Status:** ready
**Priority:** LOW
**Estimate:** 8h
**Module:** `server/_core/`, `tests/`
**Dependencies:** QA-007
**Prompt:** `docs/prompts/QA-008.md`

**Problem:**
6 test cases blocked because destructive operations (delete, archive) were too risky to test on production-like data.

**Objectives:**

1. Implement test mode flag for safe destructive testing
2. Create isolated test data that can be safely deleted
3. Add rollback capability for test operations

**Deliverables:**

- [ ] Add `TEST_MODE` environment variable support
- [ ] Create test-specific data markers
- [ ] Implement soft-delete verification tests
- [ ] Add rollback mechanism for test operations
- [ ] Document safe testing procedures
- [ ] Create CI/CD integration for test mode

---

## Dependencies

```
Phase 1 (Calendar) ─┐
                    ├──> Phase 4 (Navigation) ──> Phase 5 (Test Infrastructure)
Phase 2 (Routing) ──┤
                    │
Phase 3 (TypeScript)┘
```

Phases 1, 2, and 3 can be executed in parallel.
Phase 4 depends on routing fixes.
Phase 5 depends on navigation being stable.

---

## Key Deliverables

1. **0 TypeScript errors** - Clean `pnpm tsc --noEmit`
2. **0 FAIL test cases** - All 16 currently failing tests pass
3. **Reduced BLOCKED cases** - From 42 to <10 (data-dependent only)
4. **Improved navigation** - All major features accessible via UI
5. **Test data seeding** - Repeatable test environment setup

---

## Testing Checklist

### Pre-Deployment

- [ ] All TypeScript errors resolved
- [ ] Unit tests pass (`pnpm test:unit`)
- [ ] E2E smoke tests pass (`pnpm test:smoke`)
- [ ] Calendar getEvents returns data
- [ ] `/batches` route works
- [ ] `/invoices` redirects correctly

### Post-Deployment

- [ ] Re-run full QA test suite
- [ ] Verify 16 FAIL cases now PASS
- [ ] Verify navigation improvements
- [ ] Monitor error logs for calendar issues

---

## Success Criteria

1. All 16 FAIL cases converted to PASS
2. TypeScript compilation succeeds with 0 errors
3. BLOCKED cases reduced by at least 50%
4. No regression in existing PASS cases
5. Calendar module fully functional

---

## Risk Assessment

| Risk                                  | Impact | Mitigation                          |
| ------------------------------------- | ------ | ----------------------------------- |
| Calendar fix affects other queries    | HIGH   | Comprehensive testing before deploy |
| Route changes break existing links    | MEDIUM | Add redirects, not replacements     |
| TypeScript fixes cause runtime errors | MEDIUM | Test each fix individually          |

---

## Related Documentation

- [QA Test Analysis Report](../audits/QA-TEST-ANALYSIS-REPORT-2026-01-11.md)
- [Development Protocols](../DEVELOPMENT_PROTOCOLS.md)
- [Batch Status Transitions](../batch-status-transitions.md)

---

**Last Updated:** January 11, 2026
**Owner:** Development Team
**Reviewer:** QA Team
