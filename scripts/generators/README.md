# TERP Realistic Mock Data Generator

## Overview

A comprehensive, modular system for generating hyper-realistic mock data for TERP. Generates 22 months of business data (Jan 2024 - Oct 2025) with **$44M total revenue** following exact business parameters.

## Business Parameters

- **Time Period:** Jan 1, 2024 - Oct 27, 2025 (22 months)
- **Revenue:** $2M/month average ($44M total)
- **Product Mix:** 90% flower, 10% other products
- **Pricing:** Indoor $1800/lb, Greenhouse $1200/lb, Outdoor $800/lb
- **Clients:** 60 buyers (10 whales = 70% revenue, 50 regular = 30% revenue)
- **Vendors:** 8 vendors for consignment intake
- **Consignment:** 50% sales, 90% intake
- **Returns:** 0.5% return rate
- **Refunds:** 5% of orders get 5% refund
- **AR Aging:** 15% debt overdue, 50% of overdue debt 120+ days old
- **Client Data:** No email addresses or physical addresses

## Architecture

### Modular Structure

```
scripts/
├── seed-realistic-main.ts    # Main orchestrator
└── generators/
    ├── config.ts              # Business parameters
    ├── utils.ts               # Shared utilities
    ├── clients.ts             # Client generation (buyers + vendors)
    ├── strains.ts             # Strain generation with normalization
    ├── products.ts            # Product generation (strains × grow types × grades)
    ├── inventory.ts           # Lots and batches with consignment tracking
    ├── orders.ts              # Order generation with revenue distribution
    ├── invoices.ts            # Invoice and AR aging generation
    └── returns-refunds.ts     # Returns and refunds generation
```

### Data Flow

```
1. Clients (68 total)
   ├── Whale Clients (10)
   ├── Regular Clients (50)
   └── Vendor Clients (8)

2. Strains (50)
   └── Normalized names (lowercase, trimmed)

3. Products (500+)
   ├── Flower Products (450)
   │   └── Strain × Grow Type × Grade
   └── Non-Flower Products (50+)
       └── Concentrates, Edibles, Pre-Rolls, Vapes

4. Inventory
   ├── Lots (176)
   └── Batches (158)
       ├── 90% Consignment
       └── 10% COD

5. Orders (4,400)
   ├── Revenue Distribution
   │   ├── Whales: 70% ($30.8M)
   │   └── Regular: 30% ($13.2M)
   └── Payment Terms
       ├── 50% Consignment
       └── 50% NET_30

6. Invoices (4,400)
   ├── AR Aging
   │   ├── 15% Overdue
   │   └── 50% of overdue 120+ days
   └── Status
       ├── PAID
       └── OVERDUE

7. Returns & Refunds
   ├── Returns (22)
   └── Refunds (220)
```

## Usage

### Quick Start

```bash
# Generate realistic data
pnpm seed:realistic
```

### What Gets Generated

| Entity | Count | Details |
|--------|-------|---------|
| Clients | 68 | 10 whales, 50 regular, 8 vendors |
| Strains | 50 | Popular strains with normalization |
| Products | 500+ | 90% flower, 10% other |
| Lots | 176 | ~8 per month |
| Batches | 158 | 90% consignment |
| Orders | 4,400 | ~200 per month |
| Invoices | 4,400 | 15% overdue |
| Returns | 22 | 0.5% return rate |
| Refunds | 220 | 5% of orders |

### Expected Output

