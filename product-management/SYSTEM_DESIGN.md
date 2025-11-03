# Project Manager Evaluation System - Design Document

**Version**: 1.0  
**Created**: November 3, 2025  
**Purpose**: Extend the existing TERP Product Management System to support multi-agent development with centralized PM evaluation

---

## Overview

This system extends the existing product management infrastructure to enable:

1. **Development agents** to autonomously create and document features/initiatives
2. **Centralized storage** of all agent outputs in GitHub
3. **Project Manager agent** to evaluate, prioritize, and orchestrate all initiatives

---

## Architecture

### Core Concept

The system introduces a new **"initiatives"** layer that sits above individual features. An initiative represents a complete body of work that may include:

- Multiple features
- Documentation
- Implementation artifacts
- Dependencies and relationships
- Status and progress tracking

### Directory Structure

```
product-management/
├── initiatives/              # NEW: Agent-created initiatives
│   ├── TERP-INIT-001/       # Individual initiative folders
│   │   ├── manifest.json    # Initiative metadata
│   │   ├── overview.md      # High-level description
│   │   ├── features/        # Associated features
│   │   ├── docs/            # Documentation
│   │   ├── artifacts/       # Implementation outputs
│   │   └── progress.md      # Status tracking
│   └── registry.json        # Initiative registry
│
├── pm-evaluation/           # NEW: PM agent workspace
│   ├── inbox/               # Pending initiatives for review
│   ├── evaluations/         # PM evaluation reports
│   │   ├── TERP-EVAL-001.md
│   │   └── ...
│   ├── roadmap/             # PM-generated roadmaps
│   │   ├── current.md       # Active roadmap
│   │   ├── backlog.md       # Backlog items
│   │   └── archive/         # Historical roadmaps
│   ├── conflicts/           # Identified conflicts
│   └── dependencies.json    # Cross-initiative dependencies
│
├── _system/
│   ├── scripts/
│   │   ├── initiative-manager.py    # NEW: Manage initiatives
│   │   ├── pm-evaluator.py          # NEW: PM evaluation tools
│   │   └── conflict-detector.py     # NEW: Detect overlaps/conflicts
│   ├── templates/
│   │   ├── initiative-template.md   # NEW: Initiative template
│   │   ├── pm-evaluation-template.md # NEW: PM evaluation template
│   │   └── dev-agent-brief.md       # NEW: Dev agent instructions
│   └── chat-contexts/
│       ├── dev-agent-context.md     # NEW: For dev agents
│       └── pm-agent-context.md      # NEW: For PM agent
│
└── [existing directories remain unchanged]
```

---

## Workflows

### Workflow 1: Development Agent Creates Initiative

```
1. Dev Agent loads dev-agent-context.md
   ↓
2. Agent creates initiative folder: TERP-INIT-XXX
   ↓
3. Agent generates:
   - manifest.json (metadata)
   - overview.md (description)
   - features/ (feature specs)
   - docs/ (documentation)
   - artifacts/ (code/designs)
   ↓
4. Agent moves initiative to pm-evaluation/inbox/
   ↓
5. Agent commits to GitHub
```

### Workflow 2: PM Agent Evaluates Initiatives

```
1. PM Agent loads pm-agent-context.md
   ↓
2. PM Agent scans pm-evaluation/inbox/
   ↓
3. For each initiative, PM Agent:
   - Analyzes scope and complexity
   - Identifies dependencies
   - Detects conflicts with existing work
   - Evaluates priority
   - Estimates effort
   ↓
4. PM Agent generates evaluation report
   ↓
5. PM Agent updates roadmap with prioritized order
   ↓
6. PM Agent moves evaluated initiatives to appropriate status
```

### Workflow 3: Conflict Resolution

```
1. PM Agent detects overlap/conflict
   ↓
2. PM Agent creates conflict report in conflicts/
   ↓
3. Report includes:
   - Conflicting initiatives
   - Nature of conflict
   - Recommended resolution
   - Options for user decision
   ↓
4. User reviews and decides
   ↓
5. PM Agent updates roadmap accordingly
```

---

## Data Structures

### Initiative Manifest (manifest.json)

