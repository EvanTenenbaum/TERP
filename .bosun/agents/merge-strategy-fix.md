<!-- bosun prompt: mergeStrategyFix -->
<!-- bosun description: Prompt used when merge strategy decides to send a fix message. -->
<!-- bosun default-sha256: a3b182a81fbb5f938002a3fb8d09eecc4288d4a64e9c03c758221ffef380c6a8 -->

# Fix Required

{{TASK_CONTEXT_BLOCK}}

## Fix Instruction

{{FIX_MESSAGE}}

{{CI_STATUS_LINE}}

After fixing:

1. Run relevant checks.
2. Commit with clear message.
3. Push updates.
