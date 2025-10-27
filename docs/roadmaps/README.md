# TERP Roadmaps - Master Index

**Purpose:** Central tracking of all implementation roadmaps for TERP development.

**Last Updated:** October 27, 2025

---

## Active Roadmap

**Current Focus:** [Default Values Implementation](./defaults-implementation.md)

**Status:** 🟡 Ready to Start  
**Estimated Effort:** 22-29 days  
**Started:** Not yet  
**Current Phase:** Phase 1 - Master Data & Foundation

---

## All Roadmaps

### 1. Default Values Implementation
**Status:** 🟡 Ready to Start  
**Priority:** High  
**Files:**
- [Implementation Roadmap](./defaults-implementation.md) - 10-phase implementation plan
- [Specifications](./defaults-specifications.md) - Complete user specifications
- [Analysis](./defaults-analysis.md) - Detailed analysis of all areas needing defaults

**Summary:** Implement default values for all dropdowns, customizations, and system settings to ensure smooth first-time user experience.

**Key Deliverables:**
- Master data seeding (locations, categories, grades, expense categories)
- Simplified accounting (cash/crypto payments, simple bank ledger)
- Advanced pricing rules with complex conditional logic
- Per-client pricing profiles (hidden from client view)
- COGS adjustments by Flower subcategory
- Smart low inventory alerts
- Comprehensive dashboard with 6 default KPIs

---

### 2. [Future Roadmap Name]
**Status:** 🔵 Planned  
**Priority:** TBD  
**Files:** TBD

---

## Roadmap Status Legend

- 🟢 **Complete** - All phases finished, tested, and deployed
- 🟡 **In Progress** - Currently being worked on
- 🟠 **Ready to Start** - Specifications complete, ready for implementation
- 🔵 **Planned** - Identified but not yet specified
- ⚪ **On Hold** - Paused for dependencies or other reasons
- 🔴 **Blocked** - Cannot proceed due to blockers

---

## How to Use This System

### For Development Agents

**Before Starting Work:**
1. Read this README to see the active roadmap
2. Open the active roadmap file
3. Check `../notes/user-feedback.md` for latest feedback
4. Review `../HANDOFF_CONTEXT.md` for what the last agent did
5. Review `../DEVELOPMENT_PROTOCOLS.md` for development standards

**During Work:**
1. Update the roadmap file as you complete phases
2. Check off completed tasks using `- [x]` syntax
3. Update status and progress notes
4. Commit changes regularly with descriptive messages

**Before Finishing:**
1. Update the roadmap with current status
2. Update `../HANDOFF_CONTEXT.md` with what you did and what's next
3. Update `../CHANGELOG.md` with completed work
4. Commit and push all changes

---

### For Project Owner

**Adding New Roadmaps:**
1. Create a new markdown file in this directory
2. Add entry to this README with status and summary
3. Update "Active Roadmap" section if it's the new focus

**Providing Feedback:**
1. Add thoughts to `../notes/user-feedback.md`
2. Agents check this file at start of every session
3. Organize by date with clear headings

**Switching Active Roadmap:**
1. Update "Active Roadmap" section in this README
2. Inform the next agent which roadmap to work on

---

## Roadmap Template

When creating a new roadmap, include:

1. **Overview** - What is being built and why
2. **Phases** - Break work into logical phases with estimates
3. **Tasks** - Specific tasks within each phase
4. **Dependencies** - What must be done first
5. **Deliverables** - What will be completed
6. **Testing Checklist** - How to verify it works
7. **Success Criteria** - How to know it's done

---

## Related Documentation

- [Project Context](../PROJECT_CONTEXT.md) - Overall project state
- [Development Protocols](../DEVELOPMENT_PROTOCOLS.md) - Development standards and rules
- [Changelog](../CHANGELOG.md) - Completed work history
- [Handoff Context](../HANDOFF_CONTEXT.md) - Latest session handoff
- [User Feedback](../notes/user-feedback.md) - Owner's thoughts and feedback

---

**Maintained by:** Development agents  
**Reviewed by:** Project owner

