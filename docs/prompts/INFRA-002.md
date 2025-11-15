# INFRA-002: Add Session Cleanup Validation

**Repository:** https://github.com/EvanTenenbaum/TERP  
**Task ID:** INFRA-002  
**Priority:** P2 (Infrastructure)  
**Estimated Time:** 2-4 hours  
**Module:** `.husky/`, `scripts/`  
**Dependencies:** None

---

## 📋 Task Description

Add automated validation to prevent agents from leaving stale sessions in `docs/ACTIVE_SESSIONS.md` when tasks are marked complete. Currently, agents sometimes mark tasks complete in the roadmap but forget to archive their session and remove it from ACTIVE_SESSIONS.md, causing confusion.

**Problem Examples:**

- QA-010, QA-031, QA-037, QA-038 marked complete but sessions still in ACTIVE_SESSIONS.md
- QA-015 had duplicate sessions due to race condition

**Solution:**
Add a pre-commit hook that validates:

1. If a task is marked ✅ Complete in MASTER_ROADMAP.md, its session must NOT be in ACTIVE_SESSIONS.md
2. If a session is in ACTIVE_SESSIONS.md, the task must NOT be marked complete
3. No duplicate sessions for the same task

---

## 🚀 Execution Protocol

### Phase 1: Pre-Flight Check (5 minutes)

1. **Clone the repository:**

   ```bash
   git clone https://github.com/EvanTenenbaum/TERP.git
   cd TERP
   pnpm install
   ```

2. **Check for conflicts:**

   ```bash
   cat docs/ACTIVE_SESSIONS.md
   ```

3. **Create session file:**

   ```bash
   SESSION_ID="Session-$(date +%Y%m%d)-INFRA-002-$(openssl rand -hex 4)"
   cat > "docs/sessions/active/${SESSION_ID}.md" << 'EOF'
   # INFRA-002: Add Session Cleanup Validation

   **Agent:** [Your name/ID]
   **Started:** $(date +%Y-%m-%d)
   **Status:** In Progress

   ## Progress

   - [ ] Created validation script
   - [ ] Added pre-commit hook
   - [ ] Tested validation
   - [ ] Roadmap updated

   ## Notes

   [Add notes here as you work]
   EOF
   ```

4. **Register session:**

   ```bash
   git pull origin main
   echo "- INFRA-002: ${SESSION_ID} ($(date +%Y-%m-%d))" >> docs/ACTIVE_SESSIONS.md
   git add docs/ACTIVE_SESSIONS.md docs/sessions/active/${SESSION_ID}.md
   git commit -m "Register session for INFRA-002"
   git push origin main
   ```

---

### Phase 2: Implementation (2-3 hours)

1. **Create validation script:**

   ```bash
   cat > scripts/validate-session-cleanup.ts << 'EOF'
   #!/usr/bin/env tsx
   /**
    * Validate Session Cleanup
    *
    * Ensures that:
    * 1. Completed tasks don't have active sessions
    * 2. Active sessions don't have completed tasks
    * 3. No duplicate sessions for the same task
    */

   import fs from 'fs';
   import path from 'path';

   const ROADMAP_PATH = 'docs/roadmaps/MASTER_ROADMAP.md';
   const ACTIVE_SESSIONS_PATH = 'docs/ACTIVE_SESSIONS.md';

   interface ValidationError {
     type: 'stale_session' | 'duplicate_session' | 'completed_with_active_session';
     taskId: string;
     message: string;
   }

   function extractCompletedTasks(roadmapContent: string): Set<string> {
     const completed = new Set<string>();
     const lines = roadmapContent.split('\n');

     for (const line of lines) {
       // Match: **Status:** ✅ Complete
       if (line.includes('✅ Complete')) {
         // Look backwards for task ID (e.g., ### QA-001, ### ST-005, ### DATA-001)
         const taskMatch = line.match(/###\s+([A-Z]+-\d+)/);
         if (taskMatch) {
           completed.add(taskMatch[1]);
         }
       }
     }

     return completed;
   }

   function extractActiveSessions(activeSessionsContent: string): Map<string, string[]> {
     const sessions = new Map<string, string[]>();
     const lines = activeSessionsContent.split('\n');

     for (const line of lines) {
       // Match: - QA-001: Session-20251114-QA-001-abc123 (2025-11-14)
       const match = line.match(/^-\s+([A-Z]+-\d+):\s+(.+?)\s+\(/);
       if (match) {
         const taskId = match[1];
         const sessionId = match[2];

         if (!sessions.has(taskId)) {
           sessions.set(taskId, []);
         }
         sessions.get(taskId)!.push(sessionId);
       }
     }

     return sessions;
   }

   function validate(): ValidationError[] {
     const errors: ValidationError[] = [];

     // Read files
     const roadmapContent = fs.readFileSync(ROADMAP_PATH, 'utf-8');
     const activeSessionsContent = fs.readFileSync(ACTIVE_SESSIONS_PATH, 'utf-8');

     // Extract data
     const completedTasks = extractCompletedTasks(roadmapContent);
     const activeSessions = extractActiveSessions(activeSessionsContent);

     // Check for stale sessions (task complete but session still active)
     for (const taskId of completedTasks) {
       if (activeSessions.has(taskId)) {
         errors.push({
           type: 'stale_session',
           taskId,
           message: `Task ${taskId} is marked complete but still has active session(s): ${activeSessions.get(taskId)!.join(', ')}`
         });
       }
     }

     // Check for duplicate sessions
     for (const [taskId, sessions] of activeSessions.entries()) {
       if (sessions.length > 1) {
         errors.push({
           type: 'duplicate_session',
           taskId,
           message: `Task ${taskId} has ${sessions.length} active sessions: ${sessions.join(', ')}`
         });
       }
     }

     return errors;
   }

   function main() {
     console.log('🔍 Validating session cleanup...\n');

     const errors = validate();

     if (errors.length === 0) {
       console.log('✅ All sessions properly managed!');
       process.exit(0);
     }

     console.error('❌ Session cleanup validation failed:\n');

     for (const error of errors) {
       console.error(`  ${error.type}: ${error.message}`);
     }

     console.error('\n💡 To fix:');
     console.error('  1. Archive completed task sessions to docs/sessions/completed/');
     console.error('  2. Remove archived sessions from docs/ACTIVE_SESSIONS.md');
     console.error('  3. Resolve duplicate sessions (keep one, archive others)');

     process.exit(1);
   }

   main();
   EOF
   ```

