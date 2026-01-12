# Educational Constitution

**Version:** 1.0.0  
**Last Updated:** January 11, 2026  
**Status:** ACTIVE  
**Authority:** System Architect

## Preamble

CalmRead's educational approach is grounded in **structured literacy** research. This constitution defines the pedagogical principles, instructional requirements, and content constraints that govern all educational content and interactions.

Any content or feature that violates this constitution is **automatically rejected** regardless of other merits.

## Instructional Foundation

### Research Base

CalmRead's instructional approach aligns with major research syntheses on reading instruction:

- **National Reading Panel (2000):** Five pillars of reading instruction
- **National Early Literacy Panel (2008):** Predictors of later reading success
- **What Works Clearinghouse:** Evidence-based literacy interventions
- **Science of Reading:** Scarborough's Reading Rope, Simple View of Reading

### The Five Pillars

| Pillar | Definition | CalmRead Implementation |
|--------|------------|------------------------|
| **Phonemic Awareness** | Ability to hear and manipulate individual sounds | Explicit instruction in sound identification, blending, segmenting |
| **Phonics** | Relationship between letters and sounds | Systematic, explicit grapheme-phoneme instruction |
| **Fluency** | Ability to read with speed, accuracy, and expression | Guided oral reading with model, practice, recording |
| **Vocabulary** | Understanding word meanings | Explicit instruction, context exposure in read-alouds |
| **Comprehension** | Understanding text meaning | Simple comprehension prompts, discussion questions |

## Core Instructional Principles

### Principle 1: Explicit Instruction

> Tell the child directly what they need to know.

**Requirements:**
- Clear, direct explanation of concepts
- Model the skill before practice
- "I do, we do, you do" progression
- No discovery learning for foundational skills
- Consistent instructional language

**Example:**
```
CORRECT: "This letter is 'm'. It makes the sound /m/. Watch my mouth: /m/."
INCORRECT: "Can you guess what sound this letter makes?"
```

### Principle 2: Systematic Progression

> Teach skills in a logical, research-based sequence.

**Requirements:**
- Follow scope and sequence strictly
- Introduce one new concept at a time
- Build on previously mastered skills
- No skipping ahead in sequence
- Review integrated throughout

**Sequence Principles:**
1. High-frequency letters before low-frequency
2. Continuous sounds before stop sounds (for blending)
3. Short vowels before long vowels
4. CVC words before blends/digraphs
5. Single-syllable before multi-syllable

### Principle 3: Cumulative Review

> Continuously practice previously learned skills.

**Requirements:**
- Every lesson reviews prior content
- Spaced repetition of learned graphemes
- Mixed practice of old and new words
- No "one and done" instruction
- Mastery before progression

**Review Cadence:**
- New content: Practiced in current lesson
- Recent content (1-3 lessons ago): Heavy review
- Older content (4-10 lessons ago): Moderate review
- Mastered content: Maintenance review

### Principle 4: Practice-Rich Environment

> Children learn to read by reading.

**Requirements:**
- High volume of reading practice
- Controlled text for success
- Multiple exposures to target patterns
- Immediate application of new learning
- Success rate target: 90%+ accuracy

## Decodable Text Policy

### Nuanced Stance

Decodable texts are **useful but not exclusive**:

> "Decodable texts are useful as controlled practice early. Evidence in literature is mixed on decodables as entire diet."

### Policy

| Context | Text Type | Rationale |
|---------|-----------|-----------|
| Phonics practice | Strictly decodable | Controlled application of learned patterns |
| Fluency building | Mostly decodable | Success builds confidence |
| Read-aloud/listening | Rich, authentic text | Vocabulary and comprehension exposure |
| Independent reading | Decodable | Child can succeed independently |

### Decodable Text Constraints

For phonics practice and independent reading:

1. **100% decodable:** Every word must be decodable using taught patterns
2. **Explicit grapheme control:** Only allowed graphemes appear
3. **High-frequency words:** Only explicitly taught sight words
4. **Validation required:** Automated check against allowed graphemes

### Allowed vs. Banned Graphemes

Each lesson specifies:
- `allowedGraphemes`: Graphemes the child has been taught
- `bannedGraphemes`: Graphemes not yet taught (must not appear)
- `targetPatterns`: Focus patterns for this lesson

**Validation Rule:**
```
For every word in decodable text:
  For every grapheme in word:
    ASSERT grapheme IN allowedGraphemes
    ASSERT grapheme NOT IN bannedGraphemes
```

## Interactivity Policy

### Congruent vs. Non-Congruent Multimedia

Research distinguishes between:

| Type | Definition | Effect on Learning |
|------|------------|-------------------|
| **Congruent** | Multimedia aligned with learning goal | Positive or neutral |
| **Non-Congruent** | Multimedia unrelated to learning goal | Negative (distracting) |

### Policy

**Allowed Interactivity:**
- Tap to hear word pronunciation
- Tap to hear sentence read aloud
- Karaoke highlighting during model reading (if calm)
- Recording child's oral reading
- Simple comprehension response (tap correct answer)

**Forbidden Interactivity:**
- Illustration hotspots ("tap the dog!")
- Mini-games between lessons
- Decorative animations
- Sound effects unrelated to reading
- "Fun" interactions that distract from text

### Highlighting Constraints

Karaoke highlighting is allowed **only if**:

1. Directly supports print tracking
2. Used during model/guided reading (not independent)
3. Cadence is fixed and calm
4. Line or phrase level (not word-bounce)
5. No attention-grabbing visual effects

## Fluency Instruction

### Research Basis

Fluency benefits from **guided oral reading** with feedback. However, feedback quality matters more than quantity.

### V1 Philosophy: Record-First

