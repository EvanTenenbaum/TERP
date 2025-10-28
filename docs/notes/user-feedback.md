# User Feedback & Thoughts

**Purpose:** Ongoing feedback, thoughts, and observations from the project owner.

**⚠️ Development agents: Check this file at the start of EVERY session!**

---

## October 27, 2025 - Default Values Must Auto-Seed for Every New Organization

**Important clarification on defaults implementation:**

The default values (locations, categories, grades, expense categories, chart of accounts) should be **automatically seeded for every new user/organization** when they first set up their TERP instance.

**Key Requirements:**
- When a new organization is created, automatically populate their database with defaults
- Each organization gets their own isolated copy of the defaults
- All data must be scoped to `organizationId`
- System should be idempotent (safe to run multiple times)
- Should hook into organization creation or first access

**Action Required:** Yes - implement automatic seeding system as described in the defaults roadmap. See `DEFAULTS_AUTO_SEED_PROMPT.md` for complete implementation details.

---

## October 27, 2025 - Initial Setup

This notes system has been created to facilitate communication between the project owner and development agents.

**Action Required:** No immediate action - this is just the initial setup.

---

## How to Add Feedback

Add new entries at the top of this file using this format:

```markdown
## [Date] - [Topic]

[Your feedback, thoughts, or observations]

**Action Required:** [Yes/No - what should the agent do?]

---
```

---

## Template for New Entries

```markdown
## [Date] - [Topic]

[Your feedback here]

**Action Required:** [Yes/No - what should the agent do?]

---
```

