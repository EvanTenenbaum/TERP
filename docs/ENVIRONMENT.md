# TERP Environment Variables

Complete documentation of all environment variables used by the TERP application.

## Quick Setup

```bash
# Copy example file
cp .env.example .env

# Generate secure JWT secret
openssl rand -base64 32
```

## Variable Reference

### Required Variables

These variables must be set for the application to function.

#### `DATABASE_URL`

MySQL database connection string.

| Property | Value                                                                 |
| -------- | --------------------------------------------------------------------- |
| Required | Yes                                                                   |
| Format   | `mysql://user:password@host:port/database`                            |
| Example  | `mysql://doadmin:password@host.db.ondigitalocean.com:25060/defaultdb` |

**Connection String Components:**

- `user`: Database username
- `password`: Database password (URL-encoded if contains special characters)
- `host`: Database server hostname
- `port`: Database port (default: 3306)
- `database`: Database name

```bash
# Example for local development
DATABASE_URL=mysql://root:password@localhost:3306/terp

# Example for DigitalOcean managed database
DATABASE_URL=mysql://doadmin:AVNS_xxx@db-mysql-xxx-do-user-xxx-0.c.db.ondigitalocean.com:25060/defaultdb?ssl=true
```

#### `JWT_SECRET`

Secret key for signing JWT authentication tokens.

| Property       | Value         |
| -------------- | ------------- |
| Required       | Yes           |
| Minimum Length | 32 characters |
| Type           | Random string |

**Security Requirements:**

- Must be at least 32 characters
- Must be randomly generated
- Must be kept secret
- Should be rotated periodically

```bash
# Generate a secure secret
openssl rand -base64 32
```

---

### Application Configuration

#### `NODE_ENV`

Application environment mode.

| Property | Value                               |
| -------- | ----------------------------------- |
| Required | No                                  |
| Default  | `development`                       |
| Options  | `development`, `production`, `test` |

**Behavior by mode:**

- `development`: Verbose logging, hot reload, source maps
- `production`: Optimized builds, minimal logging
- `test`: Test database, mocked services

#### `PORT`

Server listening port.

| Property | Value  |
| -------- | ------ |
| Required | No     |
| Default  | `3000` |
| Type     | Number |

**Note:** DigitalOcean App Platform overrides this automatically.

#### `VITE_APP_TITLE`

Application title shown in browser.

| Property | Value  |
| -------- | ------ |
| Required | No     |
| Default  | `TERP` |

#### `VITE_APP_ID`

Application identifier.

| Property | Value      |
| -------- | ---------- |
| Required | No         |
| Default  | `terp-app` |

---

### Authentication (Clerk)

Clerk handles user authentication and session management.

#### `VITE_CLERK_PUBLISHABLE_KEY`

Clerk publishable key for client-side authentication.

