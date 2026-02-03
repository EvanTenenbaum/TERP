# INFRA-CICD-FIX: Fix CI/CD Pipeline Deployment Failure

**Repository:** https://github.com/EvanTenenbaum/TERP  
**Task ID:** INFRA-CICD-FIX  
**Priority:** P0 (CRITICAL)  
**Estimated Time:** 2-4 hours  
**Module:** CI/CD, Infrastructure

---

## 🎯 Context

**Problem:** GitHub Actions CI/CD is failing during dependency installation. Production deployment is blocked.

**Root Cause:** Likely pnpm lockfile inconsistency or registry issues.

**Success Criteria:**

- [ ] GitHub Actions CI/CD passes on main branch
- [ ] DigitalOcean deployment succeeds
- [ ] `pnpm check` passes with 0 TypeScript errors
- [ ] `pnpm test` passes with 400+ tests
- [ ] `pnpm build` succeeds

---

## Phase 1: Diagnosis (30 min)

### Step 1.1: Local Reproduction

```bash
pnpm install --frozen-lockfile 2>&1 | tee install.log
```

### Step 1.2: Analyze Error

Check install.log for:

- Registry connectivity issues
- Package version conflicts
- Lockfile corruption

---

## Phase 2: Fix Implementation (60 min)

### Step 2.1: Regenerate Lockfile (Recommended)

```bash
# Backup existing lockfile
cp pnpm-lock.yaml pnpm-lock.yaml.backup

# Remove and regenerate
rm pnpm-lock.yaml
pnpm install

# Verify
pnpm check        # MUST pass: 0 TypeScript errors
pnpm test         # MUST pass: 400+ tests
pnpm build        # MUST succeed
```

---

## Phase 3: SELF-RATING (MANDATORY)

### Rate Your Code: \_\_\_ / 10

**Question:** What specifically prevents you from rating this 9.5 or higher?

**Improvement Actions:**

Implement improvements to reach 9.5+.

---

## Phase 4: QA GATES (terp-qa Skill - 5 Lenses)

### L1: Static Analysis

```bash
pnpm check
pnpm lint
```

**Pass Criteria:**

- `pnpm check`: Exit code 0
- `pnpm lint`: No NEW lint errors

### L2: Unit/Integration Tests

```bash
pnpm test
```

**Pass Criteria:** 400+ tests passing

### L3: API & Database Verification

```bash
curl http://localhost:5000/api/health
# Expected: HTTP 200
```

### L4: Browser/E2E Verification

```bash
pnpm build
```

**Pass Criteria:** Build succeeds

### L5: Deployment Health

- Push to main
- Monitor deployment
- Verify health endpoint

---

## Phase 5: QA REPORT

Create: `docs/qa-reports/INFRA-CICD-FIX-QA-REPORT.md`

```markdown
## QA Report: INFRA-CICD-FIX

**Commit:** `[SHA]`  
**Verdict:** ✅ PASS / ⚠️ PASS WITH CONDITIONS / ❌ FAIL
```

---

## Phase 6: Deploy

```bash
git add pnpm-lock.yaml
git commit -m "fix(ci): regenerate lockfile to fix dependency resolution

QA Verification (terp-qa):
- L1 Static: pnpm check pass (0 errors)
- L2 Tests: 400+ tests passing
- L3 API: Health check verified
- L4 Build: Production build succeeds
- L5 Deploy: Deployment monitoring configured

QA Report: docs/qa-reports/INFRA-CICD-FIX-QA-REPORT.md"

git push origin main
```

**Rollback Plan:**

```bash
git revert HEAD
git push origin main
```
