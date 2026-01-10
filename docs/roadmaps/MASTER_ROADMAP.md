# TERP Master Roadmap

## Single Source of Truth for All Development

**Version:** 4.8
**Last Updated:** 2026-01-10 (QA Sales Manager Role Testing)
**Status:** Active

> **ROADMAP STRUCTURE (v4.0)**
>
> This roadmap is organized into two milestone sections:
>
> - **🎯 MVP** - All tasks required to reach Minimum Viable Product
> - **🚀 Beta** - Tasks for the Beta release (reliability, scalability, polish)
>
> Use this structure to understand what work is needed for each milestone.

---

## 🚨 MANDATORY: Gemini API for Code Generation

**ALL AI agents on Manus platform implementing tasks from this roadmap MUST use Google Gemini API for:**

- Code generation and refactoring
- Complex reasoning and analysis
- Bulk operations and batch processing

```python
from google import genai
import os
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
```

**Full instructions:** `docs/GEMINI_API_USAGE.md` | **This is non-negotiable.**

---

## 📋 MANDATORY: Review Specifications Before Implementation

**ALL AI agents implementing tasks from this roadmap MUST review the corresponding specification BEFORE writing any code.**

| Resource          | Location                                                   | Description                                              |
| ----------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| **Specs Index**   | [`docs/specs/README.md`](../specs/README.md)               | Index of all 24 specifications with status and estimates |
| **Spec Template** | [`docs/specs/SPEC_TEMPLATE.md`](../specs/SPEC_TEMPLATE.md) | Template for creating new specifications                 |

---

# 🎯 MVP MILESTONE

> All tasks in this section must be completed to reach the Minimum Viable Product.

---

## ✅ MVP: Completed Work

> The following major work has been completed and verified.

### ✅ Infrastructure & Stability (COMPLETE)

| Task      | Description                                  | Status      | Completion Date |
| --------- | -------------------------------------------- | ----------- | --------------- |
| ST-005    | Add Missing Database Indexes                 | ✅ COMPLETE | Dec 2025        |
| ST-007    | Implement System-Wide Pagination             | ✅ COMPLETE | Dec 2025        |
| ST-008    | Implement Error Tracking (Sentry)            | ✅ COMPLETE | Dec 2025        |
| ST-009    | Implement API Monitoring                     | ✅ COMPLETE | Dec 2025        |
| ST-020    | Add Drizzle Schema to TypeScript Checking    | ✅ COMPLETE | Dec 2025        |
| ST-021    | Fix Malformed Soft Delete Column Definitions | ✅ COMPLETE | Dec 2025        |
| ST-022    | Remove Broken Index Definitions              | ✅ COMPLETE | Dec 2025        |
| ST-023    | Stabilize Deploy-Time Data Operations        | ✅ COMPLETE | Dec 2025        |
| INFRA-001 | Remove Obsolete GitHub Workflows             | ✅ COMPLETE | Dec 2025        |
| INFRA-002 | Add Session Cleanup Validation               | ✅ COMPLETE | Dec 2025        |
| INFRA-003 | Fix Database Schema Sync                     | ✅ COMPLETE | Dec 2025        |
| INFRA-005 | Fix Pre-Push Hook Protocol Conflict          | ✅ COMPLETE | Dec 2025        |
| INFRA-006 | Enhance Conflict Resolution                  | ✅ COMPLETE | Dec 2025        |
| INFRA-008 | Fix Migration Consolidation                  | ✅ COMPLETE | Dec 2025        |
| INFRA-009 | Update All Prompts                           | ✅ COMPLETE | Dec 2025        |
| INFRA-010 | Update Documentation                         | ✅ COMPLETE | Dec 2025        |
| INFRA-011 | Update Deployment Configuration              | ✅ COMPLETE | Dec 2025        |
| INFRA-013 | Create RBAC Database Tables Migration        | ✅ COMPLETE | Dec 2025        |

### ✅ Security (COMPLETE)

| Task    | Description                             | Status      | Completion Date |
| ------- | --------------------------------------- | ----------- | --------------- |
| SEC-001 | Fix Permission System Bypass            | ✅ COMPLETE | Dec 2025        |
| SEC-002 | Require JWT_SECRET Environment Variable | ✅ COMPLETE | Dec 2025        |
| SEC-003 | Remove Hardcoded Admin Credentials      | ✅ COMPLETE | Dec 2025        |
| SEC-004 | Remove Debug Code from Production       | ✅ COMPLETE | Dec 2025        |

