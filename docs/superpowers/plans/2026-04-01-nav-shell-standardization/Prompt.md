# Nav Shell Standardization

## Objective

Replace TERP's stacked navigation chrome with a reusable compact shell, then ship it through staging with proof from code, commands, and live browser validation.

## Scope

- Shared application header and utility navigation
- Shared workspace shell used by Sales, Inventory, Accounting, Relationships, Credits, Procurement, and Demand & Supply
- Sales catalogue sheet-native surface chrome on `/sales?tab=sales-sheets`
- Verification, deploy to `main`, staging proof, and live browser QA

## Success Checks

- Global header collapses to one compact utility row
- Workspace shell collapses repeated header + meta + tabs into one reusable strip
- Sales catalogue removes duplicate top chrome and handoff bar duplication
- Shared shell changes propagate cleanly to affected workspaces
- Repo verification passes at ship point
- Staging reflects the shipped commit
- Live browser pass confirms UI, UX, and core business actions still work

## Constraints

- Use the clean worktree only
- Do not touch unrelated dirty changes in the main checkout
- Staging tracks `main` directly
- Verification over persuasion
