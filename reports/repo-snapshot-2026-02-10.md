# Repo Snapshot (2026-02-10)

- Generated: 2026-02-10T11:54:06-08:00
- Repo: /Users/evan/spec-erp-docker/TERP/TERP-codex-owner-dashboard
- Git: codex/owner-dashboard-reuse-20260210 @ 726d4de99dcb0cae0cc1b0cbffc27df26792e482

## Present Key Files

- `README.md`
- `Dockerfile`
- `package.json`

## Git Status (Porcelain)

```
 M client/public/version.json
 M client/src/components/dashboard/widgets-v2/AgingInventoryWidget.tsx
 M client/src/components/dashboard/widgets-v2/AvailableCashWidget.tsx
 M client/src/components/dashboard/widgets-v2/ClientDebtLeaderboard.tsx
 M client/src/components/dashboard/widgets-v2/InventorySnapshotWidget.tsx
 M client/src/components/dashboard/widgets-v2/MatchmakingOpportunitiesWidget.tsx
 M client/src/components/dashboard/widgets-v2/TotalDebtWidget.tsx
 M client/src/lib/constants/dashboardPresets.ts
 M client/src/pages/DashboardV3.tsx
 M client/version.json
 M docs/roadmaps/MASTER_ROADMAP.md
 M server/routers/dashboard.pagination.test.ts
 M server/routers/dashboard.ts
 M tests-e2e/workflows-dashboard.spec.ts
?? client/src/lib/constants/dashboardPresets.test.ts
?? docs/meeting-analysis/2026-01-29/homepage-mockups/mockup-4-widget-reuse-owner-center.html
?? docs/roadmaps/MEET_CUSTOMER_FEEDBACK_EXECUTION_SPEC_2026-02-10.md
?? docs/roadmaps/MEET_WIDGET_REUSE_EXECUTION_PLAN_2026-02-10.md
?? reports/
```

## Recent Commits (Last 40)

```
726d4de9 (HEAD -> codex/owner-dashboard-reuse-20260210, origin/main, origin/HEAD, main, codex/ter-118-media-fallback-20260210, codex/db-drift-guardrails-v2) fix(media): add demo-mode db fallback for uploadMedia
c6b9355e (claude/TER-118-20260209-889bcb0c) fix(inventory): map product_images status enum to existing DB column
a204ca0f (claude/TER-118-20260210-711a5ef1) fix(e2e): gate AI/oracle tests when env missing
585d0290 (origin/claude/TER-108-20260210-dae9cdb1, claude/TER-108-20260210-dae9cdb1) fix(types): satisfy tsc for batch media + intake
a0a5202b fix(media): markComplete preserves primary + sort order
8cc375db fix(media): keep partial intake uploads for cleanup
d2be362d test(intake): fix vitest mock hoisting
ed0a84ec feat(seed): add safe batch image seeder (dry-run default)
8b098ed6 feat(media): use batch primary image for VIP + catalog
5ab1c76a feat(media): add batch image show/hide + primary + reorder
5264e0b9 feat(intake): support photo upload in direct intake and intake grid
4fc458dd feat(intake): persist intake mediaUrls as batch images
155b3bc6 fix(photography): block completion without photos
c45157f5 (claude/TER-108-20260210-8ffa80ac) docs: Add consolidated master analysis document for customer interview
a31273f0 docs: Rewrite comprehensive interview analysis with exhaustive coverage
61c386b2 docs: Add comprehensive customer interview analysis with verbatim quotes
a3b7fc8d docs: clarify local-vs-cloud agent workspace instructions
6027e3e7 (codex/fix-main-deploy-20260209) fix: resolve App route JSX syntax error blocking build
972fa5d2 Merge pull request #406 from EvanTenenbaum/codex/qa-protocol-v4-preexisting-disposition
dd937e68 Merge pull request #407 from EvanTenenbaum/codex/live-qa-fixes-20260209
c3366253 Update client/src/App.tsx
d9eea116 Merge branch 'main' into codex/live-qa-fixes-20260209
00ae2363 fix: harden golden flow routes, filters, and e2e selectors
7074c16d (codex/qa-protocol-v4-preexisting-disposition) docs: add third-party QA protocol v4 with preexisting issue disposition
0756628c Merge pull request #405 from EvanTenenbaum/codex/add-terp-db-access-instructions
aa7a49ea docs: define default TERP DATABASE_URL for agents
79715885 docs: sync roadmap with Linear — PR #404 regression fixes in review, post-QA bugs resolved
9d823285 fix(ci): remove duplicate pnpm version from all workflows
009f8c48 feat: Add QA user seeder, fix direct intake route, and client error handling (#403)
b1263138 chore: update version.json from build
c615d86c fix(routing): update all /intake references to /direct-intake
4ddb4d95 feat: TERP beta final sprint — TER-92, TER-94, TER-95
82b0bcfe docs: sync roadmap with Linear — all phases complete, 4 open items remain
60d808e9 Merge claude/fix-ci-infrastructure-FgWRx: standardize CI to Node 22/pnpm 10.4.1, harden MySQL waits, fix test failures
d389bd5a fix(test): fix SampleManagement and SampleForm test failures
532fa7f2 fix(ci): align Dockerfile with CI versions and harden MySQL wait loops
74314494 fix(ci): standardize Node 22, pnpm 10.4.1, and action-setup v4 across all workflows
022c2891 (origin/pr-401, pr-401) Merge main into pr-401 to preserve PR-401 implementation
7e19432d Fix QA findings for PR 401 (RBAC, soft delete, AR consistency, GL status)
d5fed3ec docs: add PR description with runtime testing instructions
```

