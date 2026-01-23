# PR to Task Index

This index maps open PR change units to roadmap tasks and dispositions.

## Evidence Status (Diff Verification Pending)

PR-level diff evidence is not embedded in this repo. Until PR diffs are fetched and reviewed, all change-unit mappings should be treated as provisional. Add file-level evidence to each PR entry once diffs are available.

## PR #289 - Fix dashboard widgets: add error states, time period filters, and N+1 queries

**New tasks created:**

- TERP-0001: Dashboard backend data accuracy and performance fixes
- TERP-0002: Dashboard widget UX error states, navigation, and time-period controls

**Mapped to existing tasks:**

- None

**Already implemented in main (no task created):**

- None

**Needs verification:**

- None

**Change Units:**

1. Backend dashboard/analytics data accuracy (profit margin, KPIs, time filters, soft-delete filters, N+1 fix) → TERP-0001
2. Widget UI error states + client navigation + time-period controls → TERP-0002

---

## PR #288 - 📊 Reality Map 2026-01-23: Autonomous QA Analysis (509 Flows)

**New tasks created:**

- TERP-0011: Create QA test data seeding script and registry
- TERP-0012: Implement UI for top accounting API-only flows

**Mapped to existing tasks:**

- None

**Already implemented in main (no task created):**

- None

**Needs verification:**

- None

**Change Units:**

1. Missing QA-prefixed test data blocks automated QA → TERP-0011
2. Accounting UI gap (top 10 P0 flows) → TERP-0012

---

## PR #287 - docs: Add inventory consistency QA findings to roadmap

**New tasks created:**

- TERP-0007: Surface non-sellable batch status in sales inventory UI
- TERP-0008: Standardize batch status constants across server code
- TERP-0009: Add dashboard vs sales inventory consistency integration tests
- TERP-0010: Refactor getDashboardStats test mocks

**Mapped to existing tasks:**

- None

**Already implemented in main (no task created):**

- None

**Needs verification:**

- None

**Change Units:**

1. UI status display for non-sellable inventory → TERP-0007
2. Replace hardcoded batch status strings → TERP-0008
3. Add integration tests for dashboard/sales consistency → TERP-0009
4. Improve inventory stats test mocks → TERP-0010

---

## PR #286 - feat(nav): Reorganize navigation based on user workflow analysis

**New tasks created:**

- TERP-0005: Reorganize navigation groups based on workflow analysis

**Mapped to existing tasks:**

- None

**Already implemented in main (no task created):**

- None

**Needs verification:**

- None

**Change Units:**

1. Navigation regrouping + new entries (Direct Intake, Locations, Inbox) → TERP-0005

---

## PR #285 - fix(db): Add notifications table migration to autoMigrate

**New tasks created:**

- TERP-0004: Add notifications table creation to autoMigrate

**Mapped to existing tasks:**

- None

**Already implemented in main (no task created):**

- None

**Needs verification:**

- None

**Change Units:**

1. Auto-migrate notifications table on startup → TERP-0004

---

## PR #284 - docs: Add RedHat QA audit findings and implementation prompts

**New tasks created:**

- TERP-0013: Security hardening for public endpoint exposure
- TERP-0014: Token invalidation and auth rate limiting
- TERP-0015: Financial integrity validation fixes
- TERP-0016: Business logic guardrails for orders and financial precision
- TERP-0017: Convert remaining public routers to protected procedures
- TERP-0018: Consistency and cleanup tasks from RedHat QA audit

**Mapped to existing tasks:**

- None

**Already implemented in main (no task created):**

- None

**Needs verification:**

- None

**Change Units:**

1. SEC-030/031/032/033/034/035 → TERP-0013
2. SEC-036/037 → TERP-0014
3. DI-010/011/012 → TERP-0015
4. BL-001..006 → TERP-0016
5. SEC-038..041 → TERP-0017
6. CON-001..004 + AUTH-001 → TERP-0018

---

## PR #283 - docs: Mark DATA-021 as complete in roadmap

**New tasks created:**

- TERP-0019: Verify and fix inventory snapshot widget SQL aliases
- TERP-0024: Verify DATA-021 mock product image seeding completion

**Mapped to existing tasks:**

- DATA-021: Seed mock product images for live catalog

**Already implemented in main (no task created):**

- None

**Needs verification:**

- Inventory snapshot SQL alias fix (captured as TERP-0019)
- DATA-021 completion claim (captured as TERP-0024)
- Evidence: `scripts/seed/seeders/seed-cannabis-images.ts` defines deterministic image seeding but no run is recorded

**Change Units:**

1. DATA-021 completion claim → Map to existing DATA-021 + TERP-0024 verification task
2. Inventory Snapshot widget SQL error fix → TERP-0019

---

## PR #282 - docs: Add comprehensive data seeding QA report

**New tasks created:**

- None

**Mapped to existing tasks:**

- DATA-001..DATA-011 (data seeding tasks already complete)

**Already implemented in main (no task created):**

- Intake session vendor_id fix already present in `scripts/seed-comprehensive.ts` (verified)
- Evidence: `seedIntakeSessions` uses seller client IDs for `vendor_id`

**Needs verification:**

- None

**Change Units:**

1. Data seeding QA report documentation → Mapped to existing DATA tasks

---

## PR #280 - Claude/fix terp tests migrations p lj4 c

**New tasks created:**

- TERP-0006: Add cleanup migrations for dashboard preferences index and long constraint names

**Mapped to existing tasks:**

- None

**Already implemented in main (no task created):**

- None

**Needs verification:**

- Constraint name length safety in migrations 0020/0021 (captured as TERP-0025)
- Evidence: migrations exist but constraint-length checks not documented

**Change Units:**

1. Add cleanup migrations 0053/0054 for constraint/index fixes → TERP-0006
2. Verify migration constraint naming for 0020/0021 → TERP-0025

---

## PR #279 - fix: Add missing AddClientWizard to ClientsWorkSurface

**New tasks created:**

- TERP-0003: Add Client Wizard dialog to ClientsWorkSurface

**Mapped to existing tasks:**

- None

**Already implemented in main (no task created):**

- None

**Needs verification:**

- None

**Change Units:**

1. Render AddClientWizard in ClientsWorkSurface → TERP-0003
