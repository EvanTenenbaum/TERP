# Orders Runtime Closure Remediation Roadmap

- Date: `2026-03-20`
- Branch: `codex/orders-runtime-closure-remediation-20260320`
- Trigger: adversarial closure audit found code gaps, test gaps, and premature retirement claims

## Objectives

1. Fix the runtime bugs called out in the audit.
2. Fill the missing automated test coverage for the regression paths that were not actually proven.
3. Repair the proof artifacts and gate docs so repo truth matches real evidence.
4. Restore honest fallback and reopen policy instead of leaving a premature retirement claim in place.

## Workstreams

### Runtime hardening

- Batch document paste writeback to one `onChange` per paste instead of one per cell.
- Reject invalid manual `isSample` edits instead of coercing them to `false`.
- Validate pasted numeric values before grid writeback.
- Deduplicate blocked/error toasts through the shared 300ms suppression path.
- Refetch queue, detail, status history, audit, and ledger evidence together from the queue refresh action.
- Restore explicit classic fallback on both Orders and create-order routes.

### Test coverage

- Add regression tests for toast dedupe, invalid manual sample edits, invalid pasted numeric values, and paste batching.
- Add Orders sheet pilot tests for keyboard hints, affordance visibility, and full refresh fan-out.
- Fix the `ConfirmDialog` mock so the test exercises the real `open` prop shape.

### Proof and tracker honesty

- Add a dedicated staging selection probe for `SALE-ORD-019`.
- Replace the missing selection packet with a fresh live packet.
- Reconcile `ter-795-state.json`, `02-proof-row-map.csv`, `execution-metrics.json`, rollout contract statuses, and G6/G7 verdict docs.
- Pause retirement until the charter’s proof-complete standard is actually met.

## Exit Conditions

- Local verification passes: `pnpm check`, `pnpm lint`, targeted vitest, `pnpm test`, `pnpm build`.
- Staging selection packet exists and is linked from G2 durable files.
- The repo no longer claims `retired` while proof-complete remains false under the charter.