## Primary Roadmap Docs (If Present)

- `docs/roadmaps/MASTER_ROADMAP.md`
- `docs/ROADMAP_AGENT_GUIDE.md`

## Likely Roadmap/Backlog Files (By Filename)

- `PROJECT_CONTEXT.md`
- `live-test-plan.md`
- `docs/ROADMAP_AGENT_GUIDE.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/TERP_MONITORING_ROLLBACK_PLAN.md`
- `docs/LINEAR_ROADMAP_SYNC.md`
- `docs/jan-26-checkpoint/GOLDEN_FLOW_EXECUTION_PLAN.md`
- `docs/golden-flows/execution/GF-005-PICK-PACK-CONSOLIDATION-EXECUTION-PLAN.md`
- `docs/roadmaps/TERP-0012-execution-plan.md`
- `docs/roadmaps/THURSDAY_READY_PLAN.md`
- `docs/roadmaps/UNIFIED_STRATEGIC_ROADMAP_2026-01-12.md`
- `docs/roadmaps/PARALLEL_EXECUTION_PLAN_2026-01-30.md`
- `docs/roadmaps/DATABASE_REMEDIATION_ROADMAP.md`
- `docs/roadmaps/STRATEGIC_SPRINT_PLAN.md`
- `docs/roadmaps/BETA_EXECUTION_PLAN.md`
- `docs/roadmaps/GOLDEN_FLOW_EXECUTION_PLAN_v2_INTEGRATED.md`
- `docs/roadmaps/SCHEMA-016-execution-plan.md`
- `docs/roadmaps/GOLDEN_FLOW_EXECUTION_PLAN.md`
- `docs/roadmaps/GOLDEN-FLOWS-S1-BLOCKERS-EXECUTION-PLAN.md`
- `docs/roadmaps/PARALLEL_WAVE_EXECUTION_PLAN.md`
- `docs/roadmaps/QA_STRATEGIC_FIX_PLAN.md`
- `docs/roadmaps/STRATEGIC_COMPLETION_PLAN.md`
- `docs/roadmaps/OPEN_ITEMS_EXECUTION_PLAN.md`
- `docs/roadmaps/MASTER_ROADMAP.md`
- `docs/roadmaps/E2E_FIX_ROADMAP_2026-01-22.md`
- `docs/roadmaps/MVP_COMPLETION_EXECUTION_PLAN.md`
- `docs/roadmaps/QA_TASKS_BACKLOG.md`
- `docs/roadmaps/REL-sprint-execution-plan.md`
- `docs/roadmaps/REFACTORED_ROADMAP_SUMMARY_2026-02-03.md`
- `docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP_QA_REVIEW.md`
- `docs/roadmaps/WAVE_EXECUTION_PLAN_VIDEO_TESTING.md`
- `docs/roadmaps/PARALLEL_EXECUTION_ROADMAP_V2.md`
- `docs/roadmaps/LIFECYCLE_ROADMAP_Q1_2026.md`
- `docs/roadmaps/ADAPTIVE_EXECUTION_PLAN_2026-01-20.md`
- `docs/roadmaps/MEET_WIDGET_REUSE_EXECUTION_PLAN_2026-02-10.md`
- `docs/roadmaps/MVP_TYPESCRIPT_FIX_EXECUTION_PLAN.md`
- `docs/roadmaps/GF-PHASE4-002-execution-plan.md`
- `docs/roadmaps/EXECUTION_PLAN_COMPLETE.md`
- `docs/roadmaps/COMPLETE_EXECUTION_ROADMAP.md`
- `docs/roadmaps/MULTI_AGENT_EXECUTION_PLAN_V2.md`
- `docs/roadmaps/COMPLETE_EXECUTION_ROADMAP_V3.md`
- `docs/roadmaps/PARALLEL_SPRINT_PLAN.md`
- `docs/roadmaps/ROADMAP_ALIGNMENT_AUDIT.md`
- `docs/roadmaps/COMPLETE_MVP_EXECUTION_PLAN_2026-01-09.md`
- `docs/roadmaps/MASTER_ROADMAP_BACKUP_20260108.md`
- `docs/roadmaps/GF-PHASE4-003-execution-plan.md`
- `docs/roadmaps/PRIORITIZED_STRATEGIC_ROADMAP_2026-01-12.md`
- `docs/roadmaps/STRATEGIC_EXECUTION_PLAN_v2.md`
- `docs/roadmaps/STRATEGIC_EXECUTION_ROADMAP.md`
- `docs/roadmaps/TERP_STRATEGIC_ROADMAP_2026.md`

