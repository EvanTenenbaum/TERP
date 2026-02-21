# Calm Power Structural Reset V2

Date: 2026-02-19
Scope: Purchase Orders + Product Intake surfaces

## Reference Pattern Extraction

The redesign uses structural patterns extracted from:
- Linear: list-first density, command clarity, right drawer details
- Airtable: grid as primary object, column control as core behavior
- Notion table view: lightweight inline controls, density and column visibility control
- Stripe dashboard: compact status clarity, strong action hierarchy, minimal chrome
- Vercel dashboard: quiet typography and alignment-led hierarchy

Extracted rules applied here:
- Primary surface is always the table/grid
- Top strip is informational and command-led, not content-heavy
- Secondary context lives in right drawers, not nested panels
- Borders only separate zones; no card stacks for core workflow

## Structural Layout (Reset)

### Purchase Orders

Zone 1: Header + Global Controls
- Title + one-line purpose
- Search, status filter, view mode, columns popover

Zone 2: Command Strip (inline, low-noise)
- Create PO
- Place Order (single)
- Place Order (bulk)
- Create Product Intake (single)
- Activity Log drawer
- Selection count + clear selection

Zone 3: Grid (dominant)
- Multi-select first column
- PO, Supplier, Status, Order Date, Expected, Total
- No split workspace panel
- Inline selected-row context sentence above grid

Zone 4: Drawers/Dialogs
- Create Intake drawer (subset + qty edit)
- Activity Log drawer
- Create PO dialog

### Product Intake

Zone 1: Header + Intake Selector + Global Controls
- Product Intake title
- Intake selector (draft/received/voided)
- View mode + columns popover

Zone 2: Inline Metadata + Command Strip
- Product Intake ID, Vendor, Warehouse, PO, Units, Lines, Cost in one line
- Review, Receive, Activity Log, Attachments, SKU Gallery
- Received-only: Adjust Quantity, Change Location, Void Intake
- Draft-only bulk operations: Set Location, Set Grade on selected lines

Zone 3: Grid (dominant)
- Multi-select first column
- Inline editable fields in draft
- Inline QA error indicator only (no QA panel)
- Visual mode uses larger rows + thumbnail + hover preview
- SKU shown only post-Receive

Zone 4: Drawers/Dialogs
- Activity Log drawer
- Attachments drawer
- SKU Gallery drawer
- Review dialog (totals + blocking count only)
- Correction dialogs

## Why This Differs From Previous Structure

Removed:
- Left/right split workspace layouts as the main composition pattern
- Card blocks for summary metrics and command grouping
- Nested section containers as the dominant rhythm

Changed:
- Grid now owns nearly all vertical space on both pages
- Metadata shifted to compact inline text rows
- Commands moved to a single strip with explicit primary/secondary priority
- Secondary detail moved into right drawers only

Result:
- Surface is list-dominant and broker-operational, not dashboard-segmented
- Interaction hierarchy is command-first with lower visual ceremony

## Doctrine Compliance Self-Audit

- Grid-first center of gravity: YES
- No card-dominant structural composition: YES
- Column show/hide + reorder + reset: YES
- Dense / Comfortable / Visual modes: YES
- Visual mode keeps grid layout intact: YES
- Right drawer system for Activity Log and support surfaces: YES
- QA gating via inline errors + Receive blocking: YES
- Corrections only post-Received: YES
- Locked terminology used: YES
- Engineering terminology removed from user-facing controls: YES
