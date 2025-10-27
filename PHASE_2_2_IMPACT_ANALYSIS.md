# Phase 2.2: Dashboard Drill-downs - Impact Analysis

## Current State
- DashboardV2 exists with statistics cards
- Statistics show counts but are not clickable
- No way to drill down from dashboard to filtered views

## Files to Modify
1. `client/src/pages/DashboardV2.tsx` - Make stat cards clickable
2. `client/src/pages/Inventory.tsx` - Accept URL params for filters
3. `client/src/pages/Orders.tsx` - Accept URL params for filters
4. `client/src/pages/ClientsListPage.tsx` - Accept URL params for filters

## Features to Implement
1. Clickable dashboard stat cards
2. Navigate to filtered views with URL params
3. Pre-apply filters based on URL params
4. Highlight active filters from URL

## Example Drill-downs
- "Low Stock (15)" → Navigate to Inventory with lowStock=true filter
- "Pending Orders (8)" → Navigate to Orders with status=PENDING filter
- "Overdue Payments (3)" → Navigate to Clients with hasDebt=true filter
- "Expiring Batches (5)" → Navigate to Inventory with expiringSoon=true filter

## Ripple Effects
- Improves dashboard usability
- Makes data more actionable
- Better user workflow

## Testing Requirements
- Click stat card → navigates to correct page
- Filters are pre-applied
- URL params work correctly
- Back button works as expected
