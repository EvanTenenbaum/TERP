# TERP Parallel Development Protocol

## Overview

This protocol enables safe, robust parallel development for the TERP ERP system while maintaining code quality, consistency, and seamless integration. Parallel development is the **default approach** for feature development when modules meet the parallelization criteria.

---

## When to Use Parallel Development

**Default for:**
- Multiple independent UI pages/components
- Separate backend routers with distinct domains
- Independent database modules
- Isolated utility functions
- Multiple widget components
- Separate API integrations

**NOT suitable for:**
- Shared type definitions
- Core infrastructure changes
- Database schema modifications
- Authentication/authorization systems
- Routing configuration
- Build/deployment scripts

---

## Pre-Parallelization Requirements

### 1. Master Specification Document

Before spawning parallel agents, create a comprehensive spec containing:

#### A. System Architecture
```markdown
## Module Boundaries
- Frontend: `/client/src/pages/[ModuleName]Page.tsx`
- Backend: `/server/[moduleName]Db.ts` + router in `/server/routers.ts`
- Database: Tables in `/drizzle/schema.ts`
- Types: Exported from schema, imported by all modules

## Data Flow
User → Page Component → tRPC Client → Router → DB Module → Database
```

#### B. Interface Contracts

**Example: Client Management Module**
```typescript
// Backend Interface (clientsDb.ts)
export async function getClients(filters: {
  search?: string;
  clientTypes?: string[];
  hasDebt?: boolean;
  tags?: string[];
  limit?: number;
  offset?: number;
}): Promise<Client[]>

export async function getClientById(clientId: number): Promise<Client | null>

export async function createClient(data: InsertClient): Promise<number>

// tRPC Router Interface
clients: router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      clientTypes: z.array(z.string()).optional(),
      hasDebt: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }))
    .query(async ({ input }) => {...}),
})

// Frontend Interface (ClientsListPage.tsx)
const { data: clients } = trpc.clients.list.useQuery({
  search: searchTerm,
  limit: 50,
});
```

#### C. Shared Data Models

**Location:** `/drizzle/schema.ts`

All modules MUST import types from schema:
```typescript
import { type Client, type ClientTransaction } from "@/drizzle/schema";
```

**Never redefine types in individual modules.**

#### D. Project File Structure

```
/client/src/
  /pages/
    ClientsListPage.tsx          ← Module A
    ClientProfilePage.tsx        ← Module A
    PricingRulesPage.tsx         ← Module B
    PricingProfilesPage.tsx      ← Module B
    SalesSheetCreatorPage.tsx    ← Module C
  /components/
    /clients/
      AddClientWizard.tsx        ← Module A
    /pricing/
      RuleBuilder.tsx            ← Module B
    /sales/
      InventoryBrowser.tsx       ← Module C

/server/
  clientsDb.ts                   ← Module A backend
  pricingEngine.ts               ← Module B backend
  salesSheetsDb.ts               ← Module C backend
  routers.ts                     ← Integration point (add all routers here)

/drizzle/
  schema.ts                      ← Shared types (edit before parallelizing)
```

#### E. Coding Standards

**TERP Project Standards:**

1. **Imports:**
   ```typescript
   // Always use absolute imports with @ alias
   import { trpc } from "@/lib/trpc";
   import { Button } from "@/components/ui/button";
   import { type Client } from "@/drizzle/schema";
   ```

2. **Component Structure:**
   ```typescript
   export default function ModulePage() {
     // 1. tRPC hooks
     const { data, isLoading } = trpc.module.list.useQuery();
     
     // 2. Local state
     const [filter, setFilter] = useState("");
     
     // 3. Mutations
     const createMutation = trpc.module.create.useMutation();
     
     // 4. Handlers
     const handleCreate = () => {...};
     
     // 5. Render
     return <div>...</div>;
   }
   ```

3. **Naming Conventions:**
   - Files: `PascalCase.tsx` for components, `camelCase.ts` for utilities
   - Functions: `camelCase` (e.g., `getClients`, `handleSubmit`)
   - Components: `PascalCase` (e.g., `ClientsList`, `AddClientDialog`)
   - Database functions: `verbNoun` (e.g., `getClients`, `createClient`, `updateClient`)

4. **UI Components:**
   - Use shadcn/ui components exclusively
   - Tailwind CSS for styling (no custom CSS files)
   - Responsive by default (mobile-first)

5. **Error Handling:**
   ```typescript
   const mutation = trpc.module.create.useMutation({
     onSuccess: () => {
       // Show success message
       // Invalidate queries
       utils.module.list.invalidate();
     },
     onError: (error) => {
       console.error("Failed:", error.message);
       // Show error message to user
     },
   });
   ```

