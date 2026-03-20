# Gemini Context Brief

## What Gemini Is Reviewing

This package covers the revised TERP spreadsheet-native golden-flow design pack dated `2026-03-19`.

The pack is not a blank-slate concept exercise. It is a reality-mapped design set tied to live TERP routes, source modules, lifecycle contracts, and terminology rules.

Gemini should review the pack as a design-quality and system-truth QA pass, not as permission to reinvent the workflows from scratch.

## Broad UI And UX Goals

- Keep the spreadsheet-native operating model: dominant data table, adjacent support regions, compact multi-panel review.
- Make the product feel faster and clearer than a spreadsheet, not like a generic spreadsheet clone.
- Keep workflow ownership explicit. A sheet can bridge to a sibling surface, but it should not silently absorb that surface.
- Make trust-critical state changes visually explicit: draft save, restore, finalize, receive, pack, record payment, refund, and other commits should have visible boundaries.
- Keep outputs visible when they are real product contracts: share, print, export, PDF, manifest, ledger export.
- Keep terminology aligned to TERP policy so the pack does not create implementation drift.

## Core System-Truth Anchors

These are the highest-value reality anchors Gemini should use when checking the designs:

### Sales workspace and Sales Order composition

- `client/src/pages/SalesWorkspacePage.tsx`
- `client/src/pages/OrderCreatorPage.tsx`
- `client/src/components/orders/OrdersDocumentLineItemsGrid.tsx`

Important truths:

- Sales contains real sibling tabs and surfaces: Orders, Quotes, Returns, Sales Sheets, Create Order, and Live Shopping.
- The Sales Order composer must preserve seeded entry from Sales Sheets.
- Quote mode and Sales Order mode are both real and cannot be blurred together.
- Draft save, update, restore, and finalize are trust-critical and must remain explicit.

### Sales Sheets contracts

- `server/routers/salesSheets.ts`
- `client/src/pages/SalesSheetCreatorPage.tsx`
- `client/src/components/sales/SalesSheetPreview.tsx`

Important truths:

- Sales Sheets already owns drafts, history, saved views, share links, and order conversion.
- Share and conversion should not imply they work from unsaved or dirty state.
- The sheet can bridge into Live Shopping, which is a real sibling surface not directly represented as its own artboard.

### Payments

- `client/src/pages/accounting/Payments.tsx`
- `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx`
- `client/src/components/work-surface/PaymentInspector.tsx`

Important truths:

- The guided payment flow is the preferred current story.
- A legacy inspector path still exists, but it should not become the visual center of the design.
- The commit boundary around recording payment should stay obvious and reviewable.

### Returns

- `client/src/pages/ReturnsPage.tsx`
- `docs/reference/FLOW_GUIDE.md`
- `docs/reference/USER_FLOW_MATRIX.csv`

Important truths:

- Returns has a deeper lifecycle than a simple return registry.
- Refunds are real.
- Orders-workbook return actions also exist and should stay visible as adjacent truth, not hidden behavior.

### Samples

- `client/src/pages/SampleManagement.tsx`
- `server/routers/samples.ts`

Important truths:

- Monthly allocation is real.
- Expiring samples are real.
- Return and vendor-return depth is real.

### Terminology policy

- `docs/terminology/TERMINOLOGY_BIBLE.md`

Important truths:

- Use `Intake`, not `Receiving`, unless the copy is specifically about PO Receiving.
- Use `Sales Order`, not `Sale`.
- Use `Fulfillment` for the broader pick-pack lifecycle. `Shipping` is only the ship step.

## Pack Status Model

The pack audit uses four buckets:

- `Aligned`
- `Adapt`
- `Under-modeled`
- `Missing`

Gemini should use the same logic in spirit even if it uses different wording:

- Is the artboard directionally correct?
- Is it naming or framing the wrong owner surface?
- Is it omitting real lifecycle or output behavior?
- Is TERP truth present somewhere real but missing from the pack?

## Highest-Risk Artboards

These need the most skeptical review because hidden loss is easiest here:

1. `sales-order-sheet.svg`
2. `orders-document.svg`
3. `sales-sheet.svg`
4. `payments-sheet.svg`
5. `receiving-sheet.svg`

Why they matter:

- seeded entry can disappear
- draft lifecycle can get abstracted away
- trust-critical commit boundaries can get hidden
- sibling-surface seams can get flattened

## Pack-Wide Missing Or Under-Identified Areas

Gemini should explicitly test whether the revised pack now handles these well enough:

- Live Shopping as a real sibling surface
- Quotes as a real sibling surface plus composer mode
- Returns lifecycle plus refunds plus orders-workbook return actions
- Samples monthly allocation, expiry, and vendor-return depth
- Direct Intake versus PO Receiving branch clarity
- Reporting, printing, PDF, export, share, and manifest output contracts
- Terminology drift across the whole pack

## What Good Feedback Looks Like

Helpful Gemini feedback should:

- cite the exact artboard
- say whether the issue is layout, interaction, copy, terminology, system-truth mismatch, lifecycle gap, or missing area
- explain why it matters to TERP behavior, not just visual taste
- distinguish between a true defect and an intentional non-goal
- avoid proposing changes that delete seeded entry, quote mode, draft lifecycle, explicit receive/finalize/payment boundaries, or output visibility

## Key Files To Read First

If Gemini cannot read everything, these are the highest-priority files:

1. `design-assets/manifest.json`
2. `context/source-files/docs/design/spreadsheet-native-golden-flows-2026-03-18/figma-to-terp-pack-reality-audit.md`
3. `context/source-files/docs/design/spreadsheet-native-golden-flows-2026-03-18/figma-to-terp-pack-revision-brief.md`
4. `context/source-files/docs/terminology/TERMINOLOGY_BIBLE.md`
5. `context/source-files/client/src/pages/OrderCreatorPage.tsx`
6. `context/source-files/server/routers/salesSheets.ts`
7. `context/source-files/client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx`
8. `context/source-files/docs/reference/FLOW_GUIDE.md`
9. `context/source-files/docs/reference/USER_FLOW_MATRIX.csv`
10. `context/source-files/server/routers/samples.ts`
