# Milestones
1. Establish safe latest-main TERP worktree and canonical April 9 ticket set
2. Build the 48-ticket dependency-aware roadmap and manifest
3. Execute completed and future slices in dependency-safe order
4. Run adversarial review and scoring on bounded completed slices

# Waves
- Wave 0: Truth and setup
  - latest-main worktree
  - roadmap artifacts
  - full 48-ticket manifest
- Wave 1: Foundation
  - `TER-1092` through `TER-1097`
- Wave 2: Shell and workspace population
  - `TER-1098` through `TER-1108`
- Wave 3: Notifications
  - `TER-1129` through `TER-1133`
  - status: implemented locally
- Wave 4: Surface clusters
  - Sales and orders: `TER-1109` through `TER-1113`
  - Inventory: `TER-1114` through `TER-1117`
  - Procurement: `TER-1118` through `TER-1121`
  - Relationships: `TER-1122` through `TER-1125`
  - Accounting: `TER-1126` through `TER-1128`
- Wave 5: Cross-cutting audits
  - `TER-1134` through `TER-1139`

# Dependencies
- `TER-1095` depends on `TER-1092`
- `TER-1096` depends on `TER-1093`
- `TER-1109` depends on `TER-1092`
- Cross-cutting audits should validate after the underlying surface clusters land

# Owned Paths
- Planning artifacts:
  - `docs/execution/open-ticket-atomic-train-2026-04-09/`
- Execution base:
  - `/Users/evan/spec-erp-docker/TERP/worktrees/open-ticket-atomic-train-20260409`

# Verification Plan
- For any implementation slice:
  - targeted tests for the changed files
  - `pnpm check`
  - `pnpm build`
  - browser proof when the ticket is browser-facing
  - later Claude adversarial review on the bounded completed slice
