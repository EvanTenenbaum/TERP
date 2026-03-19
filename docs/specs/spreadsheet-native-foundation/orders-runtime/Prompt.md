# Orders Runtime Prompt

- Date: `2026-03-18`
- Initiative root: `docs/specs/spreadsheet-native-foundation/orders-runtime`
- Objective: turn Orders spreadsheet runtime from a special initiative into a normal TERP capability.
- In scope: gate artifacts, Linear gate hierarchy, proof-row control, runtime/document/surfacing/rollout/retirement sequencing.
- Out of scope: shipping new runtime code in this artifact-only turn.
- Success checks:
  - every gate has a durable artifact and explicit next unblock
  - Linear and repo artifacts use the same gate structure
  - blocked lanes are not left `In Progress`
  - status language distinguishes `implemented`, `implemented-not-surfaced`, and `live-proven`
- Non-negotiables:
  - reuse existing pricing, autosave, undo, validation, seeded-entry, and routing
  - no AG Grid Enterprise key in repo state
  - adversarial review required before `live-proven`
- Risks: hidden fallback dependence, tracker drift, built-but-hidden behaviors, adjacent-owner ambiguity.
