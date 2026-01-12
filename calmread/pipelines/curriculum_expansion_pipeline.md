# Curriculum Expansion Pipeline

**Version:** 1.0.0  
**Last Updated:** January 11, 2026

## Overview

This pipeline generates multiple lessons in sequence, ensuring review cadence, constraint integrity, and batch QA validation. Use this when expanding the curriculum beyond initial lessons.

## Pipeline Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Scope/Sequence  │────▶│  Batch Lesson   │────▶│  Cumulative     │
│   (N lessons)   │     │   Generation    │     │  Validation     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Approved     │◀────│   Batch QA      │◀────│  Review Check   │
│    Lessons      │     │   Report        │     │  (Cadence)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## When to Use

| Scenario | Use This Pipeline |
|----------|-------------------|
| Generate 5+ lessons at once | Yes |
| Expand curriculum to new phase | Yes |
| Generate single lesson | No (use Lesson Generation Pipeline) |
| Fix individual lesson | No (use Lesson Generation Pipeline) |

## Inputs

| Input | Source | Description |
|-------|--------|-------------|
| Scope/Sequence | `curriculum/scope_sequence_v1.json` | Full curriculum plan |
| Lesson Range | Human specified | Which lessons to generate |
| Existing Lessons | `curriculum/lessons/` | For continuity check |
| All Schemas | `schemas/` | Structure definitions |
| All Constitutions | `constitution/` | Design rules |

## Outputs

| Output | Destination | Description |
|--------|-------------|-------------|
| N lesson.json files | `curriculum/lessons/` | Complete lessons |
| Batch QA Report | `qa/reports/` | Combined validation |
| Cumulative Word List | `curriculum/` | All words across lessons |
| Review Cadence Report | `qa/reports/` | Review coverage analysis |

## Step-by-Step Process

### Step 1: Define Batch Scope

**Actor:** Human Conductor

Specify which lessons to generate:

```yaml
Batch Request:
  start_lesson: lesson_06
  end_lesson: lesson_10
  total_lessons: 5
  phase: "phase_02"
  
Prerequisites:
  - lessons 01-05 must exist
  - scope_sequence_v1.json must define lessons 06-10
```

### Step 2: Extract Batch Entries

**Actor:** Human Conductor

Extract all lesson entries for the batch:

```json
{
  "batch": [
    {
      "lessonId": "lesson_06",
      "title": "Short I Introduction",
      "taughtPatterns": [{"grapheme": "i", "phoneme": "/ɪ/", "isNew": true}],
      "allowedGraphemes": ["m", "s", "t", "a", "p", "n", "i"],
      "reviewOf": ["lesson_03", "lesson_04", "lesson_05"]
    },
    {
      "lessonId": "lesson_07",
      "title": "Short I Practice",
      "taughtPatterns": [{"grapheme": "i", "phoneme": "/ɪ/", "isNew": false}],
      "allowedGraphemes": ["m", "s", "t", "a", "p", "n", "i"],
      "reviewOf": ["lesson_06"]
    },
    // ... lessons 08-10
  ]
}
```

### Step 3: Verify Prerequisites

**Actor:** Human Conductor

Before generating, verify:

- [ ] All prerequisite lessons exist
- [ ] Scope/sequence entries are complete
- [ ] No gaps in grapheme progression
- [ ] Review references are valid

### Step 4: Generate Lessons Sequentially

**Actor:** Content Generator (ROLE_B)

Generate each lesson in order, using this batch prompt:

```
You are the CalmRead Content Generator (ROLE_B).

=== BATCH GENERATION TASK ===
Generate lessons [START] through [END] in sequence.

=== BATCH CONTEXT ===
This is a batch generation. You must:
1. Generate lessons in order
2. Ensure cumulative grapheme progression
3. Include appropriate review content
4. Maintain consistency across lessons

=== LESSON ENTRIES ===
[Paste all lesson entries from scope/sequence]

=== CUMULATIVE STATE ===
After lesson [PREVIOUS]:
- All allowed graphemes: [list]
- All sight words: [list]
- All taught patterns: [list]

=== GENERATION ORDER ===
For each lesson in sequence:
1. Generate complete lesson.json
2. Update cumulative state
3. Verify review content references prior lessons
4. Self-validate before proceeding to next

=== OUTPUT ===
For each lesson:
- lesson.json
- audio_scripts.md
- self_validation.md

Plus batch summary:
- cumulative_words.md
- review_coverage.md
```

