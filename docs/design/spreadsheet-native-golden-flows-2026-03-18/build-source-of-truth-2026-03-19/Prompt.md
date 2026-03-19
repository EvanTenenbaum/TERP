# Objective

Create the implementation-first source-of-truth packet for the March spreadsheet-native TERP work so agents can start building without losing current functionality, workflow logic, outputs, or adjacent system seams.

# Scope

- In scope:
- reuse existing authoritative Orders and Inventory capability ledgers instead of rewriting them
- create a pack-level source-of-truth document for the remaining spreadsheet-native modules
- create a pack-level capability ledger for modules and cross-pack contracts not yet covered by detailed ledgers
- compile screen-recording feedback into implementation directives
- create the discrepancy log and Claude QA context needed for a skeptical review
- update the pack index so future agents know which artifact is implementation truth
- Out of scope:
- claiming module parity is complete
- replacing the existing detailed Orders or Inventory ledgers
- treating the Figma artboards as implementation truth
- implementing product code in this turn

# Assumptions

- Existing detailed ledgers for Orders and Inventory remain authoritative until superseded by newer detailed ledgers.
- The rest of the pack needs a deep implementation handoff before module-by-module build work starts.
- The 2026-03-19 screen recording is directional guidance, not literal sign-off on every visible control.

# Constraints

- Follow the spreadsheet-native source-precedence contract: current code, then matrix, then guide, then feature-layer docs, then preservation docs.
- Do not duplicate prior work when an existing ledger or memo already captures the truth more accurately.
- Keep the packet readable for future agents and for a non-engineer product owner.

# Success Checks

- There is a clear answer to "what is the implementation source of truth now?"
- Orders and Inventory are explicitly reused from existing ledgers instead of restated loosely.
- Remaining modules and cross-pack seams are mapped in a capability ledger with source traceability.
- Claude can review the packet with enough context to find preservation gaps, duplication, or false certainty.