#### F. Dependencies

**Locked Versions (from package.json):**
- React: 19.x
- Tailwind CSS: 4.x
- tRPC: Latest
- Drizzle ORM: Latest
- Zod: Latest

**Import Patterns:**
```typescript
// tRPC
import { trpc } from "@/lib/trpc";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

// Icons
import { Plus, Edit, Trash, Search } from "lucide-react";

// Types
import { type Client } from "@/drizzle/schema";
```

#### G. Integration Points Map

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│                                                               │
│  ClientsListPage ──┐                                         │
│  ClientProfilePage ├──→ trpc.clients.*                       │
│  AddClientWizard ──┘                                         │
│                                                               │
│  PricingRulesPage ──┐                                        │
│  PricingProfilesPage├──→ trpc.pricing.*                      │
│  RuleBuilder ───────┘                                        │
│                                                               │
│  SalesSheetCreator ─────→ trpc.salesSheets.*                 │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    tRPC Router Layer                         │
│                                                               │
│  /server/routers.ts                                          │
│    ├─ clients: router({...})  ──→ clientsDb.ts              │
│    ├─ pricing: router({...})  ──→ pricingEngine.ts          │
│    └─ salesSheets: router({...}) ──→ salesSheetsDb.ts       │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│                                                               │
│  /drizzle/schema.ts (Shared Types)                           │
│    ├─ clients table                                          │
│    ├─ pricing_rules table                                    │
│    └─ sales_sheet_history table                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Parallelization Rules

### Rule 1: Module Independence

**✅ Safe to Parallelize:**
```
Module A: Client Management (clients table, clientsDb.ts, ClientsListPage.tsx)
Module B: Pricing Engine (pricing_rules table, pricingEngine.ts, PricingRulesPage.tsx)
Module C: Sales Sheets (sales_sheet_history table, salesSheetsDb.ts, SalesSheetCreatorPage.tsx)
```

**❌ NOT Safe to Parallelize:**
```
- Shared utility functions (create first, then distribute)
- Type definitions (define in schema.ts before parallelizing)
- Router configuration (integrate sequentially)
- Navigation menu (update after all modules complete)
```

### Rule 2: Locked Interfaces

Before parallelizing, **freeze** these interfaces:

1. **Database Schema** - All tables defined in `schema.ts`
2. **tRPC Input/Output Types** - Exact Zod schemas documented
3. **Component Props** - If components interact, define props first
4. **API Contracts** - Function signatures locked

### Rule 3: Self-Contained Modules

Each parallel module must:
- Live in its own directory/file
- Import shared code, never create it
- Not modify files outside its scope
- Not depend on other parallel modules

---

## Parallel Agent Instructions Template

```markdown
## Your Assignment: [Module Name]

You are implementing the **[Module Name]** module for the TERP ERP system.

### What You're Building
[Brief description of the module's purpose]

### Your Files
**Create these files:**
- `/client/src/pages/[ModuleName]Page.tsx`
- `/client/src/components/[module]/[Component].tsx`
- `/server/[moduleName]Db.ts`

**DO NOT create:**
- Shared utilities (import from existing paths)
- Type definitions (import from `/drizzle/schema.ts`)
- Router configuration (will be integrated later)

### Interface Contract
You MUST implement these exact functions:

**Backend (`/server/[moduleName]Db.ts`):**
```typescript
export async function get[Items](filters: {...}): Promise<Item[]>
export async function get[Item]ById(id: number): Promise<Item | null>
export async function create[Item](data: Insert[Item]): Promise<number>
export async function update[Item](id: number, data: Partial<Insert[Item]>): Promise<void>
export async function delete[Item](id: number): Promise<void>
```

**Frontend (`/client/src/pages/[ModuleName]Page.tsx`):**
- List view with search/filter
- Create dialog
- Edit dialog
- Delete confirmation
- Responsive design (mobile-first)

### Shared Types (Import Only)
```typescript
import { type [Item], type Insert[Item] } from "@/drizzle/schema";
```

### Coding Standards
[Include relevant sections from master spec]

### Example Code
[Provide 1-2 examples of similar completed modules]

### Success Criteria
- [ ] All interface functions implemented with exact signatures
- [ ] Zero code duplication (all shared code imported)
- [ ] Follows TERP coding standards
- [ ] TypeScript compiles with zero errors
- [ ] UI matches existing TERP design system
- [ ] Mobile responsive
- [ ] No TODOs, placeholders, or stubs

### Explicit Restrictions
- ❌ DO NOT create utility functions (import from existing)
- ❌ DO NOT define types (import from schema)
- ❌ DO NOT modify `/server/routers.ts` (integration happens later)
- ❌ DO NOT modify `/drizzle/schema.ts` (already defined)
- ❌ DO NOT create shared components (use shadcn/ui)
```

