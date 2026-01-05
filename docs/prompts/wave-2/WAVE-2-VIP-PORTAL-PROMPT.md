# Wave 2: VIP Portal - Complete Agent Prompt

---

# PART 1: AGENT ONBOARDING

## 🏢 Project Overview

**TERP** is a comprehensive ERP system for cannabis businesses managing inventory, sales, VIP portal, accounting, and operations.

**Production URL:** https://terp-app-b9s35.ondigitalocean.app
**Repository:** https://github.com/EvanTenenbaum/TERP

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui |
| **Backend** | Node.js, Express, tRPC |
| **Database** | MySQL (TiDB), Drizzle ORM |
| **Auth** | Custom JWT + VIP Portal separate auth |

---

## 🚨 CRITICAL CONSTRAINTS

### NEVER DO:
```
❌ Modify drizzle/schema.ts
❌ Run migrations or drizzle-kit commands
❌ Use `: any` types
❌ Add @ts-nocheck or @ts-ignore
❌ Commit with --no-verify for code changes
```

### ALWAYS DO:
```
✅ Run pnpm check after EVERY change
✅ Run pnpm test after EVERY change  
✅ Commit frequently with clear messages
✅ Verify deployment succeeds
✅ Test on mobile viewport sizes
```

---

## 📋 Schema Reference

### Clients Table (VIP Users)
```typescript
clients.id, clients.teriCode, clients.name
clients.email, clients.phone
clients.isBuyer, clients.isSeller
clients.creditLimit, clients.totalOwed
clients.vipPortalEnabled, clients.vipPortalPin
```

### Orders Table
```typescript
orders.id, orders.orderNumber, orders.orderType
orders.clientId, orders.isDraft
orders.items (JSON), orders.subtotal, orders.total
orders.quoteStatus, orders.saleStatus
orders.fulfillmentStatus, orders.invoiceId
```

### VIP Sessions Table
```typescript
vipSessions.id, vipSessions.clientId
vipSessions.token, vipSessions.expiresAt
vipSessions.createdAt
```

### Batches Table (Catalog Items)
```typescript
batches.id, batches.code, batches.sku
batches.productId, batches.batchStatus
batches.onHandQty, batches.pricePerUnit
batches.publishEcom, batches.publishB2b
batches.metadata (JSON)
```

---

# PART 2: YOUR TASK - VIP PORTAL LIFECYCLE

## 🎯 Mission

Ensure VIP customers can complete their entire journey through the portal.

**Goal:** Login → Browse Catalog → Check Balance → Place Order → Track → Download Documents
**Estimated Time:** 16-23 hours

---

## 📁 Your File Scope

### VIP Portal Pages (Primary Focus)
```
client/src/pages/vip-portal/VIPLogin.tsx
client/src/pages/vip-portal/VIPDashboard.tsx
client/src/pages/vip-portal/AppointmentBooking.tsx
client/src/pages/vip-portal/DocumentDownloads.tsx
client/src/pages/vip-portal/SessionEndedPage.tsx
client/src/pages/vip-portal/VipNotificationsBell.tsx
client/src/pages/vip-portal/auth/
```

### VIP Server Routers
```
server/routers/vipPortal.ts
server/routers/vipAuth.ts
server/routers/vipOrders.ts
```

### Shared (Coordinate before editing)
```
server/routers/batches.ts  ← Catalog data
server/routers/clients.ts  ← Client data
```

---

## 📋 Task Checklist

### Task 1: Verify VIP Login Flow (2-3 hours)

Test the complete login flow:
```bash
# Check VIP auth router
head -50 server/routers/vipAuth.ts

# Check VIP login page
head -100 client/src/pages/vip-portal/VIPLogin.tsx
```

**Verify:**
- [ ] Client can enter teriCode + PIN
- [ ] Session token is created and stored
- [ ] Redirect to dashboard works
- [ ] Invalid credentials show error
- [ ] Session expiry is handled

### Task 2: VIP Dashboard Functionality (3-4 hours)

**Path:** `client/src/pages/vip-portal/VIPDashboard.tsx`

**Verify:**
- [ ] Shows client name and welcome message
- [ ] Displays current balance/credit
- [ ] Shows recent orders
- [ ] Navigation to all sections works
- [ ] Mobile responsive layout

### Task 3: Catalog Browsing (3-4 hours)

**Verify:**
- [ ] Can browse available products
- [ ] Filters work (category, strain, price)
- [ ] Product details display correctly
- [ ] Images load properly
- [ ] Only `publishB2b` or `publishEcom` items show

### Task 4: Order Placement (4-5 hours)

**Verify:**
- [ ] Can add items to cart
- [ ] Cart persists during session
- [ ] Can adjust quantities
- [ ] Subtotal/total calculate correctly
- [ ] Can submit order
- [ ] Order confirmation displays
- [ ] Order appears in order history

### Task 5: Document Downloads (2-3 hours)

**Path:** `client/src/pages/vip-portal/DocumentDownloads.tsx`

**Verify:**
- [ ] Can view list of available documents
- [ ] Can download invoices
- [ ] Can download COAs (Certificates of Analysis)
- [ ] PDF generation works
- [ ] Proper error handling for missing docs

### Task 6: Mobile Responsiveness (2-3 hours)

Test all pages at mobile viewport (375px width):
- [ ] VIPLogin - form fits screen
- [ ] VIPDashboard - cards stack vertically
- [ ] Catalog - grid adjusts to single column
- [ ] Cart - usable on small screen
- [ ] Documents - table scrolls horizontally

---

## 🔧 Common Fixes

### Fix 1: VIP Session Handling
```typescript
// Check if session is valid
const { data: session } = trpc.vipAuth.getSession.useQuery();

if (!session) {
  return <Navigate to="/vip/login" />;
}
```

### Fix 2: Client Balance Display
```typescript
// Balance might be string or number
const balance = parseFloat(client?.totalOwed ?? '0');
const credit = parseFloat(client?.creditLimit ?? '0');
const available = credit - balance;
```

### Fix 3: Catalog Item Filtering
```typescript
// Only show published items
const catalogItems = batches.filter(b => 
  b.publishB2b === true || b.publishEcom === true
);
```

### Fix 4: Mobile-First Styling
```typescript
// Use Tailwind responsive classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>
```

---

## ✅ Exit Criteria

Wave 2 is complete when:

- [ ] VIP Login flow works end-to-end
- [ ] Dashboard shows correct client data
- [ ] Catalog browsing with filters works
- [ ] Can place order and see confirmation
- [ ] Can download invoices/documents
- [ ] All pages work on mobile (375px)
- [ ] `pnpm check` passes
- [ ] `pnpm test` passes
- [ ] No new @ts-nocheck added
- [ ] Deployment verified

---

## 🔄 Git Workflow

```bash
# After each fix
pnpm check && pnpm test
git add -A
git commit -m "fix(vip): [description]"
git push origin main

# Verify deployment
curl -s https://terp-app-b9s35.ondigitalocean.app/api/health
```

---

## 🆘 Escalation

If blocked:
1. Document in `WAVE_2_BLOCKERS.md`
2. Move to next task
3. Flag for human review

---

## 🚀 Getting Started

```bash
cd ~/TERP
git pull origin main
pnpm install
pnpm check  # Must pass

# Start dev server
pnpm dev

# Test VIP portal at http://localhost:5173/vip/login
```

**Focus on the complete user journey - a VIP customer should be able to log in, browse, order, and download documents without errors.**
