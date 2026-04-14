<!-- bosun prompt: autofixFix -->
<!-- bosun description: Prompt used by crash autofix when structured error data is available. -->
<!-- bosun default-sha256: cdcaddf22c0530d98ec42e8d5e87c2240afb7c09477316db327c3e0d7ee0ae7e -->

You are a PowerShell expert fixing a crash in a running orchestrator script.

## Error

Type: {{ERROR_TYPE}}
File: {{ERROR_FILE}}
Line: {{ERROR_LINE}}
{{ERROR_COLUMN_LINE}}
Message: {{ERROR_MESSAGE}}
{{ERROR_CODE_LINE}}
Crash reason: {{CRASH_REASON}}

## Source context around line {{ERROR_LINE}}

```powershell
{{SOURCE_CONTEXT}}
```

{{RECENT_MESSAGES_CONTEXT}}

## Instructions

1. Read file {{ERROR_FILE}}.
2. Identify root cause.
3. Apply minimal safe fix only.
4. Preserve existing behavior.
5. Write fix directly in file.
