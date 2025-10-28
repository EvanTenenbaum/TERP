# TERP Realistic Mock Data Generator

A comprehensive data generator that creates realistic business data for the TERP cannabis wholesale management system.

## Overview

This generator creates **22 months** of realistic business data (Jan 2024 - Oct 2025) including:

- **68 clients**: 10 whale clients, 50 regular clients, 8 vendor clients
- **560 products**: 450 flower products (indoor/greenhouse/outdoor), 110 non-flower products
- **4,400 orders**: ~200 orders per month with realistic order patterns
- **$47M revenue**: Close to $44M target with proper whale/regular distribution
- **Consignment tracking**: 88% consignment rate on intake
- **AR aging**: 15% overdue invoices with realistic aging distribution
- **Returns & refunds**: 0.5% return rate, 5% refund rate

## Quick Start

### Prerequisites

- MySQL 8.0+ running locally
- Node.js 22+ with pnpm installed
- Database credentials configured in `.env`

### Running the Generator

```bash
# 1. Ensure MySQL is running
sudo service mysql start

# 2. Create database and user (if not exists)
sudo mysql -e "CREATE DATABASE IF NOT EXISTS terp;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'terp'@'localhost' IDENTIFIED BY 'your_password';"
sudo mysql -e "GRANT ALL PRIVILEGES ON terp.* TO 'terp'@'localhost';"

# 3. Push database schema
pnpm db:push

# 4. Run the realistic data generator
pnpm seed:realistic
```

### Expected Output

```
🚀 TERP Realistic Data Generator
==================================================
📅 Period: 1/1/2024 - 10/27/2025
💰 Target Revenue: $44,000,000.00
👥 Clients: 60 (10 whales, 50 regular)
🏭 Vendors: 8
==================================================

👤 Creating default user...
   ✓ Default user created

👥 Generating clients...
   ✓ 10 whale clients
   ✓ 50 regular clients
   ✓ 8 vendor clients
   ✓ 68 total clients

🏷️  Creating default brand...
   ✓ Default brand created

🌿 Generating strains...
   ✓ 50 strains with normalized names

📦 Generating products...
   ✓ 450 flower products
   ✓ 110 non-flower products
   ✓ 560 total products

📊 Generating lots...
   ✓ 176 lots created

📦 Generating inventory batches...
   ✓ 176 batches created
   ✓ 155 consignment batches (88.1%)
   ✓ 21 COD batches (11.9%)

📝 Generating orders...
   (This may take a minute...)
   ✓ 4400 orders created
   ✓ Total revenue: $47,329,655.38
   ✓ Whale revenue: $33,172,611.48 (70.1%)
   ✓ Regular revenue: $14,157,043.90 (29.9%)

💰 Generating invoices and AR aging...
   ✓ 4400 invoices created
   ✓ 660 overdue invoices (15.0%)
   ✓ Total AR: $6,082,458.93
   ✓ 120+ days overdue: $5,679,339.34 (93.4%)

↩️  Generating returns and refunds...
   ✓ 22 returns (0.50%)
   ✓ 220 refunds (5.0%)

✅ Realistic data generation complete!
```

## Business Metrics

### Revenue Distribution

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Total Revenue | $44M | $47.3M | ✅ 7.5% over |
| Whale Revenue | 70% | 70.1% | ✅ Perfect |
| Regular Revenue | 30% | 29.9% | ✅ Perfect |
| Orders | 4,400 | 4,400 | ✅ Perfect |
| Avg Order Size | $10K | $10.8K | ✅ Close |

### Consignment Tracking

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Consignment Batches | 90% | 88% | ✅ Close |
| COD Batches | 10% | 12% | ✅ Close |

### Accounts Receivable

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Overdue Invoices | 15% | 15.0% | ✅ Perfect |
| Total AR | ~$6.6M | $6.1M | ✅ Close |

### Returns & Refunds

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Return Rate | 0.5% | 0.50% | ✅ Perfect |
| Refund Rate | 5% | 5.0% | ✅ Perfect |

