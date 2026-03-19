You are reviewing the spreadsheet-native implementation handoff for TERP.

Your job is not to judge whether the mock looks nice. Your job is to judge whether this packet can become a trustworthy implementation source of truth without dropping current TERP behavior or duplicating older work badly.

Review target:

- `spreadsheet-native-build-source-of-truth.md`
- `spreadsheet-native-pack-capability-ledger-summary.md`
- `spreadsheet-native-pack-capability-ledger.csv`
- `spreadsheet-native-pack-discrepancy-log.md`
- the four durable state files in this folder when helpful

Important context:

- The Figma pack in the parent folder is directional only. It is not implementation truth.
- Orders and Inventory already have detailed capability ledgers in `docs/specs/spreadsheet-native-ledgers/`. Those are supposed to be reused here, not rewritten.
- The rest of the modules did not yet have the same level of ledger coverage, so this packet is supposed to create the next implementation handoff without pretending parity is already verified.
- A 2026-03-19 narrated screen recording already established that many visible controls in the mock are placeholders and should not be literalized.

Review questions:

1. Does this packet clearly establish the right source-precedence order and stop rules?
2. Does it reuse existing authoritative work instead of duplicating or contradicting it?
3. Are any real current-code capabilities missing from the new ledger or source-of-truth doc?
4. Are any claims too certain where the packet should instead call out an open question or discrepancy?
5. Are the next steps actionable enough for future agents to continue module-by-module without losing logic, outputs, or adjacency?
6. Are there any places where the recording feedback is being misapplied as literal workflow truth?

Review style:

- Findings first.
- Prioritize preservation gaps, false assumptions, contradiction with current TERP reality, and verification weakness.
- Be skeptical.
- Keep suggestions concrete enough to patch the docs immediately.
