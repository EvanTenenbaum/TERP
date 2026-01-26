# Platform Comparison: DigitalOcean vs Railway vs Vercel

> ⚠️ **NOTE: TERP is deployed on DigitalOcean App Platform**
>
> We briefly migrated to Railway in December 2025 but have since migrated back to DigitalOcean.
> This analysis is kept for historical reference.
>
> **Current Platform**: DigitalOcean App Platform
> **Production URL**: https://terp-app-b9s35.ondigitalocean.app

---

**Date**: 2025-12-03  
**Context**: Historical analysis - evaluating platforms for TERP  
**Current State**: Production on DigitalOcean (as of 2025-12-16)

---

## Your Actual Pain Points (From History)

### 1. Environment Variable Hell 🔥

- **DATABASE_URL duplication** (happened multiple times)
- **Missing Vite variables** breaking builds
- **Clerk keys** not configured properly
- **JWT_SECRET** appearing/disappearing mysteriously
- **Type field issues** (`PLAIN` vs `SECRET` confusion)
- **Scope confusion** (`RUN_TIME` vs `RUN_AND_BUILD_TIME`)

### 2. Deployment Fragility 💔

- **App currently broken** on DO
- **Lockfile issues** (`ERR_PNPM_OUTDATED_LOCKFILE`)
- **Health check failures** (premature restarts)
- **Build failures** from missing env vars
- **5-10 minute deploys** to test each fix

### 3. Configuration Complexity 🤯

- **YAML configuration** (`.do/app.yaml`)
- **Manual env var management** via console
- **doctl CLI** required for everything
- **Managed database references** (`${terp-mysql-db.DATABASE_URL}`)
- **Multiple scopes and types** to remember

### 4. AI Agent Friction 🤖

- Agents need to understand DO-specific concepts
- `doctl` commands for everything
- Complex YAML syntax
- Env var updates require console access or API calls
- Deployment monitoring requires custom scripts

---

## Platform Deep Dive

## 1. Railway 🚂

### Environment Variable Management ⭐⭐⭐⭐⭐

**Why Railway Wins Here:**

```bash
# Setting env vars is DEAD SIMPLE
railway variables set DATABASE_URL="mysql://..."
railway variables set CLERK_SECRET_KEY="sk_..."

# Or in railway.json (committed to repo)
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE"
  }
}

# Env vars in Railway dashboard are:
# - Grouped by service
# - Searchable
# - Have change history
# - Can be templated (${DATABASE_URL})
# - Auto-suggest from other services
```

**No Scope Confusion:**

- Railway doesn't have `RUN_TIME` vs `RUN_AND_BUILD_TIME`
- All env vars available everywhere by default
- Can mark as "build-time only" if needed (rare)

**No Type Confusion:**

- No `SECRET` vs `PLAIN` types
- Everything is encrypted by default
- Visibility controlled by team permissions

**Database Connection:**

```bash
# Railway auto-provisions and connects
railway add mysql

# Automatically sets:
# - DATABASE_URL
# - MYSQL_URL
# - All connection details

# No manual ${reference} syntax needed
```

**AI Agent Friendly:**

```bash
# Simple CLI commands
railway up                    # Deploy
railway logs                  # View logs
railway variables             # List vars
railway variables set KEY=VAL # Set var
railway status                # Check status

# Or use Railway API (simpler than DO)
curl -H "Authorization: Bearer $TOKEN" \
  https://backboard.railway.app/graphql \
  -d '{"query": "mutation { variableUpsert(...) }"}'
```

### Deployment Speed ⭐⭐⭐⭐⭐

**Actual Times:**

- **Build**: 2-4 minutes (Nixpacks is fast)
- **Deploy**: 30 seconds
- **Total**: 2.5-4.5 minutes

**Why Faster:**

- Nixpacks auto-detects and optimizes
- Better caching (Docker layers + Nix store)
- Parallel builds
- Instant rollouts (no health check delays)

### Configuration Simplicity ⭐⭐⭐⭐⭐

**No YAML Required:**

