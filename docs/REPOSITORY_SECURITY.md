# TERP Repository Security

This document outlines the security policies and enforcement mechanisms for the TERP repository.

---

## Branch Protection

**The `main` branch is protected by the following rules:**

- **Require pull request before merging:** All changes must be made through a pull request.
- **Require approvals:** All pull requests must be approved by at least one `CODEOWNER` before they can be merged.
- **Require status checks to pass:** All pull requests must pass the `Roadmap Validation` GitHub Actions workflow.
- **Require branches to be up to date:** Branches must be up to date with `main` before merging.
- **Do not allow bypassing:** These rules cannot be bypassed, even by administrators.

**CRITICAL:** Branch protection on `main` must NEVER be disabled.

---

## CODEOWNERS

The `.github/CODEOWNERS` file specifies which users or teams are responsible for reviewing changes to different parts of the repository. Changes to the roadmap, prompts, or workflows will automatically request a review from the designated maintainers.

---

## GitHub Actions

The `roadmap-validation.yml` workflow automatically runs on every pull request that modifies the roadmap system. This workflow runs a series of validation scripts to ensure that all changes are consistent with the system's rules.

---

## Secret Scanning

This repository has GitHub's secret scanning feature enabled. This feature automatically scans for accidentally committed secrets (like API keys or other credentials) and alerts the repository administrators if any are found.

In addition, a custom `check-secrets.js` script is run as part of the `Roadmap Validation` workflow to scan for secrets in prompts.

---

## Malicious Code Prevention

To prevent malicious code from being injected into prompts, the `check-prompt-safety.js` script scans for dangerous commands (like `rm -rf` or `DROP DATABASE`) and will fail the build if any are found.

All changes are also subject to review by a `CODEOWNER` before being merged.
