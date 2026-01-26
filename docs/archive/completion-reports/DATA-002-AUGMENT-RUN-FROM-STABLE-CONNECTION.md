# Running DATA-002-AUGMENT Scripts from Stable Connection

**Problem:** Scripts are timing out due to intermittent connection from external environment  
**Solution:** Run scripts from DigitalOcean App Platform job (stable connection to database)

---

## Option 1: DigitalOcean App Platform Job (Recommended)

### Setup

1. **Get the app ID:**

   ```bash
   doctl apps list
   # TERP app ID: 1fd40be5-b9af-4e71-ab1d-3af0864a7da4
   ```

2. **Deploy/update the job configuration:**

   ```bash
   doctl apps update 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --spec .do/app-augment-data-job.yaml
   ```

   This will add the `augment-data` job to your app. Wait for the update to complete.

3. **Run the job:**

   ```bash
   doctl apps create-job-run 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 augment-data
   ```

4. **Monitor the job:**

   ```bash
   # List job runs
   doctl apps list-job-runs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 augment-data

   # Get specific job run ID from above, then:
   doctl apps get-job-run 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 <job-run-id>
   ```

5. **View job logs:**

   ```bash
   # View logs for the job component
   doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type run --component augment-data

   # Or view all app logs and filter
   doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type run | grep augment
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

- Check app ID: `doctl apps list` (TERP app: `1fd40be5-b9af-4e71-ab1d-3af0864a7da4`)
- Verify job exists: `doctl apps list-jobs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4`
- Check job spec: `.do/app-augment-data-job.yaml`
- Ensure job was deployed: `doctl apps update 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --spec .do/app-augment-data-job.yaml`

### Script Errors

- Check logs: `doctl apps logs <app-id> --type run`
- Verify DATABASE_URL is set correctly
- Check database connection from job environment

### Connection Issues

- Jobs run from DigitalOcean infrastructure (stable connection)
- No firewall configuration needed
- Direct database access via internal network

---

## Quick Start (Easiest Method)

Use the convenience script:

```bash
./scripts/run-augmentation-via-do-job.sh
```

This script will:

1. Deploy the job configuration
2. Verify the job exists
3. Run the job
4. Show you how to monitor it

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