### ✅ QA & Testing Infrastructure (COMPLETE)

| Task        | Description                                    | Status      | Completion Date |
| ----------- | ---------------------------------------------- | ----------- | --------------- |
| AUTH-QA-001 | QA Authentication Layer for Deterministic RBAC | ✅ COMPLETE | Jan 9, 2026     |

> **AUTH-QA-001 Details:**
>
> - Deterministic QA login for 7 roles (Super Admin, Sales Manager, Sales Rep, Inventory, Fulfillment, Accounting, Auditor)
> - API endpoints: `/api/qa-auth/login`, `/api/qa-auth/roles`, `/api/qa-auth/status`
> - Environment flag: `QA_AUTH_ENABLED=true` (auto-disabled in production)
> - Role switcher UI on login page
> - Audit logging for QA auth events
> - Documentation: `docs/auth/QA_AUTH.md`, `docs/qa/QA_PLAYBOOK.md`
> - Seed command: `pnpm seed:qa-accounts`

### ✅ Bug Fixes (COMPLETE)

| Task    | Description                                            | Status      | Completion Date |
| ------- | ------------------------------------------------------ | ----------- | --------------- |
| BUG-019 | Global Search Bar Returns 404 Error                    | ✅ COMPLETE | Dec 2025        |
| BUG-020 | Todo Lists Page Returns 404                            | ✅ COMPLETE | Dec 2025        |
| BUG-021 | Command Palette (Cmd+K) Not Working                    | ✅ COMPLETE | Dec 2025        |
| BUG-022 | Theme Toggle Not Implemented                           | ✅ COMPLETE | Dec 2025        |
| BUG-023 | Inconsistent Layout Between Dashboard and Module Pages | ✅ COMPLETE | Dec 2025        |
| BUG-024 | Fix Production Infinite Spinner                        | ✅ COMPLETE | Dec 2025        |
| BUG-025 | Analytics Data Not Populated                           | ✅ COMPLETE | Dec 2025        |
| BUG-026 | Fix Pino Logger API Signature Errors                   | ✅ COMPLETE | Dec 2025        |

### ✅ Quality & Reliability (COMPLETE)

| Task        | Description                                     | Status      | Completion Date |
| ----------- | ----------------------------------------------- | ----------- | --------------- |
| QUAL-001    | Standardize Error Handling                      | ✅ COMPLETE | Dec 2025        |
| QUAL-002    | Add Comprehensive Input Validation              | ✅ COMPLETE | Dec 2025        |
| QUAL-005    | COGS Module & Calendar Financials Integration   | ✅ COMPLETE | Dec 2025        |
| QUAL-006    | VIP Portal Supply CRUD & Dashboard Real Metrics | ✅ COMPLETE | Dec 2025        |
| REL-001-OLD | Deploy Multiple Instances                       | ✅ COMPLETE | Dec 2025        |
| REL-003-OLD | Fix Memory Leak in Connection Pool              | ✅ COMPLETE | Dec 2025        |
| REL-004-OLD | Increase Connection Pool Size                   | ✅ COMPLETE | Dec 2025        |
| PERF-003    | Add Pagination to All List Endpoints            | ✅ COMPLETE | Dec 2025        |

### ✅ Features (COMPLETE)

| Task        | Description                                   | Status      | Completion Date |
| ----------- | --------------------------------------------- | ----------- | --------------- |
| FEATURE-004 | Clarify Vendor vs Buyer vs Client Distinction | ✅ COMPLETE | Dec 2025        |
| FEATURE-011 | Unified Product Catalogue (Foundation)        | ✅ COMPLETE | Jan 2026        |
| FEATURE-012 | VIP Portal Admin Impersonation Tool           | ✅ COMPLETE | Dec 31, 2025    |
| FEATURE-015 | VIP Portal Settings in Client Profile         | ✅ COMPLETE | Dec 2025        |
| NOTIF-001   | Notification Triggers for Business Events     | ✅ COMPLETE | Jan 9, 2026     |

