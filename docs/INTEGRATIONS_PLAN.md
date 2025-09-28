# Integrations Plan (Frontend-first)

## Backends & Data
- Current: Prisma → Neon Postgres via DATABASE_URL
- Option: Add Neon Serverless driver for edge handlers where needed (see custom rule "neon-serverless")

## Auth & RBAC
- Current: header-based role with ENABLE_RBAC; placeholder only
- Next: Provision authentication (Stack Auth) and wire UI guards; map users↔roles in DB

## File Storage
- Current: local UPLOAD_DIR
- Next: Object storage (S3, GCS, or Supabase Storage) with signed URLs; swap adapter behind /api/attachments

## Observability
- Sentry already integrated; enable performance for critical flows; add user feedback dialog on unhandled errors

## Search & Analytics
- Consider server-side indexing (e.g., Postgres FTS) with typed adapters; expose query builder inputs in UI

## MCP Integrations (recommended)
- Netlify — hosting/CDN and deploy previews for quick product review. Connect via [Open MCP popover](#open-mcp-popover).
- Zapier — automation hooks from key events (order created, PO received). Connect via [Open MCP popover](#open-mcp-popover).
- Figma — design→code via Builder plugin for rapid UI iteration: https://www.figma.com/community/plugin/747985167520967365/builder-io-ai-powered-figma-to-code-react-vue-tailwind-more
- Supabase — auth and storage if preferred; alt to custom auth + S3. Connect via [Open MCP popover](#open-mcp-popover).
- Builder CMS — manage marketing/product copy; dynamic content. Connect via [Open MCP popover](#open-mcp-popover).
- Linear — roadmap and issue tracking integration. Connect via [Open MCP popover](#open-mcp-popover).
- Notion — living specs and long-form docs. Connect via [Open MCP popover](#open-mcp-popover).
- Context7 — up-to-date framework docs assistance. Connect via [Open MCP popover](#open-mcp-popover).
- Prisma Postgres — DB schema operations via MCP. Connect via [Open MCP popover](#open-mcp-popover).
