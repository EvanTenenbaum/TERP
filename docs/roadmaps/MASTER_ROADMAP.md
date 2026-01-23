# TERP Master Roadmap

## Single Source of Truth for All Development

**Version:** 6.8
**Last Updated:** 2026-01-21 (Merged security audit + DATA-021 + FEAT-SIGNAL-001)
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
| INFRA-014 | Cron Leader Election for Multi-Instance      | ✅ COMPLETE | Jan 20, 2026    |

> **INFRA-014 Details:**
>
> - Database-backed leader election for cron job coordination
> - Prevents duplicate cron execution in multi-instance deployments
> - Lease-based locking with 30s lease, 10s heartbeat
> - All 4 cron jobs updated: sessionTimeout, notificationQueue, debtAging, priceAlerts
> - Unit tests: 17 passing
> - Documentation: `docs/implementation/INFRA-014_HIGH_MEMORY_REMEDIATION_COMPLETION_REPORT.md`

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

| Task    | Description                                 | Priority | Status                                            |
| ------- | ------------------------------------------- | -------- | ------------------------------------------------- |
| BUG-040 | Order Creator: Inventory loading fails      | HIGH     | ✅ COMPLETE (Jan 13, 2026)                        |
| BUG-041 | Batch Detail View crashes app               | HIGH     | ✅ COMPLETE (Jan 9, 2026)                         |
| BUG-042 | Global Search returns no results            | HIGH     | ✅ COMPLETE (Jan 9, 2026)                         |
| BUG-043 | Permission Service empty array SQL crash    | HIGH     | ✅ COMPLETE (Jan 9, 2026)                         |
| BUG-044 | VIP Portal empty batch IDs crash            | HIGH     | ✅ COMPLETE (Jan 9, 2026)                         |
| BUG-045 | Order Creator: Retry resets entire form     | HIGH     | ✅ COMPLETE (Jan 13, 2026)                        |
| BUG-046 | Settings Users tab misleading auth error    | HIGH     | ✅ COMPLETE (Jan 13, 2026)                        |
| BUG-047 | Spreadsheet View shows empty grid           | HIGH     | ✅ COMPLETE (Jan 11, 2026) - Fixed as BUG-091     |
| BUG-070 | Fix Client List Click Handlers Not Working  | HIGH     | ✅ COMPLETE (Jan 9, 2026)                         |
| BUG-071 | Fix Create Client Form Submission Failure   | HIGH     | ✅ COMPLETE (Jan 12-14, 2026)                     |
| BUG-072 | Fix Inventory Data Not Loading in Dashboard | HIGH     | ✅ COMPLETE (Jan 12-14, 2026)                     |
| BUG-073 | Fix Live Shopping Feature Not Accessible    | HIGH     | ✅ COMPLETE (Jan 12-14, 2026)                     |
| BUG-074 | Fix Spreadsheet View Empty Grid             | HIGH     | ✅ COMPLETE (Jan 11, 2026) - Fixed as BUG-091     |
| BUG-075 | Fix Settings Users Tab Authentication Error | HIGH     | ✅ COMPLETE (Jan 13, 2026) - duplicate of BUG-046 |
| BUG-076 | Fix Search and Filter Functionality         | HIGH     | ✅ COMPLETE (Jan 12-14, 2026)                     |
| BUG-077 | Fix Notification System Not Working         | HIGH     | ✅ COMPLETE (Jan 12-14, 2026)                     |

#### Production Schema/Migration Issues (Jan 23, 2026)

> Discovered during production 503 error investigation.

| Task    | Description                                                    | Priority | Status                  | Root Cause                                                    |
| ------- | -------------------------------------------------------------- | -------- | ----------------------- | ------------------------------------------------------------- |
| BUG-101 | Production 503 - Missing calendar_id column in calendar_events | P0       | ✅ FIXED (Jan 23, 2026) | Schema expected calendar_id column not created by autoMigrate |

**BUG-101 Fix (Jan 23, 2026):**

- **Location:** `server/autoMigrate.ts:1125-1171`
- **Solution:** Added automatic migration to create `calendar_id INT NULL` column on `calendar_events` table during server startup. Migration is idempotent - handles "Duplicate column" errors gracefully.
- **Branch:** `claude/fix-inventory-display-tu3S3`
- **Commit:** `5201d5b`

#### UI/Data Mismatch Issues (Jan 14, 2026)

> Discovered during comprehensive UI investigation session.

| Task    | Description                                                   | Priority | Status   | Root Cause                                                                                                      |
| ------- | ------------------------------------------------------------- | -------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| BUG-098 | Inventory Page - Table shows 0 items but summary shows $62.3M | P1       | ✅ FIXED | Data source mismatch: dashboardStats shows total inventory value while getEnhanced returns filtered/empty items |
| BUG-099 | Samples Page - Database error when loading samples            | P1       | ✅ FIXED | samplesDb.getAllSampleRequests throws when DB unavailable or query fails                                        |

**BUG-098 Fix (Jan 14, 2026):**

- **Location:** `client/src/pages/Inventory.tsx:680-704`
- **Solution:** When `useEnhancedApi` is enabled, display summary cards from `enhancedResponse.summary` instead of independent `DataCardSection`. This ensures table data and summary cards use the same data source.

**BUG-099 Fix (Jan 14, 2026):**

- **Location:** `server/samplesDb.ts:882-906`
- **Solution:** Modified `getAllSampleRequests` to return empty array with logged warning instead of throwing. This allows the UI to gracefully show "no samples" state instead of crashing with database error.

#### E2E Test Coverage Defects (Jan 9, 2026)

> Discovered during comprehensive E2E API testing against live environment.
> See: `qa-results/E2E_TEST_EXECUTION_REPORT.md`, `qa-results/DEFECT_LOG.csv`

| Task    | Description                                                      | Priority | Status                        | Source  |
| ------- | ---------------------------------------------------------------- | -------- | ----------------------------- | ------- |
| BUG-078 | Orders List API Database Query Failure (orders.getAll)           | HIGH     | ✅ COMPLETE (Jan 12, 2026)    | DEF-001 |
| BUG-079 | Quotes List API Database Query Failure (quotes.list)             | HIGH     | ✅ COMPLETE (Jan 12, 2026)    | DEF-002 |
| BUG-080 | Invoice Summary API Database Query Failure (invoices.getSummary) | HIGH     | ✅ COMPLETE (Jan 12, 2026)    | DEF-003 |
| BUG-081 | Calendar Events API Internal Server Error (calendar.getEvents)   | HIGH     | ✅ COMPLETE (Jan 12, 2026)    | DEF-008 |
| BUG-082 | Order Detail API Internal Server Error (orders.getById)          | HIGH     | ✅ COMPLETE (Jan 12-14, 2026) | DEF-010 |
| BUG-083 | COGS Calculation API Internal Server Error (cogs.getCOGS)        | HIGH     | ✅ COMPLETE (Jan 12-14, 2026) | DEF-012 |
| BUG-084 | Pricing Defaults Table Missing (pricing_defaults)                | HIGH     | ✅ COMPLETE (Jan 12, 2026)    | DEF-013 |
| BUG-085 | Notifications List API Internal Server Error                     | HIGH     | ✅ COMPLETE (Jan 12-14, 2026) | DEF-023 |

#### QA Sales Manager Role Testing (Jan 10, 2026)

> Discovered during comprehensive QA testing as Sales Manager / TERP Operator role.
> See: `docs/roadmaps/QA_STRATEGIC_FIX_PLAN.md` for full analysis and fix strategy.

| Task        | Description                                                | Priority | Status                  | Root Cause                      |
| ----------- | ---------------------------------------------------------- | -------- | ----------------------- | ------------------------------- |
| BUG-086     | Cannot finalize sales order - missing pricing defaults     | P0       | ✅ FIXED (Jan 10, 2026) | RC-001 (relates to BUG-084)     |
| BUG-087     | Inventory → Products fails to load ("limit too large")     | P1       | ✅ FIXED (Jan 10, 2026) | RC-002                          |
| BUG-088     | Spreadsheet Clients detail query fails with raw SQL error  | P1       | ✅ FIXED (Jan 10, 2026) | RC-002 (relates to BUG-078)     |
| BUG-089     | Invoices "New Invoice" button non-functional (no onClick)  | P1       | ✅ FIXED (Jan 10, 2026) | RC-003                          |
| BUG-090     | Client edit save inconsistent / phone not persisting       | P2       | ✅ FIXED (Jan 10, 2026) | RC-003                          |
| BUG-091     | Spreadsheet View Inventory grid renders blank              | P2       | ✅ FIXED (Jan 10, 2026) | RC-004 (relates to BUG-047/074) |
| BUG-092     | Finance AR/AP dashboard widgets stuck loading              | P2       | ✅ FIXED (Jan 10, 2026) | RC-004 (relates to API-010)     |
| BLOCKED-001 | Sales Manager cannot access Samples (samples:read)         | P2       | ✅ FIXED (Jan 10, 2026) | RBAC                            |
| BLOCKED-002 | Sales Manager cannot access Pick & Pack (permission 10002) | P2       | BY-DESIGN               | RBAC (warehouse-only)           |
| BLOCKED-003 | Sales Manager cannot access Finance Reports                | P2       | ✅ FIXED (Jan 10, 2026) | RBAC                            |

#### QA Baseline Execution - Wave 2 (Jan 11, 2026)

> Discovered during baseline QA run after Wave 1 fixes merged.
> See: `docs/roadmaps/QA_STRATEGIC_FIX_PLAN_WAVE2.md` for full analysis and fix strategy.

| Task    | Description                                                         | Priority | Status                  | Root Cause |
| ------- | ------------------------------------------------------------------- | -------- | ----------------------- | ---------- |
| BUG-093 | Sales Order finalization unreliable (finalizeMutation never called) | P0       | ✅ FIXED (Jan 11, 2026) | RC-006     |
| BUG-094 | Live Shopping session creation fails (FK constraint violation)      | P1       | ✅ FIXED (Jan 11, 2026) | RC-007     |
| BUG-095 | Batches "New Purchase" button inert (Dialog handler mismatch)       | P1       | ✅ FIXED (Jan 11, 2026) | RC-008     |
| BUG-096 | AR/AP aging widgets still failing (underlying query issue)          | P1       | ✅ FIXED (Jan 11, 2026) | RC-009     |
| BUG-097 | Error handling inconsistency across modules                         | P3       | ✅ FIXED                | UX         |

---

### API Registration Issues (P1)

> tRPC procedures returning NOT_FOUND - may be missing router registration or endpoint implementation.
> Discovered during E2E coverage testing (Jan 9, 2026).

| Task    | Description                                                                                          | Priority | Status                        | Source      |
| ------- | ---------------------------------------------------------------------------------------------------- | -------- | ----------------------------- | ----------- |
| API-001 | Register todoLists.list procedure                                                                    | MEDIUM   | ✅ COMPLETE (Jan 12, 2026)    | DEF-014     |
| API-002 | Register featureFlags.list procedure                                                                 | MEDIUM   | ✅ COMPLETE (Jan 12, 2026)    | DEF-015     |
| API-003 | Register vipPortal.listAppointmentTypes procedure                                                    | MEDIUM   | ✅ COMPLETE (Jan 12-14, 2026) | DEF-016     |
| API-004 | Register salesSheets.list procedure                                                                  | MEDIUM   | ✅ COMPLETE (Jan 12, 2026)    | DEF-017     |
| API-005 | Register samples.list procedure                                                                      | MEDIUM   | ✅ COMPLETE (Jan 12, 2026)    | DEF-018     |
| API-006 | Register purchaseOrders.list procedure                                                               | MEDIUM   | ✅ COMPLETE (Jan 12, 2026)    | DEF-019     |
| API-007 | Register alerts.list procedure                                                                       | MEDIUM   | ✅ COMPLETE (Jan 12, 2026)    | DEF-020     |
| API-008 | Register inbox.list procedure                                                                        | MEDIUM   | ✅ COMPLETE (Jan 12, 2026)    | DEF-021     |
| API-009 | Register locations.list procedure                                                                    | MEDIUM   | ✅ COMPLETE (Jan 12, 2026)    | DEF-022     |
| API-010 | Fix accounting.\* procedures not found (getARSummary, getARAging, getAPSummary, getTotalCashBalance) | HIGH     | ✅ COMPLETE (Jan 12, 2026)    | DEF-004-007 |

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

### QA Deep Audit Findings (Jan 14, 2026)

> Discovered during comprehensive QA audit of entire codebase.
> See: `QA_COMBINED_FINAL_REPORT.md` for full analysis.

#### Security Issues (P0)

