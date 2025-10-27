# Phase 3.5: Price Simulation Tool - Impact Analysis

## Objective
Add a price simulation tool to test different pricing scenarios and understand margin impact before committing to price changes.

## Features to Implement

### 1. Price Simulation Modal
- Input new price for a batch
- See current vs. simulated metrics
- Calculate margin impact
- Compare scenarios side-by-side

### 2. What-If Analysis
- "What if I price this at $X?"
- Show revenue, cost, margin at different prices
- Visualize margin curve
- Find optimal price point

### 3. Batch Pricing Tool
- Accessible from batch detail drawer
- Quick price testing
- Save simulation results (optional)

## Files to Modify

### Frontend
- `client/src/components/inventory/PriceSimulationModal.tsx` - NEW modal
- `client/src/components/inventory/BatchDetailDrawer.tsx` - Add simulation button

## Implementation Steps

1. Create PriceSimulationModal component
2. Add simulation button to BatchDetailDrawer
3. Implement price calculation logic
4. Add comparison view
5. Test and validate

## Risk Assessment

**Low Risk:**
- Read-only calculations
- No data modifications
- Client-side only (no backend needed)

## Success Criteria

- [ ] Can simulate different prices
- [ ] Shows margin impact clearly
- [ ] Comparison view works
- [ ] TypeScript passes with 0 errors

