# QA Lint Pipeline

**Version:** 1.0.0  
**Last Updated:** January 11, 2026

## Overview

This pipeline scans lessons and app code for calm design violations, pedagogy violations, and schema violations. It produces a score and identifies blockers that must be resolved before release.

## Pipeline Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Content      │────▶│   Calm Lint     │────▶│   Pedagogy      │
│    + Code       │     │                 │     │   Lint          │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Lint         │◀────│   Score &       │◀────│   Schema        │
│    Report       │     │   Blockers      │     │   Lint          │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## When to Run

| Trigger | Scope |
|---------|-------|
| New lesson generated | Single lesson |
| Batch lessons generated | All new lessons |
| App code changed | App code only |
| Pre-release | Everything |
| On-demand | As specified |

## Lint Categories

### 1. Calm Lint

Checks for calm design constitution violations.

**Checklist:** `qa/checklists/calm_lint.md`

### 2. Pedagogy Lint

Checks for educational constitution violations.

**Checklist:** `qa/checklists/pedagogy_lint.md`

### 3. UX Lint

Checks for app constraints and user experience issues.

**Checklist:** `qa/checklists/ux_lint.md`

### 4. Schema Lint

Checks for schema compliance.

**Automated validation against JSON schemas.**

## Step-by-Step Process

### Step 1: Identify Scope

**Actor:** Human Conductor

Determine what to lint:

```yaml
Lint Request:
  scope: "lesson"  # or "app" or "all"
  targets:
    - curriculum/lessons/lesson_03/
    - curriculum/lessons/lesson_04/
  output: qa/reports/lint_report_2026-01-11.md
```

### Step 2: Run Calm Lint

**Actor:** QA/Red Team (ROLE_C)

**Prompt Template:**

```
You are the CalmRead QA/Red Team (ROLE_C).

=== TASK ===
Run Calm Lint on the specified content.

=== CONTENT ===
[Paste lesson.json or code to review]

=== CHECKLIST ===
From qa/checklists/calm_lint.md:

UI RULES:
□ UI-001: No scrolling
□ UI-002: Page-based navigation only
□ UI-003: One primary action per screen
□ UI-006: No celebratory animations
□ UI-007: No confetti/fireworks/sparkles
□ UI-009: No variable rewards
□ UI-011: No popups interrupting flow
□ UI-016: No excited voice tones
□ UI-017: No reward sounds

PRINCIPLES:
□ Predictability: Same structure, no surprises
□ Boundedness: Clear start/end, no infinite content
□ Low Arousal: Minimal motion, muted colors
□ Agency: Can stop anytime, no penalties

HIGHLIGHTING:
□ Granularity: none/line/phrase only
□ Cadence: Fixed, not variable
□ Style: Subtle, not attention-grabbing

=== OUTPUT ===
Calm Lint Report with:
- Each item checked
- Evidence for any violations
- Severity rating
- Fix recommendations
```

### Step 3: Run Pedagogy Lint

**Actor:** QA/Red Team (ROLE_C)

**Prompt Template:**

```
You are the CalmRead QA/Red Team (ROLE_C).

=== TASK ===
Run Pedagogy Lint on the specified content.

=== CONTENT ===
[Paste lesson.json]

=== CHECKLIST ===
From qa/checklists/pedagogy_lint.md:

GRAPHEME CONTROL:
□ All words validated against allowedGraphemes
□ No banned graphemes in decodable content
□ Sight words in approved list
□ Target patterns present

INSTRUCTIONAL APPROACH:
□ Explicit instruction included
□ Follows scope/sequence
□ Reviews prior content
□ Sufficient practice opportunities

INTERACTIVITY:
□ All interactions congruent
□ No illustration hotspots
□ No mini-games
□ Highlighting follows policy

COMPREHENSION:
□ Questions are literal only
□ No inferential questions
□ Response format appropriate

=== OUTPUT ===
Pedagogy Lint Report with:
- Each item checked
- Evidence for any violations
- Severity rating
- Fix recommendations
```

### Step 4: Run UX Lint

**Actor:** QA/Red Team (ROLE_C)

**Prompt Template:**

