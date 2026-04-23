# TERP Infrastructure Access — Agent Onboarding

Last refreshed: **2026-04-22** (by Manus agent)

This document is the authoritative reference for how automation agents (Manus, Droid, CI) authenticate against TERP's infrastructure. It is **platform-agnostic** — any agent from any platform can follow the steps.

> **Never** commit raw secret values to this repo. All concrete tokens live in out-of-band stores (Manus sandbox env file, GitHub Actions Secrets, droplet `~/.bashrc`).

---

## 1. Resource Map

| Resource | Endpoint / Path | Auth method |
|---|---|---|
| Factory droplet | `factory@143.198.153.23` | SSH key (`~/.ssh/id_ed25519`) |
| Hermes relay | `hermese@159.89.32.112` | SSH key (`~/.ssh/id_ed25519`) |
| Staging app | `https://terp-staging-yicld.ondigitalocean.app` | Public |
| Production DB | `terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com:25060/defaultdb` | Password in `DATABASE_URL` secret |
| DigitalOcean API | `https://api.digitalocean.com/v2` | Bearer `DIGITALOCEAN_API_TOKEN` |
| Linear API | `https://api.linear.app/graphql` | Header `Authorization: <LINEAR_API_KEY>` (no `Bearer`) |
| Slack bot | Workspace `terpcorp.slack.com`, bot `B09U68ECZPZ` | Bearer `SLACK_BOT_TOKEN` |
| Factory AI (Droid) | `droid exec …` on the factory droplet | `FACTORY_API_KEY` in droplet `~/.bashrc` |
| GitHub (TERP) | `EvanTenenbaum/TERP` | GitHub App `manus-connector` or classic PAT |

---

## 2. Secret names used in CI

All workflow files under `.github/workflows/` read these from **Repository secrets**:

| Secret | Consumed by |
|---|---|
| `FACTORY_API_KEY` | `droid.yml`, `droid-review.yml` |
| `ANTHROPIC_API_KEY` | `droid.yml` (model fallback), app runtime |
| `OPENAI_API_KEY` | `droid.yml`, app runtime |
| `GEMINI_API_KEY` | `droid.yml`, app runtime |
| `DIGITALOCEAN_API_TOKEN` | `deploy-ops-api.yml`, `nightly-e2e.yml` |
| `DO_DEPLOY_TOKEN` | DO App Platform container registry push |
| `DATABASE_URL` | `pre-merge.yml`, `nightly-schema-check.yml`, app runtime |
| `SLACK_BOT_TOKEN` | `merge.yml` (deploy notifications) |
| `LINEAR_API_KEY` | `session-validation.yml` (comment back on ticket) |
| `FIGMA_API_KEY` | (unused in CI today — reserved) |

To rotate, run `bash push_terp_secrets.sh` from a machine with a classic PAT that has `repo` scope (the Manus sandbox GitHub App currently lacks `secrets: write` — see §6).

---

## 3. SSH bootstrap for a fresh Manus sandbox

Every new sandbox starts with an empty `~/.ssh`. Run:

```bash
ssh-keygen -t ed25519 -N "" -C "manus-agent@terp-pm" -f ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub      # paste this into the droplet/Hermes authorized_keys
```

### Authorize on the factory droplet
From any host already in `~factory/.ssh/authorized_keys`:
```bash
echo "<paste pubkey>" | ssh factory@143.198.153.23 'tee -a ~/.ssh/authorized_keys'
```

### Authorize on Hermes
```bash
echo "<paste pubkey>" | ssh hermese@159.89.32.112 'tee -a ~/.ssh/authorized_keys'
```

### Verify
```bash
ssh -o StrictHostKeyChecking=no -i ~/.ssh/id_ed25519 factory@143.198.153.23 'whoami'
ssh -o StrictHostKeyChecking=no -i ~/.ssh/id_ed25519 hermese@159.89.32.112 'whoami'
```

---

## 4. Sandbox env file `/home/ubuntu/.manus_env.sh`