### ✅ Feature Flag System (COMPLETE - Dec 31, 2025)

- Database-driven feature flags with 4 tables
- 20 tRPC endpoints for flag management
- Admin UI at `/settings/feature-flags`
- 15 default flags (all enabled)
- Per-user and role override management

### ✅ Cooper Rd Sprint (COMPLETE - Jan 7, 2026)

All 15 tasks from the Cooper Rd Working Session completed:

| Task   | Description                                 | Status      |
| ------ | ------------------------------------------- | ----------- |
| WS-001 | Quick Action: Receive Client Payment        | ✅ COMPLETE |
| WS-002 | Quick Action: Pay Vendor                    | ✅ COMPLETE |
| WS-003 | Pick & Pack Module: Group Bagging/Packing   | ✅ COMPLETE |
| WS-004 | Sales: Multi-Order & Referral Credit System | ✅ COMPLETE |
| WS-005 | No Black Box Audit Trail                    | ✅ COMPLETE |
| WS-006 | Immediate Tab Screenshot/Receipt            | ✅ COMPLETE |
| WS-007 | Complex Flower Intake Flow                  | ✅ COMPLETE |
| WS-008 | Low Stock & Needs-Based Alerts              | ✅ COMPLETE |
| WS-009 | Pick & Pack: Inventory Movement SOP         | ✅ COMPLETE |
| WS-010 | Photography Module                          | ✅ COMPLETE |
| WS-011 | Sales: Quick Customer Creation              | ✅ COMPLETE |
| WS-012 | Customer Preferences & Purchase History     | ✅ COMPLETE |
| WS-013 | Simple Task Management                      | ✅ COMPLETE |
| WS-014 | Vendor "Harvesting Again" Reminder          | ✅ COMPLETE |
| WS-015 | Sales: Customer Wishlist Field              | ✅ COMPLETE |

### ✅ ST-045: User Flow Mapping (COMPLETE - Jan 8, 2026)

- Complete User Flow Matrix created
- RBAC Permission Mismatches documented
- Flow Guide documentation completed
- Reference files in `docs/reference/`

### ✅ Data Seeding (COMPLETE)

| Task     | Description                         | Status      |
| -------- | ----------------------------------- | ----------- |
| DATA-001 | Seed Core Tables                    | ✅ COMPLETE |
| DATA-002 | Seed Comments and Dashboard Tables  | ✅ COMPLETE |
| DATA-003 | Seed Pricing Tables                 | ✅ COMPLETE |
| DATA-006 | Seed Batches                        | ✅ COMPLETE |
| DATA-008 | Seed Client Contacts & Interactions | ✅ COMPLETE |
| DATA-009 | Seed Client Price Alerts            | ✅ COMPLETE |
| DATA-011 | Seed Additional Tables              | ✅ COMPLETE |

### ✅ Schema Validation (COMPLETE)

| Task     | Description              | Status      | Notes                                                       |
| -------- | ------------------------ | ----------- | ----------------------------------------------------------- |
| DATA-010 | Schema Validation System | ✅ COMPLETE | All schema debt resolved, 62+ property tests, CI integrated |

**DATA-010 Completion (Jan 9, 2026):** All critical work completed following Red Hat QA roadmap:

1. **Schema Debt (RESOLVED):** Added `adjustmentReason` column to `inventoryMovements`, added `deleted_at` to `orderStatusHistory`, renamed `reason` to `notes`
2. **Testing (COMPLETE):** 62 property tests + 12 integration tests implemented and passing
3. **CI Integration:** Tests added to `.github/workflows/schema-validation.yml`
4. **Data Seeding:** Seed scripts available (database access blocked by network in this environment)

**Session:** `docs/sessions/completed/Session-20251203-DATA-010-fff4be03.md`

---

## 🔴 MVP: Open Work

> The following tasks are still required for MVP.

### Critical Bugs (P0)

