# Phase 3.4: Profitability Analysis - Impact Analysis

## Objective
Add profitability calculations and reporting to understand margins and identify most profitable products/batches.

## Features to Implement

### 1. Margin Calculations
- Calculate gross margin per batch (selling price - cost)
- Calculate margin percentage
- Track realized vs. potential profit
- Show profitability indicators

### 2. Profitability Dashboard Widget
- Top profitable products
- Lowest margin items
- Total profit metrics
- Margin trends

### 3. Batch Profitability View
- Show margin on batch detail
- Profit/loss indicators
- Cost breakdown
- Selling price history

## Files to Modify

### Backend
- `server/routers/inventory.ts` - Add profitability endpoints
- `server/inventoryDb.ts` - Add profitability calculations

### Frontend  
- `client/src/components/inventory/ProfitabilityWidget.tsx` - NEW widget
- `client/src/components/inventory/BatchDetailDrawer.tsx` - Add profitability section
- `client/src/pages/DashboardV2.tsx` - Add profitability widget

## Implementation Steps

1. Add profitability calculation functions to backend
2. Create profitability API endpoints
3. Create ProfitabilityWidget component
4. Add profitability section to BatchDetailDrawer
5. Integrate widget into dashboard
6. Test and validate

## Risk Assessment

**Low Risk:**
- Read-only calculations
- No data modifications
- Uses existing order/batch data

**Considerations:**
- Need to handle batches without sales data
- Need to account for partial sales
- Consider returns in profit calculations

## Success Criteria

- [ ] Can view profitability metrics on dashboard
- [ ] Can see margin on each batch
- [ ] Calculations account for returns
- [ ] TypeScript passes with 0 errors

