# Sales Sheet Module - Parallel Development Specification

**Version:** 1.0  
**Date:** October 25, 2025  
**Purpose:** Master specification for parallel implementation of Sales Sheet Module Phases 2-5

---

## Module Boundaries

### Module A: Pricing Rules UI (Phase 2)
- **Frontend Pages:** `/client/src/pages/PricingRulesPage.tsx`, `/client/src/pages/PricingProfilesPage.tsx`
- **Frontend Components:** `/client/src/components/pricing/RuleBuilder.tsx`, `/client/src/components/pricing/ConditionBuilder.tsx`
- **Backend:** Uses existing `/server/pricingEngine.ts` (NO CHANGES)
- **tRPC Endpoints:** `trpc.pricing.*` (already implemented)
- **Navigation:** Add links to sidebar, add routes to App.tsx

### Module B: Sales Sheet Core (Phase 3)
- **Frontend Pages:** `/client/src/pages/SalesSheetCreatorPage.tsx`
- **Frontend Components:** `/client/src/components/sales/InventoryBrowser.tsx`, `/client/src/components/sales/SalesSheetPreview.tsx`
- **Backend:** Create `/server/salesSheetsDb.ts`
- **tRPC Endpoints:** Add `salesSheets` router to `/server/routers.ts`
- **Navigation:** Add link to sidebar, add route to App.tsx

### Module C: Customization & Export (Phases 4-5)
- **Frontend Components:** `/client/src/components/sales/TemplateManager.tsx`, `/client/src/components/sales/ExportDialog.tsx`
- **Backend:** Extend `/server/salesSheetsDb.ts` with template and export functions
- **tRPC Endpoints:** Extend `salesSheets` router
- **Features:** Column visibility, price overrides, templates, clipboard/PDF/image export, history

---

## Locked Interface Contracts

### Backend: Pricing Engine (Module A)

**File:** `/server/pricingEngine.ts` (ALREADY COMPLETE - DO NOT MODIFY)

```typescript
// Pricing Rules
export async function getPricingRules(): Promise<PricingRule[]>
export async function getPricingRuleById(ruleId: number): Promise<PricingRule | null>
export async function createPricingRule(data: {...}): Promise<number>
export async function updatePricingRule(ruleId: number, data: {...}): Promise<void>
export async function deletePricingRule(ruleId: number): Promise<void>

// Pricing Profiles
export async function getPricingProfiles(): Promise<PricingProfile[]>
export async function getPricingProfileById(profileId: number): Promise<PricingProfile | null>
export async function createPricingProfile(data: {...}): Promise<number>
export async function updatePricingProfile(profileId: number, data: {...}): Promise<void>
export async function deletePricingProfile(profileId: number): Promise<void>
export async function applyProfileToClient(clientId: number, profileId: number): Promise<void>

// Client Pricing
export async function getClientPricingRules(clientId: number): Promise<PricingRule[]>
export async function calculateClientPrices(clientId: number, items: InventoryItem[]): Promise<PricedInventoryItem[]>
```

### tRPC: Pricing Router (Module A)

**File:** `/server/routers.ts` (ALREADY COMPLETE - DO NOT MODIFY)

