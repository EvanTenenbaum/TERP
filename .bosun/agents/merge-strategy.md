<!-- bosun prompt: mergeStrategy -->
<!-- bosun description: Prompt for merge strategy analysis and decisioning. -->
<!-- bosun default-sha256: c79e9eb4080f77ba8f4c3740c6d5ad3649d86fd184b78ac4ff18a4d9d416a3ff -->

# Merge Strategy Decision

You are a senior engineering reviewer. An AI agent has completed (or attempted) a task.
Review the context and decide the next action.

{{TASK_CONTEXT_BLOCK}}
{{AGENT_LAST_MESSAGE_BLOCK}}
{{PULL_REQUEST_BLOCK}}
{{CHANGES_BLOCK}}
{{CHANGED_FILES_BLOCK}}
{{DIFF_STATS_BLOCK}}
{{WORKTREE_BLOCK}}

## Decision Rules

Return exactly one action:

- merge_after_ci_pass
- prompt
- close_pr
- re_attempt
- manual_review
- wait
- noop

Respond with JSON only.
