# Architecture Decision Records (ADRs)

**Version:** 1.0
**Last Updated:** 2025-12-01

## What is an ADR?

An Architecture Decision Record (ADR) documents significant architectural decisions made during development. Each ADR captures the context, decision, and consequences of a choice that affects the codebase structure, patterns, or dependencies.

## Why ADRs?

AI agents and developers make decisions constantly. Without documentation:
- Future agents don't know if a pattern was intentional or accidental
- Decisions get revisited repeatedly
- Context is lost when sessions end
- Technical debt accumulates without understanding

With ADRs:
- Decisions are preserved and searchable
- Rationale is clear for future reference
- Patterns can be evaluated and evolved
- Onboarding is faster

---

## When to Create an ADR

**MANDATORY** - Create an ADR when:

| Scenario | Example |
|----------|---------|
| New data model or schema change | Adding a new table, changing column types |
| New external dependency > 50KB | Adding a charting library, ORM |
| Non-obvious implementation choice | Storing numbers as strings (document WHY) |
| Performance/scalability tradeoff | Denormalizing data for query speed |
| Security-relevant decision | Auth token storage strategy |
| Breaking change to existing pattern | Changing from REST to tRPC |
| Choosing between alternatives | Why React Query over Redux |

**NOT REQUIRED** for:
- Bug fixes
- Minor refactoring
- Adding tests
- Documentation updates
- Standard CRUD operations

---

## How to Create an ADR

### 1. Generate the filename

```bash
# Format: NNNN-title-in-kebab-case.md
# NNNN = sequential number (0001, 0002, etc.)

# Find the next number
ls docs/adr/*.md | wc -l
# Add 1, then create file
```

### 2. Copy the template

```bash
cp docs/adr/_TEMPLATE.md docs/adr/NNNN-your-title.md
```

### 3. Fill in all sections

See template below for required content.

### 4. Commit with the related code

ADRs should be committed alongside the code they document.

---

## ADR Statuses

| Status | Meaning |
|--------|---------|
| **Proposed** | Under discussion, not yet implemented |
| **Accepted** | Approved and implemented |
| **Deprecated** | No longer recommended, kept for history |
| **Superseded** | Replaced by another ADR (link to replacement) |

---

## Index of ADRs

| Number | Title | Status | Date |
|--------|-------|--------|------|
| [0001](./0001-numeric-fields-as-varchar.md) | Numeric Fields as VARCHAR (Legacy) | Deprecated | 2025-12-01 |
| [0002](./0002-trpc-over-rest.md) | tRPC Over REST API | Accepted | 2025-12-01 |
| [0003](./0003-drizzle-orm-selection.md) | Drizzle ORM Selection | Accepted | 2025-12-01 |

---

## Template Location

See: [_TEMPLATE.md](./_TEMPLATE.md)

---

## Governance

- **Who can create ADRs:** Any agent or developer
- **Who approves ADRs:** Project lead or senior engineer review
- **How to update:** Create new ADR that supersedes old one (don't edit accepted ADRs)
- **Retention:** All ADRs kept indefinitely for historical reference
