# Reference System Guide

**Purpose**: Enable clear, unambiguous communication between you and Manus agents by using standardized references.

---

## Why References?

**Problem**: Confusion about what's being discussed
- "That feature" - which one?
- "The architecture doc" - which section?
- "What I mentioned earlier" - when?

**Solution**: Use explicit references
- `[FEAT-015]` - Everyone knows exactly which feature
- `[@codebase/architecture]` - Clear document reference
- No ambiguity, no confusion

---

## Reference Types

### 1. ID References (Features, Ideas, Bugs)

**Format**: `[TYPE-ID]`

**Examples**:
- `[FEAT-015]` - Feature #15
- `[IDEA-042]` - Idea #42
- `[BUG-008]` - Bug #8
- `[IMPROVE-003]` - Improvement #3
- `[TECH-001]` - Technical debt item #1

**Usage**:
```
You: "Let's build [IDEA-042]"
Manus: "Loading IDEA-042: Bulk Export to Inventory..."

You: "What's the status of [FEAT-015]?"
Manus: "FEAT-015: Advanced Inventory Filters is completed."

You: "Is [BUG-008] fixed?"
Manus: "BUG-008: Filter Crash is still open."
```

---

### 2. Document References

**Format**: `[@category/document]`

**Examples**:
- `[@codebase/architecture]` - Architecture documentation
- `[@codebase/tech-stack]` - Technology stack
- `[@module/inventory]` - Inventory module docs
- `[@module/accounting]` - Accounting module docs
- `[@roadmap]` - Current roadmap
- `[@context/vision]` - Product vision
- `[@context/constraints]` - Technical constraints

**Usage**:
```
You: "Update [@codebase/architecture] with the new module"
Manus: "Updating architecture.md with new module information..."

You: "What does [@roadmap] say about inventory?"
Manus: "Current roadmap shows 3 inventory features planned..."

You: "Check [@module/inventory] for the filter implementation"
Manus: "Reviewing inventory module documentation..."
```

---

### 3. File References

**Format**: `[@file:path/to/file]`

**Examples**:
- `[@file:client/src/pages/Inventory.tsx]`
- `[@file:server/routers/inventory.ts]`
- `[@file:docs/DEVELOPMENT_PROTOCOLS.md]`

**Usage**:
```
You: "Review [@file:client/src/pages/Inventory.tsx]"
Manus: "Reading Inventory.tsx..."

You: "Does [@file:server/routers/inventory.ts] handle filters?"
Manus: "Yes, the inventory router includes filter endpoints..."
```

---

### 4. Section References

**Format**: `[@document#section]`

**Examples**:
- `[@codebase/architecture#data-flow]`
- `[@roadmap#phase-2]`
- `[@context/vision#goals]`

**Usage**:
```
You: "What does [@roadmap#phase-2] include?"
Manus: "Phase 2 of the roadmap includes..."

You: "Update [@codebase/architecture#data-flow]"
Manus: "Updating the data flow section..."
```

---

### 5. Quick References (Shortcuts)

**Format**: `[@shortcut]`

**Common Shortcuts**:
- `[@bible]` → `/home/ubuntu/TERP/docs/DEVELOPMENT_PROTOCOLS.md`
- `[@context]` → `/home/ubuntu/TERP/docs/PROJECT_CONTEXT.md`
- `[@roadmap]` → `product-management/roadmap/current.md`
- `[@registry]` → `product-management/_system/id-registry.json`
- `[@config]` → `product-management/_system/config/system.json`

**Usage**:
```
You: "Follow [@bible] protocols"
Manus: "Following DEVELOPMENT_PROTOCOLS.md guidelines..."

You: "What's in [@registry]?"
Manus: "ID registry shows 15 features, 8 ideas, 3 bugs..."
```

---

## Reference Resolution

When you use a reference, Manus will:

1. **Parse the reference** - Understand what you're referring to
2. **Locate the item** - Find it in the system
3. **Load context** - Read relevant information
4. **Confirm** - Acknowledge what was loaded
5. **Respond** - Answer based on the reference

