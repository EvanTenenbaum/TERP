# TERP Master Development Prompt

**Version:** 1.0  
**Created:** October 25, 2025  
**Purpose:** Comprehensive prompt ensuring all protocols, best practices, and knowledge are followed in TERP development

---

## 🎯 Core Directive

You are continuing development on **TERP**, a modern ERP system with world-class UX/UI. You MUST follow all protocols, standards, and best practices defined in the project documentation. This is a production system requiring the highest quality standards.

---

## 📚 Required Reading (ALWAYS Start Here)

Before beginning ANY work, you MUST read these documents in order:

1. **`docs/DEVELOPMENT_PROTOCOLS.md`** (The Bible) - Core development protocols
2. **`docs/PROJECT_CONTEXT.md`** - Complete system overview and current status
3. **`docs/PARALLEL_DEVELOPMENT_PROTOCOL.md`** - Parallel development guidelines
4. **`CHANGELOG.md`** - Recent changes and implementation history
5. **`docs/NEXT_SESSION_PROMPT.md`** (if exists) - Specific continuation instructions
6. **Module-specific documentation** (e.g., `docs/SALES_SHEET_IMPLEMENTATION_STATUS.md`)

---

## 🔒 Mandatory Protocols (Non-Negotiable)

### 1. System Integration & Change Management

**ALWAYS follow this sequence for ANY change:**

#### Before Changes (Impact Analysis)
- ✅ Identify ALL affected files
- ✅ Map dependencies and imports
- ✅ Check for ripple effects across system
- ✅ Create comprehensive update checklist
- ✅ Verify no breaking changes (see Breaking Change Protocol)

#### During Changes (Integration Verification)
- ✅ Update ALL related files in a SINGLE operation
- ✅ Maintain consistency across components, types, routes, data
- ✅ Verify all imports/exports remain valid
- ✅ Preserve design system patterns (shadcn/ui + Tailwind)
- ✅ Update inline documentation and comments

#### After Changes (System-Wide Validation)
- ✅ Run `pnpm run check` (TypeScript validation - MUST be 0 errors)
- ✅ Test navigation flows (all links, routes)
- ✅ Verify data flows and UI rendering
- ✅ Check responsive behavior (mobile/tablet/desktop)
- ✅ Test in browser (not just compilation)

### 2. Production-Ready Code Standard

**ABSOLUTE REQUIREMENTS:**

❌ **NEVER use:**
- Placeholders (TODO, Coming Soon, To be implemented)
- Stub functions or pseudo-code
- Commented-out logic
- Mock data labeled as "temporary" without full implementation

✅ **ALWAYS implement:**
- Complete, functional, production-ready code
- Full end-to-end features
- Real interactions (even if simplified)
- Complete data flows
- Form validation and submission logic
- Graceful error handling
- Loading states for async operations

**Exception Protocol:**
If technical constraints genuinely require a stub:
1. 🚨 STOP immediately
2. Report: "INCOMPLETE IMPLEMENTATION ALERT"
3. Explain what is incomplete and why
4. Wait for user acknowledgment

### 3. Breaking Change Protocol

**STOP and report to user FIRST if change requires:**
- Refactoring >5 files
- Changing core data structures or schemas
- Restructuring routing/navigation
- Rebuilding major UI components
- Migrating libraries or frameworks
- Changing state management patterns
- Modifying API contracts
- Altering auth/authorization flows

**Report Format:**
```
🚨 BREAKING CHANGE ALERT

SCOPE: X files affected, Y components require refactoring
REASON: [Explain why major refactoring needed]
AFFECTED SYSTEMS: [List all affected areas]
RISK ASSESSMENT: [Potential issues]
RECOMMENDED APPROACH: [Step-by-step plan]
ESTIMATED EFFORT: [Time estimate]

AWAITING USER CONFIRMATION TO PROCEED
```

### 4. Context Documentation Updates (MANDATORY)

**After EVERY completed phase, you MUST:**

1. **Update `CHANGELOG.md`**
   - Add entry under `## [Unreleased]`
   - Document all changes (Added, Changed, Fixed, Removed)
   - Include file paths and feature descriptions
   - Note any dependencies added

2. **Update `docs/PROJECT_CONTEXT.md`**
   - Update "Last Updated" date
   - Add new module sections if applicable
   - Update "Current Status" section
   - Update navigation structure if routes added
   - Add new API endpoints to endpoint lists
   - Update database schema section if tables added

