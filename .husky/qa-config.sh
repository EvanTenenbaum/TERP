#!/bin/bash
# Shared configuration for QA checks

# Regex for valid branch names
# Supports:
# - claude/FEAT-001-SESSION_ID
# - claude/BUG-20251119-001-SESSION_ID
BRANCH_NAME_REGEX=\"^claude/([A-Z]+)-([0-9]+|[0-9]{8}-[0-9]{3})-[0-9]{8}-[a-f0-9]{8}$\"
