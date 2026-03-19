# Sales Order Creation Directional Layout Reference

Date: `2026-03-18`

## Why This Exists

The user supplied a directional screenshot for sales-order creation and asked that it guide layout only.

This reference must shape the canonical `sales-order-sheet.svg` artboard in the expanded Figma pack. `orders-document.svg` remains a compatibility alias of that same composition, and neither file may narrow the capability set.

## Directional Layout Intent

Use this composition as the directional baseline:

- large `Inventory` region on the left
- large `Sales Order` region on the right
- compact `Referral` support module below the inventory region
- compact `Credit` support module beside Referral
- wide `Whole Order Changes` support module below the sales-order region

## Interpretation Rules

- This is a layout direction, not a scope reduction.
- Do not remove existing sales-order functionality just because it is not shown in the screenshot.
- Keep the spreadsheet-native order document as a real working surface, not a static two-column mock.
- Preserve all existing or already-specified order-create capabilities, including:
  - customer and seeded-entry context
  - line-item editing
  - autosave and unsaved-change trust cues
  - finalize guardrails
  - pricing, margin, and validation feedback
  - workflow action clarity
  - spreadsheet-native selection, edit, paste, fill, and undo cues where relevant

## Practical Design Translation

Translate the screenshot into the TERP order-create artboard like this:

- `Inventory` becomes the dominant left-side inventory browser and add-item workspace.
- `Sales Order` becomes the dominant right-side document grid and order header workspace.
- `Referral` and `Credit` remain visible as compact support modules under the left region instead of hiding inside a deep inspector.
- `Whole Order Changes` becomes the lower-right order-level adjustments and notes region.
- Save state, keyboard guidance, and finalize actions may sit above or below this composition as needed, even though they are not shown in the screenshot.

## Anti-Drift Rule

If the screenshot conflicts with already-approved spreadsheet-native guardrails, keep the guardrails and use the screenshot directionally.

Priority order:

1. preserved functionality and ownership rules
2. spreadsheet-native interaction and trust contracts
3. directional layout from the screenshot
