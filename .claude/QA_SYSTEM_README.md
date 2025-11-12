# TERP Quality Assurance System

**Last Updated:** 2025-11-12
**Status:** Active enforcement since Sprint 1

## 🎯 Purpose

This QA system ensures all code contributions (from humans or AI agents) meet quality standards and don't reintroduce technical debt identified in the comprehensive CODE QA review.

## 📚 For New Agents: START HERE

### 1. **MANDATORY First Read** (5 min)
- `.claude/AGENT_ONBOARDING.md` - Critical rules and patterns

### 2. **Understand the Context** (10 min)
- `CODE_QA_EXECUTIVE_SUMMARY.md` - What's wrong and why
- Current Phase (check sprint board or ask)

### 3. **Task-Specific Reading** (5-15 min)
- Find your task type in `CODE_QA_DETAILED_TECHNICAL_REPORT.md`
- Read relevant phase (Phases 1-10)

**Total Onboarding Time:** 20-30 minutes

## 🔒 Enforcement Layers

### Layer 1: Pre-Commit Hooks (Automatic)
**File:** `.husky/pre-commit-qa-check.sh`

**Blocks commits with:**
- ❌ New `any` types
- ❌ Files over 500 lines
- ❌ Hardcoded credentials
- ⚠️ Warns about: console.log, N+1 queries, missing tests

**How to bypass (emergency only):**
```bash
git commit --no-verify  # Use sparingly!
```

### Layer 2: Pull Request Template (Manual)
**File:** `.github/PULL_REQUEST_TEMPLATE.md`

**Requires reviewer to verify:**
- Security checklist
- Code quality standards
- Architecture patterns
- Performance considerations
- Test coverage

### Layer 3: Issue Templates (Guidance)
**Files:** `.github/ISSUE_TEMPLATE/*.md`

**Provides structured approach for:**
- Security fixes
- Performance improvements
- Code cleanup
- Test coverage

### Layer 4: CI/CD Pipeline (Automatic)
**Files:** `.github/workflows/*.yml`

**Runs on every PR:**
- TypeScript type checking
- ESLint (code quality)
- Unit tests
- Build verification

## 📊 Quality Standards

### Security Standards (CRITICAL)
| Rule | Enforcement | Consequence |
|------|-------------|-------------|
| No `publicProcedure` for admin/financial endpoints | Pre-commit warning | PR rejected |
| No hardcoded credentials | Pre-commit blocked | PR rejected |
| Proper authorization checks | Manual review | PR rejected |
| Input validation with Zod | Manual review | PR feedback |

### Code Quality Standards (HIGH)
| Rule | Enforcement | Consequence |
|------|-------------|-------------|
| No new `any` types | Pre-commit blocked | Commit fails |
| Max 500 lines per file | Pre-commit blocked | Commit fails |
| Use TRPCError (not Error) | Manual review | PR feedback |
| Use logger (not console.log) | Pre-commit warning | PR feedback |

### Performance Standards (HIGH)
| Rule | Enforcement | Consequence |
|------|-------------|-------------|
| No N+1 queries | Pre-commit warning | PR feedback |
| List endpoints have pagination | Manual review | PR rejected |
| Batch database operations | Manual review | PR feedback |

### Test Standards (MEDIUM)
| Rule | Enforcement | Consequence |
|------|-------------|-------------|
| New routers have tests | Pre-commit warning | PR feedback |
| >80% coverage for new code | Manual review | PR feedback |
| Tests follow AAA pattern | Manual review | PR feedback |

## 🚨 Critical Violations (PR Auto-Reject)

These will be **automatically rejected** in code review:

1. ❌ Security vulnerabilities (unprotected endpoints, hardcoded secrets)
2. ❌ N+1 query patterns in production code
3. ❌ Files over 500 lines without splitting plan
4. ❌ New features without tests
5. ❌ Breaking changes without migration guide

## 🎯 Phase-Based Priorities

### Current Phase: **Phase 1 - Security Lockdown**
**Duration:** Week 1 (Nov 13-19, 2025)
**Goal:** Fix critical security vulnerabilities

**Allowed Work:**
- ✅ Security fixes from QA report
- ✅ Critical bug fixes
- ⚠️ New features (only if security standards met)

**Priority Issues:**
1. Fix admin endpoints (use `adminProcedure`)
2. Remove hardcoded credentials
3. Require JWT_SECRET (no defaults)
4. Protect user management endpoints
5. Add authorization checks

### Upcoming Phases

**Phase 2 (Weeks 2-4):** Performance & Quality
- Query optimization
- Frontend optimization
- Component splitting
- Type safety improvements

**Phase 3 (Weeks 5-7):** Technical Debt Cleanup
- Remove dead code
- Fix integrations
- Update documentation

**Phase 4 (Weeks 8-12):** Test Coverage
- Achieve 70% coverage
- Add E2E tests
- Fix skipped tests

**Phase 5 (Weeks 13-20):** Architecture
- Repository pattern
- Service layer consistency
- Monitoring & metrics

## 🛠️ How Agents Should Use This System

### Starting a New Task

