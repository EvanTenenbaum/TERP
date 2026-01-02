# 🟣 Sprint D: Sales, Inventory & Quality Assurance

## Agent Assignment Prompt

You are assigned to execute **Sprint D** of the TERP ERP parallel sprint plan. This sprint focuses on Sales workflows, Inventory management, and Quality Assurance (testing & documentation). You will work in parallel with two other agents (Sprint B and Sprint C) who are working on different file domains.

---

## 🚨 CRITICAL: READ BEFORE STARTING

### Prerequisites
1. **Sprint A must be complete** - Verify schema is stable before starting
2. **Pull latest code** - `git pull origin main` to get Sprint A changes
3. **Regenerate types** - `pnpm generate` to update TypeScript types
4. **Create your branch** - `git checkout -b sprint-d/sales-inventory-qa`

### File Ownership Rules (STRICTLY ENFORCED)
You have **EXCLUSIVE WRITE ACCESS** to these files only:
```
# Backend Routers
server/routers/salesSheets.ts
server/routers/salesSheetEnhancements.ts
server/routers/inventory.ts
server/routers/inventoryMovements.ts
server/routers/inventoryShrinkage.ts
server/routers/batches.ts
server/routers/locations.ts
server/routers/warehouses.ts
server/routers/pricing.ts
server/routers/pricingProfiles.ts

# Frontend Pages
client/src/pages/SalesSheetCreatorPage.tsx
client/src/pages/PricingRulesPage.tsx
client/src/pages/PricingProfilesPage.tsx
client/src/pages/LocationsPage.tsx
client/src/pages/PhotographyPage.tsx
client/src/pages/PickPackPage.tsx
client/src/pages/PurchaseOrdersPage.tsx
client/src/pages/WorkflowQueuePage.tsx

# Testing & Documentation
tests/
docs/ (except docs/specs/ which is read-only)
scripts/test-*.ts
```

**DO NOT MODIFY** any files outside this list. Other agents are working on:
- Sprint B owns: `client/src/components/ui/`, `client/src/pages/Orders.tsx`, `client/src/pages/ClientsListPage.tsx`
- Sprint C owns: `server/routers/accounting.ts`, `server/routers/vipPortal*.ts`, `client/src/pages/accounting/`, `client/src/pages/ClientProfilePage.tsx`

**SPECIAL NOTE:** You have READ-ONLY access to `server/routers/orders.ts` for reference, but DO NOT modify it.

---

## 📋 Sprint Tasks

### Phase 1: Sales Workflow Improvements (20h)

#### QA-062: Implement Sales Sheet Save Functionality (6h)
**Source:** MASTER_ROADMAP.md

**Problem:** Sales sheet creator has no save/draft functionality

**Deliverables:**
- [ ] Add "Save Draft" button to sales sheet creator
- [ ] Implement draft persistence to database
- [ ] Add "Load Draft" functionality
- [ ] Add auto-save every 30 seconds
- [ ] Add draft list view

**🔴 REDHAT QA GATE 1.1:**
```
Before marking QA-062 complete:
□ Create a new sales sheet
□ Click "Save Draft" - verify saved
□ Navigate away and return
□ Load the draft - verify data restored
□ Verify auto-save triggers after 30s
□ Test with multiple drafts
□ Test draft deletion
```

#### QA-066: Implement Quote Discount and Notes Features (8h)
**Spec:** `docs/prompts/BUG-066.md` (if exists) or MASTER_ROADMAP.md

**Problem:** Quote creation missing discount application and notes/terms fields

**Deliverables:**
- [ ] Add discount input field to quote form (percentage and fixed amount)
- [ ] Implement discount calculation logic
- [ ] Add notes/terms textarea field
- [ ] Save discount and notes with quote
- [ ] Display discount and notes on quote preview
- [ ] Show discount in line item totals

