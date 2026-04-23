# TERP Usability Review — April 2026

This folder contains a full all-pages usability review of TERP conducted on the April 2026 staging build, the implementation strategy proposed for closing the findings, and an internal QA report on that strategy. Everything here is an input to downstream planning; nothing here changes application code.

## Read in this order

1. **[`01-Usability_Review_AllPages.md`](./01-Usability_Review_AllPages.md)** — 270 findings across 65 distinct pages. Every finding is graded P0/P1/P2/P3 and cites the baseline entity it must preserve. Produced by walking every page in `FUNCTIONAL_BASELINE.md` on live staging at 1440×900, capturing a screenshot, and analyzing each with Claude Opus 4.7 (vision + adaptive extended thinking, `xhigh` effort on the 17 daily-use pages, `high` on the rest) under a senior-design-critic system prompt that forbids removing any baseline functionality. Section 2 of this file consolidates the findings into 15 cross-cutting themes.
2. **[`02-Implementation_Strategy.md`](./02-Implementation_Strategy.md)** — the plan for closing the 270 findings systemically: 14 shared primitive upgrades, 5 config-file edits, 4 codemods, 7 ESLint rules, 12 feature flags, sprint-by-sprint rollout, and anti-drift governance. The core insight: **change the primitive, not the page**.
3. **[`03-Strategy_QA_Report.md`](./03-Strategy_QA_Report.md)** — an honest QA of the strategy against the actual codebase. Identifies three materially wrong claims (misnamed grid primitive, missing Sprint-5 residuals for legacy `AgGridReact` call sites, inflated per-primitive finding counts) and five medium ones, with required corrections enumerated in §7. Read this before taking the strategy literally. **Verdict: Go, with five corrections applied.**

## Supporting artifacts

- **[`finding_to_primitive.csv`](./finding_to_primitive.csv)** — machine-readable map of every finding to the primitive or config file that closes it. Regenerate with `scripts/classify_findings.py`.
- **[`findings/`](./findings/)** — per-page JSON output from Opus 4.7. One file per page. Contains: `assessment`, `preserved_baseline_entities`, and `findings[]` where each finding has `id`, `severity`, `title`, `what_is_wrong`, `proposed_fix`, `functionality_preserved`, `baseline_entity`, and `confidence`.
- **[`excerpts/`](./excerpts/)** — the baseline excerpt sent to Opus for each page, generated from `FUNCTIONAL_BASELINE.md`.
- **[`runtime-notes/`](./runtime-notes/)** — lightweight runtime observations captured during the walkthrough (text in viewport, route loaded, any observed errors).
- **[`screenshots/`](./screenshots/)** — the screenshot sent to Opus for each page, plus a scrolled second viewport for daily-use pages (`_scroll2` suffix).
- **[`FUNCTIONAL_BASELINE.md`](./FUNCTIONAL_BASELINE.md)** + **[`FUNCTIONAL_BASELINE_RUNTIME.md`](./FUNCTIONAL_BASELINE_RUNTIME.md)** — snapshot of the functional baseline docs that the review is measured against. The live copies live in `docs/`; these are frozen for reproducibility.
- **[`scripts/`](./scripts/)** — the reproducibility toolchain. `capture_all.py` walks the site headless; `critique_page.py` runs one Opus analysis; `run_all_critiques.py` runs all 65 in parallel; `build_excerpts.py` and `assemble_report.py` do pre- and post-processing.
- **[`opus_4_7_notes.md`](./opus_4_7_notes.md)** — method notes on how Opus 4.7 was prompted (vision best practices, thinking-effort choice, system-prompt shape).

## How to reproduce on a future staging build

```bash
cd docs/ux-review/scripts
export TERP_USERNAME='qa.superadmin@example.com'
export TERP_PASSWORD='...'
export ANTHROPIC_API_KEY='...'
python3 capture_all.py            # ~6 min, writes screenshots/
python3 build_excerpts.py         # ~5 sec, writes excerpts/
python3 run_all_critiques.py      # ~55 min at concurrency 5, writes findings/
python3 assemble_report.py        # ~5 sec, writes 01-Usability_Review_AllPages.md
```

Expected cost per run: ~$10 in Anthropic API usage.

## Headline numbers

- **Pages audited:** 65
- **Findings:** 270 — 11 P0, 106 P1, 135 P2, 18 P3
- **Cross-cutting themes:** 15 (T-01 … T-15)
- **Primitive-closable findings:** 192 (~71%)
- **Genuinely per-page findings:** 78 (~29%) — 3 P0, 25 P1, 36 P2, 4 P3
- **Planned primitive upgrades:** 14
- **Planned config edits:** 5 files
- **Estimated effort (per QA report):** 7–8 engineer-weeks for two engineers; 12–15 for one solo engineer

## Known corrections (see `03-Strategy_QA_Report.md` §7)

The strategy document has five known errors that should be applied before it is used as a work plan:

1. The canonical grid primitive is `PowersheetGrid` (wrapper), not `SpreadsheetPilotGrid` (inner). Rename in lint rules, codemods, and prose; the architectural claim still holds because `PowersheetGrid` forwards props.
2. Four files use `AgGridReact` directly outside `SpreadsheetPilotGrid` (`spreadsheet/ClientGrid.tsx`, `spreadsheet/InventoryGrid.tsx`, `spreadsheet/PickPackGrid.tsx`, `work-surface/DirectIntakeWorkSurface.tsx`). Add to Sprint 5 residuals; allow-list in lint until migrated.
3. Per-primitive finding counts were derived by keyword-matching and are inflated. The corrected distribution is in §3 of the QA report.
4. Pick List is not a filter over Orders (it uses `trpc.orders.getPickList`, a distinct endpoint with a different row shape). Keep as a distinct surface under a Fulfillment sub-tab. Quotes, however, genuinely is a filter over `trpc.orders.getAll` with `orderType: "QUOTE"`.
5. Sprint cadence is aspirational. Realistic: 7–8 engineer-weeks for two; 12–15 for one.

## Ownership

Produced by Manus AI at the request of the repo owner. For questions about method, start with `opus_4_7_notes.md`. For questions about findings, inspect the JSON in `findings/` — every finding has a traceable rationale and screenshot.
