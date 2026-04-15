# Human UI Overhaul Requirements

## Goal

Dramatically improve TERP's usability, clarity, visual hierarchy, natural flow, and spreadsheet-native ergonomics without changing core functionality.

## Non-negotiables

- No material workflow or functionality regression
- Changes must feel native to TERP, not bolted on
- Spreadsheet-heavy workflows remain fast for power users
- UI language, density, and navigation become more human-readable
- Improvements must hold up against strong third-party operational and ERP interfaces on comparable functional journeys

## User Stories

- As an operator, I can scan dense screens and immediately understand what matters.
- As a salesperson, I can move through queue, detail, and action flows without hunting.
- As an inventory or procurement user, I can work in table-heavy surfaces with clear hierarchy and low cognitive load.
- As an accounting or admin user, I can distinguish status, risk, and next actions at a glance.
- As any user, I can navigate TERP with less ambiguity and less UI noise.

## Scope

- Dashboard and workspace shell
- Orders and sales queue surfaces
- Inventory, intake, and procurement spreadsheet surfaces
- CRM and client profile surfaces
- Accounting list and detail workflows
- Notifications, inbox, and attention management
- Navigation, command palette, density, spacing, typography, headers, toolbars, filters, drawers, forms, tables, and state indicators

## Out of Scope

- Net-new business capabilities unless strictly required to preserve existing flows while improving UI
- Re-architecting backend domain logic
- Workflow removal that would reduce power-user capability

## Acceptance Criteria

- Baseline screenshots and flow inventory captured
- Third-party functional benchmarks gathered and mapped by journey
- UI roadmap produced with concrete workstreams and enabling tooling
- New branch created for implementation
- Major target surfaces updated coherently, not piecemeal
- Harsh QA run on changed areas, with additional polish passes until UX quality is materially improved
- Final result includes before and after assessment plus remaining gaps
