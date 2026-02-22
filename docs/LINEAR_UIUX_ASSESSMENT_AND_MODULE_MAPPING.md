# Linear-Informed UI/UX Assessment and TERP Module Mapping

Date: 2026-02-19  
Scope: Expand Calm Power redesign patterns across all TERP module entry surfaces without backend or schema changes.

## 1) Linear Patterns Assessed

Assessment sources (official docs/changelog and Linear design write-up):
- [Linear redesign, part 2](https://linear.app/blog/redesigning-linear-part-2-design-system)
- [Issue views and display options](https://linear.app/docs/issues/views)
- [Issue filtering and view controls](https://linear.app/docs/issues/filtering)
- [Search behavior](https://linear.app/docs/search)

Patterns extracted:
- List/table is the primary work surface.
- Top chrome is quiet and compact; actions are contextual, not loud.
- Display options (density, fields/columns, sort/filter) are first-class.
- Multi-select + bulk actions are native to list workflows.
- Detail context is secondary and often side-oriented.
- Keyboard-first operation is visible and encouraged.
- Personal display preferences persist per user and per surface.

## 2) TERP Constraints and Fit

Non-negotiables kept:
- Existing routes and module capabilities stay intact.
- Existing backend procedures and optimistic locking remain authoritative.
- No new database tables or migrations introduced.
- Existing module business logic is not duplicated in frontend wrappers.

Design translation for TERP:
- Apply Linear-like structure to module entry pages and shared shell.
- Keep current module internals (orders, quotes, clients, inventory, etc.) to preserve behavior.
- Use a shared workspace frame so all modules inherit one interaction rhythm.

## 3) Module Mapping (Linear Pattern -> TERP Surface)

### Global shell
- Linear concept: quiet global frame, compact nav, keyboard affordance.
- TERP mapping: updated app shell layout, sidebar rhythm, compact header, reduced decorative container weight.

### Workspace modules
- Sales, Relationships, Inventory, Demand & Supply, Credits
- Linear concept: list-first workspace with clear tab rail and low-noise command context.
- TERP mapping: each workspace now uses a shared `LinearWorkspaceShell` with:
  - compact header zone
  - unified tab rail
  - metadata strip
  - command/shortcut affordance
  - consistent content viewport behavior

### Grid-heavy work surfaces
- Purchase Orders, Direct Intake, Inventory, Orders, Invoices, Clients, Vendors, etc.
- Linear concept: dense tabular operation with strong alignment and low visual noise.
- TERP mapping:
  - keep existing tables and AG Grid usage
  - keep existing inspector/drawer interactions
  - improve surrounding shell and spacing to preserve grid dominance
  - keep user preference persistence (where already implemented, including slice lab)

### Mobile
- Linear concept: responsive behavior without changing core interaction model.
- TERP mapping:
  - preserve table-first behavior with controlled horizontal scroll
  - enforce touch-target minimums on mobile
  - avoid card conversion as default behavior for operational grids

## 4) Explicitly Rejected (Not Adopted)

- No card-first dashboard conversions for operational modules.
- No modal wizard flow for core operations.
- No hidden progressive-disclosure flow that removes broker control.
- No backend abstraction rewrite or frontend domain duplication.

## 5) Implementation Strategy

1. Create shared workspace shell component.
2. Refactor module workspace pages to use the shell.
3. Tighten global shell visual rhythm and responsive behavior.
4. Add one-command local launch script with:
   - isolated local DB reset/seed
   - no-login demo mode
   - separate local port
5. Run adversarial UX review and QA pass, then remediate issues.

## 6) Outcome Target

System feel target: **Linear meets power spreadsheet**  
Not target: dashboard template, card stack, or ERP wizard flow.
