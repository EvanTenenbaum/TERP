# TERP Parallel Wave Execution Plan

**Version:** 1.0  
**Created:** January 3, 2026  
**Status:** APPROVED FOR EXECUTION  
**Total Work:** 414 hours  
**Estimated Duration:** 15 working days (3 weeks)

---

## Executive Summary

This plan organizes all remaining TERP work into 5 waves of parallel agent execution. Each wave contains non-conflicting tasks that can be executed simultaneously by multiple AI agents. The plan follows the Multi-Agent Parallelization and Integration Protocol, ensuring quality through independent QA reviews before integration.

---

## Wave Overview

| Wave | Focus | Agents | Hours | Duration |
|------|-------|--------|-------|----------|
| **0** | Prerequisites | 1 (You) | 8h | Day 1 |
| **1** | Critical Bug Fixes | 4 | 65h | Days 2-3 |
| **2** | High Priority UX & Logic | 4 | 94h | Days 4-6 |
| **3** | Features & Code Quality | 4 | 110h | Days 7-10 |
| **4** | Polish & Documentation | 3 | 80h | Days 11-13 |
| **5** | Integration & Final QA | 1 (You) | 16h | Days 14-15 |

---

## Wave 0: Prerequisites (Sequential - You Execute)

**Duration:** 1 day  
**Agents:** 1 (You)

This wave must complete before parallel waves begin. It ensures the codebase is stable and ready for parallel development.

| Task | Description | Hours |
|------|-------------|-------|
| Database Sync | Verify schema is synchronized | 2h |
| Branch Setup | Create wave branches | 1h |
| Environment Check | Verify all agents can access repo | 1h |
| Baseline Tests | Run full test suite, document failures | 4h |

**Exit Criteria:**
- All agents have repo access
- Schema is synchronized
- Baseline test results documented

---

## Wave 1: Critical Bug Fixes (4 Parallel Agents)

**Duration:** 2 days  
**Agents:** 4  
**Branch Prefix:** `wave-1/`

### Agent 1A: Modal & Form Bugs
**Branch:** `wave-1/agent-1a-modal-form-bugs`  
**Hours:** 14h

| Task ID | Description | Hours |
|---------|-------------|-------|
| BUG-040 | Task/Client edit modal empty fields | 4h |
| BUG-041 | Fulfillment batch status update fails | 4h |
| BUG-042 | Misleading CTA redirects | 6h |

**File Ownership:**
- `client/src/components/modals/`
- `client/src/pages/TasksPage.tsx`
- `client/src/pages/FulfillmentPage.tsx`

---

### Agent 1B: Validation & Production Bugs
**Branch:** `wave-1/agent-1b-validation-bugs`  
**Hours:** 15h

| Task ID | Description | Hours |
|---------|-------------|-------|
| BUG-043 | Form validation missing - silent failures | 8h |
| BUG-044 | Developer messages in production | 4h |
| BUG-045 | New Invoice button non-functional | 3h |

**File Ownership:**
- `client/src/components/forms/`
- `client/src/pages/AccountingPage.tsx`
- `server/routers/invoices.ts`

---

### Agent 1C: Data & Verification
**Branch:** `wave-1/agent-1c-data-verification`  
**Hours:** 14h

| Task ID | Description | Hours |
|---------|-------------|-------|
| BUG-046 | Data fetch failures block progress | 6h |
| QA-076 | Live Site Feature Verification | 8h |

**File Ownership:**
- `client/src/hooks/`
- `client/src/lib/api.ts`
- `tests-e2e/verification/`

---

### Agent 1D: Navigation & TypeScript
**Branch:** `wave-1/agent-1d-nav-typescript`  
**Hours:** 22h

| Task ID | Description | Hours |
|---------|-------------|-------|
| QA-077 | Navigation Sidebar Simplification | 6h |
| CODE-001 | TypeScript Error Cleanup (240 errors) | 16h |

**File Ownership:**
- `client/src/components/layout/Sidebar.tsx`
- `client/src/components/layout/AppShell.tsx`
- `server/routers/alerts.ts`
- `server/routers/inventoryShrinkage.ts`
- `server/routers/vendorReminders.ts`

---

## Wave 2: High Priority UX & Logic (4 Parallel Agents)

**Duration:** 3 days  
**Agents:** 4  
**Branch Prefix:** `wave-2/`

