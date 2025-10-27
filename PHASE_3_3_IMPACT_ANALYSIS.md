# Phase 3.3: Bulk Actions for Inventory - Impact Analysis

## 🎯 Objective
Add multi-select and bulk operations to Inventory page for efficient batch management.

## 📋 Features to Implement

### 1. Multi-Select UI
- Checkbox column in inventory table
- "Select All" checkbox in header
- Selected count indicator
- Clear selection button

### 2. Bulk Actions Menu
- Bulk status change (LIVE, ON_HOLD, QUARANTINED, etc.)
- Bulk delete/archive
- Bulk export (CSV)
- Bulk location update

### 3. Confirmation Dialogs
- Show affected items count
- Preview changes before applying
- Undo capability (optional)

## 🗂️ Files to Modify

### Frontend
- `client/src/pages/Inventory.tsx` - Add multi-select state and UI
- `client/src/components/inventory/BulkActionsBar.tsx` - NEW component
- `client/src/components/inventory/BulkConfirmDialog.tsx` - NEW component

### Backend
- `server/routers/inventory.ts` - Add bulk endpoints
- `server/inventoryDb.ts` - Add bulk operation functions

## 🔄 Implementation Steps

1. Add multi-select state to Inventory page
2. Add checkbox column to table
3. Create BulkActionsBar component
4. Add bulk status update endpoint
5. Add bulk delete endpoint
6. Add confirmation dialogs
7. Test and validate

## ⚠️ Risk Assessment

**Low Risk:**
- UI changes only affect Inventory page
- Backend operations use existing functions
- All operations wrapped in transactions

**Validation Required:**
- Prevent bulk operations on SOLD_OUT batches
- Confirm before destructive operations
- Log all bulk changes for audit

## ✅ Success Criteria

- [ ] Can select multiple inventory items
- [ ] Can change status of multiple items at once
- [ ] Can delete multiple items with confirmation
- [ ] All operations logged in audit trail
- [ ] TypeScript passes with 0 errors