```json
// railway.json (optional)
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "pnpm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100
  }
}
```

**Or Just Use Defaults:**

- Railway auto-detects Node.js
- Auto-detects pnpm
- Auto-runs build scripts
- Auto-starts with `pnpm start`

**No Configuration Needed for:**

- Port detection (auto)
- Build command (auto)
- Start command (auto)
- Health checks (optional)

### Preview Deployments ⭐⭐⭐⭐⭐

**Built-in PR Previews:**

```bash
# Automatic for every PR
# No configuration needed

# Each PR gets:
# - Unique URL: pr-123.up.railway.app
# - Isolated database (optional)
# - Full environment
# - Auto-deleted when PR closes
```

**Branch Deployments:**

```bash
# Deploy any branch
railway up --branch develop

# Gets its own URL
# develop.up.railway.app
```

### Cost ⭐⭐⭐⭐

**Pricing:**

- **Hobby Plan**: $5/month (includes $5 credit)
- **Usage-based**: $0.000231/GB-hour RAM, $0.000463/vCPU-hour
- **Typical app**: ~$10-15/month
- **Database**: Included in usage

**For Your Use Case:**

- Production: ~$15/month
- Development: ~$8/month
- **Total: ~$23/month** (vs $75 on DO)

### Problems with Railway ⭐⭐

**Cons:**

