# DATA-012: Complete Suppliers to Clients Migration

<!-- METADATA (for validation) -->
<!-- TASK_ID: DATA-012 -->
<!-- TASK_TITLE: Complete Suppliers→Clients Migration -->
<!-- PROMPT_VERSION: 1.0 -->
<!-- LAST_VALIDATED: 2026-01-08 -->

**Repository:** https://github.com/EvanTenenbaum/TERP
**Task ID:** DATA-012
**Estimated Time:** 8-16h
**Module:** `server/routers/suppliers.ts`, `client/src/`
**Priority:** MEDIUM

---

## Problem Statement

The ST-045 User Flow Analysis identified that the `suppliers` router is a deprecated facade over the canonical `clients` router. The codebase comments explicitly state:

> "Get all suppliers (deprecated - use clients.list)"
> "Create supplier (deprecated - use clients.create)"

However, the suppliers router is still being used in some parts of the application, creating:

1. Dual data paths for the same entities
2. Potential data inconsistencies
3. Technical debt and maintenance burden
4. Confusion for developers

## Current State

### Suppliers Router (`server/routers/suppliers.ts`)

| Procedure    | Status          | Replacement                            |
| ------------ | --------------- | -------------------------------------- |
| `getAll`     | Deprecated      | `clients.list` with `isSeller: true`   |
| `getById`    | Deprecated      | `clients.getById`                      |
| `search`     | Deprecated      | `clients.list` with search params      |
| `create`     | Deprecated      | `clients.create` with `isSeller: true` |
| `update`     | Deprecated      | `clients.update`                       |
| `delete`     | Deprecated      | `clients.delete`                       |
| `getNotes`   | Active (MF-016) | Keep or migrate to `clients.notes`     |
| `createNote` | Active (MF-016) | Keep or migrate to `clients.notes`     |
| `updateNote` | Active (MF-016) | Keep or migrate                        |
| `deleteNote` | Active (MF-016) | Keep or migrate                        |
| `getHistory` | Active (MF-016) | Keep or migrate                        |

### Client Data Model

Clients with `isSeller = true` have a `supplierProfiles` record that contains supplier-specific data:

- `contactName`, `contactEmail`, `contactPhone`
- `paymentTerms`, `supplierNotes`
- `preferredPaymentMethod`
- `taxId`, `licenseNumber`
- `legacyVendorId` (for migration tracking)

## Objectives

1. Identify all client-side usages of `trpc.suppliers.*`
2. Migrate usages to `trpc.clients.*` equivalent
3. Decide fate of supplier notes (keep, migrate, or deprecate)
4. Add deprecation warnings to remaining suppliers router procedures
5. Eventually remove suppliers router entirely

## Reference Documentation

- **Flow Guide:** `docs/reference/FLOW_GUIDE.md` (Domain: Deprecated)
- **Flow Matrix:** `docs/reference/USER_FLOW_MATRIX.csv` (filter by Domain=Deprecated)

## Deliverables

### Phase 1: Audit & Plan

- [ ] Search codebase for all `trpc.suppliers` usages
- [ ] Document each usage with file path and line number
- [ ] Identify blocking issues for migration
- [ ] Create migration plan per component

### Phase 2: Client-Side Migration

- [ ] Migrate supplier list components to use clients.list
- [ ] Migrate supplier detail pages to use clients.getById
- [ ] Migrate supplier creation forms to use clients.create
- [ ] Update supplier search to use clients.list

### Phase 3: Notes Migration (Decision Required)

- [ ] Decide: Keep supplier notes or migrate to clients.notes
- [ ] If migrating: Create data migration script
- [ ] If keeping: Document as exception

### Phase 4: Cleanup

- [ ] Add `@deprecated` JSDoc to all suppliers router procedures
- [ ] Add console warnings for suppliers router usage
- [ ] Update documentation
- [ ] All tests passing

## Implementation Notes

### Finding Usages

```bash
# Find all client-side supplier usages
grep -r "trpc\.suppliers" client/src/ --include="*.tsx" --include="*.ts"

# Find supplier-related components
grep -r "supplier" client/src/components/ --include="*.tsx" -l
```

### Migration Pattern

```typescript
// Before (deprecated)
const { data: suppliers } = trpc.suppliers.getAll.useQuery();

// After (canonical)
const { data: suppliers } = trpc.clients.list.useQuery({
  isSeller: true,
});
```

## Success Criteria

- Zero `trpc.suppliers.*` calls in client code (except deprecated note procedures)
- All supplier functionality available via clients router
- No data loss during migration
- Clear deprecation warnings in code
- Updated documentation
