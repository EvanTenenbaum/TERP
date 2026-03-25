# Local Database Workflow

This runbook describes the shared local TERP test database contract.

## Default behavior

- Local `pnpm dev` auto-starts the shared Docker MySQL test DB when no remote DB URL is configured.
- Local `pnpm test`, `pnpm test:watch`, and `pnpm test:coverage` auto-reset to a clean light dataset before running.
- Local `pnpm test:e2e` auto-resets to a clean full dataset during Playwright global setup.
- Remote or live DB URLs still take precedence. When `DATABASE_URL` or `TEST_DATABASE_URL` points off-host, the repo runs connectivity preflight only and does not touch Docker.

## Core commands

```bash
pnpm db:status
pnpm test:db:ensure
pnpm test:db:ensure:full
pnpm test:db:fresh
pnpm test:db:fresh:full
pnpm test:env:down
```

## Efficiency rules

- The local MySQL container is reused across runs instead of being torn down after every local test session.
- Integration teardown keeps the DB running unless `TEST_DB_AUTO_STOP=1`.
- DB bootstrap is serialized with a host-level lock so two local agents do not reset the shared DB at the same time.

## Escape hatches

- `SKIP_LOCAL_DB_BOOTSTRAP=1` skips the repo-level auto-bootstrap wrapper.
- `ALLOW_REMOTE_DB_RESET=1` is still required before any reset can touch a remote DB target.
- `TEST_DB_FORCE_RESET=1` forces `pnpm test:db:ensure*` commands to rebuild the selected dataset.
