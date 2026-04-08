## Active Changes
- Completed: inventory grid pricing + margin fields wired from pricing defaults, with UI columns + inspector fields + export columns.
- Completed: inventory status labels + LIVE default filter across inventory surfaces.
- Completed: order creator credit/balance summary + batch auto-add from `batchId` route.
- Completed: Cmd+K search result routing for products and batches.
- Completed: sales catalogue access (command palette action + sales workspace command strip button) and share-ready product metadata tweaks.
- Completed: product display tweaks in inventory and catalogue (supplier/brand subtext).

## Checkpoints
- Start: context loaded, Linear issues scoped.
- Implementation: all P2 backlog items wired across client + server surfaces.
- QA: check + lint passed. Tests failed (details in Evidence). Build passed with chunk-size warnings.
- Live QA: local dev server blocked by auto-migration prompt + Vite watch restart loop; no browser pass completed yet.

## Evidence
- `pnpm agent:prepare` ✅
- `pnpm check` ✅
- `pnpm lint` ✅
- `pnpm test` ❌
  - Run 1: multiple suite failures + Drizzle migration warning (`cron_leader_lock` exists).
  - Run 2: DB bootstrap failed during seed (missing `users` table) after migration error (`role_permissions` exists).
- `pnpm build` ✅ (chunk-size warnings)
- Confused-human packet generated: `qa-results/confused-human/packet-20260408.json`
- Packet validated via `scripts/qa/check-confused-human-flows.ts`
- Local dev server (live QA) blocked:
  - Drizzle interactive prompt (`feature_flag_audit_action` create vs rename) during bootstrap.
  - `tsx watch` restart loop from `.vite-temp` changes prevents stable server.
