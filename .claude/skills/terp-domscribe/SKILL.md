---
name: terp-domscribe
description: Local TERP UI runtime inspection with Domscribe for Claude agents. Use when rendered browser truth matters more than source inspection alone.
---

# TERP Domscribe

Use this skill when a TERP task depends on what is actually rendered in the local browser.

## When to Use It

- styling or layout bugs
- conditional rendering confusion
- wrong text, classes, or attributes at runtime
- click-to-code or overlay inspection for a live element
- verifying that a local UI edit changed the actual browser output

## Prerequisites

1. Start the app with `pnpm dev`
   If local DB bootstrap is getting in the way of a quick UI-debug session, use `pnpm domscribe:dev`.
2. Open the target TERP page in a normal browser.
3. Confirm relay health with `pnpm domscribe:status`.
4. Make sure project `.mcp.json` exists so Claude can see the Domscribe MCP server.
5. The overlay starts collapsed by default, so a minimal root overlay shell is normal until you expand it.

## Workflow

1. Inspect before editing when the issue depends on rendered UI truth.
2. Prefer the nearest native rendered element if a wrapper component returns `rendered: false`.
3. Use `domSnapshot` as the main proof payload for classes, attributes, and visible text.
4. Treat `componentProps` and `componentState` as hints, not final proof.
5. Re-query after the edit and confirm the browser output changed as expected.
6. Hand off broader proof to `docs/skills/terp-qa/SKILL.md` after the local runtime shape is correct.

## Result Handling

- `browserConnected: false`
  Runtime blocker. Refresh the page or fix the relay/browser state before guessing.
- `runtime.rendered: false`
  Often normal for TERP wrapper components. Move outward to the nearest DOM-producing element and retry.
- `runtime.domSnapshot`
  Primary browser-truth payload.
- overlay / annotations
  Useful for local UI-to-code debugging, but still validate the final result with a runtime re-check.

## Prompt Patterns

- `Use Domscribe to inspect the live runtime state before editing this UI.`
- `Use Domscribe on the rendered element, tell me what is actually on screen, then fix the bug.`
- `Use Domscribe after the edit and confirm the browser output changed the way we expect.`
