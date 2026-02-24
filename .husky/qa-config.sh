#!/bin/bash
# Shared configuration for QA checks

# Regex for valid branch names
# Supports any prefix/slug format used by agents and developers:
#   - claude/FEAT-001-SESSION_ID          (Claude agent SDK)
#   - claude/BUG-20251119-001-SESSION_ID  (Claude ad-hoc)
#   - claude/[kebab-case]-[id]            (Claude generated)
#   - cursor/[description]-[hash]         (Cursor agent)
#   - codex/[description]-[date]          (Codex agent)
#   - manus/[description]-[date]          (Manus agent)
#   - agent/[TASK-ID]                     (Generic agent)
#   - feature/[description]               (Developer feature)
#   - feat/[description]                  (Developer feature)
#   - fix/[description]                   (Developer fix)
#   - docs/[description]                  (Documentation)
#   - chore/[description]                 (Maintenance)
#   - refactor/[description]              (Refactoring)
#   - test/[description]                  (Testing)
#   - [kebab-case-branch]                 (Flat branch names)
#
# Pattern: optional-prefix/rest  OR  flat-branch-name
# Blocks only clearly invalid names (spaces, special chars, etc.)
BRANCH_NAME_REGEX="^([a-zA-Z][a-zA-Z0-9_-]*/)?[a-zA-Z0-9][a-zA-Z0-9._/-]*$"
