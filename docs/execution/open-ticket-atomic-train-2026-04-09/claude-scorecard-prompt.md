You are performing a skeptical adversarial review of the April 9, 2026 TERP UI ticket train.

Scope:
- Review every ticket in `TICKET_MANIFEST.md`
- Use the implementation notes, runtime evidence, and patch diff to judge whether each ticket is actually complete
- Be conservative: if evidence is thin, score down
- Do not assume a ticket is done just because the roadmap says so

Files to use:
- `docs/execution/open-ticket-atomic-train-2026-04-09/TICKET_MANIFEST.md`
- `docs/execution/open-ticket-atomic-train-2026-04-09/ROADMAP.md`
- `docs/execution/open-ticket-atomic-train-2026-04-09/Implement.md`
- `docs/execution/open-ticket-atomic-train-2026-04-09/Documentation.md`
- `docs/execution/open-ticket-atomic-train-2026-04-09/runtime-route-audit.json`
- `docs/execution/open-ticket-atomic-train-2026-04-09/runtime-ui-checks.json`
- `docs/execution/open-ticket-atomic-train-2026-04-09/review-diff.patch`

Scoring rubric:
- `95-100`: strong code coverage plus convincing evidence for the intended behavior; no material risk seen
- `90-94`: likely complete, but one minor evidence or edge-case gap remains
- `80-89`: partial confidence; meaningful evidence gap, unclear acceptance coverage, or non-trivial regression risk
- `70-79`: substantial uncertainty or likely partial implementation
- `<70`: likely not complete, materially risky, or mismatched to the ticket

Required output behavior:
- Produce exactly one score entry for every ticket from `TER-1092` through `TER-1139`
- Keep rationales short and specific
- Cite concrete evidence file names or code areas in `evidence_refs`
- If a score is below `95`, include a concise `upgrade_actions` list with only the atomic moves needed to reach at least `95`
- Surface the highest-risk cross-ticket findings in `global_findings`

Output constraints:
- Return valid JSON only
- Follow the provided schema exactly
