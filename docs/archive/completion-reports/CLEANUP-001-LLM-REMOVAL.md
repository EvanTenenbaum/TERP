# CLEANUP-001: LLM/AI Code Removal

## Summary

This document records the removal of unused LLM/AI integration code from the TERP codebase as part of infrastructure cleanup task CLEANUP-001.

## Round 1 Cleanup (2026-01-11)

### Removed Files

The following files were removed because they contained unused AI functionality:

#### 1. `server/_core/llm.ts`

**Purpose:** LLM (Large Language Model) invocation helper using a Forge API.

**Functions Removed:**

- `invokeLLM(params: InvokeParams)` - Generic LLM invocation function
- Various type definitions for messages, tools, and responses

**Reason for Removal:**

- No imports of `invokeLLM` found anywhere in the codebase
- Not used in any router, service, or component
- The Forge API integration for LLM was never utilized

#### 2. `server/_core/imageGeneration.ts`

**Purpose:** Image generation helper using an internal ImageService.

**Functions Removed:**

- `generateImage(options: GenerateImageOptions)` - AI image generation function

**Reason for Removal:**

- No imports of `generateImage` found anywhere in the codebase
- Not used in any router, service, or component
- The image generation feature was never implemented

#### 3. `server/_core/voiceTranscription.ts`

**Purpose:** Voice transcription helper using Whisper API.

**Functions Removed:**

- `transcribeAudio(options: TranscribeOptions)` - Audio transcription function
- Helper functions: `getFileExtension()`, `getLanguageName()`

**Reason for Removal:**

- No imports of `transcribeAudio` found anywhere in the codebase
- Not used in any router, service, or component
- The voice transcription feature was never implemented

### Preserved Configuration (Round 1)

The following related configuration was **preserved** because it's still used:

#### `server/_core/env.ts`

The `forgeApiUrl` and `forgeApiKey` getters were preserved because they are actively used by:

- `server/storage.ts` - S3 storage integration
- `server/_core/dataApi.ts` - Data API integration
- `server/_core/notification.ts` - Push notifications

#### Dependencies (Round 1)

The following npm dependencies were **preserved** because they are actively used:

- `@anthropic-ai/sdk` - Used by `tests-e2e/ai-agents/qa-agent.ts` for AI-powered E2E testing
- `@google/genai` - Used by swarm manager (`scripts/manager.ts`) for autonomous agent execution

**NOTE:** The `@google/genai` dependency was incorrectly identified as needed. See Round 2 cleanup below.

### Impact (Round 1)

- **No breaking changes:** These files were not imported or used
- **Reduced codebase size:** ~750 lines of unused code removed
- **Cleaner architecture:** Removed misleading code that suggested features not actually implemented

---

## Round 2 Cleanup (2026-01-14)

### Comprehensive AI/LLM Code Audit

A thorough search for all AI/LLM-related code was performed:

**Search Patterns Used:**

