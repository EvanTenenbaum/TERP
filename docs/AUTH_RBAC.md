# Authentication & RBAC (No Secret URLs)

## Summary
- **All routes require authentication** when `REQUIRE_AUTH` (default: true).
- Identity is provided by a **JWT cookie** (default name: `auth_token`) signed with `AUTH_JWT_SECRET`.
- Middleware validates the JWT and forwards identity via `x-user-id` and `x-user-role` headers to route handlers.
- No feature depends on "secret URLs". RBAC is enforced server‑side for every endpoint.

## Environment Variables
- `AUTH_JWT_SECRET` (**required**) – HMAC secret for JWT.
- `AUTH_COOKIE_NAME` (optional, default `auth_token`)
- `REQUIRE_AUTH` (optional, default `true`)
- `ALLOW_DEV_BYPASS` (dev only) – if `true` and not production, middleware injects a dev identity using `DEV_BYPASS_USER` & `DEV_BYPASS_ROLE`.
- `DEV_LOGIN_ENABLED` (dev only) – if `true` and not production, enables `/api/auth/dev-login` to set a test JWT cookie.
- `DEV_BYPASS_USER`, `DEV_BYPASS_ROLE` (dev only)

## Dev Login
Enable with:
```bash
DEV_LOGIN_ENABLED=true
AUTH_JWT_SECRET=replace_me
```
Then visit `/login` and set a user and role; the cookie is httpOnly and works for local testing.

## Production
- Do **not** enable dev bypass or dev-login.
- Issue JWT cookies from your real IdP or auth service (or upstream gateway) and ensure they include `sub` and `role` claims.
