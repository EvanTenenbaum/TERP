# TERP Database Backup & Recovery

This document describes the automated backup and recovery procedures for the TERP database.

## Overview

The TERP backup system provides:
- **Automated daily backups** with compression
- **30-day retention policy** (configurable)
- **Optional S3 upload** for off-site storage
- **Simple recovery procedure** with integrity verification

## Automated Daily Backups

### Setup Cron Job

Add the following to your crontab to run daily backups at 2 AM:

```bash
# Edit crontab
crontab -e

# Add this line:
0 2 * * * /path/to/TERP/scripts/backup-database.sh >> /var/log/terp-backup.log 2>&1
```

### Environment Variables

Set these environment variables before running backups:

```bash
export DB_HOST=localhost
export DB_USER=terp_user
export DB_PASSWORD=your_password
export DB_NAME=terp_production
export BACKUP_DIR=/var/backups/terp
export RETENTION_DAYS=30

# Optional: S3 upload
export AWS_S3_BUCKET=terp-backups
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
```

## Manual Backup

To create a manual backup:

```bash
cd /path/to/TERP
./scripts/backup-database.sh
```

Output:
```
=========================================
TERP Database Backup
=========================================
Timestamp: 2025-10-27 02:00:00
Database: terp_production
Backup file: /var/backups/terp/terp_production_20251027_020000.sql.gz

Starting backup...
✓ Backup completed successfully
  File: /var/backups/terp/terp_production_20251027_020000.sql.gz
  Size: 45M

Cleaning up old backups (older than 30 days)...
✓ Removed 2 old backup(s)

=========================================
Backup process completed
=========================================
```

## Restore from Backup

### List Available Backups

```bash
ls -lh /var/backups/terp/
```

### Restore Database

```bash
cd /path/to/TERP
./scripts/restore-database.sh /var/backups/terp/terp_production_20251027_020000.sql.gz
```

You will be prompted to confirm:

```
=========================================
TERP Database Restore
=========================================
Backup file: /var/backups/terp/terp_production_20251027_020000.sql.gz
Database: terp_production
Timestamp: 2025-10-27 10:30:00

Verifying backup file integrity...
✓ Backup file is valid

⚠ WARNING: This will REPLACE the current database!
Continue with restoration? (yes/no): yes

Starting restoration...
✓ Database restored successfully

=========================================
Restoration completed
=========================================
```

## Verify Backup Integrity

To verify a backup file without restoring:

```bash
gunzip -t /var/backups/terp/terp_production_20251027_020000.sql.gz
```

If successful, no output is shown. If corrupted, you'll see an error.

## S3 Configuration (Optional)

For off-site backup storage, configure AWS S3:

1. **Install AWS CLI:**
   ```bash
   pip install awscli
   ```

2. **Configure credentials:**
   ```bash
   aws configure
   ```

3. **Set environment variable:**
   ```bash
   export AWS_S3_BUCKET=terp-backups
   ```

4. **Backups will automatically upload to S3** after local backup completes

## Monitoring Backups

### Check Backup Logs

```bash
tail -f /var/log/terp-backup.log
```

### Verify Recent Backups

```bash
ls -lth /var/backups/terp/ | head -10
```

### Test Restoration (Recommended Monthly)

1. Create a test database
2. Restore latest backup to test database
3. Verify data integrity
4. Drop test database

```bash
# Create test database
mysql -u root -p -e "CREATE DATABASE terp_test;"

# Restore to test database
export DB_NAME=terp_test
./scripts/restore-database.sh /var/backups/terp/terp_production_LATEST.sql.gz

# Verify
mysql -u root -p terp_test -e "SELECT COUNT(*) FROM orders;"

# Cleanup
mysql -u root -p -e "DROP DATABASE terp_test;"
```

## Troubleshooting

### Backup Fails with "Access Denied"

Ensure database credentials are correct:
```bash
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD -e "SHOW DATABASES;"
```

### Backup Directory Permission Denied

Create directory with proper permissions:
```bash
sudo mkdir -p /var/backups/terp
sudo chown $USER:$USER /var/backups/terp
```

### S3 Upload Fails

Verify AWS credentials:
```bash
aws s3 ls s3://$AWS_S3_BUCKET/
```

### Restoration Hangs

Check for large backup files and increase timeout:
```bash
# Monitor restoration progress
watch -n 1 'mysql -u root -p$DB_PASSWORD -e "SHOW PROCESSLIST;"'
```

## Best Practices

1. **Test restorations regularly** (at least monthly)
2. **Monitor backup logs** for failures
3. **Verify backup file sizes** are reasonable
4. **Keep backups off-site** (use S3 or similar)
5. **Document recovery procedures** for your team
6. **Set up alerts** for backup failures

## Recovery Time Objectives

| Backup Size | Estimated Restoration Time |
|-------------|---------------------------|
| < 100 MB    | 1-2 minutes               |
| 100 MB - 1 GB | 5-10 minutes            |
| 1 GB - 10 GB | 20-60 minutes            |
| > 10 GB     | 1-3 hours                 |

## Support

For backup-related issues, contact the TERP development team or refer to the main project documentation.

