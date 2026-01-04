# TERP API Reference

Comprehensive reference for TERP's tRPC API surface. The server exposes procedures under `/api/trpc/{router}.{procedure}` with superjson serialization. All responses follow the tRPC envelope: `{ "result": { "data": { "json": <payload> }}}`.

## Table of Contents

- [Authentication](./authentication.md)
- [Clients](./clients.md)
- [Orders](./orders.md)
- [Inventory](./inventory.md)
- [Calendar](./calendar.md)
- [VIP Portal](./vip-portal.md)

## Calling the API

### Query vs Mutation

- **Query procedures** map to `GET` requests and must encode input as the `input` query param.
- **Mutation procedures** map to `POST` requests and accept a JSON body with a `json` field containing the input payload.

```bash
# Query example
curl "https://terp-app-b9s35.ondigitalocean.app/api/trpc/auth.me" \
  -H "Cookie: terp_session=<session>"

# Mutation example
curl -X POST "https://terp-app-b9s35.ondigitalocean.app/api/trpc/orders.create" \
  -H "Content-Type: application/json" \
  -H "Cookie: terp_session=<session>" \
  -d '{"json":{"orderType":"SALE","clientId":12,"items":[{"batchId":34,"quantity":2,"unitPrice":15,"isSample":false}]}}'
```

### Permissions

All protected procedures enforce RBAC via `requirePermission`. Permissions are listed per endpoint in the detailed guides. Public routes still expect a valid session for most operations.

### Error Handling

Errors use tRPC error codes (e.g., `UNAUTHORIZED`, `FORBIDDEN`, `BAD_REQUEST`). Responses include `{ "error": { "code": "...", "message": "..." }}`.

Refer to the individual domain files for endpoint-level schemas, permissions, and examples.
