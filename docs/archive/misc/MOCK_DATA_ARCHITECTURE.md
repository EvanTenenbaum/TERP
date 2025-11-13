# TERP Mock Data Architecture
## Hyper-Realistic Data Generation & Instance Management

**Version:** 1.0  
**Date:** October 27, 2025  
**Purpose:** Enable realistic testing with easy instance management (with/without data)

---

## Executive Summary

**Current State:**
- 74 database tables
- 31 API routers
- 3 existing seed scripts (accounting, strains)
- Manual, inconsistent seeding process

**Goal:**
Create a production-grade mock data system that:
- ✅ Generates hyper-realistic business data
- ✅ Maintains referential integrity across all 74 tables
- ✅ Supports multiple data profiles (small/medium/large)
- ✅ Enables one-command instance setup (with/without data)
- ✅ Is maintainable and extensible

---

## Part 1: Architecture Design

### 1.1 Data Generation Strategy

**Approach:** **Faker.js + Business Logic Generators**

**Why:**
- Faker.js provides realistic names, addresses, dates, etc.
- Custom generators add business-specific logic (COGS, pricing, inventory)
- Maintains relationships and referential integrity
- Reproducible with seeds

**Libraries:**
```json
{
  "@faker-js/faker": "^8.0.0",  // Realistic fake data
  "date-fns": "^2.30.0",         // Date manipulation
  "seedrandom": "^3.0.5"         // Reproducible randomness
}
```

---

### 1.2 Module-Based Generation

**Structure:**
```
scripts/seed/
├── index.ts                 # Main orchestrator
├── config.ts                # Data profiles (small/medium/large)
├── generators/              # Data generators by module
│   ├── users.ts
│   ├── clients.ts
│   ├── inventory.ts
│   ├── orders.ts
│   ├── accounting.ts
│   ├── pricing.ts
│   └── ...
├── utils/                   # Shared utilities
│   ├── faker.ts             # Configured Faker instance
│   ├── dates.ts             # Date helpers
│   └── relationships.ts     # Referential integrity helpers
└── profiles/                # Pre-defined data profiles
    ├── small.ts             # 10 clients, 50 products, 100 orders
    ├── medium.ts            # 100 clients, 500 products, 1000 orders
    └── large.ts             # 1000 clients, 5000 products, 10000 orders
```

---

### 1.3 Data Profiles

**Small Profile (Development):**
- 1 organization
- 5 users
- 10 clients
- 50 products (10 strains × 5 grades)
- 100 orders
- 200 transactions
- Fast to seed (< 10 seconds)

**Medium Profile (Testing):**
- 1 organization
- 10 users
- 100 clients
- 500 products (50 strains × 10 grades)
- 1,000 orders
- 5,000 transactions
- Moderate seed time (< 1 minute)

**Large Profile (Stress Testing):**
- 1 organization
- 50 users
- 1,000 clients
- 5,000 products (500 strains × 10 grades)
- 10,000 orders
- 50,000 transactions
- Longer seed time (< 5 minutes)

---

### 1.4 Referential Integrity Strategy

**Dependency Graph:**
```
organizations
  ├─> users
  ├─> clients
  │     └─> clientNeeds
  │     └─> clientNotes
  │     └─> clientActivity
  ├─> inventory
  │     ├─> strains
  │     ├─> products
  │     ├─> batches
  │     ├─> locations
  │     └─> inventoryMovements
  ├─> orders
  │     ├─> orderItems (references products)
  │     └─> cogsHistory
  ├─> accounting
  │     ├─> accounts
  │     ├─> fiscalPeriods
  │     ├─> ledgerEntries
  │     ├─> invoices
  │     ├─> bills
  │     └─> payments
  └─> pricing
        ├─> pricingRules
        └─> pricingProfiles
```

**Generation Order:**
1. Organizations & Users (foundation)
2. Clients & Vendors (entities)
3. Inventory (strains, products, batches)
4. Pricing (rules, profiles)
5. Orders (with COGS calculations)
6. Accounting (invoices, payments, ledger entries)
7. Activity & Audit Logs (historical data)

---

## Part 2: Realistic Data Patterns

### 2.1 Client Data

**Realistic Patterns:**
- **Names:** Real-sounding business names (Faker.company.name())
- **Addresses:** Valid US addresses with real cities/states
- **Contact Info:** Realistic phone numbers, emails
- **Credit Limits:** Tiered ($5k, $10k, $25k, $50k, $100k)
- **Payment Terms:** Standard (Net 30, Net 60, COD)
- **Activity:** Realistic order frequency (weekly, monthly, quarterly)