To avoid hard-coding secrets in scripts, Manus agents `source /home/ubuntu/.manus_env.sh` and then reference `$DIGITALOCEAN_API_TOKEN`, `$LINEAR_API_KEY`, etc. The file is **not** committed. If it's missing (new sandbox), regenerate it — see `skills/terp-droid-pm/SKILL.md` § *Credential source of truth*.

---

## 5. DigitalOcean MCP override

When the Manus runtime-injected DO token is stale, the DO MCP server returns `401 Unauthorized` even though tools like `doctl` work locally. The fix is a local patch to the DO MCP Node wrapper:

- File: `~/.npm/_npx/*/node_modules/@digitalocean/mcp/index.js`
- Patch reads `/home/ubuntu/.manus_env.sh` at spawn time and overrides `DIGITALOCEAN_API_TOKEN` in the child process env before launching the Go binary.
- After applying: `sudo supervisorctl restart manus-mcp-server`
- Validation: `manus-mcp-cli tool call account-get-information --server digitalocean --input '{}'` should return `email: evan@evanmail.com`.

The patch must be re-applied after any sandbox reimage or `npx` cache purge.

---

## 6. Known permission gaps (Apr 2026)

The Manus GitHub App (`manus-connector`, installation `100817542`) is missing two repository permissions required for full automation:

1. **`workflows: write`** — cannot create or modify files under `.github/workflows/`. Blocks authoring of `droid-dispatch.yml` and any future CI additions.
2. **`secrets: write`** — cannot rotate repository secrets via API. Blocks programmatic secret rotation.

Remediation path (one-time, manual):
1. Manus team edits the App manifest at <https://github.com/settings/apps/manus-connector> (app owner: `manus-ai-team`).
2. Add `Workflows: Read & write` and `Secrets: Read & write` under **Repository permissions**.
3. User approves the updated permissions by visiting <https://github.com/settings/installations/100817542> and clicking **Review request**.
4. After approval, any Manus sandbox will automatically receive the broader scope on its next token refresh.

Until that's done, workflow authoring and secret rotation require a classic user PAT with `repo` + `workflow` scopes, run locally.

---

## 7. Droid dispatch — two channels

TERP supports both event-driven and programmatic Droid dispatch:

### A. Event-driven (current, works today)
- `@droid` mention in an **Issue body**, **Issue comment**, **PR review**, or **PR review comment** triggers `droid.yml`.
- No extra permissions needed beyond Droid's own GH App.
- Good for: one-off coding tasks, spot requests.

### B. Programmatic (planned, blocked on §6.1)
When `workflows: write` lands, `droid-dispatch.yml` will add:
```yaml
on:
  workflow_dispatch:
    inputs:
      prompt: { required: true }
      model: { default: claude-sonnet-4-5-20250929 }
      auto:  { default: high }
  repository_dispatch:
    types: [droid-task]
```
Allowing `gh workflow run droid-dispatch.yml -f prompt="…"` or a `POST /dispatches` from any authorized system (PM agent, Linear webhook, cron).

The ready-to-commit workflow file is staged at `docs/agent-context/staged/droid-dispatch.yml.new`. Rename to `.github/workflows/droid-dispatch.yml` once §6.1 is unblocked.

---

## 8. Rotation schedule

| Credential | Rotate every | Last rotation |
|---|---|---|
| `DIGITALOCEAN_API_TOKEN` | 90 days | 2026-04-22 |
| `FACTORY_API_KEY` | 180 days | 2026-04-22 |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` | 180 days | 2026-04-22 |
| `SLACK_BOT_TOKEN` | When bot scopes change | 2026-04-22 |
| `DATABASE_URL` | On compromise only | — |
| SSH keys (`id_ed25519`) | Per-sandbox (ephemeral) | N/A |

---

## 9. Contacts

- Infra owner: **EvanTenenbaum** (GitHub)
- Manus agent framework: [help.manus.im](https://help.manus.im)
- Factory AI droid: [factory.ai](https://factory.ai)
