# Active Milestone

Milestone 4: verification closeout for the first remediation wave.

# Decisions

- Start with the route contract, create-order differentiation, and mobile command-strip/toggle issues because they scored highest in the live audit and have the smallest high-value blast radius.
- Keep the first implementation wave inside the existing sales workspace architecture rather than redesigning the whole workspace shell.
- Treat staging Agentation/Tailscale console noise as a follow-up unless it blocks runtime proof.
- Rebuild the roadmap into task-sized units with explicit proof targets before code changes begin.

# Changes

- Created a dedicated long-horizon task folder for the sales workspace UX remediation.
- Captured objective, scope, assumptions, and success checks.
- Drafted the initial milestone-based roadmap and owned-path plan.
- Rebuilt the roadmap into `UX-001` through `UX-008` atomic tasks after internal QA found the original plan too grouped.
- Implemented route canonicalization for malformed sales-sheet order-document deep links.
- Added create-order-specific context in the sheet-native orders document flow.
- Normalized the sheet/classic toggle active state and mobile command-strip layout.
- Added regression coverage for the route guard, create-order context, wrapper context, and toggle accessibility state.
- Renamed the user-facing sales workspace tab label from `Create Order` to `New Order` and updated the nearby tests/help copy.

# Evidence

- Live runtime audit against `https://terp-staging-yicld.ondigitalocean.app/sales?tab=sales-sheets&surface=sheet-native&ordersView=document`
- Durable evidence copied under `docs/specs/spreadsheet-native-foundation/sales-workspace-ux-remediation/evidence/`
- Claude review packet under `~/.codex-runs/claude-qa/20260401T154357Z-https-terp-staging-yicld-ondigitalocean-app-sales-tab-sales-shee-f59204/`
- Deterministic owned-path existence check for all first-wave implementation files
- Shadow verification recommendation: `ui` bundle
- Direct Claude roadmap critique confirmed four useful guardrails:
  - keep tasks atomic
  - define the URL contract explicitly
  - enforce mobile breakpoint/tap-target proof
  - keep durable evidence out of `/tmp`
- Targeted Vitest bundle passed:
  - `client/src/pages/SalesWorkspacePage.test.tsx`
  - `client/src/pages/OrderCreatorPage.visibility.test.tsx`
  - `client/src/components/spreadsheet-native/OrdersSheetPilotSurface.test.tsx`
  - `client/src/components/spreadsheet-native/SheetModeToggle.test.tsx`
- `pnpm check` passed
- Targeted eslint on touched TS/TSX files passed
- `pnpm build` passed
- Follow-on rename tranche passed:
  - `pnpm vitest client/src/pages/SalesWorkspacePage.test.tsx client/src/pages/ConsolidatedWorkspaces.test.tsx --run`
  - targeted eslint on `SalesWorkspacePage.tsx`, `ConsolidatedWorkspaces.test.tsx`, `Help.tsx`, and `tests-e2e/comprehensive-staging.spec.ts`

# User-Verifiable Deliverables

- A durable roadmap packet in this folder
- An improved roadmap revision after QA with dependency order and proof per task
- A first remediation wave implemented in code with proof artifacts
- Durable evidence under `docs/specs/spreadsheet-native-foundation/sales-workspace-ux-remediation/evidence/`

# Blockers

- The TERP worktree is heavily dirty, including the target files, so all edits must be rebased mentally onto current in-tree state without reverting other work.
- Full repo `pnpm lint` is not a clean signal for this wave because unrelated pre-existing errors remain in:
  - `client/src/components/accounting/RecordPaymentDialog.tsx`
  - `client/src/components/spreadsheet-native/GeneralLedgerSurface.tsx`
  - `client/src/components/spreadsheet-native/InvoicesSurface.tsx`

# Checkpoint 2026-04-01 18:10 CET

## Completed

- `UX-001` route guard for malformed order-document deep links
- `UX-002` valid Sales Catalogue route regression guard
- `UX-003` create-order framing inside the sheet-native order composer
- `UX-004` wrapper context alignment for the create-order entry
- `UX-005` toggle active-state normalization
- `UX-006` mobile command-strip toggle layout fix
- `UX-007` stronger mobile tab overflow cue
- `UX-009` rename the user-facing create-order entry to `New Order`

## Remaining

- `UX-008` browser-observable local proof when a trustworthy local runtime is available
- Follow-up product decision on whether `Create Order` should be renamed globally
- Separate staging-console-noise cleanup

## Evidence

- See the `Evidence` section above plus the copied artifacts in the `evidence/` folder.

## User-Verifiable Deliverables

- The malformed sales deep link now redirects to the orders document route.
- The create-order entry now presents itself as a new-order flow inside the sheet-native composer.
- The mode toggle now advertises its active state consistently and is laid out for narrow command strips.
- The sales workspace tab now reads `New Order` while keeping route compatibility.

## Risks / Blockers

- Local browser proof for the updated UI was attempted but blocked by the dev harness stopping on an interactive migration/data-loss prompt before the app became ready.
