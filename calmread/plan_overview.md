# CalmRead Plan Overview

**Version:** 1.0.0  
**Last Updated:** January 11, 2026

## Executive Summary

CalmRead is a dedicated e-ink reading platform designed to teach foundational reading skills to children ages 4–8 using structured literacy approaches. The platform intentionally avoids the cognitive and behavioral pitfalls of conventional screen time by enforcing calm, predictable, bounded interactions.

This document provides a high-level overview of the project plan, including goals, phases, deliverables, and success criteria.

## Product Vision

### Core Value Proposition

CalmRead is a "reading instrument" — not a tablet, not a game, not entertainment. It provides:

1. **Structured Literacy Instruction:** Explicit, systematic, cumulative phonics instruction
2. **Calm User Experience:** No gamification, no infinite feeds, no variable rewards
3. **Offline-First Operation:** Works without internet, accounts, or cloud dependencies
4. **Scalable Content System:** AI pipelines generate and validate content at scale

### Target User

- **Primary User:** Children ages 4–8 learning to read
- **Secondary User:** Parents/caregivers who want educational screen time alternatives
- **Use Context:** Home reading practice, bedtime reading, independent learning

## Beta Phase Plan

### Objectives

1. Prove the core value proposition in real homes
2. Validate the "calm" design principles with actual children
3. Gather data on learning outcomes and user behavior
4. Identify friction points and improvement opportunities

### Scope

| Parameter | Value |
|-----------|-------|
| Participants | 5–10 children |
| Age Range | 4–7 years |
| Duration | 2–4 weeks |
| Session Frequency | 3–5 sessions/week |
| Session Length | 8–12 minutes |

### Success Criteria

| Criterion | Measurement |
|-----------|-------------|
| Independent Use | Kids can use after 1–2 demonstrations |
| Calm Perception | Parents report "doesn't feel like screen time" |
| Learning Progress | Improvement in decoding confidence/accuracy |
| Behavioral Safety | No frantic tapping or compulsive behavior |

### Measurements

**Quantitative:**
- Letter-sound knowledge (pre/post)
- Blending ability (small word set)
- Decoding novel CVC words
- Decoding nonsense CVC words

**Qualitative:**
- Child behavior observation (calm vs. frantic)
- Parent perception interviews
- Completion rates and friction points
- Bedtime impact assessment

## Technical Architecture

### Hardware Platform

**Device:** BOOX Go Color 7 (Gen II)

| Feature | Requirement |
|---------|-------------|
| Display | E-ink color, page-based navigation |
| Input | Touch (minimal, predictable interactions) |
| Audio Output | Speaker for playback |
| Audio Input | Microphone for read-aloud recording |
| Mode | Kiosk-locked single-purpose app |
| Connectivity | Offline-first (no network required) |

### Software Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CalmRead App                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Lesson    │  │   Audio     │  │     Recording       │  │
│  │   Loader    │  │   Player    │  │     Manager         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    Page     │  │  Progress   │  │      Session        │  │
│  │  Renderer   │  │   Tracker   │  │      Manager        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                   Local File System                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  /lessons/lesson_XX/                                    ││
│  │    ├── lesson.json                                      ││
│  │    ├── pages/                                           ││
│  │    ├── words/                                           ││
│  │    ├── prompts/                                         ││
│  │    └── recordings/                                      ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Content Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Content Pipeline                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │    Scope     │───▶│   Lesson     │───▶│     QA       │  │
│  │   Sequence   │    │  Generator   │    │   Validator  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                             │                    │          │
│                             ▼                    ▼          │
│                      ┌──────────────┐    ┌──────────────┐  │
│                      │    Audio     │    │   Approved   │  │
│                      │  Generator   │───▶│   Lesson     │  │
│                      └──────────────┘    │   Bundle     │  │
│                                          └──────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Foundation (Current)

**Deliverables:**
- Complete repository structure
- All constitution documents
- All schema definitions
- AI role definitions
- Pipeline documentation
- Initial scope/sequence (20 lessons)
- 5 complete lesson bundles
- QA checklists
- Beta operations materials

**Status:** In Progress

### Phase 2: App Development

**Deliverables:**
- Android app shell
- Lesson loader
- Page renderer (page-based, no scrolling)
- Audio playback
- Audio recording
- Simple progress tracking
- Kiosk mode implementation

**Dependencies:** Phase 1 complete

### Phase 3: Content Generation

**Deliverables:**
- Complete 20-lesson curriculum
- All audio assets generated
- All lessons QA validated
- Lesson bundles packaged

**Dependencies:** Phase 1 complete, Phase 2 in progress

### Phase 4: Beta Testing

**Deliverables:**
- Recruited beta families
- Onboarded participants
- Collected observation data
- Conducted parent interviews
- Analyzed results
- Documented learnings

**Dependencies:** Phase 2 and 3 complete

### Phase 5: Iteration

**Deliverables:**
- Addressed beta feedback
- Refined content and UX
- Updated documentation
- Prepared for broader release

**Dependencies:** Phase 4 complete

## Risk Management

See [Known Risks & Decisions](known_risks_decisions.md) for detailed risk analysis.

### Key Risks

| Risk | Mitigation |
|------|------------|
| E-ink refresh rate limits karaoke | Use line/phrase highlighting, not word-by-word |
| Children find it "boring" | Validate calm design with real users in beta |
| Audio recording quality issues | Test extensively on target device |
| Kiosk escape by children | Implement device-level + app-level hardening |

## Resource Requirements

### Beta Phase

| Resource | Quantity | Notes |
|----------|----------|-------|
| BOOX Go Color 7 devices | 5–10 | One per beta family |
| Content lessons | 20 | Initial curriculum |
| Audio assets | ~200 files | Words, prompts, passages |
| Beta families | 5–10 | Recruited and onboarded |

### Development

| Resource | Requirement |
|----------|-------------|
| Android Development | Kotlin/Java, Android SDK |
| Audio Generation | TTS service (calm voice) |
| Content Generation | AI pipeline execution |
| QA | Manual review + automated validation |

## Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Foundation | 1 week | Week 1 | Week 1 |
| App Development | 3 weeks | Week 2 | Week 4 |
| Content Generation | 2 weeks | Week 2 | Week 3 |
| Beta Preparation | 1 week | Week 4 | Week 4 |
| Beta Testing | 4 weeks | Week 5 | Week 8 |
| Analysis & Iteration | 2 weeks | Week 9 | Week 10 |

## Governance

### Decision Authority

| Decision Type | Authority |
|---------------|-----------|
| Constitution changes | System Architect role |
| Schema changes | System Architect role |
| Content approval | QA Red Team role |
| App implementation | Builder/Operator role |
| Beta operations | Human conductor |

### Change Control

1. All changes to constitutions require version increment
2. Schema changes require backward compatibility analysis
3. Content changes require QA validation
4. App changes require calm design review

## Next Steps

1. Complete foundation repository (this phase)
2. Begin Android app development
3. Generate remaining 15 lessons
4. Generate all audio assets
5. Recruit beta families
6. Begin beta testing

## Appendices

- [Calm Design Constitution](constitution/calm_design.md)
- [Educational Constitution](constitution/educational.md)
- [App Constraints Constitution](constitution/app_constraints.md)
- [Lesson Schema](schemas/lesson_schema.json)
- [Scope & Sequence](curriculum/scope_sequence_v1.json)
- [Runbook](runbook.md)
