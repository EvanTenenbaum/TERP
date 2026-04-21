# Bootstrap: Factory Droid surfaces

This file is the shared bootstrap for every Droid-family surface registered in `docs/agent-context/clients.json`:

- `droid-mac-app` — Factory Droid desktop app on a trusted Mac
- `droid-web` — app.factory.ai sessions targeting a BYOM computer
- `droid-cli-local` — `droid` / `droid exec` run from a trusted local terminal
- `droid-droplet-byom` — the always-on Factory daemon at `/etc/systemd/system/droid-daemon.service` on DO droplet `159.89.32.112`, user `factory-user`
- `droid-exec-ci` — `Factory-AI/droid-action@v3` running from `.github/workflows/droid.yml` or `droid-review.yml`

## Required startup reads

Before proposing any change, Droid must read, in this order:

1. `./AGENTS.md`
2. `./CLAUDE.md`
3. `docs/agent-context/START_HERE.md` (or `<git-common-dir>/persistent-pm/current/START_HERE.md` inside a TERP worktree)
4. `docs/agent-context/manifest.json` + `state.json` + `work.json`
5. `docs/agent-context/clients.json` — confirm this surface's entry and trust level

Treat the PM bundle as authoritative. Treat `docs/ACTIVE_SESSIONS.md`, `docs/PROJECT_CONTEXT.md`, `docs/TERP_AGENT_INSTRUCTIONS.md`, `docs/ROADMAP_AGENT_GUIDE.md`, and `product-management/START_HERE.md` as legacy/background.

## Write posture

All five Droid surfaces are **mediated-writer**: code changes are allowed, but PM-bundle writes must go through a pull request. There is no `pm-mcp` adapter for Droid today. Follow the existing `writeMode: pull-request` + `signingMode: git-identity` pattern used by `codex-cloud` and `claude-code-cloud`.

## Operational expectations

- **Branch naming:** `droid/TER-XXXX-<short-kebab-summary>` so Linear auto-links. Alternatives that already exist in the repo are acceptable if they also include the ticket ID.
- **Worktrees:** For any substantive change, work in a named worktree (`droid exec -w droid/TER-XXXX-...`) rather than directly on `main` in the canonical checkout. Respect the cross-cutting rule from `/Users/evan/AGENTS.md`: pushes from agent worktrees are blocked by default; only an intentional integrator override should bypass that guard.
- **Pre-flight commands:** `pnpm agent:prepare` (in local worktrees) → `pnpm check` → `pnpm lint` → `pnpm test --run`. Zero TypeScript errors.
- **PR path:** open via the Factory GitHub App (`droid.yml` / `droid-review.yml` are installed on this repo). Never force-push `main`.
- **Auto-review:** every PR is auto-reviewed by `droid-review.yml`. The review picks up `.factory/skills/review-guidelines/SKILL.md` automatically.
- **Linear:** every substantive change needs a Linear ticket; use the Linear MCP to create or update as the work progresses.

## Autonomy

- The user-level `~/.factory/settings.json` default is `auto-high`. Inside this repo the project-level `.factory/settings.json` pins `auto-medium`. The stricter setting wins. Respect that — ask before anything that would `git push`, touch production infra, or modify external services.
- The Hermes dispatch wrapper (`/usr/local/bin/droid-dispatch` on the droplet) defaults to `readonly`; it only escalates when the caller explicitly passes `low | medium | high`. Treat any session that began from Hermes as starting from the caller-supplied autonomy.

## Surface-specific notes

- **droid-mac-app / droid-cli-local**: trusted local infra. Normal dev loop. Still PR-mediated for PM writes.
- **droid-web**: sessions typically target `terp-droplet`. Filesystem access is to the droplet's checkout, not the Mac.
- **droid-droplet-byom**: shared host (also runs Hermes gateway and OpenClaw). Never use `--skip-permissions-unsafe`. Never consume all CPU/memory — keep resource-heavy tasks scoped.
- **droid-exec-ci**: ephemeral GH Actions runner. No access to local PM bundle, only the git tree. Always operate in `pull-request` write mode.

## Failure modes to surface

- PM bundle stale or missing → ask the user how to refresh; do not invent state.
- `pnpm agent:prepare` failure → stop; paste the output.
- Linear MCP unavailable → ask whether to proceed without Linear tracking (discouraged for substantive work).
- Droid daemon inactive on droplet → surface `systemctl status droid-daemon.service` output and stop.