```
You are the CalmRead QA/Red Team (ROLE_C).

=== TASK ===
Run UX Lint on the specified content/code.

=== CONTENT ===
[Paste content or code]

=== CHECKLIST ===
From qa/checklists/ux_lint.md:

SCREEN TIME INDICATORS:
□ No gamification
□ No variable rewards
□ No streaks
□ No time pressure
□ No autoplay
□ No infinite content

NAVIGATION:
□ Clear navigation path
□ Consistent back behavior
□ Exit available
□ No dead ends

ACCESSIBILITY:
□ Touch targets adequate (48dp+)
□ Text readable (24sp+ body)
□ Contrast sufficient
□ No reliance on color alone

BEHAVIORAL SAFETY:
□ No compulsive triggers
□ No FOMO mechanics
□ No loss aversion
□ Clear stopping points

=== OUTPUT ===
UX Lint Report with:
- Each item checked
- Evidence for any violations
- Severity rating
- Fix recommendations
```

### Step 5: Run Schema Lint

**Actor:** Builder/Operator (ROLE_D)

Automated schema validation:

```python
#!/usr/bin/env python3
"""
schema_lint.py - Validate content against JSON schemas
"""

import json
import jsonschema
from pathlib import Path

def validate_lesson(lesson_path: str, schema_path: str) -> dict:
    """Validate a lesson against the schema."""
    
    with open(schema_path) as f:
        schema = json.load(f)
    
    with open(lesson_path) as f:
        lesson = json.load(f)
    
    errors = []
    try:
        jsonschema.validate(lesson, schema)
    except jsonschema.ValidationError as e:
        errors.append({
            "path": list(e.path),
            "message": e.message,
            "severity": "CRITICAL"
        })
    except jsonschema.SchemaError as e:
        errors.append({
            "path": [],
            "message": f"Schema error: {e.message}",
            "severity": "BLOCKER"
        })
    
    return {
        "file": lesson_path,
        "valid": len(errors) == 0,
        "errors": errors
    }

def lint_all_lessons(lessons_dir: str, schema_path: str) -> dict:
    """Lint all lessons in a directory."""
    
    results = []
    lessons_path = Path(lessons_dir)
    
    for lesson_dir in sorted(lessons_path.glob("lesson_*")):
        lesson_json = lesson_dir / "lesson.json"
        if lesson_json.exists():
            result = validate_lesson(str(lesson_json), schema_path)
            results.append(result)
    
    total = len(results)
    passed = sum(1 for r in results if r["valid"])
    
    return {
        "total": total,
        "passed": passed,
        "failed": total - passed,
        "results": results
    }

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: schema_lint.py <lessons_dir> [schema_path]")
        sys.exit(1)
    
    lessons_dir = sys.argv[1]
    schema_path = sys.argv[2] if len(sys.argv) > 2 else "schemas/lesson_schema.json"
    
    report = lint_all_lessons(lessons_dir, schema_path)
    
    print(f"Schema Lint Results")
    print(f"==================")
    print(f"Total: {report['total']}")
    print(f"Passed: {report['passed']}")
    print(f"Failed: {report['failed']}")
    
    for result in report["results"]:
        status = "✓" if result["valid"] else "✗"
        print(f"\n{status} {result['file']}")
        for error in result["errors"]:
            print(f"  [{error['severity']}] {error['message']}")
            if error["path"]:
                print(f"    Path: {'.'.join(str(p) for p in error['path'])}")
```

### Step 6: Calculate Score

**Actor:** QA/Red Team (ROLE_C)

Aggregate results into a score:

```markdown
## Lint Score Calculation

### Severity Weights
- BLOCKER: -100 points (auto-fail)
- CRITICAL: -25 points
- MAJOR: -10 points
- MINOR: -2 points

### Category Weights
- Calm Lint: 35%
- Pedagogy Lint: 35%
- UX Lint: 20%
- Schema Lint: 10%

### Score Formula
Base Score: 100
Final Score = Base - (Weighted Deductions)

### Passing Threshold
- PASS: Score ≥ 80, no BLOCKERS
- CONDITIONAL: Score ≥ 60, no BLOCKERS
- FAIL: Score < 60 OR any BLOCKERS
```

### Step 7: Generate Report

**Actor:** QA/Red Team (ROLE_C)

Produce comprehensive lint report:

