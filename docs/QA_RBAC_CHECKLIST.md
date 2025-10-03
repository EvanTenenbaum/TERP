# RBAC QA Checklist

- Hitting any protected API without `auth_token` returns 401.
- With an `auth_token` where `role=READ_ONLY`, write endpoints (POST/PUT/DELETE) return 403 when allowedRoles exclude READ_ONLY.
- With `role=ACCOUNTING`, finance endpoints succeed; inventory adjustments restricted per allowedRoles.
- With `role=SUPER_ADMIN`, all endpoints succeed.
- In production, `/api/auth/dev-login` returns 403.
