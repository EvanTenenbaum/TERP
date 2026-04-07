# P2 Tranche 1 — Requirements

## Context

Foundation seams that have no dependencies on other seams. Must land before Tranche 2.

## Seam 2: LIVE-First Defaults + Status Harmonization

### US-1: Default inventory to LIVE status

**As an** operator opening the inventory view
**I want** to see only sellable (LIVE) inventory by default
**So that** I am not distracted by incoming, held, or sold-out batches

**Acceptance Criteria:**

- [ ] Inventory grid defaults to `status = ["LIVE"]` filter on first load
- [ ] URL deep links with explicit status params override the default
- [ ] "Clear filters" resets to LIVE default, not "show everything"
- [ ] Saved views preserve their own status filters (do not inherit LIVE default)

### US-2: Human-readable status labels

**As an** operator reading the inventory grid
**I want** status labels in plain English
**So that** I do not have to decode AWAITING_INTAKE, SOLD_OUT, etc.

**Acceptance Criteria:**

- [ ] AWAITING_INTAKE → "Incoming"
- [ ] LIVE → "Available"
- [ ] ON_HOLD → "On Hold"
- [ ] QUARANTINED → "Quarantined"
- [ ] SOLD_OUT → "Sold Out"
- [ ] CLOSED → "Closed"
- [ ] Applied everywhere status appears: inventory grid, filters, search results, inspector, order creation
- [ ] Raw enum values never visible to users

### Linear: TER-1048, TER-1064 (collapsed), TER-1072

## Seam 3: Product Identity Consistency

### US-3: Consistent product identity across surfaces

**As an** operator viewing products anywhere in TERP
**I want** a consistent identity: strain/product name + grower + category context
**So that** I always know exactly what product I am looking at

**Acceptance Criteria:**

- [ ] Primary: Product/strain name (largest, boldest)
- [ ] Secondary: Grower/farmer name
- [ ] Tertiary: Category + subcategory (e.g., "Flower · Premium Indoor")
- [ ] This hierarchy is consistent across: inventory grid, inventory browser (order creation), sales catalogue, search results, inspector panel
- [ ] Existing `products.category` and `products.subcategory` fields used (no new schema needed if subcategory covers grow type)

### Linear: TER-1051

## Seam 7: Consignment Payout Narrative

### US-4: Vendor payout shows sale price vs consignment range

**As an** accounting user reviewing vendor payouts
**I want** to see what each consigned batch actually sold for vs the agreed price range
**So that** I can verify payouts and flag out-of-range sales

**Acceptance Criteria:**

- [ ] Vendor payable detail shows: agreed range (min-max), actual sale price per batch
- [ ] Out-of-range sales are visually flagged (amber/red badge)
- [ ] Below-range sales show the reason that was captured at order time
- [ ] Summary shows: total consigned, total sold in-range, total sold out-of-range
- [ ] Data sourced from existing `orderLineItems.originalRangeMin/Max` + `isBelowVendorRange` + `vendorPayables`

### Linear: TER-1076