- "openai", "anthropic", "llm", "gpt", "embedding" (case-insensitive)
- `@anthropic-ai/sdk`, `@google/genai`, `@google/generative-ai`
- Files importing AI SDKs
- Environment variables: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`

### AI/LLM Code Found and Classification

#### ✅ ACTIVELY USED - PRODUCTION (PRESERVED)

##### 1. AI QA Testing Agent

- **Location:** `tests-e2e/ai-agents/`
- **Files:**
  - `qa-agent.ts` - Main AI agent using Anthropic Claude with vision
  - `types.ts`, `scenarios.ts`, `index.ts` - Supporting files
  - Test files in `tests-e2e/ai-generated/`
- **Workflow:** `.github/workflows/ai-qa-agent.yml`
- **Schedule:** Runs daily at 3:00 AM UTC
- **Dependency:** `@anthropic-ai/sdk` (v0.32.1)
- **Environment Variable:** `ANTHROPIC_API_KEY`
- **Purpose:** Automated browser-based QA testing using Claude's vision capabilities
- **Status:** ✅ **KEPT** - Active production QA automation

##### 2. Swarm Manager (Agent Orchestration)

- **Location:** `scripts/manager.ts`
- **Workflow:** `.github/workflows/swarm-auto-start.yml`
- **Trigger:** Manual (workflow_dispatch)
- **Dependency:** Uses `@google/generative-ai` (self-bootstrapped)
- **Environment Variable:** `GOOGLE_GEMINI_API_KEY`
- **Purpose:** Orchestrates parallel AI agents for development tasks
- **Roadmap:** Listed as INFRA-007 in MASTER_ROADMAP.md
- **Status:** ✅ **KEPT** - Actively maintained, manual workflow

#### ❌ UNUSED/EXPERIMENTAL - REMOVED

##### 3. Pre-Commit AI Review System

- **Location:** `scripts/pre-commit-review.ts`
- **Purpose:** AI-powered code review (senior engineer, security, edge case analysis)
- **Size:** 340+ lines
- **Dependency:** Self-bootstrapped `@google/generative-ai`
- **Reason for Removal:**
  - Not integrated into `.husky/pre-commit` hook
  - No evidence of use in CI/CD
  - Graceful degradation suggests experimental status
- **Status:** ❌ **REMOVED**

##### 4. Python AI Utility Scripts

- **Location:** `scripts/*.py`
- **Files Removed:**
  - `gemini-batch-memo.py` - React.memo addition using Gemini
  - `parallel-perf-agents.py` - Parallel task execution
  - `add-react-memo.py` - AI-assisted React.memo
  - `analyze-components-for-memo.py` - Component analysis
  - `analyze-schema-indexes.py` - Schema analysis
  - `generate-index-definitions.py` - Index generation
  - `audit-endpoints-pagination.py` - Endpoint auditing
  - `add-indexes-to-schema.py` - Schema modifications
  - `add-all-priority-indexes.py` - Priority index addition
  - `batch-add-memo.py` - Batch memoization
- **Purpose:** One-off development utilities for performance optimization
- **Reason for Removal:**
  - Not used in any CI/CD workflows
  - Appear to be completed one-off tasks (PERF-001, PERF-002, PERF-003)
  - Historical development tools no longer needed
- **Status:** ❌ **REMOVED** (10 files)

##### 5. Wrong Dependency in package.json

- **Issue:** `package.json` listed `@google/genai` (v1.34.0)
- **Reality:** Scripts that need Google's GenAI import from `@google/generative-ai` (different package!)
- **Current State:** Neither package installed in `node_modules/`
- **Why It Works:** Scripts use self-bootstrapping to install dependencies on-demand
- **Reason for Removal:**
  - Wrong package name (should be `@google/generative-ai`)
  - Not actually installed or used
  - Scripts handle their own dependency installation
- **Status:** ❌ **REMOVED** from package.json

#### 🔧 MISLEADING CODE - FIXED

##### 6. Slack Bot AI Comments

- **Location:** `scripts/slack-bot-ai.ts`
- **Issue:** Comments mentioned `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` (lines 18-19)
- **Reality:** Script doesn't import or use any AI SDKs - pure Node.js/Slack integration
- **Fix:** Removed misleading environment variable documentation
- **Status:** 🔧 **FIXED** - Removed confusing comments

### Files and Code Removed (Round 2)

1. **TypeScript:**
   - `scripts/pre-commit-review.ts` (~340 lines)

2. **Python Scripts:**
   - 10 files removed (~40KB of one-off utility code)

3. **Dependencies:**
   - Removed `@google/genai` from `package.json` (unused, wrong package)

4. **Documentation:**
   - Removed misleading AI environment variable comments from `scripts/slack-bot-ai.ts`

### AI/LLM Code Remaining (Active Use)

#### 1. Production Dependencies

- `@anthropic-ai/sdk` (v0.32.1) - AI QA testing agent
  - Required for: `tests-e2e/ai-agents/qa-agent.ts`
  - Used by: `.github/workflows/ai-qa-agent.yml`
  - Runs: Daily at 3:00 AM UTC

#### 2. Self-Bootstrapped Dependencies (Not in package.json)

- `@google/generative-ai` - Swarm manager
  - Required for: `scripts/manager.ts`
  - Used by: `.github/workflows/swarm-auto-start.yml`
  - Runs: Manual workflow_dispatch only
  - Note: Self-installs dependencies when executed

#### 3. Active AI/LLM Workflows

- `.github/workflows/ai-qa-agent.yml` - Daily automated QA
- `.github/workflows/swarm-auto-start.yml` - Manual agent orchestration

### Verification Process

**Round 2 verification included:**

1. **Comprehensive grep searches:**
   - All variations of AI/LLM keywords
   - SDK import patterns
   - Environment variable references

2. **Git history analysis:**
   - Commit history for AI-related files
   - Recent changes to determine active vs stale code
   - Workflow history to verify usage

3. **Dependency analysis:**
   - Checked actual installed packages in `node_modules/`
   - Verified import statements vs package.json
   - Identified self-bootstrapping patterns

4. **CI/CD integration checks:**
   - Searched workflows for AI script usage
   - Checked git hooks (`.husky/`) for integration
   - Verified scheduled vs manual triggers

5. **Active use verification:**
   - Checked MASTER_ROADMAP.md for references
   - Verified workflows are enabled
   - Confirmed recent commits/updates

### Impact Summary

#### Round 1 (2026-01-11)

- **Removed:** ~750 lines (3 unused server files)
- **Preserved:** 2 dependencies (1 incorrectly identified)

#### Round 2 (2026-01-14)

- **Removed:** ~650 lines (1 TypeScript file + 10 Python scripts)
- **Removed:** 1 unused dependency
- **Fixed:** Misleading documentation
- **Preserved:** 2 active AI systems (QA agent, Swarm manager)

#### Total Cleanup Impact

- **Total Removed:** ~1,400 lines of unused AI/LLM code
- **Files Removed:** 14 files (3 TS + 10 Python + 1 dependency)
- **Breaking Changes:** None - all removed code was unused
- **Production AI/LLM Code:** 2 systems actively maintained and used

### Active AI/LLM Features (What Remains)

#### 1. AI Browser QA Agent

- **Status:** Production - Scheduled daily
- **Purpose:** Autonomous UI testing using Claude's vision
- **Workflow:** Explores app, verifies functionality, creates GitHub issues
- **Value:** Automated regression testing, visual bug detection

#### 2. Swarm Manager

- **Status:** Active - Manual execution
- **Purpose:** Orchestrates parallel AI development agents
- **Workflow:** Executes roadmap tasks with AI assistance
- **Value:** Development velocity, parallel task execution

### Future Recommendations

1. **Monitor AI QA Agent:**
   - Review daily run results
   - Assess value vs API costs
   - Consider disabling if not providing value

2. **Swarm Manager Usage:**
   - Track actual usage frequency
   - Document success/failure rate
   - Consider removal if unused for 3+ months

3. **Dependency Management:**
   - Keep `@anthropic-ai/sdk` updated for QA agent
   - Monitor self-bootstrapped dependencies in swarm manager
   - Consider moving to package.json if used regularly

### Documentation Updated

- This file (`docs/CLEANUP-001-LLM-REMOVAL.md`) - Comprehensive audit results
- `docs/DEPENDENCY_AUDIT_REPORT.md` - Should reference this cleanup
- Environment variable documentation - Slack bot comments corrected

---

## Dates

- **Round 1 Completed:** 2026-01-11
- **Round 2 Completed:** 2026-01-14

## Related Tasks

- CLEANUP-001: Remove LLM/AI from Codebase
- INFRA-004: Deployment Monitoring Enforcement
- INFRA-007: Update Swarm Manager
- INFRA-012: Deploy TERP Commander Slack Bot
