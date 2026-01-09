# QA Documentation

This directory contains documentation for Quality Assurance testing in TERP.

## Contents

- [QA_PLAYBOOK.md](./QA_PLAYBOOK.md) - Step-by-step guide for QA testing with role authentication

## Logging in as QA Roles for RBAC Validation

TERP provides deterministic QA authentication that allows testers to login as any RBAC role without SSO or external authentication providers.

### Quick Start

1. **Enable QA Auth** - Set `QA_AUTH_ENABLED=true` in your `.env`
2. **Seed Accounts** - Run `pnpm seed:qa-accounts`
3. **Login** - Use any QA email with password `TerpQA2026!`

### Available QA Accounts

| Email | Role |
|-------|------|
| `qa.superadmin@terp.test` | Super Admin |
| `qa.salesmanager@terp.test` | Sales Manager |
| `qa.salesrep@terp.test` | Sales Rep |
| `qa.inventory@terp.test` | Inventory Manager |
| `qa.fulfillment@terp.test` | Fulfillment |
| `qa.accounting@terp.test` | Accounting Manager |
| `qa.auditor@terp.test` | Read-Only Auditor |

### Usage

```bash
# Via curl
curl -X POST http://localhost:3000/api/qa-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "qa.salesmanager@terp.test", "password": "TerpQA2026!"}'
```

Or use the standard login form with QA credentials.

### Documentation

- **Full QA Auth Documentation**: [docs/auth/QA_AUTH.md](../auth/QA_AUTH.md)
- **QA Testing Playbook**: [QA_PLAYBOOK.md](./QA_PLAYBOOK.md)
- **Permission Matrix**: [USER_FLOW_MATRIX.csv](../reference/USER_FLOW_MATRIX.csv)

### Security Note

QA authentication is **automatically disabled in production** environments (`NODE_ENV=production`), even if the flag is set. This feature is only available in:
- Development
- Staging
- QA environments

## Related Resources

- [Authentication Setup](../AUTH_SETUP.md)
- [RBAC Documentation](../api/routers/rbac-roles.md)
- [Permission Service](../../server/services/permissionService.ts)
