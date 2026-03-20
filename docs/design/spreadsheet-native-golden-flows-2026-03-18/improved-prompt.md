# Improved Prompt: Spreadsheet-Native Golden Flow Figma Build

You are the spreadsheet-native TERP design lead.

Your job is to produce a spec-first Figma import pack for every golden-flow module that is not already represented in the March 2026 spreadsheet-native pilot artboards.

## Goal

Create spreadsheet-native module designs that extend the current TERP pilot without losing functionality, blurring ownership, or drifting from the rules already established for the spreadsheet-native fork.

## First Principles

- Treat the current TERP app as a functionality and workflow oracle, not as the component model to copy.
- Reuse the spreadsheet-native pilot grammar already established for Orders and Inventory.
- Preserve the distinction between `final target`, `current pilot`, and `preserved adjacent behavior`.
- Preserve all currently proven or code-proven user capability, even when the future layout changes.
- Keep workflow actions explicit. Spreadsheet interaction must never hide ownership, handoffs, or trust-critical actions.
- Use width discipline. Default desktop layouts must show the P0 operating columns without routine horizontal scrolling.
- Keep inspectors secondary. The happy path belongs in the sheet, not in a right rail.
- Respect the ownership seams already decided in the pilot documentation.
- Where a module still depends on an adjacent owner surface, preserve that handoff explicitly instead of silently absorbing it.
- For sales-order creation specifically, use the directional layout documented in `sales-order-creation-direction.md`: large inventory region on the left, large sales-order document on the right, referral and credit as compact lower-left support modules, and whole-order changes as a lower-right support module. Treat that reference as directional layout guidance only, not as permission to drop other required order functionality.

## Mandatory Research Before Design

Before drawing anything, review and synthesize the relevant TERP source material, including:

- spreadsheet-native foundation docs
- ownership seams memo
- handoff and rollout contracts
- pilot proof cases and capability ledgers
- golden-flow matrix and preservation matrix
- current work-surface or page implementations for the relevant modules
- existing March 2026 spreadsheet-native artboards
- the documented sales-order creation directional layout reference

Your research pass must answer:

- which modules are already built in the pilot pack
- which golden-flow modules are still missing
- what each missing module currently owns
- what each missing module must preserve but not absorb
- which route, data contract, and workflow actions define each module

## Required Execution Order

1. Audit the current spreadsheet-native pilot pack and identify the missing golden-flow modules.
2. Write a module spec for each missing module before drawing it.
3. For each module spec, include:
   - workbook and sheet name
   - current oracle route and proposed sheet-native route
   - sheet archetype
   - owned behaviors
   - preserved adjacent behaviors and handoffs
   - layout shape
   - width budget / default visible columns
   - key data contracts
   - workflow rules and trust constraints
   - exact artboards to generate
4. Run a Claude adversarial QA pass on the spec pack before building the artboards.
5. Incorporate the adversarial review findings into the spec pack.
6. Only then build the Figma-importable files.
7. Continue self-QA during the build so the final visuals stay aligned with the written spec.

## Scope

Already represented in the current March 2026 pilot pack and therefore not the primary design target:

- Orders queue
- Orders document mode
- Inventory sheet
- Shared spreadsheet-native primitives

Primary design target:

- every remaining golden-flow module that still lacks spreadsheet-native artboards

## Deliverables

Produce all of the following:

- a written module spec pack
- a Claude adversarial QA report for that spec pack
- a complete Figma import pack using editable SVG files
- a manifest that maps each artboard to its TERP route and source files
- a short README describing how to import and review the files in Figma

## Output Standard

The final pack should feel like one coherent spreadsheet-native product family:

- same interaction grammar as the March pilot
- explicit workflow actions
- compact, high-density operational layouts
- clear support regions and inspector boundaries
- visible trust cues for save state, validation, and next-step ownership

Do not ship placeholder design drift, generic dashboard layouts, or visual ideas that are not grounded in TERP's current spreadsheet-native constraints.
