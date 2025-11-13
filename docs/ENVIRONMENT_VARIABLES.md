# TERP Environment Variables Documentation

**Last Updated:** November 13, 2025  
**Version:** 1.0

## Overview

This document provides comprehensive documentation for all environment variables used in the TERP application. Environment variables are used to configure the application for different environments (development, production, testing) without changing the codebase.

## Quick Start

### Development Setup

1. Copy the example file:

   ```bash
   cp .env.example .env
   ```

2. Fill in required values in `.env`:

   ```bash
   DATABASE_URL=mysql://user:password@localhost:3306/terp
   JWT_SECRET=$(openssl rand -base64 32)
   ```

3. Start the application:
   ```bash
   pnpm dev
   ```

### Production Setup

In production, environment variables are managed through the DigitalOcean App Platform dashboard. Never commit `.env` files to version control.

## Required Variables

These variables **must** be set for the application to function.

### DATABASE_URL

**Type:** String (MySQL connection string)  
**Required:** Yes  
**Format:** `mysql://user:password@host:port/database`

MySQL database connection string. Must start with `mysql://` protocol.

**Examples:**

```bash
# Local development
DATABASE_URL=mysql://root:password@localhost:3306/terp

# DigitalOcean Managed Database
DATABASE_URL=mysql://doadmin:password@host.db.ondigitalocean.com:25060/defaultdb?ssl=true
```

**Validation:**

- Must start with `mysql://`
- Must include username, password, host, port, and database name

**Security:**

- Never commit this value to git
- Use strong passwords in production
- Enable SSL for remote connections

---

### JWT_SECRET

**Type:** String  
**Required:** Yes  
**Minimum Length:** 32 characters

Secret key used to sign and verify JWT authentication tokens.

**Generation:**

```bash
# Generate a secure random secret
openssl rand -base64 32
```

**Examples:**

```bash
JWT_SECRET=abc123xyz789def456ghi012jkl345mno678pqr901stu234vwx567
```

**Validation:**

- Must be at least 32 characters
- Cannot use default value in production
- Should be randomly generated

**Security:**

- Generate a new secret for each environment
- Never share secrets between environments
- Rotate regularly (every 90 days recommended)
- Never commit to version control

---

## Authentication Variables

### VITE_CLERK_PUBLISHABLE_KEY

**Type:** String  
**Required:** Optional (recommended for production)  
**Prefix:** `pk_test_` (test) or `pk_live_` (production)

Clerk publishable key for client-side authentication. This key is safe to expose in the browser.

**Where to Get:**

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application
3. Navigate to API Keys
4. Copy the Publishable Key

**\*Examples:**

```bash
# Test environment
VITE_CLERK_PUBLISHABLE_KEY=pk_test_<your_key_here>

# Production environment
VITE_CLERK_PUBLISHABLE_KEY=pk_live_<your_key_here>
```

**Note:** The `VITE_` prefix makes this variable available to the client-side code.

---

### CLERK_SECRET_KEY

**Type:** String  
**Required:** Optional (recommended for production)  
**Prefix:** `sk_test_` (test) or `sk_live_` (production)

Clerk secret key for server-side authentication. This key must be kept secret.

**Where to Get:**

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application
3. Navigate to API Keys
4. Copy the Secret Key

**\*\*Examples:**

```bash
# Test environment
CLERK_SECRET_KEY=sk_test_<your_secret_key_here>

# Production environment
CLERK_SECRET_KEY=sk_live_<your_secret_key_here>
```

**Security:**

- Never commit to version control
- Never expose in client-side code
- Rotate if compromised

---

## Application Configuration

### VITE_APP_TITLE

**Type:** String  
**Required:** No  
**Default:** `"TERP"`

Application title displayed in the browser tab and UI.

**Examples:**

```bash
VITE_APP_TITLE=TERP
VITE_APP_TITLE=TERP - Development
VITE_APP_TITLE=TERP - Staging
```

---

### VITE_APP_LOGO

**Type:** String (URL or path)  
**Required:** No  
**Default:** Empty (uses default logo)

