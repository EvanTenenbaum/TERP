# Cleanup & Deprecations

## Unused Dependencies (verify and remove)
- html2canvas — no references in code
- puppeteer — Playwright is used for e2e, no imports of puppeteer

## Code Hygiene
- Remove duplicate 'use client' in:
  - src/app/inventory/batches/new/page.tsx
  - src/app/inventory/products/new/page.tsx
  - src/app/alerts/page.tsx
- Ensure all client components have a single directive at top of file

## Config
- Add `allowedDevOrigins` to next.config.js for cross-origin dev iframes (Builder preview)
- Verify Sentry envs and disable withSentryConfig when unset (already conditional)

## Validation
- Expand Zod schemas for API routes lacking validation; keep in feature-local schema files

## Testing
- Remove flakes; add coverage for intake, PO, quote→order, payments

## Housekeeping
- Prune dead code paths in QA admin if obsolete
- Ensure UPLOAD_DIR exists in deployments or adjust to use tmp with provider storage
