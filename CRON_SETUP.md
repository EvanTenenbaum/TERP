# CRON Job Setup Guide

## ✅ CRON_SECRET Configuration Complete

The `CRON_SECRET` environment variable has been successfully added to all Vercel environments.

**CRON_SECRET Value:**
```
e7059a21214c643ad4629406a22633c61b84c0457264223950c017107b4533bf
```

**⚠️ IMPORTANT:** Keep this secret secure. Anyone with this value can trigger your scheduled tasks.

---

## 📋 Available Cron Endpoints

### 1. Reservations Expiry
**Endpoint:** `GET /api/cron/reservations-expiry`  
**Purpose:** Expires old inventory reservations that haven't been shipped  
**Recommended Schedule:** Daily at midnight  
**Duration:** ~5-30 seconds depending on data volume

### 2. Profitability Calculation
**Endpoint:** `GET /api/cron/profitability-nightly`  
**Purpose:** Calculates product profitability metrics  
**Recommended Schedule:** Daily at 2 AM  
**Duration:** ~10-60 seconds depending on data volume

### 3. Replenishment Recommendations
**Endpoint:** `GET /api/cron/replenishment-nightly`  
**Purpose:** Generates inventory replenishment recommendations  
**Recommended Schedule:** Daily at 3 AM  
**Duration:** ~5-30 seconds depending on data volume

---

## 🔧 Setup Options

### Option 1: Vercel Cron (Recommended)

Create a `vercel.json` file in your repository:

```json
{
  "crons": [
    {
      "path": "/api/cron/reservations-expiry",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/profitability-nightly",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/replenishment-nightly",
      "schedule": "0 3 * * *"
    }
  ]
}
```

**Note:** Vercel Cron automatically includes the correct authentication headers.

**Cron Schedule Format:**
- `0 0 * * *` = Daily at midnight UTC
- `0 2 * * *` = Daily at 2 AM UTC
- `0 3 * * *` = Daily at 3 AM UTC

### Option 2: External Cron Service (cron-job.org, EasyCron, etc.)

Configure each job with:

**URL:** `https://terp.vercel.app/api/cron/[endpoint-name]`  
**Method:** GET  
**Headers:**
```
X-CRON-KEY: e7059a21214c643ad4629406a22633c61b84c0457264223950c017107b4533bf
```

**Example with curl:**
```bash
curl -H "X-CRON-KEY: e7059a21214c643ad4629406a22633c61b84c0457264223950c017107b4533bf" \
     https://terp.vercel.app/api/cron/reservations-expiry
```

### Option 3: GitHub Actions

Create `.github/workflows/cron-jobs.yml`:

```yaml
name: Scheduled Cron Jobs

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
    - cron: '0 3 * * *'  # Daily at 3 AM UTC

jobs:
  run-cron:
    runs-on: ubuntu-latest
    steps:
      - name: Expire Reservations
        if: github.event.schedule == '0 0 * * *'
        run: |
          curl -H "X-CRON-KEY: ${{ secrets.CRON_SECRET }}" \
               https://terp.vercel.app/api/cron/reservations-expiry
      
      - name: Calculate Profitability
        if: github.event.schedule == '0 2 * * *'
        run: |
          curl -H "X-CRON-KEY: ${{ secrets.CRON_SECRET }}" \
               https://terp.vercel.app/api/cron/profitability-nightly
      
      - name: Generate Replenishment
        if: github.event.schedule == '0 3 * * *'
        run: |
          curl -H "X-CRON-KEY: ${{ secrets.CRON_SECRET }}" \
               https://terp.vercel.app/api/cron/replenishment-nightly
```

**Setup:**
1. Go to GitHub → Your Repository → Settings → Secrets and variables → Actions
2. Add secret: `CRON_SECRET` with value `e7059a21214c643ad4629406a22633c61b84c0457264223950c017107b4533bf`
3. Commit the workflow file

---

## 🧪 Testing Cron Endpoints

### Test Locally
```bash
# Test reservations expiry
curl -H "X-CRON-KEY: e7059a21214c643ad4629406a22633c61b84c0457264223950c017107b4533bf" \
     https://terp.vercel.app/api/cron/reservations-expiry

# Expected response: {"ok": true, "expired": 0}
```

### Test Without Secret (Should Fail)
```bash
curl https://terp.vercel.app/api/cron/reservations-expiry

# Expected response: 403 Forbidden
```

### Test With Wrong Secret (Should Fail)
```bash
curl -H "X-CRON-KEY: wrong-secret" \
     https://terp.vercel.app/api/cron/reservations-expiry

# Expected response: 403 Forbidden
```

---

## 📊 Monitoring Cron Jobs

### Check Execution Logs

**Via Vercel Dashboard:**
1. Go to https://vercel.com/evan-tenenbaums-projects/terp
2. Click "Logs" tab
3. Filter by `/api/cron/`

**Via Vercel CLI:**
```bash
vercel logs https://terp.vercel.app --follow
```

### Expected Log Output

**Successful execution:**
```
GET /api/cron/reservations-expiry 200 in 234ms
{"ok": true, "expired": 3}
```

**Failed authentication:**
```
GET /api/cron/reservations-expiry 403 in 12ms
{"error": "Forbidden"}
```

---

## 🔐 Security Best Practices

1. **Never commit CRON_SECRET to git** - It's already in Vercel environment variables
2. **Rotate the secret periodically** - Update in Vercel and your cron service
3. **Monitor execution logs** - Watch for unauthorized access attempts
4. **Use HTTPS only** - Never send the secret over unencrypted connections
5. **Limit access** - Only share with services that need to trigger cron jobs

### Rotating the Secret

If you need to change the CRON_SECRET:

```bash
# Generate new secret
NEW_SECRET=$(openssl rand -hex 32)

# Update in Vercel
echo $NEW_SECRET | vercel env add CRON_SECRET production
echo $NEW_SECRET | vercel env add CRON_SECRET preview
echo $NEW_SECRET | vercel env add CRON_SECRET development

# Update in your cron service
# (Update the X-CRON-KEY header value)

# Redeploy
git commit --allow-empty -m "chore: rotate CRON_SECRET"
git push origin main
```

---

## 📈 Performance Considerations

- **Timeout:** Each cron endpoint has a 30-second timeout on Vercel
- **Concurrency:** Avoid running the same cron job multiple times simultaneously
- **Database Load:** Cron jobs may perform heavy database queries
- **Scheduling:** Stagger jobs to avoid database contention (midnight, 2 AM, 3 AM)

---

## ✅ Quick Start Checklist

- [x] CRON_SECRET added to Vercel (all environments)
- [x] Deployment triggered with new environment variable
- [ ] Choose cron scheduling method (Vercel Cron, external service, or GitHub Actions)
- [ ] Configure cron jobs with appropriate schedules
- [ ] Test each endpoint manually
- [ ] Monitor first few executions in Vercel logs
- [ ] Set up alerts for failed executions (optional)

---

## 🎯 Next Steps

1. **Choose your cron scheduling method** (Option 1: Vercel Cron is recommended)
2. **Test the endpoints** using the curl commands above
3. **Monitor the first few executions** to ensure they work correctly
4. **Set up alerting** if you want notifications for failures

---

## 📞 Support

If you encounter issues:

1. Check Vercel logs for error messages
2. Verify CRON_SECRET is set correctly: `vercel env ls | grep CRON_SECRET`
3. Test endpoints manually with curl
4. Check database connectivity and permissions

---

**Status:** ✅ CRON_SECRET configured and ready for use