URL or path to custom application logo.

**Examples:**

```bash
VITE_APP_LOGO=/logo.png
VITE_APP_LOGO=https://cdn.example.com/logo.png
```

---

### VITE_APP_ID

**Type:** String  
**Required:** No  
**Default:** `"terp-app"`

Unique identifier for the application instance.

**Examples:**

```bash
VITE_APP_ID=terp-app
VITE_APP_ID=terp-production
VITE_APP_ID=terp-staging
```

---

### NODE_ENV

**Type:** String  
**Required:** No  
**Default:** `"development"`  
**Valid Values:** `development`, `production`, `test`

Node.js environment mode. Affects logging, error handling, and optimizations.

**Examples:**

```bash
NODE_ENV=development  # Local development
NODE_ENV=production   # Production deployment
NODE_ENV=test         # Running tests
```

**Effects:**

- `development`: Verbose logging, detailed errors, no caching
- `production`: Minimal logging, sanitized errors, optimizations enabled
- `test`: Test-specific configurations

---

### PORT

**Type:** Number  
**Required:** No  
**Default:** `3000`  
**Valid Range:** 1-65535

Port number for the server to listen on.

**Examples:**

```bash
PORT=3000
PORT=8080
```

**Note:** In production (DigitalOcean), this is automatically set by the platform.

---

## Optional Services

### ARGOS_TOKEN

**Type:** String  
**Required:** No  
**Used For:** Visual regression testing

Argos CI token for visual testing in E2E tests.

**Where to Get:**