**🔴 REDHAT QA GATE 1.2:**
```
Before marking QA-066 complete:
□ Add percentage discount - verify calculation
□ Add fixed amount discount - verify calculation
□ Add notes/terms - verify saved
□ Preview quote - verify discount shown
□ Preview quote - verify notes shown
□ Test discount + tax calculation
□ Test negative scenarios (discount > total)
```

#### SALES-001: Sales Sheet Version Control (6h)
**Source:** Sprint D Plan

**Problem:** No way to track sales sheet versions or clone existing sheets

**Deliverables:**
- [ ] Add version tracking to sales sheets
- [ ] Implement "Clone & Modify" functionality
- [ ] Add version history view
- [ ] Show version number on sheet

**🔴 REDHAT QA GATE 1.3 (PHASE 1 COMPLETE):**
```
Before proceeding to Phase 2:
□ Sales sheet save/draft works
□ Quote discounts calculate correctly
□ Quote notes are saved and displayed
□ Version control tracks changes
□ Clone functionality works
□ Run: pnpm test (all tests pass)
□ Run: pnpm build (no TypeScript errors)
□ Commit with message: "SPRINT-D Phase 1: Sales Workflow Improvements [REDHAT QA PASSED]"
```

---

### Phase 2: Inventory & Location Management (22h)

#### QA-063: Implement Location & Warehouse Management (16h)
**Source:** MASTER_ROADMAP.md

**Problem:** No clear way to manage locations and warehouses for inventory

**Deliverables:**
- [ ] Create warehouse management UI
- [ ] Implement location hierarchy (warehouse → zone → bin)
- [ ] Add location assignment to batches
- [ ] Implement location transfer workflow
- [ ] Add location capacity tracking
- [ ] Show location in inventory views

**🔴 REDHAT QA GATE 2.1:**
```
Before marking QA-063 complete:
□ Create a new warehouse
□ Add zones to warehouse
□ Add bins to zones
□ Assign batch to location
□ Transfer batch between locations
□ Verify capacity tracking works
□ Verify location shows in inventory list
□ Test location search/filter
```

#### QA-069: Implement Batch Media Upload (6h)
**Source:** MASTER_ROADMAP.md

**Problem:** No way to upload photos/media for batches

**Deliverables:**
- [ ] Add media upload component to batch form
- [ ] Implement file upload endpoint with S3 integration
- [ ] Store media references in database
- [ ] Display uploaded media in batch detail view
- [ ] Support multiple images per batch
- [ ] Add image preview/lightbox

**🔴 REDHAT QA GATE 2.2 (PHASE 2 COMPLETE):**
```
Before proceeding to Phase 3:
□ Upload single image to batch
□ Upload multiple images to batch
□ Images display in batch detail
□ Image preview/lightbox works
□ Delete image works
□ Location management fully functional
□ Run: pnpm test (all tests pass)
□ Run: pnpm build (no TypeScript errors)
□ Commit with message: "SPRINT-D Phase 2: Inventory & Location Management [REDHAT QA PASSED]"
```

---

### Phase 3: Testing Infrastructure & Documentation (16h)

#### TEST-001: Comprehensive Integration Testing (8h)
**Source:** MASTER_ROADMAP.md

**Problem:** No comprehensive E2E test suite for critical paths

**Deliverables:**
- [ ] Create E2E test suite structure
- [ ] Add integration tests for order workflow
- [ ] Add integration tests for inventory workflow
- [ ] Add integration tests for sales sheet workflow
- [ ] Document test coverage metrics
- [ ] Add test running instructions to README

**Test Coverage Requirements:**
```
Critical Paths to Test:
1. Order Creation → Fulfillment → Payment → Complete
2. Inventory Intake → Storage → Sale → Depletion
3. Sales Sheet Creation → Quote → Order Conversion
4. Client Creation → Credit Setup → Order with Credit
5. Return Request → Processing → Inventory Update
```