---

## Integration Protocol

### Phase 1: Pre-Integration Preparation

1. **Create Shared Infrastructure First**
   ```bash
   # Before parallelizing, create:
   - All shared types in /drizzle/schema.ts
   - All shared utilities in /lib/
   - All shared components in /components/ui/
   - Database migrations
   ```

2. **Collect Parallel Implementations**
   ```bash
   # Each agent delivers:
   - Source files (pages, components, db modules)
   - TypeScript compilation report (must be 0 errors)
   - Self-test results
   ```

### Phase 2: Sequential Integration

**Integration Order (by dependency):**
1. Database modules (`*Db.ts`) - No dependencies
2. tRPC routers (add to `/server/routers.ts`) - Depends on DB modules
3. Frontend pages - Depends on tRPC routers
4. Navigation links - Depends on pages existing

**Integration Checklist (per module):**
```markdown
- [ ] Copy files to correct locations
- [ ] Add tRPC router to `/server/routers.ts`
- [ ] Run `pnpm tsc --noEmit` (must pass)
- [ ] Test all CRUD operations
- [ ] Verify UI renders correctly
- [ ] Check mobile responsiveness
- [ ] Add navigation link to sidebar
- [ ] Update `todo.md` to mark tasks complete
- [ ] Run `webdev_check_status` (must pass)
```

### Phase 3: Post-Integration Validation

After integrating ALL modules:

1. **Code Review:**
   - Check for duplicate code across modules
   - Verify consistent naming conventions
   - Ensure all imports use @ alias
   - Confirm no placeholder code remains

2. **Functional Testing:**
   - Test each module's CRUD operations
   - Test cross-module interactions (if any)
   - Verify error handling works
   - Check loading states display correctly

3. **UI/UX Verification:**
   - Consistent styling across all modules
   - Responsive on mobile/tablet/desktop
   - Accessible (keyboard navigation, screen readers)
   - Matches TERP design system

4. **Performance Testing:**
   - No excessive re-renders
   - Queries use proper pagination/limits
   - No memory leaks
   - Fast initial load times

5. **Refactoring (if needed):**
   - Extract duplicate code into shared utilities
   - Standardize inconsistent patterns
   - Optimize slow queries
   - Improve error messages

---

## Success Criteria

### Zero Code Duplication
```typescript
// ❌ BAD: Each module has its own formatCurrency
// Module A
function formatCurrency(amount: number) { return `$${amount.toFixed(2)}`; }

// Module B
function formatCurrency(amount: number) { return `$${amount.toFixed(2)}`; }

// ✅ GOOD: Shared utility imported by all
// /lib/utils.ts
export function formatCurrency(amount: number) { return `$${amount.toFixed(2)}`; }

// Module A & B
import { formatCurrency } from "@/lib/utils";
```

### Identical Shared Dependencies
```typescript
// ✅ All modules import from same locations
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { type Client } from "@/drizzle/schema";
```

### Perfect Interface Compliance
```typescript
// ✅ Backend implements exact signature from spec
export async function getClients(filters: {
  search?: string;
  limit?: number;
}): Promise<Client[]> {
  // Implementation
}

// ✅ Frontend calls with exact types
const { data } = trpc.clients.list.useQuery({
  search: searchTerm,
  limit: 50,
});
```

### Single Consistent Coding Style
- All files use same import order
- All components follow same structure
- All functions use same naming convention
- All error handling follows same pattern

### Seamless Integration
- No modifications needed to parallel work
- All modules work together without conflicts
- TypeScript compiles with zero errors
- All tests pass

---

## Example: Sales Sheet Module Parallelization

### Master Spec (Created First)