| Task    | Description                                   | Priority | Status                        | Estimate | Prompt                    |
| ------- | --------------------------------------------- | -------- | ----------------------------- | -------- | ------------------------- |
| SEC-018 | Remove Hardcoded Admin Setup Key Fallback     | HIGH     | ✅ COMPLETE (Jan 12-14, 2026) | 2h       | `docs/prompts/SEC-018.md` |
| SEC-019 | Protect 12 matchingEnhanced Public Endpoints  | HIGH     | ✅ COMPLETE (Jan 12-14, 2026) | 4h       | `docs/prompts/SEC-019.md` |
| SEC-020 | Protect 5 calendarRecurrence Public Mutations | HIGH     | ✅ COMPLETE (Jan 12-14, 2026) | 2h       | `docs/prompts/SEC-020.md` |
| SEC-021 | Fix Token Exposure in URL Query Parameter     | MEDIUM   | ✅ COMPLETE (Jan 12-14, 2026) | 4h       | `docs/prompts/SEC-021.md` |
| SEC-022 | Remove Hardcoded Production URLs              | LOW      | ✅ COMPLETE (Jan 12-14, 2026) | 2h       | `docs/prompts/SEC-022.md` |

#### Data Integrity Issues (P0/P1)

| Task   | Description                                     | Priority | Status                            | Estimate | Prompt                   |
| ------ | ----------------------------------------------- | -------- | --------------------------------- | -------- | ------------------------ |
| DI-001 | Implement Real withTransaction Database Wrapper | HIGH     | ✅ COMPLETE (Jan 12-14, 2026)     | 8h       | `docs/prompts/DI-001.md` |
| DI-002 | Fix Credit Application Race Condition           | HIGH     | ✅ COMPLETE (Jan 12-14, 2026)     | 8h       | `docs/prompts/DI-002.md` |
| DI-003 | Add Transaction to Cascading Delete Operations  | HIGH     | ✅ COMPLETE (Jan 12-14, 2026)     | 4h       | `docs/prompts/DI-003.md` |
| DI-004 | Implement Soft-Delete Support for Clients       | MEDIUM   | ✅ COMPLETE (already implemented) | 8h       | `docs/prompts/DI-004.md` |
| DI-005 | Fix Startup Seeding Schema Drift                | MEDIUM   | ✅ COMPLETE (already implemented) | 4h       | `docs/prompts/DI-005.md` |
| DI-006 | Add Missing Foreign Key Constraints             | MEDIUM   | ✅ COMPLETE (already implemented) | 8h       | `docs/prompts/DI-006.md` |
| DI-007 | Migrate VARCHAR to DECIMAL for Numeric Columns  | LOW      | ✅ COMPLETE (Jan 12-14, 2026)     | 2d       | `docs/prompts/DI-007.md` |
| DI-008 | Fix SSE Event Listener Memory Leaks             | MEDIUM   | ✅ COMPLETE (Jan 12-14, 2026)     | 4h       | `docs/prompts/DI-008.md` |

#### Frontend Quality Issues (P2)

| Task      | Description                                  | Priority | Status                        | Estimate | Prompt                      |
| --------- | -------------------------------------------- | -------- | ----------------------------- | -------- | --------------------------- |
| FE-QA-001 | Replace key={index} Anti-Pattern (27 Files)  | MEDIUM   | ✅ COMPLETE (Jan 12-14, 2026) | 8h       | `docs/prompts/FE-QA-001.md` |
| FE-QA-002 | Align Frontend/Backend Pagination Parameters | MEDIUM   | ✅ COMPLETE (Jan 12-14, 2026) | 4h       | `docs/prompts/FE-QA-002.md` |
| FE-QA-003 | Fix VIP Token Header vs Input Inconsistency  | MEDIUM   | ✅ COMPLETE (Jan 12-14, 2026) | 2h       | `docs/prompts/FE-QA-003.md` |

#### Backend Placeholder Issues (P2)

| Task      | Description                                      | Priority | Status                        | Estimate | Prompt                      |
| --------- | ------------------------------------------------ | -------- | ----------------------------- | -------- | --------------------------- |
| BE-QA-001 | Complete or Remove Email/SMS Integration Stubs   | MEDIUM   | ✅ COMPLETE (Jan 12-14, 2026) | 16h      | `docs/prompts/BE-QA-001.md` |
| BE-QA-002 | Implement VIP Tier Config Database Storage       | MEDIUM   | ✅ COMPLETE (Jan 12-14, 2026) | 8h       | `docs/prompts/BE-QA-002.md` |
| BE-QA-003 | Fix Vendor Supply Matching Empty Results         | MEDIUM   | ✅ COMPLETE (Jan 12-14, 2026) | 8h       | `docs/prompts/BE-QA-003.md` |
| BE-QA-004 | Complete Dashboard Metrics Schema Implementation | MEDIUM   | ✅ COMPLETE (Jan 12-14, 2026) | 8h       | `docs/prompts/BE-QA-004.md` |
| BE-QA-005 | Fix Supplier Metrics Null Return Values          | MEDIUM   | ✅ COMPLETE (Jan 12-14, 2026) | 4h       | `docs/prompts/BE-QA-005.md` |

#### UX Issues (P1/P2)

| Task   | Description                                     | Priority | Status                        | Estimate | Prompt                   |
| ------ | ----------------------------------------------- | -------- | ----------------------------- | -------- | ------------------------ |
| UX-010 | Clarify My Account vs User Settings Navigation  | LOW      | ✅ COMPLETE (Jan 12-14, 2026) | 4h       | -                        |
| UX-011 | Fix Two Export Buttons Issue                    | LOW      | ✅ COMPLETE (Jan 12-14, 2026) | 2h       | -                        |
| UX-012 | Fix Period Display Formatting                   | LOW      | ✅ COMPLETE (Jan 12-14, 2026) | 2h       | -                        |
| UX-013 | Fix Mirrored Elements Issue                     | LOW      | ✅ COMPLETE (Jan 12-14, 2026) | 2h       | -                        |
| UX-015 | Add Confirmation Dialogs for 14 Delete Actions  | MEDIUM   | ✅ COMPLETE (Jan 12-14, 2026) | 8h       | `docs/prompts/UX-015.md` |
| UX-016 | Replace window.alert() with Toast Notifications | LOW      | ✅ COMPLETE (Jan 12-14, 2026) | 2h       | `docs/prompts/UX-016.md` |
| UX-017 | Fix Broken Delete Subcategory Button Handler    | HIGH     | ✅ COMPLETE (Jan 12-14, 2026) | 1h       | `docs/prompts/UX-017.md` |

---

### Stability Tasks (P1)

| Task   | Description                                | Priority | Status                        | Prompt                   |
| ------ | ------------------------------------------ | -------- | ----------------------------- | ------------------------ |
| ST-025 | Add Error Boundaries to Critical Pages     | HIGH     | ✅ COMPLETE                   | `docs/prompts/ST-025.md` |
| ST-026 | Implement Concurrent Edit Detection        | HIGH     | ✅ COMPLETE (Jan 12-14, 2026) | `docs/prompts/ST-026.md` |
| ST-010 | Implement Caching Layer (Permission Cache) | MEDIUM   | ✅ COMPLETE                   | `docs/prompts/ST-010.md` |
| ST-024 | Permission Caching in Service              | LOW      | ✅ COMPLETE                   | `docs/prompts/ST-024.md` |

---

### UX Tasks (P1)

| Task   | Description                           | Priority | Status      | Prompt |
| ------ | ------------------------------------- | -------- | ----------- | ------ |
| UX-001 | Implement Form Dirty State Protection | MEDIUM   | ✅ COMPLETE | -      |
| UX-003 | Fix Mobile Kanban Overflow            | MEDIUM   | ✅ COMPLETE | -      |
| UX-006 | Add Error Recovery UI with Retry      | MEDIUM   | ✅ COMPLETE | -      |

---

### Feature Tasks (P2)

| Task        | Description                                          | Priority | Status                                                              | Prompt |
| ----------- | ---------------------------------------------------- | -------- | ------------------------------------------------------------------- | ------ |
| FEAT-001    | Client Form Field Updates                            | MEDIUM   | ✅ COMPLETE (already implemented)                                   | -      |
| FEAT-002    | Tag System Revamp for Clients and Products           | MEDIUM   | ✅ COMPLETE (already implemented)                                   | -      |
| FEAT-003    | Order Creator Quick Add Quantity Field               | MEDIUM   | ✅ COMPLETE (already implemented)                                   | -      |
| FEAT-004    | Add Dollar Amount Discount Option                    | MEDIUM   | ✅ COMPLETE (already implemented)                                   | -      |
| FEAT-005    | Merge Draft and Quote Workflows                      | MEDIUM   | ⊘ REMOVED (not needed - current Quote/Sale workflow is intentional) | -      |
| FEAT-006    | Show Product Name Instead of SKU in Order Creator    | MEDIUM   | ✅ COMPLETE (already implemented)                                   | -      |
| FEAT-007    | Add Payment Recording Against Invoices               | HIGH     | ✅ COMPLETE (already implemented)                                   | -      |
| FEAT-008    | Invoice Editing from Order View                      | MEDIUM   | ✅ COMPLETE (already implemented)                                   | -      |
| FEAT-009    | Add Product Subcategories (Smalls, Trim, etc.)       | MEDIUM   | ✅ COMPLETE (already implemented)                                   | -      |
| FEAT-010    | Default Warehouse Selection                          | MEDIUM   | ✅ COMPLETE (already implemented)                                   | -      |
| FEAT-011    | COGS Logic and Sales Flow Integration                | HIGH     | ✅ COMPLETE (already implemented)                                   | -      |
| FEAT-012    | Make Grade Field Optional/Customizable               | LOW      | ✅ COMPLETE (already implemented)                                   | -      |
| FEAT-013    | Add Packaged Unit Type for Products                  | LOW      | ✅ COMPLETE (already implemented)                                   | -      |
| FEAT-014    | Remove Expected Delivery from Purchases              | LOW      | ✅ COMPLETE (already implemented)                                   | -      |
| FEAT-015    | Finance Status Customization                         | LOW      | ✅ COMPLETE (already implemented)                                   | -      |
| FEAT-016    | Rename Credits to Credit Settings                    | LOW      | ✅ COMPLETE                                                         | -      |
| FEAT-017    | Feature Flags Direct Access                          | LOW      | ✅ COMPLETE (already implemented)                                   | -      |
| FEAT-018    | Remove Development-Only Features from User-Facing UI | LOW      | ✅ COMPLETE (already implemented)                                   | -      |
| FEAT-019    | VIP Status and Tiers Implementation                  | MEDIUM   | ✅ COMPLETE (already implemented)                                   | -      |
| FEAT-020    | Product Subcategory and Strain Matching              | MEDIUM   | ✅ COMPLETE (already implemented)                                   | -      |
| FEAT-021    | Settings Changes Apply to Entire Team                | MEDIUM   | ✅ COMPLETE (already implemented)                                   | -      |
| FEAT-022    | Show Role Names Instead of Count in Permissions      | LOW      | ✅ COMPLETE (already implemented)                                   | -      |
| FEAT-023    | Notification Preferences - System vs User Level      | MEDIUM   | ✅ COMPLETE (already implemented)                                   | -      |
| FEAT-024    | Inline Notifications Without Page Navigation         | MEDIUM   | ✅ COMPLETE (already implemented)                                   | -      |
| FEATURE-003 | Live Shopping & Price Negotiation System             | MEDIUM   | ✅ COMPLETE (already implemented)                                   | -      |

---

### Video Testing Session Tasks (Jan 7, 2026)

| Task   | Description                                    | Priority | Status      |
| ------ | ---------------------------------------------- | -------- | ----------- |
| UX-009 | Fix Sidebar Slide Animation                    | LOW      | ✅ COMPLETE |
| UX-010 | Clarify My Account vs User Settings Navigation | LOW      | ✅ COMPLETE |
| UX-011 | Fix Two Export Buttons Issue                   | LOW      | ✅ COMPLETE |
| UX-012 | Fix Period Display Formatting                  | LOW      | ✅ COMPLETE |
| UX-013 | Fix Mirrored Elements Issue                    | LOW      | ✅ COMPLETE |
| UX-014 | Make Optional Fields Clear                     | LOW      | ✅ COMPLETE |

---

### Infrastructure Tasks (P2)