```json
{
  "id": "TERP-INIT-001",
  "title": "Inventory Export Feature",
  "created_by": "dev-agent-1",
  "created_at": "2025-11-03T10:00:00Z",
  "status": "pending_review",
  "priority": null,
  "estimated_effort": null,
  "features": [
    "TERP-FEAT-015",
    "TERP-FEAT-016"
  ],
  "dependencies": [],
  "conflicts": [],
  "tags": ["inventory", "export", "ui"],
  "metadata": {
    "complexity": "medium",
    "risk_level": "low",
    "business_value": "high"
  }
}
```

### PM Evaluation Report

```markdown
# PM Evaluation: TERP-INIT-001

**Initiative**: Inventory Export Feature  
**Evaluated By**: PM Agent  
**Date**: November 3, 2025  
**Status**: Approved with Conditions

## Executive Summary
[Brief overview of the initiative and recommendation]

## Scope Analysis
- Features included: [list]
- Estimated complexity: Medium
- Risk assessment: Low

## Dependencies
- Depends on: [list of other initiatives/features]
- Blocks: [list of initiatives that depend on this]

## Conflicts Detected
- None / [Description of conflicts]

## Priority Recommendation
**Priority**: High
**Rationale**: [Explanation]

## Build Order Recommendation
**Sequence**: 3rd in current sprint
**Rationale**: [Explanation]

## Conditions/Notes
[Any conditions or notes for implementation]

## Decision
- [ ] Approve as-is
- [ ] Approve with modifications
- [ ] Defer to later sprint
- [ ] Reject with feedback
```

### Cross-Initiative Dependencies (dependencies.json)

```json
{
  "graph": {
    "TERP-INIT-001": {
      "depends_on": [],
      "blocks": ["TERP-INIT-003"]
    },
    "TERP-INIT-002": {
      "depends_on": ["TERP-INIT-001"],
      "blocks": []
    }
  },
  "critical_path": ["TERP-INIT-001", "TERP-INIT-002"],
  "last_updated": "2025-11-03T10:00:00Z"
}
```

---

## Scripts

### 1. initiative-manager.py

**Purpose**: Create and manage initiatives

**Commands**:
```bash
# Create new initiative
python3 initiative-manager.py create "Initiative Title" --tags tag1,tag2

# List all initiatives
python3 initiative-manager.py list

# Get initiative details
python3 initiative-manager.py show TERP-INIT-001

# Update initiative status
python3 initiative-manager.py update TERP-INIT-001 --status in-progress
```

### 2. pm-evaluator.py

**Purpose**: PM evaluation tools

**Commands**:
```bash
# Evaluate pending initiatives
python3 pm-evaluator.py evaluate-inbox

# Generate roadmap from evaluations
python3 pm-evaluator.py generate-roadmap

# Show priority matrix
python3 pm-evaluator.py priority-matrix

# Analyze dependencies
python3 pm-evaluator.py analyze-dependencies
```

### 3. conflict-detector.py

**Purpose**: Detect overlaps and conflicts

**Commands**:
```bash
# Scan for conflicts
python3 conflict-detector.py scan

# Check specific initiative
python3 conflict-detector.py check TERP-INIT-001

# Generate conflict report
python3 conflict-detector.py report
```

---

## Chat Contexts

### Dev Agent Context

**File**: `_system/chat-contexts/dev-agent-context.md`

**Purpose**: Instructions for development agents creating initiatives

**Key Sections**:
1. Your role as a development agent
2. How to create an initiative
3. Required documentation
4. Submission process
5. Best practices

### PM Agent Context

**File**: `_system/chat-contexts/pm-agent-context.md`

**Purpose**: Instructions for PM agent evaluating initiatives

**Key Sections**:
1. Your role as project manager
2. Evaluation criteria
3. Priority framework
4. Conflict resolution process
5. Roadmap generation
6. Decision-making guidelines

---

## Integration with Existing System

### Compatibility

- **Preserves** all existing functionality
- **Extends** with new initiative layer
- **Reuses** existing ID system, search, and caching
- **Maintains** existing feature/idea/bug workflows

### Relationship to Existing Components

