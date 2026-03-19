# Spreadsheet-Native Golden Flow Figma Pack

## Build Status

The artboards in this folder are not implementation-cleared specs.

Use `build-source-of-truth-2026-03-19/` for the next deep mapping tranche, and treat every pack-level ledger row there as `pack-only / blocked` until the corresponding detailed ledger exists.

This folder contains the **2026-03-19 revised spreadsheet-native** design pack for TERP.

## What is included

- `orders-queue.svg`
- `orders-document.svg`
- `sales-order-sheet.svg`
- `sales-sheet.svg`
- `inventory-sheet.svg`
- `receiving-sheet.svg`
- `purchase-orders-sheet.svg`
- `shipping-sheet.svg`
- `invoices-sheet.svg`
- `payments-sheet.svg`
- `client-ledger-sheet.svg`
- `returns-sheet.svg`
- `samples-sheet.svg`
- `shared-primitives.svg`
- `manifest.json`

## How to use in Figma

1. Open Figma.
2. Drag the SVG files into a draft file or team project.
3. Figma will import each SVG as editable vector and text layers.
4. Use `manifest.json` to map each artboard back to its TERP route and source surface.

## Review packet in this folder

- `build-source-of-truth-2026-03-19/`
  - implementation-first source of truth for the March spreadsheet-native pack
  - now reuses detailed ledgers for Orders, Inventory, Sales Sheets, Direct Intake, and Purchase Orders
  - adds the pack-level capability ledger, discrepancy log, durable state files, and Claude QA context for the next deep mapping tranche
- `improved-prompt.md`
- `module-specs.md`
- `sales-order-creation-direction.md`
- `claude-adversarial-qa.md`
- `figma-to-terp-reality-mapping-system.md`
- `figma-to-terp-reality-launch-matrix.md`
- `figma-to-terp-pack-reality-audit.md`
- `figma-to-terp-pack-revision-brief.md`
- `gemini-deep-qa-handoff-2026-03-19/`
  - Gemini-ready handoff with copied context, SVGs, PNG previews, import evidence, deep QA prompts, and the saved Gemini review report
- `review-presentation-2026-03-19/`
  - Review deck assets, feedback template, and the Figma presentation source for the latest proposed designs

## Important direction carried into the pack

- `sales-order-sheet.svg` is the explicit review-facing Sales Order deliverable for the current sheet-native order document route.
- `orders-document.svg` is retained as a compatibility alias of that same Sales Order surface so earlier review references do not break.
- both Sales Order artboards follow the directional layout reference from `sales-order-creation-direction.md`: Inventory left, Sales Order right, Referral and Credit below left, Whole Order Changes below right.
- That directional layout is used for composition only. It does **not** remove any prior order-create capability already covered by the spreadsheet-native pilot and rollout contracts.
- `receiving-sheet.svg` keeps its compatibility filename, but the revised artboard uses `Intake` for the direct-intake owner surface and `PO Receiving` for the linked purchase-order branch.
- `shipping-sheet.svg` keeps its compatibility filename, but the revised artboard uses `Fulfillment` for the broader lifecycle and reserves `Ship` for the explicit ship step.

## Intentional non-goals in this pack

- Live Shopping remains a sibling surface; this pack shows the bridge from Sales Sheets instead of creating a separate Live Shopping artboard.
- Quotes remain a sibling surface; this pack shows quote mode inside the Sales Order pair instead of adding a dedicated quotes registry artboard.

## Source of truth

These files follow the **spreadsheet-native** proposal track, not the older work-surface system.

Implementation planning should now start from:

- `build-source-of-truth-2026-03-19/spreadsheet-native-build-source-of-truth.md`
- `build-source-of-truth-2026-03-19/spreadsheet-native-pack-capability-ledger.csv`
- the detailed Orders, Inventory, Sales Sheets, Direct Intake, and Purchase Orders ledgers in `docs/specs/spreadsheet-native-ledgers/`

The SVG artboards remain directional UI reference, not literal build truth.

Primary sources include:

- spreadsheet-native March pilot files
- sales workspace routing and `SalesSheetCreatorPage`
- direct intake, purchase order, pick-pack, invoice, payment, ledger, returns, and samples surfaces
- `module-specs.md` for scope, ownership, and adjacency rules

## Review guidance

When handing back Figma feedback, call out:

- which artboard changed
- whether the change is layout, interaction, copy, or visual system
- whether it affects a module-specific sheet or the shared spreadsheet-native primitives
- whether it preserves explicit workflow ownership and visible adjacency
- whether it resolves or introduces a system area that the pack previously under-modeled or left out
