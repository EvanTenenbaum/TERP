# Milestones

1. Reproduce the remaining SO hydration bug and re-confirm the exact scope across SO, quote mode, and PO.
2. Implement the smallest shared-surface fix and any adjacent non-classic applicability updates.
3. Add or tighten targeted unit/E2E coverage for SO, quote-mode, and PO pre-add controls.
4. Run local verification, ship through PR/merge, verify staging deploy, and perform live QA.

# Waves

- Wave 1: Evidence refresh and root-cause isolation
- Wave 2: Product and test changes
- Wave 3: Ship, deploy, and live verification

# Dependencies

- Clean worktree from current `origin/main`
- `bd` issue tracking for the open live bug
- Playwright/browser access for staging validation

# Owned Paths

- `client/src/components/spreadsheet-native/`
- `client/src/components/ui/`
- `client/src/hooks/`
- `tests-e2e/critical-paths/`
- `docs/execution/2026-04-01-so-po-next-steps/`

# Verification Plan

- Repro the live issue in a browser before editing
- Run targeted Vitest on touched SO/PO/client-combobox/useOrderDraft files
- Run targeted Playwright coverage for the inline-control critical path
- Run `pnpm check`, targeted `pnpm lint`, and `pnpm build` at ship point
- After merge, verify DigitalOcean staging deploy and perform live SO, quote-mode, and PO QA
