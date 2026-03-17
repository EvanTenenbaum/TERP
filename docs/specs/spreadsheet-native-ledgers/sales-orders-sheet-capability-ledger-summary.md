# Capability Ledger Summary: Sales -> Orders Sheet

Snapshot:

- Commit: `00fbedf608cff51b0e73b61057b9907b4eee24b2`
- Extracted: `2026-03-13`
- Checked Against Code: `yes`
- Scope Owner: `Sales pilot team`

## Scope

This ledger targets the second spreadsheet-native pilot for:

- workbook: `Sales`
- sheet candidate: `Orders`

Included current surfaces:

- [SalesWorkspacePage.tsx](../../../client/src/pages/SalesWorkspacePage.tsx)
- [OrdersWorkSurface.tsx](../../../client/src/components/work-surface/OrdersWorkSurface.tsx)
- [OrderCreatorPage.tsx](../../../client/src/pages/OrderCreatorPage.tsx)
- [ReferralCreditsPanel.tsx](../../../client/src/components/orders/ReferralCreditsPanel.tsx)
- [ReferredBySelector.tsx](../../../client/src/components/orders/ReferredBySelector.tsx)
- [CreditLimitWidget.tsx](../../../client/src/components/credit/CreditLimitWidget.tsx)
- [PricingConfigTab.tsx](../../../client/src/components/pricing/PricingConfigTab.tsx)
- [GLEntriesViewer.tsx](../../../client/src/components/accounting/GLEntriesViewer.tsx)
- [ProfileQuickPanel.tsx](../../../client/src/components/clients/ProfileQuickPanel.tsx)
- legacy `/orders` compatibility routes and `/sales?tab=orders` inspector behaviors that still belong to the orders sheet

Adjacent but not absorbed into this pilot sheet:

- `/quotes`
- `/returns`
- `/sales-portal`
- `/inventory?tab=shipping`
- accounting payment and invoice execution surfaces

## Coverage Snapshot

- Core matrix procedures reviewed for orders pilot boundary: `53`
- Current workbook/direct-child procedures reviewed in code: `33`
- Current workbook/direct-child procedures missing from matrix: `0`
- Direct procedure overlap between current workbook/direct-child code and matrix: `33`
- Open discrepancies recorded: `1`
- Blueprint-blocking discrepancies: `none` — ownership blockers resolved in [OWNERSHIP-SEAMS-MEMO.md](../spreadsheet-native-foundation/OWNERSHIP-SEAMS-MEMO.md)

## Source Appendix

