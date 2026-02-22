# Linear UI Lab Runbook

## Purpose

Launch an isolated local frontend for the redesign branch/worktree:
- separate from production
- separate from your deployed server
- no manual login required
- seeded with enough data to exercise core modules

## Single Command

From this worktree root:

```bash
bash scripts/run-linear-ui-lab.sh
```

Defaults:
- URL: `http://localhost:3222/dashboard`
- local DB: `mysql://root:rootpassword@127.0.0.1:3307/terp-test`
- login bypass: enabled through `DEMO_MODE=true`

## Useful Overrides

```bash
PORT=3333 bash scripts/run-linear-ui-lab.sh
```

```bash
RESET_DB=false bash scripts/run-linear-ui-lab.sh
```

## Safety

- This command only runs against local docker test DB + your current branch worktree.
- It does not push code.
- It does not deploy.
- It does not modify production database.
