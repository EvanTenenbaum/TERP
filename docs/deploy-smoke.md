Vercel Deployment Smoke Tests

Use these curl checks against your Vercel deployment (replace the base URL).

Health

curl -sS https://<your-app>.vercel.app/api/health | jq .

Expected

- With a healthy deployment: `{ "ok": true }`.
- If not healthy: non-200 response or missing `ok` field.
