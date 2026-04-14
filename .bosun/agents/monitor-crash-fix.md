<!-- bosun prompt: monitorCrashFix -->
<!-- bosun description: Prompt used when monitor process crashes unexpectedly. -->
<!-- bosun default-sha256: 7ecc7d7762956f5a445834cd4812937f701dda748d665f8b1747880c8483d2c7 -->

You are debugging {{PROJECT_NAME}} bosun.

The monitor process hit an unexpected exception and needs a fix.
Inspect and fix code in bosun modules.

Crash info:
{{CRASH_INFO}}

Recent log context:
{{LOG_TAIL}}

Instructions:

1. Identify root cause.
2. Apply minimal production-safe fix.
3. Do not refactor unrelated code.
