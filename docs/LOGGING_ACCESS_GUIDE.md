# TERP Logging Access Guide

**Version:** 1.0  
**Last Updated:** November 30, 2025  
**Purpose:** Provide universal access to TERP application logs for any engineer or sandbox

---

## Overview

TERP uses a multi-layered logging approach to ensure logs are accessible from anywhere:

1. **DigitalOcean App Platform Logs** - Real-time application logs
2. **Papertrail** - Centralized log aggregation (optional)
3. **Sentry** - Error tracking and monitoring
4. **CLI Access** - Direct log access via `doctl` command-line tool

---

## Quick Start: Access Logs in 60 Seconds

### Prerequisites

```bash
# Install doctl (DigitalOcean CLI)
cd /tmp && \
wget -q https://github.com/digitalocean/doctl/releases/download/v1.115.0/doctl-1.115.0-linux-amd64.tar.gz && \
tar xf doctl-1.115.0-linux-amd64.tar.gz && \
sudo mv doctl /usr/local/bin/
```

### Authenticate

```bash
# Use the TERP DigitalOcean API token (contact admin for token)
export DIGITALOCEAN_API_TOKEN="your_token_here"
doctl auth init -t $DIGITALOCEAN_API_TOKEN
```

### View Logs

```bash
# Real-time application logs (most common)
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type run --follow

# Build logs
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type build

# Last 100 lines
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type run --tail 100
```

---

## Detailed Access Methods

### Method 1: DigitalOcean CLI (doctl) - Recommended

**Advantages:**
- ✅ Works from any sandbox or machine
- ✅ Real-time log streaming
- ✅ No additional setup required
- ✅ Filtered by log type (build, deploy, run)

**Installation:**

```bash
# Linux/macOS
cd /tmp
wget https://github.com/digitalocean/doctl/releases/download/v1.115.0/doctl-1.115.0-linux-amd64.tar.gz
tar xf doctl-1.115.0-linux-amd64.tar.gz
sudo mv doctl /usr/local/bin/

# Verify installation
doctl version
```

**Authentication:**

```bash
# Set the API token (contact TERP admin for the actual token)
export DIGITALOCEAN_API_TOKEN="your_token_here"

# Initialize with TERP API token
doctl auth init -t $DIGITALOCEAN_API_TOKEN

# Verify authentication
doctl apps list
```

**Common Commands:**

```bash
# App ID for TERP
APP_ID="1fd40be5-b9af-4e71-ab1d-3af0864a7da4"

# Real-time application logs (follow mode)
doctl apps logs $APP_ID --type run --follow

# Last 50 lines of application logs
doctl apps logs $APP_ID --type run --tail 50

# Build logs for current deployment
doctl apps logs $APP_ID --type build

# Build logs for specific deployment
doctl apps logs $APP_ID --type build --deployment <DEPLOYMENT_ID>

# Deploy logs
doctl apps logs $APP_ID --type deploy

# Restart logs
doctl apps logs $APP_ID --type run_restarted
```

**Filtering and Searching:**

```bash
# Search for specific errors
doctl apps logs $APP_ID --type run --tail 1000 | grep -i "error"

# Search for specific user activity
doctl apps logs $APP_ID --type run --tail 1000 | grep "userId:123"

# Search for API calls
doctl apps logs $APP_ID --type run --tail 1000 | grep "POST\|GET\|PUT\|DELETE"

# Save logs to file
doctl apps logs $APP_ID --type run --tail 5000 > terp-logs-$(date +%Y%m%d-%H%M%S).log
```

---

### Method 2: Papertrail (Web Interface)

**Status:** Configured but endpoint is encrypted in DigitalOcean secrets

**To Access:**

1. The Papertrail endpoint is stored as `PAPERTRAIL_ENDPOINT` environment variable
2. Contact the TERP admin to get the Papertrail dashboard URL
3. Logs are automatically forwarded from DigitalOcean to Papertrail
4. Access via web browser: `https://papertrailapp.com/systems/<system-id>/events`

**Advantages:**
- ✅ Web-based interface
- ✅ Advanced search and filtering
- ✅ Log retention and archiving
- ✅ Alerts and notifications
- ✅ Multi-user access

**Environment Variable:**

```yaml
PAPERTRAIL_ENDPOINT: logs.papertrailapp.com:XXXXX
```

---

### Method 3: Sentry (Error Tracking)