### Agent 2A: Navigation & Page Hierarchy
**Branch:** `wave-2/agent-2a-navigation-hierarchy`  
**Hours:** 24h

| Task ID | Description | Hours |
|---------|-------------|-------|
| UX-025 | Navigation Consolidation (20+ → ~10) | 16h |
| UX-044 | Page Hierarchy (H1, Subhead, CTA) | 8h |

**File Ownership:**
- `client/src/components/layout/`
- `client/src/components/ui/PageHeader.tsx`

---

### Agent 2B: Tables & Loading States
**Branch:** `wave-2/agent-2b-tables-loading`  
**Hours:** 22h

| Task ID | Description | Hours |
|---------|-------------|-------|
| UX-045 | Sticky Headers & Responsive Tables | 6h |
| UX-046 | UI Renders Before Data Ready | 8h |
| UX-027 | Accessibility - Form Labels | 8h |

**File Ownership:**
- `client/src/components/ui/DataTable.tsx`
- `client/src/components/ui/Skeleton.tsx`
- `client/src/components/forms/`

---

### Agent 2C: Button & Inventory Testing
**Branch:** `wave-2/agent-2c-button-inventory`  
**Hours:** 22h

| Task ID | Description | Hours |
|---------|-------------|-------|
| QA-078 | Comprehensive Button & Save Testing | 12h |
| QA-079 | Inventory Logic Verification | 10h |

**File Ownership:**
- `tests-e2e/critical-paths/`
- `server/routers/inventory.ts`

---

### Agent 2D: Money & Client Logic
**Branch:** `wave-2/agent-2d-money-client`  
**Hours:** 26h

| Task ID | Description | Hours |
|---------|-------------|-------|
| QA-080 | Money/Accounting Logic Verification | 10h |
| QA-081 | Client Logic Verification | 8h |
| QA-082 | Credit Limit Testing & Improvement | 8h |

**File Ownership:**
- `server/routers/accounting.ts`
- `server/routers/clients.ts`
- `server/routers/creditLimits.ts`

---

## Wave 3: Features & Code Quality (4 Parallel Agents)

**Duration:** 4 days  
**Agents:** 4  
**Branch Prefix:** `wave-3/`

### Agent 3A: Accessibility & Mobile
**Branch:** `wave-3/agent-3a-accessibility-mobile`  
**Hours:** 24h

| Task ID | Description | Hours |
|---------|-------------|-------|
| UX-028 | Accessibility - Keyboard Navigation | 8h |
| UX-029 | Mobile Responsive Layout | 16h |

**File Ownership:**
- `client/src/styles/`
- `client/src/components/ui/` (responsive variants)

---

### Agent 3B: Product-as-Credit Feature
**Branch:** `wave-3/agent-3b-product-credit`  
**Hours:** 24h

| Task ID | Description | Hours |
|---------|-------------|-------|
| FEATURE-023 | Product-as-Credit/Payment System | 24h |

**File Ownership:**
- `server/routers/productCredit.ts` (new)
- `client/src/pages/ProductCreditPage.tsx` (new)
- `drizzle/` (new migration)

---

### Agent 3C: Code Cleanup
**Branch:** `wave-3/agent-3c-code-cleanup`  
**Hours:** 32h

| Task ID | Description | Hours |
|---------|-------------|-------|
| CODE-002 | Console.log Removal (420 statements) | 8h |
| CODE-003 | Any Type Elimination (564 instances) | 24h |

**File Ownership:**
- All `.ts` and `.tsx` files (code cleanup only)
- `lib/logger.ts` (new)

---

### Agent 3D: Images & Refactoring
**Branch:** `wave-3/agent-3d-images-refactor`  
**Hours:** 30h

| Task ID | Description | Hours |
|---------|-------------|-------|
| QA-083 | Bulk SKU Product Image Addition | 6h |
| REFACTOR-001 | Codebase Duplication Cleanup | 24h |

**File Ownership:**
- `server/routers/media.ts`
- `client/src/components/inventory/`
- Duplicate code consolidation

---

## Wave 4: Polish & Documentation (3 Parallel Agents)

**Duration:** 3 days  
**Agents:** 3  
**Branch Prefix:** `wave-4/`

### Agent 4A: UX Polish
**Branch:** `wave-4/agent-4a-ux-polish`  
**Hours:** 30h

| Task ID | Description | Hours |
|---------|-------------|-------|
| UX-030-035 | Various UX improvements | 24h |
| UX-047 | Placeholder copy cleanup | 2h |
| UX-048 | Visible focus states | 4h |

