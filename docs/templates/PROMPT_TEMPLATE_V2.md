# {TASK_ID}: {TASK_TITLE}

**Priority:** {PRIORITY}  
**Effort:** {EFFORT}  
**Status:** {STATUS}

---

## Task Description

{DESCRIPTION}

---

## Execution Protocol

Follow the 4-phase protocol in `docs/ROADMAP_AGENT_GUIDE.md`:

### Phase 1: Pre-Flight Check

1. Clone repository: `git clone https://github.com/EvanTenenbaum/TERP.git`
2. Read roadmap: `docs/roadmaps/MASTER_ROADMAP.md` - find {TASK_ID}
3. Check for conflicts: `docs/ACTIVE_SESSIONS.md`
4. Create session file: `docs/sessions/active/Session-$(date +%Y%m%d)-{TASK_ID}-$(uuidgen | cut -d'-' -f1).md`
5. Register session atomically in `docs/ACTIVE_SESSIONS.md`

### Phase 2: Implementation

1. Create feature branch: `git checkout -b {task-id}-fix`
2. Implement the fix/feature
3. Write tests
4. Commit changes

### Phase 3: Testing

1. Run all tests: `pnpm test`
2. Manual testing
3. Verify fix resolves the issue

### Phase 4: Completion

1. **Update roadmap status to ✅ Complete:**
   - Edit `docs/roadmaps/MASTER_ROADMAP.md`
   - Change status from "Not Started" to "✅ Complete (YYYY-MM-DD)"
   - Add resolution summary
2. Archive session file to `docs/sessions/completed/`
3. Remove session from `docs/ACTIVE_SESSIONS.md`
4. **Push directly to main with merge conflict handling:**

   ```bash
   git push origin {task-id}-fix:main
   ```

   **If push fails (another agent pushed first):**

   ```bash
   # Pull with rebase to integrate their changes
   git pull --rebase origin main

   # If conflicts occur, resolve them:
   # 1. git status (see conflicting files)
   # 2. Edit files to resolve conflicts
   # 3. git add <resolved-files>
   # 4. git rebase --continue

   # Push again
   git push origin {task-id}-fix:main

   # If still fails, repeat pull-resolve-push up to 3 times
   # If rebase is too complex, create merge commit instead:
   git rebase --abort
   git pull origin main
   # Resolve conflicts
   git commit -m "Merge main into {task-id}-fix"
   git push origin {task-id}-fix:main
   ```

5. **DO NOT create a pull request**

---

## Success Criteria

- [ ] Issue resolved
- [ ] Tests passing
- [ ] Manual testing complete
- [ ] **Roadmap updated to ✅ Complete**
- [ ] Session archived
- [ ] **Pushed to main (no PR)**
- [ ] **Merge conflicts resolved if encountered**
