# Session: DROID-FACTORY-SETUP-ALIGN - Align Factory Droid with TERP protocol

**Status**: In Progress
**Started**: 2026-04-20
**Agent Type**: Factory Droid (droid-cli-local)
**Branch**: droid/factory-setup-align-guardrails
**PR**: https://github.com/EvanTenenbaum/TERP/pull/595
**Risk Level**: LOW (no runtime code changed; PM-bundle surface registry + Droid operational defaults only)

## Objective

Resolve the collision points between Factory Droid defaults (just configured at the user level) and TERP's existing agent protocol, so Droid sessions in this repo honor the PM bundle, surface-trust rules, and review criteria instead of racing with them.

## Scope

- `docs/agent-context/clients.json` — register 5 Droid surfaces as mediated-writer.
- `docs/agent-context/bootstrap/droid.md` — shared bootstrap doc for the new entries.
- `.factory/settings.json` — repo-level override pinning `autonomyMode=auto-medium` inside TERP.
- `.factory/skills/review-guidelines/SKILL.md` — auto-loaded by `Factory-AI/droid-action@v3` during PR auto-review; injects TERP-specific review criteria.

## Progress

- [x] Phase 1: Read current `clients.json`, `droid-review.yml`, `docs/agent-context/` bundle.
- [x] Phase 2: Draft 5 new surface entries (mediated-writer, PR-only writes, shared bootstrap doc).
- [x] Phase 3: Author repo-level `.factory/settings.json` with TERP-aligned allow/deny lists.
- [x] Phase 4: Author `.factory/skills/review-guidelines/SKILL.md` with domain invariants, protocol checks, evidence expectations.
- [x] Phase 5: Commit + push + open PR #595.
- [ ] Phase 6: Address any CI or review feedback.
- [ ] Phase 7: Merge.

## Notes

- Factory Droid now has no PM-MCP adapter, so all 5 surfaces are `mediated-writer` + `writeMode: pull-request`. When an adapter ships, surfaces can be promoted.
- The local `~/.factory/skills/terp-session-bootstrap` skill was updated to default every TERP session into a named worktree (`droid/TER-XXXX-...`) so edits don't land on `main` in the canonical checkout. That is a personal-layer change, not part of this PR.
- The `@droid` mention workflow (`.github/workflows/droid.yml`) and auto-review (`droid-review.yml`) do not need edits — `Factory-AI/droid-action@v3` auto-picks up `.factory/skills/review-guidelines/SKILL.md`.

## Evidence

- `python3 -m json.tool docs/agent-context/clients.json` — valid.
- `python3 -m json.tool .factory/settings.json` — valid.
- `verify-agent-context` CI check: pass.
- No runtime code touched; `pnpm check`, `pnpm lint`, `pnpm test` unaffected.

## Handoff Notes

**What was completed:**
- 5 Droid surfaces registered in the PM-bundle client registry with correct trust posture.
- Shared Droid bootstrap doc written.
- Repo-level Factory settings pinning auto-medium inside TERP.
- Review-guidelines skill that auto-loads during Droid PR reviews.

**What's pending:**
- CI green light (validate-agent-session, droid-review, unit-tests, static-analysis).
- Merge of PR #595.
- Future follow-up (not this PR): build a Droid PM-MCP adapter so `droid-mac-app`, `droid-cli-local`, and `droid-droplet-byom` can be promoted from `mediated-writer` to `conditional-first-class-writer`.

**Known issues:**
- None.
