# Running DATA-002-AUGMENT Scripts from Stable Connection

**Problem:** Scripts are timing out due to intermittent connection from external environment  
**Solution:** Run scripts from DigitalOcean App Platform job (stable connection to database)

---

## Option 1: DigitalOcean App Platform Job (Recommended)

### Setup

1. **Deploy the job configuration:**
   ```bash
   doctl apps create --spec .do/app-augment-data-job.yaml
   ```
   
   Or update existing app:
   ```bash
   doctl apps update <app-id> --spec .do/app-augment-data-job.yaml
   ```

2. **Get the app ID:**
   ```bash
   doctl apps list
   ```

3. **Run the job:**
   ```bash
   doctl apps create-job-run <app-id> augment-data
   ```

4. **Monitor the job:**
   ```bash
   doctl apps list-job-runs <app-id> augment-data
   ```

5. **View job logs:**
   ```bash
   doctl apps logs <app-id> --type run --component augment-data
   ```

### Job Configuration

The job is defined in `.do/app-augment-data-job.yaml` and will:
- Run from within DigitalOcean infrastructure (stable connection)
- Execute all augmentation scripts in order
- Have direct access to the database (no firewall issues)
- Run as a one-time manual job

---

## Option 2: Run from Production Server (Alternative)

If you have SSH access to the production server:

```bash
# SSH into production server
ssh user@production-server

# Navigate to app directory
cd /path/to/terp

# Pull latest code
git pull origin main

# Install dependencies (if needed)
pnpm install

# Run augmentation scripts
pnpm augment:data
```

---

## Option 3: Run Individual Scripts

You can also run scripts individually:

```bash
# From DigitalOcean job or production server
pnpm augment:temporal      # Fix temporal coherence
pnpm augment:orders        # Augment orders
pnpm augment:inventory     # Augment inventory movements
pnpm augment:financial     # Augment financial chains
pnpm augment:clients       # Augment client relationships
pnpm augment:validate      # Validate data quality
```

---

## Option 4: Via DigitalOcean Console

1. Go to DigitalOcean App Platform dashboard
2. Select your TERP app
3. Go to "Jobs" tab
4. Click "Create Job" or select existing `augment-data` job
5. Click "Run" to execute manually
6. Monitor logs in real-time

---

## Verification

After running the job, verify results:

```bash
# Check job status
doctl apps list-job-runs <app-id> augment-data

# View logs
doctl apps logs <app-id> --type run --component augment-data

# Run validation
pnpm augment:validate
```

---

## Troubleshooting

### Job Fails to Start
- Check app ID: `doctl apps list`
- Verify job exists: `doctl apps list-jobs <app-id>`
- Check job spec: `.do/app-augment-data-job.yaml`

### Script Errors
- Check logs: `doctl apps logs <app-id> --type run`
- Verify DATABASE_URL is set correctly
- Check database connection from job environment

### Connection Issues
- Jobs run from DigitalOcean infrastructure (stable connection)
- No firewall configuration needed
- Direct database access via internal network

---

## Recommended Approach

**Use Option 1 (DigitalOcean Job)** because:
- ✅ Runs from stable infrastructure
- ✅ Direct database access (no firewall)
- ✅ Can be scheduled or run on-demand
- ✅ Logs are accessible via doctl
- ✅ No need for external IP whitelisting

---

**Created:** 2025-12-03  
**Last Updated:** 2025-12-03
