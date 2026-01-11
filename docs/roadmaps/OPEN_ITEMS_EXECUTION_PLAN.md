# TERP Open Items Execution Plan (Non-Beta)

**Version:** 1.0
**Date:** January 11, 2026
**Status:** Active
**Last Updated:** January 11, 2026

---

## Executive Summary

This document consolidates ALL open roadmap items that are **NOT part of the Beta milestone**. These items are sourced from:

1. **MASTER_ROADMAP.md** - MVP Open Work section
2. **Initiative-specific roadmaps** (TERP-INIT-003, 007, 008, 009, 004)

**Verified Status:** Items have been cross-referenced against the codebase to confirm actual open/closed status.

---

## Priority Classification

| Priority | Description | SLA |
|----------|-------------|-----|
| **P0** | Critical - System broken, blocking users | Same day |
| **P1** | High - Major functionality impaired | 1-2 days |
| **P2** | Medium - Feature incomplete or degraded | This sprint |
| **P3** | Low - Nice to have, polish | Next sprint |

---

## PART 1: MASTER ROADMAP OPEN ITEMS

### 1.1 Critical Bugs (P0) - 6 VERIFIED OPEN

| Task | Description | Status | Verified |
|------|-------------|--------|----------|
| BUG-040 | Order Creator: Inventory loading fails | 🔴 OPEN | Needs investigation - code exists but may have runtime issues |
| BUG-045 | Order Creator: Retry resets entire form | 🟡 OPEN | State management issue |
| BUG-046 | Settings Users tab misleading auth error | 🟡 OPEN | UX/messaging issue |
| BUG-047 | Spreadsheet View shows empty grid | 🟡 OPEN | Fixed as BUG-091, needs verification |
| BUG-097 | Error handling inconsistency across modules | 🔴 OPEN | P3 - Deferred |

**Recently Fixed (verify before proceeding):**
- BUG-071 to BUG-077: Marked "ready" - may be implemented
- BUG-078 to BUG-085: E2E defects - **BUG-084 VERIFIED FIXED** (pricing_defaults exists)
- BUG-086 to BUG-096: Wave 1 & 2 QA fixes - marked as FIXED

### 1.2 API Registration Issues (P1) - 6 VERIFIED OPEN

These routers have `getAll` but lack standardized `.list` procedures:

| Task | Procedure | Current Alternative | Action Required |
|------|-----------|---------------------|-----------------|
| API-001 | `todoLists.list` | `getMyLists` | Add .list alias or rename |
| API-002 | `featureFlags.list` | `getAll` | Add .list alias |
| API-004 | `salesSheets.list` | `getHistory` | Add .list procedure |
| API-005 | `samples.list` | `getAll` | Add .list alias |
| API-006 | `purchaseOrders.list` | `getAll` | Add .list alias |
| API-007 | `alerts.list` | `getAll` | Add .list alias |

**Estimated Effort:** 30 min per router = 3 hours total

**Note:** API-003 (vipPortal.listAppointmentTypes), API-008 (inbox.list), API-009 (locations.list), API-010 (accounting.*) need similar verification.

### 1.3 Stability Tasks (P1) - 1 OPEN

| Task | Description | Status | Effort |
|------|-------------|--------|--------|
| ST-026 | Implement Concurrent Edit Detection | ready | 8h |

### 1.4 Feature Tasks (P2) - 23 OPEN

