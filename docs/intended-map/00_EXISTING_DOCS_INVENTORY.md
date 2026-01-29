# Existing Documentation Inventory

**Purpose:** Catalog all existing docs that overlap with the intended-map artifacts
**Created:** 2026-01-29
**Status:** Complete

---

## Summary

| Category | Count | Authority Level |
|----------|-------|-----------------|
| Golden Flow Specs | 8 | HIGHEST |
| Feature Specs | 50+ | HIGH |
| Kiro Specs | 17 | HIGH |
| Protocol Docs | 10 | MEDIUM |
| QA Docs | 40+ | LOW-MEDIUM |
| Reference Docs | 3 | LOW |
| Roadmaps | 50+ | MEDIUM |

---

## High Authority Documents (To Preserve/Incorporate)

### 1. Golden Flow Specifications
**Location:** `docs/golden-flows/specs/`
**Authority:** HIGHEST
**Status:** ACTIVE - Primary intent sources

| Document | Last Updated | Coverage | Replacement |
|----------|--------------|----------|-------------|
| `GF-001-DIRECT-INTAKE.md` | 2026-01-27 | Direct inventory intake flow | Incorporated into 00_GOLDEN_FLOWS.md, 02_FLOW_MATRIX |
| `GF-002-PROCURE-TO-PAY.md` | 2026-01-27 | Purchase order to payment | Incorporated into 00_GOLDEN_FLOWS.md, 02_FLOW_MATRIX |
| `GF-003-ORDER-TO-CASH.md` | 2026-01-27 | Sales order lifecycle | Incorporated into 00_GOLDEN_FLOWS.md, 02_FLOW_MATRIX |
| `GF-004-INVOICE-PAYMENT.md` | 2026-01-27 | AR invoice and payment | Incorporated into 00_GOLDEN_FLOWS.md, 02_FLOW_MATRIX |
| `GF-005-PICK-PACK.md` | 2026-01-27 | Warehouse fulfillment | Incorporated into 00_GOLDEN_FLOWS.md, 02_FLOW_MATRIX |
| `GF-006-CLIENT-LEDGER.md` | 2026-01-27 | AR/AP ledger review | Incorporated into 00_GOLDEN_FLOWS.md, 02_FLOW_MATRIX |
| `GF-007-INVENTORY-MGMT.md` | 2026-01-27 | Batch inventory management | Incorporated into 00_GOLDEN_FLOWS.md, 02_FLOW_MATRIX |
| `GF-008-SAMPLE-REQUEST.md` | 2026-01-27 | Sample distribution | Incorporated into 00_GOLDEN_FLOWS.md, 02_FLOW_MATRIX |

**Strengths:** Comprehensive specifications with UI states, API endpoints, data models, business rules
**Weaknesses:** Some specs still marked DRAFT
**Decision:** PRESERVE as authoritative source, REFERENCE from intended-map artifacts

### 2. Protocol Documents
**Location:** `docs/protocols/`
**Authority:** MEDIUM-HIGH

| Document | Coverage | Replacement |
|----------|----------|-------------|
| `CANONICAL_DICTIONARY.md` | Party model, terminology | Incorporated into TERMINOLOGY_MAP.md |
| `CODE_STANDARDS.md` | Development standards | Not replaced |
| `DATABASE_STANDARDS.md` | DB conventions | Not replaced |
| `NAMING_CONVENTIONS.md` | Naming rules | Incorporated into TERMINOLOGY_MAP.md |
| `TESTING_QUALITY.md` | QA standards | Not replaced |

### 3. Reference Documents
**Location:** `docs/reference/`
**Authority:** MEDIUM

| Document | Coverage | Replacement |
|----------|----------|-------------|
| `FLOW_GUIDE.md` | Complete user flow guide with RBAC | Incorporated into 02_FLOW_MATRIX, 03_RBAC |
| `USER_FLOW_IMPACT_OUTCOMES.md` | Flow impacts | Incorporated into 04_RTM |

---

## Medium Authority Documents (To Supersede)

### 4. Roadmaps
**Location:** `docs/roadmaps/`
**Authority:** MEDIUM
**Note:** Many roadmaps are execution plans, not intent sources