```
🚀 TERP Realistic Data Generator
==================================================
📅 Period: 1/1/2024 - 10/27/2025
💰 Target Revenue: $44,000,000.00
👥 Clients: 60 (10 whales, 50 regular)
🏭 Vendors: 8
==================================================

👥 Generating clients...
   ✓ 10 whale clients
   ✓ 50 regular clients
   ✓ 8 vendor clients
   ✓ 68 total clients

🌿 Generating strains...
   ✓ 50 strains with normalized names

📦 Generating products...
   ✓ 450 flower products
   ✓ 50+ non-flower products
   ✓ 500+ total products

📊 Generating lots...
   ✓ 176 lots created

📦 Generating inventory batches...
   ✓ 158 batches created
   ✓ 142 consignment batches (89.9%)
   ✓ 16 COD batches (10.1%)

📝 Generating orders...
   (This may take a minute...)

   ✓ 4,400 orders created
   ✓ Total revenue: $44,123,456.78
   ✓ Whale revenue: $30,886,419.75 (70.0%)
   ✓ Regular revenue: $13,237,037.03 (30.0%)

💰 Generating invoices and AR aging...
   ✓ 4,400 invoices created
   ✓ 660 overdue invoices (15.0%)
   ✓ Total AR: $6,618,518.52
   ✓ 120+ days overdue: $3,309,259.26 (50.0%)

↩️  Generating returns and refunds...
   ✓ 22 returns (0.50%)
   ✓ 220 refunds (5.0%)

✅ Realistic data generation complete!

📊 Summary:
==================================================
   Clients:        68 (10 whales, 50 regular, 8 vendors)
   Strains:        50
   Products:       500+ (450 flower, 50+ other)
   Lots:           176
   Batches:        158 (142 consignment)
   Orders:         4,400
   Invoices:       4,400 (660 overdue)
   Returns:        22
   Refunds:        220
   Total Revenue:  $44,123,456.78
   Total AR:       $6,618,518.52
==================================================
```

## Key Features

### 1. Realistic Revenue Distribution

- **Whale clients** (10): Each generates ~$3M revenue (70% total)
- **Regular clients** (50): Each generates ~$260K revenue (30% total)
- **Long tail distribution**: Realistic Pareto principle

### 2. Proper Consignment Tracking

- **Intake**: 90% consignment from vendors
- **Sales**: 50% consignment to buyers
- **Payment terms**: CONSIGNMENT, NET_30, NET_15, NET_7, COD

### 3. Accurate AR Aging

- **15% overdue**: Realistic collection rate
- **120+ days**: 50% of overdue debt is very old
- **Aging buckets**: Current, 1-30, 31-60, 61-90, 91-120, 120+

### 4. Strain Normalization

- All strains use `standardizedName = name.toLowerCase().trim()`
- Ensures consistency across products and orders
- Matches existing TERP strain handling

### 5. Realistic Product Mix

- **Flower**: 90% of inventory (Indoor/Greenhouse/Outdoor × AAA/AA/A)
- **Concentrates**: Shatter, Wax, Live Resin, Distillate
- **Edibles**: Gummies, Chocolates, Baked Goods
- **Pre-Rolls**: Single, Multi-Pack
- **Vapes**: Cartridges, Disposables

## Customization

### Modify Business Parameters

Edit `scripts/generators/config.ts`:

```typescript
export const CONFIG = {
  monthlyRevenue: 2_000_000,  // Change target revenue
  whaleClients: 10,            // Change whale count
  flowerPercent: 0.90,         // Change product mix
  // ... etc
};
```

### Add New Generators

1. Create new file in `scripts/generators/`
2. Export generation function
3. Import and call in `seed-realistic-main.ts`

## Troubleshooting

### Database Connection Issues

Ensure your `.env` file has correct database credentials:

```
DATABASE_URL=mysql://user:password@localhost:3306/terp
```

### Out of Memory

If generating data causes OOM errors, reduce batch sizes in config:

```typescript
ordersPerMonth: 100,  // Reduce from 200
```

### TypeScript Errors

Run type check:

```bash
pnpm run check
```

## Future Enhancements

- [ ] Add accounting ledger entries
- [ ] Generate sample requests
- [ ] Create client needs
- [ ] Add notes and attachments
- [ ] Generate pricing rules
- [ ] Create COGS adjustments

## License

MIT

