# Database Setup Guide

This guide explains how to set up and seed the TERP database for development and testing.

---

## Quick Start

```bash
# 1. Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# 2. Run database migrations
pnpm db:push

# 3. Seed the database with test data
pnpm seed

# 4. Verify data was created
pnpm run check:dashboard
```

---

## Environment Setup

### 1. Configure Database Connection

Edit `.env` file:

```bash
DATABASE_URL=mysql://user:password@localhost:3306/terp
JWT_SECRET=your_jwt_secret_here_minimum_32_characters
```

### 2. Create Database (if needed)

```bash
mysql -u root -p
```

```sql
CREATE DATABASE terp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON terp.* TO 'user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## Database Migration

Apply the database schema:

```bash
pnpm db:push
```

This creates all tables, indexes, and relationships defined in `drizzle/schema.ts`.

---

## Seeding the Database

### Seeding Scenarios

The seed script supports multiple scenarios for different needs:

#### 1. Light Seed (Recommended for Development)

**Fast seed for quick testing (~30 seconds)**

```bash
pnpm seed:light
```

Creates:

- 10 clients (2 whales, 8 regular)
- 5 vendors
- 50 products
- 100 inventory items
- 50 orders
- 40 invoices

#### 2. Full Seed (Recommended for E2E Testing)

**Complete dataset (~2 minutes)**

```bash
pnpm seed:full
# or simply
pnpm seed
```

Creates:

- 25 clients (5 whales, 20 regular)
- 10 vendors
- 200 products
- 500 inventory items
- 200 orders
- 150 invoices

#### 3. Edge Cases Seed

**Extreme scenarios for stress testing (~45 seconds)**

```bash
pnpm seed edgeCases
```

Creates scenarios like:

- Very large orders
- Negative margins
- Overdue invoices
- Out-of-stock items

#### 4. Chaos Seed

**Random anomalies for chaos testing (~60 seconds)**

```bash
pnpm seed chaos
```

Creates unpredictable data for robustness testing.

---

## Verifying Seed Data

### Using the Dashboard Check Script

```bash
pnpm run check:dashboard
```

Expected output:

```
📊 Dashboard Data Check
======================
✅ Clients: 25
✅ Orders: 150
✅ Invoices: 120
✅ Inventory: 200

✅ Dashboard data is ready!
```

### Manual Verification

```bash
mysql -u user -p terp
```

```sql
-- Check record counts
SELECT COUNT(*) FROM clients;
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM invoices;
SELECT COUNT(*) FROM batches;

-- Check sample data
SELECT * FROM clients LIMIT 5;
SELECT * FROM orders ORDER BY createdAt DESC LIMIT 5;
```

---

## Resetting the Database

### Option 1: Drop and Recreate (Clean Slate)

```bash
# Drop all tables
pnpm db:drop

# Recreate schema
pnpm db:push

# Reseed
pnpm seed
```

### Option 2: Clear Data Only (Keep Schema)

```bash
mysql -u user -p terp < scripts/clear-data.sql
pnpm seed
```

---

## Troubleshooting

### Issue: "No data available" on Dashboard

**Cause:** Database hasn't been seeded

**Solution:**

```bash
pnpm run check:dashboard  # Verify data is missing
pnpm seed                 # Seed the database
```

### Issue: Seed Script Fails

**Possible causes:**

1. **Database connection error**
   - Check `DATABASE_URL` in `.env`
   - Verify database server is running
   - Test connection: `mysql -u user -p -h localhost terp`

2. **Schema not applied**
   - Run migrations first: `pnpm db:push`

3. **Duplicate key errors**
   - Database already has data
   - Clear data or use `pnpm db:drop` then `pnpm db:push`

### Issue: Permission Denied Errors

**Cause:** Database user lacks necessary privileges

**Solution:**

```sql
GRANT ALL PRIVILEGES ON terp.* TO 'user'@'localhost';
FLUSH PRIVILEGES;
```

### Issue: Slow Seed Performance

**Tips:**

- Use `pnpm seed:light` for faster seeding
- Check database server performance
- Ensure proper indexes exist (run `pnpm db:push`)

---

## Production Considerations

### DO NOT Seed Production Databases

Seed scripts are for **development and testing only**. Never run seed scripts on production databases as they will:

- Create fake/test data
- Potentially overwrite real data
- Cause data integrity issues

### Production Data Setup

For production:

1. Run migrations only: `pnpm db:push`
2. Import real data from backups or migrations
3. Create initial admin user manually
4. Let real users create operational data

---

## Seed Data Details

### What Gets Created

#### Users

- **Admin User**: `admin@terp.local` (role: admin)
- Test users with various roles

#### Clients

- **Whale Clients**: High-volume buyers (20% of clients, 80% of revenue)
- **Regular Clients**: Standard customers
- Realistic names, addresses, contact info

#### Vendors

- Supplier companies
- Product catalogs
- Pricing information

#### Products & Inventory

- Cannabis strains (Indica, Sativa, Hybrid)
- Product variants (flower, pre-rolls, concentrates)
- Lots and batches with quantities
- Realistic pricing and costs

#### Orders & Invoices

- Historical orders spanning 12 months
- Mix of paid, pending, and overdue invoices
- Realistic order patterns and seasonality

#### Financial Data

- Revenue: ~$1-5M (depending on scenario)
- Profit margins: 20-40%
- Outstanding receivables
- Payment history

---

## Custom Seeding

### Modifying Seed Configuration

Edit `scripts/generators/config.ts`:

```typescript
export const CONFIG = {
  totalClients: 25, // Number of clients
  whaleClients: 5, // High-value clients
  regularClients: 20, // Standard clients
  totalVendors: 10, // Number of vendors
  ordersPerMonth: 15, // Orders per month
  totalRevenue: 2_000_000, // Target revenue
  // ... more options
};
```

### Creating Custom Scenarios

Add to `scripts/generators/scenarios.ts`:

```typescript
export const scenarios = {
  myCustom: {
    name: "My Custom Scenario",
    description: "Custom data for specific testing",
    overrides: {
      totalClients: 50,
      ordersPerMonth: 30,
      // ... custom values
    },
  },
};
```

Run with:

```bash
pnpm seed myCustom
```

---

## Additional Resources

- **Environment Variables**: `docs/ENVIRONMENT_VARIABLES.md`
- **Database Schema**: `drizzle/schema.ts`
- **Seed Scripts**: `scripts/seed-realistic-main.ts`
- **Deployment Guide**: `DEPLOY.md`

---

## Support

If you encounter issues not covered in this guide:

1. Check application logs for error messages
2. Verify environment variables are correct
3. Ensure database server is running and accessible
4. Review `docs/ENVIRONMENT_VARIABLES.md` for configuration details

---

**Last Updated:** 2025-11-14
