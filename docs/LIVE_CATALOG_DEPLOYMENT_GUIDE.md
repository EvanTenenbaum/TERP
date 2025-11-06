# Live Catalog Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the VIP Portal Live Catalog feature to development, staging, and production environments.

---

## Prerequisites

### Required Software
- **Node.js**: v22.x or higher
- **pnpm**: v8.x or higher
- **MySQL**: v8.0 or higher
- **Git**: v2.x or higher

### Required Access
- Database credentials (username, password, host, port)
- Server SSH access (for production)
- GitHub repository access

### Environment Variables
Ensure the following environment variables are set in your `.env` file:

```bash
DATABASE_URL=mysql://user:password@host:port/database
FEATURE_LIVE_CATALOG=false  # Disabled by default
```

---

## Deployment Methods

### Method 1: Automated Deployment (Recommended)

Use the provided deployment script for a guided, automated deployment.

#### Development Environment
```bash
cd /home/ubuntu/TERP
./scripts/deploy-live-catalog.sh dev
```

#### Staging Environment
```bash
cd /home/ubuntu/TERP
./scripts/deploy-live-catalog.sh staging
```

#### Production Environment
```bash
cd /home/ubuntu/TERP
./scripts/deploy-live-catalog.sh production
```

**What the script does:**
1. Pre-flight checks (Node.js, pnpm, DATABASE_URL)
2. Database backup (production only)
3. Install dependencies
4. Run database migration
5. Generate TypeScript types
6. Compile TypeScript
7. Seed test data (dev/staging only)
8. Run smoke test

---

### Method 2: Manual Deployment

For more control or troubleshooting, follow these manual steps.

#### Step 1: Backup Database (Production Only)

```bash
# Extract connection details from DATABASE_URL
mysqldump -h HOST -P PORT -u USER -pPASSWORD DATABASE > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Step 2: Install Dependencies

```bash
cd /home/ubuntu/TERP
pnpm install --frozen-lockfile
```

#### Step 3: Run Database Migration

```bash
# Apply migration
pnpm db:push

# Verify migration
mysql -h HOST -P PORT -u USER -pPASSWORD DATABASE -e "SHOW TABLES LIKE 'client_%';"
```

Expected output:
```
client_catalog_views
client_draft_interests
client_interest_list_items
client_interest_lists
client_price_alerts
```

#### Step 4: Generate TypeScript Types

```bash
pnpm db:generate
```

#### Step 5: Compile TypeScript

```bash
pnpm tsc --noEmit
```

Review any errors. Some pre-existing errors may be present.

#### Step 6: Seed Test Data (Optional - Dev/Staging Only)

```bash
tsx server/scripts/seedLiveCatalogTestData.ts
```

#### Step 7: Start Server

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

---

## Post-Deployment Verification

### 1. Database Verification

Verify all tables were created:

```sql
-- Check tables exist
SHOW TABLES LIKE 'client_%';

-- Check vip_portal_configurations column
DESCRIBE vip_portal_configurations;

-- Verify test data (if seeded)
SELECT COUNT(*) FROM client_interest_lists;
SELECT COUNT(*) FROM client_draft_interests;
```

### 2. Server Verification

```bash
# Check server is running
curl http://localhost:5173

# Check API health
curl http://localhost:5173/api/health
```

### 3. Feature Verification

#### Admin UI
1. Navigate to any client profile
2. Go to "Live Catalog" tab
3. Verify configuration panel loads
4. Enable Live Catalog
5. Configure visibility settings
6. Save configuration

#### Client UI
1. Log into VIP Portal as test client
2. Verify "Catalog" tab appears
3. Browse products
4. Add items to interest list
5. Submit interest list
6. Verify submission success

#### Order Integration
1. Go to client profile → Live Catalog tab
2. View submitted interest lists
3. Click "View Details" on a list
4. Select items
5. Click "Add to New Order"
6. Verify order created
7. Test "Add to Draft Order" with existing draft

---

## Gradual Rollout Strategy

### Phase 1: Internal Testing (Week 1)
- Enable for 1-2 internal test clients
- Monitor logs for errors
- Gather feedback from internal users
- Fix any critical issues

### Phase 2: Beta Testing (Week 2-3)
- Enable for 5-10 friendly clients
- Monitor usage metrics
- Collect user feedback
- Optimize performance if needed

### Phase 3: Limited Release (Week 4-5)
- Enable for 25% of VIP clients
- Monitor system load
- Track conversion rates
- Adjust based on feedback

### Phase 4: Full Release (Week 6+)
- Enable for all VIP clients
- Announce feature via email
- Provide training materials
- Monitor adoption rates

---

## Rollback Procedure

If issues are encountered, use the rollback script:

### Quick Rollback (Disable Feature Only)
```bash
./scripts/rollback-live-catalog.sh
```

This will:
1. Set `FEATURE_LIVE_CATALOG=false`
2. Disable Live Catalog for all clients in database
3. Keep database tables intact

### Full Rollback (Restore Database)
```bash
./scripts/rollback-live-catalog.sh /path/to/backup.sql
```

This will:
1. Disable feature flag
2. Disable for all clients
3. Restore database from backup

### Manual Rollback

If scripts fail, manually execute:

```bash
# 1. Update .env
echo "FEATURE_LIVE_CATALOG=false" >> .env

