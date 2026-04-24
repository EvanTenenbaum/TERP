# User-Facing Notes

- SO create-order routes that point at an unavailable client now surface an explicit unavailable-customer state and block save/finalize actions until an active customer is selected.
- The shared sheet-native sales surface keeps hydrated client labels visible during list loading, so route hydration no longer collapses back to a generic loading label.
- The real browser regression now covers sale mode, quote mode, and PO inline pre-add controls together.

# Runbook Updates

- For local browser proof on this branch, run the app server with `QA_AUTH_ENABLED=true` and a valid `JWT_SECRET`, then point Playwright at that already-running server with `CI=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4010`.
- Avoid reusing a borrowed/stale `node_modules` tree for this worktree; the isolated local install was required to restore `agentation` and clear false local type/build/runtime failures.

# Follow-Ups

- Track any residual non-classic sales-surface gaps discovered during live QA.
