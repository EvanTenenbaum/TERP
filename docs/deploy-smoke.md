Vercel Deployment Smoke Tests

Use these curl checks against your Vercel deployment (replace the base URL). ERPNext routes require server envs NEXTERP_HOST/NEXTERP_API_KEY/NEXTERP_API_SECRET. If missing or unreachable, expect a 503 JSON error.

Health

curl -sS https://<your-app>.vercel.app/api/health | jq .

ERPNext Probes (read-only)

curl -sS "https://<your-app>.vercel.app/api/customers?limit_page_length=1" | head -n 20
curl -sS "https://<your-app>.vercel.app/api/sales-orders?limit_page_length=1" | head -n 20
curl -sS "https://<your-app>.vercel.app/api/purchase-invoices?limit_page_length=1" | head -n 20

Expected

- With valid ERPNext envs and network access: JSON payloads from ERPNext.
- Without ERPNext envs or if network blocked: `{ "error": "nexterp_credentials_missing" }` or `{ "error": "nexterp_unreachable" }`.