# 2. Disable in database
mysql -h HOST -P PORT -u USER -pPASSWORD DATABASE << EOF
UPDATE vip_portal_configurations 
SET module_live_catalog_enabled = false 
WHERE module_live_catalog_enabled = true;
EOF

# 3. Restart server
pm2 restart terp  # or pnpm dev
```

---

## Monitoring & Maintenance

### Key Metrics to Monitor

1. **Usage Metrics**
   - Number of clients with Live Catalog enabled
   - Interest lists submitted per day
   - Conversion rate (interest lists → orders)
   - Average items per interest list

2. **Performance Metrics**
   - Catalog query response time
   - Interest list submission time
   - Order creation time
   - Database query performance

3. **Error Metrics**
   - Failed interest list submissions
   - Failed order creations
   - API error rates
   - Client-reported issues

### Database Maintenance

```sql
-- Clean up old draft interests (90+ days)
DELETE FROM client_draft_interests 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- Archive old interest lists (1+ year)
UPDATE client_interest_lists 
SET status = 'ARCHIVED' 
WHERE submitted_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)
AND status != 'ARCHIVED';

-- Optimize tables
OPTIMIZE TABLE client_interest_lists;
OPTIMIZE TABLE client_draft_interests;
```

### Log Monitoring

Monitor application logs for:
- `[LiveCatalog]` - General Live Catalog operations
- `[OrderIntegration]` - Order creation/update operations
- `[PriceAlert]` - Price alert notifications (when implemented)

```bash
# Tail logs
tail -f logs/app.log | grep LiveCatalog

# Search for errors
grep "ERROR.*LiveCatalog" logs/app.log
```

---

## Troubleshooting

### Issue: Migration Fails

**Symptoms:**
- `pnpm db:push` fails
- Error: "Table already exists"

**Solution:**
```bash
# Check if tables exist
mysql -h HOST -P PORT -u USER -pPASSWORD DATABASE -e "SHOW TABLES LIKE 'client_%';"

# If tables exist, migration may have partially completed
# Manually complete migration or restore from backup
```

### Issue: TypeScript Errors After Deployment

**Symptoms:**
- `moduleLiveCatalogEnabled` not found
- `liveCatalog` property missing

**Solution:**
```bash
# Regenerate types
pnpm db:generate

# Clear TypeScript cache
rm -rf node_modules/.cache

# Reinstall dependencies
pnpm install
```

### Issue: Feature Not Appearing in UI

**Symptoms:**
- "Catalog" tab not visible in VIP Portal
- "Live Catalog" tab not in Client Profile

**Solution:**
1. Check feature flag: `FEATURE_LIVE_CATALOG=true` in `.env`
2. Check client configuration: `module_live_catalog_enabled=true` in database
3. Restart server
4. Clear browser cache

### Issue: Order Integration Fails

**Symptoms:**
- "Add to New Order" fails
- "Add to Draft Order" fails

**Solution:**
1. Check `ordersDb` module is accessible
2. Verify client has permission to create orders
3. Check order ID exists (for draft orders)
4. Review server logs for detailed error

---

## Security Considerations

### Access Control
- Live Catalog respects existing VIP Portal authentication
- Only authenticated clients can access their catalog
- Admins must have appropriate permissions to configure

### Data Privacy
- Interest lists are private to each client
- Pricing is personalized per client
- Draft interests are client-specific

### Rate Limiting
Consider implementing rate limiting for:
- Catalog queries (max 100/minute per client)
- Interest list submissions (max 10/minute per client)
- Order creations (max 5/minute per admin)

---

## Performance Optimization

### Database Indexes

Ensure these indexes exist for optimal performance:

```sql
-- Interest lists
CREATE INDEX idx_client_interest_lists_client_id ON client_interest_lists(client_id);
CREATE INDEX idx_client_interest_lists_status ON client_interest_lists(status);
CREATE INDEX idx_client_interest_lists_submitted_at ON client_interest_lists(submitted_at);

-- Draft interests
CREATE INDEX idx_client_draft_interests_client_id ON client_draft_interests(client_id);
CREATE INDEX idx_client_draft_interests_batch_id ON client_draft_interests(batch_id);

