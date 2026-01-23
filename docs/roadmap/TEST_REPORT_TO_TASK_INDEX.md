# Test Report to Task Index

This index maps test-report issues to existing or newly created roadmap tasks.

## Test Report: E2E_TEST_EXECUTION_REPORT.md (Jan 19, 2026)

- TEST-ISSUE-001: AUTH-004 "Valid login succeeds" fails in production (QA auth disabled by design)
  - Coverage: ALREADY_FIXED_IN_MAIN (by-design behavior; no task required)

---

## Test Report: QA_COMBINED_FINAL_REPORT.md (Jan 14, 2026)

### Security Issues

- TEST-ISSUE-002: SEC-001 Hardcoded admin setup key fallback
  - Coverage: COVERED_BY_EXISTING_ROADMAP_TASK (SEC-018)
- TEST-ISSUE-003: SEC-002 Public matchingEnhanced endpoints
  - Coverage: COVERED_BY_EXISTING_ROADMAP_TASK (SEC-019)
- TEST-ISSUE-004: SEC-003 Public calendarRecurrence mutations
  - Coverage: COVERED_BY_EXISTING_ROADMAP_TASK (SEC-020)
- TEST-ISSUE-005: SEC-004 Token in URL query parameter
  - Coverage: COVERED_BY_EXISTING_ROADMAP_TASK (SEC-021)
- TEST-ISSUE-006: SEC-005 Hardcoded production URLs
  - Coverage: COVERED_BY_EXISTING_ROADMAP_TASK (SEC-022)

### Data Integrity Issues

- TEST-ISSUE-007: DI-001 Transaction helper placeholder
  - Coverage: COVERED_BY_EXISTING_ROADMAP_TASK (DI-001)
- TEST-ISSUE-008: DI-002 Credit application race condition
  - Coverage: COVERED_BY_EXISTING_ROADMAP_TASK (DI-002)
- TEST-ISSUE-009: DI-003 Cascading delete without transaction
  - Coverage: COVERED_BY_EXISTING_ROADMAP_TASK (DI-003)
- TEST-ISSUE-010: DI-004 Soft-delete gaps for clients
  - Coverage: COVERED_BY_EXISTING_ROADMAP_TASK (DI-004)
- TEST-ISSUE-011: DI-005 Startup seeding disabled
  - Coverage: COVERED_BY_EXISTING_ROADMAP_TASK (DI-005)
- TEST-ISSUE-012: DI-006 Missing FK constraints
  - Coverage: COVERED_BY_EXISTING_ROADMAP_TASK (DI-006)
- TEST-ISSUE-013: DI-007 VARCHAR numeric columns
  - Coverage: COVERED_BY_EXISTING_ROADMAP_TASK (DI-007)
- TEST-ISSUE-014: DI-008 SSE event listener memory leaks
  - Coverage: COVERED_BY_EXISTING_ROADMAP_TASK (DI-008)

### Placeholder / Stub Features

- TEST-ISSUE-015: FE-001 widgets-v3 intentionally empty
  - Coverage: COVERED_BY_EXISTING_ROADMAP_TASK (FE-QA-004)
- TEST-ISSUE-016: FE-002 TemplateSelector TODO placeholders
  - Coverage: COVERED_BY_NEW_TASK_FROM_TEST_REPORT (TERP-0020)
- TEST-ISSUE-017: FE-003 LiveShoppingPage console view placeholder
  - Coverage: COVERED_BY_EXISTING_ROADMAP_TASK (LIVE-001)
- TEST-ISSUE-018: FE-004 BatchDetailDrawer product relations commented out
  - Coverage: COVERED_BY_NEW_TASK_FROM_TEST_REPORT (TERP-0021)
- TEST-ISSUE-019: FE-005 BatchDetailDrawer currentAvgPrice hardcoded to 0
  - Coverage: COVERED_BY_NEW_TASK_FROM_TEST_REPORT (TERP-0021)
- TEST-ISSUE-020: FE-006 data-cards analytics stored only in sessionStorage
  - Coverage: COVERED_BY_NEW_TASK_FROM_TEST_REPORT (TERP-0020)