**Purpose:** Dedicated error and exception tracking

**Access:**
- Sentry DSN is configured in environment variables
- Contact TERP admin for Sentry dashboard access
- URL format: `https://sentry.io/organizations/<org>/projects/<project>/`

**Features:**
- Real-time error notifications
- Stack traces and context
- User impact analysis
- Performance monitoring
- Release tracking

**Environment Variables:**

```bash
SENTRY_DSN=https://your-dsn@sentry.io/project-id
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

---

## Log Types Explained

### 1. Run Logs (`--type run`)

**What:** Application runtime logs from the running container

**Contains:**
- HTTP requests and responses
- Application errors and warnings
- Database queries (if logging enabled)
- Custom application logs
- Performance metrics

**When to Use:**
- Debugging production issues
- Monitoring application behavior
- Investigating user-reported errors
- Performance analysis

**Example:**

```bash
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type run --follow
```

### 2. Build Logs (`--type build`)

**What:** Logs from the Docker build process

**Contains:**
- Dependency installation
- TypeScript compilation
- Build errors and warnings
- Docker layer caching info

**When to Use:**
- Debugging deployment failures
- Investigating build errors
- Optimizing build performance
- Verifying dependency installation

**Example:**

```bash
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type build
```

### 3. Deploy Logs (`--type deploy`)

**What:** Logs from the deployment process

**Contains:**
- Container startup
- Health check results
- Deployment status
- Rollout progress

**When to Use:**
- Debugging deployment issues
- Verifying successful deployments
- Investigating startup failures

**Example:**

```bash
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type deploy
```

### 4. Restart Logs (`--type run_restarted`)

**What:** Logs from container restarts

**Contains:**
- Restart reasons
- Crash information
- Recovery attempts

**When to Use:**
- Investigating application crashes
- Debugging memory issues
- Analyzing restart patterns

**Example:**

```bash
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type run_restarted
```

---

## Common Use Cases

### 1. Debugging a Production Error

```bash
# Step 1: Check recent errors
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type run --tail 500 | grep -i "error"

# Step 2: Get full context around error
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type run --tail 1000 > debug.log
grep -B 10 -A 10 "ERROR" debug.log

# Step 3: Check if it's a recurring issue
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type run --tail 5000 | grep -c "specific error message"
```

### 2. Monitoring a Deployment

```bash
# Terminal 1: Watch build logs
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type build --follow

# Terminal 2: Watch deployment logs
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type deploy --follow

# Terminal 3: Watch application startup
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type run --follow
```

### 3. Investigating Slow Performance

```bash
# Search for slow queries
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type run --tail 2000 | grep -i "slow\|timeout"

# Check for memory issues
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type run --tail 1000 | grep -i "memory\|heap"

# Look for database connection issues
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type run --tail 1000 | grep -i "database\|connection"
```

### 4. Tracking User Activity

```bash
# Find logs for specific user
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type run --tail 5000 | grep "user@example.com"

# Track API calls
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type run --tail 1000 | grep "POST /api"

# Monitor authentication events
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type run --tail 1000 | grep -i "login\|logout\|auth"
```

---

## Automated Log Retrieval Script

Save this script for quick log access:

```bash
#!/bin/bash
# File: terp-logs.sh
# Usage: ./terp-logs.sh [run|build|deploy|restart] [tail_count]

APP_ID="1fd40be5-b9af-4e71-ab1d-3af0864a7da4"
LOG_TYPE="${1:-run}"
TAIL_COUNT="${2:-100}"

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "doctl not found. Installing..."
    cd /tmp
    wget -q https://github.com/digitalocean/doctl/releases/download/v1.115.0/doctl-1.115.0-linux-amd64.tar.gz
    tar xf doctl-1.115.0-linux-amd64.tar.gz
    sudo mv doctl /usr/local/bin/
fi

# Check if authenticated
if ! doctl auth list &> /dev/null; then
    echo "Authenticating with DigitalOcean..."
    # Load token from .env.logging or environment
    source "$(dirname "$0")/../.env.logging" 2>/dev/null || true
    doctl auth init -t "${DIGITALOCEAN_API_TOKEN}"
fi

# Retrieve logs
echo "Fetching $LOG_TYPE logs (last $TAIL_COUNT lines)..."
doctl apps logs $APP_ID --type $LOG_TYPE --tail $TAIL_COUNT
```

**Make it executable:**

```bash
chmod +x terp-logs.sh
```

**Usage:**

```bash
# Last 100 run logs (default)
./terp-logs.sh