3. **Update Module-Specific Documentation**
   - Update implementation status documents
   - Mark completed phases with ✅
   - Document known limitations
   - Update API endpoint lists
   - Add usage examples if applicable

4. **Commit and Push to GitHub**
   - Stage all changes: `git add -A`
   - Commit with descriptive message
   - Push to main branch: `git push origin main`
   - Verify push succeeded

**Commit Message Format:**
```
feat: [Brief description of feature/phase]

- [Detailed change 1]
- [Detailed change 2]
- [Detailed change 3]
- Update CHANGELOG.md
- Update PROJECT_CONTEXT.md
- Update [module-specific docs]

Status: [Production Ready ✅ / In Progress ⏳]
TypeScript Errors: [count]
```

---

## 🚀 Parallel Development Protocol (Enhanced)

### When to Use Parallel Agents

**Use parallel agents when:**
- ✅ Task involves 5+ independent, similar operations
- ✅ Multiple distinct UI modules can be built simultaneously
- ✅ Backend is 100% complete and frozen
- ✅ Database schema is locked (no changes needed)
- ✅ Clear module boundaries exist
- ✅ Modules share same tRPC endpoints (no conflicts)
- ✅ No shared type definitions need to be created

**DO NOT use parallel agents when:**
- ❌ Backend or schema needs changes
- ❌ Modules have interdependencies
- ❌ Shared components need to be created
- ❌ Type definitions need to be established
- ❌ Complex integration required

### Pre-Parallelization Checklist

Before spawning parallel agents, MUST verify:

1. **Interface Contracts Locked**
   - ✅ All tRPC endpoints documented and tested
   - ✅ Request/response schemas defined
   - ✅ Error handling patterns established

2. **Database Schema Frozen**
   - ✅ All tables created and migrated
   - ✅ No schema changes needed
   - ✅ Type exports available from schema.ts

3. **Coding Standards Defined**
   - ✅ Design system documented (shadcn/ui patterns)
   - ✅ Component structure patterns established
   - ✅ Error handling patterns defined
   - ✅ Loading state patterns defined

4. **Module Boundaries Clear**
   - ✅ Each module has distinct pages/components
   - ✅ No file conflicts between modules
   - ✅ Navigation routes don't overlap

### Parallel Agent Specification Format

Create a master specification document before spawning:

```markdown
# [Feature] Parallel Implementation Specification

## Pre-Parallelization Verification
- [ ] Backend 100% complete
- [ ] Database schema frozen
- [ ] tRPC endpoints documented
- [ ] Design patterns established
- [ ] Module boundaries clear

## Module Breakdown

### Module A: [Name]
**Files to Create:**
- `client/src/pages/[PageName].tsx`
- `client/src/components/[component]/[ComponentName].tsx`

**tRPC Endpoints to Use:**
- `router.endpoint1`
- `router.endpoint2`

**Success Criteria:**
- [ ] All pages render without errors
- [ ] TypeScript validation passes (0 errors)
- [ ] Components follow design system
- [ ] Error handling implemented

### Module B: [Name]
[Same structure as Module A]

## Integration Plan
1. Review all module outputs
2. Merge files into main project
3. Add navigation routes
4. Run full TypeScript validation
5. Test all features end-to-end
6. Update documentation
```

### Lessons Learned from Sales Sheet Implementation

**What Worked Well:**
- ✅ Parallel agents for distinct UI modules (Pricing Rules, Sales Sheet Core, Export)
- ✅ Clear module boundaries prevented conflicts
- ✅ Frozen backend/schema eliminated integration issues

**What to Improve:**
- ⚠️ Always verify parallel agents work in main project context (not just sandboxes)
- ⚠️ Consider sequential implementation for tightly coupled features
- ⚠️ Ensure all type imports are correct before parallelization
- ⚠️ Test one module fully before spawning all parallel agents

**Recommended Approach:**
1. Implement one module sequentially as a "reference implementation"
2. Verify it works perfectly in main project
3. Use it as a template for parallel agents
4. Spawn parallel agents for remaining similar modules
5. Integrate and validate all at once

---

## 🎨 TERP Design System Standards

### Component Patterns (MUST Follow)

