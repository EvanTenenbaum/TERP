# Unified Strategic Roadmap

**Version:** 1.0
**Created:** 2026-01-12
**Based On:** User Flow Gap Analysis (2026-01-11) + MASTER_ROADMAP v4.9

---

## Overview

This document merges the newly generated specifications from the Strategic Implementation Plan (2026-01-11) with the existing MASTER_ROADMAP tasks. It identifies:

- **Merged tasks** - Where new specs overlap with existing tasks
- **New tasks** - Tasks added from the implementation plan
- **Potential conflicts** - Where requirements may contradict
- **Dependencies** - Execution order based on task dependencies

---

## Task Mapping: New Specs to Existing Roadmap

### Phase 1: Backend Foundation Tasks

| New Spec | Existing Task(s) | Status | Action |
|----------|------------------|--------|--------|
| **FEAT-001** (Enhanced Inventory API) | No direct match | NEW | Add to roadmap |
| **FEAT-002** (Vendor Context API) | WS-012 (Customer Preferences & History) | OVERLAPS | Merge - FEAT-002 extends WS-012 to vendors |
| **FEAT-003-INLINE** (In-line Product Creation) | WS-007 (Complex Flower Intake) | RELATED | FEAT-003 provides API for WS-007 UI workflow |
| **FEAT-004** (Pricing & Credit Logic) | FEAT-011 (COGS Logic & Sales Flow) | OVERLAPS | Merge - FEAT-004 extends FEAT-011 with credit checks |
| **FEAT-005** (Scheduling & Referrals) | WS-004 (Multi-Order & Referral Credit) | OVERLAPS | Merge - FEAT-005 completes backend for WS-004 |
| **FEAT-006** (Full Referral Workflow) | WS-004 | SUBSET | Part of WS-004 implementation |

### Phase 2: Frontend Integration Tasks

| New Spec | Existing Task(s) | Status | Action |
|----------|------------------|--------|--------|
| **ENH-001** (Inventory Browser Table) | FEAT-008 (Advanced Filtering & Search) | RELATED | ENH-001 implements part of FEAT-008 |
| **ENH-002** (Client Info Pod) | WS-012 (Customer Preferences) | OVERLAPS | ENH-002 is UI for WS-012 |
| **ENH-003** (In-line Product Creation UI) | WS-007 | SUBSET | UI component for WS-007 |
| **ENH-004** (On-the-Fly Pricing UI) | No direct match | NEW | Add to roadmap |
| **ENH-005** (Scheduling Workflow UI) | No direct match | NEW | Add to roadmap |

### Phase 3: UI Polish Tasks

| New Spec | Existing Task(s) | Status | Action |
|----------|------------------|--------|--------|
| **ENH-006** (Relocate Order Preview) | No direct match | NEW | Add to roadmap |
| **ENH-007** (Brand→Farmer Nomenclature) | No direct match | NEW | Add to roadmap |
| **ENH-008** (Image Toggle) | No direct match | NEW | Add to roadmap |

---

## Merged Task Definitions

### MERGED-001: Client/Vendor Context & History System

**Merges:** WS-012 + FEAT-002 + ENH-002

**Scope:**
- Client purchase history (from WS-012)
- Vendor supply history and performance metrics (from FEAT-002)
- Client Info Pod UI component (from ENH-002)

**Estimate:** 32h total (was 16h + 20h + 12h = 48h separately)

**Rationale:** These three tasks address the same user need: contextual information about a client or vendor during order/PO creation. Consolidating reduces duplicate API work.

---

### MERGED-002: Pricing, Credit & COGS Integration

**Merges:** FEAT-011 (existing) + FEAT-004 (new)

**Scope:**
- COGS integration in sales flow (from FEAT-011)
- On-the-fly pricing adjustments (from FEAT-004)
- Credit limit checking (from FEAT-004)
- Price adjustment audit trail (from FEAT-004)

**Estimate:** 40h total

**Rationale:** Both tasks address pricing during order creation. FEAT-004 adds credit checks that FEAT-011 didn't include.

