# CLEANUP-001: LLM/AI Code Removal

## Summary

This document records the removal of unused LLM/AI integration code from the TERP codebase as part of infrastructure cleanup task CLEANUP-001.

## Removed Files

The following files were removed because they contained unused AI functionality:

### 1. `server/_core/llm.ts`

**Purpose:** LLM (Large Language Model) invocation helper using a Forge API.

**Functions Removed:**
- `invokeLLM(params: InvokeParams)` - Generic LLM invocation function
- Various type definitions for messages, tools, and responses

**Reason for Removal:**
- No imports of `invokeLLM` found anywhere in the codebase
- Not used in any router, service, or component
- The Forge API integration for LLM was never utilized

### 2. `server/_core/imageGeneration.ts`

**Purpose:** Image generation helper using an internal ImageService.

**Functions Removed:**
- `generateImage(options: GenerateImageOptions)` - AI image generation function

**Reason for Removal:**
- No imports of `generateImage` found anywhere in the codebase
- Not used in any router, service, or component
- The image generation feature was never implemented

### 3. `server/_core/voiceTranscription.ts`

**Purpose:** Voice transcription helper using Whisper API.

**Functions Removed:**
- `transcribeAudio(options: TranscribeOptions)` - Audio transcription function
- Helper functions: `getFileExtension()`, `getLanguageName()`

**Reason for Removal:**
- No imports of `transcribeAudio` found anywhere in the codebase
- Not used in any router, service, or component
- The voice transcription feature was never implemented

## Preserved Configuration

The following related configuration was **preserved** because it's still used:

### `server/_core/env.ts`

The `forgeApiUrl` and `forgeApiKey` getters were preserved because they are actively used by:
- `server/storage.ts` - S3 storage integration
- `server/_core/dataApi.ts` - Data API integration
- `server/_core/notification.ts` - Push notifications

### Dependencies

The following npm dependencies were **preserved** because they are actively used:

- `@anthropic-ai/sdk` - Used by `tests-e2e/ai-agents/qa-agent.ts` for AI-powered E2E testing
- `@google/genai` - Used by swarm manager (`scripts/manager.ts`) for autonomous agent execution

## Verification

Before removal, the following verification was performed:

1. **Grep search for imports:** No active imports of the removed functions found
2. **Grep search for function calls:** No calls to `invokeLLM`, `generateImage`, or `transcribeAudio` found
3. **Dependency analysis:** Confirmed forge API config is still needed by storage, data API, and notifications

## Impact

- **No breaking changes:** These files were not imported or used
- **Reduced codebase size:** ~750 lines of unused code removed
- **Cleaner architecture:** Removed misleading code that suggested features not actually implemented

## Date

Completed: 2026-01-11

## Related Tasks

- INFRA-004: Deployment Monitoring Enforcement
- INFRA-007: Update Swarm Manager
- INFRA-012: Deploy TERP Commander Slack Bot