| Document | Status | Replacement |
|----------|--------|-------------|
| `MASTER_ROADMAP.md` | ACTIVE | Referenced in 00_INTENT_SOURCES.md |
| `GOLDEN_FLOWS_BETA_ROADMAP.md` | ACTIVE | Invariants → 01_INVARIANTS, tasks → referenced |
| `GOLDEN_FLOW_EXECUTION_PLAN*.md` | Varies | Superseded by this audit |
| 50+ other roadmap files | Mixed | Most are historical execution plans |

**Decision:** PRESERVE MASTER_ROADMAP.md and GOLDEN_FLOWS_BETA_ROADMAP.md as task tracking; others are historical

### 5. QA Documents
**Location:** `docs/qa/`
**Authority:** LOW-MEDIUM

| Document | Status | Replacement |
|----------|--------|-------------|
| `QA_PLAYBOOK.md` | ACTIVE | Incorporated into 03_RBAC_INTENDED |
| `COVERAGE_MATRIX.md` | Outdated | Superseded by 00_COVERAGE.csv |
| `FLOW_COVERAGE_PLAN.md` | Partial | Superseded by 02_FLOW_MATRIX |
| `TERP_FULL_QA_STRATEGY.md` | Reference | Not replaced |
| 35+ other QA docs | Mixed | Most are reports, not intent |

---

## Low Authority Documents (Historical/Reference Only)

### 6. Kiro Specs
**Location:** `.kiro/specs/`
**Authority:** MEDIUM (design docs)

| Spec Directory | Purpose | Status |
|----------------|---------|--------|
| `canonical-model-unification/` | Party model migration | Complete |
| `customer-credit-system-improvement/` | Credit system | Complete |
| `unified-sales-live-shopping/` | Live shopping feature | In progress |
| 14 others | Various features | Mixed |

**Decision:** Reference in 00_INTENT_SOURCES.md where relevant

### 7. Feature Specs
**Location:** `docs/specs/`
**Authority:** HIGH for active features

50+ specification files covering WS-001 through WS-015, FEAT-*, ENH-*, etc.

**Decision:** Reference in 00_INTENT_SOURCES.md and 04_RTM_INTENDED

---

## Documents NOT Being Replaced

These documents serve different purposes and are NOT superseded:

| Document | Reason |
|----------|--------|
| `CLAUDE.md` | Agent protocol - not intent source |
| `docs/DEPLOYMENT.md` | Operational doc |
| `docs/DATABASE_SETUP.md` | Setup guide |
| `docs/AUTH_SETUP.md` | Setup guide |
| All `docs/adr/` files | Architecture Decision Records |
| All `docs/implementation/` | Implementation reports |
| All session files | Historical records |

---

## Staleness Assessment

### Very Fresh (< 7 days old)
- All `docs/golden-flows/specs/*.md` (2026-01-27)
- `docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md` (2026-01-27)

### Fresh (< 30 days old)
- `docs/roadmaps/MASTER_ROADMAP.md` (2026-01-27)
- Most QA reports in `docs/qa/`

### Potentially Stale (> 30 days old)
- `docs/protocols/CANONICAL_DICTIONARY.md` (2025-12-16)
- Many feature specs in `docs/specs/`
- Historical roadmaps

---

## Unique Content to Preserve

### From GOLDEN_FLOWS_BETA_ROADMAP.md
- **Invariants Table (INV-001 through INV-008)** - Critical business rules
- **Escalation Procedures** - Process documentation
- **Business Invariant Verification Commands** - SQL validation queries

### From CANONICAL_DICTIONARY.md
- **Party Model Diagram** - Visual architecture
- **ID Field Rules** - FK naming conventions
- **Write Authorization Rules** - Security requirements

### From QA_PLAYBOOK.md
- **QA Role Credentials** - Test account definitions
- **7-Step Testing Flow** - QA process
- **Role Permission Expectations** - RBAC baseline

### From FLOW_GUIDE.md
- **1,450+ Procedure Inventory** - Comprehensive API coverage
- **Domain Organization** - Module categorization
- **Authentication Level Matrix** - Security tiers
