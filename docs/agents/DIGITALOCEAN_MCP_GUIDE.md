# DigitalOcean MCP Integration Guide for AI Agents

This guide documents how to use the DigitalOcean MCP (Model Context Protocol) integration to manage the TERP application infrastructure.

## Overview

The DigitalOcean MCP provides 198 tools for managing:
- App Platform applications
- Databases
- Droplets
- Kubernetes clusters
- And more...

## Common Commands

### List Available Tools
```bash
manus-mcp-cli tool list --server digitalocean
```

### Get Tool Details
```bash
manus-mcp-cli tool get <tool-name> --server digitalocean
```

### Call a Tool
```bash
manus-mcp-cli tool call <tool-name> --server digitalocean --input '<json_args>'
```

## App Platform Operations

### List All Apps
```bash
manus-mcp-cli tool call apps-list --server digitalocean --input '{}'
```

### Get App Info
```bash
manus-mcp-cli tool call apps-get-info --server digitalocean --input '{"AppID": "YOUR_APP_ID"}'
```

### Get Deployment Status
```bash
manus-mcp-cli tool call apps-get-deployment-status --server digitalocean --input '{"AppID": "YOUR_APP_ID"}'
```

### Get App Logs
```bash
manus-mcp-cli tool call apps-get-logs --server digitalocean --input '{
  "AppID": "YOUR_APP_ID",
  "Component": "web",
  "DeploymentID": "YOUR_DEPLOYMENT_ID",
  "LogType": "RUN",
  "TailLines": 100
}'
```

## Running Jobs on DigitalOcean App Platform

Jobs are one-time or scheduled tasks that run in the same environment as your app. They're useful for:
- Database migrations
- Seed scripts
- Scheduled tasks
- One-time maintenance operations

### Job Types

| Kind | Description |
|------|-------------|
| `PRE_DEPLOY` | Runs before the main service is deployed |
| `POST_DEPLOY` | Runs after the main service is deployed |
| `FAILED_DEPLOY` | Runs when a deployment fails |
| `UNSPECIFIED` | Manual trigger only |

### Adding a Job to an App

Use `apps-update` to add a job to your app spec:

```bash
manus-mcp-cli tool call apps-update --server digitalocean --input '{
  "update": {
    "app_id": "YOUR_APP_ID",
    "request": {
      "spec": {
        "name": "your-app-name",
        "region": "nyc",
        "services": [...],
        "jobs": [
          {
            "name": "my-job",
            "github": {
              "repo": "owner/repo",
              "branch": "main",
              "deploy_on_push": false
            },
            "dockerfile_path": "Dockerfile",
            "run_command": "pnpm my-script",
            "instance_size_slug": "apps-d-1vcpu-0.5gb",
            "instance_count": 1,
            "kind": "PRE_DEPLOY",
            "envs": [
              {"key": "NODE_ENV", "scope": "RUN_AND_BUILD_TIME", "value": "production"},
              {"key": "DATABASE_URL", "scope": "RUN_AND_BUILD_TIME", "value": "${db-name.DATABASE_URL}"}
            ]
          }
        ],
        "databases": [...],
        "envs": [...],
        "ingress": {...}
      }
    }
  }
}'
```

### Important Notes for Jobs

1. **app_id placement**: The `app_id` must be inside the `update` object, not at the root level
2. **Full spec required**: When updating, you must provide the complete app spec including all existing services, databases, and envs
3. **Environment variables**: Jobs can reference database connection strings using `${db-name.DATABASE_URL}` syntax
4. **Dockerfile**: Jobs use the same Dockerfile as your main service unless specified otherwise
5. **Run command**: Override the default command with `run_command`

### Example: Adding a Seed Script Job

```bash
# First, get the current app spec
manus-mcp-cli tool call apps-get-info --server digitalocean --input '{"AppID": "1fd40be5-b9af-4e71-ab1d-3af0864a7da4"}'

# Then update with the job added
manus-mcp-cli tool call apps-update --server digitalocean --input '{
  "update": {
    "app_id": "1fd40be5-b9af-4e71-ab1d-3af0864a7da4",
    "request": {
      "spec": {
        "name": "terp",
        "region": "nyc",
        "services": [
          {
            "name": "web",
            "github": {"repo": "EvanTenenbaum/TERP", "branch": "main", "deploy_on_push": true},
            "dockerfile_path": "Dockerfile",
            "http_port": 3000,
            "instance_size_slug": "apps-d-1vcpu-0.5gb",
            "envs": [...]
          }
        ],
        "jobs": [
          {
            "name": "seed-fill-gaps",
            "github": {"repo": "EvanTenenbaum/TERP", "branch": "main", "deploy_on_push": false},
            "dockerfile_path": "Dockerfile",
            "run_command": "pnpm seed:fill-gaps",
            "instance_size_slug": "apps-d-1vcpu-0.5gb",
            "instance_count": 1,
            "kind": "PRE_DEPLOY",
            "envs": [
              {"key": "NODE_ENV", "scope": "RUN_AND_BUILD_TIME", "value": "production"},
              {"key": "DATABASE_URL", "scope": "RUN_AND_BUILD_TIME", "value": "${terp-mysql-db.DATABASE_URL}"}
            ]
          }
        ],
        "databases": [
          {"cluster_name": "terp-mysql-db", "engine": "MYSQL", "name": "terp-mysql-db", "production": true}
        ],
        "envs": [...],
        "ingress": {...}
      }
    }
  }
}'
```

### Removing a Job

To remove a job, update the app spec without the job in the `jobs` array.

## TERP App Details

| Property | Value |
|----------|-------|
| App ID | `1fd40be5-b9af-4e71-ab1d-3af0864a7da4` |
| App Name | `terp` |
| Region | `nyc` |
| URL | `https://terp-app-b9s35.ondigitalocean.app` |
| Database | `terp-mysql-db` (MySQL) |
| Service | `web` (Dockerfile-based) |

## Troubleshooting

### Error: 405 Method Not Allowed
This usually means the `app_id` is in the wrong location. Make sure it's inside the `update` object:
```json
{
  "update": {
    "app_id": "...",  // ✅ Correct
    "request": {...}
  }
}
```

Not at the root:
```json
{
  "AppID": "...",  // ❌ Wrong
  "update": {...}
}
```

### Error: Invalid API Key
The MCP server handles authentication automatically. If you see auth errors, the MCP server may need to be reconfigured.

### Job Not Running
- Check that `kind` is set correctly (`PRE_DEPLOY`, `POST_DEPLOY`, etc.)
- Verify the `run_command` is correct
- Check deployment logs for errors

## Best Practices

1. **Always get current spec first**: Before updating, fetch the current app spec to ensure you don't accidentally remove existing configuration
2. **Use PRE_DEPLOY for migrations**: Database migrations and seed scripts should run before the new code is deployed
3. **Keep jobs idempotent**: Jobs may run multiple times, so ensure they can be safely re-run
4. **Monitor deployment status**: Use `apps-get-deployment-status` to track job execution
5. **Check logs on failure**: Use `apps-get-logs` with `Component` set to your job name to debug issues
