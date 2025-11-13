# TERP Development Deployment Guide

## Current Status

**Live Development URL:** https://3001-ichtogremfzu0pbcw8rfc-2ba70fb0.manusvm.computer

This deployment is running in the Manus sandbox and is suitable for development and iteration.

## Quick Start (Already Running)

The TERP application is currently deployed and running with:
- ✅ MySQL database with all migrations applied
- ✅ All latest code from GitHub (commit 5753aee)
- ✅ OAuth authentication configured
- ✅ Development environment ready

## Accessing the Application

1. **Navigate to:** https://3001-ichtogremfzu0pbcw8rfc-2ba70fb0.manusvm.computer
2. **Login:** Use OAuth (Google, Microsoft, or Apple)
3. **Start iterating:** All features are available

## Database Access

**Connection Details:**
- Host: localhost (within sandbox)
- Database: terp_production
- User: terp_user
- Password: terp_production_2024

**To access database:**
```bash
mysql -u terp_user -pterp_production_2024 terp_production
```

## Server Management

**Check server status:**
```bash
ps aux | grep "node dist/index.js"
```

**View server logs:**
```bash
tail -f /tmp/terp-v2.log
```

**Restart server:**
```bash
# Kill existing process
pkill -f "node dist/index.js"

# Start new process
cd /home/ubuntu/TERP
node dist/index.js > /tmp/terp-server.log 2>&1 &
```

## Updating Code

When you make changes to the codebase:

```bash
cd /home/ubuntu/TERP

# Pull latest changes
git pull origin main

# Install dependencies (if package.json changed)
pnpm install

# Run database migrations (if schema changed)
pnpm db:push

# Rebuild application
pnpm build

# Restart server
pkill -f "node dist/index.js"
node dist/index.js > /tmp/terp-server.log 2>&1 &
```

## Environment Variables

Located at `/home/ubuntu/TERP/.env`:

```env
DATABASE_URL=mysql://terp_user:terp_production_2024@localhost:3306/terp_production
PORT=3000
OAUTH_SERVER_URL=https://manus.im
OAUTH_CLIENT_ID=BnbuGpJyxab4suPN4jFq3M
OAUTH_CLIENT_SECRET=placeholder
VITE_APP_TITLE=TERP - Modern ERP Interface
VITE_APP_LOGO=/logo.png
VITE_OAUTH_PORTAL_URL=https://manus.im
VITE_APP_ID=BnbuGpJyxab4suPN4jFq3M
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
```

## Testing Features

All implemented features are available:

### Phase 1-4 (Core Features)
- Transaction management
- Credit management
- Bad debt write-off
- Payment methods
- Inventory tracking
- Accounting integration
- Audit logging
- Configuration management

### Phase 6-9 (Recent Features)
- Sample management
- Dashboard analytics
- Sales sheet enhancements
- Advanced tag features

### Latest Features (500-Scenario Implementation)
- Product intake flow
- Recurring orders
- Reorder functionality
- Payment terms
- Product recommendations
- Alert configuration

## API Testing

**tRPC API Endpoint:** https://3001-ichtogremfzu0pbcw8rfc-2ba70fb0.manusvm.computer/api/trpc

**Available Routers:**
- clients
- orders
- inventory
- accounting
- credits
- badDebt
- samples
- dashboardEnhanced
- salesSheetEnhancements
- advancedTagFeatures
- productIntake
- orderEnhancements (recurring, reorder, payment terms, recommendations, alerts)

## Troubleshooting

### Server won't start
```bash
# Check if port is in use
netstat -tlnp | grep 3000

# Check logs for errors
cat /tmp/terp-server.log
```

### Database connection errors
```bash
# Check MySQL status
sudo service mysql status

# Restart MySQL if needed
sudo service mysql restart
```

### Build errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules
pnpm install

# Check TypeScript compilation
pnpm check
```

## Development Workflow

1. **Make code changes** in your local editor or via Manus
2. **Commit to GitHub**
3. **Pull changes** to sandbox: `git pull origin main`
4. **Rebuild**: `pnpm build`
5. **Restart server**
6. **Test** at the development URL

## Sandbox Persistence

**Important:** This deployment runs in a Manus sandbox which:
- Persists across hibernation
- Maintains database state
- Keeps server running
- Preserves installed packages

The deployment will remain available as long as the sandbox is active.

## Next Steps for Permanent Deployment

When ready to move to production:
1. Set up managed database (PlanetScale, AWS RDS, etc.)
2. Deploy to hosting platform (Vercel, Railway, Render)
3. Configure custom domain
4. Set up CI/CD from GitHub
5. Configure production environment variables

## Support

For issues or questions:
- Check logs: `/tmp/terp-server.log`
- Review database: `mysql -u terp_user -p terp_production`
- Check server status: `ps aux | grep node`
- Restart services as needed

---

**Current Deployment:** Ready for iteration and development
**Last Updated:** 2025-10-26
**Deployed Commit:** 5753aee (fix: Rename 'apply' endpoint to 'applyCredit')