---

### MERGED-003: Complete Referral (Couch Tax) System

**Merges:** WS-004 (partial) + FEAT-005 (partial) + FEAT-006

**Scope:**
- Referral selection on orders (from WS-004)
- Commission calculation rules (from FEAT-005/FEAT-006)
- Commission crediting workflow (from FEAT-006)
- Payout processing (from FEAT-006)

**Estimate:** 36h total

**Rationale:** WS-004 included referral credit as part of a larger scope. FEAT-005 and FEAT-006 provide the complete backend and UI for this feature.

---

## Potential Conflicts / Questions

### CONFLICT-001: Pricing Rule Application Order

**Issue:** FEAT-004 spec states "Category adjustments applied before item-level adjustments." This may conflict with existing pricing engine behavior if any.

**Resolution:** Verify existing pricingEngine.ts behavior. If different, document and confirm with stakeholders which order is correct.

---

### CONFLICT-002: Credit Limit vs No Credit Limit

**Issue:** FEAT-004 assumes all clients have credit limits. Some clients may have unlimited credit (no limit set).

**Resolution:** Spec addresses this: "Client with no credit limit → Treat as unlimited (allow all orders)"

---

### CONFLICT-003: Referral Commission Timing

**Issue:** FEAT-005/FEAT-006 state commission credited on "order delivered." WS-004 may have assumed commission on order creation.

**Resolution:** FEAT-005/FEAT-006 approach is correct (only pay for completed sales). No conflict - this is a clarification.

---

## Dependency Graph

```
PHASE 1 (Backend - Can Execute in Parallel):
├── FEAT-001 (Enhanced Inventory API) → Required by ENH-001, ENH-004
├── MERGED-001/FEAT-002 (Vendor Context API) → Required by ENH-002
├── FEAT-003-INLINE (In-line Product) → Required by ENH-003
├── MERGED-002/FEAT-004 (Pricing & Credit) → Required by ENH-004
└── MERGED-003/FEAT-005 (Scheduling & Referrals) → Required by ENH-005, FEAT-006

PHASE 2 (Frontend - Sequential after Phase 1 APIs):
├── ENH-001 (Inventory Browser) ← Depends on FEAT-001
├── ENH-002 (Client Info Pod) ← Depends on MERGED-001
├── ENH-003 (In-line Product UI) ← Depends on FEAT-003-INLINE
├── ENH-004 (Pricing UI) ← Depends on FEAT-001 + MERGED-002
└── ENH-005 (Scheduling UI) ← Depends on MERGED-003

PHASE 3 (UI Polish - No dependencies, can parallelize):
├── ENH-006 (Relocate Order Preview)
├── ENH-007 (Nomenclature Changes)
└── ENH-008 (Image Toggle)
```

---

## Execution Priority

### Critical Path (Must Complete First)

| Priority | Task | Estimate | Reason |
|----------|------|----------|--------|
| 1 | FEAT-001 | 16h | Foundation for all inventory views |
| 2 | MERGED-002 | 40h | Core sales workflow dependency |
| 3 | ENH-001 | 16h | Unblocks sales rep productivity |
| 4 | MERGED-001 | 32h | Unblocks client context features |

### High Priority (Complete After Critical)

| Priority | Task | Estimate | Reason |
|----------|------|----------|--------|
| 5 | FEAT-003-INLINE | 24h | Improves intake workflow |
| 6 | ENH-002 | 12h | Client context UI |
| 7 | ENH-003 | 16h | Product creation UI |
| 8 | ENH-004 | 20h | Pricing adjustment UI |

### Medium Priority (Enhancement Layer)

| Priority | Task | Estimate | Reason |
|----------|------|----------|--------|
| 9 | MERGED-003 | 36h | Referral tracking |
| 10 | ENH-005 | 16h | Scheduling UI |
| 11 | ENH-008 | 16h | Image toggle |

### Low Priority (Polish)

