# TER-1372 Session
- **Ticket:** TER-1372
- **Branch:** `feat/ux-v2-smoke-test-ci`
- **Status:** In Progress
- **Started:** 2026-04-24T00:55:00Z
- **Agent:** Factory Droid (UX v2 fix wave)
- **Scope:** Post-deploy UX smoke test — 8 DOM assertions against staging,
  wired into a `UX Smoke Check` GitHub Actions workflow on every push to `main`.
- **Artifacts:**
  - `scripts/qa/ux-v2-smoke.ts`
  - `.github/workflows/ux-smoke.yml`
  - `package.json` → `smoke:staging`
