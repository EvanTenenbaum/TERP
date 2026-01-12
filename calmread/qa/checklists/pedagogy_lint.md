# Pedagogy Lint Checklist

**Version:** 1.0.0  
**Last Updated:** January 11, 2026  
**Purpose:** Validate content against Educational Constitution

## How to Use This Checklist

1. Review each item against the lesson content being validated
2. Mark each item as PASS (✓), FAIL (✗), or N/A (-)
3. For any FAIL, document the specific violation with evidence
4. Grapheme violations are BLOCKERS - automatic fail
5. Calculate final score based on severity weights

## Grapheme Control Checklist (CRITICAL)

### Word Validation

For EVERY word in decodable content:

| Word | Graphemes | All Allowed? | In Banned? | Sight Word? | Status |
|------|-----------|--------------|------------|-------------|--------|
| | | | | | |

**Validation Rules:**
- [ ] Every word segmented into individual graphemes
- [ ] Every grapheme checked against `allowedGraphemes`
- [ ] No grapheme appears in `bannedGraphemes`
- [ ] Sight words are in `cumulativeSightWords` list
- [ ] Proper nouns use only allowed graphemes

### Decodable Text Validation

| ID | Check | Status | Notes |
|----|-------|--------|-------|
| GC-001 | All words validated | [ ] | |
| GC-002 | No banned graphemes | [ ] | |
| GC-003 | Sight words approved | [ ] | |
| GC-004 | Target patterns present | [ ] | |
| GC-005 | Decodable percentage ≥ 80% | [ ] | |

### Pattern Compliance

| ID | Check | Status | Notes |
|----|-------|--------|-------|
| PC-001 | Target patterns appear 5+ times | [ ] | |
| PC-002 | No unauthorized patterns | [ ] | |
| PC-003 | Review patterns included | [ ] | |
| PC-004 | Patterns match scope/sequence | [ ] | |

## Instructional Approach Checklist

### Explicit Instruction

| ID | Requirement | Check | Status | Notes |
|----|-------------|-------|--------|-------|
| EI-001 | Teacher models first | "I do" phase present | [ ] | |
| EI-002 | Guided practice | "We do" phase present | [ ] | |
| EI-003 | Independent practice | "You do" phase present | [ ] | |
| EI-004 | Clear explanations | No ambiguity in instructions | [ ] | |
| EI-005 | Direct teaching | Not discovery-based | [ ] | |

### Systematic Progression

| ID | Requirement | Check | Status | Notes |
|----|-------------|-------|--------|-------|
| SP-001 | Follows scope/sequence | Lesson matches plan | [ ] | |
| SP-002 | Builds on prior knowledge | References previous lessons | [ ] | |
| SP-003 | Appropriate difficulty | Not too easy or hard | [ ] | |
| SP-004 | Logical skill sequence | Skills build on each other | [ ] | |
| SP-005 | No skipped steps | All prerequisites covered | [ ] | |

### Cumulative Review

| ID | Requirement | Check | Status | Notes |
|----|-------------|-------|--------|-------|
| CR-001 | Reviews prior graphemes | Previous sounds practiced | [ ] | |
| CR-002 | Reviews prior words | Previous words included | [ ] | |
| CR-003 | Heavy review (1-3 lessons ago) | Recent content emphasized | [ ] | |
| CR-004 | Moderate review (4-10 lessons) | Older content maintained | [ ] | |
| CR-005 | Maintenance review (10+) | Mastered content touched | [ ] | |

### Practice-Rich

| ID | Requirement | Check | Status | Notes |
|----|-------------|-------|--------|-------|
| PR-001 | Multiple practice opportunities | ≥ 3 practice activities | [ ] | |
| PR-002 | Varied practice types | Different activity formats | [ ] | |
| PR-003 | Sufficient word exposure | Each word seen 3+ times | [ ] | |
| PR-004 | Connected text reading | Sentences/passages included | [ ] | |
| PR-005 | Recording opportunity | Child reads aloud | [ ] | |