**🔴 REDHAT QA GATE 3.1:**
```
Before marking TEST-001 complete:
□ All 5 critical path tests written
□ Tests run successfully: pnpm test:e2e
□ Test coverage documented
□ CI/CD integration documented
□ Test data setup/teardown works
□ Tests are deterministic (no flaky tests)
```

#### DOCS-001: User Documentation Update (4h)
**Source:** MASTER_ROADMAP.md

**Problem:** User documentation outdated for new features

**Deliverables:**
- [ ] Update user guide for new features
- [ ] Create quick-start guide
- [ ] Document keyboard shortcuts
- [ ] Add troubleshooting section
- [ ] Review and update API documentation

**Documentation Structure:**
```
docs/
├── user-guide/
│   ├── getting-started.md
│   ├── orders.md
│   ├── inventory.md
│   ├── sales-sheets.md
│   ├── accounting.md
│   └── vip-portal.md
├── troubleshooting.md
├── keyboard-shortcuts.md
└── api/
    └── README.md
```

**🔴 REDHAT QA GATE 3.2:**
```
Before marking DOCS-001 complete:
□ Quick-start guide complete
□ All major features documented
□ Keyboard shortcuts listed
□ Troubleshooting section has common issues
□ Documentation is accurate (spot-check 5 features)
□ No broken links in documentation
```

#### QUAL-007: Final TODO Audit & Documentation (4h)
**Source:** MASTER_ROADMAP.md

**Problem:** 25+ non-critical TODOs remain in codebase

**Deliverables:**
- [ ] Audit all remaining TODOs in codebase
- [ ] Document acceptable technical debt in TECHNICAL_DEBT.md
- [ ] Create tasks for any critical items found
- [ ] Update documentation index

**TODO Audit Process:**
```bash
# Find all TODOs
grep -r "TODO" --include="*.ts" --include="*.tsx" . | wc -l

# Categorize by priority
# P0: Security/Data integrity issues
# P1: Functional bugs
# P2: Performance issues
# P3: Code quality/refactoring
# P4: Nice-to-have improvements
```

**🔴 REDHAT QA GATE 3.3 (PHASE 3 COMPLETE):**
```
Before marking sprint complete:
□ E2E test suite complete and passing
□ User documentation updated
□ TODO audit complete
□ TECHNICAL_DEBT.md updated
□ No P0 or P1 TODOs remaining
□ Run: pnpm test (all tests pass)
□ Run: pnpm build (no TypeScript errors)
□ Commit with message: "SPRINT-D Phase 3: Testing & Documentation [REDHAT QA PASSED]"
```

---

## 🔴 FINAL REDHAT QA GATE (SPRINT COMPLETE)

Before submitting your branch for merge:

### Code Quality
- [ ] `pnpm test` - All tests pass
- [ ] `pnpm test:e2e` - All E2E tests pass
- [ ] `pnpm build` - Zero TypeScript errors
- [ ] `pnpm lint` - No linting errors
- [ ] No `console.log` statements left in code
- [ ] No commented-out code blocks
- [ ] All new code has proper TypeScript types

### Functional Verification
- [ ] Sales sheet save/draft works
- [ ] Quote discounts work correctly
- [ ] Sales sheet version control works
- [ ] Location/warehouse management works
- [ ] Batch media upload works
- [ ] All E2E tests pass
- [ ] No regressions in existing functionality

### Documentation Verification
- [ ] User guide is complete and accurate
- [ ] API documentation is updated
- [ ] TECHNICAL_DEBT.md is current
- [ ] README has test instructions

### Test Quality
- [ ] Tests are deterministic (run 3x, same result)
- [ ] Tests have proper setup/teardown
- [ ] Test coverage meets requirements
- [ ] No skipped tests without justification

### Git Hygiene
- [ ] All commits have descriptive messages
- [ ] No merge conflicts with main
- [ ] Branch is rebased on latest main

