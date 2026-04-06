# TERP Staging Full UX/QA Report

- Audit date: 2026-03-26
- Environment: `https://terp-staging-yicld.ondigitalocean.app`
- Role used: `QA Super Admin`
- Method: live browser walkthrough using Playwright MCP plus scripted screenshot capture
- Running log: `docs/qa-reports/2026-03-26-staging-ux-qa-audit/RUNNING_BUG_LOG.md`
- Screenshot bundle: `docs/qa-reports/2026-03-26-staging-ux-qa-audit/screenshots`

## Executive Summary

This pass found **113 distinct issues** across dashboard, sales, procurement, inventory, shipping, accounting, credits, relationships, settings, analytics, calendar, and responsive layouts.

Severity breakdown:
- Critical: 6
- High: 46
- Medium: 60
- Low: 1

Most important patterns:
- Internal rollout language and dev-facing metadata are leaking into operator-facing surfaces.
- Staging is heavily polluted with test and demo data, which breaks user trust across queues, analytics, relationships, and calendar.
- Validation and permission failures often surface as generic toasts, silent no-ops, or raw backend errors instead of actionable guidance.
- Financial/accounting states contain serious contradictions, including duplicate invoices, negative due balances on paid invoices, and posted GL states with no visible entries.
- Responsive behavior is not dependable: mobile opens with obstructive navigation, hidden tabs, and controls that are hard or impossible to dismiss.

## Coverage

- Dashboard
- Sales Orders
- Sales Quotes
- Sales Order Builder
- Purchase Orders
- Inventory Intake
- Inventory Receiving
- Shipping
- Accounting Invoices
- Accounting Payments
- Client Credit
- Relationships
- Client Detail
- Client Money Tab
- Settings Users
- Settings Feature Flags
- Analytics
- Analytics Clients
- Analytics Inventory
- Calendar
- Calendar Filters
- Calendar Events
- Calendar Time Off
- Calendar Requests
- Mobile Shell
- Mobile Sales
- Mobile Inventory Intake
- Mobile Navigation

## Closeout

Use the running log for the full numbered issue list and the screenshots folder for the 20 numbered full-page captures.
