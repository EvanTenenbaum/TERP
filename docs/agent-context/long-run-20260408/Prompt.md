## Objective
Close TER-1068 verification touchpoint, then complete the most recent backlog items (TER-1047, TER-1048, TER-1049, TER-1050, TER-1051, TER-1052, TER-1053) with full QA gates, live browser verification, and Linear + git hygiene.

## Scope
- Inventory grid: add Price, COGS, Margin columns; LIVE default filter; human-readable status labels.
- Cmd+K global search: ensure products + batches are included with usable navigation.
- Sales Catalogue: improve fast access and sharing flow.
- Product display: product/strain name prominent, supplier secondary text.
- Order creator: show client credit/balance + recent orders before adding items.
- Inventory: add row action to start an order from a batch.

## Out of Scope
- New pricing models or schema changes.
- Production deploys or data migrations.

## Assumptions
- TER-1068 is already complete; we will verify and move on.
- Default margin percent from pricing defaults is acceptable for inventory grid margin display.

## Success Checks
- UI changes in inventory grid + order creator visible and functional.
- Global search returns usable product + batch entries and navigates correctly.
- Sales catalogue share flow is one-click and copied to clipboard.
- Full QA commands run before each commit.
- Live browser verification completed with evidence artifacts.
