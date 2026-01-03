# TERP Code Review — 2026-01-03

**Scope:** Full application code (backend, frontend, shared packages) excluding agent/bot tooling and other development infrastructure.
**Approach:** Sampled high-traffic routers, core server bootstrap, and dashboard UI components to evaluate authentication, data integrity, reliability, and UX resilience. Findings focus on systemic risks and high-impact fixes rather than stylistic nits.

## Summary

- Authentication defaults to creating a public demo user and allowing it through most `protectedProcedure` paths, enabling unauthenticated callers to mutate business data when routers omit the stricter guard.
- Order creation/editing flows perform multi-table writes without transactions, risking partially-written orders/line items if any insert fails or if downstream audit logging throws.
- Operational telemetry is blunted: `/health` always returns HTTP 200 even on dependency failures, so external monitors will miss outages and auto-scaling signals.
- Dashboard widgets skip error handling and ship console debug logging in production, leading to silent data failures for users and noisy client consoles.

## Key Findings & Recommendations

### 1) Public user fallback enables unauthenticated mutations

**Evidence:**

- `createContext` provisions a synthetic "Public Demo User" whenever authentication fails, guaranteeing a `ctx.user` for every request.【F:server/\_core/context.ts†L11-L139】
- `protectedProcedure` keeps that public user and only logs when it executes a mutation instead of blocking it, so any router using `protectedProcedure` alone accepts anonymous writers.【F:server/\_core/trpc.ts†L155-L194】
- High-risk routers (e.g., orders create/update/delete) rely on `protectedProcedure`, letting unauthenticated callers write sales data if they hit tRPC directly.【F:server/routers/orders.ts†L70-L195】

**Impact:** Anonymous clients can create/modify orders and other entities, bypassing RBAC and audit attribution. This is a systemic auth gap.

**Recommendations:**

- Default all mutation endpoints to `strictlyProtectedProcedure` (or similar middleware that rejects the public user) and require explicit opt-in for anonymous reads.
- Remove the mutation allowance from `protectedProcedure` (throw when `user.id === -1`) and gate anonymous access behind dedicated `publicProcedure`s.
- Add an integration test suite that asserts mutations fail without a real session token.

### 2) Order drafts are written without transactions

**Evidence:**

- `createDraftEnhanced` inserts into `orders`, then multiple `orderLineItems`, then an audit log with no transaction wrapping the sequence.【F:server/routers/orders.ts†L292-L445】

**Impact:** If any line-item insert or audit write fails, the order row remains while line items are partial/absent, corrupting financial totals and later calculations.

**Recommendations:**

- Wrap order creation/update/finalization paths in a DB transaction; roll back order rows when line-item insertions or audit logging fail.
- Add invariant checks (e.g., count of items vs. request) before committing.

### 3) Health endpoint masks outages

**Evidence:**

- `/health` always responds 200 even when dependency checks throw, returning a "degraded" body but never surfacing HTTP failures.【F:server/\_core/index.ts†L297-L319】

**Impact:** Platform monitors and load balancers will treat hard failures (DB down, migration failure) as healthy, delaying incident detection and auto-recovery.

**Recommendations:**

- Return 503 on dependency failures while keeping `/health/live` as liveness; expose readiness separately (already exists at `/health/ready`).
- Update deployment health checks to use readiness, not the always-200 endpoint.

### 4) Dashboard UX lacks error handling and ships debug logs

**Evidence:**

- Dashboard V3 logs widget data to `console.log` on every change, shipping debug noise to end users and violating the console cleanup effort.【F:client/src/pages/DashboardV3.tsx†L27-L99】
- Widgets such as `SalesByClientWidget` display loading and empty states but omit error states; failed queries silently render empty content, masking backend issues.【F:client/src/components/dashboard/widgets-v2/SalesByClientWidget.tsx†L33-L135】

**Impact:** Users see blank widgets instead of actionable error/retry affordances, and consoles collect noisy logs in production.

**Recommendations:**

- Replace console logging with structured client telemetry (e.g., Sentry breadcrumb) gated behind debug flags.
- Add error handling to widget queries (error banners + retry buttons) and disable CTA navigation when data is unavailable.

## Next Steps

- Align authentication middleware defaults with RBAC expectations and add regression tests for anonymous mutation attempts.
- Introduce transactions to order creation/update paths and assert invariants in tests.
- Harden health checks to surface dependency failures via HTTP status codes and adjust platform probes accordingly.
- Instrument dashboard widgets with error states and remove production console logging.
