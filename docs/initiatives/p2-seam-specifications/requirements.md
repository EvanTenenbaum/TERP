# P2 Seam Specifications — Requirements

## Context

3 of the 7 remaining seams need specification work before implementation. This phase produces design docs, not code.

## Deliverables

### D-1: Seam 4 Current State Audit (Retrieval-to-Commit)

**Requirement:** Determine what credit, balance, margin, and consignment context currently surfaces during order creation.

- [ ] Document every data point visible on OrderCreatorPage at commit time
- [ ] Identify what TER-1052 (client credit/balance/history) already covers
- [ ] Identify what TER-1053 (add-to-order from inventory) already covers
- [ ] List specific gaps between current state and "operator recognizes risk before committing"
- [ ] Cite file paths and line numbers for all claims

### D-2: Seam 3 Specification (Product Identity)

**Requirement:** Define the target product identity pattern for TERP.

- [ ] Define which fields compose product identity (strain, grower, category, subcategory, grow type, batch)
- [ ] Define the visual hierarchy for each surface (inventory grid, order creation, sales catalogue, search results)
- [ ] Determine if schema changes are needed (grow type as subcategory vs new field vs tags)
- [ ] Map existing data model to target pattern
- [ ] Identify all surfaces that need updating

### D-3: Seam 1 Specification (Portable Cuts)

**Requirement:** Define how a filter/cut travels across surfaces.

- [ ] Define the serialization format for a "cut" (URL params, shared state, or localStorage)
- [ ] Map which surfaces need to read/write cuts (inventory, sales catalogue, order creation, ⌘K)
- [ ] Define the existing building blocks (useInventoryFilters, SavedViewsDropdown, URL deep linking)
- [ ] Propose the transport mechanism (the smallest change that works)
- [ ] Define what "same cut" means across surfaces with different column sets

### D-4: Dependency Graph

**Requirement:** Map dependencies between all 7 seams.

- [ ] Seam 2 (LIVE defaults) → Seam 1 (portable cuts) dependency documented
- [ ] Seam 4 (retrieval-to-commit) → Seam 7 (consignment payout) dependency documented
- [ ] Seam 3 (product identity) migration risk assessed
- [ ] TER-1076 overlap between seam 6 and seam 7 resolved
- [ ] Original TER-1047-1065 → tranche TER-1066-1076 mapping table created

### D-5: Tracker Reconciliation

**Requirement:** Linear ticket state matches actual reality.

- [ ] All completed work from PRs 566/567/568 reflected in Linear
- [ ] Deferred items (TER-1055, 1056, 1063, 1065) moved to appropriate state
- [ ] TER-1076 ownership clarified (seam 6 vs seam 7 vs both)