```typescript
pricing: router({
  // Rules
  listRules: protectedProcedure.query(),
  getRuleById: protectedProcedure.input({ ruleId: z.number() }).query(),
  createRule: protectedProcedure.input({
    name: z.string(),
    description: z.string().optional(),
    adjustmentType: z.enum(["PERCENT_MARKUP", "PERCENT_MARKDOWN", "DOLLAR_MARKUP", "DOLLAR_MARKDOWN"]),
    adjustmentValue: z.number(),
    conditions: z.record(z.string(), z.any()),
    logicType: z.enum(["AND", "OR"]).optional(),
    priority: z.number().optional(),
  }).mutation(),
  updateRule: protectedProcedure.input({
    ruleId: z.number(),
    name: z.string().optional(),
    description: z.string().optional(),
    adjustmentType: z.enum(["PERCENT_MARKUP", "PERCENT_MARKDOWN", "DOLLAR_MARKUP", "DOLLAR_MARKDOWN"]).optional(),
    adjustmentValue: z.number().optional(),
    conditions: z.record(z.string(), z.any()).optional(),
    logicType: z.enum(["AND", "OR"]).optional(),
    priority: z.number().optional(),
    isActive: z.boolean().optional(),
  }).mutation(),
  deleteRule: protectedProcedure.input({ ruleId: z.number() }).mutation(),
  
  // Profiles
  listProfiles: protectedProcedure.query(),
  getProfileById: protectedProcedure.input({ profileId: z.number() }).query(),
  createProfile: protectedProcedure.input({
    name: z.string(),
    description: z.string().optional(),
    rules: z.array(z.object({ ruleId: z.number(), priority: z.number() })),
  }).mutation(),
  updateProfile: protectedProcedure.input({
    profileId: z.number(),
    name: z.string().optional(),
    description: z.string().optional(),
    rules: z.array(z.object({ ruleId: z.number(), priority: z.number() })).optional(),
  }).mutation(),
  deleteProfile: protectedProcedure.input({ profileId: z.number() }).mutation(),
  applyProfileToClient: protectedProcedure.input({ clientId: z.number(), profileId: z.number() }).mutation(),
  
  // Client Pricing
  getClientPricingRules: protectedProcedure.input({ clientId: z.number() }).query(),
})
```

### Backend: Sales Sheets (Module B - TO BE CREATED)

**File:** `/server/salesSheetsDb.ts` (CREATE THIS)

```typescript
// Inventory with Pricing
export async function getInventoryWithPricing(clientId: number): Promise<PricedInventoryItem[]>

// Sales Sheet History
export async function saveSalesSheet(data: {
  clientId: number;
  items: any[];
  totalValue: number;
  createdBy: number;
}): Promise<number>

export async function getSalesSheetHistory(clientId: number, limit?: number): Promise<SalesSheetHistory[]>
export async function getSalesSheetById(sheetId: number): Promise<SalesSheetHistory | null>
export async function deleteSalesSheet(sheetId: number): Promise<void>

// Templates (Module C)
export async function createTemplate(data: {
  name: string;
  clientId?: number;
  isUniversal: boolean;
  items: any[];
  columnConfig: any;
}): Promise<number>

export async function getTemplates(clientId?: number, includeUniversal?: boolean): Promise<SalesSheetTemplate[]>
export async function loadTemplate(templateId: number): Promise<SalesSheetTemplate | null>
export async function deleteTemplate(templateId: number): Promise<void>
```

### tRPC: Sales Sheets Router (Module B - TO BE ADDED)

**File:** `/server/routers.ts` (ADD THIS ROUTER)

```typescript
salesSheets: router({
  // Inventory
  getInventory: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(),
  
  // History
  save: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      items: z.array(z.any()),
      totalValue: z.number(),
    }))
    .mutation(),
  
  getHistory: protectedProcedure
    .input(z.object({ clientId: z.number(), limit: z.number().optional() }))
    .query(),
  
  getById: protectedProcedure
    .input(z.object({ sheetId: z.number() }))
    .query(),
  
  delete: protectedProcedure
    .input(z.object({ sheetId: z.number() }))
    .mutation(),
  
  // Templates (Module C)
  createTemplate: protectedProcedure
    .input(z.object({
      name: z.string(),
      clientId: z.number().optional(),
      isUniversal: z.boolean(),
      items: z.array(z.any()),
      columnConfig: z.any(),
    }))
    .mutation(),
  
  getTemplates: protectedProcedure
    .input(z.object({ clientId: z.number().optional(), includeUniversal: z.boolean().optional() }))
    .query(),
  
  loadTemplate: protectedProcedure
    .input(z.object({ templateId: z.number() }))
    .query(),
  
  deleteTemplate: protectedProcedure
    .input(z.object({ templateId: z.number() }))
    .mutation(),
})
```

---

## Shared Data Models

**Location:** `/drizzle/schema.ts` (IMPORT ONLY - DO NOT MODIFY)

```typescript
// Import these types in all modules
import {
  type PricingRule,
  type PricingProfile,
  type SalesSheetTemplate,
  type SalesSheetHistory,
  type Client,
  type Batch,
} from "@/drizzle/schema";
```

---

## TERP Coding Standards

### 1. Imports
```typescript
// Always use absolute imports with @ alias
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { type Client } from "@/drizzle/schema";
```

