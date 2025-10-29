# Development Brief: [{ID}] {TITLE}

**Status**: {STATUS}
**Assigned**: Unassigned
**Created**: {CREATED}
**Target Completion**: {TARGET_DATE}

---

## Quick Context

**What**: {ONE_SENTENCE_DESCRIPTION}

**Why**: {BUSINESS_VALUE}

**Scope**: {SCOPE_DESCRIPTION}

---

## Instructions for Development Agent

### 1. Load Project Context

Read these files in order:

1. `[@bible]` → `/home/ubuntu/TERP/docs/DEVELOPMENT_PROTOCOLS.md`
   - THE BIBLE - all development rules and standards
   - Follow ALL protocols strictly

2. `[@context]` → `/home/ubuntu/TERP/docs/PROJECT_CONTEXT.md`
   - Overall project state and architecture

3. `[@codebase/architecture]` → `product-management/codebase/architecture.md`
   - System architecture overview

4. `[@module/{MODULE}]` → `product-management/codebase/modules/{MODULE}.md`
   - Specific module documentation

### 2. Load Feature Context

Read these files:

1. `./prd.md` - Full product requirements document
2. `./technical-spec.md` - Technical implementation details
3. `./dependencies.json` - Prerequisites and blockers

### 3. Implementation Checklist

- [ ] Review PRD and technical spec thoroughly
- [ ] Verify all dependencies are met
- [ ] Create detailed implementation plan
- [ ] Implement core functionality
- [ ] Add error handling
- [ ] Ensure mobile responsive design
- [ ] Follow design system patterns (shadcn/ui + Tailwind)
- [ ] Add TypeScript types (no `any`)
- [ ] Test all user flows
- [ ] Test edge cases
- [ ] Run QA checklist from [@bible]
- [ ] Update `progress.md` with final status
- [ ] Commit and push all changes
- [ ] Update `metadata.json` status to "completed"

### 4. Files to Modify

{FILES_TO_MODIFY}

### 5. Key Technical Considerations

{TECHNICAL_CONSIDERATIONS}

### 6. Definition of Done

**Acceptance Criteria** (from PRD):
{ACCEPTANCE_CRITERIA}

**Technical Requirements**:
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Follows design system patterns
- [ ] Mobile responsive (375px, 768px, 1440px)
- [ ] Proper error handling
- [ ] Loading states implemented
- [ ] Accessible (keyboard navigation, ARIA labels)

### 7. How to Update Progress

Edit `./progress.md` throughout development:

**What to include**:
- ✅ Completed tasks
- 🔄 Current work
- ⏳ Remaining tasks
- 🚧 Blockers or questions
- 📊 Estimated % complete
- 💡 Decisions made
- 📝 Commits made

**Update frequency**: After each significant milestone

### 8. Questions or Blockers?

If you encounter issues:

1. Document in `./progress.md` under "Blockers"
2. Update `metadata.json` status to "blocked"
3. Report to user with specific question
4. Include:
   - What you tried
   - What didn't work
   - What information you need

---

## Related Features

{RELATED_FEATURES}

---

## Related Code

{RELATED_CODE}

---

## Dependencies

**Depends On** (must be complete first):
{DEPENDS_ON}

**Blocks** (waiting on this):
{BLOCKS}

---

## Reference Guide

Use these references in communication:

- `[{ID}]` - This feature
- `[@bible]` - Development protocols
- `[@context]` - Project context
- `[@module/{MODULE}]` - Module documentation
- `[@file:path/to/file]` - Specific files
- `[OTHER-ID]` - Other features/bugs

See `product-management/_system/REFERENCE_SYSTEM.md` for full guide.

---

**Auto-generated**: {GENERATED_DATE}
**Last updated**: {UPDATED_DATE}
**Template version**: 1.0
