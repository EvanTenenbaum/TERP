# Development Brief: {{FEATURE_ID}} - {{FEATURE_TITLE}}

## ⚠️ CRITICAL: Read These First

Before starting development, you MUST read and follow:

1. **[The Bible - DEVELOPMENT_PROTOCOLS.md](../../docs/DEVELOPMENT_PROTOCOLS.md)**
   - Non-negotiable development standards
   - Quality checklists
   - Production-ready code requirements
   - ALL code must comply with these protocols

2. **[PROJECT_CONTEXT.md](../../docs/PROJECT_CONTEXT.md)**
   - Current TERP architecture
   - Tech stack and patterns
   - Existing modules and their relationships

3. **[TERP_DESIGN_SYSTEM.md](../../docs/TERP_DESIGN_SYSTEM.md)**
   - UI/UX standards
   - Component patterns
   - Design tokens

---

## Feature Overview

**ID**: {{FEATURE_ID}}  
**Title**: {{FEATURE_TITLE}}  
**Type**: {{FEATURE_TYPE}}  
**Priority**: {{PRIORITY}}  
**Status**: {{STATUS}}

### Description

{{DESCRIPTION}}

### User Story

{{USER_STORY}}

---

## Technical Requirements

### Files to Modify

{{FILES_TO_MODIFY}}

### New Files to Create

{{NEW_FILES}}

### Dependencies

{{DEPENDENCIES}}

### Database Changes

{{DATABASE_CHANGES}}

---

## Implementation Checklist

### Phase 1: Setup
- [ ] Read The Bible (DEVELOPMENT_PROTOCOLS.md)
- [ ] Review PROJECT_CONTEXT.md
- [ ] Understand existing codebase patterns
- [ ] Identify all affected files

### Phase 2: Implementation
- [ ] Implement core functionality
- [ ] Follow TERP coding standards
- [ ] Add comprehensive error handling
- [ ] Include TypeScript types
- [ ] Add inline documentation

### Phase 3: Quality Assurance
- [ ] Test all functionality
- [ ] Verify protocol compliance
- [ ] Check accessibility
- [ ] Test responsive design
- [ ] Performance optimization

### Phase 4: Documentation & Handoff
- [ ] Update relevant documentation
- [ ] Add comments for complex logic
- [ ] Update progress.md
- [ ] Register work in PM Hub

---

## Protocol Compliance Checklist

From The Bible - MUST verify all items:

- [ ] Code follows TERP TypeScript standards
- [ ] Error handling is comprehensive
- [ ] No console.logs in production code
- [ ] All functions have proper types
- [ ] Components follow naming conventions
- [ ] Database queries are optimized
- [ ] Security best practices followed
- [ ] Accessibility standards met
- [ ] Performance benchmarks met
- [ ] Code is production-ready

---

## Context Files

Load these files for full context:

- `/TERP/docs/DEVELOPMENT_PROTOCOLS.md` - The Bible
- `/TERP/docs/PROJECT_CONTEXT.md` - Project state
- `/TERP/docs/TERP_DESIGN_SYSTEM.md` - Design standards
- `/TERP/docs/DEV_QUICK_REFERENCE.md` - Quick reference
- {{ADDITIONAL_CONTEXT_FILES}}

---

## Related Features

{{RELATED_FEATURES}}

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code follows The Bible protocols
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Code reviewed (if applicable)
- [ ] Deployed to staging
- [ ] PM Hub updated with progress

---

## Notes

{{NOTES}}

---

## How to Update Progress

After completing work, update the PM Hub:

```bash
# Option 1: Use self-registration API
curl -X POST {{PM_HUB_URL}}/api/trpc/selfRegister.register \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": "{{FEATURE_ID}}",
    "type": "FEAT",
    "title": "{{FEATURE_TITLE}}",
    "description": "Completed implementation",
    "action": "completed",
    "filesModified": ["list", "of", "files"],
    "commitHash": "your-commit-hash"
  }'

# Option 2: Update progress.md manually
# Edit: /TERP/product-management/features/{{STATUS}}/{{FEATURE_ID}}/progress.md
```

---

**Remember**: The Bible (DEVELOPMENT_PROTOCOLS.md) is non-negotiable. All code must comply.
