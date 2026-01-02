# 🔴 REDHAT QA: Sprint A-E Comprehensive Verification

---

## Agent Identity & Mission

You are a **Senior QA Engineer** performing a comprehensive Redhat QA verification of all work completed in Sprints A, B, C, D, and E of the TERP ERP system. Your mission is adversarial: **find every bug, stub, placeholder, fake data, regression, and incomplete implementation**.

**Your mindset:** Assume nothing works until proven otherwise. Trust no code. Verify everything.

---

## Before ANY Work

1. Pull latest: `git pull origin main`
2. Install dependencies: `pnpm install`
3. Generate types: `pnpm generate`
4. Run build: `pnpm build` (must pass with 0 errors)
5. Start dev server: `pnpm dev`
6. Access production: `https://terp-app-b9s35.ondigitalocean.app`

---

## 🚨 CRITICAL: Use Gemini Pro for Analysis

**MANDATORY:** Use the Gemini 3.5 Pro API for all code analysis in this QA process.

```python
from google import genai
import os
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

# Use for code analysis
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Analyze this code for stubs, placeholders, and incomplete implementations: ..."
)
```

---

## Verification Scope

### Sprint A: Backend Infrastructure & Schema (60h)
**Branch:** `sprint-a/infrastructure`
**Owner:** DevOps Lead

### Sprint B: Frontend UX & UI Components (66h)
**Branch:** `sprint-b/frontend-ux`
**Owner:** Frontend Agent

### Sprint C: Accounting & VIP Portal (54h)
**Branch:** `sprint-c/accounting-vip`
**Owner:** Full-Stack Agent

### Sprint D: Sales, Inventory & QA (58h)
**Branch:** `sprint-d/sales-inventory-qa`
**Owner:** Full-Stack/QA Agent

### Sprint E: Calendar, Vendors & CRM (58h)
**Branch:** `sprint-e/calendar-vendors-crm`
**Owner:** Full-Stack Agent

**Total Work to Verify:** 296 hours across ~45 tasks

---

## 🔴 PHASE 1: CODE QUALITY SCAN (Automated)

### 1.1 Build & Type Verification
```bash
# Must all pass with 0 errors
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

**🔴 FAIL CRITERIA:**
- [ ] Any TypeScript errors
- [ ] Any ESLint errors (not warnings)
- [ ] Build failures
- [ ] Test failures

### 1.2 Stub/Placeholder Detection
Run these searches and document ALL findings:

```bash
# Search for TODO comments
grep -rn "TODO" --include="*.ts" --include="*.tsx" server/ client/src/ | grep -v node_modules

# Search for FIXME comments
grep -rn "FIXME" --include="*.ts" --include="*.tsx" server/ client/src/ | grep -v node_modules

# Search for placeholder text
grep -rn "placeholder\|Placeholder\|PLACEHOLDER" --include="*.ts" --include="*.tsx" server/ client/src/ | grep -v node_modules

# Search for stub implementations
grep -rn "stub\|Stub\|STUB\|mock\|Mock\|MOCK" --include="*.ts" --include="*.tsx" server/ client/src/ | grep -v node_modules | grep -v __tests__ | grep -v test

# Search for fake/demo data
grep -rn "fake\|Fake\|FAKE\|demo\|Demo\|DEMO\|dummy\|Dummy\|DUMMY" --include="*.ts" --include="*.tsx" server/ client/src/ | grep -v node_modules | grep -v __tests__

# Search for hardcoded test values
grep -rn "test@\|123456\|password123\|admin123" --include="*.ts" --include="*.tsx" server/ client/src/ | grep -v node_modules

# Search for console.log statements (should be removed)
grep -rn "console\.log" --include="*.ts" --include="*.tsx" server/ client/src/ | grep -v node_modules

# Search for throw new Error without proper handling
grep -rn "throw new Error\|throw Error" --include="*.ts" --include="*.tsx" server/ client/src/ | grep -v node_modules

