# Spreadsheet-Native Foundation Pack

This directory contains the truth-first foundation artifacts for the spreadsheet-native TERP fork.

## Core Docs

- [Schema Inventory Summary](./SCHEMA-INVENTORY-SUMMARY.md)
- [Schema Audit Contract](./SCHEMA-AUDIT-CONTRACT.md)
- [Migration Truth Report](./MIGRATION-TRUTH-REPORT.md)
- [Canonical Entity Map](./CANONICAL-ENTITY-MAP.md)
- [Router-to-Table Ownership Map](./ROUTER-TABLE-OWNERSHIP-MAP.md)
- [Pilot Domain Data Contracts](./PILOT-DOMAIN-DATA-CONTRACTS.md)
- [Ownership Seams Memo](./OWNERSHIP-SEAMS-MEMO.md)
- [Pilot Persona Dataset Pack](./PILOT-PERSONA-DATASET-PACK.md)
- [Orders Rollout Contract](./ORDERS-ROLLOUT-CONTRACT-2026-03-17.md)
- [Orders Full-Parity Pilot Evaluation Pack](./ORDERS-FULL-PARITY-PILOT-EVALUATION-PACK-2026-03-17.md)
- [Orders Spreadsheet Runtime Roadmap Backup](../../roadmaps/2026-03-17-orders-spreadsheet-runtime-rollout.md)

## Generated Inventories

- [`generated/schema-inventory.csv`](./generated/schema-inventory.csv)
- [`generated/migration-source-inventory.csv`](./generated/migration-source-inventory.csv)
- [`generated/router-table-ownership.csv`](./generated/router-table-ownership.csv)
- JSON equivalents in the same folder

## Generation

Regenerate the machine-readable inventories with:

```bash
pnpm foundation:generate
```
