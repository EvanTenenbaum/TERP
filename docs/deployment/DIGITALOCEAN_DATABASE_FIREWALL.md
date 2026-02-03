# DigitalOcean Database Firewall Configuration

## Overview

The TERP application uses a DigitalOcean Managed MySQL database. The database has a firewall that restricts which sources can connect to it. **The App Platform must be explicitly added to the firewall's trusted sources for deployments to succeed.**

## Critical Configuration

### Database Details

| Property      | Value                                  |
| ------------- | -------------------------------------- |
| Database ID   | `03cd0216-a4df-42c6-9bff-d9dc7dadec83` |
| Database Name | `terp-mysql-db`                        |
| Engine        | MySQL 8                                |
| Region        | `nyc3`                                 |
| Size          | `db-s-2vcpu-4gb`                       |

### App Platform Details

| Property | Value                                       |
| -------- | ------------------------------------------- |
| App ID   | `1fd40be5-b9af-4e71-ab1d-3af0864a7da4`      |
| App Name | `terp`                                      |
| Region   | `nyc`                                       |
| URL      | `https://terp-app-b9s35.ondigitalocean.app` |

## Required Firewall Rules

The database firewall **MUST** include the following trusted sources:

| Type      | Value                                  | Description                                     |
| --------- | -------------------------------------- | ----------------------------------------------- |
| `app`     | `1fd40be5-b9af-4e71-ab1d-3af0864a7da4` | **TERP App Platform** - Required for deployment |
| `ip_addr` | Developer IPs as needed                | For local development access                    |

## Symptoms of Missing Firewall Rule

If the App Platform is not in the database firewall's trusted sources, deployments will fail with:

```
❌ CRITICAL: Database health check failed - Cannot establish connection
error: {"errorno":"ETIMEDOUT","code":"ETIMEDOUT","syscall":"connect","fatal":true}
```

The deployment logs will show:

- All database queries timing out at exactly 10 seconds
- Schema fingerprint check failing after 3 retries
- Health checks failing because the server can't start

## How to Fix

### Using DigitalOcean MCP

```bash
# Check current firewall rules
manus-mcp-cli tool call db-cluster-get-firewall-rules --server digitalocean \
  --input '{"id": "03cd0216-a4df-42c6-9bff-d9dc7dadec83"}'

# Add App Platform to firewall (preserving existing rules)
manus-mcp-cli tool call db-cluster-update-firewall-rules --server digitalocean \
  --input '{
    "id": "03cd0216-a4df-42c6-9bff-d9dc7dadec83",
    "rules": [
      {"type": "ip_addr", "value": "YOUR_DEV_IP"},
      {"type": "app", "value": "1fd40be5-b9af-4e71-ab1d-3af0864a7da4"}
    ]
  }'
```

### Using DigitalOcean Console

1. Go to **Databases** → **terp-mysql-db** → **Settings** → **Trusted Sources**
2. Click **Edit**
3. Add the TERP app (`terp`) as a trusted source
4. Save changes

## Incident History

### 2026-02-02: Deployment Failure Due to Missing Firewall Rule

**Symptoms:**

- All deployments failing with health check timeout
- Database connection timing out with `ETIMEDOUT`
- Pre-deploy job (`setup-qa-admin`) failing

**Root Cause:**

- Database firewall only allowed one developer IP (`78.82.199.23`)
- App Platform containers were blocked from connecting

**Resolution:**

- Added TERP App Platform (`1fd40be5-b9af-4e71-ab1d-3af0864a7da4`) to database firewall
- Deployment succeeded immediately after

**Lesson Learned:**

- When troubleshooting deployment failures, **always check database firewall rules first**
- The error message "health check failed" can be misleading - the actual issue may be database connectivity

## Prevention

1. **Never remove the App Platform from database firewall rules**
2. **When creating new databases, immediately add the App Platform to trusted sources**
3. **Document any IP addresses added to the firewall with their purpose**
4. **Set up monitoring alerts for database connection failures**

## Related Documentation

- [DEPLOYMENT.md](../DEPLOYMENT.md) - General deployment guide
- [DATABASE_SETUP.md](../DATABASE_SETUP.md) - Database configuration
- [AUTO_DEPLOY_HEAL_GUIDE.md](../AUTO_DEPLOY_HEAL_GUIDE.md) - Auto-healing deployment issues