| Task    | Description                                 | Priority | Status                    |
| ------- | ------------------------------------------- | -------- | ------------------------- |
| BUG-040 | Order Creator: Inventory loading fails      | HIGH     | 🔴 OPEN                   |
| BUG-041 | Batch Detail View crashes app               | HIGH     | ✅ COMPLETE (Jan 9, 2026) |
| BUG-042 | Global Search returns no results            | HIGH     | ✅ COMPLETE (Jan 9, 2026) |
| BUG-043 | Permission Service empty array SQL crash    | HIGH     | ✅ COMPLETE (Jan 9, 2026) |
| BUG-044 | VIP Portal empty batch IDs crash            | HIGH     | ✅ COMPLETE (Jan 9, 2026) |
| BUG-045 | Order Creator: Retry resets entire form     | HIGH     | 🟡 OPEN                   |
| BUG-046 | Settings Users tab misleading auth error    | HIGH     | 🟡 OPEN                   |
| BUG-047 | Spreadsheet View shows empty grid           | HIGH     | 🟡 OPEN                   |
| BUG-070 | Fix Client List Click Handlers Not Working  | HIGH     | ✅ COMPLETE (Jan 9, 2026) |
| BUG-071 | Fix Create Client Form Submission Failure   | HIGH     | ready                     |
| BUG-072 | Fix Inventory Data Not Loading in Dashboard | HIGH     | ready                     |
| BUG-073 | Fix Live Shopping Feature Not Accessible    | HIGH     | ready                     |
| BUG-074 | Fix Spreadsheet View Empty Grid             | HIGH     | ready                     |
| BUG-075 | Fix Settings Users Tab Authentication Error | HIGH     | ready                     |
| BUG-076 | Fix Search and Filter Functionality         | HIGH     | ready                     |
| BUG-077 | Fix Notification System Not Working         | HIGH     | ready                     |

#### E2E Test Coverage Defects (Jan 9, 2026)

> Discovered during comprehensive E2E API testing against live environment.
> See: `qa-results/E2E_TEST_EXECUTION_REPORT.md`, `qa-results/DEFECT_LOG.csv`

| Task    | Description                                                      | Priority | Status  | Source  |
| ------- | ---------------------------------------------------------------- | -------- | ------- | ------- |
| BUG-078 | Orders List API Database Query Failure (orders.getAll)           | HIGH     | 🔴 OPEN | DEF-001 |
| BUG-079 | Quotes List API Database Query Failure (quotes.list)             | HIGH     | 🔴 OPEN | DEF-002 |
| BUG-080 | Invoice Summary API Database Query Failure (invoices.getSummary) | HIGH     | 🔴 OPEN | DEF-003 |
| BUG-081 | Calendar Events API Internal Server Error (calendar.getEvents)   | HIGH     | 🔴 OPEN | DEF-008 |
| BUG-082 | Order Detail API Internal Server Error (orders.getById)          | HIGH     | 🔴 OPEN | DEF-010 |
| BUG-083 | COGS Calculation API Internal Server Error (cogs.getCOGS)        | HIGH     | 🔴 OPEN | DEF-012 |
| BUG-084 | Pricing Defaults Table Missing (pricing_defaults)                | HIGH     | 🔴 OPEN | DEF-013 |
| BUG-085 | Notifications List API Internal Server Error                     | HIGH     | 🔴 OPEN | DEF-023 |

#### QA Sales Manager Role Testing (Jan 10, 2026)

> Discovered during comprehensive QA testing as Sales Manager / TERP Operator role.
> See: `docs/roadmaps/QA_STRATEGIC_FIX_PLAN.md` for full analysis and fix strategy.

| Task       | Description                                                    | Priority | Status  | Root Cause |
| ---------- | -------------------------------------------------------------- | -------- | ------- | ---------- |
| BUG-086    | Cannot finalize sales order - missing pricing defaults         | P0       | ✅ FIXED (Jan 10, 2026) | RC-001 (relates to BUG-084) |
| BUG-087    | Inventory → Products fails to load ("limit too large")         | P1       | ✅ FIXED (Jan 10, 2026) | RC-002 |
| BUG-088    | Spreadsheet Clients detail query fails with raw SQL error      | P1       | ✅ FIXED (Jan 10, 2026) | RC-002 (relates to BUG-078) |
| BUG-089    | Invoices "New Invoice" button non-functional (no onClick)      | P1       | ✅ FIXED (Jan 10, 2026) | RC-003 |
| BUG-090    | Client edit save inconsistent / phone not persisting           | P2       | ✅ FIXED (Jan 10, 2026) | RC-003 |
| BUG-091    | Spreadsheet View Inventory grid renders blank                  | P2       | ✅ FIXED (Jan 10, 2026) | RC-004 (relates to BUG-047/074) |
| BUG-092    | Finance AR/AP dashboard widgets stuck loading                  | P2       | ✅ FIXED (Jan 10, 2026) | RC-004 (relates to API-010) |
| BLOCKED-001| Sales Manager cannot access Samples (samples:read)             | P2       | ✅ FIXED (Jan 10, 2026) | RBAC |
| BLOCKED-002| Sales Manager cannot access Pick & Pack (permission 10002)     | P2       | BY-DESIGN | RBAC (warehouse-only) |
| BLOCKED-003| Sales Manager cannot access Finance Reports                    | P2       | ✅ FIXED (Jan 10, 2026) | RBAC |

