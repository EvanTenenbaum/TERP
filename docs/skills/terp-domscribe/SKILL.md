---
name: terp-domscribe
description: Local implementation-time UI inspection for TERP using Domscribe. Use when a TERP UI change depends on live browser truth such as actual classes, rendered text, conditional branches, props, state, or click-to-code capture from the running app.
---

# TERP Domscribe

Use this skill when local TERP implementation work needs live runtime context from the running browser, not just source inspection.

## When to Use It

- Styling or layout bugs
- Conditional rendering confusion
- Wrong text, attributes, or classes at runtime
- Click a real UI element and route the change back to the correct source
- Verify that a local UI edit actually changed the rendered output

## Prerequisites

1. Run `pnpm dev`
   If you need a fast local runtime-inspection session without DB bootstrap, run `pnpm domscribe:dev` instead.
2. Open the relevant TERP page in a browser
3. Confirm relay health with `pnpm domscribe:status`

If the relay is not running yet, wait for the dev server to finish booting and refresh the browser page.
The in-browser overlay starts collapsed by default, so seeing only the root
overlay shell is normal until you expand it.

## Recommended Workflow

1. Identify the UI issue.
2. Tell Codex to use Domscribe before editing.
3. Inspect the live runtime context for the target source location.
4. Make the code change.
5. Re-check the same UI with Domscribe after the edit.
6. Use broader TERP verification only after the local runtime behavior looks right.

## How To Read the Result

- `browserConnected: true` means the page is open and the relay can ask the browser for live context.
- `browserConnected: false` means runtime truth is not available yet. Do not guess from source. First make sure `pnpm dev` is running and the target page is open in a browser, then retry.
- `runtime.rendered: true` means Domscribe found a real rendered target for that source location.
- `runtime.rendered: false` does not always mean the page is wrong. In TERP it often happens for wrapper components such as `CardTitle`, `Input`, or other component abstractions that do not map directly to a single DOM node. When that happens, step outward to the nearest native element or parent container and query that line instead.
- `runtime.domSnapshot` is the most useful browser-truth payload for styling and rendering bugs. Use its `attributes`, `class`, and `innerText` values to decide what to change.
- `runtime.componentProps` and `runtime.componentState` are implementation hints, not proof by themselves. They help explain why the UI looks the way it does, but the rendered DOM snapshot is the real local truth.

## Required Agent Behavior

When using Domscribe in TERP, agents should:

1. Query before editing when the bug depends on what is actually rendered.
2. Prefer querying a native rendered element over a higher-level wrapper component.
3. Treat `browserConnected: false` as a runtime blocker, not as permission to speculate.
4. Use the returned `domSnapshot`, `componentProps`, and `componentState` to choose the smallest likely code fix.
5. Re-query the same source location or nearest rendered parent after the edit and confirm the runtime output changed as expected.
6. Hand off broader flow validation to `docs/skills/terp-qa/SKILL.md` after the local runtime shape is correct.

## Prompt Patterns

- `Use domscribe to inspect this component before editing it.`
- `Use domscribe to tell me what is actually rendered for this line, then fix the bug.`
- `After the edit, use domscribe again and confirm the browser output changed.`
- `If the queried wrapper component is not rendered directly, move outward to the nearest native rendered element and retry.`

## When Not to Use It

- Pure backend changes
- Non-UI refactors
- Type-only cleanup
- Cases where the component is not rendered anywhere yet

## Relationship to Other TERP Skills

- `docs/skills/terp-qa/SKILL.md` is for broader verification after implementation.
- Domscribe is the implementation-time local browser truth tool.
- Domscribe is strongest for local runtime truth, not release proof.
- Claude-native repo guidance lives in `.claude/skills/terp-domscribe/SKILL.md`.
