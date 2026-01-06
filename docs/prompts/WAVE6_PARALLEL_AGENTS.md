# Wave 6: Maximum Parallel Execution

**Date**: January 6, 2026  
**Goal**: Complete as much roadmap work as safely possible in parallel  
**Estimated Duration**: 3-5 days with 5 parallel agents

---

## Parallelization Strategy

These 5 agents work on **completely independent** areas with no code overlap:

| Agent | Focus Area | Files Touched | Est. Hours |
|-------|------------|---------------|------------|
| 6A | QA Backlog Cleanup | QA_TASKS_BACKLOG.md, test files | 8-12h |
| 6B | Infrastructure & Monitoring | server/_core/, deployment/ | 16-24h |
| 6C | Code Cleanup & Quality | Various cleanup tasks | 12-16h |
| 6D | Feature Enhancements | New feature modules | 16-24h |
| 6E | Testing & Documentation | Test files, docs/ | 12-16h |

**Total Parallel Work**: 64-92 hours compressed into 3-5 days

---

## Agent 6A: QA Backlog Cleanup & Verification

### Mission
Verify and close out incorrectly documented QA tasks, investigate any real issues.

### Tasks

1. **Update QA_TASKS_BACKLOG.md** (30 min)
   - Mark QA-001 (Todo Lists) as COMPLETE - routes exist
   - Mark QA-002 (Accounting) as COMPLETE - full module exists
   - Mark QA-003 (COGS Settings) as COMPLETE - route exists
   - Mark QA-004 (Analytics) as COMPLETE - route exists

2. **Investigate QA-005: Data Access Issues** (4-8h)
   - Check if "No data found" is a real production issue
   - Verify database seeding is complete
   - Check user permissions and roles
   - Test API endpoints directly
   - Document findings

3. **Fix Dashboard Navigation Issues** (2-4h)
   - QA-006: Vendors button - verify route or remove button
   - QA-007: Purchase Orders button - verify route or remove button
   - QA-008: Batches button - verify route or remove button
   - QA-009: Strains button - verify route or remove button

### Files to Modify
- `docs/roadmaps/QA_TASKS_BACKLOG.md`
- `client/src/pages/DashboardPage.tsx` (if removing buttons)
- `client/src/App.tsx` (if adding routes)

### Success Criteria
- QA backlog accurately reflects actual system state
- All dashboard buttons either work or are removed
- QA-005 investigation documented with findings

### Prompt for Agent 6A
```
You are working on the TERP project. Clone the repo: gh repo clone EvanTenenbaum/TERP

Your mission is QA Backlog Cleanup:

1. FIRST, verify these modules actually exist by checking the codebase:
   - /todo route → client/src/pages/TodoListsPage.tsx
   - /accounting route → client/src/pages/accounting/
   - /settings/cogs route → client/src/pages/CogsSettingsPage.tsx
   - /analytics route → client/src/pages/AnalyticsPage.tsx

2. Update docs/roadmaps/QA_TASKS_BACKLOG.md:
   - Mark QA-001 through QA-004 as COMPLETE with note "Routes verified to exist in codebase"
   - Keep QA-005 as NOT STARTED (needs production investigation)

3. Check Dashboard buttons (client/src/pages/DashboardPage.tsx):
   - Find buttons for Vendors, Purchase Orders, Batches, Strains
   - Verify each has a working route in App.tsx
   - If route missing, either add it or remove the button

4. Run pnpm check to verify no TypeScript errors

5. Create PR with title "fix(qa): update QA backlog and fix dashboard navigation"

IMPORTANT: Do NOT modify any business logic. Only update documentation and fix broken navigation.
```

---

## Agent 6B: Infrastructure & Monitoring

### Mission
Implement critical infrastructure tasks for production reliability.

### Tasks

1. **ST-009: Datadog API Monitoring** (8-16h)
   - Install @datadog/browser-rum package
   - Create client-side RUM initialization
   - Add API response time tracking
   - Configure error tracking
   - Add to .env.example: VITE_DATADOG_CLIENT_TOKEN, VITE_DATADOG_APPLICATION_ID

2. **REL-002: Automated Database Backups** (4-8h)
   - Create backup script in scripts/backup-database.ts
   - Support S3 upload for backup storage
   - Add cron schedule configuration
   - Document backup/restore procedures

3. **INFRA-004: Deployment Monitoring** (4-6h)
   - Add health check endpoint /api/health
   - Include database connectivity check
   - Include memory usage check
   - Return version and uptime

### Files to Create/Modify
- `client/src/lib/datadog.ts` (new)
- `client/src/main.tsx` (add Datadog init)
- `scripts/backup-database.ts` (new)
- `server/routers/health.ts` (new or modify)
- `.env.example` (add new vars)

### Success Criteria
- Datadog RUM captures page loads and API calls
- Backup script can dump and upload to S3
- Health endpoint returns system status
- All TypeScript checks pass