### Step 5: Cumulative Validation

**Actor:** Content Generator (ROLE_B)

After generating all lessons, produce cumulative validation:

```markdown
## Cumulative Validation Report

### Grapheme Progression
| Lesson | New Graphemes | Cumulative | Valid? |
|--------|---------------|------------|--------|
| 06     | i             | m,s,t,a,p,n,i | ✓ |
| 07     | (none)        | m,s,t,a,p,n,i | ✓ |
| 08     | (none)        | m,s,t,a,p,n,i | ✓ |
| 09     | d             | m,s,t,a,p,n,i,d | ✓ |
| 10     | (review)      | m,s,t,a,p,n,i,d | ✓ |

### Review Cadence Check
| Lesson | Reviews | Lessons Ago | Intensity | Valid? |
|--------|---------|-------------|-----------|--------|
| 06     | 03,04,05 | 1-3        | Heavy     | ✓ |
| 07     | 06       | 1          | Heavy     | ✓ |
| 08     | 05,06,07 | 1-3        | Heavy     | ✓ |
| 09     | 07,08    | 1-2        | Heavy     | ✓ |
| 10     | 01-09    | 1-9        | Mixed     | ✓ |

### Word Uniqueness Check
Total unique words across batch: 45
Repeated words (intentional review): 12
New words per lesson average: 8.6

### Cross-Lesson Consistency
✓ No grapheme leaks (future graphemes appearing early)
✓ Review references valid
✓ Sight word progression consistent
✓ Difficulty progression appropriate
```

### Step 6: Review Cadence Verification

**Actor:** QA/Red Team (ROLE_C)

Verify review cadence follows rules:

```markdown
## Review Cadence Audit

### Rules Applied
From scope_sequence.json reviewCadence:
- Lessons 1-3 ago: Heavy review
- Lessons 4-10 ago: Moderate review
- Lessons 10+ ago: Maintenance review

### Audit Results

| Lesson | Should Review | Actually Reviews | Gap? |
|--------|---------------|------------------|------|
| 06     | 03,04,05 (heavy) | 03,04,05 | None |
| 07     | 06 (heavy), 04,05 (mod) | 06 | ⚠️ Missing 04,05 |
| 08     | 06,07 (heavy), 05 (mod) | 05,06,07 | None |
| 09     | 07,08 (heavy), 06 (mod) | 07,08 | ⚠️ Missing 06 |
| 10     | 08,09 (heavy), 06,07 (mod) | 01-09 | None |

### Issues Found
1. Lesson 07: Missing moderate review of lessons 04, 05
2. Lesson 09: Missing moderate review of lesson 06

### Recommendations
- Add review words from lesson 04/05 to lesson 07
- Add review words from lesson 06 to lesson 09
```

### Step 7: Batch QA Review

**Actor:** QA/Red Team (ROLE_C)

Review entire batch:

```
You are the CalmRead QA/Red Team (ROLE_C).

=== BATCH QA TASK ===
Validate lessons [START] through [END] as a batch.

=== CONTENT TO REVIEW ===
[All lesson.json files]

=== BATCH-SPECIFIC CHECKS ===
In addition to individual lesson validation:

1. PROGRESSION CHECK
   - Graphemes introduced in correct order
   - No future graphemes appearing early
   - Difficulty increases appropriately

2. REVIEW CADENCE CHECK
   - Each lesson reviews appropriate prior content
   - Heavy/moderate/maintenance cadence followed
   - No orphaned content (never reviewed)

3. CONSISTENCY CHECK
   - Sight words consistent across lessons
   - Terminology consistent
   - Tone consistent

4. CUMULATIVE WORD CHECK
   - No duplicate words (except intentional review)
   - Word count per lesson appropriate
   - Vocabulary progression reasonable

=== OUTPUT ===
Batch QA Report with:
- Individual lesson verdicts
- Batch-level findings
- Overall PASS/FAIL
```

