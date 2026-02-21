# P0 Local Login Skip Policy

## Purpose
Enable rapid local QA without authentication blockers.

## Control
The bypass is enabled only when both conditions are true:
- `import.meta.env.DEV === true`
- `VITE_SKIP_LOGIN_LOCAL=true`

## Behavior
- Protected routes treat the local dev user as authenticated.
- Login page auto-redirects to `/`.
- This mode is frontend-only and does not alter backend auth logic.

## Safety Constraint
Bypass cannot activate in production builds because it is hard-gated to `import.meta.env.DEV`.

## Usage
```bash
VITE_SKIP_LOGIN_LOCAL=true pnpm dev
```