### Final Commit
```bash
git add .
git commit -m "SPRINT-D Complete: Sales, Inventory & Quality Assurance [REDHAT QA PASSED]

Phase 1: Sales Workflow Improvements (QA-062, QA-066, SALES-001)
Phase 2: Inventory & Location Management (QA-063, QA-069)
Phase 3: Testing & Documentation (TEST-001, DOCS-001, QUAL-007)

All Redhat QA gates passed.
E2E test suite added.
Documentation updated.
Ready for integration."

git push origin sprint-d/sales-inventory-qa
```

---

## 🚫 ROLLBACK PROCEDURES

If you introduce a regression or break existing functionality:

### Level 1: Revert Last Commit
```bash
git revert HEAD
```

### Level 2: Revert to Phase Checkpoint
```bash
git log --oneline  # Find checkpoint commit
git revert <commit_hash>..HEAD
```

### Level 3: Abandon Branch
```bash
git checkout main
git branch -D sprint-d/sales-inventory-qa
git checkout -b sprint-d/sales-inventory-qa  # Start fresh
```

### Test Rollback
```bash
# If tests are failing and blocking others
git stash  # Save your changes
git checkout main
pnpm test  # Verify main is stable
git checkout sprint-d/sales-inventory-qa
git stash pop  # Restore changes
# Debug the issue
```

---

## 📞 ESCALATION

If you encounter:
- **File conflicts with other sprints** → STOP and report immediately
- **Schema/type errors after Sprint A** → Run `pnpm generate` and retry
- **Blocking bugs in Sprint A code** → Document and escalate
- **Need to modify files outside your domain** → Request coordination
- **S3/file upload issues** → Check environment variables, escalate if needed
- **Unclear requirements** → Check spec files first, then escalate

---

## ⏱️ TIME ESTIMATES

| Phase | Tasks | Estimate | Checkpoint |
|-------|-------|----------|------------|
| Phase 1 | QA-062, QA-066, SALES-001 | 20h | QA Gate 1.3 |
| Phase 2 | QA-063, QA-069 | 22h | QA Gate 2.2 |
| Phase 3 | TEST-001, DOCS-001, QUAL-007 | 16h | QA Gate 3.3 |
| **Total** | | **58h** | Final QA Gate |

---

## 🎯 SUCCESS CRITERIA

Sprint D is successful when:
1. All 8 tasks completed and verified
2. All Redhat QA gates passed
3. E2E test suite passing
4. Documentation complete and accurate
5. Zero regressions in existing functionality
6. Branch ready for merge (no conflicts)
7. Technical debt documented

**DO NOT submit your branch until ALL criteria are met.**

---

## 📊 TESTING CHECKLIST

### Sales Sheet Flow
- [ ] Create new sales sheet
- [ ] Save as draft
- [ ] Load draft
- [ ] Auto-save triggers
- [ ] Clone existing sheet
- [ ] Version history shows

### Quote Flow
- [ ] Add percentage discount
- [ ] Add fixed discount
- [ ] Add notes/terms
- [ ] Preview shows discount
- [ ] Preview shows notes
- [ ] Calculations correct

### Inventory/Location Flow
- [ ] Create warehouse
- [ ] Create zones
- [ ] Create bins
- [ ] Assign batch to location
- [ ] Transfer batch
- [ ] Capacity tracking

### Media Upload Flow
- [ ] Upload single image
- [ ] Upload multiple images
- [ ] View images
- [ ] Delete image
- [ ] Preview/lightbox

### E2E Test Flows
- [ ] Order workflow
- [ ] Inventory workflow
- [ ] Sales sheet workflow
- [ ] Client/credit workflow
- [ ] Returns workflow

---

## 🔧 ENVIRONMENT SETUP

### S3 Configuration (for media upload)
Ensure these environment variables are set:
```
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=xxx
AWS_REGION=xxx
```

### Test Database
For E2E tests, use a separate test database:
```
DATABASE_URL_TEST=xxx
```

### Running Tests
```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Specific test file
pnpm test tests/e2e/orders.test.ts

# With coverage
pnpm test:coverage
```
