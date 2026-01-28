# TERP Operations API

A secure API service that provides Manus (and other AI agents) with reliable access to TERP's DigitalOcean infrastructure.

## Why This Exists

Manus runs in cloud sandboxes with dynamic IP addresses. DigitalOcean's managed MySQL uses IP-based allowlisting, so direct database connections from Manus are unreliable.

This API service runs on `terp-gh-runner-1` (which is in the same VPC as the database) and provides:
- Authenticated HTTP endpoint accessible from anywhere
- Database query execution via the private VPC connection
- Shell command execution (allowlisted)
- System health monitoring

## Architecture

```
┌─────────────┐     HTTPS      ┌───────────────────────┐
│   Manus     │ ────────────▶  │  terp-gh-runner-1     │
│  (any IP)   │ ◀────────────  │  (10.108.0.2)         │
└─────────────┘     JSON       │                       │
                               │  ┌─────────────────┐  │
                               │  │ TERP Ops API    │  │
                               │  │ :3100           │  │
                               │  └────────┬────────┘  │
                               │           │           │
                               │    Private VPC        │
                               │           │           │
                               │  ┌────────▼────────┐  │
                               │  │ terp-mysql-db   │  │
                               │  │ :25060          │  │
                               │  └─────────────────┘  │
                               └───────────────────────┘
```

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Service health check |
| `/db/ping` | GET | Yes | Test database connectivity |
| `/db/tables` | GET | Yes | List all tables with metadata |
| `/db/query` | POST | Yes | Execute SQL (read-only by default) |
| `/db/verify/batch-status` | GET | Yes | Batch status distribution |
| `/db/verify/live-batches` | GET | Yes | Live batch counts |
| `/exec` | POST | Yes | Execute allowed shell commands |
| `/system/info` | GET | Yes | System uptime, memory, disk |
| `/runner/status` | GET | Yes | GitHub Actions runner status |

## Authentication

All endpoints except `/health` require a Bearer token:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" http://10.108.0.2:3100/db/ping
```

## Deployment

Use the GitHub Actions workflow:

1. Go to Actions → Deploy Operations API
2. Select action: `deploy`, `restart`, `status`, or `logs`
3. Run workflow

**Required Secrets:**
- `DROPLET_SSH_KEY`: SSH private key for terp-gh-runner-1
- `PROD_DB_PASSWORD`: Database password

## Usage Examples

### Health Check
```bash
curl http://10.108.0.2:3100/health
```

### Custom SQL Query
```bash
curl -X POST \
  -H "Authorization: Bearer $OPS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT COUNT(*) FROM batches"}' \
  http://10.108.0.2:3100/db/query
```

### Shell Command
```bash
curl -X POST \
  -H "Authorization: Bearer $OPS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"command": "df", "args": ["-h"]}' \
  http://10.108.0.2:3100/exec
```

## Security

- **Read-only mode**: Write queries blocked by default
- **Command allowlist**: Only specified commands can run
- **API key auth**: 256-bit key with timing-safe comparison
- **VPC-only**: Firewall restricts to internal network

## For Manus Integration

Add to Manus's environment:
- `OPS_API_BASE_URL`: `http://10.108.0.2:3100`
- `OPS_API_KEY`: (from deployment output)