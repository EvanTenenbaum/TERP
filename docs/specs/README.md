# TERP Product Specifications Index

This directory contains detailed product specifications for all major features and tasks in the TERP roadmap.

## Specification Status

| Status | Count |
|--------|-------|
| Approved | 24 |
| In Review | 0 |
| Draft | 17 |

## NEW: Critical Wave 1 Specs (2026-01-12)

The following specs were identified as **MISSING** during strategic roadmap review and are required for Wave 1 "Stop the Bleeding" execution.

### Wave 1: Stop the Bleeding Specs (CRITICAL)

| Task ID | Title | Spec | Priority | Estimate | Source |
|---------|-------|------|----------|----------|--------|
| FEAT-007 | Cash Audit System | [FEAT-007-CASH-AUDIT-SPEC.md](./FEAT-007-CASH-AUDIT-SPEC.md) | **CRITICAL** | 48h | MEET-001 to MEET-004 |
| FEAT-008 | Intake Verification System | [FEAT-008-INTAKE-VERIFICATION-SPEC.md](./FEAT-008-INTAKE-VERIFICATION-SPEC.md) | **CRITICAL** | 34h | MEET-064 to MEET-066 |
| FEAT-009 | Simple Client Ledger | [FEAT-009-CLIENT-LEDGER-SPEC.md](./FEAT-009-CLIENT-LEDGER-SPEC.md) | **CRITICAL** | 16h | MEET-010 |

> **Note:** These specs are in DRAFT status and require Product Owner approval before implementation.

---

## User Flow Gap Analysis Specs (2026-01-12)

The following specs were generated from the Strategic Implementation Plan to address gaps identified in the user flow analysis.

### Backend API Specs (Phase 1)

| Task ID | Title | Spec | Priority | Estimate |
|---------|-------|------|----------|----------|
| FEAT-001 | Enhanced Inventory Data API | [FEAT-001-SPEC.md](./FEAT-001-SPEC.md) | CRITICAL | 16h |
| FEAT-002 | Vendor Context API | [FEAT-002-SPEC.md](./FEAT-002-SPEC.md) | HIGH | 20h |
| FEAT-003-INLINE | In-line Product Creation API | [FEAT-003-INLINE-PRODUCT-SPEC.md](./FEAT-003-INLINE-PRODUCT-SPEC.md) | HIGH | 24h |
| FEAT-004 | Pricing & Credit Logic Backend | [FEAT-004-SPEC.md](./FEAT-004-SPEC.md) | HIGH | 28h |
| FEAT-005 | Scheduling & Referral APIs | [FEAT-005-SPEC.md](./FEAT-005-SPEC.md) | MEDIUM | 24h |
| FEAT-006 | Full Referral (Couch Tax) Workflow | [FEAT-006-SPEC.md](./FEAT-006-SPEC.md) | MEDIUM | 20h |

### Frontend Integration Specs (Phase 2)

| Task ID | Title | Spec | Priority | Estimate |
|---------|-------|------|----------|----------|
| ENH-001 | Update Inventory Browser Table | [ENH-001-SPEC.md](./ENH-001-SPEC.md) | CRITICAL | 16h |
| ENH-002 | Build Client Info Pod | [ENH-002-SPEC.md](./ENH-002-SPEC.md) | HIGH | 12h |
| ENH-003 | Integrate In-line Product Creation UI | [ENH-003-SPEC.md](./ENH-003-SPEC.md) | HIGH | 16h |
| ENH-004 | On-the-Fly Pricing UI | [ENH-004-SPEC.md](./ENH-004-SPEC.md) | HIGH | 20h |
| ENH-005 | Full Scheduling Workflow UI | [ENH-005-SPEC.md](./ENH-005-SPEC.md) | MEDIUM | 16h |

### UI Polish Specs (Phase 3)

| Task ID | Title | Spec | Priority | Estimate |
|---------|-------|------|----------|----------|
| ENH-006 | Relocate Order Preview | [ENH-006-SPEC.md](./ENH-006-SPEC.md) | LOW | 4h |
| ENH-007 | Apply Nomenclature Changes (Brand→Farmer) | [ENH-007-SPEC.md](./ENH-007-SPEC.md) | LOW | 8h |
| ENH-008 | Image Toggle for Inventory Views | [ENH-008-SPEC.md](./ENH-008-SPEC.md) | MEDIUM | 16h |

---

## Cooper Rd Sprint Specs (Approved)

### CRITICAL Priority

