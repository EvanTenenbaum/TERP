## Description

<!-- Provide a clear description of what this PR does -->

## Related Issues

<!-- Link to related issues: Fixes #123, Relates to #456 -->

## Type of Change

- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that breaks existing functionality)
- [ ] 📝 Documentation update
- [ ] 🎨 Refactoring (no functional changes)
- [ ] ⚡️ Performance improvement
- [ ] 🧪 Test coverage improvement
- [ ] 🔒 Security fix

## QA Standards Checklist

**REQUIRED:** All items must be checked before merge.

### Security ✅

- [ ] No new `publicProcedure` for admin/financial endpoints
- [ ] No hardcoded credentials or secrets
- [ ] Proper authorization checks (user owns resources)
- [ ] Input validation with Zod schemas
- [ ] See: `CODE_QA_EXECUTIVE_SUMMARY.md` → Security Vulnerabilities

### Code Quality ✅

- [ ] No new `any` types (or justified with TODO comment)
- [ ] All files under 500 lines
- [ ] Error handling uses `TRPCError` (not generic `Error`)
- [ ] No N+1 query patterns
- [ ] Uses `logger` instead of `console.log`
- [ ] See: `CODE_QA_DETAILED_TECHNICAL_REPORT.md` → Code Quality

### Architecture ✅

- [ ] Follows 3-layer pattern: Router → Service → Repository
- [ ] Business logic in services (not routers)
- [ ] Database queries in repositories (not routers)
- [ ] See: `.claude/AGENT_ONBOARDING.md` → Architecture Patterns

### Performance ✅

- [ ] List endpoints have pagination
- [ ] Batch loading instead of N+1 queries
- [ ] Database queries optimized (no post-query filtering)
- [ ] Large components split (<500 lines)
- [ ] See: `CODE_QA_DETAILED_TECHNICAL_REPORT.md` → Performance

### Testing ✅

- [ ] Unit tests added for new routers/services
- [ ] Tests follow AAA pattern (Arrange-Act-Assert)
- [ ] Test coverage >80% for changed code
- [ ] E2E tests for critical user flows
- [ ] See: `CODE_QA_DETAILED_TECHNICAL_REPORT.md` → Test Coverage

### Documentation ✅

- [ ] JSDoc comments for public functions
- [ ] API endpoints documented in `API_Documentation.md`
- [ ] README updated if needed
- [ ] Migration guide if breaking changes

## Testing Performed

### Manual Testing

<!-- Describe how you tested these changes manually -->

### Automated Testing

```bash
# Run and paste results:
pnpm check          # TypeScript
pnpm test           # Unit tests
pnpm test:e2e       # E2E tests (if applicable)
```

**Test Results:**

- [ ] All tests pass ✅
- [ ] TypeScript compiles without errors ✅
- [ ] No new linting warnings ✅

## Performance Impact

<!-- Does this change impact performance? Provide before/after metrics if applicable -->

- Query time: Before **_ ms → After _** ms
- Bundle size: Before **_ KB → After _** KB
- Load time: Before **_ s → After _** s

## Screenshots / Videos

<!-- If UI changes, add screenshots or videos -->

## Staging Verification

- [ ] I have verified these changes on the staging environment: https://terp-staging-yicld.ondigitalocean.app

## Deployment Notes

<!-- Any special steps needed for deployment? Environment variables? Migrations? -->

### Environment Variables

<!-- List any new/changed environment variables -->

### Database Migrations

<!-- Are migrations needed? -->

- [ ] No migrations required
- [ ] Migrations included and tested

### Breaking Changes

<!-- List any breaking changes and migration steps -->

## Pre-Merge Checklist

**Reviewer:** Verify these before approving:

- [ ] Code follows `.claude/AGENT_ONBOARDING.md` standards
- [ ] No items from QA report are violated
- [ ] Pre-commit hooks pass
- [ ] CI/CD pipeline is green
- [ ] Documentation is complete

## Phase Context

<!-- Which QA phase does this relate to? -->

- [ ] Phase 1: Security Fixes
- [ ] Phase 2: Performance & Quality
- [ ] Phase 3: Technical Debt Cleanup
- [ ] Phase 4: Test Coverage
- [ ] Phase 5: Architecture Refactoring

**Reference:** See `CODE_QA_EXECUTIVE_SUMMARY.md` for phase details.

---

**📚 Required Reading Before Review:**

- `.claude/AGENT_ONBOARDING.md` - Standards and patterns
- `CODE_QA_EXECUTIVE_SUMMARY.md` - Critical issues to avoid
- Relevant section of `CODE_QA_DETAILED_TECHNICAL_REPORT.md` for your changes
