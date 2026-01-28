# QA Credentials Discovered

**Source**: `docs/auth/QA_AUTH.md`

## Available QA Accounts

All accounts use password: `TerpQA2026!`

| Email | Role | Mapped RBAC Role |
|-------|------|------------------|
| qa.superadmin@terp.test | Super Admin | Super Admin (ALL permissions) |
| qa.salesmanager@terp.test | Sales Manager | Sales Manager |
| qa.salesrep@terp.test | Customer Service (Sales Rep) | Customer Service |
| qa.inventory@terp.test | Inventory Manager | Inventory Manager |
| qa.fulfillment@terp.test | Warehouse Staff (Fulfillment) | Warehouse Staff |
| qa.accounting@terp.test | Accountant | Accountant |
| qa.auditor@terp.test | Read-Only Auditor | Read-Only Auditor |

## Authentication Method

**Endpoint**: POST `/api/qa-auth/login`

**Payload**:
```json
{
  "email": "qa.superadmin@terp.test",
  "password": "TerpQA2026!"
}
```

## Notes

- QA Auth must be enabled with `QA_AUTH_ENABLED=true` in staging
- Automatically disabled in production
- Can use standard login form or QA auth endpoint
- All QA auth events are logged to audit trail
