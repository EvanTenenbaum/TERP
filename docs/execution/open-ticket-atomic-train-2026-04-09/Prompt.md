# Objective

Build and execute a long-horizon TERP roadmap for all 48 tickets created on April 9, 2026, while respecting their shared foundations and explicit dependency chain.

# Scope
- In scope:
- Safe latest-main execution base from GitHub without disturbing the dirty primary checkout
- All 48 tickets `TER-1092` through `TER-1139`
- Dependency-aware execution ordering
- Bounded implementation slices with proof
- Out of scope:
- Older TERP backlog outside the April 9 ticket set
- Disturbing the dirty `codex/land-main-straggler` checkout
- Claiming score-based completion before a bounded tranche has adversarial review evidence

# Assumptions
- The repo in scope is `/Users/evan/spec-erp-docker/TERP/TERP`
- The tracker in scope is the `Terpcorp` Linear team
- "Pull the latest github repo" should be satisfied via a fresh worktree on latest `origin/main`
- Notifications tranche `TER-1129` through `TER-1133` is already implemented locally in this worktree

# Decision Hotspots
- Foundation work must precede dependent badge and empty-state audits
- Cross-cutting audit tickets should validate after concrete cluster work lands
- Claude adversarial review remains a later gate once the review runtime is healthy

# Constraints
- Verification over persuasion
- Do not overwrite or rebase the dirty main TERP checkout
- Use the smallest materially helpful set of skills and tools
- Respect explicit dependencies: `TER-1095` <- `TER-1092`, `TER-1096` <- `TER-1093`, `TER-1109` <- `TER-1092`

# Success Checks
- All 48 tickets are represented in the roadmap and manifest
- Execution order honors dependencies
- Completed slices have proof from commands or explicit blockers
