# Specification: Spreadsheet-Native Foundation Baseline v2

**Task:** ARCH-SS-014  
**Status:** Draft  
**Priority:** CRITICAL  
**Spec Date:** 2026-03-14  
**Purpose:** Freeze the build foundation for the spreadsheet-native TERP fork before any further module expansion

## 1. Baseline Decision

The spreadsheet-native fork now has enough concept/governance material.

The next phase is explicitly a **truth-first foundation phase**, not another ideation phase.

The foundation baseline is now:

- workbook/navigation spine from the current TERP workspace shell
- governance, sheet engine, UX/UI, save, reporting, and view-sharing contracts
- interaction source-of-truth contract
- pilot ledgers and parity proof plan
- new foundation pack in [`spreadsheet-native-foundation/`](./spreadsheet-native-foundation/README.md)

No further cross-product architecture exploration should happen until the artifacts in this baseline are either implemented or explicitly rejected.

## 2. Repo Reality That Drives This Baseline

Current repo facts captured on March 14, 2026:

- `235` Drizzle tables across `12` schema files
- `62` Drizzle enums across the same schema surface
- `146` migration-source records across top-level Drizzle SQL, nested migration SQL, and the Drizzle journal
- `118` SQL migration files in repo reality
- `28` journal entries in [`drizzle/meta/_journal.json`](../../drizzle/meta/_journal.json)
- `317` router-to-table ownership edges in the generated ownership map
- `31` exception-surface tables already clearly attached to calendar, live shopping, VIP portal, or photography/media behavior
- `2` explicitly deprecated table families already called out in the generated schema inventory, both tied to the `vendors` conflict

These facts make the next risk obvious:

- the UI shell is ahead of the data truth layer
- the docs layer is ahead of the migration truth layer
- the pilot ledgers are ahead of the adapter/runtime layer

## 3. Authority Chain

The fork now uses this authority chain:

1. Actual schema, routers, services, and staging behavior
2. Flow source-of-truth docs and reconciled ledgers
3. Foundation Baseline v2 artifacts
4. Pilot blueprints
5. Implementation

Rules:

- current UI is a functionality oracle only
- generated foundation inventories outrank hand-written table counts
- the schema audit contract must resolve database connectivity through one approved env chain, including the repo-safe local test fallback when no explicit DB env is present
- shared staging remains classic by default; sheet-native pilots must stay behind a dedicated rollout flag and a reversible URL gate
- no blueprint is allowed to invent ownership, schema truth, or adapter contracts locally
- no implementation is allowed to bypass explicit ownership or proof contracts

## 3.1 Artifact Classes

The spreadsheet-native program now treats artifacts as belonging to one of three classes:

- `final target`: the intended end-state workbook, sheet, runtime, and ownership design
- `pilot scope`: the deliberately narrower slice currently implemented to evaluate that design
- `preserved adjacent behavior`: classic or adjacent-owned functionality that must survive the fork even when not yet absorbed into the pilot

Rules:

- final-target docs may not quietly rely on preserved adjacent behavior to appear complete
- pilot docs must name what they do not own yet
- preserved adjacent behavior may satisfy parity, but it does not count as proof that the pilot itself is strong

## 3.2 Blueprint Honesty Rule

Every blueprint must now contain:

- final target shape
- current pilot shape
- preserved adjacent dependencies
- explicit open gaps

No blueprint may mix those states together inside one ownership bullet list.

## 4. What Counts as Foundation Completion

The foundation phase is complete only when all of the following are true:

- schema verification, schema drift, and schema fingerprint checks run under one deterministic audit contract
- migration truth is categorized and the canonical stream is explicit
- the party-model conflict around `clients`, `vendors`, and `supplierProfiles` is classified for fork use
- the four remaining pilot ownership seams are explicitly closed
- `Inventory` and `Orders` both have stable sheet data contracts and proof cases
- the active AG Grid Enterprise fit spike either passes or forces an explicit runtime reopening
- the primitive pack is fixed enough that implementers do not have to make local interaction-grammar decisions
- the two pilot blueprints contain only module mapping, not new architecture decisions

## 5. Linked Artifacts

- Foundation pack index: [`spreadsheet-native-foundation/README.md`](./spreadsheet-native-foundation/README.md)
- Primitive pack: [`SPREADSHEET-NATIVE-PRIMITIVE-PACK.md`](./SPREADSHEET-NATIVE-PRIMITIVE-PACK.md)
- Runtime proof spike: [`SPREADSHEET-NATIVE-RUNTIME-PROOF-SPIKE.md`](./SPREADSHEET-NATIVE-RUNTIME-PROOF-SPIKE.md)
- Inventory blueprint: [`SPREADSHEET-NATIVE-OPERATIONS-INVENTORY-BLUEPRINT.md`](./SPREADSHEET-NATIVE-OPERATIONS-INVENTORY-BLUEPRINT.md)
- Orders blueprint: [`SPREADSHEET-NATIVE-SALES-ORDERS-BLUEPRINT.md`](./SPREADSHEET-NATIVE-SALES-ORDERS-BLUEPRINT.md)