- TEST-ISSUE-021: FE-007 key={index} anti-pattern (27 files)
  - Coverage: COVERED_BY_EXISTING_ROADMAP_TASK (FE-QA-001)

### Backend Placeholders

- TEST-ISSUE-022: BE-001 Vendor supply matching returns empty
  - Coverage: COVERED_BY_EXISTING_ROADMAP_TASK (BE-QA-003)
- TEST-ISSUE-023: BE-002 VIP tier config hardcoded
  - Coverage: COVERED_BY_EXISTING_ROADMAP_TASK (BE-QA-002)
- TEST-ISSUE-024: BE-003 Live catalog brand list empty / price hardcoded
  - Coverage: COVERED_BY_EXISTING_ROADMAP_TASK (STUB-001, STUB-002)
- TEST-ISSUE-025: BE-004 Quote send lacks email notification
  - Coverage: COVERED_BY_EXISTING_ROADMAP_TASK (API-016)
- TEST-ISSUE-026: BE-005 Referral stats missing date filters
  - Coverage: COVERED_BY_NEW_TASK_FROM_TEST_REPORT (TERP-0023)
- TEST-ISSUE-027: BE-006 Email/SMS integrations placeholder
  - Coverage: COVERED_BY_EXISTING_ROADMAP_TASK (BE-QA-001)
- TEST-ISSUE-028: BE-007 Receipt creation helper deprecated
  - Coverage: COVERED_BY_NEW_TASK_FROM_TEST_REPORT (TERP-0023)
- TEST-ISSUE-029: BE-008 strainType hardcoded null
  - Coverage: COVERED_BY_NEW_TASK_FROM_TEST_REPORT (TERP-0023)
- TEST-ISSUE-030: BE-009 Dashboard metrics return zeros
  - Coverage: COVERED_BY_EXISTING_ROADMAP_TASK (BE-QA-004)
- TEST-ISSUE-031: BE-010 priceAlertsCron stop placeholder
  - Coverage: COVERED_BY_NEW_TASK_FROM_TEST_REPORT (TERP-0023)
- TEST-ISSUE-032: BE-011 Supplier metrics null return values
  - Coverage: COVERED_BY_EXISTING_ROADMAP_TASK (BE-QA-005)
- TEST-ISSUE-033: BE-012 COGS stats placeholder zeros
  - Coverage: COVERED_BY_NEW_TASK_FROM_TEST_REPORT (TERP-0023)
- TEST-ISSUE-034: BE-013 Audit balance breakdown placeholder
  - Coverage: COVERED_BY_NEW_TASK_FROM_TEST_REPORT (TERP-0023)
- TEST-ISSUE-035: BE-014 Leaderboard export placeholder
  - Coverage: COVERED_BY_NEW_TASK_FROM_TEST_REPORT (TERP-0023)
- TEST-ISSUE-036: BE-015 DB fallback throws on any access
  - Coverage: COVERED_BY_NEW_TASK_FROM_TEST_REPORT (TERP-0023)
- TEST-ISSUE-037: BE-016 Seed live catalog uses placeholder batch IDs
  - Coverage: COVERED_BY_NEW_TASK_FROM_TEST_REPORT (TERP-0023)
- TEST-ISSUE-038: BE-017 Accounting test sub-routers not implemented
  - Coverage: COVERED_BY_NEW_TASK_FROM_TEST_REPORT (TERP-0023)

### UI/UX Issues

- TEST-ISSUE-039: Destructive actions without confirmation (14 instances)
  - Coverage: COVERED_BY_NEW_TASK_FROM_TEST_REPORT (TERP-0022)
- TEST-ISSUE-040: window.alert usage in EventFormDialog
  - Coverage: COVERED_BY_NEW_TASK_FROM_TEST_REPORT (TERP-0022)
- TEST-ISSUE-041: Audit trail truncated at 10 entries in BatchDetailDrawer
  - Coverage: COVERED_BY_NEW_TASK_FROM_TEST_REPORT (TERP-0021)

---

## Overlap Notes (Conservative Review)

- TERP-0022 may overlap completed UX-015 (confirmation dialogs) and UX-016 (window.alert removal). Keep TERP-0022 until a gap analysis confirms whether any listed destructive actions remain unaddressed.