### Step 8: Process Batch Verdict

**Actor:** Human Conductor

| Verdict | Action |
|---------|--------|
| PASS | Proceed to audio generation for all |
| PARTIAL | Fix failed lessons, re-validate those only |
| FAIL | Identify systemic issues, regenerate batch |

### Step 9: Archive and Proceed

**Actor:** Human Conductor

If PASS:
1. Move all lesson.json to `curriculum/lessons/`
2. Archive batch QA report
3. Update cumulative tracking documents
4. Proceed to Audio Generation Pipeline (batch mode)

## Batch Prompt Template

```
You are the CalmRead Content Generator (ROLE_B).

=== BATCH GENERATION: [PHASE_NAME] ===

Generate [N] lessons in sequence: [LESSON_IDS]

=== SCOPE/SEQUENCE ENTRIES ===
[Paste all entries]

=== CUMULATIVE STATE BEFORE BATCH ===
Graphemes taught: [list]
Sight words taught: [list]
Lessons completed: [list]

=== BATCH REQUIREMENTS ===

1. SEQUENTIAL GENERATION
   - Generate in order: [first] → [last]
   - Each lesson builds on previous
   - Update cumulative state after each

2. REVIEW CADENCE
   - Heavy review: content from 1-3 lessons ago
   - Moderate review: content from 4-10 lessons ago
   - Each lesson must include appropriate review

3. CONSISTENCY
   - Same terminology throughout
   - Same tone throughout
   - Coherent difficulty progression

4. VALIDATION
   - Self-validate each lesson
   - Cross-validate batch
   - Report any issues

=== OUTPUT PER LESSON ===
- lesson.json (complete)
- audio_scripts.md
- self_validation.md

=== BATCH SUMMARY OUTPUT ===
- cumulative_validation.md
- review_coverage.md
- word_list_cumulative.md
```

## Review Cadence Rules

```json
{
  "reviewCadence": {
    "rules": [
      {
        "lessonsAgo": {"min": 1, "max": 3},
        "reviewIntensity": "heavy",
        "description": "Recent content - heavy review"
      },
      {
        "lessonsAgo": {"min": 4, "max": 10},
        "reviewIntensity": "moderate",
        "description": "Older content - moderate review"
      },
      {
        "lessonsAgo": {"min": 11, "max": null},
        "reviewIntensity": "maintenance",
        "description": "Mastered content - maintenance review"
      }
    ],
    "reviewLessonFrequency": 5
  }
}
```

### Implementation

| Intensity | Words to Include | Graphemes to Review |
|-----------|------------------|---------------------|
| Heavy | 4-6 words | All from referenced lessons |
| Moderate | 2-3 words | Key patterns only |
| Maintenance | 1-2 words | Mixed sampling |

## Error Handling

| Error | Resolution |
|-------|------------|
| Grapheme leak (future grapheme appears) | Regenerate affected lesson |
| Missing review content | Add review items |
| Inconsistent terminology | Standardize across batch |
| Batch QA failure | Identify pattern, fix systematically |

## Quality Gates

| Gate | Criteria | Owner |
|------|----------|-------|
| Individual Validation | Each lesson self-validates | Content Generator |
| Cumulative Validation | Progression is correct | Content Generator |
| Review Cadence | Cadence rules followed | QA/Red Team |
| Batch QA | All lessons PASS | QA/Red Team |

## Metrics

Track for each batch:

| Metric | Target |
|--------|--------|
| Lessons per batch | 5-10 |
| First-pass QA rate | ≥ 80% |
| Regeneration rate | ≤ 20% |
| Time per lesson | < 20 minutes |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-11 | Initial pipeline |