| Task ID | Title | Spec | Estimate |
|---------|-------|------|----------|
| WS-001 | Quick Action: Receive Client Payment | [WS-001-SPEC.md](./WS-001-SPEC.md) | 8h |
| WS-002 | Quick Action: Pay Vendor | [WS-002-SPEC.md](./WS-002-SPEC.md) | 8h |
| WS-003 | Pick & Pack Module: Group Bagging | [WS-003-SPEC.md](./WS-003-SPEC.md) | 24h |
| WS-004 | Simultaneous Multi-Order & Referral Credit | [WS-004-SPEC.md](./WS-004-SPEC.md) | 40h |
| WS-005 | No Black Box Audit Trail | [WS-005-SPEC.md](./WS-005-SPEC.md) | 30h |

### HIGH Priority

| Task ID | Title | Spec | Estimate |
|---------|-------|------|----------|
| WS-006 | Immediate Tab Screenshot/Receipt | [WS-006-SPEC.md](./WS-006-SPEC.md) | 12h |
| WS-007 | Complex Flower Intake Flow | [WS-007-SPEC.md](./WS-007-SPEC.md) | 20h |
| WS-008 | Low Stock & Needs-Based Alerts | [WS-008-SPEC.md](./WS-008-SPEC.md) | 16h |
| WS-009 | Inventory Movement & Shrinkage Tracking | [WS-009-SPEC.md](./WS-009-SPEC.md) | 20h |
| WS-010 | Photography Module | [WS-010-SPEC.md](./WS-010-SPEC.md) | 16h |
| FEATURE-003 | Live Shopping Session | [FEATURE-003-SPEC.md](./FEATURE-003-SPEC.md) | 40h |
| FEATURE-011 | Unified Product Catalogue | [FEATURE-011-SPEC.md](./FEATURE-011-SPEC.md) | 80-120h |
| QA-051 | Inventory Accuracy Audit System | [QA-051-SPEC.md](./QA-051-SPEC.md) | 24h |
| BUG-001 | Price Override Audit Trail | [BUG-001-SPEC.md](./BUG-001-SPEC.md) | 8h |

### MEDIUM Priority

| Task ID | Title | Spec | Estimate |
|---------|-------|------|----------|
| WS-011 | Quick Customer Creation | [WS-011-SPEC.md](./WS-011-SPEC.md) | 4h |
| WS-012 | Customer Preferences & Purchase History | [WS-012-SPEC.md](./WS-012-SPEC.md) | 16h |
| WS-013 | Simple Task Management | [WS-013-SPEC.md](./WS-013-SPEC.md) | 12h |
| WS-014 | Vendor Harvest Reminders | [WS-014-SPEC.md](./WS-014-SPEC.md) | 8h |
| FEATURE-005 | Unit Tracking with QR/NFC | [FEATURE-005-SPEC.md](./FEATURE-005-SPEC.md) | 120-180h |
| FEATURE-006 | VIP Booking System | [FEATURE-006-SPEC.md](./FEATURE-006-SPEC.md) | 60h |
| FEATURE-008 | Advanced Filtering & Search | [FEATURE-008-SPEC.md](./FEATURE-008-SPEC.md) | 24h |
| FEATURE-010 | Accounting-Calendar Integration | [FEATURE-010-SPEC.md](./FEATURE-010-SPEC.md) | 120-180h |
| FEATURE-020 | Tags System Revamp | [FEATURE-020-SPEC.md](./FEATURE-020-SPEC.md) | 20h |

---

## Strategic Roadmap Integration

See **[UNIFIED_STRATEGIC_ROADMAP_2026-01-12.md](../roadmaps/UNIFIED_STRATEGIC_ROADMAP_2026-01-12.md)** for:
- Task merging analysis (overlap with existing roadmap)
- Dependency graph
- Execution priority recommendations
- Conflict identification

---

## Specification Template

All new specifications should follow the standard template: [SPEC_TEMPLATE.md](./SPEC_TEMPLATE.md)

---

## Total Estimated Development Time

| Category | Hours (Low) | Hours (High) |
|----------|-------------|--------------|
| Cooper Rd Sprint (Approved) | 710h | 870h |
| User Flow Gap Analysis (New) | 220h | 220h |
| Wave 1 Critical Specs (New) | 98h | 98h |
| **TOTAL** | **1,028h** | **1,188h** |

> **Note:** See [PRIORITIZED_STRATEGIC_ROADMAP_2026-01-12.md](../roadmaps/PRIORITIZED_STRATEGIC_ROADMAP_2026-01-12.md) for optimized execution plan that reduces elapsed time to ~265h with 4 parallel agents.

---

## How to Use These Specs

1. **Before Development:** Read the full spec for the task you're working on
2. **During Development:** Reference the API contracts and data models
3. **Testing:** Use the acceptance criteria as your test checklist
4. **Questions:** Raise issues if spec is unclear or needs updating

---

## Spec Approval Process

1. Spec created by Product/Engineering
2. Review by Tech Lead
3. Review by QA Lead
4. Final approval by Product Owner
5. Status updated to "Approved"

---

*Last Updated: 2026-01-12*
