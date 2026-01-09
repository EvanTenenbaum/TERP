# TERP Reference Documentation

This directory contains canonical reference documentation for AI agents and developers working on the TERP codebase.

## Quick Links

| Document | Description | Last Updated |
|----------|-------------|--------------|
| [FLOW_GUIDE.md](./FLOW_GUIDE.md) | Complete user flow guide by domain/entity/role | 2026-01-08 |
| [USER_FLOW_MATRIX.csv](./USER_FLOW_MATRIX.csv) | Comprehensive CSV of all 200+ user flows | 2026-01-08 |

## For AI Agents

### Finding User Flows

To find flows for a specific domain or entity:

```bash
# Search the flow matrix
grep -i "clients" docs/reference/USER_FLOW_MATRIX.csv

# Search the flow guide
grep -i "## Domain 2: CRM" docs/reference/FLOW_GUIDE.md -A 100
```

### Key Information in Flow Matrix

Each row in `USER_FLOW_MATRIX.csv` contains:

| Column | Description |
|--------|-------------|
| Domain | Business domain (Accounting, CRM, Inventory, Orders, etc.) |
| Entity | Specific entity (Invoices, Clients, Batches, etc.) |
| Flow Name | Human-readable flow name |
| Archetype | CRUD archetype (Create, View/Search, Update, Delete, etc.) |
| tRPC Procedure | Exact tRPC procedure name |
| Type | query or mutation |
| Procedure Wrapper | Auth level (publicProcedure, protectedProcedure, etc.) |
| Permissions | Required permission string |
| Roles | Roles that can execute |
| UI Entry Paths | Client routes that access this flow |
| Business Purpose | What the flow does |
| Implementation Status | Client-wired, API-only, Deprecated |
| Known Issues | Any identified issues |
| Router File | Source file path |

### Key Information in Flow Guide

The `FLOW_GUIDE.md` is organized by:

```
Domain → Entity → Flow Tables
```

Each section includes:
- Flow tables with procedures, types, and permissions
- Status lifecycle diagrams (where applicable)
- Related entities and business rules

## Updating These Documents

When making changes to the codebase that affect user flows:

1. Update `USER_FLOW_MATRIX.csv` with new/changed flows
2. Update `FLOW_GUIDE.md` with new sections if needed
3. Also update the source files in `docs/assets/ST-045/`

### Adding a New Flow

1. Add row to `USER_FLOW_MATRIX.csv` with all columns filled
2. Add entry to appropriate section in `FLOW_GUIDE.md`
3. Ensure the flow's router file is documented

### Marking a Flow as Deprecated

1. Change `Implementation Status` to `Deprecated`
2. Add note in `Known Issues` column
3. Update `FLOW_GUIDE.md` to mark as deprecated

## QA Testing with Role Authentication

To test USER_FLOW_MATRIX coverage, QA accounts are available for each role:

| QA Email | Role | Password |
|----------|------|----------|
| `qa.superadmin@terp.test` | Super Admin | `TerpQA2026!` |
| `qa.salesmanager@terp.test` | Sales Manager | `TerpQA2026!` |
| `qa.salesrep@terp.test` | Sales Rep | `TerpQA2026!` |
| `qa.inventory@terp.test` | Inventory Manager | `TerpQA2026!` |
| `qa.fulfillment@terp.test` | Fulfillment | `TerpQA2026!` |
| `qa.accounting@terp.test` | Accounting Manager | `TerpQA2026!` |
| `qa.auditor@terp.test` | Read-Only Auditor | `TerpQA2026!` |

**Enable QA Auth:** Set `QA_AUTH_ENABLED=true` in your environment.

See [QA Authentication Documentation](../auth/QA_AUTH.md) for full details.

## Related Documentation

- [MASTER_ROADMAP.md](../roadmaps/MASTER_ROADMAP.md) - Development roadmap
- [docs/specs/](../specs/) - Feature specifications
- [docs/prompts/](../prompts/) - AI agent prompts
- [QA Authentication](../auth/QA_AUTH.md) - Deterministic QA login for RBAC testing

## Source Assets

The original/working versions of these files are in `docs/assets/ST-045/`:
- `TERP_User_Flow_Matrix_UPDATED.csv`
- `TERP_Flow_Guide_UPDATED.md`
- `TERP_Routes.csv`
- `TERP_RBAC_Permission_Mismatches.csv`
