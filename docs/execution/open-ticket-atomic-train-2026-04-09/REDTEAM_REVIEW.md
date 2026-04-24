# Operations Red-Team Review

Scope: current operations tranche work (`TER-1109` through `TER-1128`) plus its proof packet and browser/unit evidence.

Review inputs:
- local self-review against the current worktree
- latest Claude adversarial passes in:
  - `~/.codex-runs/claude-qa/20260410T111612Z-users-evan-spec-erp-docker-terp-worktrees-open-ticket-atomic-tra-b82b81`
  - `~/.codex-runs/claude-qa/20260410T112223Z-users-evan-spec-erp-docker-terp-worktrees-open-ticket-atomic-tra-fff31f`
  - `~/.codex-runs/claude-qa/20260410T112610Z-users-evan-spec-erp-docker-terp-worktrees-open-ticket-atomic-tra-ef2c76`
  - `~/.codex-runs/claude-qa/20260410T113010Z-users-evan-spec-erp-docker-terp-worktrees-open-ticket-atomic-tra-ab18f5`

## Scores

| Ticket | Score | Notes |
|---|---:|---|
| TER-1109 | 97 | Strong browser + unit proof. |
| TER-1110 | 94 | Dedicated row-tint proof and payment-state sync now exist, but a clean fresh-app browser rerun is still locally blocked by auth/startup instability. |
| TER-1111 | 97 | Primary/overflow action proof is strong. |
| TER-1112 | 98 | Clear 1280px browser proof. |
| TER-1113 | 97 | Actionable sort proof is strong. |
| TER-1114 | 96 | Low-stock control/browser proof now explicit. |
| TER-1115 | 96 | Status-bar coupling/browser proof now explicit. |
| TER-1116 | 96 | Direct-intake vs PO split is browser-proved. |
| TER-1117 | 96 | Mutual exclusion proof is explicit in browser and test ids are now stable enough for staging follow-up. |
| TER-1118 | 97 | ETA visibility proof is strong. |
| TER-1119 | 97 | Receiving status proof is strong. |
| TER-1120 | 97 | Overdue PO row styling proof is strong. |
| TER-1121 | 96 | Redirect handoff proof is now separated from seeded queue state. |
| TER-1122 | 98 | Live semantic role-badge proof is strong. |
| TER-1123 | 97 | Browser column proof is explicit. |
| TER-1124 | 97 | Browser column proof is explicit. |
| TER-1125 | 95 | Scroll restoration proof is strong locally, with only routine staging follow-up remaining. |
| TER-1126 | 97 | Live metadata proof is strong. |
| TER-1127 | 96 | Skeleton proof is strong locally; staging still matters. |
| TER-1128 | 95 | AP narrowing proof is now non-vacuous locally, with staging still required for final environment confidence. |

## Lowest-score blockers

- `TER-1110`: rerun the strengthened warning-row proof on a fresh local or staging app once auth/startup instability stops blocking the clean browser pass.
- `TER-1125`: keep staging/data-volume validation in the post-merge spot-check.
- `TER-1128`: keep the AP narrowing invariant in the post-merge staging validation so the local proof is corroborated against deployed data.