---

### API Registration Issues (P1)

> tRPC procedures returning NOT_FOUND - may be missing router registration or endpoint implementation.
> Discovered during E2E coverage testing (Jan 9, 2026).

| Task    | Description                                                                                          | Priority | Status | Source      |
| ------- | ---------------------------------------------------------------------------------------------------- | -------- | ------ | ----------- |
| API-001 | Register todoLists.list procedure                                                                    | MEDIUM   | ready  | DEF-014     |
| API-002 | Register featureFlags.list procedure                                                                 | MEDIUM   | ready  | DEF-015     |
| API-003 | Register vipPortal.listAppointmentTypes procedure                                                    | MEDIUM   | ready  | DEF-016     |
| API-004 | Register salesSheets.list procedure                                                                  | MEDIUM   | ready  | DEF-017     |
| API-005 | Register samples.list procedure                                                                      | MEDIUM   | ready  | DEF-018     |
| API-006 | Register purchaseOrders.list procedure                                                               | MEDIUM   | ready  | DEF-019     |
| API-007 | Register alerts.list procedure                                                                       | MEDIUM   | ready  | DEF-020     |
| API-008 | Register inbox.list procedure                                                                        | MEDIUM   | ready  | DEF-021     |
| API-009 | Register locations.list procedure                                                                    | MEDIUM   | ready  | DEF-022     |
| API-010 | Fix accounting.\* procedures not found (getARSummary, getARAging, getAPSummary, getTotalCashBalance) | HIGH     | ready  | DEF-004-007 |

---

### Security Tasks (P0)

| Task    | Description                                        | Priority | Status      | Prompt                    |
| ------- | -------------------------------------------------- | -------- | ----------- | ------------------------- |
| SEC-005 | Protect Location Router Mutations                  | HIGH     | ✅ COMPLETE | `docs/prompts/SEC-005.md` |
| SEC-006 | Protect Warehouse Transfer Mutations               | HIGH     | ✅ COMPLETE | `docs/prompts/SEC-006.md` |
| SEC-007 | Protect Order Enhancement Mutations (11 Endpoints) | HIGH     | ✅ COMPLETE | `docs/prompts/SEC-007.md` |
| SEC-008 | Protect Settings Router Mutations                  | HIGH     | ✅ COMPLETE | `docs/prompts/SEC-008.md` |
| SEC-009 | Protect VIP Portal Needs Data Exposure             | HIGH     | ✅ COMPLETE | `docs/prompts/SEC-009.md` |
| SEC-010 | Protect Returns and Refunds Query Endpoints        | HIGH     | ✅ COMPLETE | `docs/prompts/SEC-010.md` |
| SEC-011 | Reduce VIP Portal Session Duration                 | HIGH     | ✅ COMPLETE | `docs/prompts/SEC-011.md` |
| SEC-012 | Secure Admin Setup Endpoint                        | HIGH     | ✅ COMPLETE | `docs/prompts/SEC-012.md` |

---

### Stability Tasks (P1)

| Task   | Description                                | Priority | Status      | Prompt                   |
| ------ | ------------------------------------------ | -------- | ----------- | ------------------------ |
| ST-025 | Add Error Boundaries to Critical Pages     | HIGH     | ✅ COMPLETE | `docs/prompts/ST-025.md` |
| ST-026 | Implement Concurrent Edit Detection        | HIGH     | ready       | `docs/prompts/ST-026.md` |
| ST-010 | Implement Caching Layer (Permission Cache) | MEDIUM   | ✅ COMPLETE | `docs/prompts/ST-010.md` |
| ST-024 | Permission Caching in Service              | LOW      | ✅ COMPLETE | `docs/prompts/ST-024.md` |

