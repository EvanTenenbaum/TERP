# CORRECTED Claude Code Prompt: TERP Matching/Needs System

## 🚨 IMPORTANT: Disregard Previous Handoff Document

**IGNORE**: `CLAUDE_CODE_HANDOFF_PROMPT.md` - It contains INCORRECT file locations and structure.

**USE THIS DOCUMENT INSTEAD** - This reflects the ACTUAL main branch code.

---

## 📍 Correct File Locations

### ✅ What Actually Exists on Main Branch

**Client Needs System**:
```
server/clientNeedsDb.ts              ✅ Database operations for client needs
server/clientNeedsDbEnhanced.ts      ✅ Enhanced version with additional features
server/routers/clientNeeds.ts        ✅ tRPC API endpoints for client needs
server/routers/clientNeedsEnhanced.ts ✅ Enhanced API endpoints
server/tests/clientNeeds.test.ts     ✅ Tests for client needs
```

**Matching Engine**:
```
server/matchingEngine.ts                    ✅ Core matching algorithm
server/matchingEngineEnhanced.ts            ✅ Enhanced matching with more features
server/matchingEngineReverseSimplified.ts   ✅ Reverse matching (find buyers for supply)
server/needsMatchingService.ts              ✅ Service layer for matching
server/matchRecordsDb.ts                    ✅ Database operations for match records
server/routers/matching.ts                  ✅ tRPC API for matching
server/routers/matchingEnhanced.ts          ✅ Enhanced matching API
server/tests/matchingEngine.test.ts         ✅ Tests for matching engine
server/tests/matchRecords.test.ts           ✅ Tests for match records
```

**VIP Portal (Client-Facing)**:
```
server/routers/vipPortal.ts                      ✅ VIP Portal API
client/src/components/vip-portal/MarketplaceNeeds.tsx    ✅ Client needs UI (VIP)
client/src/components/vip-portal/MarketplaceSupply.tsx   ✅ Client supply UI (VIP)
client/src/pages/vip-portal/VIPDashboard.tsx             ✅ VIP Dashboard
```

**Database Schema**:
```
drizzle/schema.ts                    ✅ Contains clientNeeds, vendorSupply tables
```

### ❌ What Does NOT Exist (Ignore These from Previous Handoff)

```
server/matchmakingDb.ts              ❌ DOES NOT EXIST
server/routers/matchmaking.ts        ❌ DOES NOT EXIST  
server/historicalAnalysis.ts         ❌ DOES NOT EXIST
client/src/components/matchmaking/*  ❌ DOES NOT EXIST
client/src/pages/matchmaking/*       ❌ DOES NOT EXIST
```

---

## 🎯 Your Actual Task

### What's Already Built

The TERP system ALREADY HAS:
1. ✅ Client needs database and API (`clientNeedsDb.ts`, `routers/clientNeeds.ts`)
2. ✅ Matching engine (`matchingEngine.ts`, `matchingEngineEnhanced.ts`)
3. ✅ VIP Portal with marketplace (`MarketplaceNeeds.tsx`, `MarketplaceSupply.tsx`)
4. ✅ Match records tracking (`matchRecordsDb.ts`)
5. ✅ Reverse matching (find buyers for supply)

### What You Need to Do

**Your mission**: Review, enhance, and integrate the EXISTING matching/needs system with any missing features.

**Specific Tasks**:

1. **Review Existing Implementation**
   ```bash
   # Read these files to understand current system
   cat server/clientNeedsDb.ts
   cat server/matchingEngine.ts
   cat server/routers/clientNeeds.ts
   cat server/routers/matching.ts
   cat client/src/components/vip-portal/MarketplaceNeeds.tsx
   ```

2. **Identify Gaps**
   - Compare existing features vs requirements in `MATCHMAKING_SPEC_ALIGNED.md`
   - Note what's missing (analytics dashboard, historical analysis, etc.)
   - Document any bugs or issues

3. **Enhance Existing System**
   - Add missing features to EXISTING files
   - Don't create new `matchmaking*` files
   - Work with `clientNeeds*` and `matching*` files instead

4. **Ensure VIP Portal Integration**
   - Verify VIP Portal marketplace works with internal system
   - Test data flows between VIP Portal and internal UI
   - Ensure permissions (VIP users see only their data)

5. **Add Missing Features** (if not present)
   - Analytics dashboard
   - Historical purchase pattern analysis
   - Automated reorder suggestions
   - Enhanced matching algorithms

---

## 📚 Critical Files to Read FIRST

### 1. Development Protocols (The Bible)
```bash
docs/DEVELOPMENT_PROTOCOLS.md          # ALL rules and protocols - READ FIRST
docs/TERP_DESIGN_SYSTEM.md             # UI/UX design system
```

