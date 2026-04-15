# Requirements

## Problem Statement

TERP now has most of the right surfaces and data, but the remaining initiative still has three unresolved human problems:

1. the operator's preferred inventory cut does not survive cleanly across retrieval, sharing, ordering, and follow-through
2. the sales flow still drops or misplaces important context at the moment of commitment
3. operations and settlement follow-through still feel detached from the originating commercial decision

The goal is to finish these seams without another redesign.

## Success Definition

The remaining initiative is successful when all of the following are true:

- a rep can retrieve the right cut quickly, using defaults and saved cuts that feel natural to the business
- product identity feels consistent everywhere: product or strain, grower or farmer, and batch or availability context stay together
- the order moment surfaces credit, pricing, balance, and consignment context at the right time without clutter
- warehouse and settlement follow-through preserve the same story started during the sale
- every tranche ships with code proof, browser proof, and Claude adversarial review

## Non-Goals

- redesigning TERP's navigation or module structure
- replacing the current spreadsheet-native surfaces
- introducing broad recommendation or automation logic before operator-controlled workflows are solid
- promoting dashboard polish, activity feeds, or advanced backlog items ahead of core continuity work

## Human Moments

### HM-01 Remote Chat Retrieval

An operator gets a text like "Anything from Andy indoor between 800 and 1000?" and needs to retrieve the right cut immediately.

### HM-02 In-Person Browse And Negotiate

An operator needs to browse live inventory with margin and identity context visible enough to negotiate in the room.

### HM-03 Commit With Confidence

Before finalizing an order, the operator needs to understand client balance, credit posture, pricing, and consignment risk without leaving the flow.

### HM-04 Warehouse Start Of Shift

The warehouse person needs a practical "what is arriving today and what is it tied to?" view.

### HM-05 Settlement And Exception Follow-Through

Accounting and vendor settlement work should retain the same commercial context that existed during intake and sale, especially for consignment and out-of-range outcomes.

## Requirement Groups

### RG-01 Portable Cuts And Retrieval Defaults

**User stories**

- As an operator, I want reusable cuts that reflect how buyers actually ask for inventory so I can answer fast without rebuilding filters every time.
- As an operator, I want LIVE-first retrieval defaults and readable status language so the first screen shows what can actually move now.

**Acceptance criteria**

- Saved cuts can be recalled across the main selling surfaces that already use the same inventory context.
- The default retrieval posture prioritizes sellable inventory unless the user intentionally broadens scope.
- Status language is readable and consistent in the selling flow.
- The implementation reuses existing saved-view, filter, and search building blocks where possible.

**Existing ticket anchors**

- `TER-1048`
- `TER-1049`
- `TER-1064` merged into `TER-1048`

**Gap not fully captured by existing tickets**

- Portable cross-surface cuts and presets are a real remaining requirement and need explicit implementation ownership even though the repo already has partial saved-view primitives.

### RG-02 Product Identity And Commercial Visibility

**User stories**

- As an operator, I want product identity to read the way the business talks: product or strain plus grower or farmer plus batch context.
- As an operator, I want price, COGS, margin, and related sell-side signals visible where I am actually making the sales decision.

**Acceptance criteria**

- Identity rendering is standardized across the main sales surfaces.
- Price, margin, and related commercial fields are surfaced in the correct operator-facing moments.
- The UI does not add duplicate controls or extra chrome to surface this context.

**Existing ticket anchors**

- `TER-1047`
- `TER-1051`

### RG-03 Retrieval-To-Commit Continuity

**User stories**

- As an operator, I want to move from the right inventory cut into an order without losing context.
- As an operator, I want client balance, credit, recent order history, and relevant consignment signals to appear when I am deciding whether to continue.

**Acceptance criteria**

- The inventory-to-order handoff preserves both the retrieved cut and the selected rows instead of forcing re-discovery.
- Client money and relationship context is visible before or during item addition, not hidden behind a separate scavenger hunt.
- Drafts made only of unavailable or blocked imported rows cannot be finalized without repair.
- Consignment warnings and price-range implications remain clear at commit time.
- Customer-facing catalogue outputs reuse one identity and confirmation-terms voice, and missing identity details produce an explicit warning instead of disappearing silently.

**Existing ticket anchors**

- `TER-1050`
- `TER-1052`
- `TER-1053`

### RG-04 Operations And Settlement Continuity

**User stories**

- As warehouse staff, I want intake rows and expected deliveries to stay tied to the originating PO and supplier context.
- As accounting or relationship staff, I want buyer history, seller history, AR, and AP to read like one contact story.
- As settlement staff, I want vendor payout and out-of-range consignment handling to reflect what actually happened in the sale.

**Acceptance criteria**

- Intake surfaces expose the missing PO linkage and today's expected-delivery context.
- Dual-role contacts present a unified commercial and financial picture.
- Consignment payout reporting preserves range, out-of-range, and approval context.

**Existing ticket anchors**

- `TER-1059`
- `TER-1060`
- `TER-1061`

**Gap not fully captured by existing tickets**

- Vendor statement / payout narrative for consignment out-of-range outcomes still needs explicit execution treatment.

### RG-05 Deferred Backlog Discipline

**User stories**

- As the product owner, I want deferred work to be explicitly parked or promoted so the initiative can end cleanly.

**Acceptance criteria**

- Dashboard KPI expansion, activity feed, pick list generation, and communication log are not silently mixed back into core continuity tranches.
- Each deferred item is either promoted with a reason or left in backlog with a reason.

**Existing ticket anchors**

- `TER-1055`
- `TER-1056`
- `TER-1063`
- `TER-1065`

## Already-Landed Local Scope To Reconcile

These tickets now need tracker reconciliation rather than re-planning:

- `TER-1054`
- `TER-1057`
- `TER-1058`
- `TER-1062`

They should remain open in Linear until integrated proof is attached, but they are no longer part of the speculative planning scope.
