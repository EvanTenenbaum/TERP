# Customer Credit System Improvement - Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CREDIT SYSTEM ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────────────┐  │
│  │   clients    │◄───│ client_credit_   │◄───│   creditEngine.ts        │  │
│  │              │    │ limits           │    │   (6-signal calculator)  │  │
│  │ creditLimit  │    │ (detailed data)  │    │                          │  │
│  │ (fast read)  │    │                  │    │                          │  │
│  └──────────────┘    └──────────────────┘    └──────────────────────────┘  │
│         │                    │                          │                   │
│         │                    │                          │                   │
│         ▼                    ▼                          ▼                   │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────────────┐  │
│  │ CreditLimit  │    │ CreditStatus     │    │ credit_audit_log         │  │
│  │ Banner       │    │ Card (new)       │    │ (all changes tracked)    │  │
│  │ (orders)     │    │ (client profile) │    │                          │  │
│  └──────────────┘    └──────────────────┘    └──────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    AUTO-RECALCULATION TRIGGERS                        │  │
│  │  • Invoice created → recalculate client credit                        │  │
│  │  • Payment recorded → recalculate client credit                       │  │
│  │  • Daily batch job → recalculate all clients                          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Database Changes

### 1. Add Credit Fields to Clients Table

```sql
ALTER TABLE clients ADD COLUMN credit_limit DECIMAL(15,2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN credit_limit_updated_at TIMESTAMP NULL;
ALTER TABLE clients ADD COLUMN credit_limit_source ENUM('CALCULATED', 'MANUAL') DEFAULT 'CALCULATED';
ALTER TABLE clients ADD COLUMN credit_limit_override_reason TEXT NULL;
```

### 2. Add Credit Visibility Settings Table

```sql
CREATE TABLE credit_visibility_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  location_id INT NULL,  -- NULL = global default
  
  -- UI Element Visibility
  show_credit_in_client_list BOOLEAN DEFAULT TRUE,
  show_credit_banner_in_orders BOOLEAN DEFAULT TRUE,
  show_credit_widget_in_profile BOOLEAN DEFAULT TRUE,
  show_signal_breakdown BOOLEAN DEFAULT TRUE,
  show_audit_log BOOLEAN DEFAULT TRUE,
  
  -- Enforcement Settings
  credit_enforcement_mode ENUM('WARNING', 'SOFT_BLOCK', 'HARD_BLOCK') DEFAULT 'WARNING',
  warning_threshold_percent INT DEFAULT 75,
  alert_threshold_percent INT DEFAULT 90,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 3. Enhance Credit Audit Log

Add new event types to existing `credit_audit_log` table:
- `MANUAL_OVERRIDE` - User manually set credit limit
- `ORDER_OVERRIDE` - User proceeded with order despite credit warning
- `AUTO_RECALCULATED` - System auto-recalculated credit

## Component Design

### 1. CreditStatusCard (New - Replaces CreditLimitWidget for most uses)

Progressive disclosure design:

```
┌─────────────────────────────────────────────────────────────────┐
│  Credit Status                                    [Expand ▼]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Available Credit: $15,000                                       │
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  $5,000 used of $20,000 limit (25%)                             │
│                                                                  │
│  [Override Limit]                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

EXPANDED VIEW:
┌─────────────────────────────────────────────────────────────────┐
│  Credit Status                                    [Collapse ▲]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Available Credit: $15,000                                       │
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  $5,000 used of $20,000 limit (25%)                             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ How this was calculated:                                    ││
│  │                                                             ││
│  │ Base Capacity: $25,000                                      ││
│  │   (2x average monthly revenue of $12,500)                   ││
│  │                                                             ││
│  │ Risk Modifier: 0.80                                         ││
│  │   Credit Health Score: 80/100                               ││
│  │   • Revenue Growth: 85 (strong)                             ││
│  │   • Payment Speed: 72 (good)                                ││
│  │   • Profit Margins: 65 (moderate)                           ││
│  │   • Debt Management: 90 (excellent)                         ││
│  │   • Repayment Rate: 78 (good)                               ││
│  │   • Relationship: 88 (established)                          ││
│  │                                                             ││
│  │ Final Limit: $25,000 × 0.80 = $20,000                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Last calculated: 2 hours ago                                    │
│  [Recalculate Now]  [Override Limit]  [View History]            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. CreditLimitBanner (Fixed)

```typescript
// BEFORE (broken):
const creditLimit = parseFloat(client.creditLimit || "0"); // Always 0!

// AFTER (fixed):
const creditLimit = parseFloat(client.creditLimit || "0");
// Now reads from actual clients.creditLimit column
```

### 3. Client List Credit Indicator

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Clients                                                    [+ New Client]│
├──────────────────────────────────────────────────────────────────────────┤
│ Name              │ Type   │ Total Spent │ Owed    │ Credit │ Actions   │
├───────────────────┼────────┼─────────────┼─────────┼────────┼───────────┤
│ Acme Dispensary   │ Buyer  │ $125,000    │ $5,000  │ 🟢 25% │ [...]     │
│ Green Leaf Co     │ Buyer  │ $85,000     │ $12,000 │ 🟡 78% │ [...]     │
│ Herbal Solutions  │ Buyer  │ $45,000     │ $8,500  │ 🔴 95% │ [...]     │
│ Nature's Best     │ Buyer  │ $200,000    │ $0      │ 🟢 0%  │ [...]     │
└──────────────────────────────────────────────────────────────────────────┘

