# Team F: UI/UX & Features

**Session ID:** Session-20260126-TEAM-F-UI-4pvOr
**Agent:** Team F (Claude Opus 4.5)
**Started:** 2026-01-26
**Status:** In Progress
**Mode:** STRICT
**Branch:** claude/review-terp-instructions-4pvOr

## Tasks

| Task      | Description                             | Status      |
| --------- | --------------------------------------- | ----------- |
| TERP-0002 | Dashboard widget UX improvements        | pending     |
| TERP-0003 | Add Client Wizard to ClientsWorkSurface | ✅ VERIFIED |
| TERP-0005 | Reorganize navigation groups            | pending     |
| TERP-0009 | Add inventory consistency tests         | pending     |
| TERP-0010 | Refactor getDashboardStats test mocks   | pending     |
| TERP-0011 | Create QA test data seeding script      | pending     |
| TERP-0016 | Frontend data validation improvements   | pending     |
| TERP-0017 | Backend input hardening                 | pending     |
| TERP-0018 | Error handling visibility improvements  | pending     |
| NAV-017   | Add Missing /alerts Route               | pending     |
| NAV-018   | Add Missing /reports/shrinkage Route    | pending     |
| API-019   | Fix PaymentMethod Type Mismatch         | pending     |
| API-020   | Fix Pagination Response Inconsistency   | pending     |
| OBS-003   | Add Inventory Audit Trail               | pending     |
| TEST-010  | Add Order→Invoice→GL Integration Tests  | pending     |
| TEST-011  | Add Concurrent Operation Tests          | pending     |
| TEST-012  | Update Batch Status Transition Test Map | pending     |

## Progress Notes

### 2026-01-26 - Session Start

- TERP-0003 already implemented: AddClientWizard is imported and rendered in ClientsWorkSurface.tsx
- NAV-017 (/credits) route already exists in App.tsx - task refers to /alerts route
- NAV-018 requires creating ShrinkagePage wrapper for existing ShrinkageReport component
- Starting with quick wins (NAV-017, NAV-018) then progressing through batches