### 2. Understand Current Implementation
```bash
# Backend - Client Needs
server/clientNeedsDb.ts                # How needs are stored/retrieved
server/routers/clientNeeds.ts          # API endpoints for needs

# Backend - Matching
server/matchingEngine.ts               # How matching works
server/routers/matching.ts             # API endpoints for matching

# Frontend - VIP Portal
client/src/components/vip-portal/MarketplaceNeeds.tsx    # Client-facing needs UI
client/src/pages/vip-portal/VIPDashboard.tsx             # VIP dashboard

# Database
drizzle/schema.ts                      # Find clientNeeds and vendorSupply tables
```

### 3. Requirements & Specifications
```bash
MATCHMAKING_SPEC_ALIGNED.md            # Requirements (file locations are WRONG, but requirements are correct)
docs/VIP_PORTAL_FEATURES.md            # VIP Portal features
```

---

## 🔑 Key Information

### Database Tables (Correct)

**clientNeeds** - What clients want to buy:
```typescript
// drizzle/schema.ts
export const clientNeeds = mysqlTable("client_needs", {
  id: int().autoincrement().primaryKey(),
  clientId: int("client_id").notNull(),
  strain: varchar({ length: 255 }),
  category: varchar({ length: 100 }),
  subcategory: varchar({ length: 100 }),
  grade: varchar({ length: 50 }),
  quantityMin: decimal("quantity_min", { precision: 10, scale: 2 }),
  quantityMax: decimal("quantity_max", { precision: 10, scale: 2 }),
  priceMax: decimal("price_max", { precision: 10, scale: 2 }),
  notes: text(),
  status: mysqlEnum(["ACTIVE", "FULFILLED", "EXPIRED", "CANCELLED"]),
  // ... more fields
});
```

**vendorSupply** - What vendors have available:
```typescript
export const vendorSupply = mysqlTable("vendor_supply", {
  id: int().autoincrement().primaryKey(),
  vendorId: int("vendor_id"),
  strain: varchar({ length: 255 }).notNull(),
  category: varchar({ length: 100 }).notNull(),
  quantity: decimal({ precision: 10, scale: 2 }).notNull(),
  priceMin: decimal("price_min", { precision: 10, scale: 2 }),
  priceMax: decimal("price_max", { precision: 10, scale: 2 }),
  status: mysqlEnum(["AVAILABLE", "RESERVED", "SOLD", "EXPIRED"]),
  // ... more fields
});
```

### API Endpoints (Correct)

**Client Needs API**:
```typescript
// server/routers/clientNeeds.ts
clientNeeds.create({ clientId, strain, category, ... })
clientNeeds.list({ filters, pagination })
clientNeeds.update({ id, ...data })
clientNeeds.delete({ id })
```

**Matching API**:
```typescript
// server/routers/matching.ts
matching.findMatches({ clientNeedId })
matching.findBuyers({ vendorSupplyId })
matching.recordMatch({ needId, supplyId, ... })
```

**VIP Portal API**:
```typescript
// server/routers/vipPortal.ts
vipPortal.marketplace.getNeeds({ clientId })
vipPortal.marketplace.createNeed({ clientId, ...data })
vipPortal.marketplace.getSupply({ clientId })
vipPortal.marketplace.createSupply({ clientId, ...data })
```

### Integration Points (Correct)

1. **VIP Portal ↔ Internal System**:
   - Both use same `clientNeeds` and `vendorSupply` tables
   - VIP Portal API: `vipPortal.marketplace.*`
   - Internal API: `clientNeeds.*` and `matching.*`
   - Must ensure data consistency

2. **Matching Engine**:
   - Located in `server/matchingEngine.ts`
   - Calculates confidence scores (0-100)
   - Match types: EXACT, CLOSE, HISTORICAL
   - Sources: INVENTORY, VENDOR, HISTORICAL

3. **Client Detail Page**:
   - Should show client needs
   - Should show matching opportunities
   - Integration point: `client/src/pages/ClientProfilePage.tsx`

---

## 🚨 Critical Bible Protocols (Still Apply)

### 1. NO PLACEHOLDERS
- Production-ready code only
- Complete implementations
- If you can't complete something, STOP and ask

### 2. Test After Every Change
```bash
pnpm test                  # Run all tests
pnpm test:coverage         # Check coverage (must be ≥40%)
```

### 3. Follow Existing Patterns
- Use EXISTING file naming conventions (`clientNeeds*`, `matching*`)
- Don't create new `matchmaking*` files
- Follow existing code structure
- Maintain consistency

