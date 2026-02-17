# TERP UI Evolution — Agent Handoff Package

Everything a UI/UX agent needs to execute the TERP frontend evolution with access to `EvanTenenbaum/TERP`.

## Quick Start

1. Clone the repo: `gh repo clone EvanTenenbaum/TERP`
2. Read **`AGENT_PROMPT.md`** — the primary instruction document
3. Create branch `feat/ui-evolution` from `main`
4. Execute Parts A → B → C in order on that branch
5. PR it when done

## Package Contents

| File | What It Is |
|------|-----------|
| `AGENT_PROMPT.md` | The main prompt. Mission, architecture, design direction, visual references, 3-part implementation plan, acceptance criteria, critical rules. |
| `CHANGE_MANIFEST.md` | File-by-file checklist. Every file to create or modify with exact descriptions. |
| `DESIGN_TOKENS.css` | Drop-in replacement for the token blocks in `client/src/index.css`. Includes gunmetal palette, status colors, and density variables. |
| `reference-implementations/` | Working code for all new files (not pseudocode). |

## Reference Implementations

| File | Part | Purpose |
|------|------|---------|
| `DensityContext.tsx` | B | React context for density preference |
| `kbd.tsx` | C | Keyboard shortcut badge component |
| `KeyboardHintBadge.tsx` | C | Conditional kbd wrapper for action buttons |
| `useRecentItems.ts` | C | LRU recent items hook for command palette |
| `useKeyboardHints.ts` | C | Keyboard hint visibility toggle |
| `table-diff.md` | B | Exact before/after for `table.tsx` — the highest-impact change |

## Architecture Summary

| Part | What | Feature Flagged? | Effort |
|------|------|-------------------|--------|
| **A: Visual Migration** | Token swap, font change, radius, hardcoded color cleanup | **No** — direct replacement | 2–3 days |
| **B: Density System** | CSS variable compact mode with toggle | **Yes** — `ui-density-toggle` | 2–3 days |
| **C: Power-User Features** | Command palette enhancement, keyboard hints | **Yes** — `ui-command-palette-v2`, `ui-keyboard-hints` | 5–8 days |

Part A is a one-way visual migration (no going back, no toggle). Parts B and C are gated behind the existing `FeatureFlagContext` system — disabled by default, enabled per-user for testing, then flipped globally when approved.

## Key Constraints

- Frontend-only. No backend, no schema, no API changes.
- All 8 golden flows must remain functional.
- Dark mode is the primary design target.
- IBM Plex fonts only. OKLCH colors only. Border radius max 4px.
- Total: 30 files modified, 6 files created, ~662 lines touched.
