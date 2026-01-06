# Post-Wave 5 Task Audit & Strategic Plan

**Date**: 2026-01-06  
**Status**: Wave 5 (Spreadsheet View) in progress  
**Purpose**: Comprehensive audit of all remaining work after Wave 5 completes

---

## Executive Summary

After Wave 5 completes, there are **80+ remaining tasks** across 6 categories:

| Category                        | Tasks | Hours   | Priority    |
| ------------------------------- | ----- | ------- | ----------- |
| **Critical 404 Bugs (P0)**      | 5     | 28-56h  | 🔴 CRITICAL |
| **QA Testing Backlog**          | 15+   | 80-120h | 🟡 HIGH     |
| **Infrastructure & Monitoring** | 6     | 40-60h  | 🟡 HIGH     |
| **Feature Enhancements**        | 10+   | 60-100h | 🟢 MEDIUM   |
| **Code Quality & Cleanup**      | 8     | 20-40h  | 🟢 MEDIUM   |
| **Documentation & Testing**     | 10+   | 30-50h  | 🔵 LOW      |

**Total Estimated Work**: 258-426 hours (6-10 weeks with parallel execution)

---

## 🔴 TIER 0: Critical 404 Bugs (MUST FIX FIRST)

These modules return 404 errors and are completely non-functional:

| Task ID | Module        | Route            | Est. Hours | Status      |
| ------- | ------------- | ---------------- | ---------- | ----------- |
| QA-001  | Todo Lists    | `/todo`          | 4-8h       | Not Started |
| QA-002  | Accounting    | `/accounting`    | 8-16h      | Not Started |
| QA-003  | COGS Settings | `/cogs-settings` | 4-8h       | Not Started |
| QA-004  | Analytics     | `/analytics`     | 8-16h      | Not Started |
| QA-005  | Data Access   | Systemic         | 4-8h       | Not Started |

**Total**: 28-56 hours

**Note**: QA-005 (systemic data access issues) may be the root cause of empty data tables across all modules. Should be investigated first.

---

## 🟡 TIER 1: QA Testing Backlog

### P1 - High Priority Testing

| Task ID | Description                           | Est. Hours |
| ------- | ------------------------------------- | ---------- |
| QA-043  | Add Event Attendees Functionality     | 8-16h      |
| QA-044  | Implement Event Invitation Workflow   | 16-24h     |
| QA-050  | Implement Mobile Responsiveness Fixes | 16-24h     |

### P2 - Medium Priority Testing

| Task ID | Description                           | Est. Hours |
| ------- | ------------------------------------- | ---------- |
| QA-020  | Test Calendar - Create Event Form     | 4-6h       |
| QA-021  | Test Pricing Rules - Create Rule Form | 4-6h       |
| QA-041  | Merge Inbox and To-Do List Modules    | 24-40h     |
| QA-045  | Link Events to Clients                | 8-16h      |
| QA-046  | Add Click-to-Create Event on Calendar | 4-8h       |
| QA-048  | Design @ Mention Workflow             | 8-16h      |
| QA-049  | Conduct Mobile Responsiveness Review  | 8-16h      |

### P3 - Lower Priority Testing

| Task ID | Description                           | Est. Hours |
| ------- | ------------------------------------- | ---------- |
| QA-023  | Conduct Mobile Responsiveness Testing | 16-24h     |
| QA-024  | Test Settings - Form Submissions      | 6-8h       |
| QA-025  | Test User Profile Functionality       | 4-6h       |
| QA-026  | Conduct Performance Testing           | 16-24h     |
| QA-027  | Conduct Security Audit                | 16-24h     |

**Total**: 80-120 hours

---

## 🟡 TIER 2: Infrastructure & Monitoring