---

### UX Tasks (P1)

| Task   | Description                           | Priority | Status      | Prompt |
| ------ | ------------------------------------- | -------- | ----------- | ------ |
| UX-001 | Implement Form Dirty State Protection | MEDIUM   | ✅ COMPLETE | -      |
| UX-003 | Fix Mobile Kanban Overflow            | MEDIUM   | ✅ COMPLETE | -      |
| UX-006 | Add Error Recovery UI with Retry      | MEDIUM   | ✅ COMPLETE | -      |

---

### Feature Tasks (P2)

| Task        | Description                                          | Priority | Status      | Prompt |
| ----------- | ---------------------------------------------------- | -------- | ----------- | ------ |
| FEAT-001    | Client Form Field Updates                            | MEDIUM   | ready       | -      |
| FEAT-002    | Tag System Revamp for Clients and Products           | MEDIUM   | ready       | -      |
| FEAT-003    | Order Creator Quick Add Quantity Field               | MEDIUM   | ready       | -      |
| FEAT-004    | Add Dollar Amount Discount Option                    | MEDIUM   | ready       | -      |
| FEAT-005    | Merge Draft and Quote Workflows                      | MEDIUM   | ready       | -      |
| FEAT-006    | Show Product Name Instead of SKU in Order Creator    | MEDIUM   | ready       | -      |
| FEAT-007    | Add Payment Recording Against Invoices               | HIGH     | ready       | -      |
| FEAT-008    | Invoice Editing from Order View                      | MEDIUM   | ready       | -      |
| FEAT-009    | Add Product Subcategories (Smalls, Trim, etc.)       | MEDIUM   | ready       | -      |
| FEAT-010    | Default Warehouse Selection                          | MEDIUM   | ready       | -      |
| FEAT-011    | COGS Logic and Sales Flow Integration                | HIGH     | ready       | -      |
| FEAT-012    | Make Grade Field Optional/Customizable               | LOW      | ready       | -      |
| FEAT-013    | Add Packaged Unit Type for Products                  | LOW      | ready       | -      |
| FEAT-014    | Remove Expected Delivery from Purchases              | LOW      | ready       | -      |
| FEAT-015    | Finance Status Customization                         | LOW      | ready       | -      |
| FEAT-016    | Rename Credits to Credit Settings                    | LOW      | ✅ COMPLETE | -      |
| FEAT-017    | Feature Flags Direct Access                          | LOW      | ready       | -      |
| FEAT-018    | Remove Development-Only Features from User-Facing UI | LOW      | ready       | -      |
| FEAT-019    | VIP Status and Tiers Implementation                  | MEDIUM   | ready       | -      |
| FEAT-020    | Product Subcategory and Strain Matching              | MEDIUM   | ready       | -      |
| FEAT-021    | Settings Changes Apply to Entire Team                | MEDIUM   | ready       | -      |
| FEAT-022    | Show Role Names Instead of Count in Permissions      | LOW      | ready       | -      |
| FEAT-023    | Notification Preferences - System vs User Level      | MEDIUM   | ready       | -      |
| FEAT-024    | Inline Notifications Without Page Navigation         | MEDIUM   | ready       | -      |
| FEATURE-003 | Live Shopping & Price Negotiation System             | MEDIUM   | ready       | -      |

---

### Video Testing Session Tasks (Jan 7, 2026)

| Task   | Description                                    | Priority | Status      |
| ------ | ---------------------------------------------- | -------- | ----------- |
| UX-009 | Fix Sidebar Slide Animation                    | LOW      | ✅ COMPLETE |
| UX-010 | Clarify My Account vs User Settings Navigation | LOW      | ready       |
| UX-011 | Fix Two Export Buttons Issue                   | LOW      | ready       |
| UX-012 | Fix Period Display Formatting                  | LOW      | ready       |
| UX-013 | Fix Mirrored Elements Issue                    | LOW      | ready       |
| UX-014 | Make Optional Fields Clear                     | LOW      | ✅ COMPLETE |