**Example:**
```typescript
{
  name: "Green Valley Dispensary",
  contactName: "Sarah Martinez",
  email: "sarah@greenvalleydispensary.com",
  phone: "(555) 123-4567",
  address: "123 Main St",
  city: "Denver",
  state: "CO",
  zipCode: "80202",
  creditLimit: 25000,
  paymentTerms: "Net 30",
  status: "active"
}
```

---

### 2.2 Inventory Data

**Realistic Patterns:**
- **Strain Names:** Real cannabis strain names (Blue Dream, OG Kush, etc.)
- **Product SKUs:** Format: `{STRAIN}-{GRADE}-{SIZE}` (e.g., `BLUEDREAM-AAA-1OZ`)
- **Batch Numbers:** Format: `{YYYYMMDD}-{STRAIN}-{SEQ}` (e.g., `20241027-BLUEDREAM-001`)
- **Quantities:** Realistic inventory levels (100-10,000 units)
- **Pricing:** Market-realistic ($5-$50 per gram based on grade)
- **Locations:** Warehouse zones (A1, A2, B1, B2, etc.)

**Grade Distribution:**
- AAA (Premium): 20% of inventory, $40-50/g
- AA (High): 30% of inventory, $30-40/g
- A (Standard): 35% of inventory, $20-30/g
- B (Budget): 15% of inventory, $10-20/g

---

### 2.3 Order Data

**Realistic Patterns:**
- **Order Frequency:** Follows client activity patterns
  - High-volume clients: 2-3 orders/week
  - Medium-volume: 1-2 orders/week
  - Low-volume: 1-2 orders/month
- **Order Sizes:** Realistic quantities
  - Small: 1-10 units
  - Medium: 10-50 units
  - Large: 50-200 units
- **Product Mix:** Clients have preferences
  - Some prefer premium (AAA/AA)
  - Some prefer budget (A/B)
  - Most buy mixed grades
- **Seasonal Patterns:** More orders in Q4 (holidays)
- **COGS Calculation:** Realistic FIFO/LIFO/Weighted Average

---

### 2.4 Accounting Data

**Realistic Patterns:**
- **Chart of Accounts:** Standard cannabis business COA
  - Assets: Cash, AR, Inventory
  - Liabilities: AP, Loans
  - Equity: Owner's Equity, Retained Earnings
  - Revenue: Product Sales, Service Revenue
  - Expenses: COGS, Rent, Utilities, Payroll
- **Transactions:** Realistic timing
  - Invoices: Generated on order completion
  - Payments: 70% on-time, 20% late, 10% early
  - Expenses: Monthly recurring (rent, utilities)
- **Balances:** Realistic financial health
  - Positive cash flow
  - Healthy AR/AP ratios
  - Reasonable profit margins (20-40%)

---

### 2.5 Pricing Data

**Realistic Patterns:**
- **Tiered Pricing:** Volume discounts
  - 1-10 units: Full price
  - 11-50 units: 5% discount
  - 51-100 units: 10% discount
  - 100+ units: 15% discount
- **Client-Specific Pricing:** VIP clients get better rates
- **Grade-Based Pricing:** Premium costs more
- **Market Fluctuations:** Prices vary ±10% over time

---

## Part 3: Implementation Approach

### 3.1 Generator Pattern

**Base Generator Interface:**
```typescript
interface DataGenerator<T> {
  generate(count: number, context: GenerationContext): Promise<T[]>;
  validate(data: T[]): boolean;
  getDependencies(): string[];
}

interface GenerationContext {
  organizationId: number;
  existingData: Map<string, any[]>;
  faker: Faker;
  profile: DataProfile;
}
```

**Example Generator:**
```typescript
class ClientGenerator implements DataGenerator<Client> {
  async generate(count: number, ctx: GenerationContext): Promise<Client[]> {
    const clients: Client[] = [];
    
    for (let i = 0; i < count; i++) {
      clients.push({
        organizationId: ctx.organizationId,
        name: ctx.faker.company.name(),
        contactName: ctx.faker.person.fullName(),
        email: ctx.faker.internet.email(),
        phone: ctx.faker.phone.number(),
        address: ctx.faker.location.streetAddress(),
        city: ctx.faker.location.city(),
        state: ctx.faker.location.state({ abbreviated: true }),
        zipCode: ctx.faker.location.zipCode(),
        creditLimit: this.generateCreditLimit(ctx.faker),
        paymentTerms: this.generatePaymentTerms(ctx.faker),
        status: 'active',
      });
    }
    
    return clients;
  }
  
  private generateCreditLimit(faker: Faker): number {
    const tiers = [5000, 10000, 25000, 50000, 100000];
    return faker.helpers.arrayElement(tiers);
  }
  
  private generatePaymentTerms(faker: Faker): string {
    return faker.helpers.arrayElement(['Net 30', 'Net 60', 'COD']);
  }
  
  getDependencies(): string[] {
    return ['organizations'];
  }
}
```