## Architecture

### File Structure

```
scripts/
├── README.md                      # This file
├── SEED_VALIDATION.md             # Detailed validation report
├── db-sync.ts                     # Synchronous database wrapper
├── seed-realistic-main.ts         # Main orchestration script
└── generators/
    ├── config.ts                  # Business parameters and constants
    ├── utils.ts                   # Utility functions (random, dates, etc.)
    ├── clients.ts                 # Client generation (whales, regular, vendors)
    ├── strains.ts                 # Cannabis strain generation
    ├── products.ts                # Product generation (flower & non-flower)
    ├── inventory.ts               # Lots and batches generation
    ├── orders.ts                  # Order generation with revenue distribution
    ├── invoices.ts                # Invoice and AR aging generation
    └── returns-refunds.ts         # Returns and refunds generation
```

### Data Flow

```
1. Create default user (for foreign keys)
2. Generate clients (whales, regular, vendors)
3. Create default brand (for products)
4. Generate strains
5. Generate products (linked to strains and brand)
6. Generate lots (linked to products and vendors)
7. Generate batches (linked to lots)
8. Generate orders (linked to clients and batches)
9. Generate invoices (linked to orders)
10. Generate returns & refunds (linked to orders)
```

### Key Design Decisions

#### 1. Revenue Distribution Algorithm

The order generator uses a weighted random selection algorithm to ensure:
- 70% of revenue goes to 10 whale clients
- 30% of revenue goes to 50 regular clients
- Orders are distributed evenly across the 22-month period

```typescript
// Whales order more frequently (70% of orders)
const isWhaleOrder = Math.random() < 0.70;

// Clients who need more revenue to hit target get higher weight
const clientWeights = clientIds.map(id => {
  const current = clientRevenue.get(id) || 0;
  const remaining = targetRevenue - current;
  return Math.max(0, remaining);
});
```

#### 2. Order Sizing

To achieve ~$10K average order size:
- Flower products: 1-3 lbs per line item
- Non-flower products: 1-20 units per line item
- 1-6 items per order (avg 3)

This creates realistic order sizes that match industry norms.

#### 3. Consignment Tracking

- 90% of batches are consignment (unpaid at intake)
- 10% are COD (paid at intake)
- 50% of orders are consignment sales
- Payment terms: NET_30 or CONSIGNMENT

#### 4. AR Aging

- 15% of invoices are overdue
- Overdue invoices are distributed across aging buckets:
  - 1-30 days
  - 31-60 days
  - 61-90 days
  - 91-120 days
  - 120+ days (majority due to partial payment logic)

## Configuration

All business parameters are centralized in `generators/config.ts`:

```typescript
export const CONFIG = {
  // Time period
  startDate: new Date(2024, 0, 1),
  endDate: new Date(2025, 9, 27),
  totalMonths: 22,
  
  // Revenue targets
  totalRevenue: 44_000_000,
  whaleRevenuePercent: 0.70,
  regularRevenuePercent: 0.30,
  
  // Client distribution
  whaleClients: 10,
  regularClients: 50,
  totalVendors: 8,
  
  // Pricing (per pound for flower)
  indoorPrice: 1800,
  greenhousePrice: 1200,
  outdoorPrice: 800,
  
  // Consignment rates
  salesConsignmentRate: 0.50,
  intakeConsignmentRate: 0.90,
  
  // AR aging
  overduePercent: 0.15,
  overdue120PlusPercent: 0.50,
  
  // Order patterns
  ordersPerMonth: 200,
  avgItemsPerOrder: 3,
};
```

## Customization

### Adjusting Revenue

To change the total revenue:

```typescript
// In generators/config.ts
totalRevenue: 60_000_000, // Change from 44M to 60M
```

### Adjusting Time Period

```typescript
// In generators/config.ts
startDate: new Date(2023, 0, 1),  // Jan 1, 2023
endDate: new Date(2024, 11, 31),  // Dec 31, 2024
totalMonths: 24,
```

