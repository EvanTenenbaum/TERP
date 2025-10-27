# Phase 1.3: Verify & Implement Quotes Integration - Impact Analysis

## Current State
- Quotes.tsx exists but uses mock data
- OrderCreatorPage supports creating QUOTE type orders
- Backend has full quote support (quoteStatus enum: DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED)
- Orders table has orderType='QUOTE' support

## Files to Modify
1. `client/src/pages/Quotes.tsx` - Replace mock data with real tRPC queries
2. `server/routers/orders.ts` - Add convertQuoteToSale endpoint (if not exists)
3. `server/ordersDb.ts` - Add convertQuoteToSale function (if not exists)

## Dependencies
- Existing orders table with QUOTE type
- Existing OrderCreatorPage for creating/editing quotes
- Existing clients table for customer data

## Features to Implement
1. Fetch real QUOTE orders from database
2. Display quote status badges
3. View quote details
4. Convert quote to sale order
5. Edit/update quote status

## Ripple Effects
- None - additive only, connects existing functionality
- Quotes page becomes fully functional
- Sales workflow: Quote → Accepted → Convert to Sale → Fulfill → Ship

## Testing Requirements
- Quote list display
- Quote detail view
- Quote to sale conversion
- Status updates