| Task | Description | Priority | Effort Est. |
|------|-------------|----------|-------------|
| FEAT-001 | Client Form Field Updates | MEDIUM | 4h |
| FEAT-002 | Tag System Revamp for Clients and Products | MEDIUM | 8h |
| FEAT-003 | Order Creator Quick Add Quantity Field | MEDIUM | 4h |
| FEAT-004 | Add Dollar Amount Discount Option | MEDIUM | 4h |
| FEAT-005 | Merge Draft and Quote Workflows | MEDIUM | 8h |
| FEAT-006 | Show Product Name Instead of SKU | MEDIUM | 2h |
| FEAT-007 | Add Payment Recording Against Invoices | HIGH | 8h |
| FEAT-008 | Invoice Editing from Order View | MEDIUM | 6h |
| FEAT-009 | Add Product Subcategories | MEDIUM | 6h |
| FEAT-010 | Default Warehouse Selection | MEDIUM | 4h |
| FEAT-011 | COGS Logic and Sales Flow Integration | HIGH | 12h |
| FEAT-012 | Make Grade Field Optional/Customizable | LOW | 2h |
| FEAT-013 | Add Packaged Unit Type for Products | LOW | 4h |
| FEAT-014 | Remove Expected Delivery from Purchases | LOW | 1h |
| FEAT-015 | Finance Status Customization | LOW | 4h |
| FEAT-017 | Feature Flags Direct Access | LOW | 2h |
| FEAT-018 | Remove Dev-Only Features from UI | LOW | 2h |
| FEAT-019 | VIP Status and Tiers Implementation | MEDIUM | 8h |
| FEAT-020 | Product Subcategory and Strain Matching | MEDIUM | 6h |
| FEAT-021 | Settings Changes Apply to Entire Team | MEDIUM | 4h |
| FEAT-022 | Show Role Names Instead of Count | LOW | 2h |
| FEAT-023 | Notification Preferences - System vs User | MEDIUM | 6h |
| FEAT-024 | Inline Notifications Without Navigation | MEDIUM | 6h |
| FEATURE-003 | Live Shopping & Price Negotiation System | MEDIUM | 16h |

**Total Feature Effort:** ~130 hours

### 1.5 UX Tasks (P2-P3) - 4 OPEN

| Task | Description | Priority |
|------|-------------|----------|
| UX-010 | Clarify My Account vs User Settings Navigation | LOW |
| UX-011 | Fix Two Export Buttons Issue | LOW |
| UX-012 | Fix Period Display Formatting | LOW |
| UX-013 | Fix Mirrored Elements Issue | LOW |

### 1.6 Infrastructure Tasks (P2) - 4 OPEN

| Task | Description | Priority |
|------|-------------|----------|
| INFRA-004 | Implement Deployment Monitoring Enforcement | MEDIUM |
| INFRA-007 | Update Swarm Manager | LOW |
| INFRA-012 | Deploy TERP Commander Slack Bot | LOW |
| CLEANUP-001 | Remove LLM/AI from Codebase | LOW |

### 1.7 Quality Tasks (P2) - 2 OPEN

| Task | Description | Priority |
|------|-------------|----------|
| QUAL-003 | Complete Critical TODOs | MEDIUM |
| ROADMAP-001 | Process Consolidated Roadmap Update Report | LOW |

---

## PART 2: INITIATIVE-SPECIFIC OPEN ITEMS

### 2.1 TERP-INIT-003: Calendar & Scheduling System

**Status:** NOT STARTED (all phases pending)
**Total Timeline:** 28 weeks (7 months)
**Dependencies:** Core infrastructure complete

| Phase | Description | Duration | Status |
|-------|-------------|----------|--------|
| Phase 0 | Foundation (DB, Services, Jobs) | 4 weeks | 🔴 NOT STARTED |
| Phase 1 | MVP + Core Integrations | 12 weeks | 🔴 NOT STARTED |
| Phase 2 | Enhanced Functionality | 6 weeks | 🔴 NOT STARTED |
| Phase 3 | Proactive & Collaborative | 6 weeks | 🔴 NOT STARTED |

**Note:** Calendar DB layer exists (`server/calendarDb.ts`) but full feature set per roadmap not implemented.

### 2.2 TERP-INIT-007: Inventory System Improvements

**Status:** NOT STARTED
**Total Timeline:** 8 weeks

| Phase | Description | Duration | Status |
|-------|-------------|----------|--------|
| Phase 1 | Critical Fixes (Data Integrity) | 2 weeks | 🔴 NOT STARTED |
| Phase 2 | Stability Improvements | 2 weeks | 🔴 NOT STARTED |
| Phase 3 | Robustness & Testing | 2 weeks | 🔴 NOT STARTED |
| Phase 4 | Optimization & Refinement | 2 weeks | 🔴 NOT STARTED |

**Key Tasks:**
- 1.1: Implement DB Transactions for inventory
- 1.2: Transactional Intake process
- 1.3: Fix Sequence Generation (atomic lot/batch codes)
- 2.1: Standardize Error Handling
- 2.2: Comprehensive Validation
- 2.3: Add Database Indexes
- 3.1-3.4: Testing & Audit Logging
- 4.1-4.4: Pagination, Refactoring, Type Safety, Caching

### 2.3 TERP-INIT-008: Codebase Cleanup & Technical Debt

