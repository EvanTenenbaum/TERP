# Pilot Persona Dataset Pack

This pack defines the stable personas and data conditions used to prove `Inventory` and `Orders` without relying on accidental staging state.

## QA Personas

Existing repo-backed QA personas:

- `qa.superadmin@terp.test`
- `qa.salesmanager@terp.test`
- `qa.salesrep@terp.test`
- `qa.inventory@terp.test`
- `qa.fulfillment@terp.test`
- `qa.accounting@terp.test`
- `qa.auditor@terp.test`

All are seeded by [`server/db/seed/qaAccounts.ts`](../../../server/db/seed/qaAccounts.ts).

## Required Pilot Data Conditions

### Orders

- at least one draft order
- at least one confirmed order
- at least one shipped order
- at least one order with multiple line items
- at least one order with customer credit context
- at least one seeded route path from `clientId`, `quoteId`, or `draftId`

### Inventory

- at least one batch in each key visible status
- at least one batch with movement history
- at least one batch eligible for quantity adjustment
- at least one batch visible in gallery mode
- at least one saved view owned by the active user
- at least one shared view

## Seed Sources

Repo-backed seed sources already available:

- [`server/db/seed/seedData/orders.json`](../../../server/db/seed/seedData/orders.json)
- [`server/db/seed/seedData/inventory.json`](../../../server/db/seed/seedData/inventory.json)
- [`server/db/seed/qaAccounts.ts`](../../../server/db/seed/qaAccounts.ts)

## Proof Rule

Every pilot proof case must identify:

- persona used
- workbook route
- minimum data condition
- artifact produced

No proof may rely on undocumented seeded residue.