---

### 3.2 Orchestration Strategy

**Seed Process:**
```typescript
async function seedDatabase(profile: DataProfile) {
  const ctx = createGenerationContext(profile);
  
  // 1. Clear existing data (if requested)
  if (profile.clearExisting) {
    await clearDatabase();
  }
  
  // 2. Generate data in dependency order
  const generators = [
    new OrganizationGenerator(),
    new UserGenerator(),
    new ClientGenerator(),
    new VendorGenerator(),
    new StrainGenerator(),
    new ProductGenerator(),
    new BatchGenerator(),
    new LocationGenerator(),
    new PricingRuleGenerator(),
    new PricingProfileGenerator(),
    new OrderGenerator(),
    new InvoiceGenerator(),
    new PaymentGenerator(),
    new LedgerEntryGenerator(),
    // ... more generators
  ];
  
  for (const generator of generators) {
    console.log(`Generating ${generator.name}...`);
    const data = await generator.generate(profile.counts[generator.name], ctx);
    await saveToDatabase(generator.name, data);
    ctx.existingData.set(generator.name, data);
  }
  
  console.log('✅ Database seeded successfully!');
}
```

---

### 3.3 Performance Optimization

**Batch Inserts:**
```typescript
// ✅ GOOD - Batch insert (fast)
await db.insert(clients).values(clientsArray);

// ❌ BAD - Individual inserts (slow)
for (const client of clientsArray) {
  await db.insert(clients).values(client);
}
```

**Transaction Wrapping:**
```typescript
await db.transaction(async (tx) => {
  await tx.insert(clients).values(clientsData);
  await tx.insert(clientNeeds).values(needsData);
  await tx.insert(clientNotes).values(notesData);
});
```

**Progress Reporting:**
```typescript
console.log(`Generating 1000 orders...`);
for (let i = 0; i < 1000; i += 100) {
  await generateOrderBatch(i, 100);
  console.log(`  ${i + 100}/1000 orders generated`);
}
```

---

## Part 4: Instance Management

### 4.1 CLI Commands

**Seed with data:**
```bash
# Small profile (default)
pnpm seed

# Medium profile
pnpm seed:medium

# Large profile
pnpm seed:large

# Custom profile
pnpm seed --profile custom --clients 50 --orders 500
```

**Fresh instance (no data):**
```bash
# Reset database (schema only, no data)
pnpm db:reset

# Push schema without seeding
pnpm db:push
```

**Partial seeding:**
```bash
# Seed only specific modules
pnpm seed --modules clients,inventory

# Seed with custom counts
pnpm seed --clients 100 --products 500
```

---

### 4.2 Environment-Based Seeding

**Development (.env.development):**
```env
SEED_ON_START=true
SEED_PROFILE=small
```

**Staging (.env.staging):**
```env
SEED_ON_START=true
SEED_PROFILE=medium
```

**Production (.env.production):**
```env
SEED_ON_START=false  # Never seed production!
```

---

### 4.3 Database Management Scripts

**scripts/db-reset.ts:**
```typescript
// Drop all tables and recreate schema
async function resetDatabase() {
  console.log('🗑️  Dropping all tables...');
  await dropAllTables();
  
  console.log('📋 Recreating schema...');
  await pushSchema();
  
  console.log('✅ Database reset complete');
}
```

**scripts/db-seed.ts:**
```typescript
// Seed database with specified profile
async function seedDatabase(profile: string) {
  const config = getProfileConfig(profile);
  
  console.log(`🌱 Seeding database with ${profile} profile...`);
  await runSeedProcess(config);
  
  console.log('✅ Seeding complete');
}
```

**scripts/db-clear.ts:**
```typescript
// Clear all data but keep schema
async function clearDatabase() {
  console.log('🧹 Clearing all data...');
  await deleteAllRows();
  
  console.log('✅ Database cleared');
}
```

---

## Part 5: Maintenance & Extension

### 5.1 Adding New Generators

**Steps:**
1. Create generator file: `scripts/seed/generators/newModule.ts`
2. Implement `DataGenerator<T>` interface
3. Add to orchestration in `scripts/seed/index.ts`
4. Update profile configs with counts
5. Test with small profile

**Example:**
```typescript
// scripts/seed/generators/samples.ts
export class SampleGenerator implements DataGenerator<Sample> {
  async generate(count: number, ctx: GenerationContext): Promise<Sample[]> {
    // Implementation
  }
  
  getDependencies(): string[] {
    return ['products', 'clients'];
  }
}
```

---

### 5.2 Updating Data Patterns

**When to update:**
- New business rules added
- Pricing structure changes
- New product categories
- Schema changes

