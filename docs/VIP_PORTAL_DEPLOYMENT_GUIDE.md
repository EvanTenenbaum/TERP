# VIP Client Portal - Production Deployment Guide

**Date:** October 30, 2025  
**Version:** 1.0  
**Status:** Ready for Production Deployment

---

## Overview

This guide provides step-by-step instructions for deploying the VIP Client Portal to the production environment on DigitalOcean App Platform.

The VIP Portal code has been fully tested locally and all modules are working correctly. The deployment process involves applying database migrations, verifying the deployment, and creating initial VIP portal users.

---

## Prerequisites

Before deploying, ensure you have:

1. **Access to DigitalOcean Account** - Admin access to the TERP app on DigitalOcean
2. **Database Access** - Connection credentials for the production MySQL database
3. **GitHub Repository Access** - The code is already committed to the `main` branch

---

## Deployment Steps

### Step 1: Verify Auto-Deployment

The TERP application is configured for auto-deployment on DigitalOcean. When code is pushed to the `main` branch, it automatically triggers a new deployment.

**Check deployment status:**
1. Log in to [DigitalOcean Dashboard](https://cloud.digitalocean.com/)
2. Navigate to **Apps** → **terp-app-b9s35**
3. Check the **Deployments** tab for the latest deployment
4. Verify that the deployment includes the latest commits with VIP Portal code

**Expected commits in deployment:**
- `3ea9dbe` - Fix VIP portal router structure - separate config and dashboard routers - ALL MODULES WORKING!
- `5563e91` - CRITICAL FIX: Add VIP portal relations, fix password hash - LOGIN WORKING!
- `ba349fa` - Add VIP portal critical fixes and endpoints

---

### Step 2: Apply Database Migrations

The VIP Portal requires new database tables. You need to apply the migration file to the production database.

**Migration file location:**
```
/home/ubuntu/TERP/drizzle/migrations/0001_vip_portal_schema.sql
```

**Option A: Using DigitalOcean Database Console**

1. Go to **Databases** in DigitalOcean dashboard
2. Select your MySQL database
3. Click **Console** or **Query**
4. Copy and paste the contents of `0001_vip_portal_schema.sql`
5. Execute the SQL statements

**Option B: Using MySQL Client**

If you have the production database credentials:

```bash
# Connect to production database
mysql -h <host> -u <username> -p<password> <database_name>

# Run the migration
source /home/ubuntu/TERP/drizzle/migrations/0001_vip_portal_schema.sql

# Verify tables were created
SHOW TABLES LIKE 'vip_portal%';
```

**Expected output:**
```
+--------------------------------+
| Tables_in_db (vip_portal%)     |
+--------------------------------+
| vip_portal_auth                |
| vip_portal_configurations      |
+--------------------------------+
```

**Verify clients table was updated:**
```sql
DESCRIBE clients;
-- Should show new columns: vip_portal_enabled, vip_portal_last_login
```

---

### Step 3: Create VIP Portal Test User

After the migration is applied, create a test VIP portal user to verify the deployment.

**SQL to create test user:**

```sql
-- Enable VIP portal for a test client (adjust client_id as needed)
UPDATE clients 
SET vip_portal_enabled = TRUE 
WHERE id = 1;

-- Create VIP portal authentication record
-- Note: Password is 'TestPassword123!' hashed with bcrypt
INSERT INTO vip_portal_auth (
  client_id, 
  email, 
  password_hash
) VALUES (
  1,
  'test@vipportal.com',
  '$2b$10$lkY9Mnc7vkup5dNChNv1AOmJu9X40wvV6qv4n5zqvERNcAo9Fw4aa'
);

-- Create default configuration for the client
INSERT INTO vip_portal_configurations (
  client_id,
  module_dashboard_enabled,
  module_ar_enabled,
  module_ap_enabled,
  module_transaction_history_enabled,
  module_marketplace_needs_enabled,
  module_marketplace_supply_enabled,
  module_leaderboard_enabled
) VALUES (
  1,
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  TRUE
);
```

---

### Step 4: Verify Production Deployment

Once the deployment is complete and migrations are applied, verify the VIP Portal is working:

**1. Check VIP Portal Login Page**

Navigate to:
```
https://terp-app-b9s35.ondigitalocean.app/vip-portal/login
```

You should see the VIP Portal login page with:
- "VIP Client Portal" header
- Email and password fields
- "Sign In" button
- "Forgot password?" link

**2. Test Login**

Use the test credentials:
- **Email:** `test@vipportal.com`
- **Password:** `TestPassword123!`

After successful login, you should be redirected to:
```
https://terp-app-b9s35.ondigitalocean.app/vip-portal/dashboard
```

**3. Verify Dashboard Modules**

The dashboard should display:
- Client name in header
- Navigation tabs: Dashboard, Receivables, Payables, My Needs, My Supply, Leaderboard
- Dashboard KPIs (Credit utilization, VIP Status)
- Logout button

**4. Test Each Module**

Click through each tab to verify:
- ✅ **Dashboard** - Shows KPIs and status cards
- ✅ **Receivables** - Lists outstanding invoices
- ✅ **Payables** - Lists bills to pay
- ✅ **My Needs** - Marketplace needs (may be empty initially)
- ✅ **My Supply** - Marketplace supply (may be empty initially)
- ✅ **Leaderboard** - Shows leaderboard or "requires 5 clients" message

---

### Step 5: Create Production VIP Users

For each client that should have VIP portal access:

**1. Enable VIP Portal for Client**
```sql
UPDATE clients 
SET vip_portal_enabled = TRUE 
WHERE id = <client_id>;
```

**2. Create Authentication Record**

**Option A: Email/Password Authentication**

Generate a secure password hash using bcryptjs:
```javascript
const bcrypt = require('bcryptjs');
const password = 'SecurePassword123!';
const hash = await bcrypt.hash(password, 10);
console.log(hash);
```

Then insert the auth record:
```sql
INSERT INTO vip_portal_auth (client_id, email, password_hash)
VALUES (<client_id>, 'client@email.com', '<bcrypt_hash>');
```

**Option B: OAuth Only (Google/Microsoft)**

If the client will only use OAuth:
```sql
INSERT INTO vip_portal_auth (client_id, email)
VALUES (<client_id>, 'client@email.com');
-- OAuth IDs will be populated on first login
```

**3. Create Configuration**

Use default configuration or customize:
```sql
INSERT INTO vip_portal_configurations (
  client_id,
  module_dashboard_enabled,
  module_ar_enabled,
  module_ap_enabled,
  module_transaction_history_enabled,
  module_marketplace_needs_enabled,
  module_marketplace_supply_enabled,
  module_leaderboard_enabled
) VALUES (
  <client_id>,
  TRUE,  -- dashboard
  TRUE,  -- accounts receivable
  TRUE,  -- accounts payable
  TRUE,  -- transaction history
  TRUE,  -- marketplace needs
  TRUE,  -- marketplace supply
  FALSE  -- leaderboard (enable when you have 5+ VIP clients)
);
```

---

## Admin Portal Configuration

The VIP Portal includes admin endpoints for managing configurations. These can be accessed through the main TERP admin interface.

**Admin Endpoints Available:**

1. **Get Client Configuration**
   - Endpoint: `vipPortalAdmin.config.get`
   - Returns current configuration for a client

2. **Update Client Configuration**
   - Endpoint: `vipPortalAdmin.config.update`
   - Allows enabling/disabling modules

3. **Update Leaderboard Settings**
   - Endpoint: `vipPortalAdmin.leaderboard.updateSettings`
   - Configure leaderboard type, display mode, etc.

---

## Monitoring and Troubleshooting

### Check Application Logs

In DigitalOcean dashboard:
1. Go to **Apps** → **terp-app-b9s35**
2. Click **Runtime Logs**
3. Filter for VIP portal related logs

### Common Issues

**Issue: Login fails with "Invalid email or password"**
- **Cause:** Password hash is incorrect or user doesn't exist
- **Solution:** Verify the user exists in `vip_portal_auth` table and password hash is correct

**Issue: Dashboard shows "Loading your portal..." indefinitely**
- **Cause:** API endpoints are failing or database queries are erroring
- **Solution:** Check application logs for errors, verify database connection

**Issue: Modules not appearing in navigation**
- **Cause:** Module is disabled in configuration
- **Solution:** Check `vip_portal_configurations` table and ensure desired modules are enabled

**Issue: "Leaderboard requires at least 5 VIP clients"**
- **Cause:** Not enough VIP clients with portal access
- **Solution:** This is expected behavior. Enable VIP portal for at least 5 clients, or disable leaderboard module

---

## Security Considerations

### Password Security

- All passwords are hashed using bcryptjs with salt rounds = 10
- Never store plain text passwords
- Encourage clients to use strong passwords (minimum 8 characters, mix of letters, numbers, symbols)

### Session Management

- Sessions are stored in `vip_portal_auth.session_token`
- Session tokens are UUIDs generated on login
- Sessions expire after inactivity (configurable)

### OAuth Integration

- Google OAuth is supported (requires Google Cloud credentials)
- Microsoft OAuth is supported (requires Azure AD credentials)
- OAuth credentials should be configured in environment variables

### Environment Variables

Ensure these are set in DigitalOcean App Platform:

```bash
# Database
DATABASE_URL=mysql://user:password@host:port/database

# JWT (for session tokens)
JWT_SECRET=<secure_random_string>

# OAuth (if using)
GOOGLE_CLIENT_ID=<google_client_id>
GOOGLE_CLIENT_SECRET=<google_client_secret>
MICROSOFT_CLIENT_ID=<microsoft_client_id>
MICROSOFT_CLIENT_SECRET=<microsoft_client_secret>

# Application
NODE_ENV=production
```

---

## Rollback Plan

If issues occur during deployment:

**1. Revert Code Changes**
```bash
git revert <commit_hash>
git push origin main
```

**2. Rollback Database Migrations**

The VIP portal tables can be safely removed without affecting existing TERP functionality:

```sql
-- Remove VIP portal tables
DROP TABLE IF EXISTS vip_portal_auth;
DROP TABLE IF EXISTS vip_portal_configurations;

-- Remove VIP portal columns from clients table
ALTER TABLE clients 
DROP COLUMN vip_portal_enabled,
DROP COLUMN vip_portal_last_login;
```

**3. Verify Main TERP Functionality**

After rollback, verify that the main TERP application is still working:
- Dashboard loads
- Inventory management works
- Accounting module works
- Client management works

---

## Post-Deployment Checklist

- [ ] Database migrations applied successfully
- [ ] VIP Portal login page accessible
- [ ] Test user can log in
- [ ] Dashboard displays correctly
- [ ] All modules load without errors
- [ ] Production VIP users created
- [ ] Client notifications sent (if applicable)
- [ ] Monitoring configured
- [ ] Documentation updated

---

## Support and Maintenance

### Future Enhancements

The VIP Portal is designed to be extensible. Future enhancements may include:

- **Credit Center Module** - Apply for credit increases
- **VIP Tier System** - Bronze, Silver, Gold, Platinum tiers with benefits
- **Advanced Analytics** - Detailed spending analytics and trends
- **Mobile App** - Native iOS/Android apps
- **Push Notifications** - Real-time alerts for invoices, payments, etc.

### Maintenance Tasks

**Weekly:**
- Review VIP portal usage logs
- Check for failed login attempts
- Monitor API response times

**Monthly:**
- Review and update VIP client configurations
- Analyze leaderboard engagement
- Update marketplace needs/supply data

**Quarterly:**
- Security audit of authentication system
- Performance optimization
- Feature usage analysis

---

## Contact Information

For deployment support or issues:

- **GitHub Repository:** https://github.com/EvanTenenbaum/TERP
- **Production URL:** https://terp-app-b9s35.ondigitalocean.app
- **Documentation:** `/home/ubuntu/TERP/docs/`

---

## Appendix: Complete Migration SQL

The complete migration file is located at:
```
/home/ubuntu/TERP/drizzle/migrations/0001_vip_portal_schema.sql
```

This file includes:
- ALTER TABLE statements for `clients` table
- CREATE TABLE statements for `vip_portal_configurations`
- CREATE TABLE statements for `vip_portal_auth`
- All necessary indexes and foreign keys

**Important:** Run this migration file exactly once on the production database. Running it multiple times will cause errors.

---

**Deployment Guide Version:** 1.0  
**Last Updated:** October 30, 2025  
**Author:** Manus AI