```markdown
## Sales Sheet Module

### Module Boundaries
- Frontend: SalesSheetCreatorPage, InventoryBrowser, SheetPreview
- Backend: salesSheetsDb.ts, pricingEngine.ts (already exists)
- Database: sales_sheet_history, sales_sheet_templates

### Interface Contracts

**Backend:**
```typescript
// salesSheetsDb.ts
export async function getInventoryWithPricing(clientId: number): Promise<PricedInventoryItem[]>
export async function saveSalesSheet(data: InsertSalesSheet): Promise<number>
export async function getSalesSheetHistory(clientId: number): Promise<SalesSheet[]>
export async function exportSalesSheetPDF(sheetId: number): Promise<Buffer>
```

**tRPC Router:**
```typescript
salesSheets: router({
  getInventory: protectedProcedure.input(z.object({ clientId: z.number() })).query(...),
  save: protectedProcedure.input(z.object({...})).mutation(...),
  getHistory: protectedProcedure.input(z.object({ clientId: z.number() })).query(...),
  exportPDF: protectedProcedure.input(z.object({ sheetId: z.number() })).mutation(...),
})
```

**Frontend:**
```typescript
// SalesSheetCreatorPage.tsx
- Client selector dropdown
- Inventory browser (table with search/filter)
- Sheet preview (reorderable list)
- Export buttons (clipboard, PDF, image)
```

### Parallel Assignments

**Agent 1: Backend (salesSheetsDb.ts)**
- Implement all database functions
- Use existing pricingEngine.ts for price calculations
- Import types from schema.ts
- DO NOT create tRPC router (will be integrated later)

**Agent 2: Frontend - Inventory Browser**
- Create InventoryBrowser.tsx component
- Real-time search/filter (debounced 300ms)
- Bulk select functionality
- Import types from schema.ts
- DO NOT implement tRPC calls (will be integrated later)

**Agent 3: Frontend - Sheet Preview**
- Create SheetPreview.tsx component
- Drag-and-drop reordering
- Delete items
- Export functionality (clipboard, PDF, image)
- Import types from schema.ts

### Integration Order
1. Integrate Agent 1 (backend) → Add to routers.ts
2. Integrate Agent 2 (inventory browser) → Connect to tRPC
3. Integrate Agent 3 (sheet preview) → Connect to tRPC
4. Create SalesSheetCreatorPage.tsx that combines Agent 2 + Agent 3
5. Add navigation link
6. Test end-to-end workflow
```

---

## Troubleshooting

### Problem: Agents Created Duplicate Utilities

**Solution:**
1. Identify all duplicate functions
2. Move to `/lib/utils.ts` or appropriate shared location
3. Update all imports across modules
4. Delete duplicate code
5. Re-test all modules

### Problem: Interface Mismatch

**Solution:**
1. Check master spec for correct interface
2. Identify which module deviated
3. Update module to match spec exactly
4. Re-integrate and test

### Problem: Inconsistent Styling

**Solution:**
1. Establish design system reference (e.g., existing page)
2. Update all modules to match reference
3. Extract common styles to shared Tailwind classes
4. Document style patterns in master spec

### Problem: TypeScript Errors After Integration

**Solution:**
1. Run `pnpm tsc --noEmit` to see all errors
2. Fix type mismatches (usually import issues)
3. Ensure all modules import from schema.ts
4. Verify tRPC router types match backend functions

---

## Conclusion

Parallel development is **safe and robust** when:
1. Master specification is comprehensive and locked
2. Modules are truly independent
3. Shared code is created first
4. Integration follows strict protocol
5. Post-integration validation is thorough

This protocol ensures parallel development maintains the same quality, consistency, and reliability as sequential development, while dramatically accelerating delivery timelines.

---

## Appendix: TERP-Specific Checklists

### Pre-Parallelization Checklist
- [ ] All database tables defined in `/drizzle/schema.ts`
- [ ] All shared types exported from schema
- [ ] All shared utilities created in `/lib/`
- [ ] All shadcn/ui components installed
- [ ] Master specification document complete
- [ ] Interface contracts locked and documented
- [ ] Coding standards documented with examples
- [ ] Integration order determined
- [ ] Success criteria defined

### Per-Agent Delivery Checklist
- [ ] All assigned files created
- [ ] TypeScript compiles with 0 errors
- [ ] All interface contracts implemented exactly
- [ ] No duplicate code (all shared code imported)
- [ ] Follows TERP coding standards
- [ ] No TODOs, placeholders, or stubs
- [ ] Self-tested (basic functionality works)
- [ ] Delivery includes: source files + compilation report

### Integration Checklist (Per Module)
- [ ] Files copied to correct locations
- [ ] tRPC router added to `/server/routers.ts`
- [ ] `pnpm tsc --noEmit` passes
- [ ] All CRUD operations tested
- [ ] UI renders correctly
- [ ] Mobile responsive
- [ ] Navigation link added
- [ ] `todo.md` updated
- [ ] `webdev_check_status` passes

### Post-Integration Validation Checklist
- [ ] Code review complete (no duplication, consistent style)
- [ ] Functional testing complete (all features work)
- [ ] UI/UX verification complete (consistent, responsive, accessible)
- [ ] Performance testing complete (no issues found)
- [ ] Refactoring complete (if needed)
- [ ] Documentation updated
- [ ] Checkpoint saved
- [ ] Pushed to GitHub