# Last 500 build logs
./terp-logs.sh build 500

# Last 50 deploy logs
./terp-logs.sh deploy 50
```

---

## Environment Variables Reference

### DigitalOcean App Platform
```bash
# App ID
APP_ID="1fd40be5-b9af-4e71-ab1d-3af0864a7da4"

# API Token (for doctl authentication - contact admin)
DIGITALOCEAN_API_TOKEN: "<contact_admin_for_token>"
```

### Papertrail

```yaml
# Endpoint (encrypted in DigitalOcean)
PAPERTRAIL_ENDPOINT: logs.papertrailapp.com:XXXXX
```

### Sentry

```yaml
# DSN (encrypted in DigitalOcean)
SENTRY_DSN: https://your-dsn@sentry.io/project-id
VITE_SENTRY_DSN: https://your-dsn@sentry.io/project-id
```

---

## Troubleshooting

### doctl Authentication Issues

**Problem:** `Error: Unable to authenticate with DigitalOcean`

**Solution:**

```bash
# Re-initialize authentication (load token from .env.logging)
source .env.logging
doctl auth init -t "$DIGITALOCEAN_API_TOKEN"

# Verify authentication
doctl auth list
```

### No Logs Returned

**Problem:** `doctl apps logs` returns empty

**Solution:**

```bash
# Check if app is running
doctl apps get 1fd40be5-b9af-4e71-ab1d-3af0864a7da4

# Check deployment status
doctl apps list-deployments 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 | head -3

# Try different log type
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type build
```

### Logs Cut Off

**Problem:** Logs are truncated

**Solution:**

```bash
# Increase tail count
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type run --tail 5000

# Save to file for full history
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type run --tail 10000 > full-logs.log
```

---

## Best Practices

### 1. Log Retention

- **DigitalOcean:** Logs are retained for a limited time (typically 7 days)
- **Papertrail:** Configurable retention (depends on plan)
- **Sentry:** 90 days default retention

**Recommendation:** Save important logs to files for long-term storage

```bash
# Daily log backup
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type run --tail 10000 > \
  terp-logs-$(date +%Y%m%d).log
```

### 2. Log Levels

TERP uses standard log levels:
- `ERROR` - Critical errors requiring immediate attention
- `WARN` - Warning messages indicating potential issues
- `INFO` - Informational messages about normal operation
- `DEBUG` - Detailed debugging information (development only)

### 3. Sensitive Data

**⚠️ IMPORTANT:** Logs may contain sensitive information

- Never share logs publicly
- Redact sensitive data before sharing
- Use Sentry's data scrubbing features
- Avoid logging passwords, tokens, or PII

### 4. Performance Impact

- Use `--follow` sparingly in production
- Limit `--tail` count for large log volumes
- Consider using Papertrail for heavy log analysis

---

## Quick Reference Card

```bash
# === TERP Logging Quick Reference ===

# App ID
APP_ID="1fd40be5-b9af-4e71-ab1d-3af0864a7da4"

# Install doctl
cd /tmp && wget -q https://github.com/digitalocean/doctl/releases/download/v1.115.0/doctl-1.115.0-linux-amd64.tar.gz && tar xf doctl-1.115.0-linux-amd64.tar.gz && sudo mv doctl /usr/local/bin/

# Authenticate (contact admin for token)
export DIGITALOCEAN_API_TOKEN="your_token_here"
doctl auth init -t $DIGITALOCEAN_API_TOKEN

# View logs (most common)
doctl apps logs $APP_ID --type run --tail 100
doctl apps logs $APP_ID --type run --follow
doctl apps logs $APP_ID --type build
doctl apps logs $APP_ID --type deploy

# Search logs
doctl apps logs $APP_ID --type run --tail 1000 | grep -i "error"

# Save logs
doctl apps logs $APP_ID --type run --tail 5000 > logs.txt
```

---

## Support

For issues with log access:

1. Check this documentation first
2. Verify doctl authentication
3. Confirm app is running: `doctl apps get 1fd40be5-b9af-4e71-ab1d-3af0864a7da4`
4. Contact TERP admin for Papertrail/Sentry access

---

**Last Updated:** November 30, 2025  
**Maintainer:** TERP DevOps Team  
**Version:** 1.0
