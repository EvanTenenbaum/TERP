# ERPv3 Production Deployment Checklist

## Pre-Deployment

### 1. Database Setup (Neon PostgreSQL)
- [ ] Create production database on Neon
- [ ] Create staging branch for testing
- [ ] Note down connection strings (with `?sslmode=require`)
- [ ] Test connectivity from local machine

### 2. Object Storage Setup (S3/R2/MinIO)
- [ ] Create S3-compatible bucket (e.g., `erpv3-attachments`)
- [ ] Generate access keys (Access Key ID + Secret)
- [ ] Configure CORS if needed for direct uploads
- [ ] Test upload/download with AWS CLI or similar

### 3. Environment Variables
Prepare these values for Vercel:

#### Database
```
DATABASE_URL=postgresql://user:pass@host.neon.tech/erpv3?sslmode=require
```

#### Authentication
```
AUTH_JWT_SECRET=<generate-32+-char-random-string>
AUTH_COOKIE_NAME=auth_token
REQUIRE_AUTH=true
ALLOW_DEV_BYPASS=false
DEV_LOGIN_ENABLED=false
```

#### Object Storage
```
OBJECT_STORAGE_ENDPOINT=https://s3.us-west-2.amazonaws.com
OBJECT_STORAGE_BUCKET=erpv3-attachments
OBJECT_STORAGE_REGION=us-west-2
OBJECT_STORAGE_ACCESS_KEY=<your-access-key>
OBJECT_STORAGE_SECRET=<your-secret-key>
```

#### Optional
```
RATE_LIMIT_TOKENS=100
RATE_LIMIT_WINDOW_MS=60000
SENTRY_DSN=<if-using-sentry>
```

---

## Deployment Steps

### 1. Push to GitHub
```bash
cd /home/ubuntu/erpv3
git init
git add .
git commit -m "Initial ERPv3 production-ready release"
git branch -M main
git remote add origin https://github.com/EvanTenenbaum/TERP.git
git push -u origin main
```

### 2. Import to Vercel
- Go to https://vercel.com/new
- Import from GitHub: `EvanTenenbaum/TERP`
- Framework Preset: Next.js
- Root Directory: `./` (or specify if in subdirectory)

### 3. Configure Environment Variables in Vercel
- Go to Project Settings → Environment Variables
- Add all variables from section 3 above
- Apply to: Production, Preview, Development

### 4. Run Migrations (Before First Deploy)
Option A: From local machine
```bash
DATABASE_URL="<production-url>" npx prisma migrate deploy
DATABASE_URL="<production-url>" npx prisma generate
```

Option B: Via Vercel CLI
```bash
vercel env pull .env.production
npx prisma migrate deploy
```

### 5. Deploy
- Vercel will auto-deploy on push to main
- Or manually trigger: `vercel --prod`

### 6. Seed Database (Optional - Staging Only)
```bash
DATABASE_URL="<staging-url>" npm run seed
```

---

## Post-Deployment Validation

### 1. Health Checks
- [ ] Visit https://your-app.vercel.app
- [ ] Check `/login` page loads
- [ ] Verify redirect to login when accessing protected routes

### 2. Authentication Test
- [ ] Dev login disabled (should return 403)
- [ ] JWT auth working (if you have a test user)

### 3. API Endpoint Smoke Tests
Test these endpoints (requires auth token):
- [ ] `GET /api/products` - List products
- [ ] `GET /api/quotes` - List quotes
- [ ] `GET /api/inventory/export` - Export inventory CSV
- [ ] `GET /api/finance/ar/aging.csv` - AR aging report

### 4. RBAC Verification
- [ ] Unauthorized requests return 401
- [ ] Insufficient role returns 403
- [ ] Proper role grants access

### 5. Database Connectivity
- [ ] Queries execute successfully
- [ ] No connection pool errors
- [ ] SSL connection working

### 6. Object Storage
- [ ] File upload works
- [ ] File download works
- [ ] Signed URLs generated correctly

---

## Rollback Procedure

If deployment fails:

### 1. Immediate Rollback
- Vercel Dashboard → Deployments → Previous Deployment → Promote to Production

### 2. Database Rollback
- Neon Dashboard → Restore from snapshot/branch
- Update `DATABASE_URL` if needed

### 3. Investigate
- Check Vercel logs: `vercel logs`
- Check build logs in Vercel dashboard
- Review error messages

---

## Monitoring

### Post-Launch Monitoring
- [ ] Set up Vercel Analytics
- [ ] Configure error tracking (Sentry optional)
- [ ] Monitor database connections (Neon dashboard)
- [ ] Check S3 bucket usage and costs
- [ ] Set up uptime monitoring

### Key Metrics to Watch
- Response times (< 500ms for API routes)
- Error rates (< 1%)
- Database connection pool usage
- S3 bandwidth and storage costs

---

## Security Hardening

### Production Security
- [ ] `REQUIRE_AUTH=true` ✅
- [ ] `ALLOW_DEV_BYPASS=false` ✅
- [ ] `DEV_LOGIN_ENABLED=false` ✅
- [ ] Strong JWT secret (32+ chars) ✅
- [ ] Database SSL enabled ✅
- [ ] S3 bucket not publicly accessible ✅
- [ ] CORS configured properly ✅

### Regular Maintenance
- [ ] Rotate JWT secret quarterly
- [ ] Rotate S3 access keys quarterly
- [ ] Update dependencies monthly
- [ ] Review access logs weekly
- [ ] Database backups automated (Neon handles this)

---

## Troubleshooting

### Common Issues

**Build Fails**
- Check `npm run build` locally
- Verify all dependencies in `package.json`
- Ensure `@prisma/client` is in dependencies (not devDependencies)

**Database Connection Errors**
- Verify `DATABASE_URL` includes `?sslmode=require`
- Check Neon dashboard for connection limits
- Ensure IP allowlist includes Vercel IPs (or set to allow all)

**Auth Not Working**
- Verify `AUTH_JWT_SECRET` is set
- Check cookie settings (HttpOnly, Secure, SameSite)
- Ensure middleware is not excluded from routes

**File Upload Fails**
- Verify S3 credentials are correct
- Check bucket permissions
- Ensure CORS allows your domain
- Verify bucket region matches `OBJECT_STORAGE_REGION`

---

## Success Criteria

Deployment is successful when:
- ✅ Application loads without errors
- ✅ Authentication enforced on all protected routes
- ✅ Database queries execute successfully
- ✅ File uploads and downloads work
- ✅ All API endpoints return expected responses
- ✅ RBAC properly restricts access by role
- ✅ No console errors in browser
- ✅ Build completes in < 3 minutes
- ✅ Response times < 500ms

---

**Ready for Production Deployment!** 🚀
