# Live Shopping Module Documentation

**Status:** Implemented (Phase 5 Complete)  
**Version:** 1.0  
**Last Updated:** December 24, 2025

## Overview

The Live Shopping module allows Staff members to host real-time, interactive sales sessions with VIP Clients. It includes a dedicated interface for product showcasing, a real-time collaborative cart, and order conversion workflows.

## Configuration & Feature Flags

### Enabling the Feature

To enable Live Shopping in an environment, set the following environment variable:

```bash
FEATURE_LIVE_SHOPPING_ENABLED=true
```

If set to `false` or omitted, all API endpoints related to live shopping will return `403 Forbidden` or `404 Not Found`, and UI elements will be hidden.

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `FEATURE_LIVE_SHOPPING_ENABLED` | Master toggle | `false` | No |
| `LIVE_SHOPPING_HEARTBEAT_MS` | SSE Keep-alive interval | `30000` | No |
| `LIVE_SHOPPING_MAX_CART_ITEMS` | Maximum items per session cart | `200` | No |
| `LIVE_SHOPPING_SESSION_TIMEOUT_MINS` | Auto-close idle sessions | `120` | No |

### Runtime Configuration (`features.ts`)

Hardcoded limits can be adjusted in `server/_core/features.ts`:

```typescript
export const features = {
  liveShopping: {
    enabled: process.env.FEATURE_LIVE_SHOPPING_ENABLED === 'true',
    maxCartItems: 200,
    sessionTimeoutMinutes: 120,
    heartbeatIntervalMs: 30000,
  }
};
```

## Architecture

- **Database:** MySQL (via Drizzle ORM)
- **Real-time Communication:** Server-Sent Events (SSE) for state updates
- **State Management:** Hybrid approach - critical state persisted to DB, UI state broadcast via SSE

### Components

1. **Schema** (`drizzle/schema-live-shopping.ts`)
   - `liveShoppingSessions` - Session header records
   - `sessionCartItems` - Temporary cart items
   - `sessionPriceOverrides` - Session-specific pricing

2. **Services** (`server/services/live-shopping/`)
   - `sessionCartService.ts` - Cart operations with soft holds
   - `sessionPricingService.ts` - Dynamic pricing calculations
   - `sessionOrderService.ts` - Order conversion and sales sheets
   - `sessionCreditService.ts` - Credit limit validation

3. **SSE Infrastructure** (`server/lib/sse/`)
   - `sessionEventManager.ts` - Event broadcasting

4. **API Routes**
   - `server/routers/liveShopping.ts` - Staff tRPC procedures
   - `server/routers/vipPortalLiveShopping.ts` - Client tRPC procedures
   - `src/pages/api/sse/` - SSE endpoints

## API Endpoints Overview

### Staff Console (tRPC: `liveShopping.*`)

| Procedure | Type | Description |
|-----------|------|-------------|
| `createSession` | Mutation | Create a new session |
| `listSessions` | Query | List sessions with filters |
| `getSession` | Query | Get session details |
| `updateSessionStatus` | Mutation | Start/Pause/End session |
| `addToCart` | Mutation | Add item to cart |
| `removeFromCart` | Mutation | Remove item from cart |
| `updateCartQuantity` | Mutation | Update item quantity |
| `setOverridePrice` | Mutation | Set session-specific price |
| `highlightProduct` | Mutation | Highlight product for client |
| `toggleCartItemSample` | Mutation | Mark item as sample |
| `checkCreditStatus` | Query | Check client credit limit |
| `generateSalesSheet` | Mutation | Generate sales sheet snapshot |
| `endSession` | Mutation | End and optionally convert to order |

### VIP Portal (tRPC: `vipPortalLiveShopping.*`)

| Procedure | Type | Description |
|-----------|------|-------------|
| `getActiveSession` | Query | Get client's active session |
| `getSessionByRoomCode` | Query | Join session by room code |
| `addToCart` | Mutation | Client adds item to cart |
| `requestCheckout` | Mutation | Request order conversion |