1. Go to [Argos CI](https://argos-ci.com/)
2. Create an account or sign in
3. Navigate to your project settings
4. Copy the API token

**Examples:**

```bash
ARGOS_TOKEN=argos_XXXXXXXXXXXXXXXX
```

**When Needed:**

- Only required if running visual regression tests
- Not needed for basic development
- Recommended for CI/CD pipelines

---

### SENTRY_DSN

**Type:** String (URL)  
**Required:** No (recommended for production)  
**Used For:** Error tracking and monitoring

Sentry Data Source Name for error tracking.

**Where to Get:**

1. Go to [Sentry.io](https://sentry.io/)
2. Create a project
3. Copy the DSN from project settings

**Examples:**

```bash
SENTRY_DSN=https://XXXXXXX@oXXXXXX.ingest.sentry.io/XXXXXX
```

**When Needed:**

- Highly recommended for production
- Optional for development
- Enables real-time error tracking and alerts

---

### GITHUB_WEBHOOK_SECRET

**Type:** String  
**Required:** No  
**Used For:** Verifying GitHub webhook requests

Secret used to verify GitHub webhook signatures.

**Where to Get:**

1. Go to your GitHub repository settings
2. Navigate to Webhooks
3. Create or edit a webhook
4. Set a secret value

**Examples:**

```bash
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
```

**When Needed:**

- Only if using GitHub webhooks for CI/CD
- Not needed for basic development

---

## Advanced Configuration

### BUILT_IN_FORGE_API_URL

**Type:** String (URL)  
**Required:** No  
**Used For:** Custom Forge API integration

URL for the built-in Forge API service.

**Examples:**

```bash
BUILT_IN_FORGE_API_URL=https://forge-api.example.com
```

---

### BUILT_IN_FORGE_API_KEY

**Type:** String  
**Required:** No  
**Used For:** Custom Forge API integration

API key for authenticating with the Forge API.

**Examples:**

```bash
BUILT_IN_FORGE_API_KEY=forge_api_key_here
```

**Security:**

- Never commit to version control
- Rotate regularly

---

### OWNER_OPEN_ID

**Type:** String  
**Required:** No  
**Used For:** Identifying the primary owner/admin user

OpenID of the primary owner or admin user.

**Examples:**

```bash
OWNER_OPEN_ID=user_abc123xyz789
```

---

## Feature Flags

### FEATURE_LIVE_CATALOG

**Type:** Boolean (string)  
**Required:** No  
**Default:** `"false"`  
**Valid Values:** `"true"`, `"false"`

Enables or disables the live catalog feature.

**Examples:**

```bash
FEATURE_LIVE_CATALOG=false  # Disabled
FEATURE_LIVE_CATALOG=true   # Enabled
```

---

## Environment-Specific Recommendations

### Development

**Required:**

- `DATABASE_URL` (local MySQL)
- `JWT_SECRET` (any 32+ char string)

**Optional:**

- `NODE_ENV=development`
- `PORT=3000`

**Not Needed:**

- `SENTRY_DSN`
- `CLERK_*` (unless testing auth)

---

### Production

**Required:**

- `DATABASE_URL` (managed database with SSL)
- `JWT_SECRET` (strong random secret)
- `NODE_ENV=production`

**Highly Recommended:**

- `SENTRY_DSN`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

**Optional:**

- `ARGOS_TOKEN` (if using visual testing)
- `GITHUB_WEBHOOK_SECRET` (if using webhooks)

---

## Security Best Practices

### 1. Never Commit Secrets

The `.env` file is in `.gitignore`. Never commit it to version control.

**Bad:**

```bash
git add .env  # ❌ NEVER DO THIS
```

**Good:**

```bash
git add .env.example  # ✅ Only commit the example
```

---

### 2. Use Strong Secrets

Generate random secrets using cryptographically secure methods.

**Good:**

```bash
openssl rand -base64 32
openssl rand -hex 32
```

**Bad:**

```bash
JWT_SECRET=password123  # ❌ Too weak
JWT_SECRET=my-secret    # ❌ Too short
```

---

### 3. Rotate Secrets Regularly

Change secrets periodically, especially:

- After team member changes
- After suspected compromise
- Every 90 days (recommended)

---

### 4. Use Different Secrets Per Environment

Never share secrets between development, staging, and production.

---

### 5. Limit Access

Only give production secrets to team members who need them.

---

## Validation

The application includes automatic environment variable validation at startup.

### Running Validation

Validation runs automatically when the server starts. To manually validate:

```typescript
import { validateEnvOrThrow } from "./server/_core/envValidator";

validateEnvOrThrow(); // Throws if validation fails
```

### Validation Rules

**Errors (will prevent startup):**

- Missing required variables
- Invalid DATABASE_URL format
- JWT_SECRET too short (<32 chars)
- Default JWT_SECRET in production

**Warnings (logged but don't prevent startup):**

- Invalid NODE_ENV value
- Invalid PORT value
- Missing recommended production variables (SENTRY_DSN)

---

## Troubleshooting

### Error: "DATABASE_URL is required"

**Solution:** Add `DATABASE_URL` to your `.env` file:

```bash
DATABASE_URL=mysql://user:password@localhost:3306/terp
```

---

### Error: "JWT_SECRET must be at least 32 characters"

**Solution:** Generate a longer secret:

```bash
openssl rand -base64 32
```

---

### Error: "DATABASE_URL must be a valid MySQL connection string"

**Solution:** Ensure your connection string starts with `mysql://`:

```bash
# ✅ Correct
DATABASE_URL=mysql://user:pass@host:3306/db

# ❌ Incorrect
DATABASE_URL=user:pass@host:3306/db
```

---

### Warning: "SENTRY_DSN is recommended for production"

**Solution:** Add Sentry DSN for production error tracking, or ignore if not using Sentry.

---

## Migration from Old .env Files

If you have existing `.env` files (`.env.backup`, `.env.local`, etc.), migrate to the new format:

1. Review old files for any custom variables
2. Copy needed values to new `.env` file
3. Delete old `.env.*` files (except `.env.example`)
4. Verify application starts correctly

---

## Support

For questions or issues with environment variables:

1. Check this documentation
2. Review `.env.example` for reference
3. Check validation errors at startup
4. Submit issues at [TERP GitHub](https://github.com/EvanTenenbaum/TERP)

---

## Changelog

### Version 1.0 (November 13, 2025)

- Initial comprehensive documentation
- Added validation rules
- Added security best practices
- Consolidated all environment variables
