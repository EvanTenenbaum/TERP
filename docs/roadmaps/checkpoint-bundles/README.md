# Checkpoint Bundles

Each checkpoint close creates one bundle folder:

- `checkpoint-<n>-<timestamp>/bundle.md`
- per-command logs for:
  - baseline quartet (`check/lint/test/build`)
  - local domain QA
  - staging runtime smoke/domain QA (if configured)

## Commands

```bash
# Verify resolver mapping contract first
scripts/ci/verify-release-train-impact-map.sh

# Ticket fast loop (targeted)
scripts/qa/release-train/ticket-fast-loop.sh --help

# Checkpoint baseline gate
scripts/qa/release-train/checkpoint-gate.sh --help

# Final release gate
scripts/qa/release-train/final-gate.sh <staging-url>
```

## Balanced Ladder Rules

1. Per-ticket: `pnpm check` + targeted tests + `qa:test:smoke` + impacted domain QA.
2. Per-checkpoint: run full quartet once and link baseline evidence to all tickets.
3. RED tickets: include adversarial evidence and rollback reference before Done.
4. Do not mark checkpoint tickets Done until staging runtime validation is attached.
