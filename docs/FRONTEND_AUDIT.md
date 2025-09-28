# Frontend Tech & Flow Audit

Snapshot date: updated automatically by commit

## Stack
- Framework: Next.js 14 (App Router)
- TypeScript, ESLint, Jest, Playwright
- UI: Tailwind CSS, headlessui, heroicons
- Data: SWR for client fetching; server routes in app/api; Prisma to Neon Postgres
- Error Monitoring: @sentry/nextjs (client + server instrumentation)
- PDFs: jsPDF (PO, Quote)

## Global Architecture
- App shell: src/components/layout/AppShell.tsx wired in src/app/layout.tsx with CartProvider and ToastProvider
- Styling: tailwind.config.js; globals at src/app/globals.css
- Error boundary: src/app/global-error.tsx (Sentry capture)
- RBAC: src/lib/auth.ts via headers + ENABLE_RBAC env; middleware sets default role if configured
- API helpers: src/lib/api.ts (roles, rate-limit, body/query zod validation, posting lock)
- Rate limit: src/lib/rateLimit.ts via in-memory token bucket
- Prisma: src/lib/prisma.ts with dev logging; Neon via DATABASE_URL

## Key UI Primitives (src/components/ui)
- Button, Input, Modal, Badge, Banner, EmptyState, FilterBar, FlowStepper, ResponsiveTable, Toast

## Feature Modules (pages/components)
- Inventory: products, categories, intake/new, batches(+new), lots, transfers, adjustments, low-stock, returns, discrepancies, rebuild
- Purchasing: purchase-orders (list/new/[id])
- Sales: quotes (list/new/[id]/share), orders, b2b/orders (list/new/[id])
- Pricing: price-books (EffectiveInspector)
- Finance: AR, AR dunning, AP, payments, credits, vendor-rebates, vendor-settlements
- Attachments: list/upload/archive
- Analytics: overview, profitability
- Alerts: rules, replenishment
- Admin: audit log, QA
- Search & Samples: search; samples + report

## API Routes (app/api)
- Wide coverage for inventory, purchasing, quotes, finance, alerts, attachments, analytics, QA. All use api() helper + zod where provided.

## Validation & Forms
- Zod types imported where needed; FormField abstraction present. TODO: standardize shared schemas per feature.

## Data fetching & caching
- Client: SWR used in several pages (transfers, vendor rebates/settlements). TODO: unify fetcher, keys, error handling, and loading templates.

## PDFs
- src/lib/pdf/po.ts generatePoPdf used by /api/purchase-orders/[id]/pdf
- src/lib/pdf/quote.ts generateQuotePDF (ensure usage parity)

## Testing
- Jest unit tests present; Playwright e2e (e2e/smoke.spec.ts + tests/inventory/* etc.)

## Environment & Flags
- NODE_ENV, ENABLE_RBAC, ENABLE_QA_CRONS, RATE_LIMIT_TOKENS/RATE_LIMIT_WINDOW_MS, SENTRY_*, UPLOAD_DIR
- next.config.js sets security headers and uses withSentryConfig when SENTRY envs are present

## Observations / Risks
- Dev warning fixed: NODE_ENV must be development for Tailwind CSS parsing
- Duplicate 'use client' directives in a few pages (clean up)
- allowedDevOrigins warning from Next dev logs: consider configuring for iframe preview

## Dependency Usage (selected)
- swr: USED
- jsPDF: USED
- zod: USED
- @sentry/nextjs: USED
- html2canvas: NOT USED (candidate removal)
- puppeteer: NOT USED in repo (Playwright is used) (candidate removal)

## Action Items
- Standardize SWR fetcher, error/loading components
- Consolidate Zod schemas per module; tighten api() usage
- Remove unused deps (html2canvas, puppeteer) after confirmation
- Fix duplicate 'use client' pragmas
- Add allowedDevOrigins in next.config for Builder preview
- Add feature flags + per-env endpoint config surface