**Example Flow**:
```
You: "Build [IDEA-042]"

Manus:
✓ Parsed: IDEA-042
✓ Located: ideas/inbox/IDEA-042-bulk-export-inventory.md
✓ Loaded: Idea details, tags, related features
✓ Confirmed: "Building IDEA-042: Bulk Export to Inventory"
→ [Proceeds with feature planning]
```

---

## Multi-Reference Usage

You can use multiple references in one message:

```
You: "Does [FEAT-015] conflict with [FEAT-018]? Check [@roadmap]."

Manus:
✓ Loading FEAT-015: Advanced Inventory Filters
✓ Loading FEAT-018: Saved Filter Views
✓ Loading current roadmap
→ "No conflict. FEAT-018 depends on FEAT-015, which is completed."
```

---

## Reference in Manus Responses

Manus will also use references when responding:

```
Manus: 
"I've created [IDEA-043] for the profit margin dashboard.
This relates to [FEAT-012] (Accounting Integration).
See [@roadmap] for current priorities."
```

This makes it easy for you to:
- Know exactly what was created
- Understand relationships
- Find more information

---

## Reference Index

All references are indexed in:
- `_system/id-registry.json` - All IDs
- `_system/reference-index.json` - All document references
- Searchable via search system

---

## Best Practices

### DO:
✅ Use references when mentioning specific items
✅ Use references to avoid ambiguity
✅ Use references for quick lookups
✅ Combine references with natural language

**Good**:
- "Build [IDEA-042]"
- "What's the status of [FEAT-015]?"
- "Update [@roadmap] with [FEAT-018]"
- "Does [FEAT-015] follow [@bible] protocols?"

### DON'T:
❌ Overuse references when context is clear
❌ Use references for everything
❌ Create custom reference formats

**Bad**:
- "The [FEAT-015] is [STATUS-COMPLETE]" (too much)
- Just say: "FEAT-015 is complete"

---

## Reference Quick Guide

| What | Format | Example |
|------|--------|---------|
| Feature | `[FEAT-ID]` | `[FEAT-015]` |
| Idea | `[IDEA-ID]` | `[IDEA-042]` |
| Bug | `[BUG-ID]` | `[BUG-008]` |
| Document | `[@category/doc]` | `[@codebase/architecture]` |
| Module | `[@module/name]` | `[@module/inventory]` |
| File | `[@file:path]` | `[@file:client/src/App.tsx]` |
| Section | `[@doc#section]` | `[@roadmap#phase-2]` |
| Shortcut | `[@name]` | `[@bible]`, `[@roadmap]` |

---

## Examples in Context

### Idea Capture
```
You: "Users want to export inventory to CSV"
Manus: "Created [IDEA-042]: Bulk Export to Inventory"

You: "Link it to [FEAT-015]"
Manus: "Linked [IDEA-042] to [FEAT-015]: Advanced Inventory Filters"
```

### Feature Planning
```
You: "Build [IDEA-042]"
Manus: "Promoting [IDEA-042] to [FEAT-019]..."

You: "Does it depend on anything?"
Manus: "Yes, [FEAT-019] depends on [FEAT-015] (completed ✓)"
```

### Development
```
You: "Implement [FEAT-019]"
Manus: "Loading dev-brief for [FEAT-019]..."

You: "Follow [@bible] and check [@module/inventory]"
Manus: "Following DEVELOPMENT_PROTOCOLS.md and reviewing inventory module..."
```

### QA
```
You: "QA [FEAT-019] at level 3"
Manus: "Running comprehensive QA on [FEAT-019]..."

You: "Any issues?"
Manus: "Found 2 issues, created [BUG-009] and [BUG-010]"
```

---

## Reference Autocomplete (Future)

In future versions, the dashboard will support autocomplete:
- Type `[FEAT-` → See list of features
- Type `[@mod` → See list of modules
- Click to insert reference

For now, use the registry and search to find IDs.

---

**This reference system ensures clear, unambiguous communication throughout the product management workflow.**
