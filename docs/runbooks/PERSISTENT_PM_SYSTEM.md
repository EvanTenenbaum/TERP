# Persistent PM System

The TERP persistent PM system is repo-backed and generated. The authoritative bundle lives under `docs/agent-context/`.

## Canonical Files

- `docs/agent-context/START_HERE.md`
- `docs/agent-context/manifest.json`
- `docs/agent-context/state.json`
- `docs/agent-context/work.json`
- `docs/agent-context/evidence.json`
- `docs/agent-context/decisions.ndjson`
- `docs/agent-context/clients.json`
- `docs/agent-context/bootstrap/`

Do not hand-edit generated PM files. Only `clients.json` and append-only `decisions.ndjson` are intended human-controlled inputs, and even those should flow through the provided scripts or reviewed PRs.

## Shared Live Bundle Across TERP Worktrees

Every TERP worktree on the same clone also shares one live PM bundle under the repo's common git dir.

Resolve it with:

```bash
git rev-parse --git-common-dir
```

Then read:

```bash
<git-common-dir>/persistent-pm/current/
```

That shared directory mirrors the current PM bundle for all TERP worktrees. Local agents should prefer it when the question is "what is the current PM state right now across this repo clone?"

## Core Commands

```bash
pnpm context:refresh
pnpm context:check
pnpm pm:launch:check
pnpm pm:checkpoint -- --client-id codex-cli-local --skip-linear-writeback
pnpm pm:publish -- --output-dir /tmp/terp-pm-public
pnpm pm:mcp:http -- --host 127.0.0.1 --port 4317
pnpm pm:onboard -- "Gemini cloud"
pnpm pm:services:install -- --dry-run --output-dir /tmp/terp-pm-launchd
```

## Onboarding A New Client Surface

New clients should start read-only unless there is a proven reason to grant more trust.

1. Add the client:

```bash
pnpm pm:onboard -- "Gemini cloud"
```

2. Read the generated bootstrap path printed by the command.
3. Hand the bootstrap file or paste-in prompt to the new model.
4. Validate the client’s read path, write path, and any MCP/tooling support before promoting trust.
5. If the client should become a mediated or first-class writer, update `clients.json` through PR review and regenerate the bundle.

Examples:

```bash
pnpm pm:onboard -- "Gemini cloud" --trust mediated-writer
pnpm pm:onboard -- "Claude Mac experimental" --trust conditional-first-class-writer --category local
pnpm pm:onboard -- "Internal QA bot" --trust read-only --read-path git-clone --read-path public-mirror
```

## Mac Mini Service Install

The Mac mini is the execution/orchestration host, not the PM authority. Install the launchd services from the repo checkout that should own PM orchestration:

```bash
pnpm pm:launch:check
pnpm pm:services:install -- --repo-root "$PWD"
```

This writes four user LaunchAgents:

- `pm-mcp-http`
- `pm-linear-reconciler`
- `pm-publisher`
- `pm-context-refresh`

Dry-run first if you want to inspect the plists:

```bash
pnpm pm:services:install -- --dry-run --output-dir /tmp/terp-pm-launchd
```

To load immediately on the current machine:

```bash
pnpm pm:launch:check
pnpm pm:services:install -- --load
```

## Hosted Surface Rules

- Hosted surfaces read from pushed git state and/or the public mirror.
- Hosted surfaces do not authoritatively edit generated PM files.
- Hosted surfaces should emit `PROPOSED_DECISION` blocks or PRs, depending on their trust level and bootstrap.
- Before switching to a hosted surface, push the relevant local branch to origin.

## Worktree Rule

- Any TERP worktree may read the shared live bundle from `<git-common-dir>/persistent-pm/current/`.
- PM writes should go through the mediator or onboarding scripts so the shared bundle and tracked bundle stay mirrored.
- Do not assume one worktree's local `docs/agent-context/` copy is fresher than the shared bundle without checking `manifest.json`.

## Drift Rules

- `product-management/START_HERE.md` is a redirect stub only.
- `pnpm context:check` should fail if legacy PM entrypoints become substantive again.
- `~/.agent-core/generate-bridges.py` is the canonical bridge generator; regenerate bridge outputs instead of hand-editing rendered bridge files.

## Verification Floor

When changing or launching the PM system:

1. Run `pnpm pm:launch:check`.
2. Treat that as the scoped PM launch gate.
3. Use broader repo validation after that when you are shipping TERP app changes.

## Launch Scope

- `pnpm pm:launch:check` is intentionally narrower than `pnpm check`, `pnpm test`, and `pnpm build`.
- Persistent PM launch depends on PM-specific integrity: PM runtime script lint, PM test suite, context refresh/check, publish smoke, and launchd/service install smoke.
- Unrelated TERP webapp regressions do not block PM launch. The PM system is allowed to launch so it can help coordinate and repair that broader repo work.
- Full repo verification remains the ship gate for TERP application changes and merge readiness.