### 2. Component Structure
```typescript
export default function ModulePage() {
  // 1. tRPC hooks
  const { data, isLoading } = trpc.module.list.useQuery();
  
  // 2. Local state
  const [filter, setFilter] = useState("");
  
  // 3. Mutations
  const createMutation = trpc.module.create.useMutation({
    onSuccess: () => {
      utils.module.list.invalidate();
    },
  });
  
  // 4. Handlers
  const handleCreate = () => {...};
  
  // 5. Loading state
  if (isLoading) return <div>Loading...</div>;
  
  // 6. Render
  return <div>...</div>;
}
```

### 3. Naming Conventions
- Files: `PascalCase.tsx` for components, `camelCase.ts` for utilities
- Functions: `camelCase` (e.g., `getClients`, `handleSubmit`)
- Components: `PascalCase` (e.g., `ClientsList`, `AddClientDialog`)
- Database functions: `verbNoun` (e.g., `getClients`, `createClient`)

### 4. UI Components
- Use shadcn/ui components exclusively
- Tailwind CSS for styling (no custom CSS files)
- Responsive by default (mobile-first)
- Icons from lucide-react

### 5. Error Handling
```typescript
const mutation = trpc.module.create.useMutation({
  onSuccess: () => {
    toast.success("Created successfully");
    utils.module.list.invalidate();
  },
  onError: (error) => {
    console.error("Failed:", error.message);
    toast.error("Failed to create: " + error.message);
  },
});
```

---

## Design System

### shadcn/ui Components
- Button, Input, Select, Dialog, Table, Card, Badge, Checkbox, Textarea
- DropdownMenu, Popover, Tabs, ScrollArea, Separator

### Icons (lucide-react)
- Plus, Edit, Trash, Search, Settings, TrendingUp, Download, Copy, FileText, Image

### Tailwind Classes
- Layout: `grid`, `flex`, `gap-4`, `p-4`, `rounded-lg`, `shadow-md`
- Responsive: `sm:`, `md:`, `lg:`, `xl:`
- Colors: Primary (blue), Success (green), Danger (red), Warning (yellow)

---

## Integration Points

### Navigation (MUST UPDATE AFTER ALL MODULES COMPLETE)

**File:** `/client/src/components/layout/AppSidebar.tsx`

Add these navigation items:
```typescript
{ name: 'Pricing Rules', href: '/pricing/rules', icon: TrendingUp },
{ name: 'Pricing Profiles', href: '/pricing/profiles', icon: Settings },
{ name: 'Sales Sheets', href: '/sales-sheets', icon: FileText },
```

### Routing (MUST UPDATE AFTER ALL MODULES COMPLETE)

**File:** `/client/src/App.tsx`

Add these routes:
```typescript
<Route path="/pricing/rules" component={PricingRulesPage} />
<Route path="/pricing/profiles" component={PricingProfilesPage} />
<Route path="/sales-sheets" component={SalesSheetCreatorPage} />
```

---

## Module-Specific Requirements

### Module A: Pricing Rules UI

**Files to Create:**
1. `/client/src/pages/PricingRulesPage.tsx`
2. `/client/src/pages/PricingProfilesPage.tsx`
3. `/client/src/components/pricing/RuleBuilder.tsx` (optional, can be inline)
4. `/client/src/components/pricing/ConditionBuilder.tsx` (optional, can be inline)

**Features:**
- List all pricing rules (table view with search/filter)
- Create/Edit/Delete pricing rules
- Rule builder UI (adjustment type, value, conditions, logic, priority)
- List all pricing profiles (table view)
- Create/Edit/Delete pricing profiles
- Profile builder UI (select rules, set priorities)
- Update ClientProfilePage with "Pricing Configuration" tab

**DO NOT:**
- Modify `/server/pricingEngine.ts`
- Modify `/server/routers.ts`
- Modify `/drizzle/schema.ts`
- Add navigation links (will be done in integration phase)
- Add routes to App.tsx (will be done in integration phase)

### Module B: Sales Sheet Core

**Files to Create:**
1. `/client/src/pages/SalesSheetCreatorPage.tsx`
2. `/client/src/components/sales/InventoryBrowser.tsx`
3. `/client/src/components/sales/SalesSheetPreview.tsx`
4. `/server/salesSheetsDb.ts`