| Task        | Description                                 | Priority | Status                                                 | Prompt |
| ----------- | ------------------------------------------- | -------- | ------------------------------------------------------ | ------ |
| INFRA-004   | Implement Deployment Monitoring Enforcement | MEDIUM   | ✅ COMPLETE (already implemented)                      | -      |
| INFRA-007   | Update Swarm Manager                        | LOW      | ✅ COMPLETE (audit verified)                           | -      |
| INFRA-012   | Deploy TERP Commander Slack Bot             | LOW      | ⊘ REMOVED (not needed - optional enhancement, not MVP) | -      |
| CLEANUP-001 | Remove LLM/AI from Codebase                 | LOW      | ✅ COMPLETE (already implemented)                      | -      |

---

### Quality Tasks (P2)

| Task        | Description                                    | Priority | Status                                | Prompt |
| ----------- | ---------------------------------------------- | -------- | ------------------------------------- | ------ |
| QUAL-003    | Complete Critical TODOs                        | MEDIUM   | ✅ COMPLETE (no critical TODOs found) | -      |
| QUAL-004    | Review Referential Integrity (CASCADE Deletes) | HIGH     | ✅ COMPLETE                           | -      |
| QUAL-007    | Final TODO Audit & Documentation               | MEDIUM   | ✅ COMPLETE                           | -      |
| ROADMAP-001 | Process Consolidated Roadmap Update Report     | LOW      | ✅ COMPLETE (report processed)        | -      |

---

### Improvement Tasks (P3)

| Task             | Description                      | Priority | Status      |
| ---------------- | -------------------------------- | -------- | ----------- |
| IMPROVE-001      | Fix Backup Script Security       | MEDIUM   | ✅ COMPLETE |
| IMPROVE-002      | Enhance Health Check Endpoints   | MEDIUM   | ✅ COMPLETE |
| IMPROVE-003      | Add Composite Database Indexes   | MEDIUM   | ✅ COMPLETE |
| IMPROVE-004      | Reduce Rate Limiting Thresholds  | LOW      | ✅ COMPLETE |
| QA-200           | Consolidated QA synthesis report | LOW      | ✅ COMPLETE |
| DOCS-001         | QA run sheet summary cleanup     | LOW      | ✅ COMPLETE |
| DOCS-UX-STRATEGY | Atomic UX strategy package       | LOW      | ✅ COMPLETE |
| DOCS-UX-REDHAT   | Redhat QA update to UX strategy  | LOW      | ✅ COMPLETE |

---

### Inventory Consistency QA Findings (P1/P2) - Added Jan 23, 2026

> Discovered during RedHat-grade QA audit of inventory consistency fixes.
> **Session:** `claude/fix-inventory-consistency-zi8sv` (Jan 23, 2026)
> **Commits:** INV-CONSISTENCY-001, INV-CONSISTENCY-002
> **Status:** Code changes SHIPPED, follow-up tasks identified

#### Completed Work (Jan 23, 2026)

| Task                | Description                                     | Status      | Commit  |
| ------------------- | ----------------------------------------------- | ----------- | ------- |
| INV-CONSISTENCY-001 | Dashboard stats only count sellable inventory   | ✅ COMPLETE | aea9660 |
| INV-CONSISTENCY-002 | Show all inventory with qty > 0, include status | ✅ COMPLETE | ad9b0c4 |

**INV-CONSISTENCY-001 Fix:**

- Added `SELLABLE_BATCH_STATUSES` constant (`["LIVE", "PHOTOGRAPHY_COMPLETE"]`)
- Updated `getDashboardStats()` to only count sellable inventory for totals
- Status counts still show ALL statuses for visibility
- Updated `getAgingSummary` to use same filter

**INV-CONSISTENCY-002 Fix:**

- Sales sheet inventory now shows ALL items with qty > 0 (not just LIVE/PHOTOGRAPHY_COMPLETE)
- Added `status` field to `PricedInventoryItem` interface for frontend filtering
- Frontend can filter by status; all inventory visible to sales reps

#### Follow-up Tasks (P1/P2)

| Task    | Description                                                  | Priority | Status | Estimate | Prompt                    |
| ------- | ------------------------------------------------------------ | -------- | ------ | -------- | ------------------------- |
| INV-010 | Verify frontend displays status field for non-sellable items | HIGH     | ready  | 4h       | `docs/prompts/INV-010.md` |
| INV-011 | Refactor hardcoded batch status strings (348 occurrences)    | MEDIUM   | ready  | 8h       | `docs/prompts/INV-011.md` |
| INV-012 | Add integration tests for dashboard/sales consistency        | MEDIUM   | ready  | 4h       | `docs/prompts/INV-012.md` |
| INV-013 | Improve getDashboardStats test mocks (fragile call-order)    | LOW      | ready  | 4h       | `docs/prompts/INV-013.md` |

##### INV-010: Verify Frontend Status Display for Non-Sellable Items

**Status:** ready
**Priority:** HIGH
**Estimate:** 4h
**Module:** `client/src/components/sales-sheet/`, `client/src/pages/`
**Dependencies:** INV-CONSISTENCY-002 (complete)
**Prompt:** `docs/prompts/INV-010.md`

**Problem:**
Sales sheet inventory now shows QUARANTINED, ON_HOLD, and AWAITING_INTAKE batches with qty > 0. These items cannot actually be sold but may confuse sales reps if not visually distinguished.

**Objectives:**

1. Verify frontend sales sheet components render status field
2. Add visual distinction (badge/color) for non-sellable statuses
3. Ensure order creation validates batch status before submission

**Deliverables:**

- [ ] Audit sales sheet components for status display
- [ ] Add status badge to inventory items in sales view
- [ ] Add warning/disabled state for non-sellable items
- [ ] Update order creation to validate batch status
- [ ] Manual E2E verification with QA sales manager account

##### INV-011: Refactor Hardcoded Batch Status Strings

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 8h
**Module:** `server/**/*.ts` (30+ files)
**Dependencies:** None
**Prompt:** `docs/prompts/INV-011.md`

**Problem:**
348 hardcoded batch status strings across 59 files create inconsistency risk. The `SELLABLE_BATCH_STATUSES` constant was created but not adopted everywhere.

**Objectives:**

1. Identify all hardcoded batch status usage patterns
2. Create appropriate constants for each pattern (sellable, active, all)
3. Refactor files to use shared constants

**Deliverables:**

- [ ] Audit complete - categorize all 348 occurrences
- [ ] Create `ACTIVE_BATCH_STATUSES` constant if needed
- [ ] Refactor server files to use constants
- [ ] Update tests to use constants
- [ ] Add ESLint rule to prevent new hardcoded strings

##### INV-012: Add Dashboard/Sales Consistency Integration Tests

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 4h
**Module:** `tests/integration/`
**Dependencies:** INV-CONSISTENCY-001, INV-CONSISTENCY-002
**Prompt:** `docs/prompts/INV-012.md`

**Problem:**
No integration test verifies that dashboard inventory metrics match sales module inventory counts. This was the original bug that caused the inconsistency.

**Objectives:**

1. Create integration test for dashboard/sales data consistency
2. Test that LIVE + PHOTOGRAPHY_COMPLETE counts match
3. Test that non-sellable items are excluded from dashboard totals

**Deliverables:**

- [ ] Integration test: dashboard total = sum of sellable inventory
- [ ] Integration test: sales sheet shows all qty > 0 items
- [ ] Integration test: aging widget only shows sellable batches
- [ ] Test fixtures with mixed batch statuses
- [ ] Add to CI pipeline

##### INV-013: Improve getDashboardStats Test Mocks

**Status:** ready
**Priority:** LOW
**Estimate:** 4h
**Module:** `server/inventoryDb.test.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/INV-013.md`

**Problem:**
Current test mocks use fragile call-order tracking (`queryCount++`) that breaks if query order changes. Tests verify mock behavior rather than business logic.

**Objectives:**

1. Refactor test mocks to use proper mock factory pattern
2. Remove call-order dependency
3. Make tests more maintainable

**Deliverables:**

- [ ] Create mock factory for getDashboardStats queries
- [ ] Remove `queryCount` tracking in favor of query-type detection
- [ ] Verify tests still cover all business logic branches
- [ ] Add comments explaining mock structure
- [ ] Consider recommending integration tests for complex queries

---

### Unit Test Infrastructure Issues (P0/P1) - Added Jan 23, 2026

> Discovered during comprehensive test failure analysis.
> **Root Cause Analysis:** Test suite shows 137 failed / 1928 passed (89% pass rate).
> **Session:** `claude/fix-inventory-display-tu3S3` (Jan 23, 2026)

| Task          | Description                                        | Priority | Status      | Root Cause  | Est. Impact |
| ------------- | -------------------------------------------------- | -------- | ----------- | ----------- | ----------- |
| TEST-INFRA-01 | Fix DOM/jsdom test container setup                 | P0       | NOT STARTED | RC-TEST-001 | ~45 tests   |
| TEST-INFRA-02 | Configure DATABASE_URL for test environment        | P0       | NOT STARTED | RC-TEST-002 | ~28 tests   |
| TEST-INFRA-03 | Fix TRPC router initialization in tests            | P0       | NOT STARTED | RC-TEST-003 | ~16 tests   |
| TEST-INFRA-04 | Create comprehensive test fixtures/factories       | P1       | NOT STARTED | RC-TEST-004 | ~30 tests   |
| TEST-INFRA-05 | Fix async element detection (findBy vs getBy)      | P1       | NOT STARTED | RC-TEST-005 | ~12 tests   |
| TEST-INFRA-06 | Fix admin endpoint security test (publicProcedure) | P2       | NOT STARTED | SEC-AUDIT   | ~1 test     |

#### Root Cause Analysis

**RC-TEST-001: DOM Container Infrastructure**

- Error: `Target container is not a DOM element`
- Affected: `useExport.test.ts`, `usePrint.test.ts`, `ConflictDialog.test.tsx`, `ProductsPage.test.tsx`
- Fix: Configure jsdom container creation in vitest setup

**RC-TEST-002: Database Connection Missing**

- Error: `Database connection failed - cannot start server without database`
- Affected: `creditsDb.race-condition.test.ts`, `optimisticLocking.test.ts`, `inventoryDb.test.ts`
- Fix: Set DATABASE_URL environment variable or mock database adapter

**RC-TEST-003: TRPC Router Not Initialized**

- Error: `No procedure found on path "settings,locations,getAll"`
- Affected: `auth-bypass.test.ts`, `clients.test.ts`, `inventory.test.ts`
- Fix: Setup TRPC test client with proper router initialization

**RC-TEST-004: Incomplete Test Fixtures**

- Error: `Cannot read properties of undefined (reading 'invoices')`
- Affected: `calendarFinancials.test.ts`, `accounting.test.ts`, `analytics.test.ts`
- Fix: Create factory functions for complete test data

**RC-TEST-005: Async Timing Issues**

- Error: `Unable to find an element with the text`
- Affected: `ProductsPage.test.tsx`, `SampleManagement.test.tsx`
- Fix: Use `findByText`/`waitFor` instead of `getByText`

---

### E2E Testing Infrastructure (P1) - Added Jan 16, 2026

> Discovered during comprehensive E2E test execution against production.
> **COMPLETED Jan 16, 2026** - All 3 tasks executed successfully.
> Final E2E pass rate: **88.5%** (54/61 core tests passed)
> Total E2E tests available: **338 tests** across 44 spec files

| Task    | Description                                               | Priority | Status      | Estimate | Prompt                    |
| ------- | --------------------------------------------------------- | -------- | ----------- | -------- | ------------------------- |
| E2E-001 | Fix Authentication Test Credentials for E2E Testing       | HIGH     | ✅ COMPLETE | 8h       | `docs/prompts/E2E-001.md` |
| E2E-002 | Update Orders Page UI Selectors for E2E Tests             | MEDIUM   | ✅ COMPLETE | 4h       | `docs/prompts/E2E-002.md` |
| E2E-003 | Execute Full Playwright E2E Test Suite Against Production | HIGH     | ✅ COMPLETE | 16h      | `docs/prompts/E2E-003.md` |

#### E2E-001: Fix Authentication Test Credentials for E2E Testing

**Status:** ✅ COMPLETE (Jan 16, 2026)
**Priority:** HIGH
**Estimate:** 8h
**Module:** `tests-e2e/fixtures/auth.ts`, `server/routers/auth.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/E2E-001.md`

**Problem:**
E2E tests use hardcoded test credentials (`admin@terp.test` / `admin123`) that do not work against production. The production app uses OAuth/OpenID authentication, not password-based auth. This prevents automated E2E testing against production.

**Objectives:**

1. Enable E2E tests to authenticate successfully against production
2. Integrate with existing QA Auth system (`/api/qa-auth/login`)
3. Ensure no security vulnerabilities are introduced

**Deliverables:**