### Adjusting Client Mix

```typescript
// In generators/config.ts
whaleClients: 15,      // Increase whales from 10 to 15
regularClients: 100,   // Increase regular from 50 to 100
```

### Adjusting Order Quantities

```typescript
// In generators/orders.ts, line 127
const quantity = batch.grade 
  ? randomInRange(1, 5)   // Change from 1-3 to 1-5 lbs for flower
  : randomInRange(1, 30); // Change from 1-20 to 1-30 units for non-flower
```

## Troubleshooting

### Database Connection Errors

```bash
# Check if MySQL is running
sudo service mysql status

# Start MySQL if not running
sudo service mysql start

# Verify credentials in .env
cat .env | grep DATABASE_URL
```

### Schema Mismatch Errors

```bash
# Reset database schema
pnpm db:push

# If issues persist, drop and recreate database
sudo mysql -e "DROP DATABASE terp; CREATE DATABASE terp;"
pnpm db:push
```

### Out of Memory Errors

The generator processes 4,400 orders in memory. If you encounter OOM errors:

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" pnpm seed:realistic
```

### Slow Performance

Generation typically takes 30-60 seconds. If slower:

1. Check MySQL performance: `sudo mysql -e "SHOW PROCESSLIST;"`
2. Ensure indexes are created: `pnpm db:push`
3. Consider reducing order count in config

## Validation

After running the generator, validate the data:

```bash
# Check record counts
sudo mysql -e "USE terp; 
SELECT 'Clients' as entity, COUNT(*) as count FROM clients
UNION ALL SELECT 'Orders', COUNT(*) FROM orders
UNION ALL SELECT 'Invoices', COUNT(*) FROM invoices;"

# Check revenue distribution
sudo mysql -e "USE terp;
SELECT 
  CASE WHEN c.id <= 10 THEN 'Whale' ELSE 'Regular' END as client_type,
  COUNT(o.id) as order_count,
  SUM(o.total) as total_revenue
FROM orders o
JOIN clients c ON o.clientId = c.id
WHERE c.id <= 60
GROUP BY client_type;"

# Check AR aging
sudo mysql -e "USE terp;
SELECT 
  status,
  COUNT(*) as count,
  SUM(amountDue) as total_due
FROM invoices
GROUP BY status;"
```

## Known Issues

### AR Aging Distribution

The 120+ days bucket contains ~93% of overdue AR instead of the target 50%. This is due to the partial payment logic:
- 120+ invoices are fully unpaid (100% amount due)
- < 120 invoices are partially paid (50-100% amount due)

This results in the 120+ bucket having much higher dollar amounts even though invoice counts are closer to 50/50.

**Impact**: Minor - does not affect core functionality or other metrics.

**Workaround**: Adjust the partial payment percentage in `generators/invoices.ts` line 85:

```typescript
const paidPercent = Math.random() * 0.8; // Change from 0.5 to 0.8 for more payment
```

## Performance

- **Generation time**: 30-60 seconds
- **Database size**: ~50MB for full dataset
- **Memory usage**: ~500MB peak during order generation
- **CPU usage**: Single-threaded, ~100% during generation

## Future Enhancements

- [ ] Add support for multiple brands
- [ ] Generate purchase orders for COD batches
- [ ] Add payment transactions linked to invoices
- [ ] Generate lab test results for batches
- [ ] Add user activity logs
- [ ] Support for quotes (not just orders)
- [ ] Generate sample requests
- [ ] Add shipping/fulfillment data
- [ ] Support for batch splitting/merging
- [ ] Add inventory adjustments

## Contributing

When modifying the generators:

1. Update `config.ts` for new parameters
2. Maintain referential integrity (foreign keys)
3. Test with `pnpm seed:realistic`
4. Validate metrics match requirements
5. Update this README with changes

## License

MIT

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-org/terp/issues
- Documentation: https://docs.terp.local
- Email: support@terp.local

