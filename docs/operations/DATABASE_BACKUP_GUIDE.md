# TERP Database Backup Guide

**Version:** 1.0  
**Last Updated:** December 19, 2025  
**Task:** REL-002 - Automated Database Backups

---

## Overview

TERP uses automated MySQL database backups to prevent data loss. Backups are:
- Compressed with gzip
- Scheduled daily at 2 AM
- Retained for 30 days
- Optionally uploaded to S3 for offsite storage

---

## Quick Start

### Check Backup Status
```bash
./scripts/check-backup-status.sh
```

### Run Manual Backup
```bash
./scripts/backup-database.sh
```

### Setup Automated Backups
```bash
./scripts/setup-backup-cron.sh
```

---

## Scripts

### 1. `backup-database.sh`

Performs a full database backup with compression.

**Features:**
- Uses `mysqldump` with `--single-transaction` for consistent backups
- Includes routines, triggers, and events
- Compresses output with gzip
- Verifies backup integrity
- Cleans up old backups based on retention policy
- Optional S3 upload for offsite storage

**Configuration (Environment Variables):**

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | localhost | Database host |
| `DB_USER` | root | Database user |
| `DB_PASSWORD` | - | Database password (if no .my.cnf) |
| `DB_NAME` | terp_production | Database name |
| `BACKUP_DIR` | /var/backups/terp | Backup storage directory |
| `RETENTION_DAYS` | 30 | Days to keep backups |
| `AWS_S3_BUCKET` | - | S3 bucket for offsite backup (optional) |

**Usage:**
```bash
# Basic usage (uses .my.cnf or environment)
./scripts/backup-database.sh

# With custom configuration
DB_NAME=terp_staging BACKUP_DIR=/tmp/backups ./scripts/backup-database.sh

# With S3 upload
AWS_S3_BUCKET=my-backup-bucket ./scripts/backup-database.sh
```

### 2. `setup-backup-cron.sh`

Sets up automated daily backups via cron.

**Default Schedule:** 2 AM daily (`0 2 * * *`)

**Usage:**
```bash
# Setup with default schedule (2 AM daily)
./scripts/setup-backup-cron.sh

# Custom schedule (e.g., every 6 hours)
CRON_SCHEDULE="0 */6 * * *" ./scripts/setup-backup-cron.sh
```

**Cron Schedule Format:**
```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6)
│ │ │ │ │
* * * * *
```

### 3. `check-backup-status.sh`

Monitors backup health and alerts if backups are stale.

**Checks:**
- Backup directory exists
- Recent backup exists
- Backup file integrity (gzip validation)
- Backup age (alerts if > 25 hours old)

**Usage:**
```bash
# Basic check
./scripts/check-backup-status.sh

# Custom max age (in hours)
MAX_BACKUP_AGE_HOURS=48 ./scripts/check-backup-status.sh
```

**Exit Codes:**
- `0` - All checks passed
- `1` - Check failed (missing backup, corrupted, or too old)

---

## Credential Management

### Option 1: MySQL Config File (Recommended)

Create `~/.my.cnf`:
```ini
[client]
user=your_username
password=your_password
host=your_host
port=25060
ssl-mode=REQUIRED
```

Set permissions:
```bash
chmod 600 ~/.my.cnf
```

### Option 2: Environment Variables

```bash
export DB_USER=your_username
export DB_PASSWORD=your_password
export DB_HOST=your_host
```

**⚠️ Security Note:** Never pass passwords via command line arguments. They're visible in `ps` output.

---

## DigitalOcean Managed Database

For TERP's production database on DigitalOcean:

```bash
# Create .my.cnf with DO credentials
cat > ~/.my.cnf << EOF
[client]
user=doadmin
password=YOUR_DO_PASSWORD
host=terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com
port=25060
ssl-mode=REQUIRED
EOF

chmod 600 ~/.my.cnf

# Set database name
export DB_NAME=defaultdb
export DB_HOST=terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com

# Run backup
./scripts/backup-database.sh
```

---

## Restore Procedure

### 1. List Available Backups
```bash
ls -lah /var/backups/terp/
```

### 2. Restore from Backup
```bash
# Decompress and restore
gunzip -c /var/backups/terp/terp_production_20251219_020000.sql.gz | mysql -u root -p terp_production

# Or for DigitalOcean
gunzip -c backup.sql.gz | mysql --defaults-file=~/.my.cnf defaultdb
```

### 3. Verify Restore
```bash
# Check table counts
mysql -e "SELECT COUNT(*) FROM clients;" terp_production
mysql -e "SELECT COUNT(*) FROM orders;" terp_production
```

---

## Monitoring

### Health Check Integration

Add to your monitoring system:
```bash
# Returns exit code 0 if healthy, 1 if unhealthy
./scripts/check-backup-status.sh
```

### Alerting

The check script can be integrated with:
- Cron + email alerts
- Monitoring tools (Datadog, New Relic, etc.)
- Slack webhooks

Example cron alert:
```bash
# Check backup status every hour, email on failure
0 * * * * /path/to/scripts/check-backup-status.sh || mail -s "TERP Backup Alert" admin@example.com
```

---

## Troubleshooting

### "No credentials found"
- Create `~/.my.cnf` with database credentials
- Or set `DB_PASSWORD` environment variable

### "Backup file is corrupted"
- Check disk space: `df -h`
- Check for interrupted backups
- Re-run backup manually

### "Backup is older than X hours"
- Check if cron job is running: `crontab -l`
- Check cron logs: `tail -f /var/log/terp-backup.log`
- Run manual backup to verify connectivity

### "mysqldump: command not found"
- Install MySQL client: `apt install mysql-client` or `brew install mysql-client`

---

## Best Practices

1. **Test restores regularly** - A backup is only good if you can restore from it
2. **Monitor backup age** - Set up alerts for stale backups
3. **Use offsite storage** - Configure S3 upload for disaster recovery
4. **Secure credentials** - Use `.my.cnf` with 600 permissions
5. **Verify integrity** - The scripts automatically verify gzip integrity
6. **Retain multiple copies** - Default 30-day retention provides recovery options

---

## Related Documentation

- [Infrastructure Guide](../.kiro/steering/04-infrastructure.md)
- [DigitalOcean Database Docs](https://docs.digitalocean.com/products/databases/mysql/)