- [ ] Updated `tests-e2e/fixtures/auth.ts` to use QA Auth endpoints
- [ ] All 10 auth tests pass against production
- [ ] Environment variable configuration for test credentials
- [ ] Documentation for E2E auth setup
- [ ] No security regressions verified

---

#### E2E-002: Update Orders Page UI Selectors for E2E Tests

**Status:** ✅ COMPLETE (Jan 16, 2026)
**Priority:** MEDIUM
**Estimate:** 4h
**Module:** `tests-e2e/orders-crud.spec.ts`, `client/src/pages/orders/`
**Dependencies:** None
**Prompt:** `docs/prompts/E2E-002.md`

**Problem:**
E2E tests for the Orders page fail because UI selectors expect a standard `<table>` element, but the Orders page uses a different component structure. The database contains 400 orders, but E2E tests report "Table not found".

**Objectives:**

1. Identify actual UI component structure on Orders page
2. Update E2E test selectors to match actual components
3. Add data-testid attributes where needed

**Deliverables:**

- [ ] Updated selectors in `tests-e2e/orders-crud.spec.ts`
- [ ] data-testid attributes added to Orders components
- [ ] All 11 orders-crud tests pass
- [ ] Order count verification works correctly
- [ ] Documentation updated

---

#### E2E-003: Execute Full Playwright E2E Test Suite Against Production

**Status:** ✅ COMPLETE (Jan 16, 2026)
**Priority:** HIGH
**Estimate:** 16h
**Module:** `tests-e2e/`, `playwright.config.ts`
**Dependencies:** E2E-001, E2E-002
**Prompt:** `docs/prompts/E2E-003.md`

**Problem:**
The repository contains 338 E2E tests but only a subset have been run against production. A full test execution is needed to identify all failures and establish a baseline pass rate.

**Objectives:**

1. Execute all 338 E2E tests against production
2. Document all failures with root cause analysis
3. Establish baseline pass rate for CI/CD

**Deliverables:**

- [ ] All 338 tests executed against production
- [ ] Comprehensive test report at `qa-results/E2E_FULL_SUITE_REPORT.md`
- [ ] All failures documented with root cause
- [ ] CI pipeline updated with E2E test job
- [ ] Baseline pass rate established and tracked

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

### Navigation Accessibility Enhancement (P1) - Added Jan 20, 2026

> Discovered during comprehensive accessibility audit of TERP navigation.
> **Goal:** Surface 8 hidden high-value routes in sidebar navigation and Command Palette.
> **Spec:** `docs/specs/NAV_ACCESSIBILITY_ENHANCEMENT_SPEC.md`
> **Effort:** ~1.5 hours (2 file changes, configuration only)

| Task    | Description                                    | Priority | Status | Estimate | Module             |
| ------- | ---------------------------------------------- | -------- | ------ | -------- | ------------------ |
| NAV-006 | Add Leaderboard to Sales nav (after Dashboard) | MEDIUM   | ready  | 5 min    | navigation.ts      |
| NAV-007 | Add Client Needs to Sales nav                  | MEDIUM   | ready  | 5 min    | navigation.ts      |
| NAV-008 | Add Matchmaking to Sales nav                   | MEDIUM   | ready  | 5 min    | navigation.ts      |
| NAV-009 | Add Quotes to Sales nav                        | MEDIUM   | ready  | 5 min    | navigation.ts      |
| NAV-010 | Add Returns to Sales nav                       | MEDIUM   | ready  | 5 min    | navigation.ts      |
| NAV-011 | Add Vendor Supply to Inventory nav             | MEDIUM   | ready  | 5 min    | navigation.ts      |
| NAV-012 | Add Pricing Rules to Finance nav               | MEDIUM   | ready  | 5 min    | navigation.ts      |
| NAV-013 | Add Workflow Queue to Admin nav                | MEDIUM   | ready  | 5 min    | navigation.ts      |
| NAV-014 | Add all 8 routes to Command Palette            | MEDIUM   | ready  | 15 min   | CommandPalette.tsx |
| NAV-015 | Verify TypeScript compilation                  | LOW      | ready  | 5 min    | -                  |
| NAV-016 | Manual QA verification of all new nav items    | LOW      | ready  | 15 min   | -                  |

#### NAV-006: Add Leaderboard to Sales Navigation

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 5 min
**Module:** `client/src/config/navigation.ts`
**Dependencies:** None

**Implementation:**

```typescript
// After Dashboard entry, before Clients:
{
  name: "Leaderboard",
  path: "/leaderboard",
  icon: Trophy,
  group: "sales",
  ariaLabel: "View team performance and rankings",
},
```

---

#### NAV-007 through NAV-013: Additional Navigation Items

Each task adds one navigation item to `navigation.ts`:

| Task    | Route             | Group     | Icon         | Position              |
| ------- | ----------------- | --------- | ------------ | --------------------- |
| NAV-007 | `/needs`          | sales     | Target       | After Invoices        |
| NAV-008 | `/matchmaking`    | sales     | Sparkles     | After Client Needs    |
| NAV-009 | `/quotes`         | sales     | FileQuestion | After Matchmaking     |
| NAV-010 | `/returns`        | sales     | PackageX     | After Quotes          |
| NAV-011 | `/vendor-supply`  | inventory | PackagePlus  | After Vendors         |
| NAV-012 | `/pricing/rules`  | finance   | DollarSign   | After Credit Settings |
| NAV-013 | `/workflow-queue` | admin     | ListOrdered  | After Feature Flags   |

---

#### NAV-014: Add Routes to Command Palette

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 15 min
**Module:** `client/src/components/CommandPalette.tsx`
**Dependencies:** NAV-006 through NAV-013

**Implementation:**
Add 8 new navigation commands to the Navigation group in CommandPalette.tsx, using same icons as sidebar.

---

#### Post-Implementation Metrics

| Metric                | Before | After | Change |
| --------------------- | ------ | ----- | ------ |
| Navigation items      | 24     | 32    | +8     |
| Command Palette items | 11     | 19    | +8     |
| Hidden routes         | 14     | 6     | -8     |
| Sales group items     | 8      | 13    | +5     |
| Inventory group items | 7      | 8     | +1     |
| Finance group items   | 3      | 4     | +1     |
| Admin group items     | 6      | 7     | +1     |

---

### Incomplete Features Audit Tasks (P0-P2) - Added Jan 20, 2026

> Discovered during comprehensive RedHat QA audit of codebase.
> **Source:** `docs/INCOMPLETE_FEATURES_AUDIT_V2.md`
> **Full Task List:** `docs/roadmaps/INCOMPLETE_FEATURES_TASKS_2026-01-20.md`

#### P0 - Critical (Ship Blockers)

| Task    | Description                           | Priority | Status      | Estimate |
| ------- | ------------------------------------- | -------- | ----------- | -------- |
| SEC-023 | Rotate exposed database credentials   | CRITICAL | NOT STARTED | 2-4h     |
| TS-001  | Fix 117 TypeScript errors             | CRITICAL | NOT STARTED | 16-24h   |
| BUG-100 | Fix 122 failing tests (44 test files) | CRITICAL | NOT STARTED | 24-40h   |

#### P1 - High Priority (Data Seeding)

| Task     | Description                               | Priority | Status      | Estimate | Prompt                     |
| -------- | ----------------------------------------- | -------- | ----------- | -------- | -------------------------- |
| DATA-012 | Seed work surface feature flags (17+)     | HIGH     | NOT STARTED | 4h       | -                          |
| DATA-013 | Seed gamification module defaults         | HIGH     | NOT STARTED | 4-8h     | -                          |
| DATA-014 | Seed scheduling module defaults           | HIGH     | NOT STARTED | 4h       | -                          |
| DATA-015 | Seed storage sites and zones              | HIGH     | NOT STARTED | 2-4h     | -                          |
| DATA-021 | Seed mock product images for live catalog | HIGH     | NOT STARTED | 6h       | `docs/prompts/DATA-021.md` |

##### DATA-021: Seed Mock Product Images for Live Catalog Testing

**Status:** NOT STARTED
**Priority:** HIGH (P1)
**Estimate:** 6h
**Module:** `scripts/seed/seeders/`, `productMedia`, `productImages` tables
**Prompt:** `docs/prompts/DATA-021.md`

**Problem:**
Live catalog and VIP portal shipping features cannot be tested because products lack images. Currently shows placeholder emojis (🌿) instead of actual product images, blocking:

- Live catalog visual experience testing
- VIP portal shopping experience
- Stakeholder demos
- Image loading/error handling verification

**Image Sources (Free, Reliable):**

| Source          | Use Case          | URL Pattern                                                |
| --------------- | ----------------- | ---------------------------------------------------------- |
| Picsum Photos   | Default/fallback  | `https://picsum.photos/seed/{seed}/400/400`                |
| Unsplash Source | Category-specific | `https://source.unsplash.com/400x400/?{keywords}`          |
| PlaceHolder.com | Offline fallback  | `https://via.placeholder.com/400x400/{color}?text={label}` |

**Category Mapping (visually similar alternatives):**

| Category     | Keywords                            | Seed Prefix    |
| ------------ | ----------------------------------- | -------------- |
| Flower       | `nature,botanical,green,plant,herb` | `flower-`      |
| Concentrates | `amber,honey,gold,crystal`          | `concentrate-` |
| Edibles      | `candy,gummy,chocolate,treat`       | `edible-`      |
| PreRolls     | `paper,texture,natural,craft`       | `preroll-`     |
| Vapes        | `technology,device,modern,sleek`    | `vape-`        |

**Deliverables:**

- [ ] Enhanced `seed-product-media-v2.ts` with multi-source fallback
- [ ] New `seed-batch-images.ts` for batch-level images
- [ ] Combined `seed-all-images.ts` runner with --dry-run and --force options
- [ ] URL verification before insert
- [ ] ≥95% products with images, ≥90% batches with primary image
- [ ] Documentation updated

**Commands:**

```bash
npx tsx scripts/seed/seeders/seed-all-images.ts           # Full seeding
npx tsx scripts/seed/seeders/seed-all-images.ts --dry-run # Preview only
npx tsx scripts/seed/seeders/seed-all-images.ts --force   # Re-seed all
```

---

#### P1 - High Priority (Backend Completeness)

| Task      | Description                       | Priority | Status      | Estimate |
| --------- | --------------------------------- | -------- | ----------- | -------- |
| BE-QA-006 | Implement AR/AP summary endpoints | HIGH     | NOT STARTED | 8h       |
| BE-QA-007 | Implement cash expenses endpoints | HIGH     | NOT STARTED | 8h       |
| BE-QA-008 | Implement financial reports       | HIGH     | NOT STARTED | 16h      |
| QUAL-008  | Add feature flag checks to routes | HIGH     | NOT STARTED | 4h       |

#### P2 - Medium Priority (24 additional tasks)

See `docs/roadmaps/INCOMPLETE_FEATURES_TASKS_2026-01-20.md` for complete list including:

- 5 missing API endpoints (API-011 through API-015)
- 5 data seeding tasks (DATA-016 through DATA-020)
- 7 backend quality tasks (BE-QA-009 through BE-QA-015)
- 5 frontend quality tasks (FE-QA-004 through FE-QA-008)
- 1 feature task (FEAT-025: Recurring Orders)
- 2 infrastructure cleanup tasks (INFRA-015, INFRA-016)

**Total New Tasks:** 37 (3 P0, 8 P1, 24 P2, 2 P3)

---

### Deep Audit Additional Findings (P0-P3) - Added Jan 20, 2026

> Discovered during comprehensive git commit analysis (484 commits, Dec 20 - Jan 20).
> **Source:** `docs/reports/INCOMPLETE_FEATURES_AUDIT_JAN_2026.md`
> **Method:** Code analysis, not roadmap-derived (roadmap used only for validation)
> **Total Additional Tasks:** 22 (4 P0, 5 P1, 10 P2, 3 P3)

#### P0 - Critical (Work Surface Ship Blockers)

| Task     | Description                                     | Priority | Status      | Estimate | Module                             |
| -------- | ----------------------------------------------- | -------- | ----------- | -------- | ---------------------------------- |
| WSQA-001 | Fix InvoicesWorkSurface Payment Recording Stub  | CRITICAL | NOT STARTED | 4h       | InvoicesWorkSurface.tsx:717-724    |
| WSQA-002 | Implement Flexible Lot Selection                | CRITICAL | NOT STARTED | 8h       | InventoryWorkSurface.tsx           |
| WSQA-003 | Add RETURNED Order Status with Processing Paths | CRITICAL | NOT STARTED | 8h       | schema.ts, ordersDb.ts:1564        |
| ACC-001  | Fix Silent GL Posting Failures                  | CRITICAL | NOT STARTED | 8h       | accountingHooks.ts:173,224,274,323 |