| Task ID   | Description                       | Est. Hours  | Status  |
| --------- | --------------------------------- | ----------- | ------- |
| ST-008    | Sentry Error Tracking             | ✅ COMPLETE | Merged  |
| ST-009    | API Monitoring (Datadog)          | 16-24h      | Ready   |
| ST-010    | Caching Layer (Redis)             | 16-24h      | Blocked |
| INFRA-004 | Deployment Monitoring Enforcement | 4-8h        | Ready   |
| INFRA-007 | Update Swarm Manager              | 4-8h        | Ready   |
| REL-002   | Automated Database Backups        | 8-16h       | Ready   |

**Total**: 40-60 hours (excluding blocked ST-010)

---

## 🟢 TIER 3: Feature Enhancements

### Catalogue & Sales Features

| Task ID     | Description                            | Est. Hours |
| ----------- | -------------------------------------- | ---------- |
| FEATURE-011 | Unified Product Catalogue (Foundation) | 16-24h     |
| FEATURE-012 | Sales Sheet Generator (Staff Tool)     | 8-16h      |
| FEATURE-013 | Quote/Order Unification                | 8-16h      |
| FEATURE-014 | VIP Portal Catalogue Integration       | 8-16h      |

### Data & Workflow Features

| Task ID     | Description                  | Est. Hours |
| ----------- | ---------------------------- | ---------- |
| DATA-005    | Implement Optimistic Locking | 4-8h       |
| DATA-009    | Seed Inventory Movements     | 4-8h       |
| FEATURE-003 | Live Shopping Enhancement    | 8-16h      |

**Total**: 60-100 hours

---

## 🟢 TIER 4: Code Quality & Cleanup

| Task ID     | Description                      | Est. Hours |
| ----------- | -------------------------------- | ---------- |
| CLEANUP-001 | Remove LLM/AI from Codebase      | 4-8h       |
| ST-024      | Remove Comments Feature          | 2-4h       |
| QUAL-004    | Review Referential Integrity     | 1-2h       |
| QUAL-007    | Final TODO Audit & Documentation | 4-8h       |
| @ts-nocheck | Fix productionSeed.ts            | 2-4h       |

### Code TODOs to Address

Found 25+ TODO comments in codebase:

| File                               | TODO Description                                  |
| ---------------------------------- | ------------------------------------------------- |
| `calendarJobs.ts:330`              | Send alert to admin                               |
| `index.ts:161`                     | Fix schema drift and re-enable seeding            |
| `dataCardMetricsDb.ts:258`         | Add expirationDate to batches schema              |
| `dataCardMetricsDb.ts:379`         | Add expectedShipDate to orders schema             |
| `inventoryDb.ts:450`               | Add deletedAt column to clients table             |
| `matchingEngineEnhanced.ts:650`    | Get strain from strain library                    |
| `ordersDb.ts:321-323`              | Accounting integration (invoice, payment, credit) |
| `clients.ts:152`                   | Implement proper soft delete                      |
| `receipts.ts:470,497`              | Email/SMS service integration                     |
| `liveCatalogService.ts:356,366`    | Brand data and pricing engine                     |
| `vipPortalAdminService.ts:423,473` | Tier configuration storage                        |
| `IntakeGrid.tsx:319`               | Get receivedBy from auth context                  |

**Total**: 20-40 hours

---

## 🔵 TIER 5: Documentation & Testing

### Skipped Tests to Fix

Found 30+ skipped tests:

| File                            | Skipped Tests                                     |
| ------------------------------- | ------------------------------------------------- |
| `accounting.test.ts`            | 6 tests (AR/AP summary, expenses, reports)        |
| `badDebt.test.ts`               | 1 test (write-offs)                               |
| `calendarInvitations.test.ts`   | Entire describe block                             |
| `clients.test.ts`               | 2 tests (transactions, pagination)                |
| `credits.test.ts`               | 1 test (apply credit)                             |
| `inventory.test.ts`             | 3 tests (create batch, update status, pagination) |
| `rbac-permissions.test.ts`      | 4 tests                                           |
| `rbac-roles.test.ts`            | 4 tests                                           |
| `vipPortal.liveCatalog.test.ts` | Entire describe block                             |
| `sequenceDb.test.ts`            | 6 todo tests                                      |

### In-Progress Tasks