```markdown
# QA Lint Report

**Date:** [timestamp]
**Scope:** [what was linted]
**Score:** [XX/100]
**Verdict:** [PASS/CONDITIONAL/FAIL]

---

## Executive Summary

| Category | Items | Pass | Fail | Score Impact |
|----------|-------|------|------|--------------|
| Calm Lint | XX | XX | XX | -XX |
| Pedagogy Lint | XX | XX | XX | -XX |
| UX Lint | XX | XX | XX | -XX |
| Schema Lint | XX | XX | XX | -XX |

**Blockers:** [N]
**Critical Issues:** [N]
**Major Issues:** [N]
**Minor Issues:** [N]

---

## Blockers (Must Fix)

| ID | Category | Description | Location | Fix |
|----|----------|-------------|----------|-----|
| B1 | [cat] | [desc] | [loc] | [fix] |

---

## Critical Issues

| ID | Category | Description | Location | Fix |
|----|----------|-------------|----------|-----|
| C1 | [cat] | [desc] | [loc] | [fix] |

---

## Major Issues

| ID | Category | Description | Location | Fix |
|----|----------|-------------|----------|-----|
| M1 | [cat] | [desc] | [loc] | [fix] |

---

## Minor Issues

| ID | Category | Description | Location | Fix |
|----|----------|-------------|----------|-----|
| m1 | [cat] | [desc] | [loc] | [fix] |

---

## Detailed Results

### Calm Lint Details
[Detailed checklist results]

### Pedagogy Lint Details
[Detailed checklist results]

### UX Lint Details
[Detailed checklist results]

### Schema Lint Details
[Detailed validation results]

---

## Recommendations

### Required for PASS
1. [Fix 1]
2. [Fix 2]

### Suggested Improvements
1. [Improvement 1]
2. [Improvement 2]

---

## Sign-off

- Linted by: QA/Red Team (ROLE_C)
- Date: [timestamp]
- Next review: [after fixes applied]
```

### Step 8: Address Issues

**Actor:** Content Generator or Builder/Operator

Fix identified issues based on category:

| Issue Category | Responsible Role |
|----------------|------------------|
| Content issues | Content Generator (ROLE_B) |
| Code issues | Builder/Operator (ROLE_D) |
| Schema issues | System Architect (ROLE_A) |

### Step 9: Re-Lint

**Actor:** QA/Red Team (ROLE_C)

After fixes, re-run lint on affected items only.

## Automation Script

```bash
#!/bin/bash
# qa_lint.sh - Run full QA lint pipeline

SCOPE=$1  # "lesson_XX" or "all" or "app"
OUTPUT_DIR="qa/reports"
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
REPORT="${OUTPUT_DIR}/lint_report_${TIMESTAMP}.md"

mkdir -p "${OUTPUT_DIR}"

echo "# QA Lint Report" > "${REPORT}"
echo "" >> "${REPORT}"
echo "**Date:** ${TIMESTAMP}" >> "${REPORT}"
echo "**Scope:** ${SCOPE}" >> "${REPORT}"
echo "" >> "${REPORT}"

# Run schema lint
echo "Running schema lint..."
python3 scripts/schema_lint.py "curriculum/lessons" "schemas/lesson_schema.json" >> "${REPORT}"

# Note: Calm, Pedagogy, and UX lint require AI review
echo "" >> "${REPORT}"
echo "## Manual Review Required" >> "${REPORT}"
echo "" >> "${REPORT}"
echo "Run Calm Lint, Pedagogy Lint, and UX Lint using QA/Red Team role." >> "${REPORT}"

echo "Lint report generated: ${REPORT}"
```

## Pre-Release Lint Checklist

Before any release, run full lint:

```markdown
## Pre-Release Lint Checklist

### Content
- [ ] All lessons pass schema lint
- [ ] All lessons pass calm lint
- [ ] All lessons pass pedagogy lint
- [ ] All audio assets present
- [ ] All audio passes quality check

### App
- [ ] App code passes calm lint
- [ ] App code passes UX lint
- [ ] No forbidden permissions
- [ ] No network calls
- [ ] No scrolling views

### Integration
- [ ] App loads all lessons
- [ ] Audio playback works
- [ ] Recording works
- [ ] Progress saves correctly

### Final
- [ ] Overall score ≥ 80
- [ ] No blockers
- [ ] All critical issues resolved
```

## Error Handling

| Error | Resolution |
|-------|------------|
| Schema validation fails | Fix JSON structure |
| Calm violation found | Refactor content/code |
| Pedagogy violation found | Regenerate content |
| Low score | Prioritize fixes by severity |

## Metrics

| Metric | Target |
|--------|--------|
| First-pass lint score | ≥ 70 |
| Final lint score | ≥ 90 |
| Blocker count | 0 |
| Time to resolve issues | < 2 hours |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-11 | Initial pipeline |