For beta, CalmRead uses a **Record-First** approach:

| Aspect | Implementation |
|--------|----------------|
| Child reads aloud | Device records audio |
| Real-time feedback | None (no interruption) |
| Scoring | None visible to child |
| Parent access | Can listen to recordings |
| Analytics | Optional, for future versions |

### Rationale

- Avoids kid-facing scoring pressure
- Avoids speed pressure
- Avoids "you got it wrong" feedback loops
- Preserves calm, low-pressure environment
- Enables future analytics without current risk

### Future Considerations

Real-time ASR feedback may be added in future versions **only if**:
- Research supports its effectiveness for this age group
- Implementation maintains calm design principles
- Feedback is supportive, not corrective/punitive
- Child-facing scoring is avoided

## Lesson Structure

### Required Lesson Components

Every lesson must include:

| Component | Purpose | Duration |
|-----------|---------|----------|
| Review | Activate prior knowledge | 1-2 min |
| Explicit Instruction | Teach new concept | 2-3 min |
| Guided Practice | Supported application | 2-3 min |
| Independent Practice | Solo application | 2-3 min |
| Decodable Reading | Connected text practice | 2-3 min |

### Step Types

| Step Type | Description | Required Elements |
|-----------|-------------|-------------------|
| `phonemic_awareness` | Sound-level instruction | Audio prompts, response options |
| `explicit_phonics` | Letter-sound teaching | Visual + audio model |
| `blending_practice` | Sound-by-sound blending | Word list, audio support |
| `decodable_read` | Connected text reading | Validated decodable passage |
| `record_read_aloud` | Child oral reading | Recording capability |
| `comprehension_prompt` | Simple understanding check | Question + response options |

## Word List Constraints

### Word Selection Criteria

Words included in lessons must:

1. Be decodable using allowed graphemes only
2. Be age-appropriate in meaning
3. Be high-utility (commonly encountered)
4. Support the target pattern
5. Avoid confusion with similar words

### Word Validation

Every word must pass:

```
VALIDATE word:
  1. Segment word into graphemes
  2. For each grapheme:
     - Check grapheme IN lesson.allowedGraphemes
     - Check grapheme NOT IN lesson.bannedGraphemes
  3. If any check fails: REJECT word
  4. If all checks pass: ACCEPT word
```

### Nonsense Words

Nonsense (pseudoword) reading is **allowed** for assessment:

- Tests true decoding (not memorization)
- Must follow English phonotactic rules
- Must use only allowed graphemes
- Clearly labeled as "silly words" or "made-up words"

## Comprehension Instruction

### V1 Scope

For beta, comprehension instruction is **simple and supportive**:

| Allowed | Not Allowed |
|---------|-------------|
| Literal recall questions | Inferential questions |
| "Who/what/where" questions | Complex analysis |
| Picture-text matching | Extended written response |
| Simple retelling prompts | Timed comprehension tests |

### Question Types

```json
{
  "comprehensionTypes": [
    {
      "type": "literal_recall",
      "example": "Who was in the story?",
      "responseFormat": "multiple_choice"
    },
    {
      "type": "sequence",
      "example": "What happened first?",
      "responseFormat": "multiple_choice"
    },
    {
      "type": "main_idea",
      "example": "What was the story about?",
      "responseFormat": "multiple_choice"
    }
  ]
}
```

## Assessment Philosophy

### Formative Assessment

Built into instruction:
- Observation of accuracy during practice
- Recording of oral reading for review
- Completion of lesson steps

### Summative Assessment (Beta)

Simple pre/post measures:
- Letter-sound knowledge
- Blending ability
- CVC word decoding
- Nonsense word decoding

### What We Avoid

- Timed assessments (pressure)
- Public scores or rankings
- Comparison to peers
- Punitive feedback
- High-stakes testing atmosphere

## Content Generation Constraints

### For Content Generator Role

When generating lesson content:

1. **Always validate** words against allowed graphemes
2. **Always follow** scope and sequence
3. **Never introduce** patterns before their lesson
4. **Always include** review of prior content
5. **Flag violations** immediately

### Quality Thresholds

| Metric | Threshold |
|--------|-----------|
| Word decodability | 100% |
| Grapheme compliance | 100% |
| Scope/sequence alignment | 100% |
| Review inclusion | Required |
| Success rate target | 90%+ |

## Compliance Checklist

Every lesson must pass:

### Instructional Compliance
- [ ] Explicit instruction included
- [ ] Follows scope and sequence
- [ ] Reviews prior content
- [ ] Sufficient practice opportunities
- [ ] 90%+ success rate achievable

### Content Compliance
- [ ] All words validated against allowed graphemes
- [ ] No banned graphemes in decodable text
- [ ] Target patterns emphasized
- [ ] Age-appropriate vocabulary
- [ ] Comprehension questions are literal

### Interactivity Compliance
- [ ] All interactions are congruent
- [ ] No illustration hotspots
- [ ] No mini-games
- [ ] Highlighting follows policy (if used)
- [ ] No decorative animations

## Amendment Process

Changes to this constitution require:

1. Citation of supporting research
2. Review by educational expert (if available)
3. Impact assessment on existing content
4. Version increment
5. Update all dependent documents

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-11 | Initial constitution |

## References

- National Reading Panel. (2000). "Teaching Children to Read"
- National Early Literacy Panel. (2008). "Developing Early Literacy"
- Scarborough, H. S. (2001). "Connecting early language and literacy to later reading (dis)abilities"
- Castles, A., Rastle, K., & Nation, K. (2018). "Ending the Reading Wars"
- Seidenberg, M. (2017). "Language at the Speed of Sight"
- Moats, L. C. (2020). "Speech to Print: Language Essentials for Teachers"