**1. Page Structure:**
```tsx
export default function PageName() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Page Title</h1>
        <Button>Action</Button>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>Section Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Content here */}
        </CardContent>
      </Card>
    </div>
  );
}
```

**2. Form Patterns:**
- Use shadcn/ui form components
- Always include validation
- Show loading states during submission
- Display success/error toasts
- Clear form after successful submission

**3. Table Patterns:**
- Desktop: Full data table
- Mobile: Card-based view
- Always include search/filter
- Show loading skeleton
- Handle empty states

**4. Error Handling:**
- Use `toast` from `sonner` for notifications
- Show user-friendly error messages
- Log errors to console for debugging
- Gracefully handle API failures

**5. Loading States:**
- Show skeleton loaders for data fetching
- Disable buttons during mutations
- Show spinner for long operations
- Provide feedback for all async actions

### Responsive Design (MUST Implement)

**Breakpoints:**
- Mobile: `< 640px` (grid-cols-1)
- Tablet: `640px - 1024px` (sm: and md: prefixes)
- Desktop: `> 1024px` (lg: prefix)

**Common Patterns:**
```tsx
// Headers
<h1 className="text-2xl md:text-3xl font-bold">

// Grids
<div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">

// Flex layouts
<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">

// Tables
<div className="hidden md:block"> {/* Desktop table */}
<div className="md:hidden"> {/* Mobile cards */}
```

---

## 🗄️ Database & API Standards

### Database Changes

**NEVER modify schema without:**
1. Creating a migration file
2. Updating `drizzle/schema.ts`
3. Updating type exports
4. Running migration: `pnpm run db:push`
5. Updating seed data if applicable
6. Documenting in CHANGELOG.md

### tRPC Endpoint Patterns

**Query Pattern:**
```typescript
endpointName: protectedProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ input }) => {
    return await db.table.findById(input.id);
  }),
```

**Mutation Pattern:**
```typescript
endpointName: protectedProcedure
  .input(z.object({ /* fields */ }))
  .mutation(async ({ input, ctx }) => {
    // Validate
    // Perform operation
    // Return result
    return { success: true, data: result };
  }),
```

**Always:**
- Use Zod for input validation
- Include proper error handling
- Return consistent response formats
- Use `protectedProcedure` for authenticated routes
- Document endpoint purpose in comments

---

## 📋 Quality Assurance Checklist

**Before marking ANY phase complete:**

- [ ] **TypeScript Validation:** `pnpm run check` returns 0 errors
- [ ] **All imports resolved:** No missing module errors
- [ ] **Navigation works:** All routes accessible, no 404s
- [ ] **Data flows correctly:** API calls work, data renders
- [ ] **Error handling:** Graceful failures, user-friendly messages
- [ ] **Loading states:** Shown for all async operations
- [ ] **Responsive design:** Works on mobile/tablet/desktop
- [ ] **No placeholders:** All code is production-ready
- [ ] **Documentation updated:** CHANGELOG.md, PROJECT_CONTEXT.md, module docs
- [ ] **Git committed:** Changes committed with descriptive message
- [ ] **Git pushed:** Changes pushed to GitHub successfully

---

## 🔄 Standard Development Workflow

### Phase Start
1. Read all required documentation (see Required Reading section)
2. Understand current system state
3. Review phase objectives and success criteria
4. Perform impact analysis
5. Create implementation plan

### During Implementation
1. Follow production-ready code standards
2. Update ALL related files in single operation
3. Maintain design system consistency
4. Test incrementally as you build
5. Handle errors gracefully

### Phase Completion
1. Run TypeScript validation (`pnpm run check`)
2. Test all features in browser
3. Verify responsive behavior
4. **Update CHANGELOG.md** (MANDATORY)
5. **Update PROJECT_CONTEXT.md** (MANDATORY)
6. **Update module-specific docs** (MANDATORY)
7. **Commit to git** with descriptive message
8. **Push to GitHub** and verify success
9. Mark phase complete with ✅

### Session End
1. Create handoff document if work incomplete
2. Update `docs/NEXT_SESSION_PROMPT.md` with continuation instructions
3. Document any known issues or blockers
4. Ensure all context docs are current

---

## 🧠 Knowledge Integration

**You have access to extensive knowledge about:**
- TERP design system and UX/UI principles
- ERP complexity reduction strategies
- React 19 + TypeScript best practices
- Tailwind CSS 4 + shadcn/ui patterns
- tRPC + Drizzle ORM patterns
- Mobile-first responsive design
- Production-ready code standards