##### WSQA-001: Fix InvoicesWorkSurface Payment Recording Stub

**Status:** NOT STARTED
**Priority:** CRITICAL (P0)
**Estimate:** 4h
**Module:** `client/src/components/work-surface/InvoicesWorkSurface.tsx`
**Line:** 717-724

**Problem:**
Payment recording mutation is a stub - shows success toast without actually persisting the payment. Users think payments are recorded but they are not saved to database.

**Objectives:**

1. Wire payment recording to actual mutation
2. Ensure payment persists to database
3. Update invoice balance after payment

**Deliverables:**

- [ ] Payment recording mutation connected to backend
- [ ] Payment reflected in invoice balance
- [ ] Audit trail entry created for payment
- [ ] Success/error handling with proper feedback

---

##### WSQA-002: Implement Flexible Lot Selection

**Status:** NOT STARTED
**Priority:** CRITICAL (P0)
**Estimate:** 8h
**Module:** `client/src/components/work-surface/InventoryWorkSurface.tsx`, `server/inventoryUtils.ts`

**Problem:**
Users cannot select specific batches when creating orders. System auto-allocates but doesn't allow manual lot selection, which is critical for regulated inventory management.

**Objectives:**

1. Add batch selection UI to order creation flow
2. Allow override of FIFO/LIFO allocation
3. Preserve selected batches through order lifecycle

**Deliverables:**

- [ ] Batch picker component added to order flow
- [ ] Backend supports explicit batch allocation
- [ ] Selection persists on order save
- [ ] Validation prevents over-allocation

---

##### WSQA-003: Add RETURNED Order Status with Processing Paths

**Status:** NOT STARTED
**Priority:** CRITICAL (P0)
**Estimate:** 8h
**Module:** `server/schema.ts`, `server/ordersDb.ts:1564-1570`

**Problem:**
Order status machine is incomplete - missing RETURNED status with required processing paths (restock to inventory vs return to vendor).

**Objectives:**

1. Add RETURNED status to order status enum
2. Implement restock-to-inventory path
3. Implement return-to-vendor path
4. Create inventory movements for returns

**Deliverables:**

- [ ] RETURNED status added to schema
- [ ] Status transition validation updated
- [ ] Restock flow creates inventory movements
- [ ] Return-to-vendor flow updates vendor records
- [ ] UI for selecting return disposition

---

##### ACC-001: Fix Silent GL Posting Failures

**Status:** NOT STARTED
**Priority:** CRITICAL (P0)
**Estimate:** 8h
**Module:** `server/accountingHooks.ts`
**Lines:** 173, 224, 274, 323

**Problem:**
GL posting failures are silently ignored. When standard accounts are not found, the system logs a warning but allows sales/payments/refunds to complete WITHOUT creating ledger entries. This causes financial records to be incomplete.

**Impact:** Sales may be recorded but accounting ledger remains empty.

**Objectives:**

1. Make GL posting failures throw errors
2. Implement transaction rollback on GL failure
3. Add alerting for missing standard accounts
4. Ensure all financial transactions have GL entries

**Deliverables:**

- [ ] `postSaleGLEntries` throws on missing accounts
- [ ] `postPaymentGLEntries` throws on missing accounts
- [ ] `postRefundGLEntries` throws on missing accounts
- [ ] `postCOGSGLEntries` throws on missing accounts
- [ ] Admin alert for missing standard accounts
- [ ] GL reconciliation report added

---

#### P1 - High Priority (Feature Completeness)

| Task     | Description                            | Priority | Status      | Estimate | Module                                         |
| -------- | -------------------------------------- | -------- | ----------- | -------- | ---------------------------------------------- |
| SSE-001  | Fix Live Shopping SSE Event Naming     | HIGH     | NOT STARTED | 2h       | sessionTimeoutService.ts, useLiveSessionSSE.ts |
| MEET-048 | Create Hour Tracking Frontend          | HIGH     | NOT STARTED | 16h      | client/src/pages/                              |
| WS-010A  | Integrate Photography Module into Page | HIGH     | NOT STARTED | 4h       | PhotographyPage.tsx                            |
| NAV-017  | Route CreditsPage in App.tsx           | HIGH     | NOT STARTED | 1h       | App.tsx                                        |
| API-016  | Implement Quote Email Sending          | HIGH     | NOT STARTED | 4h       | server/routers/quotes.ts:294                   |

##### SSE-001: Fix Live Shopping SSE Event Naming Mismatch

**Status:** NOT STARTED
**Priority:** HIGH (P1)
**Estimate:** 2h
**Module:** `server/services/live-shopping/sessionTimeoutService.ts`, `client/src/hooks/useLiveSessionSSE.ts:135-147`
**Related:** BE-QA-013 (same file, different issue - extension count validation at line 382)

**Problem:**
Backend emits `SESSION_TIMEOUT_WARNING` events but frontend listens for `TIMEOUT_WARNING`. Events are never received by the client.

**Deliverables:**

- [ ] Standardize event naming (prefer backend naming)
- [ ] Update frontend to match backend event names
- [ ] Verify timeout warnings display in VIP portal

---

##### MEET-048: Create Hour Tracking Frontend

**Status:** NOT STARTED
**Priority:** HIGH (P1)
**Estimate:** 16h
**Module:** `client/src/pages/`, `server/routers/hourTracking.ts`

**Problem:**
Hour tracking backend is fully implemented (clockIn, clockOut, startBreak, endBreak, listTimeEntries, createManualEntry, adjustTimeEntry, approveTimeEntry, getTimesheet, getHoursReport, getOvertimeReport) but there is no frontend UI.

**Deliverables:**

- [ ] HourTrackingPage.tsx created
- [ ] Clock in/out component
- [ ] Timesheet view component
- [ ] Time entry management UI
- [ ] Route added to App.tsx
- [ ] Navigation item added

---

##### WS-010A: Integrate Photography Module into PhotographyPage

**Status:** NOT STARTED
**Priority:** HIGH (P1)
**Estimate:** 4h
**Module:** `client/src/pages/PhotographyPage.tsx`, `client/src/components/inventory/PhotographyModule.tsx`
**Note:** WS-010 is marked ✅ COMPLETE in roadmap but this finding indicates it was prematurely closed.

**Problem:**
PhotographyModule component (689 lines) is fully built but never used. PhotographyPage only shows queue without upload capability. The module imports are declared (cropping, background removal) but not implemented.

**Deliverables:**

- [ ] PhotographyModule integrated into PhotographyPage
- [ ] Upload functionality working
- [ ] Presigned URLs implemented (`photos.getUploadUrl`)
- [ ] Photo approval workflow connected

---

##### NAV-017: Route CreditsPage in App.tsx

**Status:** NOT STARTED
**Priority:** HIGH (P1)
**Estimate:** 1h
**Module:** `client/src/App.tsx`, `client/src/pages/CreditsPage.tsx`

**Problem:**
CreditsPage is a complete page with issue/apply/void functionality. It's imported in App.tsx but NO ROUTE is defined - users cannot access this feature.

**Deliverables:**

- [ ] Route `/credits` added to App.tsx
- [ ] Navigation item added to sidebar
- [ ] Feature flag check added if needed

---

##### API-016: Implement Quote Email Sending

**Status:** NOT STARTED
**Priority:** HIGH (P1)
**Estimate:** 4h
**Module:** `server/routers/quotes.ts:294`

**Problem:**
`sendQuote` mutation has a TODO comment "Send email notification to client" but doesn't actually send emails. Quotes are marked as sent but no email is delivered.

**Deliverables:**

- [ ] Email sending implemented in sendQuote
- [ ] Quote PDF attachment generated
- [ ] Delivery status tracked
- [ ] Error handling for failed sends

---

#### P2 - Medium Priority (Feature Gaps & Quality)

| Task       | Description                                   | Priority | Status      | Estimate | Module                         |
| ---------- | --------------------------------------------- | -------- | ----------- | -------- | ------------------------------ |
| FE-QA-009  | Enable VendorSupplyPage Creation              | MEDIUM   | NOT STARTED | 8h       | VendorSupplyPage.tsx:96        |
| FE-QA-010  | Wire MatchmakingServicePage Action Buttons    | MEDIUM   | NOT STARTED | 4h       | MatchmakingServicePage.tsx     |
| API-017    | Implement Stock Threshold Configuration       | MEDIUM   | NOT STARTED | 4h       | alerts.ts:379-398              |
| DATA-021   | Add Calendar Recurring Events Schema          | MEDIUM   | NOT STARTED | 4h       | seed-calendar-test-data.ts:201 |
| DEPR-001   | Migrate Deprecated Vendor Router Usages       | MEDIUM   | NOT STARTED | 8h       | vendors.ts, multiple callers   |
| SCHEMA-001 | Fix products.name vs nameCanonical Mismatch   | MEDIUM   | NOT STARTED | 4h       | storage.ts:1076                |
| SCHEMA-002 | Document batches.quantity vs onHandQty        | MEDIUM   | NOT STARTED | 2h       | photography.ts, analytics.ts   |
| SCHEMA-003 | Add clients.tier and clients.isActive Columns | MEDIUM   | NOT STARTED | 4h       | referrals.ts, alerts.ts        |
| BUG-101    | Fix Property Test Bugs (PROP-BUG-001/002/003) | MEDIUM   | NOT STARTED | 4h       | property tests                 |
| MOB-001    | Address Mobile Responsiveness Issues (38)     | MEDIUM   | NOT STARTED | 24h      | Multiple components            |
| FE-QA-011  | Integrate Unused Dashboard Widgets (5)        | MEDIUM   | NOT STARTED | 8h       | widgets-v2/                    |

##### FE-QA-009: Enable VendorSupplyPage Creation

**Status:** NOT STARTED
**Priority:** MEDIUM (P2)
**Estimate:** 8h
**Module:** `client/src/pages/VendorSupplyPage.tsx:96`

**Problem:**
"Add Supply" button shows "Feature In Development" alert. Supply creation form, edit functionality, and "Find Matching Clients" button are all missing.

**Deliverables:**

- [ ] Supply creation form implemented
- [ ] Edit functionality added
- [ ] "Find Matching Clients" button connected to matchmaking
- [ ] Development alert removed

---

##### FE-QA-010: Wire MatchmakingServicePage Action Buttons

**Status:** NOT STARTED
**Priority:** MEDIUM (P2)
**Estimate:** 4h
**Module:** `client/src/pages/MatchmakingServicePage.tsx`

**Problem:**
Four action buttons have no implementation:

- "View Buyers" button (line 385) - no handler
- "Reserve" button (line 388) - no handler
- "Create Quote" button (line 456) - may not connect to workflow
- "Dismiss" button (line 459) - no dismissal logic

**Deliverables:**

- [ ] View Buyers opens buyer list modal
- [ ] Reserve creates reservation record
- [ ] Create Quote navigates to quote creator with pre-filled data
- [ ] Dismiss marks match as dismissed with reason

---

##### FE-QA-011: Integrate Unused Dashboard Widgets

**Status:** NOT STARTED
**Priority:** MEDIUM (P2)
**Estimate:** 8h
**Module:** `client/src/components/dashboard/widgets-v2/`
**Note:** FE-QA-004 (V3 Migration) is about migrating widgets, not integrating these V2 widgets.

**Problem:**
5 fully-built dashboard widgets are exported but never used in any dashboard:

- CashCollectedLeaderboard
- ClientDebtLeaderboard
- ClientProfitMarginLeaderboard
- TopStrainFamiliesWidget
- SmartOpportunitiesWidget

**Deliverables:**

- [ ] Determine if widgets should be integrated into DashboardV3 or deprecated
- [ ] If integrating: Add to dashboard widget registry
- [ ] If deprecating: Remove unused code and exports
- [ ] Update dashboard documentation

---

##### API-017: Implement Stock Threshold Configuration

**Status:** NOT STARTED
**Priority:** MEDIUM (P2)
**Estimate:** 4h
**Module:** `server/routers/alerts.ts:379-398`

**Problem:**
`setThresholds` mutation throws "not yet available - requires schema migration". The `minStockLevel` and `targetStockLevel` columns are missing from schema.

**Deliverables:**

- [ ] Schema migration adding threshold columns
- [ ] setThresholds mutation working
- [ ] Low stock alerts using configurable thresholds
- [ ] UI for threshold configuration

---

##### SCHEMA-001: Fix products.name vs nameCanonical Mismatch

