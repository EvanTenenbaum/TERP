# P2 Tranche 2 — Requirements

## Context

Cross-surface continuity seams. Depends on Tranche 1 completion (LIVE defaults and product identity must be in place).

## Seam 1: Portable Cuts

### US-1: Filter cuts travel between surfaces

**As an** operator who set up a specific inventory filter (e.g., indoor indica from Andy, $800-1000/lb)
**I want** that same filter to carry over when I switch to sales catalogue or order creation
**So that** I do not have to re-enter my search criteria on every surface

**Acceptance Criteria:**

- [ ] Inventory filter state can be serialized to URL params
- [ ] Navigating from inventory to sales catalogue preserves active filters
- [ ] Navigating from inventory to order creation preserves active filters
- [ ] ⌘K "Search with current filter" action available when filters are active
- [ ] Saved views work as named cuts that can be recalled from any surface
- [ ] Clearing filters on a target surface does not affect the source

### Linear: TER-1073

## Seam 4: Retrieval-to-Commit Continuity

### US-2: Credit and risk context at commit moment

**As an** operator finalizing an order
**I want** to see the client credit status, outstanding balance, and any consignment risk flags
**So that** I can make an informed decision before committing

**Acceptance Criteria:**

- [ ] Client credit limit and available credit visible during order creation (after client selected)
- [ ] Outstanding balance (AR) shown
- [ ] Recent order history (last 3-5 orders) accessible
- [ ] Consignment items flagged if below vendor range
- [ ] Context appears at the right moment (after client selected, before finalize) — not too early, not too late
- [ ] NOT a dashboard panel — minimal, contextual display

### Linear: TER-1052, TER-1053, TER-1074

## Seam 5: Outbound Identity and Terms

### US-3: Catalogue sharing matches internal view

**As an** operator sharing a sales catalogue with a client
**I want** the shared catalogue to show the same product identity and terms as I see internally
**So that** the client sees a consistent, professional document

**Acceptance Criteria:**

- [ ] Shared sales sheet shows product identity matching the internal pattern (strain + grower + type)
- [ ] Pricing terms are consistent between internal view and shared view
- [ ] Client name and date visible on shared catalogue
- [ ] No internal-only jargon (batch IDs, COGS) visible to clients

### Linear: TER-1050, TER-1075