### Prompt for Agent 6B
```
You are working on the TERP project. Clone the repo: gh repo clone EvanTenenbaum/TERP

Your mission is Infrastructure & Monitoring:

## Task 1: Datadog RUM (ST-009)
1. Install: pnpm add @datadog/browser-rum
2. Create client/src/lib/datadog.ts:
   - Initialize RUM with applicationId and clientToken from env
   - Track page views and user actions
   - Make initialization defensive (don't crash if vars missing)
3. Import and init in client/src/main.tsx (after Sentry, before React render)
4. Add to .env.example:
   - VITE_DATADOG_APPLICATION_ID=
   - VITE_DATADOG_CLIENT_TOKEN=
   - VITE_DATADOG_SITE=datadoghq.com

## Task 2: Database Backup Script (REL-002)
1. Create scripts/backup-database.ts:
   - Use mysqldump or pg_dump based on DATABASE_URL
   - Compress with gzip
   - Upload to S3 bucket (use AWS SDK)
   - Support --dry-run flag
2. Add to package.json scripts: "backup:db": "tsx scripts/backup-database.ts"
3. Add to .env.example:
   - BACKUP_S3_BUCKET=
   - BACKUP_S3_REGION=

## Task 3: Health Endpoint (INFRA-004)
1. Create or modify server/routers/health.ts:
   - GET /api/health returns JSON
   - Check database connectivity
   - Return: { status, version, uptime, database, memory }
2. Register in server/index.ts

Run pnpm check after each task. Create PR: "feat(infra): add Datadog RUM, backup script, and health endpoint"

IMPORTANT: All new features must be defensive - app should work even if env vars are missing.
```

---

## Agent 6C: Code Cleanup & Quality

### Mission
Remove deprecated code and improve codebase quality.

### Tasks

1. **CLEANUP-001: Remove LLM/AI Code** (4-6h)
   - Search for OpenAI, Anthropic, or AI-related imports
   - Remove unused AI integration code
   - Keep any legitimate ML/analytics code
   - Document what was removed

2. **ST-024: Remove Comments Feature** (2-4h)
   - Find and remove comments-related code if unused
   - Check database schema for comments table
   - Remove UI components if feature is deprecated

3. **QUAL-007: TODO Audit** (4-6h)
   - Find all TODO/FIXME/HACK comments
   - Create GitHub issues for legitimate TODOs
   - Remove stale or completed TODOs
   - Document remaining technical debt

4. **Fix @ts-nocheck Files** (2-4h)
   - Find files with @ts-nocheck
   - Fix TypeScript errors properly
   - Remove the @ts-nocheck directive

### Files to Modify
- Various files with AI/LLM code
- Comment-related components (if any)
- Files with TODO comments
- Files with @ts-nocheck

### Success Criteria
- No AI/LLM dependencies remain (unless needed)
- Comments feature removed (if deprecated)
- TODO count reduced by 50%+
- No @ts-nocheck in codebase
- pnpm check passes

### Prompt for Agent 6C
```
You are working on the TERP project. Clone the repo: gh repo clone EvanTenenbaum/TERP

Your mission is Code Cleanup & Quality:

## Task 1: Remove LLM/AI Code (CLEANUP-001)
1. Search: grep -rn "openai\|anthropic\|gpt-\|claude" --include="*.ts" --include="*.tsx"
2. Review each match - is it actively used or deprecated?
3. Remove unused AI integration code
4. Remove unused dependencies from package.json
5. Document removals in commit message

## Task 2: TODO Audit (QUAL-007)
1. Find all TODOs: grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx"
2. For each TODO:
   - If completed: remove it
   - If stale (>6 months): remove it
   - If valid: leave it or create GitHub issue
3. Target: reduce TODO count by 50%

## Task 3: Fix @ts-nocheck Files
1. Find: grep -rln "@ts-nocheck" --include="*.ts" --include="*.tsx"
2. For each file:
   - Remove @ts-nocheck
   - Fix the TypeScript errors properly
   - If errors are complex, add specific @ts-ignore with explanation

Run pnpm check after each task. Create PR: "chore(cleanup): remove deprecated code and fix TypeScript"

IMPORTANT: Be conservative - if unsure whether code is used, leave it. Check for imports before removing.
```

---

## Agent 6D: Feature Enhancements

### Mission
Implement high-value feature enhancements from the roadmap.

### Tasks

1. **FEATURE-011: Unified Product Catalogue Foundation** (8-12h)
   - Create ProductCatalogue schema if not exists
   - Create catalogue management UI
   - Link products to strains/categories
   - Support bulk import

2. **QA-041: Merge Inbox and To-Do List Modules** (8-12h)
   - Analyze current Inbox and Todo implementations
   - Design unified task/message interface
   - Migrate data if needed
   - Update navigation

### Files to Create/Modify
- `shared/schema/productCatalogue.ts` (new or modify)
- `client/src/pages/ProductCataloguePage.tsx` (new)
- `server/routers/productCatalogue.ts` (new)
- Todo/Inbox related files

### Success Criteria
- Product catalogue CRUD works
- Inbox and Todo unified (or documented why not)
- All TypeScript checks pass
- UI is consistent with existing design