## Step Type Validation

### Required Steps (Instruction Lessons)

| Step Type | Required? | Present? | Status |
|-----------|-----------|----------|--------|
| review | Yes | [ ] | |
| phonemic_awareness | Yes (new pattern) | [ ] | |
| explicit_phonics | Yes (new pattern) | [ ] | |
| blending_practice | Yes | [ ] | |
| decodable_read | Yes | [ ] | |
| record_read_aloud | Yes | [ ] | |
| comprehension_prompt | Yes | [ ] | |
| completion | Yes | [ ] | |

### Step Sequence

| ID | Check | Status | Notes |
|----|-------|--------|-------|
| SS-001 | Review comes first | [ ] | |
| SS-002 | New content before practice | [ ] | |
| SS-003 | Guided before independent | [ ] | |
| SS-004 | Reading before comprehension | [ ] | |
| SS-005 | Completion is last | [ ] | |

## Interactivity Checklist

### Congruent Interactions

| ID | Requirement | Check | Status | Notes |
|----|-------------|-------|--------|-------|
| CI-001 | All interactions support learning | No distracting activities | [ ] | |
| CI-002 | Interactions match objectives | Activity aligns with goal | [ ] | |
| CI-003 | No illustration hotspots | Pictures don't have clickable areas | [ ] | |
| CI-004 | No mini-games | No game-like activities | [ ] | |
| CI-005 | No drag-and-drop games | No gamified interactions | [ ] | |

### Allowed Interaction Types

| Type | Allowed | Present | Appropriate Use? |
|------|---------|---------|------------------|
| tap_continue | Yes | [ ] | [ ] |
| select_letter | Yes | [ ] | [ ] |
| select_answer | Yes | [ ] | [ ] |
| record_audio | Yes | [ ] | [ ] |
| tap_word | Yes | [ ] | [ ] |
| tap_finish | Yes | [ ] | [ ] |

### Forbidden Interaction Types

| Type | Present? | Location | Severity |
|------|----------|----------|----------|
| drag_drop | [ ] | | CRITICAL |
| swipe_game | [ ] | | CRITICAL |
| tap_illustration | [ ] | | MAJOR |
| timed_response | [ ] | | CRITICAL |
| competitive_element | [ ] | | BLOCKER |

## Comprehension Checklist

### Question Types

| ID | Requirement | Check | Status | Notes |
|----|-------------|-------|--------|-------|
| CQ-001 | Questions are literal only | Answer directly in text | [ ] | |
| CQ-002 | No inferential questions | No "why do you think..." | [ ] | |
| CQ-003 | No opinion questions | No "how do you feel..." | [ ] | |
| CQ-004 | No prediction questions | No "what will happen..." | [ ] | |
| CQ-005 | Age-appropriate language | Child can understand question | [ ] | |

### Response Format

| ID | Requirement | Check | Status | Notes |
|----|-------------|-------|--------|-------|
| RF-001 | Clear answer options | Options are distinct | [ ] | |
| RF-002 | One correct answer | No ambiguity | [ ] | |
| RF-003 | Distractors are plausible | Wrong answers make sense | [ ] | |
| RF-004 | No trick questions | Straightforward | [ ] | |

## Assessment Checklist

### Forbidden Assessment Elements

| Element | Present? | Location | Severity |
|---------|----------|----------|----------|
| Child-facing scores | [ ] | | BLOCKER |
| Percentage correct | [ ] | | BLOCKER |
| Letter grades | [ ] | | BLOCKER |
| Pass/fail indicators | [ ] | | CRITICAL |
| Comparative rankings | [ ] | | BLOCKER |
| Timed assessments | [ ] | | CRITICAL |

### Allowed Progress Indicators

| Element | Allowed | Present | Appropriate? |
|---------|---------|---------|--------------|
| Page X of Y | Yes | [ ] | [ ] |
| Step indicator (dots) | Yes | [ ] | [ ] |
| Lesson completion | Yes | [ ] | [ ] |
| "All Done" message | Yes | [ ] | [ ] |