| Source Type         | Reference                                                  | Relevant Rows / Sections                                                                                                                     | Code Refs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Why It Matters                                                                                                                   | Open Questions                                                                                                                          |
| ------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Flow Matrix         | `docs/reference/USER_FLOW_MATRIX.csv`                      | `orders.*`, `pickPack.*`, `invoices.generateFromOrder`, `orderEnhancements.*`, `returns.getByOrder`, `pricingDefaults.getMarginWithFallback` | [orders.ts](../../../server/routers/orders.ts), [orderEnhancements.ts](../../../server/routers/orderEnhancements.ts), [pickPack.ts](../../../server/routers/pickPack.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | now captures the current workbook procedures and `/sales` route ownership alongside legacy compatibility routes                  | recurring ownership and the concrete Accounting-owned output surface still need explicit validation                                     |
| Flow Guide          | `docs/reference/FLOW_GUIDE.md`                             | Domain `4.1` to `4.6`, Domain `1.1` for invoice generation                                                                                   | same as above                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | now includes the current `/sales?tab=orders` surface and the `/sales?tab=create-order` composer as first-class workbook surfaces | guide should now be read with the ownership seams memo: ownership is resolved, but some concrete proof surfaces still need validation   |
| Feature Map         | `docs/features/USER_FLOWS.md`                              | `DF-019`, `DF-020`, `DF-022`, `DF-023`, `DF-067`, `DF-078`                                                                                   | [SalesWorkspacePage.tsx](../../../client/src/pages/SalesWorkspacePage.tsx), [OrdersWorkSurface.tsx](../../../client/src/components/work-surface/OrdersWorkSurface.tsx), [OrderCreatorPage.tsx](../../../client/src/pages/OrderCreatorPage.tsx)                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | clarifies workbook intent, draft-order UX, and recurring-order claims                                                            | feature docs do not cover all current seeded entry modes, autosave, or customer-context sidecars                                        |
| Preservation Matrix | `docs/specs/ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md` | `SALE-001`, `SALE-003`, `ACCT-003`, `FUL-001`, `DF-023`, `DF-067`, `GF-003`, `GF-004`, `GF-005`                                              | [OrdersWorkSurface.tsx](../../../client/src/components/work-surface/OrdersWorkSurface.tsx)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | ties redesign parity to golden flows and known preserved features                                                                | invoice output execution and recurring-order ownership still need concrete proof surfaces even though core ownership seams are resolved |
| Current UI Code     | current orders workbook plus direct child components       | orders queue, create-order composer, route-seeded entry modes, autosave, credit warning, customer drawer, referral credits, GL context       | [OrdersWorkSurface.tsx](../../../client/src/components/work-surface/OrdersWorkSurface.tsx), [OrderCreatorPage.tsx](../../../client/src/pages/OrderCreatorPage.tsx), [ReferralCreditsPanel.tsx](../../../client/src/components/orders/ReferralCreditsPanel.tsx), [ReferredBySelector.tsx](../../../client/src/components/orders/ReferredBySelector.tsx), [CreditLimitWidget.tsx](../../../client/src/components/credit/CreditLimitWidget.tsx), [PricingConfigTab.tsx](../../../client/src/components/pricing/PricingConfigTab.tsx), [GLEntriesViewer.tsx](../../../client/src/components/accounting/GLEntriesViewer.tsx), [ProfileQuickPanel.tsx](../../../client/src/components/clients/ProfileQuickPanel.tsx) | reveals the real current workflow composition beyond the flow docs                                                               | workbook/output ownership remains split even after source reconciliation                                                                |

## Key Scope Decisions

1. The capability ledger spans both the main orders surface and the current create-order tab, but the current step-5 sheet-native implementation is intentionally narrower: only the orders queue/inspector is mounted in sheet-native mode while create-order remains an adjacent preserved workbook surface.
2. Route-seeded entry modes from draft, quote, client, need, and sales-sheet handoff remain in scope because current users can start the composer from those contexts today.
3. Autosave, unsaved-change protection, and the customer money/pricing/referral drawer remain explicit pilot capabilities instead of being treated as incidental implementation details.
4. Pick-pack execution is preserved as a handoff to Operations -> Shipping rather than being re-owned by the orders sheet.
5. Payment follow-up and invoice generation are preserved as linked accounting actions, not rebuilt inside the sheet.
6. Conversion, export, and audit ownership are now resolved by the ownership seams memo. The Quotes tab is now revalidated as a live Sales-owned conversion entry point, while invoice output and recurring-order ownership still need concrete current proof surfaces.

## Classification Summary

- `sheet-native`: `7`
- `sheet-plus-sidecar`: `7`
- `exception-surface`: `1`
- `intentionally-deferred`: `3`
- `blocked rows`: `3`

## Validation Notes

The orders pilot got materially stronger after source reconciliation and live staging proof.

The first pass missed or under-modeled these current workbook behaviors:

- draft deletion from the inspector
- route-seeded composer entry from `draftId`, `quoteId`, `clientId`, `needId`, and `fromSalesSheet`
- debounced autosave plus unsaved-changes navigation protection
- customer, pricing, credit, referral, and relationship-profile sidecars inside the composer

The deeper pass and source reconciliation also narrowed rows that were too doc-trusting:

- the edit row now reflects current workbook recalculation behavior instead of pretending legacy pricing procedures are directly wired
- the fulfillment row now reflects the current confirm-and-ship surface instead of implying full direct ownership of every documented status procedure
- the return row now centers the staged workbook flow instead of treating legacy `processReturn` docs as the main current path

Current workbook and direct child components now account for 33 unique procedures, and all 33 are represented in the reconciled source set.

Live staging validation on March 13, 2026 added several functional proofs that matter for the fork:

- `/sales?tab=create-order` and `/sales?tab=orders` are the real current workbook routes; legacy `/orders*` paths remain compatibility routes or aliases.
- `/sales?tab=quotes` is a real current Sales-owned conversion surface with a visible `Convert to Sales Order` action.
- draft save and draft reopen were proven on a real staging draft route
- auto-save was proven on an active draft with a saved-state indicator
- customer money context and pricing context both open from the create-order composer
- `Make Payment` is a real cross-workbook handoff into Accounting with `orderId` preserved in the route
- `Download Invoice` remains a visible but inert workbook affordance; live staging click produced no download and no route change

Live staging validation on March 15, 2026 materially tightened the pilot truth:

- the requested Orders `surface=sheet-native` route now serves the live sheet-native pilot in staging
- queue browse/filter and selected-order inspector are now live-proven on the pilot surface
- the pilot handoff to Accounting is live-proven under `qa.accounting@terp.test`
- the pilot handoff to Shipping is live-proven and lands on the consolidated shipping workspace route `/inventory?tab=shipping`
- classic Orders still exposes the `Generate Invoice` entry point after row selection, but execution remains an Accounting-owned follow-on proof
- the Quotes workbook still exposes the `Convert to Sales Order` dialog from a live quote row
- the create-order composer is live-proven for `quoteId` seeded entry and for `clientId` seeded customer/referral/credit/pricing context
- active draft editing, recalculation, autosave recovery, draft lifecycle controls, and draft deletion now all have live evidence on the classic Orders/Create Order surfaces, but only draft deletion is fully closed at parity level in this pass
- the blank create-order composer keeps finalization unavailable until prerequisites exist
- the Returns owner surface is live with a `Process Return` entry point, which keeps return execution out of the Orders pilot without losing the flow
- all direct pilot proofs in this wave depended on the hidden `spreadsheet-native-pilot` staging flag being enabled during verification

Two cautions still remain:

- the unsaved-changes guard is code-verified, but this pass still does not have a clean live staging proof for the navigation prompt
- the tested confirmed-order record loaded correctly, but it did not expose explicit downstream actions in the inspector, so the Sales-side confirmed-order action context is still only partially proven

The March 14, 2026 foundation pass also closed the two blueprint-blocking ownership seams:

- `ORD-D005` is resolved by assigning order workflow to Sales, payment execution to Accounting, and shipping execution to Operations -> Shipping
- `ORD-D007` is resolved by assigning conversion/export/audit context to Sales and invoice/output execution to Accounting