**File Ownership:**
- `client/src/components/ui/`
- `client/src/pages/` (minor fixes)

---

### Agent 4B: Testing & Infrastructure
**Branch:** `wave-4/agent-4b-testing-infra`  
**Hours:** 36h

| Task ID | Description | Hours |
|---------|-------------|-------|
| TEST-002 | Unit Test Coverage Expansion | 16h |
| TEST-003 | API Integration Test Suite | 12h |
| INFRA-004 | Automated Backup Scripts | 8h |

**File Ownership:**
- `tests/`
- `tests-e2e/api/`
- `scripts/backup/`

---

### Agent 4C: Documentation
**Branch:** `wave-4/agent-4c-documentation`  
**Hours:** 14h

| Task ID | Description | Hours |
|---------|-------------|-------|
| DOCS-002 | API Documentation (OpenAPI) | 8h |
| DOCS-003 | Developer Onboarding Guide | 6h |

**File Ownership:**
- `docs/api/`
- `docs/contributing/`
- `CONTRIBUTING.md`

---

## Wave 5: Integration & Final QA (Sequential - You Execute)

**Duration:** 2 days  
**Agents:** 1 (You)

### Integration Process

| Step | Description | Hours |
|------|-------------|-------|
| 1 | Review all wave branches | 4h |
| 2 | Merge Wave 1 branches | 2h |
| 3 | Merge Wave 2 branches | 2h |
| 4 | Merge Wave 3 branches | 2h |
| 5 | Merge Wave 4 branches | 2h |
| 6 | Run full Mega QA suite | 2h |
| 7 | Production deployment | 2h |

**Merge Order:**
1. Wave 1 (bug fixes) - foundation
2. Wave 2 (UX & logic) - builds on fixes
3. Wave 3 (features & cleanup) - builds on UX
4. Wave 4 (polish & docs) - final layer

---

## File Ownership Matrix

| Domain | Wave 1 | Wave 2 | Wave 3 | Wave 4 |
|--------|--------|--------|--------|--------|
| Layout/Navigation | 1D | 2A | - | - |
| Forms/Modals | 1A, 1B | 2B | - | - |
| Data Tables | - | 2B | - | 4A |
| Inventory | - | 2C | 3D | - |
| Accounting | 1B | 2D | 3B | - |
| Clients | 1A | 2D | - | - |
| Tests | 1C | 2C | - | 4B |
| Infrastructure | - | - | - | 4B |
| Documentation | - | - | - | 4C |

---

## Success Criteria

### Per-Wave Gates

**Wave 1 Exit:**
- All P0 bugs fixed
- TypeScript errors < 50
- All tests pass

**Wave 2 Exit:**
- Navigation consolidated
- All logic tests pass
- Accessibility audit passes

**Wave 3 Exit:**
- FEATURE-023 complete
- Console.logs < 10
- Any types < 100

**Wave 4 Exit:**
- Test coverage > 60%
- API docs published
- Backup scripts working

**Wave 5 Exit:**
- All branches merged
- Mega QA passes
- Production deployed

---

## Timeline

```
Week 1:
  Day 1: Wave 0 (Prerequisites)
  Day 2-3: Wave 1 (Critical Bugs)
  Day 4-5: Wave 2 (UX & Logic)

Week 2:
  Day 6-9: Wave 3 (Features & Code Quality)
  Day 10: Wave 3 completion + review

Week 3:
  Day 11-13: Wave 4 (Polish & Docs)
  Day 14-15: Wave 5 (Integration & QA)
```

---

## Agent Prompts Location

All agent prompts are stored in:
```
docs/prompts/parallel-waves/
├── WAVE-1-AGENT-1A.md
├── WAVE-1-AGENT-1B.md
├── WAVE-1-AGENT-1C.md
├── WAVE-1-AGENT-1D.md
├── WAVE-2-AGENT-2A.md
├── WAVE-2-AGENT-2B.md
├── WAVE-2-AGENT-2C.md
├── WAVE-2-AGENT-2D.md
├── WAVE-3-AGENT-3A.md
├── WAVE-3-AGENT-3B.md
├── WAVE-3-AGENT-3C.md
├── WAVE-3-AGENT-3D.md
├── WAVE-4-AGENT-4A.md
├── WAVE-4-AGENT-4B.md
├── WAVE-4-AGENT-4C.md
└── README.md
```