**How to update:**
1. Update generator logic
2. Update profile configs
3. Test with small profile
4. Document changes in this file

---

### 5.3 Testing Generators

**Unit Tests:**
```typescript
describe('ClientGenerator', () => {
  it('generates valid clients', async () => {
    const generator = new ClientGenerator();
    const clients = await generator.generate(10, mockContext);
    
    expect(clients).toHaveLength(10);
    expect(clients[0].email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(clients[0].creditLimit).toBeGreaterThan(0);
  });
});
```

**Integration Tests:**
```typescript
describe('Seed Process', () => {
  it('seeds database without errors', async () => {
    await resetDatabase();
    await seedDatabase('small');
    
    const clientCount = await db.select().from(clients);
    expect(clientCount.length).toBeGreaterThan(0);
  });
});
```

---

## Part 6: Best Practices

### 6.1 Realistic Data Guidelines

**DO:**
- ✅ Use Faker.js for names, addresses, emails
- ✅ Follow real-world business patterns
- ✅ Maintain referential integrity
- ✅ Use realistic date ranges (past 2 years)
- ✅ Include edge cases (cancelled orders, refunds)
- ✅ Add variety (different client types, product mixes)

**DON'T:**
- ❌ Use sequential IDs in business data (use Faker)
- ❌ Use placeholder text ("Test Client 1")
- ❌ Ignore relationships (orphaned records)
- ❌ Use unrealistic values (negative prices, future dates)
- ❌ Create perfectly uniform data (add randomness)

---

### 6.2 Performance Guidelines

**DO:**
- ✅ Use batch inserts (100-1000 records at a time)
- ✅ Wrap related inserts in transactions
- ✅ Report progress for long operations
- ✅ Use database indexes for lookups
- ✅ Cache frequently accessed data

**DON'T:**
- ❌ Insert one record at a time
- ❌ Query database in loops
- ❌ Generate all data in memory first
- ❌ Ignore foreign key constraints
- ❌ Skip validation

---

### 6.3 Maintenance Guidelines

**DO:**
- ✅ Document generator logic
- ✅ Version profile configs
- ✅ Test after schema changes
- ✅ Keep generators modular
- ✅ Update this document

**DON'T:**
- ❌ Hardcode values
- ❌ Skip dependency checks
- ❌ Ignore errors
- ❌ Create circular dependencies
- ❌ Mix concerns

---

## Part 7: Implementation Checklist

### Phase 1: Foundation
- [ ] Install dependencies (Faker.js, date-fns, seedrandom)
- [ ] Create directory structure
- [ ] Create base interfaces and types
- [ ] Create GenerationContext
- [ ] Create profile configs (small/medium/large)

### Phase 2: Core Generators
- [ ] OrganizationGenerator
- [ ] UserGenerator
- [ ] ClientGenerator
- [ ] VendorGenerator
- [ ] StrainGenerator
- [ ] ProductGenerator
- [ ] BatchGenerator

### Phase 3: Business Logic Generators
- [ ] OrderGenerator (with COGS)
- [ ] InvoiceGenerator
- [ ] PaymentGenerator
- [ ] LedgerEntryGenerator
- [ ] PricingRuleGenerator
- [ ] PricingProfileGenerator

### Phase 4: Supporting Generators
- [ ] ClientNeedsGenerator
- [ ] ClientNotesGenerator
- [ ] InventoryMovementsGenerator
- [ ] AuditLogsGenerator

### Phase 5: Orchestration
- [ ] Main seed script
- [ ] CLI commands
- [ ] Progress reporting
- [ ] Error handling
- [ ] Validation

### Phase 6: Instance Management
- [ ] db-reset script
- [ ] db-clear script
- [ ] db-seed script
- [ ] Environment-based config
- [ ] Documentation

### Phase 7: Testing & Documentation
- [ ] Unit tests for generators
- [ ] Integration tests for seed process
- [ ] Update CHANGELOG.md
- [ ] Update PROJECT_CONTEXT.md
- [ ] Create usage guide

---

## Estimated Effort

**Total Implementation Time: 2-3 days**

- Day 1: Foundation + Core Generators (8 hours)
- Day 2: Business Logic + Supporting Generators (8 hours)
- Day 3: Orchestration + Testing + Documentation (4-8 hours)

---

## Success Criteria

✅ Can seed database with realistic data in < 1 minute (medium profile)
✅ All 74 tables have data with referential integrity
✅ Can spin up fresh instance (no data) in < 10 seconds
✅ Can spin up seeded instance in < 1 minute
✅ Data looks realistic in UI
✅ No foreign key constraint violations
✅ Reproducible with seed values
✅ Easy to maintain and extend

---

**This architecture ensures production-grade mock data for realistic testing!** 🎯

