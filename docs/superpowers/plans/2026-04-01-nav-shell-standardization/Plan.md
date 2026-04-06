# Plan

## Milestones

1. Establish task state and inspect shared shell + target surface
2. Refactor `AppHeader` into a compact utility bar with one omnibox entry point
3. Refactor `LinearWorkspaceShell` into a reusable compact workspace strip
4. Collapse Sales catalogue chrome into a single top toolbar plus existing right-side output controls
5. Update tests for header, workspace, and catalogue expectations
6. Run local verification and fix regressions
7. Merge to `main`, push, verify staging deploy, and run live browser QA

## Owned Paths

- `client/src/components/layout/AppHeader.tsx`
- `client/src/components/layout/AppHeader.test.tsx`
- `client/src/components/layout/LinearWorkspaceShell.tsx`
- `client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx`
- `client/src/components/spreadsheet-native/SalesCatalogueSurface.test.tsx`
- `client/src/index.css`
- `client/src/pages/*WorkspacePage.tsx` only if standardization needs call-site updates

## Verification Plan

- Targeted Vitest for updated header and catalogue behavior
- Repo gates: `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build`
- Deploy proof against staging build on `main`
- Live browser validation across Sales, Inventory, and Accounting with UI/UX + business-logic spot checks

## Known Risks

- Workspace shell changes affect many pages at once
- Sales catalogue actions are tightly coupled to draft and conversion flows
- Local QA helpers may be unavailable until dependencies are confirmed in the worktree
