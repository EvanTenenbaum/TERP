# Linear Roadmap Sync Protocol

**Purpose:** Keep the GitHub roadmap markdown file synchronized with Linear (the source of truth).

---

## When to Sync

The GitHub roadmap (`docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md`) should be synced whenever:

1. **Tasks are created, updated, or completed** in Linear
2. **Milestones are modified** (target dates, descriptions)
3. **Task priorities or statuses change**
4. **After completing a wave of work**
5. **Before major PRs or releases**

---

## How to Sync

### Automatic Sync (Recommended)

Run the sync script from the repository root:

```bash
python3 scripts/sync_linear_to_github_roadmap.py
```

This will:
- Query all tasks from the Linear project
- Group them by milestone and status
- Generate an updated markdown roadmap
- Write to `docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md`

### Manual Sync

If the script fails, you can manually update the roadmap by:

1. Opening the [Linear project](https://linear.app/terpcorp/project/terp-golden-flows-beta-1fd329c5978d)
2. Reviewing the current state of all milestones
3. Editing `docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md` to match
4. Updating the "Last Updated" timestamp

---

## After Syncing

**Always commit and push the updated roadmap:**

```bash
git add docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md
git commit -m "docs: sync roadmap from Linear"
git push origin main
```

---

## For TERP PM Agents

When completing a task or wave:

1. ✅ Update task status in Linear
2. ✅ Run sync script: `python3 scripts/sync_linear_to_github_roadmap.py`
3. ✅ Commit and push the updated roadmap
4. ✅ Mention the sync in your completion report

---

## Troubleshooting

### Script fails with "Module not found"

The script uses `manus-mcp-cli` which requires Linear MCP integration. If you don't have access:

- Ask a user with Linear access to run the sync
- Or manually update the roadmap based on Linear web UI

### Script times out

Linear has many tasks. The script paginates through all results. Be patient or increase the timeout.

### Roadmap looks wrong

1. Check the Linear project URL is correct in the script
2. Verify the milestone names match exactly
3. Re-run the script to regenerate from scratch

---

## Notes

- **Linear is always the source of truth**
- The GitHub roadmap is a **backup only**
- Agents should query Linear for current task status
- The GitHub roadmap is for human reference and version control