1. **Newer platform** - Less mature than DO
2. **No managed databases** - You run MySQL in a container
3. **Less control** - More opinionated (but that's also a pro)
4. **Smaller community** - Fewer tutorials/examples
5. **US-only regions** - No global edge (yet)

---

## 2. Vercel 🔺

### Environment Variable Management ⭐⭐⭐⭐

**Good UI:**

- Clean dashboard
- Environment-specific vars (Production/Preview/Development)
- Encrypted by default
- Can sync from `.env.local`

**But:**

- Still manual entry via dashboard
- No CLI for bulk updates
- No templating/references between vars

### Deployment Speed ⭐⭐⭐⭐⭐

**Blazing Fast:**

- **Build**: 1-3 minutes
- **Deploy**: Instant (edge deployment)
- **Total**: 1-3 minutes

**Why Fastest:**

- Optimized for Next.js/Vite
- Edge network deployment
- Incremental builds
- Smart caching

### Configuration Simplicity ⭐⭐⭐⭐⭐

**Zero Config for Vite:**

```json
// vercel.json (optional)
{
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

**Auto-detects Everything:**

- Framework (Vite)
- Build command
- Output directory
- Node version

### Preview Deployments ⭐⭐⭐⭐⭐

**Best in Class:**

- Every PR gets preview
- Every commit gets preview
- Unique URLs
- Comment on PR with link
- Auto-deleted

### Cost ⭐⭐⭐

**Pricing:**

- **Hobby**: Free (generous limits)
- **Pro**: $20/month per user
- **Bandwidth**: Can get expensive at scale

**For Your Use Case:**

- Production: Free (under limits)
- Development: Free
- **Total: $0-20/month**

### Problems with Vercel ⭐⭐

**Major Issues for You:**

1. **No Backend Support** ❌
   - Vercel is for **frontend + serverless functions**
   - Your tRPC server won't work well
   - No long-running processes
   - No WebSocket support
   - 10-second function timeout (Pro: 60s)

2. **No Database Hosting** ❌
   - Need external database (PlanetScale, Neon, etc.)
   - More services to manage
   - More env vars to configure

3. **Not Built for Full-Stack** ❌
   - Optimized for JAMstack
   - Your Express/tRPC server is a second-class citizen

**Verdict: Vercel is NOT suitable for TERP** (you have a real backend)

---

## 3. DigitalOcean (Current) 🌊

### Environment Variable Management ⭐⭐

**Problems You've Experienced:**

- Duplicate DATABASE_URL entries
- Scope confusion (RUN_TIME vs RUN_AND_BUILD_TIME)
- Type confusion (SECRET vs PLAIN)
- Manual console management
- No change history
- Complex YAML syntax
- Managed database references (`${db.URL}`)

**Pros:**

- Powerful (if you know what you're doing)
- Explicit control over scopes

**Cons:**

- Too complex for your use case
- Easy to misconfigure
- No validation until deploy fails

### Deployment Speed ⭐⭐⭐

**Actual Times:**

- **Build**: 5-8 minutes
- **Deploy**: 2-3 minutes
- **Total**: 7-11 minutes

**Why Slower:**

- Docker build (no caching optimization)
- Health check delays (90s initial delay)
- Conservative rollout

### Configuration Complexity ⭐⭐

**YAML Hell:**

```yaml
# .do/app.yaml - 200+ lines
# Must understand:
# - Scopes (RUN_TIME, BUILD_TIME, RUN_AND_BUILD_TIME)
# - Types (SECRET, PLAIN)
# - Managed references (${db.URL})
# - Health checks
# - Routes
# - Instance sizes
```

**Pros:**

- Very flexible
- Infrastructure as code

**Cons:**

- Overkill for your needs
- Easy to break
- Verbose

### Preview Deployments ⭐⭐⭐

**Possible but Manual:**

- Need to create separate apps
- Manual configuration
- No auto-cleanup
- Costs add up

### Cost ⭐⭐⭐

**Current:**

- Production: ~$50/month
- Would need: ~$75/month (with dev)

**Expensive for what you get**

### Problems with DigitalOcean ⭐⭐

**Your Actual Experience:**

1. ❌ App currently broken
2. ❌ Frequent env var issues
3. ❌ Complex configuration
4. ❌ Slow iteration (7-11 min deploys)
5. ❌ Manual env var management
6. ❌ No built-in preview deployments

---

## Head-to-Head Comparison

| Feature                | Railway               | DigitalOcean         | Vercel               |
| ---------------------- | --------------------- | -------------------- | -------------------- |
| **Env Var Management** | ⭐⭐⭐⭐⭐ Simple     | ⭐⭐ Complex         | ⭐⭐⭐⭐ Good        |
| **Deploy Speed**       | ⭐⭐⭐⭐⭐ 2-4 min    | ⭐⭐⭐ 7-11 min      | ⭐⭐⭐⭐⭐ 1-3 min   |
| **Configuration**      | ⭐⭐⭐⭐⭐ Auto       | ⭐⭐ YAML hell       | ⭐⭐⭐⭐⭐ Auto      |
| **Preview Deploys**    | ⭐⭐⭐⭐⭐ Built-in   | ⭐⭐⭐ Manual        | ⭐⭐⭐⭐⭐ Built-in  |
| **Backend Support**    | ⭐⭐⭐⭐⭐ Full       | ⭐⭐⭐⭐⭐ Full      | ⭐⭐ Serverless only |
| **Database**           | ⭐⭐⭐⭐ Container    | ⭐⭐⭐⭐⭐ Managed   | ❌ External          |
| **AI Agent Friendly**  | ⭐⭐⭐⭐⭐ Simple CLI | ⭐⭐⭐ Complex       | ⭐⭐⭐ OK            |
| **Cost**               | ⭐⭐⭐⭐ $23/mo       | ⭐⭐⭐ $75/mo        | ⭐⭐⭐⭐⭐ $0-20/mo  |
| **Maturity**           | ⭐⭐⭐ Newer          | ⭐⭐⭐⭐⭐ Mature    | ⭐⭐⭐⭐⭐ Mature    |
| **Reliability**        | ⭐⭐⭐⭐ Good         | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐⭐ Excellent |

---

## Recommendation: Railway 🚂

### Why Railway Solves Your Problems

#### 1. Environment Variables (Your #1 Pain Point)

**Railway:**

```bash
# Set vars in 3 ways:

# 1. CLI (AI agents love this)
railway variables set DATABASE_URL="mysql://..."
railway variables set CLERK_SECRET_KEY="sk_..."

# 2. Dashboard (you love this)
# - Clean UI
# - Search/filter
# - Change history
# - No scope/type confusion

# 3. Template variables (auto-magic)
# Railway auto-sets DATABASE_URL when you add MySQL
# No ${reference} syntax needed
```

**No More:**

- ❌ Duplicate DATABASE_URL
- ❌ Scope confusion
- ❌ Type confusion
- ❌ Missing Vite vars breaking builds
- ❌ Manual YAML editing

#### 2. Deployment Speed

**Railway: 2-4 minutes** (vs DO: 7-11 minutes)

**For 3 iterations:**

- Railway: 6-12 minutes
- DigitalOcean: 21-33 minutes
- **Savings: 15-21 minutes per session**

#### 3. Configuration Simplicity

**Railway:**

```bash
# Deploy your app
railway up

# That's it. Railway figures out:
# - It's a Node.js app
# - Uses pnpm
# - Needs to run `pnpm build`
# - Starts with `pnpm start`
# - Listens on port 3000
```

**No YAML. No configuration. It just works.**

#### 4. AI Agent Workflow

**Railway CLI is perfect for agents:**

```bash
# Deploy
railway up

# Set env var
railway variables set KEY=VALUE

# View logs
railway logs

# Check status
railway status

# Rollback
railway rollback

# That's the entire API surface
```

**Compare to DO:**

```bash
# Deploy
doctl apps create-deployment <app-id>

# Set env var
doctl apps spec get <app-id> > spec.json
# Edit spec.json manually
doctl apps update <app-id> --spec spec.json

# View logs
doctl apps logs <app-id> --type run --tail 100

# Check status
doctl apps get <app-id> --format Phase

# Rollback
# ... complex multi-step process
```

#### 5. Preview Deployments

**Railway:**

```bash
# Create dev environment
railway environment create development

# Deploy to dev
railway up --environment development

# Gets URL: development-terp.up.railway.app

# Deploy to prod
railway up --environment production

# Gets URL: terp.up.railway.app
```

**Automatic PR previews:**

- Every PR gets a preview
- Unique URL
- Isolated environment
- Auto-deleted when PR closes

#### 6. Database Management

**Railway:**

```bash
# Add MySQL
railway add mysql

# Railway automatically:
# - Provisions MySQL 8
# - Sets DATABASE_URL
# - Configures connection
# - Handles backups
# - Manages SSL

# No ${reference} syntax
# No scope configuration
# Just works
```

---

## Migration Plan: DO → Railway

### Phase 1: Setup Railway (30 minutes)

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Create project
railway init

# 4. Add MySQL
railway add mysql

# 5. Set env vars
railway variables set NODE_ENV=production
railway variables set CLERK_SECRET_KEY="sk_..."
railway variables set VITE_CLERK_PUBLISHABLE_KEY="pk_..."
# ... etc (Railway auto-sets DATABASE_URL)

# 6. Deploy
railway up

# Done! App is live
```

### Phase 2: Test Railway (1 hour)

```bash
# Deploy to Railway
railway up

# Test the app
# Open Railway-provided URL

# Check logs
railway logs

# Verify everything works
```

### Phase 3: Migrate Production (1 hour)

```bash
# 1. Export DO database
mysqldump -h do-host -u user -p defaultdb > backup.sql

# 2. Import to Railway
mysql -h railway-host -u user -p defaultdb < backup.sql

# 3. Update DNS
# Point domain to Railway

# 4. Monitor
railway logs --follow

# 5. Decommission DO (after verification)
```

### Phase 4: Setup Dev Environment (15 minutes)

```bash
# Create dev environment
railway environment create development

# Deploy develop branch to dev
git checkout develop
railway up --environment development

# Now you have:
# - production-terp.up.railway.app (main branch)
# - development-terp.up.railway.app (develop branch)
```

---

## Cost Comparison (Real Numbers)

### Current (DigitalOcean)

- Production app: $25/month
- Production DB: $25/month
- **Total: $50/month**

### With Dev (DigitalOcean)

- Production app: $25/month
- Production DB: $25/month
- Dev app: $12/month
- Dev DB: $13/month
- **Total: $75/month**

### Railway (Both Environments)

- Production app: ~$10/month
- Production DB: ~$5/month
- Dev app: ~$5/month
- Dev DB: ~$3/month
- **Total: ~$23/month**

**Savings: $52/month ($624/year)**

---

## Risks & Mitigation

### Risk 1: Railway is Newer

**Mitigation:**

- Keep DO as backup for 1 month
- Test thoroughly before full migration
- Railway has 99.9% uptime SLA

### Risk 2: Database Migration

**Mitigation:**

- Test migration on dev first
- Use mysqldump (standard tool)
- Railway supports MySQL 8 (same as DO)
- Can keep DO database initially, connect Railway to it

### Risk 3: Learning Curve

**Mitigation:**

- Railway is SIMPLER than DO
- Less to learn, not more
- Better docs
- Active Discord community

### Risk 4: Vendor Lock-in

**Mitigation:**

- Railway uses standard Docker
- Can export and run anywhere
- Easier to migrate FROM Railway than FROM DO

---

## The Honest Truth

### DigitalOcean is:

- ✅ Mature and reliable
- ✅ Powerful and flexible
- ❌ **Too complex for your needs**
- ❌ **Causing you constant env var issues**
- ❌ **Slow iteration (7-11 min deploys)**
- ❌ **Expensive ($75/mo with dev)**

### Railway is:

- ✅ **Simple (no YAML, no scope confusion)**
- ✅ **Fast (2-4 min deploys)**
- ✅ **Cheap ($23/mo with dev)**
- ✅ **AI agent friendly (simple CLI)**
- ✅ **Built-in preview deployments**
- ⚠️ Newer (but stable)
- ⚠️ Less control (but you don't need it)

### Vercel is:

- ❌ **Not suitable** (no backend support)

---

## My Recommendation

**Migrate to Railway for both production and development.**

### Why:

1. **Solves your #1 problem** (env var hell)
2. **2-3x faster deploys** (2-4 min vs 7-11 min)
3. **Saves $52/month** ($23 vs $75)
4. **Simpler for AI agents** (simple CLI)
5. **Built-in dev/prod environments**
6. **No configuration needed** (auto-detects everything)

### Timeline:

- **Setup**: 30 minutes
- **Testing**: 1 hour
- **Migration**: 1 hour
- **Total**: 2.5 hours

### ROI:

- **Time saved**: 15-20 min per development session
- **Money saved**: $624/year
- **Frustration saved**: Priceless

---

## Next Steps

### Option A: Full Migration (Recommended)

```bash
# 1. Setup Railway
npm i -g @railway/cli
railway login
railway init

# 2. Add database
railway add mysql

# 3. Set env vars
railway variables set NODE_ENV=production
# ... (Railway auto-sets DATABASE_URL)

# 4. Deploy
railway up

# 5. Test thoroughly

# 6. Migrate database

# 7. Update DNS

# 8. Decommission DO
```

### Option B: Railway for Dev, Keep DO for Prod

```bash
# 1. Setup Railway for dev only
railway init
railway environment create development

# 2. Deploy develop branch
git checkout develop
railway up --environment development

# 3. Test workflow

# 4. Migrate prod later if happy
```

### Option C: Stay on DO, Simplify Config

```bash
# 1. Simplify .do/app.yaml
# 2. Create better env var management scripts
# 3. Accept slower deploys
# 4. Pay $75/month for dev environment
```

---

## Conclusion

**Railway solves your actual problems:**

- ✅ No more env var hell
- ✅ Faster iteration
- ✅ Simpler configuration
- ✅ Cheaper
- ✅ Better for AI agents

**DigitalOcean is great, but it's overkill for your needs.** You're paying for complexity you don't need and fighting configuration issues that Railway eliminates entirely.

**Recommendation: Migrate to Railway.** You'll thank yourself every time you deploy.

---

**Want me to help with the migration?** I can:

1. Set up Railway project
2. Migrate env vars
3. Deploy and test
4. Update agent workflows
5. Migrate database
6. Update DNS

Just say the word. 🚀