## Content Quality Checklist

### Age Appropriateness

| ID | Check | Status | Notes |
|----|-------|--------|-------|
| AA-001 | Vocabulary appropriate | Words child understands | [ ] | |
| AA-002 | Concepts appropriate | Ideas child can grasp | [ ] | |
| AA-003 | Sentence length appropriate | Not too complex | [ ] | |
| AA-004 | Content is safe | No scary/inappropriate content | [ ] | |
| AA-005 | Culturally sensitive | Inclusive content | [ ] | |

### Story Quality (Decodable Text)

| ID | Check | Status | Notes |
|----|-------|--------|-------|
| SQ-001 | Coherent narrative | Story makes sense | [ ] | |
| SQ-002 | Engaging content | Interesting to child | [ ] | |
| SQ-003 | Appropriate length | 4-6 sentences | [ ] | |
| SQ-004 | Clear subject | Who/what is clear | [ ] | |
| SQ-005 | Simple plot | Easy to follow | [ ] | |

## Schema Compliance Checklist

### Required Fields

| Field | Present | Valid Type | Valid Value |
|-------|---------|------------|-------------|
| lessonId | [ ] | [ ] | [ ] |
| version | [ ] | [ ] | [ ] |
| title | [ ] | [ ] | [ ] |
| lessonNumber | [ ] | [ ] | [ ] |
| type | [ ] | [ ] | [ ] |
| objectives | [ ] | [ ] | [ ] |
| graphemeConstraints | [ ] | [ ] | [ ] |
| steps | [ ] | [ ] | [ ] |
| wordList | [ ] | [ ] | [ ] |
| audioAssets | [ ] | [ ] | [ ] |
| metadata | [ ] | [ ] | [ ] |

### Data Validation

| ID | Check | Status | Notes |
|----|-------|--------|-------|
| DV-001 | lessonId matches pattern | lesson_XX | [ ] | |
| DV-002 | version matches pattern | X.X.X | [ ] | |
| DV-003 | lessonNumber is positive integer | | [ ] | |
| DV-004 | type is valid enum | instruction/review | [ ] | |
| DV-005 | All step IDs unique | | [ ] | |

## Scoring

### Severity Weights

| Severity | Points Deducted | Effect |
|----------|-----------------|--------|
| BLOCKER | -100 | Auto-fail |
| CRITICAL | -25 | Must fix |
| MAJOR | -10 | Should fix |
| MINOR | -2 | Track |

### Category Weights

| Category | Weight |
|----------|--------|
| Grapheme Control | 40% |
| Instructional Approach | 25% |
| Interactivity | 15% |
| Comprehension | 10% |
| Schema Compliance | 10% |

### Score Calculation

```
Base Score: 100
Final Score = 100 - (weighted sum of deductions)

PASS: Score ≥ 80, no BLOCKERS
CONDITIONAL: Score ≥ 60, no BLOCKERS
FAIL: Score < 60 OR any BLOCKERS
```

## Report Template

```markdown
# Pedagogy Lint Report

**Lesson:** [lesson_id]
**Date:** [timestamp]
**Reviewer:** [name/role]

## Summary

| Category | Items | Pass | Fail | N/A |
|----------|-------|------|------|-----|
| Grapheme Control | | | | |
| Instructional Approach | | | | |
| Step Validation | | | | |
| Interactivity | | | | |
| Comprehension | | | | |
| Content Quality | | | | |
| Schema Compliance | | | | |

**Score:** [XX/100]
**Verdict:** [PASS/CONDITIONAL/FAIL]

## Word Validation Table

| Word | Graphemes | Allowed? | Status |
|------|-----------|----------|--------|
| | | | |

## Blockers

[List any blockers]

## Critical Issues

[List critical issues]

## Major Issues

[List major issues]

## Recommendations

[List recommendations]
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-11 | Initial checklist |
