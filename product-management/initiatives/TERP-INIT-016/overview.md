# TERP-INIT-016: Sales Sheet Module Restoration

## Quick Reference

| Field | Value |
|-------|-------|
| **Initiative ID** | TERP-INIT-016 |
| **Title** | Sales Sheet Module Restoration |
| **Status** | Ready for Implementation |
| **Priority** | High |
| **Owner** | TBD |
| **Created** | January 11, 2026 |
| **Estimated Effort** | 16-22 hours |

## Summary

Restore and enhance the orphaned Sales Sheet module, integrating it with the Live Shopping system and enabling full order conversion workflows.

## Key Documents

| Document | Path |
|----------|------|
| Roadmap | [`docs/roadmap.md`](./docs/roadmap.md) |
| PRD | [`docs/prd.md`](./docs/prd.md) |
| Original Spec | [`/docs/archive/quote-sales/SALES_SHEET_SPEC.md`](/docs/archive/quote-sales/SALES_SHEET_SPEC.md) |
| Unified Design | [`/.kiro/specs/unified-sales-live-shopping/design.md`](/.kiro/specs/unified-sales-live-shopping/design.md) |

## Quick Wins

1. **Add Navigation Link** (30 min) - Add Sales Sheets to sidebar
2. **Add API Procedure** (1 hr) - Add missing `list` endpoint

## Current State

- **Backend:** 100% complete
- **Frontend:** 95% complete
- **Navigation:** BROKEN (missing link)
- **Integration:** Missing (no conversion flows)

## Target State

- Accessible via sidebar
- Shareable links for clients
- One-click order conversion
- Live Session integration
- Mobile-responsive

## Sprint Plan

| Sprint | Focus | Duration |
|--------|-------|----------|
| Sprint 1 | Core Functionality | 1 day |
| Sprint 2 | Sharing & Conversion | 1 day |
| Sprint 3 | Enhancement & Polish | 1 day |
| Sprint 4 | Templates & Mobile | Optional |

## Related Initiatives

- **FEATURE-016:** Unified Sales & Live Shopping System
- **TERP-INIT-003:** Calendar (Sales Sheet reminders)