# Search for any type usage
grep -rn ": any\|as any\|<any>" --include="*.ts" --include="*.tsx" server/ client/src/ | grep -v node_modules
```

**🔴 DOCUMENT ALL FINDINGS** in a file: `docs/qa-reviews/SPRINT-VERIFICATION-STUBS.md`

### 1.3 Dead Code Detection
```bash
# Find unused exports
npx ts-prune | head -100

# Find unused dependencies
npx depcheck
```

### 1.4 Security Scan
```bash
# Check for exposed secrets
grep -rn "API_KEY\|SECRET\|PASSWORD\|TOKEN" --include="*.ts" --include="*.tsx" server/ client/src/ | grep -v "process.env\|import.meta.env" | grep -v node_modules

# Check for SQL injection vulnerabilities
grep -rn "sql\`\|\.raw\(" --include="*.ts" server/ | grep -v node_modules
```

---

## 🔴 PHASE 2: SPRINT A VERIFICATION (Infrastructure)

### 2.1 Schema Synchronization
```bash
# Generate current schema from Drizzle
pnpm drizzle-kit generate

# Check for pending migrations
ls -la drizzle/migrations/

# Verify schema matches production
pnpm drizzle-kit push --dry-run
```

**🔴 VERIFICATION CHECKLIST:**
- [ ] Zero schema drift between Drizzle definitions and production database
- [ ] All FEATURE-012 tables exist: `adminImpersonationSessions`, `adminImpersonationActions`
- [ ] All feature flag tables exist: `feature_flags`, `feature_flag_role_overrides`, `feature_flag_user_overrides`, `feature_flag_audit_logs`
- [ ] All indexes defined in schema exist in production
- [ ] Foreign key constraints are properly defined

### 2.2 Optimistic Locking Verification
```bash
# Check for version columns on critical tables
grep -rn "version.*integer\|updatedAt" drizzle/schema*.ts
```

**🔴 VERIFICATION CHECKLIST:**
- [ ] `orders` table has version column
- [ ] `inventory` table has version column
- [ ] `clients` table has version column
- [ ] Optimistic locking middleware is implemented
- [ ] Concurrent update test passes

### 2.3 Backup System Verification
```bash
# Check backup scripts exist
ls -la scripts/backup*.ts scripts/*backup*

# Verify S3 configuration
grep -rn "S3\|backup" scripts/
```

**🔴 VERIFICATION CHECKLIST:**
- [ ] Backup script exists and is executable
- [ ] S3 bucket configuration is correct
- [ ] Backup runs without errors (dry run)
- [ ] Restore procedure documented and tested

### 2.4 Index Verification
```sql
-- Run against production database
SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';
```

**🔴 VERIFICATION CHECKLIST:**
- [ ] All foreign keys have indexes
- [ ] Composite indexes for common queries exist
- [ ] No duplicate indexes

---

## 🔴 PHASE 3: SPRINT B VERIFICATION (Frontend UX)

### 3.1 Navigation Verification
**Test EVERY navigation item in the sidebar:**

| # | Navigation Item | URL | Expected | Status |
|---|-----------------|-----|----------|--------|
| 1 | Dashboard | `/` | Dashboard loads with KPIs | ⬜ |
| 2 | Orders | `/orders` | Orders list loads | ⬜ |
| 3 | Clients | `/clients` | Clients list loads | ⬜ |
| 4 | Inventory | `/inventory` | Inventory list loads | ⬜ |
| 5 | Batches | `/batches` | Batches list loads | ⬜ |
| 6 | Locations | `/locations` | Locations list loads | ⬜ |
| 7 | Vendors | `/vendors` | Vendors list loads | ⬜ |
| 8 | Calendar | `/calendar` | Calendar loads | ⬜ |
| 9 | Tasks | `/tasks` | Tasks list loads | ⬜ |
| 10 | Sales Sheets | `/sales-sheets` | Sales sheets load | ⬜ |
| 11 | Quotes | `/quotes` | Quotes list loads | ⬜ |
| 12 | Pick & Pack | `/pick-pack` | Pick & Pack loads | ⬜ |
| 13 | Accounting | `/accounting` | Accounting dashboard loads | ⬜ |
| 14 | Invoices | `/invoices` | Invoices list loads | ⬜ |
| 15 | Payments | `/payments` | Payments list loads | ⬜ |
| 16 | Credit | `/credit` | Credit management loads | ⬜ |
| 17 | Reports | `/reports` | Reports page loads | ⬜ |
| 18 | Analytics | `/analytics` | Analytics loads | ⬜ |
| 19 | Leaderboard | `/leaderboard` | Leaderboard loads | ⬜ |
| 20 | VIP Portal | `/vip-portal` | VIP Portal loads | ⬜ |
| 21 | Settings | `/settings` | Settings page loads | ⬜ |
| 22 | Feature Flags | `/settings/feature-flags` | Feature flags load | ⬜ |
| 23 | Users | `/users` | Users list loads | ⬜ |
| 24 | Roles | `/roles` | Roles list loads | ⬜ |
| 25 | Inbox | `/inbox` | Inbox loads | ⬜ |
| 26 | Help | `/help` | Help page loads | ⬜ |
| 27 | Profile | `/profile` | Profile loads | ⬜ |

**🔴 FAIL CRITERIA:**
- Any 404 errors
- Any infinite loading states
- Any blank pages
- Any JavaScript errors in console

### 3.2 KPI Card Actionability
**Test EVERY KPI card on the dashboard:**

| KPI Card | Click Action | Expected Result | Status |
|----------|--------------|-----------------|--------|
| Total Revenue | Click | Navigate to filtered view | ⬜ |
| Total Orders | Click | Navigate to orders list | ⬜ |
| Active Clients | Click | Navigate to clients list | ⬜ |
| Low Stock Items | Click | Navigate to filtered inventory | ⬜ |
| Pending Invoices | Click | Navigate to filtered invoices | ⬜ |
| Outstanding Balance | Click | Navigate to credit view | ⬜ |

**🔴 VERIFICATION:**
- [ ] Each KPI card is clickable (cursor: pointer)
- [ ] Click navigates to appropriate filtered view
- [ ] Filter is correctly applied after navigation

### 3.3 Table Row Actionability
**Test table row clicks on these pages:**

| Page | Row Click | Expected Result | Status |
|------|-----------|-----------------|--------|
| Orders | Click row | Navigate to order detail | ⬜ |
| Clients | Click row | Navigate to client profile | ⬜ |
| Inventory | Click row | Navigate to product detail | ⬜ |
| Invoices | Click row | Navigate to invoice detail | ⬜ |
| Vendors | Click row | Navigate to vendor detail | ⬜ |

### 3.4 Bulk Actions Verification
**Test bulk actions on these tables:**

| Table | Select Multiple | Bulk Action | Expected Result | Status |
|-------|-----------------|-------------|-----------------|--------|
| Orders | ✓ | Export | CSV downloads | ⬜ |
| Clients | ✓ | Export | CSV downloads | ⬜ |
| Inventory | ✓ | Update Status | Status changes | ⬜ |
| Invoices | ✓ | Mark Paid | Status changes | ⬜ |

### 3.5 Empty State Verification
**Navigate to each page with no data and verify:**

- [ ] Icon is displayed
- [ ] Title is displayed
- [ ] Description is displayed
- [ ] Call-to-action button exists and works

### 3.6 Error Handling Verification
**Trigger errors and verify handling:**

| Scenario | Expected Behavior | Status |
|----------|-------------------|--------|
| Network offline | Error message displayed | ⬜ |
| API returns 500 | Error message displayed | ⬜ |
| Invalid form input | Validation message shown | ⬜ |
| Session expired | Redirect to login | ⬜ |

---

## 🔴 PHASE 4: SPRINT C VERIFICATION (Accounting & VIP Portal)

### 4.1 Critical Bug Fixes
**Verify these bugs are actually fixed:**

| Bug | Test Steps | Expected Result | Status |
|-----|------------|-----------------|--------|
| BUG-037 | Create VIP Portal order | No FK constraint error | ⬜ |
| BUG-038 | Click "Generate Credit Limit" | Button functions | ⬜ |
| BUG-039 | View Client Profile COGS | No duplication | ⬜ |

### 4.2 VIP Portal Impersonation
**Test the complete impersonation flow:**

1. [ ] Navigate to Settings > VIP Portal
2. [ ] Select a client to impersonate
3. [ ] Click "Impersonate" button
4. [ ] Verify impersonation banner appears
5. [ ] Verify you see client's view
6. [ ] Verify actions are logged to audit table
7. [ ] Click "End Session" 
8. [ ] Verify session ends correctly
9. [ ] Check `adminImpersonationSessions` table for record
10. [ ] Check `adminImpersonationActions` table for actions

**🔴 CRITICAL:** Verify OLD impersonation path is disabled!

### 4.3 Accounting Features
**Test each accounting feature:**

| Feature | Test Steps | Expected Result | Status |
|---------|------------|-----------------|--------|
| Fiscal Periods | Create new period | Period created | ⬜ |
| Trial Balance | Generate report | Report displays | ⬜ |
| COGS Calculation | View product COGS | Correct calculation | ⬜ |
| GL Posting | Create transaction | GL entries created | ⬜ |

### 4.4 Live Shopping
**Test the live shopping flow:**

1. [ ] Navigate to Live Shopping
2. [ ] Create new live session
3. [ ] Add products to session
4. [ ] Simulate client joining
5. [ ] Process order through live shopping
6. [ ] Verify order created correctly

### 4.5 Quotes & Returns
**Test quotes and returns:**

| Feature | Test Steps | Expected Result | Status |
|---------|------------|-----------------|--------|
| Create Quote | Fill form, save | Quote created | ⬜ |
| Convert Quote | Convert to order | Order created | ⬜ |
| Create Return | Process return | Return recorded | ⬜ |
| Refund | Issue refund | Refund processed | ⬜ |

---

## 🔴 PHASE 5: SPRINT D VERIFICATION (Sales & Inventory)

### 5.1 Sales Sheet Functionality
**Test sales sheet features:**

| Feature | Test Steps | Expected Result | Status |
|---------|------------|-----------------|--------|
| Create Sales Sheet | Fill form | Sheet created | ⬜ |
| Save Draft | Click save draft | Draft saved | ⬜ |
| Load Draft | Open saved draft | Draft loads | ⬜ |
| Generate PDF | Export to PDF | PDF downloads | ⬜ |
| Version Control | Edit and save | Version incremented | ⬜ |

### 5.2 Quote Discounts & Notes
**Test quote enhancements:**

| Feature | Test Steps | Expected Result | Status |
|---------|------------|-----------------|--------|
| Add Discount | Apply % discount | Price recalculates | ⬜ |
| Add Line Discount | Discount single item | Line price updates | ⬜ |
| Add Notes | Add internal note | Note saved | ⬜ |
| Add Client Note | Add client-visible note | Note appears on quote | ⬜ |

### 5.3 Location & Warehouse Management
**Test location features:**

| Feature | Test Steps | Expected Result | Status |
|---------|------------|-----------------|--------|
| Create Location | Add new location | Location created | ⬜ |
| Edit Location | Modify details | Changes saved | ⬜ |
| Assign Inventory | Move items to location | Inventory updated | ⬜ |
| Location Report | Generate report | Report accurate | ⬜ |

### 5.4 Batch Media Upload
**Test batch media upload:**

1. [ ] Navigate to batch detail
2. [ ] Click "Upload Media"
3. [ ] Select multiple images
4. [ ] Verify upload progress
5. [ ] Verify images appear on batch
6. [ ] Verify images stored correctly

### 5.5 E2E Test Suite
**Run the E2E test suite:**

```bash
pnpm test:e2e
```

**🔴 VERIFICATION:**
- [ ] All E2E tests pass
- [ ] No skipped tests
- [ ] Coverage meets threshold

---

## 🔴 PHASE 6: SPRINT E VERIFICATION (Calendar, Vendors & CRM)

### 6.1 Vendor Supply Management
**Test vendor supply CRUD:**

| Operation | Test Steps | Expected Result | Status |
|-----------|------------|-----------------|--------|
| Create Supply | Add new supply entry | Entry created | ⬜ |
| Read Supply | View supply list | List displays | ⬜ |
| Update Supply | Edit quantity/price | Changes saved | ⬜ |
| Delete Supply | Remove entry | Entry deleted | ⬜ |
| View History | Check audit log | History shows | ⬜ |
| Import CSV | Upload CSV file | Data imported | ⬜ |

### 6.2 Vendor Reminders
**Test reminder system:**

| Feature | Test Steps | Expected Result | Status |
|---------|------------|-----------------|--------|
| Create Reminder | Set reminder date | Reminder created | ⬜ |
| Recurring Reminder | Set weekly reminder | Recurrence works | ⬜ |
| Reminder Notification | Wait for trigger | Notification appears | ⬜ |
| Complete Reminder | Mark as done | Status updates | ⬜ |

### 6.3 CRM Features
**Test CRM functionality:**

| Feature | Test Steps | Expected Result | Status |
|---------|------------|-----------------|--------|
| Client Needs | Add client need | Need recorded | ⬜ |
| Preferences | Set preferences | Preferences saved | ⬜ |
| Interaction Log | Log call/email | Interaction saved | ⬜ |
| Client Tags | Add/remove tags | Tags update | ⬜ |
| Activity Timeline | View timeline | All activities show | ⬜ |

### 6.4 Communication Logging
**Test communication features:**

| Feature | Test Steps | Expected Result | Status |
|---------|------------|-----------------|--------|
| Log Call | Record phone call | Call logged | ⬜ |
| Log Email | Record email | Email logged | ⬜ |
| Schedule Meeting | Create meeting | Calendar event created | ⬜ |
| Use Template | Apply template | Template fills | ⬜ |

### 6.5 Calendar Features
**Test calendar functionality:**

| Feature | Test Steps | Expected Result | Status |
|---------|------------|-----------------|--------|
| Create Event | Add new event | Event appears | ⬜ |
| Edit Event | Modify event | Changes saved | ⬜ |
| Delete Event | Remove event | Event removed | ⬜ |
| Recurring Event | Create weekly event | All instances show | ⬜ |
| Day View | Switch to day | Day view displays | ⬜ |
| Week View | Switch to week | Week view displays | ⬜ |
| Month View | Switch to month | Month view displays | ⬜ |
| Agenda View | Switch to agenda | Agenda displays | ⬜ |
| Send Invitation | Invite participant | Invitation sent | ⬜ |
| Accept Invitation | Accept invite | Status updates | ⬜ |

---

## 🔴 PHASE 7: REGRESSION TESTING

### 7.1 Core Workflow Regression
**Test these critical workflows haven't broken:**

| Workflow | Test Steps | Expected Result | Status |
|----------|------------|-----------------|--------|
| Create Order | Full order flow | Order created | ⬜ |
| Receive Payment | Payment flow | Payment recorded | ⬜ |
| Create Invoice | Invoice flow | Invoice created | ⬜ |
| Inventory Intake | Add inventory | Inventory added | ⬜ |
| Client Creation | Add client | Client created | ⬜ |
| User Login | Login flow | User authenticated | ⬜ |
| Password Reset | Reset flow | Password changed | ⬜ |

### 7.2 Data Integrity Verification
**Verify data relationships:**

```sql
-- Check for orphaned records
SELECT COUNT(*) FROM orders WHERE client_id NOT IN (SELECT id FROM clients);
SELECT COUNT(*) FROM order_items WHERE order_id NOT IN (SELECT id FROM orders);
SELECT COUNT(*) FROM payments WHERE invoice_id NOT IN (SELECT id FROM invoices);
SELECT COUNT(*) FROM inventory_movements WHERE batch_id NOT IN (SELECT id FROM batches);
```

**🔴 FAIL CRITERIA:** Any orphaned records found

### 7.3 Performance Baseline
**Measure key performance metrics:**

| Metric | Baseline | Current | Status |
|--------|----------|---------|--------|
| Dashboard load time | < 2s | ⬜ | ⬜ |
| Orders list load time | < 1s | ⬜ | ⬜ |
| Client search time | < 500ms | ⬜ | ⬜ |
| Report generation | < 5s | ⬜ | ⬜ |

---

## 🔴 PHASE 8: DOCUMENTATION VERIFICATION

### 8.1 Code Documentation
```bash
# Check for undocumented exports
grep -rn "export function\|export const\|export class" --include="*.ts" server/ | head -50
```

**🔴 VERIFICATION:**
- [ ] All public functions have JSDoc comments
- [ ] All API endpoints are documented
- [ ] All complex logic has inline comments

### 8.2 User Documentation
**Verify documentation exists and is accurate:**

- [ ] README.md is up to date
- [ ] API documentation matches implementation
- [ ] User guide reflects current UI
- [ ] Deployment guide is accurate

---

## 📋 FINAL REPORT TEMPLATE

Create file: `docs/qa-reviews/SPRINT-A-E-VERIFICATION-REPORT.md`

```markdown
# Sprint A-E Verification Report

**Date:** [DATE]
**QA Engineer:** [AGENT ID]
**Build Verified:** [COMMIT HASH]

## Executive Summary
- **Overall Status:** [PASS/FAIL/PARTIAL]
- **Critical Issues Found:** [COUNT]
- **Warnings:** [COUNT]
- **Total Tests Executed:** [COUNT]
- **Pass Rate:** [PERCENTAGE]

## Phase Results

### Phase 1: Code Quality
- TypeScript Errors: [COUNT]
- Lint Errors: [COUNT]
- Stubs Found: [COUNT]
- Placeholders Found: [COUNT]
- `any` Types Found: [COUNT]

### Phase 2: Sprint A (Infrastructure)
- Schema Sync: [PASS/FAIL]
- Optimistic Locking: [PASS/FAIL]
- Backup System: [PASS/FAIL]
- Indexes: [PASS/FAIL]

### Phase 3: Sprint B (Frontend UX)
- Navigation Items Working: [X/27]
- KPI Cards Actionable: [X/6]
- Table Rows Clickable: [X/5]
- Bulk Actions Working: [X/4]
- Empty States Complete: [PASS/FAIL]

### Phase 4: Sprint C (Accounting/VIP)
- Bug Fixes Verified: [X/3]
- VIP Impersonation: [PASS/FAIL]
- Accounting Features: [X/4]
- Live Shopping: [PASS/FAIL]

### Phase 5: Sprint D (Sales/Inventory)
- Sales Sheet Features: [X/5]
- Quote Enhancements: [X/4]
- Location Management: [X/4]
- Batch Media Upload: [PASS/FAIL]
- E2E Tests: [PASS/FAIL]

### Phase 6: Sprint E (Calendar/CRM)
- Vendor Supply CRUD: [X/6]
- Vendor Reminders: [X/4]
- CRM Features: [X/5]
- Communication Logging: [X/4]
- Calendar Features: [X/10]

### Phase 7: Regression
- Core Workflows: [X/7]
- Data Integrity: [PASS/FAIL]
- Performance: [PASS/FAIL]

## Critical Issues
[List all critical issues with details]

## Warnings
[List all warnings]

## Recommendations
[List recommendations for fixes]

## Conclusion
[Final assessment and sign-off]
```

---

## 🚨 ESCALATION CRITERIA

**STOP and escalate immediately if:**
- More than 5 critical issues found
- Any security vulnerability discovered
- Data corruption detected
- Production database affected
- Build completely broken

**Escalation contact:** Report to user immediately with full details.

---

## ✅ COMPLETION CRITERIA

This QA verification is complete when:
1. All 8 phases executed
2. All checklists completed
3. Final report generated
4. All critical issues documented
5. Recommendations provided
6. Report committed to repository

**DO NOT mark complete until ALL criteria met.**

---

## 📊 ESTIMATED TIME

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: Code Quality | 2h |
| Phase 2: Sprint A | 3h |
| Phase 3: Sprint B | 4h |
| Phase 4: Sprint C | 3h |
| Phase 5: Sprint D | 3h |
| Phase 6: Sprint E | 3h |
| Phase 7: Regression | 2h |
| Phase 8: Documentation | 1h |
| Report Generation | 1h |
| **Total** | **22h** |

---

*QA Protocol Version: 1.0*
*Created: January 2, 2026*