2. **Make script executable:**

   ```bash
   chmod +x scripts/validate-session-cleanup.ts
   ```

3. **Test the validation script:**

   ```bash
   tsx scripts/validate-session-cleanup.ts
   ```

   This should catch any existing stale sessions.

4. **Add to pre-commit hook:**

   Edit `.husky/pre-commit` and add:

   ```bash
   # Add this line before the final exit
   echo "Validating session cleanup..."
   tsx scripts/validate-session-cleanup.ts || exit 1
   ```

5. **Update package.json scripts:**

   Add a new script for manual validation:

   ```json
   "validate:sessions": "tsx scripts/validate-session-cleanup.ts"
   ```

---

### Phase 3: Testing (30 minutes)

1. **Test the validation:**

   Create a test scenario:

   ```bash
   # Create a test branch
   git checkout -b test-session-validation

   # Simulate stale session: mark a task complete but leave session active
   # (Don't actually do this, just test the script catches it)

   # Run validation
   pnpm validate:sessions
   ```

2. **Test pre-commit hook:**

   ```bash
   # Make a small change
   echo "# Test" >> README.md
   git add README.md
   git commit -m "Test commit"

   # Should run session validation automatically
   ```

3. **Clean up test:**

   ```bash
   git checkout main
   git branch -D test-session-validation
   ```

---

### Phase 4: Completion (15 minutes)

1. **Create documentation:**

   ````bash
   cat > docs/SESSION_CLEANUP_VALIDATION.md << 'EOF'
   # Session Cleanup Validation

   ## Overview

   Automated validation ensures agents properly clean up their sessions when completing tasks.

   ## What It Checks

   1. **Stale Sessions:** Tasks marked ✅ Complete must not have active sessions
   2. **Duplicate Sessions:** Each task should have at most one active session
   3. **Consistency:** ACTIVE_SESSIONS.md and MASTER_ROADMAP.md must be in sync

   ## When It Runs

   - Automatically on every commit (pre-commit hook)
   - Manually via `pnpm validate:sessions`

   ## How to Fix Errors

   ### Stale Session
   ```bash
   # Archive the session
   mv docs/sessions/active/Session-YYYYMMDD-TASK-ID-*.md docs/sessions/completed/

   # Remove from ACTIVE_SESSIONS.md
   # Edit docs/ACTIVE_SESSIONS.md and delete the line for this task
   ````

   ### Duplicate Session

   ```bash
   # Keep the most recent session, archive others
   mv docs/sessions/active/Session-YYYYMMDD-TASK-ID-old.md docs/sessions/abandoned/

   # Remove duplicates from ACTIVE_SESSIONS.md
   # Edit docs/ACTIVE_SESSIONS.md and keep only one entry
   ```

   ## For Agents

   When completing a task, always:
   1. Mark task ✅ Complete in MASTER_ROADMAP.md
   2. Archive session to docs/sessions/completed/
   3. Remove session from ACTIVE_SESSIONS.md
   4. Commit all changes together

   The validation will catch it if you forget!
   EOF

   ```

   ```

2. **Update roadmap:**

   Edit `docs/roadmaps/MASTER_ROADMAP.md` and find INFRA-002:

   **Change to:**

   ```markdown
   **Priority:** P2 | **Status:** ✅ Complete (2025-11-XX) | **Effort:** 2-4h

   **Resolution:** Added automated session cleanup validation. Created validation
   script that checks for stale sessions (completed tasks with active sessions)
   and duplicate sessions. Added pre-commit hook to run validation automatically.
   See docs/SESSION_CLEANUP_VALIDATION.md for details.
   ```

3. **Archive session and commit:**

   ```bash
   mv docs/sessions/active/${SESSION_ID}.md docs/sessions/completed/
   # Remove from ACTIVE_SESSIONS.md
   git add -A
   git commit -m "Complete INFRA-002: Add session cleanup validation

   - Created validation script (scripts/validate-session-cleanup.ts)
   - Added pre-commit hook for automatic validation
   - Checks for stale sessions and duplicates
   - Added documentation
   - Roadmap updated
   - Session archived"
   git push origin main
   ```

---

## ✅ Success Criteria

- [ ] Validation script created and working
- [ ] Pre-commit hook runs validation automatically
- [ ] Script catches stale sessions
- [ ] Script catches duplicate sessions
- [ ] Documentation created
- [ ] Manual validation command available (`pnpm validate:sessions`)
- [ ] Roadmap updated to ✅ Complete
- [ ] Session archived

---

## 📚 Additional Resources

- **Husky Documentation:** https://typicode.github.io/husky/
- **Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`

---

**Generated:** 2025-11-14