**Status:** NOT STARTED
**Priority:** MEDIUM (P2)
**Estimate:** 4h
**Module:** `server/storage.ts:1076`

**Problem:**
Code references `products.name` but actual column is `products.nameCanonical`. This is an active bug from December 31, 2025 migration - Drizzle schema was NOT updated.

**Deliverables:**

- [ ] Schema updated to match actual database
- [ ] All code references fixed
- [ ] Migration script if needed

---

#### P3 - Low Priority (Cleanup & Technical Debt)

| Task          | Description                                   | Priority | Status      | Estimate | Module            |
| ------------- | --------------------------------------------- | -------- | ----------- | -------- | ----------------- |
| ABANDONED-001 | Remove Unused RTL/i18n Utilities              | LOW      | NOT STARTED | 1h       | rtlUtils.ts       |
| DEPR-002      | Remove Deprecated PO Procedures (3)           | LOW      | NOT STARTED | 2h       | purchaseOrders.ts |
| QUAL-009      | Replace console.error with Logger (23+ files) | LOW      | NOT STARTED | 8h       | Multiple files    |

##### ABANDONED-001: Remove Unused RTL/i18n Utilities

**Status:** NOT STARTED
**Priority:** LOW (P3)
**Estimate:** 1h
**Module:** `client/src/lib/rtlUtils.ts`

**Problem:**
11 utility functions exported (`isRTL`, `getDirection`, `getDirectionalIconClasses`, etc.) but 0 usages anywhere in codebase. Right-to-left language support was planned but never implemented.

**Deliverables:**

- [ ] rtlUtils.ts removed
- [ ] No breaking changes verified
- [ ] Documentation updated if RTL was mentioned

---

**Summary: Deep Audit Additional Tasks**

| Priority  | Count  | Description                                 |
| --------- | ------ | ------------------------------------------- |
| P0        | 4      | Work surface blockers + GL posting          |
| P1        | 5      | Feature completeness gaps                   |
| P2        | 11     | Feature gaps, schema fixes, mobile, widgets |
| P3        | 3      | Cleanup and technical debt                  |
| **TOTAL** | **23** |                                             |

> **QA Note (Jan 20, 2026):** All tasks verified as non-duplicates after skeptical review.
> Cross-references added where tasks touch same files (SSE-001/BE-QA-013).

---

### Second-Pass Security Audit Findings (P0-P2) - Added Jan 21, 2026

> Discovered during comprehensive second-pass security audit of last 36 hours of work.
> **Source:** `docs/qa/SECOND_PASS_SECURITY_AUDIT_2026-01-21.md`
> **Method:** Build verification, test execution, code analysis, contract drift detection
> **Verification:** TypeScript ✅ Build ✅ Tests 1949/2065 pass
> **Total Tasks:** 11 (1 P0, 4 P1, 6 P2)

#### P0 - Critical (Silent Failure)

| Task     | Description                                        | Priority | Status      | Estimate | Module                               |
| -------- | -------------------------------------------------- | -------- | ----------- | -------- | ------------------------------------ |
| PERF-001 | Fix Empty Catch Blocks in usePerformanceMonitor.ts | CRITICAL | NOT STARTED | 15 min   | usePerformanceMonitor.ts:375,387,403 |

##### PERF-001: Fix Empty Catch Blocks in usePerformanceMonitor.ts

**Status:** NOT STARTED
**Priority:** CRITICAL (P0)
**Estimate:** 15 min
**Module:** `client/src/hooks/work-surface/usePerformanceMonitor.ts`
**Lines:** 375, 387, 403

**Problem:**
Three empty catch blocks silently swallow Performance Observer errors. Production monitoring may silently fail without any indication, hiding browser compatibility issues and preventing debugging.

```typescript
// Lines 373-375
} catch (e) {}  // LCP observer - SILENT FAILURE
// Lines 385-387
} catch (e) {}  // FID observer - SILENT FAILURE
// Lines 401-403
} catch (e) {}  // CLS observer - SILENT FAILURE
```

**Objectives:**

1. Add debug logging to catch blocks
2. Ensure monitoring failures are visible in dev tools
3. Prevent silent failures in production

**Deliverables:**

- [ ] Add `console.debug('[WebVitals] Observer not supported:', e)` to all 3 catch blocks
- [ ] Verify in browser that errors are logged when observers fail
- [ ] No functional changes to monitoring behavior

---

#### P1 - High Priority (Test Infrastructure + Feature Gaps)

| Task        | Description                                       | Priority | Status      | Estimate | Module                                  |
| ----------- | ------------------------------------------------- | -------- | ----------- | -------- | --------------------------------------- |
| TEST-QA-001 | Fix React Hook Test Infrastructure (JSDOM Setup)  | HIGH     | NOT STARTED | 2h       | hooks/work-surface/**tests**/\*.test.ts |
| LIVE-001    | Implement or Remove Live Shopping Session Console | HIGH     | NOT STARTED | 4h       | LiveShoppingPage.tsx:410                |
| DI-009      | Add Vendor ID Validation in Return Processing     | HIGH     | NOT STARTED | 30 min   | returnProcessing.ts:135-140             |
| SEC-024     | Validate Quote Email XSS Prevention               | HIGH     | NOT STARTED | 1h       | emailService.ts (viewUrl escaping)      |

##### TEST-QA-001: Fix React Hook Test Infrastructure

**Status:** NOT STARTED
**Priority:** HIGH (P1)
**Estimate:** 2h
**Module:** `client/src/hooks/work-surface/__tests__/*.test.ts`

**Problem:**
14+ tests fail with "Target container is not a DOM element" error. useExport and usePrint tests cannot run, blocking CI/CD verification of Work Surface hooks.

**Objectives:**

1. Add proper DOM setup in test files
2. Configure JSDOM environment correctly
3. Ensure all hook tests pass

**Deliverables:**

- [ ] Fix JSDOM configuration in vitest setup
- [ ] All useExport tests pass (currently 10 failing)
- [ ] All usePrint tests pass (currently 4 failing)
- [ ] CI pipeline green for hook tests

---

##### LIVE-001: Implement or Remove Live Shopping Session Console

**Status:** NOT STARTED
**Priority:** HIGH (P1)
**Estimate:** 4h
**Module:** `client/src/pages/LiveShoppingPage.tsx:410`

**Problem:**
TODO comment indicates session console/detail view is unimplemented. Feature appears complete in UI but clicking session row triggers no action - creates user dead-end.

**Objectives:**

1. Either implement session detail view OR
2. Remove/disable the UI control that suggests this feature exists

**Deliverables:**

- [ ] Session row click navigates to detail view, OR
- [ ] Session row click disabled with appropriate styling
- [ ] No user-facing dead-ends

---

##### DI-009: Add Vendor ID Validation in Return Processing

**Status:** NOT STARTED
**Priority:** HIGH (P1)
**Estimate:** 30 min
**Module:** `server/services/returnProcessing.ts:135-140`

**Problem:**
`processVendorReturn` accepts vendorId without validating it exists in the database. Can create orphan vendor return records with invalid vendorId, causing referential integrity issues.

**Objectives:**

1. Validate vendorId exists before creating vendor return
2. Throw appropriate error if vendor not found

**Deliverables:**

- [ ] Add vendor existence check at start of `processVendorReturn`
- [ ] Throw TRPCError NOT_FOUND if vendor doesn't exist
- [ ] Add unit test for invalid vendorId case

---

##### SEC-024: Validate Quote Email XSS Prevention

**Status:** NOT STARTED
**Priority:** HIGH (P1)
**Estimate:** 1h
**Module:** `server/services/emailService.ts`

**Problem:**
Hypothesis: `viewUrl` in email template may not be fully escaped. If viewUrl contains `javascript:` protocol, it could execute on click.

**Objectives:**

1. Audit email template for XSS vectors
2. Ensure all user input is properly escaped
3. Add test for XSS prevention

**Deliverables:**

- [ ] Audit `sendQuoteEmail` template for XSS vectors
- [ ] Add URL protocol validation (only allow http/https)
- [ ] Add unit test with `javascript:alert(1)` as viewUrl
- [ ] Verify email renders safely

---

#### P2 - Medium Priority (Type Safety + Stubs)

| Task     | Description                                     | Priority | Status      | Estimate | Module                                        |
| -------- | ----------------------------------------------- | -------- | ----------- | -------- | --------------------------------------------- |
| TYPE-001 | Fix `as any` Casts in Work Surface Golden Flows | MEDIUM   | NOT STARTED | 4h       | OrderCreationFlow, InvoiceToPaymentFlow, etc. |
| STUB-001 | Implement Live Catalog Brand Extraction         | MEDIUM   | NOT STARTED | 2h       | liveCatalogService.ts:357                     |
| STUB-002 | Implement Live Catalog Price Range              | MEDIUM   | NOT STARTED | 2h       | liveCatalogService.ts:367                     |
| SEC-025  | Implement Session Extension Limit               | MEDIUM   | NOT STARTED | 1h       | sessionTimeoutService.ts:382                  |
| RBAC-002 | Verify Time Clock Route Permission Gate         | MEDIUM   | NOT STARTED | 30 min   | TimeClockPage.tsx, hourTracking.ts            |
| SEC-026  | Validate Cron Leader Election Race Condition    | MEDIUM   | NOT STARTED | 2h       | cronLeaderElection.ts                         |

##### TYPE-001: Fix `as any` Casts in Work Surface Golden Flows

**Status:** NOT STARTED
**Priority:** MEDIUM (P2)
**Estimate:** 4h
**Module:** `client/src/components/work-surface/golden-flows/`

**Problem:**
50+ `as any` casts bypass TypeScript type safety in Golden Flow components:

- `OrderCreationFlow.tsx`: lines 582, 587, 593, 596, 613, 650
- `InvoiceToPaymentFlow.tsx`: lines 655, 665, 679, 689
- `OrderToInvoiceFlow.tsx`: lines 658, 661, 668, 678

**Objectives:**

1. Define proper types for tRPC response shapes
2. Remove `as any` casts
3. Ensure type errors surface at compile time

**Deliverables:**

- [ ] Define response types in shared types file
- [ ] Replace `as any` with proper type assertions
- [ ] TypeScript compilation still passes
- [ ] No runtime behavior changes

---

##### STUB-001: Implement Live Catalog Brand Extraction

**Status:** NOT STARTED
**Priority:** MEDIUM (P2)
**Estimate:** 2h
**Module:** `server/services/liveCatalogService.ts:357`

**Problem:**
TODO comment indicates brand extraction is not implemented. Returns empty array instead of actual brand data.

**Deliverables:**

- [ ] Extract unique brands from inventory data
- [ ] Return brands in catalog filter options
- [ ] Add test for brand extraction

---

##### STUB-002: Implement Live Catalog Price Range

**Status:** NOT STARTED
**Priority:** MEDIUM (P2)
**Estimate:** 2h
**Module:** `server/services/liveCatalogService.ts:367`

**Problem:**
TODO comment indicates price range calculation is not implemented. Users cannot filter by price in live catalog.

**Deliverables:**

- [ ] Calculate min/max price from inventory
- [ ] Return price range in catalog response
- [ ] Add test for price range calculation

---

##### SEC-025: Implement Session Extension Limit

**Status:** NOT STARTED
**Priority:** MEDIUM (P2)
**Estimate:** 1h
**Module:** `server/services/sessionTimeoutService.ts:382`

**Problem:**
`canExtend: true` is hardcoded with TODO comment "Check count". Sessions can be extended infinitely, potentially allowing unlimited session duration.

**Deliverables:**

- [ ] Add extension count tracking
- [ ] Implement max extension limit (e.g., 3 extensions)
- [ ] Return `canExtend: false` when limit reached
- [ ] Add unit test for extension limit

---

##### RBAC-002: Verify Time Clock Route Permission Gate

**Status:** NOT STARTED
**Priority:** MEDIUM (P2)
**Estimate:** 30 min
**Module:** `client/src/pages/TimeClockPage.tsx`, `server/routers/hourTracking.ts`

**Problem:**
Hypothesis: Route uses `requirePermission("scheduling:read")` on backend but may lack UI-level permission gate. Users without permission may see the page before API calls fail.

**Deliverables:**

- [ ] Verify TimeClockPage has permission check
- [ ] Add ProtectedRoute wrapper if missing
- [ ] Test with user lacking scheduling:read permission

---

##### SEC-026: Validate Cron Leader Election Race Condition

**Status:** NOT STARTED
**Priority:** MEDIUM (P2)
**Estimate:** 2h
**Module:** `server/utils/cronLeaderElection.ts`

**Problem:**
Hypothesis: Two instances could acquire leader lock simultaneously due to race condition in `tryAcquireLock`.