| Property | Value                                           |
| -------- | ----------------------------------------------- |
| Required | Production                                      |
| Format   | `pk_test_*` or `pk_live_*`                      |
| Source   | [Clerk Dashboard](https://dashboard.clerk.com/) |

**Note:** Prefix `VITE_` exposes this to the browser - safe because it's a publishable key.

#### `CLERK_SECRET_KEY`

Clerk secret key for server-side operations.

| Property | Value                                           |
| -------- | ----------------------------------------------- |
| Required | Production                                      |
| Format   | `sk_test_*` or `sk_live_*`                      |
| Source   | [Clerk Dashboard](https://dashboard.clerk.com/) |

**Security:** Keep this secret. Never expose in client code.

---

### Error Tracking (Sentry)

Sentry provides error tracking and performance monitoring.

#### `SENTRY_DSN`

Server-side Sentry Data Source Name.

| Property | Value                                  |
| -------- | -------------------------------------- |
| Required | No                                     |
| Format   | `https://xxx@xxx.ingest.sentry.io/xxx` |
| Source   | [Sentry.io](https://sentry.io/)        |

#### `VITE_SENTRY_DSN`

Client-side Sentry Data Source Name.

| Property | Value                                  |
| -------- | -------------------------------------- |
| Required | No                                     |
| Format   | `https://xxx@xxx.ingest.sentry.io/xxx` |

**Note:** Can use same DSN as server or separate for client-only errors.

#### `SENTRY_ORG`

Sentry organization slug for source map uploads.

| Property | Value                     |
| -------- | ------------------------- |
| Required | No (for source maps only) |
| Example  | `my-organization`         |

#### `SENTRY_PROJECT`

Sentry project slug for source map uploads.

| Property | Value                     |
| -------- | ------------------------- |
| Required | No (for source maps only) |
| Example  | `terp-production`         |

#### `SENTRY_AUTH_TOKEN`

Authentication token for Sentry CLI.

| Property | Value                                                         |
| -------- | ------------------------------------------------------------- |
| Required | No (for source maps only)                                     |
| Source   | [Sentry Auth Tokens](https://sentry.io/settings/auth-tokens/) |

**Security:** Only needed during build. Set in CI/CD environment.

---

### Feature Flags

#### `FEATURE_LIVE_CATALOG`

Enable live catalog functionality.

| Property | Value           |
| -------- | --------------- |
| Required | No              |
| Default  | `false`         |
| Options  | `true`, `false` |

---

### External Integrations

#### `GITHUB_WEBHOOK_SECRET`

Secret for verifying GitHub webhook requests.

| Property | Value              |
| -------- | ------------------ |
| Required | No                 |
| Use Case | CI/CD integrations |

```bash
# Generate webhook secret
openssl rand -hex 32
```

#### `ARGOS_TOKEN`

Token for Argos visual testing service.

| Property | Value                             |
| -------- | --------------------------------- |
| Required | No                                |
| Use Case | E2E visual regression testing     |
| Source   | [Argos-CI](https://argos-ci.com/) |

#### `BUILT_IN_FORGE_API_URL`

URL for custom Forge API integration.

| Property | Value                        |
| -------- | ---------------------------- |
| Required | No                           |
| Use Case | Internal service integration |

#### `BUILT_IN_FORGE_API_KEY`

API key for Forge service authentication.

| Property | Value |
| -------- | ----- |
| Required | No    |

#### `OWNER_OPEN_ID`

OpenID of the primary owner/admin user.

| Property | Value                    |
| -------- | ------------------------ |
| Required | No                       |
| Use Case | Special admin privileges |

---

## Environment-Specific Configurations

### Development

```bash
NODE_ENV=development
DATABASE_URL=mysql://root:password@localhost:3306/terp_dev
JWT_SECRET=dev_secret_at_least_32_characters_long
PORT=3000
```

### Staging

```bash
NODE_ENV=production
DATABASE_URL=mysql://user:pass@staging-db:3306/terp_staging
JWT_SECRET=<generate-unique-secret>
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
```

### Production

```bash
NODE_ENV=production
DATABASE_URL=mysql://user:pass@prod-db:3306/terp_production
JWT_SECRET=<generate-unique-secret>
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

---

## Security Best Practices

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Use different secrets per environment** - Dev, staging, production
3. **Generate strong secrets** - Use `openssl rand -base64 32`
4. **Rotate secrets periodically** - Especially after team changes
5. **Limit access** - Only necessary team members should have production secrets
6. **Use secret management** - Consider HashiCorp Vault or cloud provider secret managers
7. **Audit access** - Log who accesses production environment variables

---

## Troubleshooting

### Variable Not Found

```
Error: DATABASE_URL is not defined
```

**Check:**

1. Variable is set in current shell: `echo $DATABASE_URL`
2. `.env` file exists and contains the variable
3. Variable name is spelled correctly (case-sensitive)

### Invalid Connection String

```
Error: Invalid database URL format
```

**Check:**

1. URL follows format: `mysql://user:pass@host:port/db`
2. Password is URL-encoded if it contains special characters
3. Port number is correct (default: 3306)

### Clerk Authentication Failed

```
Error: Invalid Clerk key
```

**Check:**

1. Using correct environment keys (test vs live)
2. Keys are from the correct Clerk project
3. No extra whitespace in values

---

## Adding New Variables

When adding new environment variables:

1. Add to `.env.example` with documentation
2. Update this document
3. Set in all deployment environments
4. Handle missing values gracefully in code
