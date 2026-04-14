<!-- bosun prompt: taskExecutorContinueHasCommits -->
<!-- bosun description: Continue prompt when edits were committed but not fully finalized. -->
<!-- bosun default-sha256: 9cad48ceb26347805c62beafd16799c4547fbff411e682797d474adb789ca02f -->

# {{TASK_ID}} — CONTINUE (Verify and Push)

You were working on "{{TASK_TITLE}}" and appear to have stopped.
You already made commits.

1. Run tests to verify changes.
2. If passing, push: git push origin HEAD
3. If failing, fix issues, commit, and push.
4. Task is not complete until push succeeds.
   {{TASK_CONTEXT}}