---

### Infrastructure Tasks (P2)

| Task        | Description                                 | Priority | Status | Prompt |
| ----------- | ------------------------------------------- | -------- | ------ | ------ |
| INFRA-004   | Implement Deployment Monitoring Enforcement | MEDIUM   | ready  | -      |
| INFRA-007   | Update Swarm Manager                        | LOW      | ready  | -      |
| INFRA-012   | Deploy TERP Commander Slack Bot             | LOW      | ready  | -      |
| CLEANUP-001 | Remove LLM/AI from Codebase                 | LOW      | ready  | -      |

---

### Quality Tasks (P2)

| Task        | Description                                    | Priority | Status      | Prompt |
| ----------- | ---------------------------------------------- | -------- | ----------- | ------ |
| QUAL-003    | Complete Critical TODOs                        | MEDIUM   | ready       | -      |
| QUAL-004    | Review Referential Integrity (CASCADE Deletes) | HIGH     | ✅ COMPLETE | -      |
| QUAL-007    | Final TODO Audit & Documentation               | MEDIUM   | ✅ COMPLETE | -      |
| ROADMAP-001 | Process Consolidated Roadmap Update Report     | LOW      | ready       | -      |

---

### Improvement Tasks (P3)

| Task        | Description                     | Priority | Status      |
| ----------- | ------------------------------- | -------- | ----------- |
| IMPROVE-001 | Fix Backup Script Security      | MEDIUM   | ✅ COMPLETE |
| IMPROVE-002 | Enhance Health Check Endpoints  | MEDIUM   | ✅ COMPLETE |
| IMPROVE-003 | Add Composite Database Indexes  | MEDIUM   | ✅ COMPLETE |
| IMPROVE-004 | Reduce Rate Limiting Thresholds | LOW      | ✅ COMPLETE |

---

### Data & Schema Tasks (P1)

> **DATA-010 Completed:** Schema Validation System has been moved to the completed section above.
> All schema debt resolved, 62+ property tests implemented, CI integration complete.
> See: `docs/sessions/completed/Session-20251203-DATA-010-fff4be03.md`

**Commands (for reference):**

```bash
pnpm validate:schema           # Run validation
pnpm fix:schema:report         # Generate fix recommendations
pnpm validate:schema:fixes     # Verify critical tables
tsx scripts/seed-client-needs.ts  # Seed client needs
```

---

## 📊 MVP Summary

| Category         | Completed | Open    | Total    |
| ---------------- | --------- | ------- | -------- |
| Infrastructure   | 18        | 4       | 22       |
| Security         | 12        | 0       | 12       |
| Bug Fixes        | 21        | 21      | 42       |
| API Registration | 0         | 10      | 10       |
| Stability        | 10        | 1       | 11       |
| Quality          | 10        | 2       | 12       |
| Features         | 6         | 23+     | 29+      |
| UX               | 5         | 4       | 9        |
| Data & Schema    | 7         | 1       | 8        |
| Improvements     | 4         | 0       | 4        |
| **TOTAL**        | **93+**   | **66+** | **159+** |

> **E2E Coverage (Jan 9, 2026):** 18 new defects added from comprehensive API testing.
> See `qa-results/E2E_TEST_EXECUTION_REPORT.md` for full details.
>
> **QA Role Testing (Jan 10, 2026):** 10 issues identified, **9 fixed**, 1 by-design.
> See `docs/qa/QA_SALES_MANAGER_FIXES_VALIDATION.md` for validation checklist.

---

# 🚀 BETA MILESTONE

> All tasks in this section are for the Beta release.
> Focus: Reliability, scalability, and polish for production readiness.

---

## 🛡️ Reliability Program (99.99): Inventory + Money + Ledger + AR/AP

**Goal:** Make "can't be wrong" business data (inventory quantities, money amounts, AR/AP balances, ledger postings) durable, reconstructable, and safe under retries + concurrency.

**Status:** All tasks ready for implementation (none started)

**Critical Code Anchors (already in repo):**