Legend:
🟢 Green: <75% utilization
🟡 Yellow: 75-90% utilization  
🔴 Red: >90% utilization
```

### 4. Manual Override Dialog

```
┌─────────────────────────────────────────────────────────────────┐
│  Override Credit Limit                                    [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Current Calculated Limit: $20,000                               │
│                                                                  │
│  New Credit Limit: [$________]                                   │
│                                                                  │
│  Reason for Override: *                                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ⚠️ Manual overrides persist until changed. The system will     │
│     not auto-adjust this limit.                                  │
│                                                                  │
│  [Cancel]                              [Save Override]           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## API Changes

### New Endpoints

```typescript
// credit.ts router additions

// Sync credit limit to clients table
syncToClient: protectedProcedure
  .input(z.object({ clientId: z.number() }))
  .mutation(async ({ input }) => {
    // Copy creditLimit from client_credit_limits to clients.creditLimit
  }),

// Manual override
manualOverride: protectedProcedure
  .input(z.object({
    clientId: z.number(),
    newLimit: z.number(),
    reason: z.string().min(10),
  }))
  .mutation(async ({ input, ctx }) => {
    // Set manual credit limit with audit trail
  }),

// Get visibility settings
getVisibilitySettings: protectedProcedure
  .input(z.object({ locationId: z.number().optional() }))
  .query(async ({ input }) => {
    // Return visibility settings for location
  }),

// Update visibility settings
updateVisibilitySettings: protectedProcedure
  .input(z.object({
    locationId: z.number().optional(),
    settings: z.object({...}),
  }))
  .mutation(async ({ input, ctx }) => {
    // Update visibility settings
  }),

// Check credit for order (with override support)
checkOrderCredit: protectedProcedure
  .input(z.object({
    clientId: z.number(),
    orderTotal: z.number(),
    overrideReason: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    // Returns: { allowed: boolean, warning?: string, requiresOverride: boolean }
  }),
```

### Modified Endpoints

```typescript
// clientsDb.ts - updateClientStats
// Add: Trigger credit recalculation after stats update

// orders.ts - createDraftEnhanced / finalizeDraft
// Add: Credit check with override support
```

## Auto-Recalculation Triggers

### Real-time Triggers

1. **Invoice Created** → Recalculate client credit
2. **Payment Recorded** → Recalculate client credit
3. **Order Finalized** → Recalculate client credit
4. **Manual Override** → Update clients.creditLimit directly

### Daily Batch Job

```typescript
// scripts/jobs/recalculate-all-credit.ts
async function recalculateAllCredit() {
  const clients = await getAllBuyerClients();
  
  for (const client of clients) {
    // Skip clients with manual overrides
    if (client.creditLimitSource === 'MANUAL') continue;
    
    const result = await calculateCreditLimit(client.id);
    await saveCreditLimit(client.id, result);
    await syncCreditToClient(client.id);
  }
}
```

## Implementation Phases

### Phase 1: Foundation (P0) - 8h
- Add `creditLimit`, `creditLimitUpdatedAt`, `creditLimitSource` to clients table
- Create sync mechanism from `client_credit_limits` to `clients.creditLimit`
- Fix `CreditLimitBanner` to read actual data
- Add credit recalculation trigger to `updateClientStats`

### Phase 2: New UI Components (P1) - 16h
- Create `CreditStatusCard` with progressive disclosure
- Add manual override dialog with audit trail
- Add credit indicator to client list
- Create "show your work" explanation component

### Phase 3: Settings & Control (P1) - 8h
- Create `credit_visibility_settings` table
- Build Credit Settings admin panel
- Implement per-location visibility toggles
- Add enforcement mode configuration

### Phase 4: Auto-Recalculation (P2) - 8h
- Add triggers to invoice/payment/order flows
- Create daily batch job script
- Add recalculation queue for high-volume scenarios
- Performance optimization (<500ms per client)

### Phase 5: VIP Portal (P3) - 8h
- Customer-facing credit display
- Self-service credit history view
- Payment impact preview

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `drizzle/schema.ts` | MODIFY | Add creditLimit fields to clients, add visibility settings table |
| `server/creditEngine.ts` | MODIFY | Add sync function, enhance explanation generation |
| `server/routers/credit.ts` | MODIFY | Add new endpoints for override, visibility, order check |
| `server/clientsDb.ts` | MODIFY | Trigger credit recalc in updateClientStats |
| `client/src/components/orders/CreditLimitBanner.tsx` | MODIFY | Fix to read actual creditLimit |
| `client/src/components/credit/CreditStatusCard.tsx` | CREATE | New progressive disclosure component |
| `client/src/components/credit/CreditOverrideDialog.tsx` | CREATE | Manual override with reason |
| `client/src/components/credit/CreditExplanation.tsx` | CREATE | "Show your work" component |
| `client/src/pages/ClientsListPage.tsx` | MODIFY | Add credit indicator column |
| `client/src/pages/settings/CreditSettingsPage.tsx` | CREATE | Admin visibility controls |
| `scripts/jobs/recalculate-all-credit.ts` | CREATE | Daily batch job |

## Testing Strategy

### Unit Tests
- Credit calculation accuracy
- Sync mechanism correctness
- Override audit trail

### Integration Tests
- Order creation with credit check
- Auto-recalculation triggers
- Visibility settings application

### E2E Tests
- Full order flow with credit warning
- Manual override workflow
- Settings changes propagation
