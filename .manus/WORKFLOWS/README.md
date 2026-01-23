## 🚨 MANDATORY: READ CLAUDE.md FIRST

> **BEFORE following these instructions or doing ANY work:**
>
> **You MUST first read `/CLAUDE.md`** in the repository root.
>
> CLAUDE.md is the **single source of truth** for all TERP development protocols. This document provides Manus workflow setup instructions but does NOT override CLAUDE.md.
>
> **If there are ANY conflicts between CLAUDE.md and this document, CLAUDE.md takes precedence.**

---

# GitHub Actions Workflows - Manual Setup Required

## Issue

GitHub is blocking automated workflow creation due to permissions. You need to manually add these workflow files to your repository.

## Instructions

1. **Create the `.github/workflows` directory** in your repository (if it doesn't exist):
   ```bash
   mkdir -p .github/workflows
   ```

2. **Copy the workflow files**:
   - Copy `pr.yml` from this directory to `.github/workflows/pr.yml`
   - Copy `merge.yml` from this directory to `.github/workflows/merge.yml`

3. **Commit and push**:
   ```bash
   git add .github/workflows/
   git commit -m "Add CI/CD workflows for Testing Suite"
   git push origin main
   ```

4. **Add GitHub Secret**:
   - Go to: `https://github.com/EvanTenenbaum/TERP/settings/secrets/actions`
   - Click "New repository secret"
   - Name: `ARGOS_TOKEN`
   - Value: `argos_34b2c3e186f4849c6c401d8964014a201a`
   - Click "Add secret"

## What These Workflows Do

### `pr.yml` - Pull Request Checks
- Runs on every PR to `main`
- Fast checks: linting, type checking, unit tests, light integration tests
- Duration: ~3-5 minutes
- Provides fast feedback to developers

### `merge.yml` - Main Branch CI/CD
- Runs on every merge to `main`
- Full test suite: integration tests, E2E tests, visual testing with Argos
- Quality gates: 80% coverage threshold
- Posts Argos link for visual review
- Duration: ~10-15 minutes

## Verification

After adding the workflows and secret:

1. Create a test PR
2. Verify the PR workflow runs successfully
3. Merge the PR
4. Verify the merge workflow runs successfully
5. Check that the Argos link is posted in the commit comments

## Troubleshooting

If workflows fail:
- Check that `ARGOS_TOKEN` is added to GitHub Secrets
- Verify that all dependencies are installed correctly
- Check the workflow logs for specific error messages