### Prompt for Agent 6D
```
You are working on the TERP project. Clone the repo: gh repo clone EvanTenenbaum/TERP

Your mission is Feature Enhancements:

## Task 1: Unified Product Catalogue (FEATURE-011)

1. Check if ProductCatalogue schema exists in shared/schema/
2. If not, create it with fields:
   - id, name, description, category, strainId (optional)
   - basePrice, unit, isActive, metadata
3. Create server/routers/productCatalogue.ts with CRUD operations
4. Create client/src/pages/ProductCataloguePage.tsx:
   - List view with search/filter
   - Create/Edit form in dialog
   - Use existing UI components (Card, Button, DataTable)
5. Add route in App.tsx: /products → ProductCataloguePage
6. Add navigation link in sidebar

## Task 2: Inbox/Todo Unification Analysis (QA-041)

1. Review current implementations:
   - client/src/pages/TodoListsPage.tsx
   - client/src/pages/InboxPage.tsx (if exists)
2. Document similarities and differences
3. If simple to merge:
   - Create unified TasksPage.tsx
   - Support both "inbox" and "todo" views
4. If complex:
   - Document why in PR description
   - Create follow-up task

Run pnpm check frequently. Create PR: "feat: add product catalogue and analyze inbox/todo unification"

IMPORTANT: Follow existing code patterns. Use shadcn/ui components. Check similar pages for reference.
```

---

## Agent 6E: Testing & Documentation

### Mission
Improve test coverage and documentation quality.

### Tasks

1. **Fix Skipped Tests** (6-8h)
   - Find all it.skip and describe.skip
   - Fix or remove skipped tests
   - Target: reduce skipped tests by 75%

2. **QA-026: Performance Testing** (4-6h)
   - Create performance test suite
   - Test API response times
   - Test page load times
   - Document baseline metrics

3. **Documentation Updates** (4-6h)
   - Update README with current setup instructions
   - Document all environment variables
   - Create deployment checklist
   - Update API documentation

### Files to Create/Modify
- Test files with .skip
- `tests/performance/` (new directory)
- `README.md`
- `docs/DEPLOYMENT.md`
- `docs/API.md`

### Success Criteria
- Skipped test count reduced by 75%
- Performance baseline documented
- README is accurate and complete
- Deployment docs exist

### Prompt for Agent 6E
```
You are working on the TERP project. Clone the repo: gh repo clone EvanTenenbaum/TERP

Your mission is Testing & Documentation:

## Task 1: Fix Skipped Tests
1. Find skipped tests: grep -rn "it.skip\|describe.skip\|test.skip" --include="*.test.ts" --include="*.spec.ts"
2. For each skipped test:
   - If test is valid but broken: fix it
   - If test is obsolete: remove it
   - If test needs major work: create GitHub issue and leave skip
3. Run pnpm test to verify fixes
4. Target: 75% reduction in skipped tests

## Task 2: Performance Testing (QA-026)
1. Create tests/performance/ directory
2. Create tests/performance/api-benchmarks.test.ts:
   - Test key API endpoints response times
   - Use supertest or similar
   - Assert response times < 500ms for reads, < 1000ms for writes
3. Create tests/performance/README.md documenting how to run

## Task 3: Documentation Updates
1. Update README.md:
   - Verify setup instructions work
   - Add all required environment variables
   - Add troubleshooting section
2. Create docs/DEPLOYMENT.md:
   - Pre-deployment checklist
   - Environment variable reference
   - Database migration steps
   - Rollback procedures

Run pnpm test after fixing tests. Create PR: "test(qa): fix skipped tests and add performance benchmarks"

IMPORTANT: Don't break existing passing tests. Run full test suite before PR.
```

---

## Execution Order

All 5 agents can start **simultaneously** as they touch different areas:

```
Time →
Agent 6A: [QA Backlog Cleanup        ] ████████████
Agent 6B: [Infrastructure & Monitoring] ████████████████████████
Agent 6C: [Code Cleanup & Quality     ] ████████████████
Agent 6D: [Feature Enhancements       ] ████████████████████████
Agent 6E: [Testing & Documentation    ] ████████████████
```

## Merge Order

1. **6A first** - Documentation only, no conflicts
2. **6E second** - Tests only, minimal conflicts
3. **6C third** - Cleanup, may affect other PRs
4. **6B fourth** - Infrastructure additions
5. **6D last** - New features, most likely to need rebasing

## Post-Wave 6 Checklist

After all PRs merged:
- [ ] Run full test suite: `pnpm test`
- [ ] Run TypeScript check: `pnpm check`
- [ ] Verify build: `pnpm build`
- [ ] Deploy to staging
- [ ] Smoke test all modified features
- [ ] Update MASTER_ROADMAP.md with completed tasks

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Merge conflicts | Merge in specified order, rebase as needed |
| Breaking changes | Each agent runs pnpm check before PR |
| Test failures | Agent 6E fixes tests first |
| Feature incomplete | Each task has clear acceptance criteria |

## Success Metrics

- [ ] 5 PRs created and merged
- [ ] 0 TypeScript errors
- [ ] Test pass rate improved
- [ ] TODO count reduced 50%+
- [ ] Skipped tests reduced 75%+
- [ ] Infrastructure monitoring enabled
- [ ] Documentation updated
