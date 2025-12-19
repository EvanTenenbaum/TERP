# Phase 3.2: Data Export (CSV/Excel) - Impact Analysis

## Current State
- Users can view data in tables
- No way to export data for offline analysis
- Cannot share data with external stakeholders

## Gap
- No export functionality
- Users resort to manual copy-paste
- Difficult to analyze large datasets

## Solution
Add CSV export buttons to key pages (Inventory, Orders, Clients)

## Implementation Approach
Use client-side CSV generation (no backend needed):
- Simple, fast, no server load
- Works with filtered data
- Respects current view

## Files to Create
1. `client/src/utils/exportToCSV.ts` - CSV export utility

## Files to Modify
1. `client/src/pages/Inventory.tsx` - Add export button
2. `client/src/pages/Orders.tsx` - Add export button
3. `client/src/pages/ClientsListPage.tsx` - Add export button

## Features
1. Export current view (respects filters and search)
2. Include all visible columns
3. Automatic filename with timestamp
4. CSV format (opens in Excel)

## User Flow
1. User applies filters (optional)
2. Clicks "Export" button
3. CSV file downloads automatically
4. Opens in Excel/Google Sheets

## Technical Details
- Use browser's download API
- Generate CSV from current data
- Include headers
- Handle special characters (commas, quotes)
- Format dates properly

## Testing
- Export with no filters
- Export with filters applied
- Export with search query
- Open in Excel
- Verify data accuracy
