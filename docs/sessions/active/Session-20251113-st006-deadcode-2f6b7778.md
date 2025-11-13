# Session: ST-006 Dead Code Removal

**Session ID:** $(cat /tmp/session_id.txt)
**Task:** ST-006 - Remove Dead Code
**Branch:** claude/st006-deadcode-Session-$(cat /tmp/session_id.txt)
**Started:** $(date '+%Y-%m-%d %H:%M %Z')
**Status:** 🟢 ACTIVE

## Task Summary
- Remove verified dead code: `server/cogsManagement.ts`
- Identify and remove 29 unused routers
- Verify no imports/dependencies before deletion
- Run all tests and type checks

## Progress Checklist

### Phase 1: Pre-Flight Check ✅
- [x] Cloned repository
- [x] Read AGENT_ONBOARDING.md
- [x] Checked ACTIVE_SESSIONS.md (no conflicts)
- [x] Read MASTER_ROADMAP.md ST-006 task details

### Phase 2: Session Startup 🔄
- [x] Created session file
- [ ] Created feature branch
- [ ] Updated ACTIVE_SESSIONS.md
- [ ] Updated MASTER_ROADMAP.md (mark in progress)
- [ ] Pushed initial changes

### Phase 3: Verification (Step 1 & 2)
- [ ] Verified cogsManagement.ts is unused
- [ ] Identified unused routers (compare routers.ts vs routers/ directory)
- [ ] Created deletion list for review

### Phase 4: Deletion & Testing
- [ ] User approval received for deletion list
- [ ] Deleted verified dead code
- [ ] Ran `pnpm check` (zero TypeScript errors)
- [ ] Ran `pnpm test` (all tests pass)
- [ ] Committed changes

### Phase 5: Documentation & Completion
- [ ] Created DEAD_CODE_REMOVAL_REPORT.md
- [ ] Updated MASTER_ROADMAP.md (mark complete)
- [ ] Merged to main
- [ ] Archived session file

## Status Updates

**$(date '+%Y-%m-%d %H:%M')** - Session started, pre-flight check complete, creating branch