**Files to Modify:**
1. `/server/routers.ts` (add `salesSheets` router)

**Features:**
- Client selection dropdown (loads pricing profile)
- Two-panel layout (inventory browser + sales sheet preview)
- Inventory table with search/filter
- Real-time price calculation using pricing engine
- Add items to sales sheet (individual/bulk)
- Drag-and-drop reordering in preview
- Delete items from sheet
- Save to history

**DO NOT:**
- Modify `/server/pricingEngine.ts`
- Modify `/drizzle/schema.ts`
- Add navigation links (will be done in integration phase)
- Add routes to App.tsx (will be done in integration phase)

### Module C: Customization & Export

**Files to Create:**
1. `/client/src/components/sales/TemplateManager.tsx`
2. `/client/src/components/sales/ExportDialog.tsx`
3. `/client/src/components/sales/ColumnVisibilityToggle.tsx`

**Files to Modify:**
1. `/server/salesSheetsDb.ts` (extend with template functions)
2. `/server/routers.ts` (extend `salesSheets` router with template endpoints)
3. `/client/src/pages/SalesSheetCreatorPage.tsx` (add customization features)
4. `/client/src/components/sales/SalesSheetPreview.tsx` (add export features)

**Features:**
- Column visibility toggles
- Inline price override (click to edit)
- Save as template (client-specific or universal)
- Load template
- Export to clipboard (WhatsApp/Signal format)
- Export to PDF
- Export to image
- Sales sheet history view

**DO NOT:**
- Modify `/server/pricingEngine.ts`
- Modify `/drizzle/schema.ts`
- Add navigation links (will be done in integration phase)

---

## Parallelization Safety Checklist

✅ **Backend interfaces locked:** Pricing engine complete, sales sheets interface defined  
✅ **Database schema frozen:** No changes to `/drizzle/schema.ts`  
✅ **tRPC contracts defined:** All endpoints documented  
✅ **No shared utilities to create:** All utilities already exist  
✅ **No cross-module dependencies:** Each module works independently  
✅ **Navigation/routing deferred:** Will be integrated after all modules complete  
✅ **Coding standards documented:** PARALLEL_DEVELOPMENT_PROTOCOL.md  
✅ **Design system established:** shadcn/ui + Tailwind  

---

## Success Criteria

### Module A (Pricing Rules UI)
- [ ] PricingRulesPage.tsx complete with full CRUD
- [ ] PricingProfilesPage.tsx complete with profile management
- [ ] Client Profile has "Pricing Configuration" tab
- [ ] All UI is mobile-responsive
- [ ] Follows TERP design system
- [ ] TypeScript compiles with 0 errors
- [ ] No placeholders or TODOs

### Module B (Sales Sheet Core)
- [ ] SalesSheetCreatorPage.tsx complete
- [ ] InventoryBrowser.tsx with search/filter
- [ ] SalesSheetPreview.tsx with drag-and-drop
- [ ] salesSheetsDb.ts with all functions
- [ ] salesSheets router added to routers.ts
- [ ] TypeScript compiles with 0 errors
- [ ] No placeholders or TODOs

### Module C (Customization & Export)
- [ ] Column visibility toggles working
- [ ] Inline price override functional
- [ ] Template system complete (save/load)
- [ ] Clipboard export working
- [ ] PDF export working
- [ ] Image export working
- [ ] History view complete
- [ ] TypeScript compiles with 0 errors
- [ ] No placeholders or TODOs

---

## Post-Parallelization Integration

After all modules complete:

1. **Update Navigation** (`/client/src/components/layout/AppSidebar.tsx`)
   - Add Pricing Rules, Pricing Profiles, Sales Sheets links

2. **Update Routing** (`/client/src/App.tsx`)
   - Add routes for all new pages

3. **System-Wide Validation**
   - Run `webdev_check_status`
   - Test all navigation flows
   - Verify data flows
   - Check responsive design
   - Browser testing

4. **Documentation Update**
   - Update CHANGELOG.md
   - Update PROJECT_CONTEXT.md
   - Update todo.md

5. **Checkpoint & Push**
   - Save checkpoint
   - Push to GitHub

---

**End of Specification**

