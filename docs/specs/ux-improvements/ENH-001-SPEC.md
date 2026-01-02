# Specification: ENH-001 - Implement Collapsible Navigation

**Status:** Draft | **Priority:** MEDIUM | **Estimate:** 10h | **Module:** Layout

---

## Problem Statement

The navigation sidebar has 27 items, creating visual clutter and cognitive overload. Users must scan a long list to find their target. However, consolidating pages was rejected in red hat analysis due to risks of hiding functionality.

**Solution:** Group navigation items into collapsible sections to reduce perceived complexity while maintaining single-click access to all pages.

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Navigation items must be grouped into collapsible sections | Must Have |
| FR-02 | Section containing current page must auto-expand | Must Have |
| FR-03 | Expanded/collapsed state must persist across sessions | Must Have |
| FR-04 | Users must be able to pin frequently used items | Should Have |
| FR-05 | Pinned items must appear at top, outside groups | Should Have |
| FR-06 | Collapse all/expand all option must be available | Should Have |

## Navigation Groups

| Group | Items |
|-------|-------|
| **Core** | Dashboard, Tasks, Calendar |
| **Sales** | Sales Portal, Clients, Live Shopping, Sales Sheets, Matchmaking, Quotes, Orders |
| **Fulfillment** | Workflow Queue, Pick & Pack, Photography |
| **Inventory** | Inventory, Purchase Orders, Returns, Locations |
| **Finance** | Accounting, Pricing Rules, Pricing Profiles, Credit Settings |
| **Insights** | Analytics, Leaderboard |
| **System** | Settings, Help |

## Acceptance Criteria

- [ ] Navigation items grouped into 7 collapsible sections
- [ ] Clicking group header toggles expansion
- [ ] Group containing current page auto-expands on navigation
- [ ] Expansion state persists in localStorage
- [ ] Users can pin items to top (right-click or drag)
- [ ] Pinned items persist across sessions