| Task ID          | Description                      | Status      |
| ---------------- | -------------------------------- | ----------- |
| DATA-002-AUGMENT | Augment Seeded Data              | In Progress |
| Seed Orders      | Seed Orders & Line Items         | In Progress |
| AUDIT-001        | Comprehensive System Code Review | In Progress |

**Total**: 30-50 hours

---

## Recommended Wave Structure (Post-Wave 5)

### Wave 6: Critical Bug Fixes (2-3 days, 2 agents)

| Agent | Tasks                                              | Hours  |
| ----- | -------------------------------------------------- | ------ |
| 6A    | QA-005 (Data Access), QA-001 (Todo), QA-003 (COGS) | 12-24h |
| 6B    | QA-002 (Accounting), QA-004 (Analytics)            | 16-32h |

### Wave 7: Infrastructure & Monitoring (2-3 days, 2 agents)

| Agent | Tasks                                  | Hours  |
| ----- | -------------------------------------- | ------ |
| 7A    | ST-009 (Datadog), INFRA-004, INFRA-007 | 16-24h |
| 7B    | REL-002 (Backups), Performance Testing | 16-24h |

### Wave 8: QA Testing Sprint (3-5 days, 3 agents)

| Agent | Tasks                                                    | Hours  |
| ----- | -------------------------------------------------------- | ------ |
| 8A    | Calendar/Event features (QA-043, QA-044, QA-045, QA-046) | 24-40h |
| 8B    | Mobile responsiveness (QA-049, QA-050, QA-023)           | 24-40h |
| 8C    | Form testing (QA-020, QA-021, QA-024, QA-025)            | 16-24h |

### Wave 9: Feature Enhancements (4-5 days, 2 agents)

| Agent | Tasks                                         | Hours  |
| ----- | --------------------------------------------- | ------ |
| 9A    | Catalogue features (FEATURE-011, FEATURE-012) | 24-40h |
| 9B    | Sales features (FEATURE-013, FEATURE-014)     | 16-32h |

### Wave 10: Cleanup & Polish (2-3 days, 2 agents)

| Agent | Tasks                                               | Hours  |
| ----- | --------------------------------------------------- | ------ |
| 10A   | Code cleanup (CLEANUP-001, ST-024, TODO fixes)      | 16-24h |
| 10B   | Test fixes, documentation (skipped tests, QUAL-007) | 16-24h |

---

## Timeline Summary

| Wave    | Focus             | Days        | Agents |
| ------- | ----------------- | ----------- | ------ |
| Wave 5  | Spreadsheet View  | In Progress | 2      |
| Wave 6  | Critical 404 Bugs | 2-3         | 2      |
| Wave 7  | Infrastructure    | 2-3         | 2      |
| Wave 8  | QA Testing        | 3-5         | 3      |
| Wave 9  | Features          | 4-5         | 2      |
| Wave 10 | Cleanup           | 2-3         | 2      |

**Total Post-Wave 5**: 13-19 days with parallel execution

---

## Blocked Items

| Task           | Blocker                                        | Resolution                       |
| -------------- | ---------------------------------------------- | -------------------------------- |
| ST-010 (Redis) | Requires authProvider/dataProvider abstraction | Complete abstraction layer first |

---

## Success Criteria

### Wave 6 Success

- [ ] All 404 routes return valid pages
- [ ] Data tables show actual data (not "No data found")
- [ ] Todo, Accounting, COGS, Analytics modules functional

### Wave 7 Success

- [ ] Datadog monitoring active
- [ ] Automated backups configured
- [ ] Deployment monitoring enforced

### Wave 8 Success

- [ ] All forms tested end-to-end
- [ ] Mobile responsiveness verified
- [ ] Calendar features complete

### Wave 9 Success

- [ ] Product catalogue functional
- [ ] Sales sheet generator working
- [ ] Quote/Order unification complete

### Wave 10 Success

- [ ] No TODO comments in critical paths
- [ ] All skipped tests enabled or removed
- [ ] Documentation up to date