- Transactions + retries: `server/_core/dbTransaction.ts`
- Locking: `server/_core/dbLocking.ts`
- Optimistic locking helpers: `server/_core/optimisticLocking.ts`
- Inventory truth + movements: `server/inventoryDb.ts`, `server/inventoryMovementsDb.ts`, `server/inventoryUtils.ts`
- Accounting + ledger logic: `server/accountingDb.ts`, `server/services/orderAccountingService.ts`, `server/_core/fiscalPeriod.ts`
- RBAC: `server/_core/permissionMiddleware.ts`, `server/_core/permissionService.ts`, `server/services/rbacDefinitions.ts`
- Observability: `server/_core/logger.ts`, `server/_core/monitoring.ts`, `sentry.*.config.ts`

### Program Definition of Done (Non-Negotiable)

- Every "critical mutation" is **transactional**, **retry-safe**, and **idempotent** (replay-safe).
- Inventory and money systems are **reconstructable from immutable journals** (movements / ledger entries).
- Continuous reconciliation exists (report + optional controlled fix) with alerts.
- CI gates prevent merges that break invariants.

---

### Beta: Reliability Tasks

| Task    | Description                                             | Priority | Status | Estimate | Prompt                    |
| ------- | ------------------------------------------------------- | -------- | ------ | -------- | ------------------------- |
| REL-001 | Define Truth Model + Invariants for Inventory and Money | HIGH     | ready  | 8h       | `docs/prompts/REL-001.md` |
| REL-002 | Migrate Inventory Quantities to DECIMAL                 | HIGH     | ready  | 2d       | `docs/prompts/REL-002.md` |
| REL-003 | Migrate Money Amounts to DECIMAL                        | HIGH     | ready  | 2d       | `docs/prompts/REL-003.md` |
| REL-004 | Critical Mutation Wrapper (Transactional + Retry)       | HIGH     | ready  | 16h      | `docs/prompts/REL-004.md` |
| REL-005 | Idempotency Keys for Critical Mutations                 | HIGH     | ready  | 2d       | `docs/prompts/REL-005.md` |
| REL-006 | Inventory Concurrency Hardening                         | HIGH     | ready  | 2d       | `docs/prompts/REL-006.md` |
| REL-007 | Inventory Movements Immutability + Reversal             | HIGH     | ready  | 16h      | `docs/prompts/REL-007.md` |
| REL-008 | Ledger Immutability + Reversal + Fiscal Period Lock     | HIGH     | ready  | 2d       | `docs/prompts/REL-008.md` |
| REL-009 | Reconciliation Framework                                | HIGH     | ready  | 2d       | `docs/prompts/REL-009.md` |
| REL-010 | Inventory Reconciliation Pack                           | HIGH     | ready  | 16h      | `docs/prompts/REL-010.md` |
| REL-011 | AR/AP Reconciliation Pack                               | HIGH     | ready  | 2d       | `docs/prompts/REL-011.md` |
| REL-012 | Ledger Reconciliation Pack                              | HIGH     | ready  | 16h      | `docs/prompts/REL-012.md` |
| REL-013 | RBAC Drift Detector                                     | HIGH     | ready  | 16h      | `docs/prompts/REL-013.md` |
| REL-014 | Critical Correctness Test Harness                       | HIGH     | ready  | 2d       | `docs/prompts/REL-014.md` |
| REL-015 | Observability for Critical Mutations                    | HIGH     | ready  | 16h      | `docs/prompts/REL-015.md` |
| REL-016 | Backup/Restore Reliability Runbook                      | MEDIUM   | ready  | 2d       | `docs/prompts/REL-016.md` |
| REL-017 | CI/PR Gates for Critical Domains                        | HIGH     | ready  | 16h      | `docs/prompts/REL-017.md` |

---

## 📊 Beta Summary

| Category            | Completed | Open   | Total  |
| ------------------- | --------- | ------ | ------ |
| Reliability Program | 0         | 17     | 17     |
| **TOTAL**           | **0**     | **17** | **17** |

---

## 📊 Overall Roadmap Summary

| Milestone | Completed | Open     | Total    | Progress |
| --------- | --------- | -------- | -------- | -------- |
| MVP       | 56+       | 89+      | 145+     | ~39%     |
| Beta      | 0         | 17       | 17       | 0%       |
| **TOTAL** | **56+**   | **106+** | **162+** | ~35%     |

---

## 📞 Questions?

Contact the project maintainer or open an issue in the repository.
