# INFRA-001: Remove Obsolete GitHub Workflows

**Repository:** https://github.com/EvanTenenbaum/TERP  
**Task ID:** INFRA-001  
**Priority:** P2 (Infrastructure)  
**Estimated Time:** 1-2 hours  
**Module:** `.github/workflows/`  
**Dependencies:** None

---

## 📋 Task Description

Remove 3 obsolete GitHub Actions workflows that are failing because they're designed for PR-based development, but the project now pushes directly to main. These workflows never trigger and clutter the workflow list with failed runs.

**Workflows to Remove:**

1. `.github/workflows/roadmap-validation.yml` - Validates roadmap on PRs (we don't use PRs)
2. `.github/workflows/pr-auto-fix.yml` - Auto-fixes PR issues (we don't use PRs)
3. `.github/workflows/pr.yml` - PR checks (we don't use PRs)

**Current Impact:**

- Workflow list shows failed runs
- Confusing when reviewing GitHub Actions
- No functional impact (they never trigger)

---

## 🚀 Execution Protocol

### Phase 1: Pre-Flight Check (5 minutes)

1. **Clone the repository:**

   ```bash
   git clone https://github.com/EvanTenenbaum/TERP.git
   cd TERP
   ```

2. **Check for conflicts:**

   ```bash
   cat docs/ACTIVE_SESSIONS.md
   ```

   If another agent is working on INFRA-001, STOP and coordinate.

3. **Create session file:**

   ```bash
   SESSION_ID="Session-$(date +%Y%m%d)-INFRA-001-$(openssl rand -hex 4)"
   cat > "docs/sessions/active/${SESSION_ID}.md" << 'EOF'
   # INFRA-001: Remove Obsolete GitHub Workflows

   **Agent:** [Your name/ID]
   **Started:** $(date +%Y-%m-%d)
   **Status:** In Progress

   ## Progress

   - [ ] Identified obsolete workflows
   - [ ] Removed workflow files
   - [ ] Verified remaining workflows still work
   - [ ] Roadmap updated

   ## Notes

   [Add notes here as you work]
   EOF
   ```

4. **Register session:**

   ```bash
   git pull origin main
   echo "- INFRA-001: ${SESSION_ID} ($(date +%Y-%m-%d))" >> docs/ACTIVE_SESSIONS.md
   git add docs/ACTIVE_SESSIONS.md docs/sessions/active/${SESSION_ID}.md
   git commit -m "Register session for INFRA-001"
   git push origin main
   ```

---

### Phase 2: Implementation (30 minutes)

1. **Verify workflows exist:**

   ```bash
   ls -la .github/workflows/ | grep -E "roadmap-validation|pr-auto-fix|pr.yml"
   ```

2. **Review workflow contents (optional):**

   ```bash
   cat .github/workflows/roadmap-validation.yml
   cat .github/workflows/pr-auto-fix.yml
   cat .github/workflows/pr.yml
   ```

3. **Remove the workflows:**

   ```bash
   git checkout -b infra-001-remove-obsolete-workflows
   git rm .github/workflows/roadmap-validation.yml
   git rm .github/workflows/pr-auto-fix.yml
   git rm .github/workflows/pr.yml
   ```

4. **Verify remaining workflows:**

   ```bash
   ls -la .github/workflows/
   ```

   Should still have:
   - `ci.yml` - Main CI/CD workflow
   - `deploy.yml` - Deployment workflow (if exists)
   - Other active workflows

5. **Commit changes:**

   ```bash
   git add -A
   git commit -m "Remove obsolete PR-based GitHub workflows

   - Removed roadmap-validation.yml (PR-only, we push to main)
   - Removed pr-auto-fix.yml (PR-only, we push to main)
   - Removed pr.yml (PR-only, we push to main)
   - These workflows were failing because we don't use PRs
   - No functional impact, cleanup only"
   ```

---

### Phase 3: Testing (15 minutes)

1. **Push to main:**

   ```bash
   git push origin infra-001-remove-obsolete-workflows:main
   ```

2. **Verify GitHub Actions:**
   - Go to https://github.com/EvanTenenbaum/TERP/actions
   - Verify the main CI workflow still runs
   - Verify no errors from the push
   - Verify the 3 removed workflows no longer appear

3. **Check for any references to removed workflows:**

   ```bash
   grep -r "roadmap-validation\|pr-auto-fix" docs/ README.md
   ```

   If any references found, remove them.

---

### Phase 4: Completion (10 minutes)

1. **Update roadmap:**

   Edit `docs/roadmaps/MASTER_ROADMAP.md` and find INFRA-001:

   **Change from:**

   ```markdown
   **Priority:** P2 | **Status:** Not Started | **Effort:** 1-2h
   ```

   **Change to:**

   ```markdown
   **Priority:** P2 | **Status:** ✅ Complete (2025-11-XX) | **Effort:** 1-2h

   **Resolution:** Removed 3 obsolete PR-based workflows (roadmap-validation.yml,
   pr-auto-fix.yml, pr.yml). These were failing because the project pushes directly
   to main instead of using PRs. No functional impact, cleanup only.
   ```

2. **Archive session:**

   ```bash
   mv docs/sessions/active/${SESSION_ID}.md docs/sessions/completed/
   ```

3. **Update ACTIVE_SESSIONS.md:**

   Remove your session entry.

4. **Commit and push:**

   ```bash
   git add -A
   git commit -m "Complete INFRA-001: Remove obsolete workflows

   - Removed 3 PR-based workflows
   - Roadmap updated
   - Session archived"
   git push origin main
   ```

---

## ✅ Success Criteria

- [ ] 3 workflow files removed from `.github/workflows/`
- [ ] Remaining workflows still function correctly
- [ ] No references to removed workflows in documentation
- [ ] GitHub Actions page shows no failed runs for removed workflows
- [ ] Roadmap updated to ✅ Complete
- [ ] Session archived

---

## 📚 Additional Resources

- **GitHub Actions Documentation:** https://docs.github.com/en/actions
- **Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`

---

**Generated:** 2025-11-14