**ALWAYS:**
- Apply this knowledge to maintain consistency
- Reference existing patterns in codebase
- Follow established conventions
- Improve code quality continuously
- Share knowledge in code comments

---

## ⚠️ Common Pitfalls to Avoid

1. **Skipping context doc updates** - NEVER skip CHANGELOG.md or PROJECT_CONTEXT.md updates
2. **Partial implementations** - NEVER leave placeholder code
3. **Breaking changes without approval** - ALWAYS get user confirmation first
4. **Ignoring TypeScript errors** - MUST resolve all errors before completion
5. **Forgetting git push** - ALWAYS push to GitHub after phase completion
6. **Inconsistent design patterns** - ALWAYS follow established patterns
7. **Missing error handling** - ALWAYS handle errors gracefully
8. **No loading states** - ALWAYS show loading feedback
9. **Skipping mobile testing** - ALWAYS verify responsive behavior
10. **Poor commit messages** - ALWAYS write descriptive commits

---

## 🎯 Success Criteria

**A phase is ONLY complete when:**

✅ All features are production-ready (no placeholders)  
✅ TypeScript validation passes (0 errors)  
✅ All navigation and routes work  
✅ Error handling is comprehensive  
✅ Loading states are implemented  
✅ Responsive design works (mobile/tablet/desktop)  
✅ **CHANGELOG.md is updated**  
✅ **PROJECT_CONTEXT.md is updated**  
✅ **Module docs are updated**  
✅ **Changes are committed to git**  
✅ **Changes are pushed to GitHub**  
✅ User can immediately use the feature

---

## 📞 When to Ask for Help

**STOP and ask user if:**
- Breaking change protocol triggered
- Unclear requirements or acceptance criteria
- Technical blocker encountered (3 failed attempts)
- Need to deviate from established patterns
- Incomplete implementation unavoidable
- User input required (credentials, API keys, etc.)

**Report Format:**
```
⚠️ ASSISTANCE REQUIRED

ISSUE: [Brief description]
CONTEXT: [What you were trying to do]
ATTEMPTS: [What you've tried]
BLOCKER: [Why it's not working]
OPTIONS: [Possible solutions]

AWAITING USER GUIDANCE
```

---

## 🎓 Continuous Improvement

**After each phase:**
- Reflect on what went well
- Identify areas for improvement
- Update this prompt if new patterns emerge
- Share learnings in documentation
- Improve code quality continuously

**Update this prompt when:**
- New protocols are established
- Better patterns are discovered
- Common issues are identified
- Tools or frameworks change
- Team standards evolve

---

## 📝 Quick Reference

**Essential Commands:**
```bash
# TypeScript validation
pnpm run check

# Development server
pnpm run dev

# Database push
pnpm run db:push

# Git workflow
git add -A
git commit -m "feat: [description]"
git push origin main
```

**Essential Files:**
- `docs/DEVELOPMENT_PROTOCOLS.md` - The Bible
- `docs/PROJECT_CONTEXT.md` - System overview
- `CHANGELOG.md` - Change history
- `drizzle/schema.ts` - Database schema
- `server/routers.ts` - tRPC endpoints

**Essential Patterns:**
- Page structure: Container → Header → Card → Content
- Forms: shadcn/ui + validation + loading + toast
- Tables: Desktop table + Mobile cards + search/filter
- Error handling: Try/catch + toast + console.log
- Loading: Skeleton loaders + disabled buttons

---

## ✅ Final Checklist (Use This Every Time)

Before marking work complete:

- [ ] Read all required documentation
- [ ] Followed all mandatory protocols
- [ ] Production-ready code (no placeholders)
- [ ] TypeScript validation passes (0 errors)
- [ ] All features tested in browser
- [ ] Responsive design verified
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] **CHANGELOG.md updated**
- [ ] **PROJECT_CONTEXT.md updated**
- [ ] **Module docs updated**
- [ ] **Git committed with descriptive message**
- [ ] **Git pushed to GitHub successfully**
- [ ] Ready for user to test immediately

---

**Remember: Quality over speed. Production-ready over quick hacks. Documentation over assumptions.**

**This is a production system. Every line of code matters. Every phase completion requires full documentation updates and git push.**

**Follow this prompt religiously. The success of TERP depends on it.**

