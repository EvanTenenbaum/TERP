# Phase 3.1: Saved Filters/Views for Inventory - Impact Analysis

## Current State
- Users can filter inventory by multiple criteria
- Filters reset when navigating away
- Must re-apply filters every time

## Gap
- No way to save filter combinations
- Repetitive work for common views
- No sharing of useful views

## Solution
Add saved filter views that persist in database and can be quickly applied

## Files to Create
1. `client/src/components/inventory/SavedViewsDropdown.tsx` - UI for saved views
2. `client/src/components/inventory/SaveViewModal.tsx` - Modal to save current filters

## Files to Modify
1. `drizzle/schema.ts` - Add inventoryViews table
2. `server/routers/inventory.ts` - Add view management endpoints
3. `server/inventoryDb.ts` - Add view CRUD functions
4. `client/src/pages/Inventory.tsx` - Integrate saved views

## Database Schema
```typescript
export const inventoryViews = mysqlTable("inventory_views", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull(),
  filters: json("filters").notNull(), // Store filter state as JSON
  createdBy: int("created_by").references(() => users.id),
  isShared: boolean("is_shared").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
```

## Features
1. Save current filter state with a name
2. Quick-apply saved views from dropdown
3. Delete saved views
4. Optional: Share views with team (isShared flag)

## User Flow
1. User applies multiple filters (category, status, vendor, etc.)
2. Clicks "Save View" button
3. Names the view (e.g., "Low Stock Electronics")
4. View appears in "Saved Views" dropdown
5. Can quickly apply view anytime
6. Can delete views they created

## Ripple Effects
- Improves productivity
- Reduces repetitive filtering
- Enables power users to work faster

## Testing
- Save view with filters
- Apply saved view
- Delete saved view
- Multiple views work correctly
- Filters persist correctly