### 4. System Integration
- Changes affect multiple files
- Update ALL related files together
- Test navigation and data flows
- Verify VIP Portal still works

---

## 📋 Step-by-Step Getting Started

### Step 1: Understand Current State
```bash
# Navigate to repo
cd /home/ubuntu/TERP

# Check current branch
git branch

# Install dependencies
pnpm install

# Run tests to see current state
pnpm test

# Read key files
cat server/clientNeedsDb.ts
cat server/matchingEngine.ts
cat server/routers/clientNeeds.ts
```

### Step 2: Map Current Features
Create a document listing:
- ✅ What features exist
- ❌ What features are missing (from MATCHMAKING_SPEC_ALIGNED.md)
- ⚠️ What needs improvement

### Step 3: Plan Enhancements
Based on gaps, plan:
- Which EXISTING files to enhance
- What new features to add
- How to integrate with VIP Portal
- Testing strategy

### Step 4: Implement Incrementally
- Make small changes
- Test after each change
- Commit frequently
- Don't break existing functionality

---

## 🎯 Success Criteria

You've succeeded when:

1. ✅ All existing tests still pass
2. ✅ Coverage maintained at ≥40%
3. ✅ VIP Portal marketplace works correctly
4. ✅ Internal matching system enhanced
5. ✅ Analytics dashboard added (if missing)
6. ✅ Historical analysis working (if missing)
7. ✅ No TypeScript errors
8. ✅ Documentation updated
9. ✅ Bible protocols followed
10. ✅ User approves changes

---

## 🔍 Quick Reference

### Current File Structure (Correct)
```
TERP/
├── server/
│   ├── clientNeedsDb.ts              ← Client needs database ops
│   ├── clientNeedsDbEnhanced.ts      ← Enhanced version
│   ├── matchingEngine.ts             ← Core matching algorithm
│   ├── matchingEngineEnhanced.ts     ← Enhanced matching
│   ├── matchRecordsDb.ts             ← Match records
│   ├── needsMatchingService.ts       ← Matching service layer
│   ├── routers/
│   │   ├── clientNeeds.ts            ← Client needs API
│   │   ├── clientNeedsEnhanced.ts    ← Enhanced API
│   │   ├── matching.ts               ← Matching API
│   │   ├── matchingEnhanced.ts       ← Enhanced matching API
│   │   └── vipPortal.ts              ← VIP Portal API
│   └── tests/
│       ├── clientNeeds.test.ts
│       ├── matchingEngine.test.ts
│       └── matchRecords.test.ts
├── client/src/
│   ├── components/vip-portal/
│   │   ├── MarketplaceNeeds.tsx      ← VIP needs UI
│   │   └── MarketplaceSupply.tsx     ← VIP supply UI
│   └── pages/vip-portal/
│       └── VIPDashboard.tsx          ← VIP dashboard
└── drizzle/
    └── schema.ts                     ← Database schema
```

### Commands
```bash
pnpm dev                    # Start dev server
pnpm test                   # Run tests
pnpm test:coverage          # Coverage report
pnpm run type-check         # Check TypeScript
pnpm run build              # Build for production
```

---

## 📞 When to Ask for Help

**STOP and ask if**:
1. You find major architectural issues
2. Existing code conflicts with requirements
3. You need to make breaking changes
4. Tests fail and you can't fix them
5. You're unsure about business logic
6. You need database schema changes

---

## ✅ Summary

**FORGET**:
- File locations from `CLAUDE_CODE_HANDOFF_PROMPT.md`
- Any references to `matchmakingDb.ts`, `routers/matchmaking.ts`, `historicalAnalysis.ts`
- Any references to `client/src/components/matchmaking/*`

**REMEMBER**:
- Use EXISTING files: `clientNeedsDb.ts`, `matchingEngine.ts`, etc.
- Follow EXISTING naming conventions
- Enhance existing system, don't rebuild
- VIP Portal already works, don't break it
- Test after every change
- Follow Bible protocols

**START HERE**:
1. Read `docs/DEVELOPMENT_PROTOCOLS.md`
2. Read `server/clientNeedsDb.ts`
3. Read `server/matchingEngine.ts`
4. Read `MATCHMAKING_SPEC_ALIGNED.md` (requirements are correct, file paths are wrong)
5. Map current features vs requirements
6. Plan enhancements
7. Implement incrementally
8. Test continuously

---

**Repository**: https://github.com/EvanTenenbaum/TERP  
**Branch**: main (use this, not feature/matchmaking-service)  
**VIP Portal**: https://terp-app-b9s35.ondigitalocean.app/vip-portal

**BEGIN by reading the existing code and understanding what's already built.**

Good luck! 🚀