```bash
# 1. Read onboarding (if first time)
cat .claude/AGENT_ONBOARDING.md

# 2. Check current phase
cat CODE_QA_EXECUTIVE_SUMMARY.md | grep "Current Phase"

# 3. Find your task in QA report
grep -A 20 "your-task-keywords" CODE_QA_DETAILED_TECHNICAL_REPORT.md

# 4. Verify pre-commit hooks are active
ls -la .git/hooks/pre-commit

# 5. Start coding
```

### During Development

```bash
# Run checks frequently
pnpm check        # TypeScript
pnpm test         # Unit tests

# Test pre-commit hooks
.husky/pre-commit-qa-check.sh
```

### Before Committing

```bash
# Verify your changes meet standards
git diff --cached

# Check file sizes
git diff --cached --name-only | xargs wc -l

# Look for 'any' types
git diff --cached | grep ": any"

# Run full checks
git commit  # Pre-commit hook will run automatically
```

### Creating Pull Request

1. Use PR template (auto-filled)
2. Check ALL boxes in QA Standards section
3. Fill in testing performed
4. Add screenshots/metrics if applicable
5. Link to related QA report section

## 📖 Reference Documentation

### Quick Links

**For Security Issues:**
- 📄 `CODE_QA_EXECUTIVE_SUMMARY.md` → Critical Findings #1
- 📄 `CODE_QA_DETAILED_TECHNICAL_REPORT.md` → Phase 7

**For Performance Issues:**
- 📄 `CODE_QA_DETAILED_TECHNICAL_REPORT.md` → Phase 10
- 📄 Examples: ordersEnhancedV2.ts (N+1), dashboard.ts (pagination)

**For Code Quality Issues:**
- 📄 `CODE_QA_DETAILED_TECHNICAL_REPORT.md` → Phase 5 (Backend), Phase 6 (Frontend)
- 📄 `.claude/AGENT_ONBOARDING.md` → Best Practices

**For Test Coverage:**
- 📄 `CODE_QA_DETAILED_TECHNICAL_REPORT.md` → Phase 8
- 📄 Examples: `server/routers/calendar.test.ts`

**For Architecture Questions:**
- 📄 `.claude/AGENT_ONBOARDING.md` → Architecture Patterns
- 📄 `CODE_QA_DETAILED_TECHNICAL_REPORT.md` → Phase 10

## 🔄 System Maintenance

### Updating the QA System

**When to update:**
- After completing each phase
- When patterns change
- After major refactoring
- When new standards are adopted

**What to update:**
1. `.claude/AGENT_ONBOARDING.md` - Standards and examples
2. `.husky/pre-commit-qa-check.sh` - Enforcement rules
3. `.github/PULL_REQUEST_TEMPLATE.md` - Checklist items
4. This README - Phase status

### Reviewing Effectiveness

**Monthly check:**
- Are PRs meeting standards?
- Are hooks catching issues?
- Are agents following guidelines?
- Do we need new rules?

**Metrics to track:**
- PR rejection rate
- Pre-commit hook blocks
- Time to onboard new agents
- Code quality trends

## ❓ FAQ

### Q: Can I skip the pre-commit hooks?
**A:** Only in emergencies (use `git commit --no-verify`). You must fix issues before PR approval.

### Q: What if I disagree with a rule?
**A:** Discuss in PR review. Rules can be updated if there's consensus.

### Q: How do I know which phase we're in?
**A:** Check README.md or ask the team. Phase info is in CODE_QA_EXECUTIVE_SUMMARY.md.

### Q: Can I add exceptions to the hooks?
**A:** Yes, edit `.husky/pre-commit-qa-check.sh`. Document why.

### Q: What if the QA report doesn't cover my case?
**A:** Ask in PR. Use best judgment based on similar patterns.

### Q: Are these rules permanent?
**A:** No. Rules evolve as the codebase improves and patterns change.

## 🎓 Success Metrics

**You're successfully using the system when:**

1. ✅ Your commits pass pre-commit hooks first try
2. ✅ Your PRs have all checklist items checked
3. ✅ You can cite relevant QA report sections
4. ✅ Your code follows established patterns
5. ✅ Reviewers approve without major changes

**Team success indicators:**
- 🎯 95%+ pre-commit hook pass rate
- 🎯 80%+ PR approval on first review
- 🎯 Decreasing technical debt over time
- 🎯 Faster PR review cycles

## 📞 Getting Help

### If you're stuck:
1. Check `.claude/AGENT_ONBOARDING.md` first
2. Search QA reports for similar issues
3. Look at good examples in codebase
4. Ask in PR comments (tag reviewer)

### If you find a bug in the system:
1. Create issue with label `qa-system`
2. Describe what's not working
3. Suggest improvement

---

**Remember:** This system exists to help you ship quality code faster, not to slow you down. The QA review identified real issues that cost time and money. These tools prevent them from coming back.

**Questions?** Read the docs. Still stuck? Ask for help. Want to improve the system? PRs welcome!

**Last Updated:** 2025-11-12
**Version:** 1.0
**Status:** ✅ Active
**Next Review:** After Phase 1 completion (Week 1)
