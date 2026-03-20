# Gemini CLI Execution Prompt

You are reviewing a TERP spreadsheet-native design handoff packet that is available in your included workspace directory.

The entire handoff folder has been included for you locally. Do not assume files are attached separately. Read them from the included directory structure.

Packet root:

`/Users/evan/spec-erp-docker/TERP/TERP/docs/design/spreadsheet-native-golden-flows-2026-03-18/gemini-deep-qa-handoff-2026-03-19`

Read-only rule:

- Do not call `write_file`, `replace`, or any other file-modifying tool.
- Do not attempt to edit, save, or rewrite files anywhere in the workspace.
- Read files only and return the final review as plain markdown in stdout.
- If a relative path does not resolve, use the absolute packet-root path above.

## Start here

Read these files first, in this order:

1. `/Users/evan/spec-erp-docker/TERP/TERP/docs/design/spreadsheet-native-golden-flows-2026-03-18/gemini-deep-qa-handoff-2026-03-19/README.md`
2. `/Users/evan/spec-erp-docker/TERP/TERP/docs/design/spreadsheet-native-golden-flows-2026-03-18/gemini-deep-qa-handoff-2026-03-19/context/GEMINI_CONTEXT_BRIEF.md`
3. `/Users/evan/spec-erp-docker/TERP/TERP/docs/design/spreadsheet-native-golden-flows-2026-03-18/gemini-deep-qa-handoff-2026-03-19/GEMINI_DEEP_QA_PROMPT.md`
4. `/Users/evan/spec-erp-docker/TERP/TERP/docs/design/spreadsheet-native-golden-flows-2026-03-18/gemini-deep-qa-handoff-2026-03-19/design-assets/manifest.json`
5. `/Users/evan/spec-erp-docker/TERP/TERP/docs/design/spreadsheet-native-golden-flows-2026-03-18/gemini-deep-qa-handoff-2026-03-19/context/evidence/FIGMA_IMPORT_EVIDENCE.md`

Then inspect:

- all files in `/Users/evan/spec-erp-docker/TERP/TERP/docs/design/spreadsheet-native-golden-flows-2026-03-18/gemini-deep-qa-handoff-2026-03-19/design-assets/png/`
- all files in `/Users/evan/spec-erp-docker/TERP/TERP/docs/design/spreadsheet-native-golden-flows-2026-03-18/gemini-deep-qa-handoff-2026-03-19/design-assets/svg/`
- the highest-priority TERP source and doc files referenced in `/Users/evan/spec-erp-docker/TERP/TERP/docs/design/spreadsheet-native-golden-flows-2026-03-18/gemini-deep-qa-handoff-2026-03-19/context/GEMINI_CONTEXT_BRIEF.md`
- the copied files in `/Users/evan/spec-erp-docker/TERP/TERP/docs/design/spreadsheet-native-golden-flows-2026-03-18/gemini-deep-qa-handoff-2026-03-19/context/source-files/`, especially the pack audit, revision brief, terminology bible, Sales Order logic, Sales Sheets router, payment flow, flow guide, flow matrix, and samples router

## Review goal

Perform a full deep QA review of the packet using the exact review standard in `GEMINI_DEEP_QA_PROMPT.md`.

This is a system-truth and design-quality review, not a greenfield redesign exercise.

## Important rules

- Stay grounded in the TERP logic and terminology captured in the included files.
- Treat the PNGs and SVGs as the visual source of truth for the current design state.
- Treat the copied TERP source files and docs as the product and workflow truth that the designs must respect.
- If a design looks weak but the underlying TERP system truth is correct, call it a design issue, not a product-behavior issue.
- If a design suggestion would require changing real product behavior, label it as a product proposal rather than a design correction.
- Cite specific file paths when making important claims.

## Output

Return one complete markdown report following the section structure in `/Users/evan/spec-erp-docker/TERP/TERP/docs/design/spreadsheet-native-golden-flows-2026-03-18/gemini-deep-qa-handoff-2026-03-19/GEMINI_DEEP_QA_PROMPT.md`.
