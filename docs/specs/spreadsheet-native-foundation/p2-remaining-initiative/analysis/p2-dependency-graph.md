# P2 Dependency Graph

## Primary Gate

- `TER-1067` must normalize repo truth, proof truth, and tracker truth before tranche execution resumes.

## Execution Edges

- `TER-1068` depends on `TER-1067`
- `TER-1069` depends on the retrieval defaults / portable-cut decisions stabilized in `TER-1068`
- `TER-1070` can be explored in parallel with `TER-1068` where it stays outside retrieval continuity, but its settlement-facing work should reuse the proof patterns hardened in `TER-1067`
- `TER-1071` is a decision pass and should stay behind the active tranche work

## Child-Issue Grouping

- `TER-1072` and `TER-1073` sit under `TER-1068`
- `TER-1074` and `TER-1075` sit under `TER-1069`
- `TER-1076` sits under `TER-1070`

## Practical Sequencing

1. Normalize `TER-1067`
2. Start `TER-1068`
3. Open `TER-1070` only on seams that do not require retrieval-to-commit decisions first
4. Start `TER-1069` after the retrieval contract is explicit
5. Run `TER-1071` after the active tranches have hard evidence