-- Interest list items
CREATE INDEX idx_client_interest_list_items_list_id ON client_interest_list_items(interest_list_id);
CREATE INDEX idx_client_interest_list_items_batch_id ON client_interest_list_items(batch_id);
```

### Caching Strategy

Consider implementing caching for:
- Catalog queries (cache for 5 minutes)
- Filter options (cache for 10 minutes)
- Client configurations (cache for 1 hour)

---

## Support & Documentation

### Internal Documentation
- `ORDER_INTEGRATION_COMPLETE.md` - Full feature documentation
- `VIP_PORTAL_LIVE_CATALOG_PRD.md` - Product requirements
- `LIVE_CATALOG_ROADMAP.md` - Implementation roadmap
- `CLIENT_UI_IMPLEMENTATION_COMPLETE.md` - Client UI specs

### Training Materials
Create training materials for:
- Admins: How to configure Live Catalog
- Clients: How to use the catalog and submit interest lists
- Sales team: How to convert interest lists to orders

### Support Contacts
- Technical issues: dev-team@company.com
- Feature requests: product@company.com
- Client support: support@company.com

---

## Changelog

### Version 1.0.0 (November 2025)
- Initial release
- Catalog browsing with filters
- Interest list management
- Order integration
- Admin configuration
- Change detection

### Planned Features
- Version 1.1.0: Price alerts
- Version 1.2.0: Saved views enhancements
- Version 1.3.0: AI-powered recommendations

---

## Appendix

### Database Schema

```sql
-- Client Interest Lists
CREATE TABLE client_interest_lists (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL,
  status ENUM('NEW', 'REVIEWED', 'CONVERTED', 'ARCHIVED') DEFAULT 'NEW',
  submitted_at DATETIME NOT NULL,
  reviewed_at DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Client Interest List Items
CREATE TABLE client_interest_list_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  interest_list_id INT NOT NULL,
  batch_id INT NOT NULL,
  snapshot_price DECIMAL(10,2) NOT NULL,
  snapshot_quantity DECIMAL(15,4) NOT NULL,
  snapshot_category VARCHAR(255),
  snapshot_brand VARCHAR(255),
  snapshot_grade VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (interest_list_id) REFERENCES client_interest_lists(id),
  FOREIGN KEY (batch_id) REFERENCES batches(id)
);

-- Client Draft Interests
CREATE TABLE client_draft_interests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL,
  batch_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (batch_id) REFERENCES batches(id),
  UNIQUE KEY unique_client_batch (client_id, batch_id)
);

-- Client Catalog Views
CREATE TABLE client_catalog_views (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  filters JSON NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Client Price Alerts
CREATE TABLE client_price_alerts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL,
  batch_id INT NOT NULL,
  target_price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (batch_id) REFERENCES batches(id)
);
```

### API Endpoints

#### Client-Facing
- `GET /api/trpc/vipPortal.liveCatalog.getCatalog` - Browse catalog
- `GET /api/trpc/vipPortal.liveCatalog.getFilterOptions` - Get filter options
- `GET /api/trpc/vipPortal.liveCatalog.draftInterests.list` - Get draft interests
- `POST /api/trpc/vipPortal.liveCatalog.draftInterests.add` - Add to draft
- `POST /api/trpc/vipPortal.liveCatalog.draftInterests.remove` - Remove from draft
- `POST /api/trpc/vipPortal.liveCatalog.draftInterests.clear` - Clear draft
- `POST /api/trpc/vipPortal.liveCatalog.submitInterestList` - Submit interest list
- `GET /api/trpc/vipPortal.liveCatalog.views.list` - Get saved views
- `POST /api/trpc/vipPortal.liveCatalog.views.save` - Save view
- `DELETE /api/trpc/vipPortal.liveCatalog.views.delete` - Delete view

#### Admin
- `GET /api/trpc/vipPortalAdmin.liveCatalog.getConfiguration` - Get config
- `POST /api/trpc/vipPortalAdmin.liveCatalog.saveConfiguration` - Save config
- `GET /api/trpc/vipPortalAdmin.liveCatalog.interestLists.getByClient` - Get lists
- `GET /api/trpc/vipPortalAdmin.liveCatalog.interestLists.getById` - Get list details
- `POST /api/trpc/vipPortalAdmin.liveCatalog.interestLists.updateStatus` - Update status
- `POST /api/trpc/vipPortalAdmin.liveCatalog.interestLists.addToNewOrder` - Create order
- `POST /api/trpc/vipPortalAdmin.liveCatalog.interestLists.addToDraftOrder` - Add to order
- `GET /api/trpc/vipPortalAdmin.liveCatalog.draftInterests.getByClient` - Get client draft

---

**Last Updated:** November 6, 2025  
**Version:** 1.0.0  
**Maintainer:** Development Team