| Priority | Task | Estimate | Reason |
|----------|------|----------|--------|
| 12 | ENH-006 | 4h | Layout change |
| 13 | ENH-007 | 8h | Nomenclature |

---

## Total Estimates

| Category | New Specs Total | After Merging | Savings |
|----------|-----------------|---------------|---------|
| Backend APIs | 112h | 104h | 8h |
| Frontend UI | 84h | 80h | 4h |
| UI Polish | 28h | 28h | 0h |
| **TOTAL** | **224h** | **212h** | **12h** |

---

## Integration with Existing MVP Tasks

### Existing MVP Bugs to Fix BEFORE New Features

The following bugs from MASTER_ROADMAP affect the new features and should be fixed first:

| Bug | Impact on New Features |
|-----|------------------------|
| BUG-040 (Inventory loading fails) | Blocks FEAT-001, ENH-001 |
| BUG-078 (Orders List API failure) | Blocks MERGED-002 order pricing |
| BUG-084 (Pricing defaults missing) | Blocks MERGED-002 pricing logic |

### Existing MVP Features to Complete BEFORE New Features

| Feature | Why Complete First |
|---------|-------------------|
| API-010 (accounting.* procedures) | Blocks credit checking in MERGED-002 |
| FEAT-007 (Payment Recording) | Needed for referral payout in MERGED-003 |

---

## Recommendations

### 1. Fix Bugs First

Before implementing new features, fix BUG-040, BUG-078, BUG-084 as they directly block the new functionality.

### 2. Implement Backend APIs First

All frontend specs depend on backend APIs. Implement FEAT-001, MERGED-001, MERGED-002, FEAT-003-INLINE before any ENH-* tasks.

### 3. Consolidate Related Tasks

Use the MERGED-* definitions to avoid duplicate implementation work. Single developers/teams should own merged task groups.

### 4. Defer Low-Priority UI Polish

ENH-006, ENH-007 can be deferred to a polish sprint after core functionality is complete.

### 5. Feature Flag All New Features

All new specs include feature flag recommendations. Enable gradual rollout and easy rollback.

---

## New Spec Files Created

| File | Type | Priority | Estimate |
|------|------|----------|----------|
| `docs/specs/FEAT-001-SPEC.md` | Backend API | CRITICAL | 16h |
| `docs/specs/FEAT-002-SPEC.md` | Backend API | HIGH | 20h |
| `docs/specs/FEAT-003-INLINE-PRODUCT-SPEC.md` | Backend API | HIGH | 24h |
| `docs/specs/FEAT-004-SPEC.md` | Backend API | HIGH | 28h |
| `docs/specs/FEAT-005-SPEC.md` | Backend API | MEDIUM | 24h |
| `docs/specs/FEAT-006-SPEC.md` | Full Feature | MEDIUM | 20h |
| `docs/specs/ENH-001-SPEC.md` | Frontend | CRITICAL | 16h |
| `docs/specs/ENH-002-SPEC.md` | Frontend | HIGH | 12h |
| `docs/specs/ENH-003-SPEC.md` | Frontend | HIGH | 16h |
| `docs/specs/ENH-004-SPEC.md` | Frontend | HIGH | 20h |
| `docs/specs/ENH-005-SPEC.md` | Frontend | MEDIUM | 16h |
| `docs/specs/ENH-006-SPEC.md` | UI Polish | LOW | 4h |
| `docs/specs/ENH-007-SPEC.md` | UI Polish | LOW | 8h |
| `docs/specs/ENH-008-SPEC.md` | Frontend | MEDIUM | 16h |

---

## Next Steps

1. **Review** this unified roadmap with stakeholders
2. **Prioritize** based on business needs
3. **Fix blocking bugs** (BUG-040, BUG-078, BUG-084)
4. **Implement** Phase 1 backend APIs
5. **Validate** APIs with integration tests
6. **Implement** Phase 2 frontend components
7. **Polish** Phase 3 UI enhancements
8. **Release** with feature flags enabled

---

*Generated by Claude AI - 2026-01-12*
