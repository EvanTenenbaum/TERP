# Gemini Deep QA Handoff

This folder packages the revised spreadsheet-native golden-flow pack for a deep Gemini review.

It is designed so Gemini can review:

- the visuals as rendered images
- the editable SVG source
- the TERP system truth that shaped the designs
- the current pack audit, revision logic, and terminology rules

## What is in this folder

- `design-assets/svg/`
  - 14 official pack artboards copied from `manifest.json`
- `design-assets/png/`
  - 14 rendered PNG previews of those same artboards for image-first review
- `design-assets/manifest.json`
  - route, ownership, and source-file mapping for the pack
- `context/source-files/`
  - 38 copied TERP source and doc files listed in the pack manifest
- `context/GEMINI_CONTEXT_BRIEF.md`
  - the shortest path to product truth, design goals, and known risk areas
- `context/evidence/FIGMA_IMPORT_EVIDENCE.md`
  - proof that the pack was imported into the existing Figma file and the imported node map
- `GEMINI_DEEP_QA_PROMPT.md`
  - the improved prompt to paste into Gemini
- `GEMINI_CLI_EXECUTION_PROMPT.md`
  - the execution-grade read-only prompt used for the successful Gemini CLI run
- `GEMINI_REVIEW_REPORT.md`
  - Gemini's saved deep QA review of the full packet

## Recommended Gemini upload order

1. `GEMINI_DEEP_QA_PROMPT.md`
2. `context/GEMINI_CONTEXT_BRIEF.md`
3. all files in `design-assets/png/`
4. all files in `design-assets/svg/`
5. the `context/source-files/` folder or the most relevant files inside it if Gemini context is tight
6. `context/evidence/FIGMA_IMPORT_EVIDENCE.md`

## How this package is meant to be used

Start Gemini with the prompt in `GEMINI_DEEP_QA_PROMPT.md`, then give it the context brief before the rest of the files. The brief tells Gemini which system behaviors are trust-critical and which pack gaps are already known.

Use the PNGs for quick visual review first. Use the SVGs when Gemini needs exact labels, panels, and visible terminology. Use `context/source-files/` when Gemini needs to verify that a design suggestion does or does not match TERP route ownership, workflow logic, lifecycle depth, or terminology policy.

## Review standard

The best Gemini feedback for this pack should:

- stay anchored to TERP route and module ownership
- distinguish visual polish issues from system-truth mismatches
- call out under-modeled or missing lifecycle depth
- protect no-loss flows like seeded entry, drafts, and trust-critical commits
- flag terminology drift and hidden workflow seams
- prioritize helpful corrections over generic design taste
