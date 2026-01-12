# Lesson Generation Pipeline

**Version:** 1.0.0  
**Last Updated:** January 11, 2026

## Overview

This pipeline generates a single complete lesson from a scope/sequence entry. It involves the Content Generator role for creation and the QA/Red Team role for validation.

## Pipeline Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Scope/Sequence │────▶│    Content      │────▶│   Self-Check    │
│     Entry       │     │   Generator     │     │   Validation    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Approved     │◀────│   QA/Red Team   │◀────│  lesson.json    │
│     Lesson      │     │   Validation    │     │  + Audio Scripts│
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │
        ▼
┌─────────────────┐
│  Ready for      │
│  Audio Gen      │
└─────────────────┘
```

## Inputs

| Input | Source | Description |
|-------|--------|-------------|
| Scope/Sequence Entry | `curriculum/scope_sequence_v1.json` | Lesson specification |
| Lesson Schema | `schemas/lesson_schema.json` | Structure definition |
| Educational Constitution | `constitution/educational.md` | Pedagogical rules |
| Calm Design Constitution | `constitution/calm_design.md` | UX rules |
| Prior Lessons | `curriculum/lessons/` | For review content |

## Outputs

| Output | Destination | Description |
|--------|-------------|-------------|
| lesson.json | `curriculum/lessons/lesson_XX/` | Complete lesson file |
| Audio Scripts | `curriculum/lessons/lesson_XX/scripts/` | Text for TTS |
| Self-Validation Report | `qa/reports/` | Generator's self-check |
| QA Report | `qa/reports/` | Red Team validation |

## Step-by-Step Process

### Step 1: Extract Scope Entry

**Actor:** Human Conductor

**Action:** Identify the lesson to generate from scope/sequence.

```json
// Example: Extract lesson_03 entry from scope_sequence_v1.json
{
  "lessonId": "lesson_03",
  "lessonNumber": 3,
  "title": "Short A with M, S, T",
  "type": "instruction",
  "taughtPatterns": [
    {"grapheme": "a", "phoneme": "/æ/", "isNew": true}
  ],
  "allowedGraphemes": ["m", "s", "t", "a"],
  "bannedGraphemes": ["b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "n", "o", "p", "q", "r", "u", "v", "w", "x", "y", "z"],
  "newSightWords": ["the"],
  "cumulativeSightWords": ["the"],
  "reviewOf": ["lesson_01", "lesson_02"]
}
```

### Step 2: Invoke Content Generator

**Actor:** Content Generator (ROLE_B)

**Prompt Template:**

```
You are the CalmRead Content Generator (ROLE_B).

TASK: Generate a complete lesson following the lesson schema.

LESSON SPECIFICATION:
- Lesson ID: lesson_03
- Title: Short A with M, S, T
- Target Patterns: short 'a' (/æ/)
- Allowed Graphemes: m, s, t, a
- Banned Graphemes: [all others]
- Sight Words Available: the
- Review Lessons: lesson_01 (m, /m/), lesson_02 (s, t)

REFERENCE DOCUMENTS:
1. Lesson Schema: schemas/lesson_schema.json
2. Educational Constitution: constitution/educational.md
3. Calm Design Constitution: constitution/calm_design.md

REQUIREMENTS:
1. Generate complete lesson.json with ALL required fields
2. Include these step types:
   - review (prior graphemes m, s, t)
   - phonemic_awareness (short a sound)
   - explicit_phonics (letter a = /æ/)
   - blending_practice (CVC words with a)
   - decodable_read (short passage)
   - record_read_aloud (child reads)
   - comprehension_prompt (1-2 questions)

3. Word list must include:
   - At least 8 target pattern words (CVC with short a)
   - At least 4 review words (from prior lessons)
   - ALL words validated against allowed graphemes

4. Decodable text must:
   - Use ONLY allowed graphemes + sight words
   - Be 4-6 sentences
   - Tell a simple, age-appropriate story
   - Feature the target pattern prominently

5. Self-validate all content before output

OUTPUT FORMAT:
1. Complete lesson.json
2. Audio scripts document
3. Self-validation report
```

### Step 3: Content Generator Output

**Expected Output Structure:**

```
curriculum/lessons/lesson_03/
├── lesson.json           # Complete lesson data
├── scripts/
│   ├── instructions.md   # Narration scripts
│   ├── words.md          # Word pronunciation list
│   └── prompts.md        # Prompt scripts
└── self_validation.md    # Generator's self-check
```

### Step 4: Self-Validation Check

**Actor:** Content Generator (ROLE_B)

The Content Generator must produce a self-validation report:

```markdown
## Self-Validation Report: lesson_03

### Word Validation
| Word | Graphemes | All Allowed? | Status |
|------|-----------|--------------|--------|
| mat  | m-a-t     | ✓            | PASS   |
| sat  | s-a-t     | ✓            | PASS   |
| tam  | t-a-m     | ✓            | PASS   |
| at   | a-t       | ✓            | PASS   |
| Sam  | s-a-m     | ✓            | PASS   |
| Tam  | t-a-m     | ✓            | PASS   |
| am   | a-m       | ✓            | PASS   |
| as   | a-s       | ✓            | PASS   |

Total: 8 words, 8 passed, 0 failed

### Decodable Text Validation
Passage: "Sam sat. Sam sat on a mat. Tam sat. Tam sat on the mat."

| Word | Allowed? | Sight Word? | Status |
|------|----------|-------------|--------|
| Sam  | ✓        | No          | PASS   |
| sat  | ✓        | No          | PASS   |
| on   | ✗        | No          | FAIL   |
| a    | ✓        | No          | PASS   |
| mat  | ✓        | No          | PASS   |
| the  | ✗        | Yes         | PASS   |

⚠️ ISSUE FOUND: "on" is not in allowed graphemes or sight words
ACTION: Replace with allowed alternative or add to sight words

### Schema Compliance
✓ All required fields present
✓ lessonId format correct
✓ Version format correct
✓ Steps array valid

### Recommendation
NEEDS REVISION - Fix "on" issue before QA review
```

### Step 5: Revise if Needed

**Actor:** Content Generator (ROLE_B)

If self-validation finds issues, revise before proceeding:

```
REVISION NEEDED:
- Issue: "on" not allowed
- Fix: Change "Sam sat on a mat" to "Sam sat. A mat. Sam sat at a mat."
- Or: Add "on" to sight words if approved

Revised passage: "Sam sat. Sam sat at a mat. Tam sat. Tam sat at the mat."
```

### Step 6: QA/Red Team Validation

**Actor:** QA/Red Team (ROLE_C)

**Prompt Template:**

```
You are the CalmRead QA/Red Team (ROLE_C).

TASK: Validate lesson_03 for compliance with all constitutions and schemas.

CONTENT TO REVIEW:
[Paste complete lesson.json here]

REFERENCE DOCUMENTS:
1. Calm Design Constitution: constitution/calm_design.md
2. Educational Constitution: constitution/educational.md
3. App Constraints Constitution: constitution/app_constraints.md
4. Lesson Schema: schemas/lesson_schema.json
5. Scope/Sequence: curriculum/scope_sequence_v1.json

VALIDATION REQUIREMENTS:
1. Phonics/Grapheme Check
   - Every word segmented and validated
   - No banned graphemes
   - Sight words in approved list

2. Calm Design Audit
   - No gamification
   - No variable rewards
   - Clear endpoint
   - Highlighting policy compliant

3. Educational Audit
   - Explicit instruction present
   - Follows scope/sequence
   - Reviews prior content
   - Comprehension questions literal

4. Schema Compliance
   - All required fields
   - Correct data types
   - Valid patterns

OUTPUT:
Complete QA Report with PASS/FAIL verdict
```

### Step 7: Process QA Verdict

**Actor:** Human Conductor

| Verdict | Action |
|---------|--------|
| PASS | Proceed to audio generation |
| CONDITIONAL | Apply required fixes, re-validate |
| FAIL | Return to Content Generator with issues |

### Step 8: Archive and Proceed

**Actor:** Human Conductor

If PASS:
1. Move lesson.json to `curriculum/lessons/lesson_03/`
2. Archive QA report to `qa/reports/lesson_03_qa_report.md`
3. Proceed to Audio Generation Pipeline

## Prompt Templates

### Full Lesson Generation Prompt

```
You are the CalmRead Content Generator (ROLE_B).

=== TASK ===
Generate a complete lesson for: [LESSON_ID]

=== LESSON SPECIFICATION ===
From scope_sequence_v1.json:
- Lesson ID: [lessonId]
- Lesson Number: [lessonNumber]
- Title: [title]
- Type: [type]
- Taught Patterns: [taughtPatterns]
- Allowed Graphemes: [allowedGraphemes]
- Banned Graphemes: [bannedGraphemes]
- New Sight Words: [newSightWords]
- Cumulative Sight Words: [cumulativeSightWords]
- Review Of: [reviewOf]

=== CONSTRAINTS ===
1. GRAPHEME CONTROL (CRITICAL)
   - Decodable content may ONLY use: [allowedGraphemes]
   - These graphemes are BANNED: [bannedGraphemes]
   - Approved sight words: [cumulativeSightWords]
   - ANY word with banned graphemes = REJECTION

2. EDUCATIONAL REQUIREMENTS
   - Include explicit instruction for new pattern
   - Review prior patterns from: [reviewOf]
   - Comprehension questions must be literal only
   - Follow "I do, we do, you do" model

3. CALM DESIGN REQUIREMENTS
   - No gamification language
   - No excitement/celebration
   - Clear "All Done" endpoint
   - Calm, supportive tone in all scripts

=== REQUIRED STEPS ===
Generate these step types in order:
1. review - Review graphemes from prior lessons
2. phonemic_awareness - Sound identification for target
3. explicit_phonics - Teach grapheme-phoneme correspondence
4. blending_practice - Blend CVC words with target pattern
5. decodable_read - Connected text reading
6. record_read_aloud - Child reads passage aloud
7. comprehension_prompt - 1-2 literal questions

=== WORD LIST REQUIREMENTS ===
- Minimum 8 target pattern words
- Minimum 4 review words
- Each word must include grapheme breakdown
- Each word must be validated

=== DECODABLE TEXT REQUIREMENTS ===
- 4-6 sentences
- Simple narrative or description
- Target pattern appears 5+ times
- Age-appropriate content
- 100% grapheme compliant

=== OUTPUT FORMAT ===
Provide:
1. Complete lesson.json (valid JSON)
2. Audio scripts (Markdown)
3. Self-validation report (Markdown)

=== VALIDATION CHECKLIST ===
Before outputting, verify:
□ All words validated against allowedGraphemes
□ No banned graphemes in any decodable content
□ All required schema fields present
□ All step types included
□ Comprehension questions are literal
□ No gamification or pressure language
□ Clear endpoint defined
```

### Word List Generation Prompt

```
You are the CalmRead Content Generator (ROLE_B).

=== TASK ===
Generate a validated word list for: [LESSON_ID]

=== CONSTRAINTS ===
Allowed graphemes: [list]
Banned graphemes: [list]
Target pattern: [pattern]

=== REQUIREMENTS ===
1. Generate 12-15 CVC words using target pattern
2. Segment each word into graphemes
3. Validate each grapheme against allowed list
4. Mark which words demonstrate target pattern
5. Include 4-6 review words from prior patterns

=== OUTPUT FORMAT ===
| Word | Graphemes | Target? | Review? | Valid? |
|------|-----------|---------|---------|--------|
| mat  | m-a-t     | Yes     | No      | ✓      |
```

### Decodable Passage Prompt

```
You are the CalmRead Content Generator (ROLE_B).

=== TASK ===
Write a decodable passage for: [LESSON_ID]

=== CONSTRAINTS ===
Allowed graphemes: [list]
Sight words: [list]
Target pattern: [pattern]

=== REQUIREMENTS ===
1. Write 4-6 sentences
2. Use ONLY allowed graphemes + sight words
3. Feature target pattern prominently (5+ occurrences)
4. Tell a simple, coherent story
5. Age-appropriate for 4-6 year olds
6. Validate every word before including

=== FORBIDDEN ===
- Any word with banned graphemes
- Complex sentences
- Abstract concepts
- Scary or negative content

=== OUTPUT FORMAT ===
1. Passage text
2. Word-by-word validation table
3. Pattern occurrence count
```

## Error Handling

| Error | Resolution |
|-------|------------|
| Banned grapheme in word | Remove word, find alternative |
| Missing required field | Add field with appropriate content |
| Scope/sequence mismatch | Verify against correct lesson entry |
| QA rejection | Address all issues, regenerate |

## Quality Gates

| Gate | Criteria | Owner |
|------|----------|-------|
| Self-Validation | 100% word validation pass | Content Generator |
| Schema Check | All required fields, correct types | Content Generator |
| QA Review | PASS verdict | QA/Red Team |
| Human Approval | Final sign-off | Human Conductor |

## Metrics

Track for each lesson:

| Metric | Target |
|--------|--------|
| Generation attempts | ≤ 2 |
| QA pass rate | ≥ 90% first attempt |
| Grapheme violations | 0 |
| Time to completion | < 30 minutes |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-11 | Initial pipeline |