### SSE Endpoints

- `GET /api/sse/live-shopping/[sessionId]` - Staff SSE stream
- `GET /api/sse/vip/live-shopping/[roomCode]` - Client SSE stream

## Security

### Role-Based Access

| Role | Create Session | Host Session | Join Session | Modify Prices |
|------|----------------|--------------|--------------|---------------|
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| STAFF | ✅ | ✅ | ❌ | ✅ |
| CLIENT | ❌ | ❌ | ✅ (own only) | ❌ |

### Session Isolation

- Sessions are accessed via secure `roomCode` (UUID v4)
- Clients can only access sessions where `clientId` matches their ID
- SSE connections validate tokens before establishing stream

### Data Protection

- Internal notes and COGS are never exposed to clients
- Price overrides are visible but not modifiable by clients
- Credit information is only visible to staff

## Database Schema

### Tables

#### `liveShoppingSessions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | Primary key |
| `hostUserId` | INT | Staff member hosting |
| `clientId` | INT | VIP client participating |
| `status` | ENUM | SCHEDULED, ACTIVE, PAUSED, ENDED, CONVERTED, CANCELLED |
| `roomCode` | VARCHAR(64) | Unique session identifier |
| `scheduledAt` | TIMESTAMP | Optional scheduled start time |
| `startedAt` | TIMESTAMP | Actual start time |
| `endedAt` | TIMESTAMP | End time |
| `title` | VARCHAR(255) | Session title |
| `internalNotes` | TEXT | Staff-only notes |
| `sessionConfig` | JSON | Configuration snapshot |

#### `sessionCartItems`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | Primary key |
| `sessionId` | INT | FK to session |
| `batchId` | INT | FK to inventory batch |
| `productId` | INT | FK to product |
| `quantity` | DECIMAL(15,4) | Quantity (supports weight) |
| `unitPrice` | DECIMAL(15,2) | Price at time of add |
| `addedByRole` | ENUM | HOST or CLIENT |
| `isSample` | BOOLEAN | Sample flag (excluded from billing) |
| `isHighlighted` | BOOLEAN | Currently showcased |

#### `sessionPriceOverrides`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | Primary key |
| `sessionId` | INT | FK to session |
| `productId` | INT | FK to product |
| `overridePrice` | DECIMAL(15,2) | Special session price |

## Workflow

### Typical Session Flow

1. **Staff creates session** with client selection
2. **Client joins** via room code or direct link
3. **Staff showcases products** - highlights items, explains features
4. **Items added to cart** - by staff or client
5. **Price negotiations** - staff applies overrides
6. **Credit check** - system validates against client limit
7. **Session ends** - converts to order or saves as draft
8. **Sales sheet generated** - recap sent to client

### Order Conversion

When a session is converted to an order:

1. Cart items are validated against current inventory
2. Credit limit is checked (unless bypassed)
3. Order is created via `ordersDb.createOrder`
4. Session status changes to `CONVERTED`
5. Optional sales sheet is generated
6. SSE event notifies all connected clients

## Known Limitations

1. **Sales Sheet Pricing** - Currently shows final price only, not discount from retail
2. **External Order Conflicts** - Orders created outside live shopping don't check session soft holds
3. **Video Integration** - Requires separate Agora/WebRTC setup (not included)

## Migration

Run the migration to create tables:

```bash
# Using Drizzle Kit
pnpm drizzle-kit push:mysql

# Or run SQL directly
mysql -u user -p database < drizzle/migrations/0001_live_shopping.sql
```

## Troubleshooting

### SSE Connection Drops

- Check `LIVE_SHOPPING_HEARTBEAT_MS` is set appropriately
- Verify no proxy/load balancer is timing out connections
- Check browser console for connection errors

### Cart Not Updating

- Verify SSE connection is established
- Check `sessionEventManager` is emitting events
- Verify client is subscribed to correct session

### Order Conversion Fails

- Check inventory availability (soft holds from other sessions)
- Verify client credit limit
- Check for database transaction errors in logs
