# TERP Development - Quick Reference

## 🌐 Live Development URL

**https://3001-ichtogremfzu0pbcw8rfc-2ba70fb0.manusvm.computer**

## 🚀 Quick Commands

### Update & Restart

```bash
cd /home/ubuntu/TERP
git pull origin main
pnpm install
pnpm build
pkill -f "node dist/index.js"
node dist/index.js > /tmp/terp-server.log 2>&1 &
```

### Check Status

```bash
# Server running?
ps aux | grep "node dist"

# View logs
tail -f /tmp/terp-server.log

# Database accessible?
mysql -u terp_user -pterp_production_2024 terp_production -e "SHOW TABLES;"
```

### Database

```bash
# Connect
mysql -u terp_user -pterp_production_2024 terp_production

# Run migrations
cd /home/ubuntu/TERP && pnpm db:push

# Backup
mysqldump -u terp_user -pterp_production_2024 terp_production > backup.sql
```

## 📦 What's Deployed

### All Features (100% Complete)

- ✅ Transaction & Credit Management
- ✅ Bad Debt Write-Off
- ✅ Inventory Tracking & Movements
- ✅ Accounting Integration & COGS
- ✅ Audit Logging
- ✅ Sample Management
- ✅ Dashboard Analytics
- ✅ Sales Sheet Enhancements
- ✅ Advanced Tag Features
- ✅ **Product Intake Flow** (batch-by-batch with supplier receipts)
- ✅ Recurring Orders
- ✅ Reorder Functionality
- ✅ Payment Terms Management
- ✅ Product Recommendations
- ✅ Alert Configuration

### Database Tables (30+)

All migrations applied (0012-0018)

### API Endpoints (70+)

All routers registered and functional

## 🔧 Common Tasks

### Add New Feature

1. Code in `/home/ubuntu/TERP/server/` or `/home/ubuntu/TERP/client/`
2. `pnpm check` (verify TypeScript)
3. `git add . && git commit -m "feat: description"`
4. `git push origin main`
5. Rebuild & restart (see commands above)

### Fix Bug

1. Identify issue in logs: `tail -f /tmp/terp-server.log`
2. Fix code
3. `pnpm check`
4. Rebuild & restart
5. Test at dev URL

### Update Schema

1. Edit `/home/ubuntu/TERP/drizzle/schema.ts`
2. `pnpm db:push` (generates migration)
3. Check migration in `/home/ubuntu/TERP/drizzle/`
4. Rebuild & restart

## 🐛 Troubleshooting

| Issue              | Solution                                    |
| ------------------ | ------------------------------------------- |
| Server won't start | Check logs: `cat /tmp/terp-server.log`      |
| Port in use        | Kill process: `pkill -f "node dist"`        |
| Database error     | Restart MySQL: `sudo service mysql restart` |
| Build fails        | `rm -rf node_modules && pnpm install`       |
| TypeScript errors  | `pnpm check` to see all errors              |

## 📝 Git Workflow

```bash
# Check status
git status

# Pull latest
git pull origin main

# Commit changes
git add .
git commit -m "type: description"
git push origin main

# View history
git log --oneline -10
```

## 🔐 Environment

Located at `/home/ubuntu/TERP/.env`

Key variables:

- `DATABASE_URL` - MySQL connection
- `OAUTH_SERVER_URL` - Manus OAuth
- `VITE_APP_*` - Frontend config

## 📊 Monitoring

```bash
# Server uptime
ps aux | grep "node dist" | grep -v grep

# Database size
mysql -u terp_user -pterp_production_2024 terp_production -e "
SELECT
  table_schema AS 'Database',
  ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'terp_production'
GROUP BY table_schema;"

# Disk space
df -h /home/ubuntu/TERP
```

## 🎯 Testing Checklist

- [ ] Server starts without errors
- [ ] Login page loads
- [ ] OAuth authentication works
- [ ] API endpoints respond
- [ ] Database queries execute
- [ ] No TypeScript errors
- [ ] All features accessible

## 📞 Quick Help

**Logs:** `/tmp/terp-server.log`  
**Database:** `mysql -u terp_user -pterp_production_2024 terp_production`  
**Code:** `/home/ubuntu/TERP/`  
**Docs:** `/home/ubuntu/TERP/docs/`

---

**Status:** ✅ RUNNING  
**URL:** https://3001-ichtogremfzu0pbcw8rfc-2ba70fb0.manusvm.computer  
**Last Deploy:** 2025-10-26
