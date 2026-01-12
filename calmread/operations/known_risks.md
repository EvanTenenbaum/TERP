# Known Risks and Mitigations

**Version:** 1.0.0  
**Last Updated:** January 11, 2026  
**Purpose:** Document known risks, their potential impact, and mitigation strategies

## Risk Categories

1. [Content Risks](#content-risks)
2. [Technical Risks](#technical-risks)
3. [Operational Risks](#operational-risks)
4. [User Experience Risks](#user-experience-risks)
5. [Beta Testing Risks](#beta-testing-risks)

---

## Risk Assessment Matrix

| Probability | Impact | Risk Level |
|-------------|--------|------------|
| High | High | **CRITICAL** |
| High | Medium | HIGH |
| Medium | High | HIGH |
| High | Low | MEDIUM |
| Medium | Medium | MEDIUM |
| Low | High | MEDIUM |
| Medium | Low | LOW |
| Low | Medium | LOW |
| Low | Low | LOW |

---

## Content Risks

### RISK-C001: Grapheme Leak

**Description:** A word containing a banned grapheme appears in decodable content, teaching a pattern before it's introduced.

| Attribute | Value |
|-----------|-------|
| Probability | Medium |
| Impact | High |
| Risk Level | **HIGH** |

**Potential Causes:**
- Human oversight during content creation
- AI hallucination generating invalid words
- Copy-paste errors
- Incomplete validation

**Impact:**
- Breaks systematic phonics progression
- Child encounters undecodable word
- Frustration and confusion
- Undermines trust in curriculum

**Mitigations:**
1. **Prevention:**
   - Mandatory word-by-word validation in Content Generator
   - Self-validation step before QA
   - Automated schema validation
   - Explicit banned grapheme list in every prompt

2. **Detection:**
   - QA/Red Team validates every word
   - Automated grapheme checking script
   - Pre-release full curriculum scan

3. **Response:**
   - Immediate content removal
   - Regenerate affected lesson
   - Full re-validation

**Monitoring:**
- Track grapheme violations in QA reports
- Alert on any grapheme-related failures

---

### RISK-C002: Scope/Sequence Drift

**Description:** Generated content doesn't align with the scope/sequence plan, introducing concepts out of order.

| Attribute | Value |
|-----------|-------|
| Probability | Medium |
| Impact | Medium |
| Risk Level | **MEDIUM** |

**Potential Causes:**
- Incorrect lesson specification provided
- AI not following constraints
- Outdated scope/sequence reference
- Review content from wrong lessons

**Impact:**
- Curriculum coherence broken
- Skills not properly scaffolded
- Child may encounter unprepared content

**Mitigations:**
1. **Prevention:**
   - Always reference current scope_sequence_v1.json
   - Include explicit lesson dependencies in prompts
   - Verify reviewOf references are valid

2. **Detection:**
   - Cross-reference generated content with scope/sequence
   - QA checks for scope alignment
   - Cumulative validation in batch generation

3. **Response:**
   - Regenerate misaligned content
   - Update scope/sequence if intentional change

---

### RISK-C003: Inappropriate Content

**Description:** Generated content contains age-inappropriate, scary, or culturally insensitive material.

| Attribute | Value |
|-----------|-------|
| Probability | Low |
| Impact | High |
| Risk Level | **MEDIUM** |

**Potential Causes:**
- AI generates unexpected content
- Insufficient content guidelines
- Cultural blind spots

**Impact:**
- Child distress
- Parent trust lost
- Potential harm

**Mitigations:**
1. **Prevention:**
   - Explicit content guidelines in prompts
   - Age-appropriate content requirements
   - Cultural sensitivity guidelines

2. **Detection:**
   - Human review of all generated content
   - QA checklist includes content appropriateness
   - Beta feedback monitoring

3. **Response:**
   - Immediate removal
   - Regenerate with stricter guidelines
   - Update content guidelines

---

## Technical Risks

### RISK-T001: App Crash During Lesson

**Description:** The app crashes while a child is in the middle of a lesson.

| Attribute | Value |
|-----------|-------|
| Probability | Medium |
| Impact | Medium |
| Risk Level | **MEDIUM** |

**Potential Causes:**
- Memory issues
- Null pointer exceptions
- Audio playback errors
- File not found errors

**Impact:**
- Disrupted learning experience
- Potential frustration
- Lost progress (if not saved)
- Child may not want to continue

**Mitigations:**
1. **Prevention:**
   - Thorough testing on target device
   - Defensive coding practices
   - Graceful error handling
   - Regular progress saves

2. **Detection:**
   - Crash logging (local)
   - Beta feedback
   - Device testing

3. **Response:**
   - Automatic restart to last checkpoint
   - Clear error message
   - Progress recovery

---

### RISK-T002: Audio Playback Failure

**Description:** Audio doesn't play when expected, leaving child without instruction.

| Attribute | Value |
|-----------|-------|
| Probability | Medium |
| Impact | Medium |
| Risk Level | **MEDIUM** |

**Potential Causes:**
- Missing audio files
- Incorrect file paths
- Audio format issues
- Device audio problems

**Impact:**
- Child can't hear instructions
- Lesson becomes confusing
- May need to stop session

**Mitigations:**
1. **Prevention:**
   - Verify all audio assets before deployment
   - Consistent audio format (MP3)
   - Audio completeness check script
   - Test on target device

2. **Detection:**
   - Audio verification script
   - Pre-session device check
   - Beta feedback

3. **Response:**
   - Display text fallback
   - Replay button
   - Skip to next step option

---

### RISK-T003: E-ink Display Issues

**Description:** App doesn't render well on BOOX e-ink display.

| Attribute | Value |
|-----------|-------|
| Probability | Medium |
| Impact | Medium |
| Risk Level | **MEDIUM** |

**Potential Causes:**
- Animations causing ghosting
- Low contrast colors
- Refresh rate issues
- Touch latency

**Impact:**
- Poor readability
- Frustrating interaction
- May need different device

**Mitigations:**
1. **Prevention:**
   - E-ink-first design
   - No animations
   - High contrast colors
   - Large touch targets
   - Test on actual e-ink device

2. **Detection:**
   - Device testing
   - Beta feedback
   - Visual inspection

3. **Response:**
   - Adjust colors/contrast
   - Simplify UI
   - Consider alternative device

---

### RISK-T004: Storage/Permission Issues

**Description:** App can't access lesson files or save recordings due to permission issues.

| Attribute | Value |
|-----------|-------|
| Probability | Medium |
| Impact | High |
| Risk Level | **HIGH** |

**Potential Causes:**
- Permissions not granted
- Storage full
- File path issues
- Android version differences

**Impact:**
- App unusable
- Can't load lessons
- Can't save recordings

**Mitigations:**
1. **Prevention:**
   - Clear permission requests
   - Check permissions on startup
   - Handle permission denial gracefully
   - Test on multiple Android versions

2. **Detection:**
   - Startup permission check
   - Error logging
   - Beta feedback

3. **Response:**
   - Guide user to grant permissions
   - Provide clear error messages
   - Fallback to internal storage

---

## Operational Risks

### RISK-O001: AI Role Confusion

**Description:** AI agent invokes wrong role or mixes responsibilities, producing inconsistent output.

| Attribute | Value |
|-----------|-------|
| Probability | Medium |
| Impact | Medium |
| Risk Level | **MEDIUM** |

**Potential Causes:**
- Unclear role boundaries
- Prompt ambiguity
- Context window limitations
- Role switching mid-task

**Impact:**
- Inconsistent content
- Constitution violations
- Wasted effort
- Quality issues

**Mitigations:**
1. **Prevention:**
   - Clear role definitions
   - Explicit role invocation in prompts
   - Role boundary documentation
   - Single role per task

2. **Detection:**
   - Review output for role consistency
   - QA checks for role-appropriate output
   - Monitor for boundary violations

3. **Response:**
   - Re-invoke correct role
   - Regenerate output
   - Clarify role boundaries

---

### RISK-O002: Version Control Issues

**Description:** Content or code versions become confused, leading to deployment of wrong version.

| Attribute | Value |
|-----------|-------|
| Probability | Low |
| Impact | High |
| Risk Level | **MEDIUM** |

**Potential Causes:**
- Poor version tracking
- Multiple people editing
- Incomplete commits
- Branch confusion

**Impact:**
- Wrong content deployed
- Regression bugs
- Lost work
- Confusion

**Mitigations:**
1. **Prevention:**
   - Consistent version numbering
   - Git best practices
   - Clear branching strategy
   - Version in all files

2. **Detection:**
   - Version verification before deploy
   - Changelog review
   - Diff review

3. **Response:**
   - Rollback to correct version
   - Redeploy
   - Update procedures

---

### RISK-O003: Knowledge Loss

**Description:** Key decisions, rationale, or procedures are not documented, leading to inconsistent future work.

| Attribute | Value |
|-----------|-------|
| Probability | Medium |
| Impact | Medium |
| Risk Level | **MEDIUM** |

**Potential Causes:**
- Rushed work
- Assumed knowledge
- Incomplete handoffs
- Documentation debt

**Impact:**
- Repeated mistakes
- Inconsistent decisions
- Onboarding difficulties
- Drift from principles

**Mitigations:**
1. **Prevention:**
   - Document decisions as made
   - Maintain runbook
   - Update constitutions
   - Regular documentation review

2. **Detection:**
   - Documentation audits
   - New agent onboarding feedback
   - Inconsistency detection

3. **Response:**
   - Retroactive documentation
   - Knowledge capture sessions
   - Update procedures

---

## User Experience Risks

### RISK-U001: Calm Design Violation

**Description:** Content or app inadvertently includes elements that violate calm design principles.

| Attribute | Value |
|-----------|-------|
| Probability | Medium |
| Impact | High |
| Risk Level | **HIGH** |

**Potential Causes:**
- Subtle gamification creep
- Excited language
- Unintended animations
- Variable reward patterns

**Impact:**
- Undermines core mission
- Potential for screen time issues
- Child overstimulation
- Parent trust lost

**Mitigations:**
1. **Prevention:**
   - Calm design constitution
   - Explicit forbidden elements list
   - Calm lint checklist
   - Review all content/code

2. **Detection:**
   - QA calm lint
   - Beta observation
   - Parent feedback

3. **Response:**
   - Immediate removal
   - Root cause analysis
   - Update prevention measures

---

### RISK-U002: Child Frustration

**Description:** Child becomes frustrated due to difficulty, confusion, or technical issues.

| Attribute | Value |
|-----------|-------|
| Probability | Medium |
| Impact | Medium |
| Risk Level | **MEDIUM** |

**Potential Causes:**
- Content too difficult
- Instructions unclear
- Technical problems
- Inappropriate pacing

**Impact:**
- Negative association with reading
- Child refuses to continue
- Learning setback
- Parent concern

**Mitigations:**
1. **Prevention:**
   - Age-appropriate difficulty
   - Clear instructions
   - Thorough testing
   - User-controlled pacing

2. **Detection:**
   - Beta observation
   - Feedback log
   - Parent reports

3. **Response:**
   - Session protocol intervention
   - Content adjustment
   - Technical fixes

---

### RISK-U003: Compulsive Use Patterns

**Description:** Despite calm design, child shows signs of compulsive or excessive use.

| Attribute | Value |
|-----------|-------|
| Probability | Low |
| Impact | High |
| Risk Level | **MEDIUM** |

**Potential Causes:**
- Undetected engagement hooks
- Child personality factors
- External pressure
- Misuse of app

**Impact:**
- Defeats purpose of calm design
- Potential harm to child
- Parent concern
- Reputation damage

**Mitigations:**
1. **Prevention:**
   - Strict calm design adherence
   - Clear session endpoints
   - No autoplay
   - Parent guidance

2. **Detection:**
   - Beta observation
   - Parent feedback
   - Usage patterns (if tracked)

3. **Response:**
   - Investigate root cause
   - Adjust design if needed
   - Parent communication

---

## Beta Testing Risks

### RISK-B001: Insufficient Feedback

**Description:** Beta testing doesn't generate enough useful feedback to identify issues.

| Attribute | Value |
|-----------|-------|
| Probability | Medium |
| Impact | Medium |
| Risk Level | **MEDIUM** |

**Potential Causes:**
- Too few testers
- Poor observation protocol
- Incomplete feedback logging
- Tester fatigue

**Impact:**
- Issues not discovered
- False confidence
- Problems in wider release

**Mitigations:**
1. **Prevention:**
   - Clear feedback protocol
   - Structured observation
   - Regular check-ins
   - Adequate tester pool

2. **Detection:**
   - Monitor feedback volume
   - Review feedback quality
   - Compare to expectations

3. **Response:**
   - Improve protocols
   - Add testers
   - Extend beta period

---

### RISK-B002: Tester Bias

**Description:** Beta testers (parents) provide biased feedback due to relationship with project.

| Attribute | Value |
|-----------|-------|
| Probability | High |
| Impact | Medium |
| Risk Level | **HIGH** |

**Potential Causes:**
- Want project to succeed
- Don't want to criticize
- Confirmation bias
- Leading questions

**Impact:**
- Issues not reported
- False positive results
- Overconfidence

**Mitigations:**
1. **Prevention:**
   - Emphasize honest feedback value
   - Structured observation (not opinion)
   - Specific questions
   - Anonymous feedback option

2. **Detection:**
   - Look for suspiciously positive feedback
   - Cross-reference with observations
   - Compare multiple testers

3. **Response:**
   - Reframe feedback requests
   - Focus on observations
   - Seek external testers

---

### RISK-B003: Child Negative Experience

**Description:** Beta testing causes negative experience for child participant.

| Attribute | Value |
|-----------|-------|
| Probability | Low |
| Impact | High |
| Risk Level | **MEDIUM** |

**Potential Causes:**
- Technical issues
- Content problems
- Pressure to participate
- Session too long

**Impact:**
- Harm to child
- Ethical concerns
- Parent withdrawal
- Project reputation

**Mitigations:**
1. **Prevention:**
   - Child wellbeing first protocol
   - Short sessions
   - No pressure
   - Stop at any sign of distress

2. **Detection:**
   - Observer training
   - Clear distress indicators
   - Parent feedback

3. **Response:**
   - Immediate session end
   - Support child
   - Review and adjust

---

## Risk Register Summary

| Risk ID | Description | Level | Status |
|---------|-------------|-------|--------|
| RISK-C001 | Grapheme Leak | HIGH | Active |
| RISK-C002 | Scope/Sequence Drift | MEDIUM | Active |
| RISK-C003 | Inappropriate Content | MEDIUM | Active |
| RISK-T001 | App Crash During Lesson | MEDIUM | Active |
| RISK-T002 | Audio Playback Failure | MEDIUM | Active |
| RISK-T003 | E-ink Display Issues | MEDIUM | Active |
| RISK-T004 | Storage/Permission Issues | HIGH | Active |
| RISK-O001 | AI Role Confusion | MEDIUM | Active |
| RISK-O002 | Version Control Issues | MEDIUM | Active |
| RISK-O003 | Knowledge Loss | MEDIUM | Active |
| RISK-U001 | Calm Design Violation | HIGH | Active |
| RISK-U002 | Child Frustration | MEDIUM | Active |
| RISK-U003 | Compulsive Use Patterns | MEDIUM | Active |
| RISK-B001 | Insufficient Feedback | MEDIUM | Active |
| RISK-B002 | Tester Bias | HIGH | Active |
| RISK-B003 | Child Negative Experience | MEDIUM | Active |

## Review Schedule

| Review Type | Frequency | Next Review |
|-------------|-----------|-------------|
| Risk Register Review | Monthly | 2026-02-11 |
| Mitigation Effectiveness | After each beta phase | TBD |
| New Risk Identification | Ongoing | Continuous |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-11 | Initial risk register |