## Docs Directories (Top Level Listings)

### `docs/`

```
ABSTRACTION_LAYER_GUIDE.md
ACTIVE_SESSIONS.md
AGENT_MONITORING_GUIDE.md
AUTH_SETUP.md
AUTO_DEPLOY_HEAL_GUIDE.md
BUILD_STATUS_BRANCH_PROTOCOL.md
CHANGELOG.md
CLAUDE_WORKFLOW.md
CLERK_AUTHENTICATION.md
DATABASE_SCHEMA_SYNC.md
DATABASE_SETUP.md
DEPENDENCY_CLEANUP_RESULTS.md
DEPLOYMENT-VERIFICATION-CHECKLIST.md
DEPLOYMENT.md
DEPRECATION_NOTICE.md
DEVELOPMENT_PROTOCOLS.md
DEV_ENVIRONMENT_SETUP.md
DEV_QUICK_REFERENCE.md
DEV_WORKFLOW_DIAGRAM.md
DEV_WORKFLOW_QUICK_START.md
DIGITALOCEAN_API_TOKEN_ISSUE.md
DOCUMENTATION_MAP.md
ENVIRONMENT.md
ENVIRONMENT_VARIABLES.md
ERROR_HANDLING_GUIDE.md
FEEDBACK_ANALYSIS.md
HOW_TO_ABORT_TASK.md
HOW_TO_ADD_TASK.md
HOW_TO_DEPRECATE_TASK.md
HOW_TO_ROLLBACK.md
HOW_TO_TRIGGER_WORKFLOWS.md
INTEGRATION-AUDIT-REPORT.md
INTEGRATION_SUMMARY.md
LINEAR_ROADMAP_SYNC.md
LOGGING_ACCESS_GUIDE.md
MOBILE-WORKFLOW-GUIDE.md
MOBILE_RESPONSIVE_PATTERNS.md
MONITORING_SETUP.md
NATURAL_LANGUAGE_COMMANDS_GUIDE.md
PERF-002-COMPONENT-ANALYSIS.json
PERF-002-HIGH-VALUE-COMPONENTS.json
PERF-003-ENDPOINT-AUDIT.json
PREVIEW_DEPLOYMENTS.md
PROJECT_CONTEXT.md
QA-FEATURE-DATA-MAPPING.md
QA-REPORT-FEATURE-DATA-FLOWS.md
QA_VERIFICATION_SCHEMA_DRIFT_2025-12-10.md
QUICK_ITERATION_CHECKLIST.md
QUICK_REFERENCE.md
README.md
REPOSITORY_SECURITY.md
ROADMAP_AGENT_GUIDE.md
SECRETS_MANAGEMENT_FOR_AGENTS.md
SECRETS_STORAGE_GUIDE.md
SEED_SCRIPT_USAGE.md
SESSION_CLEANUP_VALIDATION.md
SETUP.md
STRATEGIC_SPRINT_PRESENTATION.md
TECHNICAL_DEBT.md
TECHNICAL_IMPLEMENTATION_DETAILS.md
TERP_AGENT_INSTRUCTIONS.md
TERP_DESIGN_SYSTEM.md
TERP_MONITORING_ROLLBACK_PLAN.md
TESTING-REPORT-20251118.md
VIP_PORTAL_VERIFICATION.md
WHAT_ACTUALLY_NEEDS_TO_BE_IN_GITHUB.md
adr
agent-prompts
agent_prompts
agents
analysis
api
architecture
archive
assets
audits
batch-status-transitions.md
beta
bugs
client-relationship.mmd
... (51 more)
```
