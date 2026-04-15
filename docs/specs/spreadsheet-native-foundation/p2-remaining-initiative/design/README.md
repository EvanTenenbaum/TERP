# Design

## Execution Framework

This initiative uses an improved version of the working framework that already proved itself in the latest local tranche.

### Core Rules

1. Human problems stay full-size.
2. Code changes stay seam-sized.
3. Existing building blocks define the solution space.
4. UI craft is a gate, not a polish pass.
5. Proof and tracker truth decide completion.

### What Changed From The Earlier Framework

The earlier framework was directionally right but too ceremonial. This version keeps the human ambition and removes excess overhead.

Kept:

- seam-first execution
- human-moment grounding
- targeted browser proof
- evidence-backed closeout
- bounded AI critique

Removed or compressed:

- large approval loops
- broad redesign exploration
- heavyweight artifact sprawl
- too many parallel tools for the same decision

Added explicitly:

- UI craft gates for implementation quality
- Claude adversarial review as a required tranche gate
- tracker reconciliation as a first-class step so local proof does not drift away from Linear truth

## Tranche Design

### Tranche 0: Tracker Reconciliation

**Purpose**

Normalize the initiative before more implementation begins.

**Scope**

- reconcile locally landed seams against open P2 issues
- attach proof and keep only the true remainder open
- merge duplicates such as `TER-1064` into `TER-1048`

**Allowed moves**

- Linear comments, task updates, and proof links
- spec and task-package updates

**Forbidden moves**

- reopening already-proven seams as net-new scope

### Tranche 1: Operator Retrieval Defaults, Portable Cuts, Product Identity

**Human problem**

The operator still cannot move as quickly as the business thinks about inventory cuts.

**Primary surfaces**

- inventory retrieval surfaces
- Sales Catalogue
- order-side availability browser
- search and Cmd+K where relevant

**Likely touched areas**

- inventory surface defaults
- saved views / filter carry-over
- search expansion
- identity renderers and grid columns

**Included tickets**

- `TER-1047`
- `TER-1048`
- `TER-1049`
- `TER-1051`
- duplicate cleanup for `TER-1064`

**Execution children**

- `TER-1072` LIVE-first defaults and plain-language status harmonization
- `TER-1073` portable cuts and saved-cut continuity across selling surfaces

**Additional explicit scope**

- portable cut / preset continuity
- adjacent rollout anchor: `TER-845`

### Tranche 2: Retrieval-To-Commit Continuity

**Human problem**

The sales flow still makes users reconstruct the same decision in multiple places before commitment.

**Primary surfaces**

- Order Creator
- order-side inventory browser
- Sales Catalogue handoff
- relationship and credit context overlays

**Likely touched areas**

- order entry surfaces
- sales-to-order handoff state
- balance / credit / history placement
- inventory row actions

**Included tickets**

- `TER-1050`
- `TER-1052`
- `TER-1053`

**Execution children**

- `TER-1074` retrieval-to-commit context placement in the sales flow
- `TER-1075` outbound identity and terms consistency across catalogue artifacts

**Notes**

- `TER-1054` and `TER-1062` are already locally implemented and should be reconciled during Tranche 0 rather than re-built here.
- adjacent artifact-quality anchor: `TER-344`
- adjacent QA anchor: `TER-1003`
- imported non-sellable rows need an explicit commit-time safeguard instead of relying only on add-row blocking in the live grid
- shared view, print/PDF, and copied catalogue text should reuse one customer-facing identity and confirmation-terms system

### Tranche 3: Operations And Settlement Continuity

**Human problem**

The system still loses continuity between intake, warehouse follow-through, dual-role contact context, and vendor settlement.

**Primary surfaces**

- intake
- purchase orders
- relationship profile
- accounting / payables / settlement surfaces

**Likely touched areas**

- intake list views
- receiving and purchase order context
- relationship profile tabs
- payables / vendor statement reporting

**Included tickets**

- `TER-1059`
- `TER-1060`
- `TER-1061`

**Execution child**

- `TER-1076` consignment payout narrative and out-of-range settlement reporting

**Additional explicit scope**

- consignment payout narrative and out-of-range settlement handling

**Adjacent anchor**

- operations family QA anchor: `TER-830`

### Tranche 4: Deferred Backlog Decision

**Human problem**

The initiative should end cleanly instead of letting lower-priority ideas drift back into active execution.

**Included tickets**

- `TER-1055`
- `TER-1056`
- `TER-1063`
- `TER-1065`

**Output**

- promote, defer, or split with explicit reasoning

## UI Craft Gates

Every tranche must satisfy these implementation rules:

- one clear primary action per moment
- no duplicate action surfaces unless the moments are genuinely different
- no nonfunctional explanatory copy or badges
- the highest-value working area gets the most space
- identity, pricing, and risk context are grouped the way a human would expect
- advanced controls stay progressive unless they are needed constantly
- the UI should feel operator-native, not feature-complete for its own sake

## QA Contract

Each tranche closes only if all four layers are satisfied:

1. targeted static proof
   - touched tests
   - eslint on touched files
   - `pnpm check`
2. runtime proof
   - local browser or staging proof for the changed flows
   - screenshots or artifacts saved with the tranche
3. confused-human proof
   - at least one exploratory pass that tries the obvious wrong move
4. tracker proof
   - Linear updated with what was shipped, what remains, and the evidence path

## Claude Adversarial Review Contract

Claude review is a required tranche gate, not an optional extra.

### When To Run It

- after local static checks pass
- after browser evidence exists
- before a tranche is claimed complete

### What Claude Reviews

- bounded diff for the tranche
- screenshots and browser evidence for UI work
- spec and acceptance criteria for the tranche

### Required Output

- prioritized findings only
- no vague praise-only summary
- explicit residual risks or missing evidence

### Pass Condition

A tranche may be closed only when:

- Claude returns no blocking findings, or
- all blocking findings are resolved, or
- unresolved findings are explicitly carried as a limitation packet with next action

## No-Overhaul Constraint

This package is designed to finish the initiative without changing TERP's overall architecture.

Default response to a problem:

1. reorder
2. relabel
3. change defaults
4. carry existing context further
5. reveal progressively
6. add a small new seam-level primitive only if the first five cannot solve it

Broad rewrites are out of scope unless a future tranche proves they are unavoidable.
