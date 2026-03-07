# Stress Secrets Contract (GitHub-Safe)

This document defines how to share stress-test credential usage across agents without committing real secrets.

## Secret Storage Location

Store real values in **GitHub Environment secrets** (not repository files):

1. GitHub repo: `EvanTenenbaum/TERP`
2. `Settings -> Environments -> staging -> Environment secrets`
3. Create/update these keys:
   - `STRESS_ADMIN_EMAIL`
   - `STRESS_ADMIN_PASSWORD`
   - `DATABASE_URL`
   - `STRESS_AUTH_TOKEN` (optional; prefer runtime generation)

## Repo Files That Are Safe To Commit

- `.env.stress.example` (placeholders only)
- `scripts/stress/generate-auth-token.sh` (reads env vars, outputs token)
- This runbook

Local-only files are ignored by git:

- `.env.stress`
- `.env.stress.local`

## Local Agent Workflow

1. Create local env file from template:
```bash
cp .env.stress.example .env.stress.local
```

2. Populate `.env.stress.local` from GitHub `staging` environment secrets.

3. Load env vars:
```bash
set -a
source .env.stress.local
set +a
```

4. Generate a short-lived stress auth token (recommended over storing one):
```bash
export STRESS_AUTH_TOKEN="$(bash scripts/stress/generate-auth-token.sh --raw)"
```

5. Run stress commands:
```bash
pnpm qa:stress:preflight --env=staging
pnpm qa:stress --env=staging --profile=peak
```

## Security Rules

- Never commit real values for any `STRESS_*` or `DATABASE_URL` variable.
- Never paste secrets into docs, PR descriptions, or issue comments.
- Prefer runtime token generation from admin credentials over long-lived static tokens.

## Docs-Only Push Without Staging Redeploy

If you are committing only secret-contract docs/scripts and want to avoid staging sync, include this in the commit message:

- `[skip-staging-sync]`