**Status:** NOT STARTED
**Total Timeline:** 15-20 days (3-4 weeks)

| Phase | Description | Duration | Risk |
|-------|-------------|----------|------|
| Phase 0 | Preparation & Baseline | 1-2 days | LOW |
| Phase 1 | Documentation Consolidation | 2-3 days | LOW |
| Phase 2 | Backup File Removal | 1 day | LOW |
| Phase 3 | Console Logging Cleanup | 3-4 days | MEDIUM |
| Phase 4 | Vercel Reference Removal | 2-3 days | MEDIUM |
| Phase 5 | Dependency Audit | 2-3 days | MEDIUM |
| Phase 6 | Final Validation & QA | 2-3 days | LOW |

### 2.4 TERP-INIT-009: Database Seeding System

**Status:** NOT STARTED
**Total Timeline:** 17-24 hours (2-3 days)

| Task | Description | Duration | Status |
|------|-------------|----------|--------|
| 009-01 | Infrastructure Setup | 3-4h | 🔴 NOT STARTED |
| 009-02 | Core Seeding Logic | 5-7h | 🔴 NOT STARTED |
| 009-03 | Rollback and Safety | 3-4h | 🔴 NOT STARTED |
| 009-04 | PII Masking & Compliance | 2-3h | 🔴 NOT STARTED |
| 009-05 | Testing and Validation | 3-4h | 🔴 NOT STARTED |
| 009-06 | Documentation | 1-2h | 🔴 NOT STARTED |

### 2.5 TERP-INIT-004: Client Module Improvements & Additions

**Status:** NOT STARTED
**Improvements Phase:** ~220 hours (11 weeks)
**Additions Phase:** ~300 hours (15 weeks)

#### Improvements (High Priority)

| Sprint | Focus | Key Items | Hours |
|--------|-------|-----------|-------|
| 1 | Foundation | Enhanced Search, Inline Edit, Keyboard Shortcuts, CSV Export | 34h |
| 2 | Workflow | Bulk Tag Management, Payment Recording Enhancement, Saved Views | 46h |
| 3 | Intelligence | Client Health Score, Purchase Pattern Insights, Smart Alerts | 58h |
| 4 | Data Management | CSV Import, Duplicate Detection, Soft Delete | 42h |
| 5 | Polish | Optimistic Updates, Loading States, Error Handling | 40h |

#### Additions (Future)

| Phase | Focus | Hours |
|-------|-------|-------|
| 1 | Relationship Intelligence (CLV, Risk Scoring, Segmentation) | 54h |
| 2 | Proactive Engagement (Tasks, Communication Hub, Email Campaigns) | 72h |
| 3 | Workflow Automation (Auto-Tagging, Templates, Bulk Ops) | 62h |
| 4 | Integration & Connectivity (Quote Linking, Inventory-Aware Needs) | 64h |
| 5 | Advanced Features (Email Campaigns, Client API) | 48h |

---

## PART 3: RECOMMENDED EXECUTION PLAN

### Week 1-2: Critical Bug Resolution

**Priority:** P0/P1 items only

| Day | Tasks | Estimated Hours |
|-----|-------|-----------------|
| 1 | BUG-040: Order Creator inventory fix | 4h |
| 1 | BUG-045: Form state persistence fix | 4h |
| 2 | BUG-046: Settings auth error messaging | 2h |
| 2 | BUG-047: Spreadsheet view verification | 2h |
| 2 | Verify BUG-071 to BUG-096 are actually fixed | 4h |
| 3-4 | API Registration (6 routers) | 6h |
| 4 | Testing and validation | 4h |

**Total:** ~26 hours

### Week 3-4: Stability & Quick Features

| Task Category | Items | Hours |
|---------------|-------|-------|
| ST-026 | Concurrent Edit Detection | 8h |
| FEAT-007 | Payment Recording Against Invoices | 8h |
| FEAT-011 | COGS Logic Integration | 12h |
| UX Items | UX-010 through UX-013 | 4h |

**Total:** ~32 hours

### Week 5-8: Initiative Work (Choose ONE)

**Option A: TERP-INIT-009 (Database Seeding)**
- Duration: 2-3 days
- Risk: LOW
- ROI: HIGH for testing/development

**Option B: TERP-INIT-008 Phase 0-2 (Codebase Cleanup)**
- Duration: 4-5 days
- Risk: LOW
- ROI: MEDIUM for maintainability