**Deliverables:**

- [ ] Add logging before/after lock acquisition
- [ ] Deploy 2 instances and verify only one runs cron
- [ ] Add mutex/transaction around lock acquisition if needed
- [ ] Add integration test for concurrent acquisition

---

**Summary: Second-Pass Security Audit Tasks**

| Priority  | Count  | Description                                   |
| --------- | ------ | --------------------------------------------- |
| P0        | 1      | Silent monitoring failure                     |
| P1        | 4      | Test infrastructure + feature gaps + security |
| P2        | 6      | Type safety + stubs + validation              |
| **TOTAL** | **11** |                                               |

> **Audit Note (Jan 21, 2026):** All tasks from second-pass security audit.
> Build verification: TypeScript ✅ Build ✅ Tests 1949/2065 pass (116 test infra failures)
> Full report: `docs/qa/SECOND_PASS_SECURITY_AUDIT_2026-01-21.md`

---

## 📊 MVP Summary

| Category                    | Completed | Open   | Removed | Total   |
| --------------------------- | --------- | ------ | ------- | ------- |
| Infrastructure              | 21        | 2      | 1       | 24      |
| Security                    | 17        | 1      | 0       | 18      |
| Bug Fixes                   | 46        | 2      | 0       | 48      |
| API Registration            | 10        | 7      | 0       | 17      |
| Stability                   | 4         | 0      | 0       | 4       |
| Quality                     | 12        | 3      | 0       | 15      |
| Features                    | 29        | 2      | 1       | 32      |
| UX                          | 12        | 0      | 0       | 12      |
| Data & Schema               | 8         | 4      | 0       | 12      |
| Data Seeding (NEW)          | 0         | 11     | 0       | 11      |
| Data Integrity (QA)         | 8         | 0      | 0       | 8       |
| Frontend Quality (QA)       | 3         | 8      | 0       | 11      |
| Backend Quality (QA)        | 5         | 10     | 0       | 15      |
| Navigation                  | 0         | 12     | 0       | 12      |
| Improvements                | 7         | 0      | 0       | 7       |
| E2E Testing                 | 3         | 0      | 0       | 3       |
| TypeScript (NEW)            | 0         | 1      | 0       | 1       |
| Work Surface QA (NEW)       | 0         | 4      | 0       | 4       |
| Mobile Responsiveness (NEW) | 0         | 1      | 0       | 1       |
| Deprecation Cleanup (NEW)   | 0         | 2      | 0       | 2       |
| Schema Fixes (NEW)          | 0         | 3      | 0       | 3       |
| Security Audit (Jan 21)     | 0         | 11     | 0       | 11      |
| **TOTAL**                   | **185**   | **83** | **2**   | **270** |

> **MVP STATUS: 69% RESOLVED** (185 completed + 2 removed, 83 tasks open)
> **Data Seeding (Jan 21, 2026):** DATA-021 added for mock product image seeding (live catalog testing).
> **Security Audit (Jan 21, 2026):** 11 new tasks added from second-pass security audit.
> **Deep Audit (Jan 20, 2026):** 23 additional tasks added from comprehensive git commit analysis (verified non-duplicates).
> **Incomplete Features Audit (Jan 20, 2026):** 37 new tasks added from RedHat QA audit.
> **Navigation Enhancement (Jan 20, 2026):** 11 new tasks added to surface hidden routes.

> **E2E Testing Infrastructure (Jan 16, 2026):** All 3 E2E tasks COMPLETED.
> Final pass rate: 88.5% (54/61 core tests). Full suite has 338 tests across 44 spec files.
>
> **E2E Coverage (Jan 9, 2026):** 18 new defects added from comprehensive API testing.
> See `qa-results/E2E_TEST_EXECUTION_REPORT.md` for full details.
>
> **QA Role Testing (Jan 10, 2026):** 10 issues identified, **9 fixed**, 1 by-design.
> See `docs/qa/QA_SALES_MANAGER_FIXES_VALIDATION.md` for validation checklist.
>
> **QA Wave 2 (Jan 11, 2026):** 5 issues identified, **4 fixed** (BUG-093 to BUG-096), 1 deferred (P3).
> See `docs/roadmaps/QA_STRATEGIC_FIX_PLAN_WAVE2.md` for fix strategy.

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

## 🎨 UX Work Surface Redesign (Atomic UX Strategy)

> **Strategy Package**: `docs/specs/ui-ux-strategy/`
> **Status**: Ready for implementation (P0 infrastructure tasks first)
> **Last QA Review**: 2026-01-20 (Red Hat Deep Review)

### Scope & Guardrails

- **Feature Preservation**: All DF-001 through DF-070 features must be preserved (see `FEATURE_PRESERVATION_MATRIX.md`)
- **Golden Flow Coverage**: GF-001 through GF-008 must pass regression tests with RBAC validation
- **Modal Replacement**: All modals in core flows replaced with inspector/inline patterns
- **Rollback Strategy**: Feature flags enable safe gradual rollout and instant rollback

### Feature Flags for Rollout

Each Work Surface module requires a feature flag for safe deployment:

| Flag Name                 | Default | Controls                           |
| ------------------------- | ------- | ---------------------------------- |
| `WORK_SURFACE_INTAKE`     | false   | UXS-201..203 (Intake/PO pilot)     |
| `WORK_SURFACE_ORDERS`     | false   | UXS-301..302 (Sales/Orders)        |
| `WORK_SURFACE_INVENTORY`  | false   | UXS-401..402 (Inventory/Pick-Pack) |
| `WORK_SURFACE_ACCOUNTING` | false   | UXS-501..502 (Accounting/Ledger)   |

### RBAC Validation Matrix (Per Golden Flow)

| Golden Flow              | Entry Point          | Required Permissions                 | Owning Roles             |
| ------------------------ | -------------------- | ------------------------------------ | ------------------------ |
| GF-001 Direct Intake     | /spreadsheet         | `inventory:write`, `batches:create`  | Inventory, Super Admin   |
| GF-002 Standard PO       | /purchase-orders     | `purchase_orders:write`              | Inventory, Purchasing    |
| GF-003 Sales Order       | /orders              | `orders:write`, `inventory:read`     | Sales Rep, Sales Manager |
| GF-004 Invoice & Payment | /accounting/invoices | `invoices:write`, `payments:write`   | Accounting               |
| GF-005 Pick & Pack       | /pick-pack           | `pick_pack:write`, `inventory:write` | Fulfillment              |
| GF-006 Client Ledger     | /clients/:id/ledger  | `clients:read`, `ledger:read`        | Sales Rep, Accounting    |
| GF-007 Inventory Adjust  | /inventory           | `inventory:write`                    | Inventory                |
| GF-008 Sample Request    | /samples             | `samples:write`                      | Sales Rep, Sales Manager |

### Modal Replacement Inventory

| Module     | Current Modal      | Replacement         | Task    |
| ---------- | ------------------ | ------------------- | ------- |
| Intake     | BatchCreateDialog  | Inspector panel     | UXS-201 |
| Intake     | VendorCreateDialog | Quick-create inline | UXS-201 |
| Orders     | LineItemEditDialog | Inspector panel     | UXS-301 |
| Orders     | DiscountDialog     | Inline + inspector  | UXS-301 |
| Inventory  | AdjustmentDialog   | Inspector panel     | UXS-401 |
| Pick/Pack  | AssignDialog       | Bulk action bar     | UXS-402 |
| Accounting | PaymentDialog      | Inspector panel     | UXS-501 |

### Atomic UX Task Summary (From ATOMIC_ROADMAP.md)

| Layer                   | Tasks        | Priority   | Dependencies          |
| ----------------------- | ------------ | ---------- | --------------------- |
| Layer 0: Foundation     | UXS-001..006 | P0         | None                  |
| Layer 1: Primitives     | UXS-101..104 | P0         | UXS-002               |
| Layer 2: Intake Pilot   | UXS-201..203 | P1         | UXS-101..104          |
| Layer 3: Orders         | UXS-301..302 | P1         | UXS-101..104          |
| Layer 4: Inventory      | UXS-401..402 | P1         | UXS-101..104          |
| Layer 5: Accounting     | UXS-501..502 | P1         | UXS-101..104, REL-008 |
| Layer 6: Hardening      | UXS-601..603 | P1         | UXS-201..502          |
| Layer 7: Infrastructure | UXS-701..707 | P1/P2/BETA | Various               |
| Layer 8: A11y/Perf      | UXS-801..803 | P1/P2      | UXS-101..104          |
| Layer 9: Cross-cutting  | UXS-901..904 | P2         | None                  |

### P0 Blockers (Must Complete First)

| Task    | Description              | Effort | Status |
| ------- | ------------------------ | ------ | ------ |
| UXS-101 | Keyboard contract hook   | 2 days | ready  |
| UXS-102 | Save-state indicator     | 1 day  | ready  |
| UXS-104 | Validation timing helper | 1 day  | ready  |
| UXS-703 | Loading skeletons        | 1 day  | ready  |
| UXS-704 | Error boundary           | 1 day  | ready  |

### BETA Phase Tasks (UX)

| Task    | Description             | Effort | Status | Notes                                 |
| ------- | ----------------------- | ------ | ------ | ------------------------------------- |
| UXS-702 | Offline queue + sync    | 5 days | ready  | Per product: offline deferred to beta |
| UXS-706 | Session timeout handler | 2 days | ready  | Depends on UXS-702                    |

### Open Questions Requiring Product Decision

| #   | Question                                        | Impact                 | Blocking |
| --- | ----------------------------------------------- | ---------------------- | -------- |
| 1   | Concurrent edit policy: prompt vs auto-resolve? | UXS-705 implementation | Yes      |
| 2   | Export limit (10K rows): acceptable?            | UXS-904 implementation | No       |
| 3   | Bulk selection limit (500 rows): acceptable?    | UXS-803 implementation | No       |
| 4   | VIP Portal: full Work Surface or light touch?   | Scope planning         | No       |

### Work Surfaces Deployment Tasks (Added 2026-01-20)

> **Deployment Strategy**: `docs/deployment/WORKSURFACES_DEPLOYMENT_STRATEGY_v2.md`
> **Execution Roadmap**: `docs/deployment/WORKSURFACES_EXECUTION_ROADMAP.md`
> **Accelerated Validation**: `docs/deployment/ACCELERATED_VALIDATION_PROTOCOL.md`
> **QA Gate Scripts**: `scripts/qa/` (placeholder-scan.sh, rbac-verify.sh, feature-parity.sh, invariant-checks.ts)
> **Session**: `docs/sessions/completed/Session-20260120-WORKSURFACES-DEPLOYMENT-XpszM.md`

These tasks enable progressive rollout of Work Surfaces to production. All 9 Work Surfaces are implemented (95% complete) but currently not routed in App.tsx.

#### Deployment Path Options

| Path                           | Duration  | When to Use                                   |
| ------------------------------ | --------- | --------------------------------------------- |
| **Traditional Staged Rollout** | 4+ days   | Active user base, need real-world observation |
| **Accelerated AI Validation**  | 4-6 hours | Minimal users, AI agents can execute tests    |

**Accelerated Validation** replaces staged rollout observation with comprehensive automated testing:

- Phase A: Infrastructure validation (builds, types, gates)
- Phase B: Unit tests + Golden Flow matrix (all flows × all roles)
- Phase C: E2E tests + invariant monitoring
- Phase D: Rollback verification

Run: `bash scripts/validation/run-accelerated-validation.sh`

| Task       | Description                                     | Priority | Status       | Estimate | Dependencies    |
| ---------- | ----------------------------------------------- | -------- | ------------ | -------- | --------------- |
| DEPLOY-001 | Wire WorkSurfaceGate into App.tsx routes        | HIGH     | **COMPLETE** | 4h       | None            |
| DEPLOY-002 | Add gate scripts to package.json                | HIGH     | **COMPLETE** | 1h       | None            |
| DEPLOY-003 | Seed missing RBAC permissions (40+ accounting)  | HIGH     | **COMPLETE** | 4h       | None            |
| DEPLOY-004 | Capture baseline metrics (latency, error rates) | MEDIUM   | **COMPLETE** | 2h       | None            |
| DEPLOY-005 | Execute Stage 0 (Internal QA)                   | HIGH     | **COMPLETE** | 8h       | DEPLOY-001..004 |
| DEPLOY-006 | Execute Stage 1 (10% Rollout)                   | HIGH     | **SKIPPED**  | 4h       | DEPLOY-005      |
| DEPLOY-007 | Execute Stage 2 (50% Rollout)                   | HIGH     | **SKIPPED**  | 4h       | DEPLOY-006      |
| DEPLOY-008 | Execute Stage 3 (100% Rollout)                  | HIGH     | **COMPLETE** | 4h       | DEPLOY-007      |

