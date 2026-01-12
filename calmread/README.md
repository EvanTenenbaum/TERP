# CalmRead

**Version:** 1.0.0  
**Last Updated:** January 11, 2026

## Overview

CalmRead is a dedicated e-ink reading device and software platform for early readers (ages 4–8). It teaches foundational reading skills using structured literacy approaches while intentionally avoiding the cognitive and behavioral pitfalls of conventional screen time.

## What CalmRead IS

- A "reading instrument" — calm, predictable, bounded
- Structured literacy teaching + practice + read-aloud support
- Offline-first beta capability
- A system that can scale content safely via AI pipelines

## What CalmRead is NOT

- A tablet experience
- A gamified learning app
- An infinite feed of content
- A rewards/streak system
- A general-purpose device

## Target Hardware (Beta)

**Device:** BOOX Go Color 7 (Gen II)

- Android-based e-ink tablet with touch, mic, speaker, frontlight
- Runs a kiosk-locked single-purpose app
- Supports offline lesson packs
- Optional karaoke highlighting (calm, evidence-aligned)

## Repository Structure

```
calmread/
├── README.md                    # This file
├── plan_overview.md             # High-level project plan
├── constitution/                # Core design principles
│   ├── calm_design.md           # Calm Design Constitution v1.0
│   ├── educational.md           # Educational Constitution v1.0
│   └── app_constraints.md       # App Constraints Constitution v1.0
├── schemas/                     # Data schemas
│   ├── lesson_schema.json       # Lesson JSON Schema
│   ├── scope_sequence.json      # Curriculum scope & sequence schema
│   └── app_screen_schema.json   # App screen definitions
├── ai_roles/                    # AI role definitions
│   ├── system_architect.md      # Role A: System Architect
│   ├── content_generator.md     # Role B: Content Generator
│   ├── qa_red_team.md           # Role C: QA / Red Team
│   └── builder_operator.md      # Role D: Builder / Operator
├── pipelines/                   # AI pipeline documentation
│   ├── lesson_generation_pipeline.md
│   ├── curriculum_expansion_pipeline.md
│   ├── audio_generation_pipeline.md
│   ├── app_code_generation_pipeline.md
│   └── qa_lint_pipeline.md
├── curriculum/                  # Curriculum content
│   ├── scope_sequence_v1.json   # 20-lesson scope & sequence
│   └── lessons/                 # Generated lesson folders
├── app/                         # Application code
│   └── android/                 # Android app project
├── qa/                          # Quality assurance
│   ├── checklists/              # QA checklists
│   │   ├── calm_lint.md
│   │   ├── pedagogy_lint.md
│   │   └── ux_lint.md
│   └── reports/                 # QA reports
└── beta_ops/                    # Beta operations
    ├── onboarding/
    ├── observation_forms/
    ├── parent_interview_scripts/
    └── session_log_templates/
```

## Core Principles

### The Four-Layer Foundation

1. **Constitution Layer:** Calm Design + Educational + App Constraints
2. **Schema Layer:** Lesson schema + scope/sequence schema + app screen schema
3. **Pipeline Layer:** Repeatable AI workflows for generation/QA/packaging
4. **Execution Layer:** Human runs pipelines instead of writing new prompts

### The Four AI Roles (Never Mix)

| Role | Purpose | Does NOT |
|------|---------|----------|
| **System Architect** | Designs constitutions, schemas, invariants | Generate user-facing content |
| **Content Generator** | Generates lessons, word lists, passages | Invent pedagogy or structure |
| **QA / Red Team** | Validates and rejects non-compliant outputs | Approve without verification |
| **Builder / Operator** | Implements app code, scripts, packaging | Invent pedagogy or structure |

## Quick Start

### For Content Generation

1. Review `constitution/` documents
2. Review `schemas/lesson_schema.json`
3. Follow `pipelines/lesson_generation_pipeline.md`
4. Run QA using `qa/checklists/`

### For App Development

1. Review `constitution/app_constraints.md`
2. Review `schemas/app_screen_schema.json`
3. Follow `pipelines/app_code_generation_pipeline.md`
4. Test on BOOX Go Color 7 Gen II

### For Beta Operations

1. Review `beta_ops/onboarding/`
2. Use `beta_ops/observation_forms/` during testing
3. Conduct parent interviews using provided scripts

## Beta Goals

- **Duration:** 2–4 weeks
- **Participants:** 5–10 kids, ages 4–7
- **Sessions:** 3–5 per week, 8–12 minutes each

### Success Criteria

- Kids can use it independently after 1–2 uses
- Parents say "this does not feel like screen time"
- Kids show improvement in decoding confidence/accuracy
- UX does not trigger frantic tapping or compulsive behavior

## Documentation

- [Plan Overview](plan_overview.md)
- [Calm Design Constitution](constitution/calm_design.md)
- [Educational Constitution](constitution/educational.md)
- [App Constraints Constitution](constitution/app_constraints.md)
- [Runbook](runbook.md)
- [Known Risks & Decisions](known_risks_decisions.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-11 | Initial foundation release |

## License

Proprietary. All rights reserved.