**Option C: TERP-INIT-004 Sprint 1 (Client Improvements)**
- Duration: ~2 weeks
- Risk: LOW
- ROI: HIGH for user productivity

### Week 9+: Remaining Features

Continue with remaining FEAT items in priority order:
1. HIGH priority features first (FEAT-007, FEAT-011)
2. Then MEDIUM features by user impact
3. LOW priority deferred to next cycle

---

## PART 4: ITEMS VERIFIED AS COMPLETE (Remove from Tracking)

The following items were found to be already implemented:

| Item | Evidence | Action |
|------|----------|--------|
| BUG-084 | `pricing_defaults` table exists in schema | Close |
| BUG-081 | Calendar API fully implemented | Close |
| AR/AP Dashboard | `arApDashboard` router operational | Close |
| BUG-041 | Batch Detail View - marked complete | Verify & Close |
| BUG-042 | Global Search - marked complete | Verify & Close |
| BUG-043 | Permission Service SQL crash - marked complete | Verify & Close |
| BUG-044 | VIP Portal empty batch IDs - marked complete | Verify & Close |
| BUG-070 | Client List Click Handlers - marked complete | Verify & Close |
| BUG-086-096 | Wave 1 & 2 QA fixes - marked complete | Verify & Close |

---

## PART 5: TOTAL EFFORT SUMMARY

| Category | Open Items | Estimated Hours |
|----------|------------|-----------------|
| Critical Bugs (P0) | 6 | ~20h |
| API Registration (P1) | 6 | ~6h |
| Stability (P1) | 1 | ~8h |
| Features (P2) | 23 | ~130h |
| UX (P2-P3) | 4 | ~8h |
| Infrastructure (P2) | 4 | ~16h |
| Quality (P2) | 2 | ~8h |
| **MVP Subtotal** | **46** | **~196h** |

| Initiative | Status | Estimated Hours |
|------------|--------|-----------------|
| TERP-INIT-003 (Calendar) | NOT STARTED | 700h+ (28 weeks) |
| TERP-INIT-007 (Inventory) | NOT STARTED | 160h (8 weeks) |
| TERP-INIT-008 (Cleanup) | NOT STARTED | 60-80h (3-4 weeks) |
| TERP-INIT-009 (Seeding) | NOT STARTED | 17-24h (2-3 days) |
| TERP-INIT-004 (Client) | NOT STARTED | 520h (26 weeks) |
| **Initiative Subtotal** | | **~1500h** |

**Grand Total Open Work:** ~1,700 hours (excluding Beta items)

---

## PART 6: RECOMMENDED PRIORITIZATION

### Immediate (This Week)
1. Verify BUG-086 to BUG-096 are truly fixed
2. BUG-040: Order Creator inventory loading
3. API Registration issues (3h quick wins)

### Short-Term (Next 2 Weeks)
1. TERP-INIT-009: Database Seeding (17-24h) - enables better testing
2. ST-026: Concurrent Edit Detection
3. FEAT-007: Payment Recording Against Invoices

### Medium-Term (Next Month)
1. TERP-INIT-008: Codebase Cleanup (reduces tech debt)
2. TERP-INIT-004 Sprint 1: Client Module Foundation
3. Remaining HIGH priority features

### Long-Term (Next Quarter)
1. TERP-INIT-007: Inventory System Improvements
2. TERP-INIT-003: Calendar & Scheduling (major initiative)
3. TERP-INIT-004: Client Module Additions

---

## Appendix: Initiative Roadmap File Locations

| Initiative | Roadmap Location |
|------------|------------------|
| TERP-INIT-003 | `product-management/initiatives/TERP-INIT-003/docs/roadmap.md` |
| TERP-INIT-004 | `product-management/initiatives/TERP-INIT-004/docs/original-*.md` |
| TERP-INIT-007 | `product-management/initiatives/TERP-INIT-007/docs/roadmap.md` |
| TERP-INIT-008 | `product-management/initiatives/TERP-INIT-008/docs/roadmap.md` |
| TERP-INIT-009 | `product-management/initiatives/TERP-INIT-009/docs/roadmap.md` |
| Master | `docs/roadmaps/MASTER_ROADMAP.md` |

---

**Document Owner:** Development Team
**Next Review:** January 18, 2026