> **Deployment Note (2026-01-20)**: Stages 1-2 skipped per Accelerated AI Validation Protocol recommendation. Direct deployment to 100% with feature flag safety net.

#### DEPLOY-001: Wire WorkSurfaceGate into App.tsx Routes

**Status:** COMPLETE (2026-01-20)
**Priority:** HIGH
**Estimate:** 4h
**Module:** `client/src/App.tsx`, `client/src/hooks/work-surface/useWorkSurfaceFeatureFlags.ts`
**Dependencies:** None

**Problem:**
App.tsx routes to legacy pages. WorkSurfaceGate component exists (line 301-318 in useWorkSurfaceFeatureFlags.ts) but is not imported or used in routing.

**Objectives:**

1. Import WorkSurfaceGate into App.tsx
2. Wrap each legacy route with WorkSurfaceGate
3. Map each legacy page to its WorkSurface equivalent
4. Verify feature flag controls work correctly

**Deliverables:**

- [ ] WorkSurfaceGate imported in App.tsx
- [ ] All 9 WorkSurface routes wrapped
- [ ] Feature flags default to false (safe deployment)
- [ ] Manual toggle test passes

---

#### DEPLOY-002: Add Gate Scripts to package.json

**Status:** ready
**Priority:** HIGH
**Estimate:** 1h
**Module:** `package.json`, `scripts/qa/`
**Dependencies:** None

**Problem:**
Gate scripts exist in `scripts/qa/` but are not registered as npm commands.

**Objectives:**

1. Add npm scripts for each gate
2. Verify scripts are executable
3. Document gate usage

**Deliverables:**

- [ ] `npm run gate:placeholder` → placeholder-scan.sh
- [ ] `npm run gate:rbac` → rbac-verify.sh
- [ ] `npm run gate:parity` → feature-parity.sh
- [ ] `npm run gate:invariants` → invariant-checks.ts
- [ ] All gates pass on current codebase

---

#### DEPLOY-003: Seed Missing RBAC Permissions

**Status:** ready
**Priority:** HIGH
**Estimate:** 4h
**Module:** `server/services/rbacDefinitions.ts`, seed scripts
**Dependencies:** None

**Problem:**
USER_FLOW_MATRIX.csv identifies 40+ accounting permissions not present in RBAC seed. Work Surfaces may fail RBAC checks without these permissions.

**Objectives:**

1. Audit USER_FLOW_MATRIX.csv for all required permissions
2. Add missing permissions to rbacDefinitions.ts
3. Create migration to seed permissions
4. Verify with rbac-verify.sh

**Deliverables:**

- [ ] All permissions from USER_FLOW_MATRIX.csv present
- [ ] Migration file created
- [ ] `npm run gate:rbac` passes
- [ ] No RBAC errors in Stage 0 testing

---

#### DEPLOY-004: Capture Baseline Metrics

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 2h
**Module:** Observability stack
**Dependencies:** None

**Problem:**
Need baseline metrics before rollout to detect regressions.

**Objectives:**

1. Capture P50/P95 latency for all 9 Work Surface endpoints
2. Document current error rates
3. Establish alert thresholds

**Deliverables:**

- [ ] Baseline document created
- [ ] Latency metrics captured
- [ ] Error rate baseline established
- [ ] Alert thresholds configured

---

#### DEPLOY-005: Execute Stage 0 (Internal QA)

**Status:** ready
**Priority:** HIGH
**Estimate:** 8h
**Module:** All Work Surfaces
**Dependencies:** DEPLOY-001, DEPLOY-002, DEPLOY-003, DEPLOY-004

**Problem:**
Work Surfaces need internal validation before any user exposure.

**Objectives:**

1. Enable feature flags for internal users only
2. Run all gate scripts
3. Execute Golden Flows GF-001 through GF-008
4. Fix any blocking issues

**Deliverables:**

- [ ] All 8 gates pass
- [ ] All 8 Golden Flows pass
- [ ] No P0 bugs discovered
- [ ] Sign-off for Stage 1

---

#### DEPLOY-006: Execute Stage 1 (10% Rollout)

**Status:** ready
**Priority:** HIGH
**Estimate:** 4h
**Module:** Feature flag configuration
**Dependencies:** DEPLOY-005

**Problem:**
First external user exposure requires careful monitoring.

**Objectives:**

1. Enable Work Surfaces for 10% of users
2. Monitor error rates and latency
3. 24-hour bake period
4. Rollback if metrics exceed thresholds

**Deliverables:**

- [ ] 10% rollout configured
- [ ] Monitoring dashboard active
- [ ] 24-hour bake complete
- [ ] Metrics within thresholds

---

#### DEPLOY-007: Execute Stage 2 (50% Rollout)

**Status:** ready
**Priority:** HIGH
**Estimate:** 4h
**Module:** Feature flag configuration
**Dependencies:** DEPLOY-006

**Objectives:**

1. Enable Work Surfaces for 50% of users
2. Monitor for regressions
3. 24-hour bake period
4. Validate feature parity at scale

**Deliverables:**

- [ ] 50% rollout configured
- [ ] No regression alerts
- [ ] 24-hour bake complete
- [ ] Support ticket volume normal

---

#### DEPLOY-008: Execute Stage 3 (100% Rollout)

**Status:** ready
**Priority:** HIGH
**Estimate:** 4h
**Module:** Feature flag configuration
**Dependencies:** DEPLOY-007

**Objectives:**

1. Enable Work Surfaces for 100% of users
2. Remove legacy page code (optional, can defer)
3. Document rollout completion
4. Update ATOMIC_ROADMAP.md status

**Deliverables:**

- [ ] 100% rollout configured
- [ ] All metrics stable
- [ ] Rollout documented in CHANGELOG.md
- [ ] ATOMIC_ROADMAP.md updated to 100% deployed

---

## 🔧 Work Surfaces QA Blockers (Added 2026-01-20)

> **Source:** Work Surfaces Exhaustive Testing Suite (`docs/qa/QA_ISSUE_LEDGER.md`)
> **QA Report:** `docs/qa/RECOMMENDATIONS.md`, `docs/qa/FIX_PATCH_SET.md`
> **Product Decisions:** Captured in `docs/qa/QA_ISSUE_LEDGER.md` Product Decisions Log

These P0 blockers were identified during comprehensive QA testing of the 9 Work Surface components. They must be resolved before Work Surfaces deployment.

### WSQA-001: Wire Payment Recording Mutation

**Status:** ready
**Priority:** HIGH
**Estimate:** 4h
**Module:** `client/src/components/work-surface/InvoicesWorkSurface.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/WSQA-001.md`

**Problem:**
The InvoicesWorkSurface payment handler (lines 717-724) is a stub that shows success without recording payments. Comment says "In a real implementation..." but mutation is never called. Breaks Invoice → Payment → Reconciliation flow.

**Objectives:**

1. Wire handlePaymentSubmit to trpc.payments.recordPayment mutation
2. Add loading state and error handling to payment dialog
3. Verify backend endpoint exists and accepts expected input

**Deliverables:**

- [ ] Payment mutation hook added to InvoicesWorkSurface
- [ ] Handler calls mutation instead of showing fake success
- [ ] Dialog shows loading state during mutation
- [ ] Submit button disabled while pending
- [ ] Error handling displays server errors
- [ ] Golden Flow GF-004 passes end-to-end

---

### WSQA-002: Implement Flexible Lot Selection

**Status:** ready
**Priority:** HIGH
**Estimate:** 2d
**Module:** `server/db/schema.ts`, `client/src/components/order/BatchSelectionDialog.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/WSQA-002.md`

**Problem:**
Users need to select specific batches/lots when fulfilling orders based on customer requirements (harvest dates, grades, expiry). Currently only single unitCogs stored per batch with auto-allocation.

**Product Decision:** Flexible lot selection per customer need (not strict FIFO/LIFO).

**Objectives:**

1. Create order_line_item_allocations table to track batch→order mappings
2. Add backend API for available batches query and allocation mutation
3. Build BatchSelectionDialog UI component for lot selection

**Deliverables:**

- [ ] order_line_item_allocations table created and migrated
- [ ] getAvailableForProduct query returns batches with details
- [ ] allocateBatchesToLineItem mutation validates and saves allocations
- [ ] BatchSelectionDialog shows available lots with details
- [ ] UI validates total selected = quantity needed
- [ ] Weighted average COGS calculated from selected batches
- [ ] Concurrent requests handled with row-level locking

---

### WSQA-003: Add RETURNED Order Status with Restock/Vendor-Return Paths

**Status:** ready
**Priority:** HIGH
**Estimate:** 2d
**Module:** `server/db/schema.ts`, `server/services/orderStateMachine.ts`, `server/services/returnProcessing.ts`
**Dependencies:** WSQA-002 (allocations table for restock)
**Prompt:** `docs/prompts/WSQA-003.md`

**Problem:**
Order status machine only accepts PENDING/PACKED/SHIPPED. No workflow for processing returns.

**Product Decision:** Add RETURNED status with two terminal paths:

- RESTOCKED: Items returned to inventory (increases batch quantities)
- RETURNED_TO_VENDOR: Items sent to vendor (creates vendor return record)

**Objectives:**

1. Add new enum values: RETURNED, RESTOCKED, RETURNED_TO_VENDOR
2. Create vendor_returns and vendor_return_items tables
3. Implement state machine with valid transitions
4. Build restock and vendor-return processing logic

**Deliverables:**

- [ ] New enum values added to fulfillment_status
- [ ] vendor_returns table tracks vendor return requests
- [ ] State machine validates all status transitions
- [ ] processRestock increases batch quantities and logs movements
- [ ] processVendorReturn creates return records
- [ ] UI shows return actions when order status allows
- [ ] Terminal states show no further actions

---

## 📊 Beta Summary

| Category                  | Completed | Open   | Total  |
| ------------------------- | --------- | ------ | ------ |
| Reliability Program       | 0         | 17     | 17     |
| UX Work Surface (BETA)    | 0         | 2      | 2      |
| Work Surfaces Deployment  | 0         | 8      | 8      |
| Work Surfaces QA Blockers | 0         | 3      | 3      |
| **TOTAL**                 | **0**     | **30** | **30** |

---

## 📊 Overall Roadmap Summary

| Milestone | Completed | Open   | Total   | Progress |
| --------- | --------- | ------ | ------- | -------- |
| MVP       | 185       | 0      | 187     | 100%     |
| Beta      | 0         | 30     | 30      | 0%       |
| Post-Beta | 0         | 1      | 1       | 0%       |
| **TOTAL** | **185**   | **31** | **218** | ~85%     |

> **Note**: Beta now includes:
>
> - 17 Reliability Program tasks
> - 2 UX Work Surface BETA tasks (UXS-702, UXS-706)
> - 8 Work Surfaces Deployment tasks (DEPLOY-001..008)
> - 3 Work Surfaces QA Blockers (WSQA-001..003) - Added 2026-01-20
>
> Additional UX Work Surface tasks (36 total) are categorized as P0-P2 and will be tracked in `ATOMIC_ROADMAP.md`.
>
> **Post-Beta Backlog** (Added 2026-01-21):
>
> - FEAT-SIGNAL-001: Signal Messaging Integration (HIGH priority, 6 weeks)

---

# 📋 POST-BETA BACKLOG

> Features that are fully specified and ready for implementation after Beta milestone.

---

## 📱 Communications & Client Messaging

| Task ID         | Description                  | Priority | Status        | Effort  | Specification                                                 |
| --------------- | ---------------------------- | -------- | ------------- | ------- | ------------------------------------------------------------- |
| FEAT-SIGNAL-001 | Signal Messaging Integration | HIGH     | 📋 SPEC READY | 6 weeks | [`FEAT-SIGNAL-001-SPEC.md`](../specs/FEAT-SIGNAL-001-SPEC.md) |

> **FEAT-SIGNAL-001 Details:**
>
> - Two-way Signal messaging embedded in client records
> - Per-role Signal numbers (Sales, Account Management, Operations, Support, Admin)
> - Message templates with variable substitution
> - Real-time delivery via WebSocket integration
> - Full audit trail for cannabis compliance
> - Technical Stack: signal-cli-rest-api (Docker), BullMQ/Redis, tRPC, Drizzle schema
> - RBAC: signal:view, signal:send, signal:template:\*, signal:admin
> - 6-phase implementation plan included in spec

---

## 📞 Questions?

Contact the project maintainer or open an issue in the repository.
