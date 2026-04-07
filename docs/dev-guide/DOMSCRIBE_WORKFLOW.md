# Domscribe Workflow for TERP

## Purpose

Domscribe gives Codex live UI context from the running TERP app during local development. It is meant for implementation-time browser truth, not as a replacement for Playwright or post-merge QA.

Use it when a change depends on what the user actually sees in the browser:

- visual regressions
- wrong classes or attributes
- conditional rendering confusion
- unexpected props or state at render time
- UI-to-code handoff from a clicked element

## What Is Wired in This Repo

- `@domscribe/react` is added as a dev dependency.
- `vite.config.ts` loads Domscribe only in development, pins `rootDir` to the repo root because TERP serves Vite from `client/`, preserves the official overlay injection, and adds a TERP-specific runtime bridge so agents can still query live browser context in the custom Express + Vite middleware setup.
- `.codex/config.toml` exposes the Domscribe MCP server to Codex.
- `.mcp.json` exposes the same Domscribe MCP server to Claude Code at the project level.
- `.claude/skills/terp-domscribe/SKILL.md` tells Claude agents how to use the runtime result instead of treating it like a generic MCP tool.
- `.domscribe/` is gitignored because it stores local manifests and relay state.
- `server/_core/index.ts` disables CSP only in development so Vite and Domscribe dev injection can run. Production CSP stays intact.

## Normal TERP Flow

1. Start TERP with `pnpm dev`.
   If you want the fastest Domscribe-ready local session and do not need DB bootstrap first, use `pnpm domscribe:dev`.
2. Open the target page in a browser.
3. Verify the relay with `pnpm domscribe:status`.
4. In Codex or Claude, explicitly ask for Domscribe use before editing.
5. Use either:
   - a runtime query from the agent, or
   - the in-browser overlay to inspect/capture the rendered element directly.

The overlay initializes in `collapsed` mode by default. Seeing the root
overlay shell without the full sidebar open is normal; expand it before
treating overlay UI as missing.

Interpret the result carefully:

- `browserConnected: true` means the relay can reach the open browser page.
- `browserConnected: false` means the page is not connected yet, so runtime truth is not available.
- `runtime.rendered: false` can be normal for wrapper components that do not map directly to a single DOM element. In that case, query a nearby native element or parent container instead of treating it as a bug by itself.
- `runtime.domSnapshot` is the most useful payload for actual rendered classes, attributes, and text.

Example prompts:

- `Use domscribe to inspect the live runtime state for this component before changing it.`
- `Query this source location with domscribe, tell me what is actually rendered, then fix the styling issue.`
- `Use domscribe after the edit to confirm the browser output changed the way we expect.`

## Browser Guidance

Primary recommendation: use a normal browser window for the page you want to inspect.

You can try VS Code's embedded browser for convenience, but treat a standard browser as the first-choice path until the embedded workflow proves equally reliable for your use case.

## What Domscribe Does Not Replace

- `pnpm test:e2e`
- `pnpm test:staging-critical`
- `pnpm test:e2e:deep:all`
- broader QA evidence requirements from `docs/skills/terp-qa/SKILL.md`

Domscribe helps Codex see local runtime truth during implementation. Playwright and QA still prove the broader flow works.

## Useful Commands

```bash
pnpm dev
pnpm domscribe:dev
pnpm domscribe:status
pnpm domscribe:stop
```

## VS Code Tasks

This repo also includes workspace tasks for the common local loop:

- `TERP: Domscribe Dev`
- `TERP: Domscribe Status`
- `TERP: Domscribe Stop`

## Troubleshooting

### `pnpm domscribe:status` says the relay is not running

- Make sure `pnpm dev` is running.
- Refresh the page in the browser after the dev server starts.

### Codex does not use Domscribe automatically

Tell it to do so explicitly. Domscribe is most effective when the prompt says to inspect runtime state before editing.

### Claude does not see the Domscribe MCP server

Make sure the project `.mcp.json` file exists. This repo includes a gitignored project-level MCP entry for Domscribe so Claude can use the same local relay as Codex.

### Runtime context is missing

The page must be open and the target component must actually be rendered in the connected browser session.

If `browserConnected` stays false, refresh the page after `pnpm dev` is fully booted and retry the query.

If `rendered` is false for a wrapper component such as `CardTitle`, `Input`, or another abstraction component, retry on the nearest native DOM-producing line instead.
