# Evidence Packet And Replay Checklist

Date: 2026-03-11

This is the minimum proof contract for every closure claim in the March 10 recording backlog.

## Minimum evidence packet

Every closure claim must attach all applicable proof classes:

1. Code/config proof
   - changed file references
   - short explanation of what contract changed
2. Test proof
   - targeted commands for the touched area
   - outcome
3. Browser/runtime proof
   - required for every user-facing change
   - must be captured on staging before the row is finally marked closed
4. Ledger proof
   - row update in `01-coverage-ledger.*`
   - matching owner issue reference
5. Crosswalk proof
   - row must appear under the right atomic issue in `02-finding-crosswalk.md`

## Required repo gates before merge

```bash
pnpm check
pnpm lint
pnpm test
pnpm build
```

## Required staging gates before closure

1. Merge the work into the staging line.
2. Wait for staging deployment to complete successfully.
3. Confirm app health before browser proof.
4. Replay the exact recording complaint on staging under the row-declared persona.
5. Capture artifacts.
6. Only then move the row to `closed with evidence` or `rejected with evidence`.

## Replay checklist by row

For every row that is not already carried forward by proven baseline evidence:

- Confirm the row id and owner issue.
- Confirm the required persona.
- Confirm the required data prerequisites.
- Reproduce the original complaint or target flow.
- Verify the new behavior on staging.
- Record whether the complaint is now:
  - fixed and proven
  - still partially fixed
  - not fixed
  - not a valid bug after replay
- Update the ledger and crosswalk immediately after proof, not later.

## Screenshots vs deeper runtime proof

- Screenshot only is acceptable for static label, spacing, and hierarchy corrections.
- Interactive browser proof is required for create/edit/save/process/transition flows.
- Logic-heavy fixes need both browser proof and code/test proof.
- Role-gated flows need proof under the declared persona, even if a broader admin persona could also reach the route.

## Final replay gate

`TER-713` may start only when all implementation issues have already shipped to staging and no issue is waiting on local-only proof.