```
Ideas (TERP-IDEA-XXX)
  ↓
Features (TERP-FEAT-XXX)
  ↓
Initiatives (TERP-INIT-XXX)  ← NEW LAYER
  ↓
PM Evaluation (TERP-EVAL-XXX)  ← NEW LAYER
  ↓
Roadmap & Execution
```

### ID System Extension

- **TERP-INIT-XXX**: Initiatives
- **TERP-EVAL-XXX**: PM Evaluations
- Reuses existing `id-manager.py` with new types

---

## Key Features

### 1. Multi-Agent Coordination

- Multiple dev agents can work in parallel
- Each creates initiatives independently
- PM agent orchestrates and prioritizes
- No conflicts in Git (separate folders)

### 2. Conflict Detection

- Automatic detection of:
  - Overlapping features
  - Duplicate work
  - Incompatible changes
  - Resource conflicts

### 3. Priority Framework

**Factors**:
- Business value
- Technical complexity
- Dependencies
- Risk level
- Resource availability
- Strategic alignment

**Output**: Prioritized build order with rationale

### 4. Dependency Management

- Automatic dependency graph generation
- Critical path analysis
- Blocking relationship tracking
- Visual dependency maps (future)

### 5. Thought Partnership

- PM agent provides analysis and options
- User makes final decisions
- System tracks decisions and rationale
- No prescriptive mandates

---

## Implementation Phases

### Phase 1: Core Infrastructure (This Implementation)

- Directory structure
- Data schemas
- Basic scripts (create, list, show)
- Templates
- Chat contexts
- Documentation

### Phase 2: PM Evaluation Engine (Future)

- Advanced conflict detection
- Priority scoring algorithm
- Dependency graph generation
- Automated roadmap generation

### Phase 3: Visualization (Future)

- Web dashboard
- Dependency graphs
- Gantt charts
- Priority matrices

---

## Success Metrics

### For Development Agents

- Time to create initiative: < 5 minutes
- Documentation completeness: 100%
- Submission success rate: > 95%

### For PM Agent

- Evaluation time per initiative: < 10 minutes
- Conflict detection accuracy: > 90%
- Roadmap generation time: < 5 minutes

### For System

- Zero Git conflicts
- 100% traceability
- Sub-second search/lookup
- < 100MB storage for 100 initiatives

---

## Best Practices

### For Development Agents

1. Use clear, descriptive initiative titles
2. Document all features and dependencies
3. Include implementation artifacts
4. Tag appropriately for searchability
5. Submit complete initiatives only

### For PM Agent

1. Evaluate all pending initiatives regularly
2. Provide clear rationale for decisions
3. Update roadmap after each evaluation cycle
4. Document conflicts and resolutions
5. Maintain dependency graph accuracy

### For Users

1. Review PM evaluations promptly
2. Make decisions on conflicts quickly
3. Keep strategic priorities updated
4. Trust the system for routine decisions
5. Override when strategic context requires

---

## Technical Considerations

### Performance

- Incremental processing (one initiative at a time)
- Cached dependency graphs
- Indexed search across initiatives
- Lazy loading of artifacts

### Scalability

- Designed for 100+ initiatives
- Efficient Git storage (text files)
- Parallel agent operations
- No database required

### Reliability

- Atomic operations (one initiative = one commit)
- Rollback capability (Git history)
- Validation at each step
- Error recovery mechanisms

---

## Future Enhancements

### Short Term

- Slack/Discord notifications
- Email summaries
- Automated conflict resolution suggestions
- Initiative templates by type

### Medium Term

- Web dashboard
- Visual dependency graphs
- Analytics and insights
- Multi-project support

### Long Term

- Machine learning for priority prediction
- Automated effort estimation
- Resource allocation optimization
- Integration with external PM tools

---

## Conclusion

This system extends the existing TERP Product Management System to enable true multi-agent development workflows with centralized PM oversight. It maintains the simplicity and efficiency of the current system while adding powerful coordination and evaluation capabilities.

**Key Benefits**:
- Parallel agent development
- Centralized coordination
- Conflict prevention
- Data-driven prioritization
- Complete traceability
- Zero additional cost

**Ready for**: Immediate implementation and production use
