# UX Lint Checklist

**Version:** 1.0.0  
**Last Updated:** January 11, 2026  
**Purpose:** Validate app and content against App Constraints Constitution and UX best practices

## How to Use This Checklist

1. Review each item against the app code or content being validated
2. Mark each item as PASS (✓), FAIL (✗), or N/A (-)
3. For any FAIL, document the specific violation with evidence
4. Screen time indicators are BLOCKERS - automatic fail
5. Calculate final score based on severity weights

## Screen Time Indicator Detection

### Forbidden Patterns (BLOCKERS)

| ID | Pattern | Present? | Location | Evidence |
|----|---------|----------|----------|----------|
| ST-001 | Gamification elements | [ ] | | |
| ST-002 | Variable reward schedules | [ ] | | |
| ST-003 | Streak mechanics | [ ] | | |
| ST-004 | Time pressure/timers | [ ] | | |
| ST-005 | Autoplay to next content | [ ] | | |
| ST-006 | Infinite scroll/content | [ ] | | |
| ST-007 | Social comparison | [ ] | | |
| ST-008 | FOMO triggers | [ ] | | |
| ST-009 | Loss aversion messaging | [ ] | | |
| ST-010 | Artificial scarcity | [ ] | | |

### Behavioral Risk Assessment

| Risk Factor | Present? | Severity | Notes |
|-------------|----------|----------|-------|
| Compulsive loop design | [ ] | BLOCKER | |
| Variable intermittent reinforcement | [ ] | BLOCKER | |
| Sunk cost exploitation | [ ] | CRITICAL | |
| Social pressure | [ ] | CRITICAL | |
| Artificial urgency | [ ] | CRITICAL | |

## Navigation Checklist

### Flow Design

| ID | Requirement | Check | Status | Notes |
|----|-------------|-------|--------|-------|
| NAV-001 | Clear entry point | Home screen is obvious | [ ] | |
| NAV-002 | Clear exit point | Can always return home | [ ] | |
| NAV-003 | Consistent back behavior | Back always goes to previous | [ ] | |
| NAV-004 | No dead ends | Every screen has exit | [ ] | |
| NAV-005 | No circular navigation | Can't get stuck in loops | [ ] | |

### Screen Transitions

| ID | Requirement | Check | Status | Notes |
|----|-------------|-------|--------|-------|
| TR-001 | No scrolling | All content fits on screen | [ ] | |
| TR-002 | Page-based only | Discrete pages, not scroll | [ ] | |
| TR-003 | Fade transitions only | No slide, zoom, bounce | [ ] | |
| TR-004 | Transition duration ≤ 300ms | Quick, not distracting | [ ] | |
| TR-005 | No transition sounds | Silent transitions | [ ] | |

### User Control

| ID | Requirement | Check | Status | Notes |
|----|-------------|-------|--------|-------|
| UC-001 | Can stop anytime | Exit always available | [ ] | |
| UC-002 | No penalty for stopping | Progress saved, no negative | [ ] | |
| UC-003 | Can replay audio | Audio controls available | [ ] | |
| UC-004 | Can pause | Pause functionality works | [ ] | |
| UC-005 | No forced progression | User controls pace | [ ] | |

## Accessibility Checklist

### Touch Targets

| ID | Requirement | Check | Status | Notes |
|----|-------------|-------|--------|-------|
| TT-001 | Minimum 48dp | All interactive elements | [ ] | |
| TT-002 | Preferred 56dp | Primary actions | [ ] | |
| TT-003 | Adequate spacing | 8dp+ between targets | [ ] | |
| TT-004 | No overlapping targets | Clear hit areas | [ ] | |
| TT-005 | Touch feedback | Visual response to touch | [ ] | |

### Typography

| ID | Requirement | Check | Status | Notes |
|----|-------------|-------|--------|-------|
| TY-001 | Body text ≥ 24sp | Main content readable | [ ] | |
| TY-002 | Heading text ≥ 32sp | Headings prominent | [ ] | |
| TY-003 | Line height ≥ 1.5x | Adequate line spacing | [ ] | |
| TY-004 | High contrast | 4.5:1 minimum ratio | [ ] | |
| TY-005 | Readable font | Clear, simple typeface | [ ] | |

### Visual Accessibility

| ID | Requirement | Check | Status | Notes |
|----|-------------|-------|--------|-------|
| VA-001 | Not color-dependent | Info not conveyed by color alone | [ ] | |
| VA-002 | Sufficient contrast | Text/background contrast | [ ] | |
| VA-003 | Clear visual hierarchy | Important items prominent | [ ] | |
| VA-004 | Consistent layout | Same elements same place | [ ] | |
| VA-005 | E-ink compatible | Works on e-ink display | [ ] | |

## App Constraints Checklist

### Network & Connectivity

| ID | Requirement | Check | Status | Notes |
|----|-------------|-------|--------|-------|
| NET-001 | No INTERNET permission | Check manifest | [ ] | |
| NET-002 | No network calls | No HTTP/HTTPS requests | [ ] | |
| NET-003 | No analytics | No tracking code | [ ] | |
| NET-004 | No crash reporting | No external services | [ ] | |
| NET-005 | Fully offline | Works without network | [ ] | |

### Data & Storage

| ID | Requirement | Check | Status | Notes |
|----|-------------|-------|--------|-------|
| DS-001 | Local storage only | No cloud sync | [ ] | |
| DS-002 | Lessons from file system | Reads from device storage | [ ] | |
| DS-003 | Progress saved locally | Room/SQLite or files | [ ] | |
| DS-004 | Recordings saved locally | Audio files on device | [ ] | |
| DS-005 | No external dependencies | No required downloads | [ ] | |

### Permissions

| Permission | Allowed | Present | Justified |
|------------|---------|---------|-----------|
| RECORD_AUDIO | Yes | [ ] | [ ] |
| READ_EXTERNAL_STORAGE | Yes | [ ] | [ ] |
| WRITE_EXTERNAL_STORAGE | Yes | [ ] | [ ] |
| INTERNET | No | [ ] | N/A |
| CAMERA | No | [ ] | N/A |
| LOCATION | No | [ ] | N/A |
| CONTACTS | No | [ ] | N/A |
| PHONE | No | [ ] | N/A |

### Kiosk Mode Support

| ID | Requirement | Check | Status | Notes |
|----|-------------|-------|--------|-------|
| KM-001 | No system navigation required | App self-contained | [ ] | |
| KM-002 | No external links | No browser launches | [ ] | |
| KM-003 | No app switching | Stays in app | [ ] | |
| KM-004 | Parent exit option | Hidden exit mechanism | [ ] | |
| KM-005 | Crash recovery | Restarts gracefully | [ ] | |

## Screen-by-Screen Checklist

### Home Screen

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| HS-001 | Single primary action | [ ] | |
| HS-002 | Clear purpose | [ ] | |
| HS-003 | No distractions | [ ] | |
| HS-004 | Settings accessible | [ ] | |

### Lesson Picker Screen

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| LP-001 | No scrolling (or minimal) | [ ] | |
| LP-002 | Clear lesson selection | [ ] | |
| LP-003 | Progress visible (simple) | [ ] | |
| LP-004 | Back to home | [ ] | |

### Lesson Screen

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| LS-001 | Page-based navigation | [ ] | |
| LS-002 | Clear progress indicator | [ ] | |
| LS-003 | Audio controls | [ ] | |
| LS-004 | Exit option | [ ] | |

### Reader Screen

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| RS-001 | Text fits on screen | [ ] | |
| RS-002 | Highlighting works | [ ] | |
| RS-003 | Audio sync (if applicable) | [ ] | |
| RS-004 | Page navigation | [ ] | |

### Recording Screen

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| REC-001 | Clear record button | [ ] | |
| REC-002 | Recording indicator | [ ] | |
| REC-003 | Stop button visible | [ ] | |
| REC-004 | Playback option | [ ] | |

### Completion Screen

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| CS-001 | "All Done" message | [ ] | |
| CS-002 | No celebration | [ ] | |
| CS-003 | Clear exit | [ ] | |
| CS-004 | No "next lesson" auto | [ ] | |

## E-ink Optimization Checklist

### Display Considerations

| ID | Requirement | Check | Status | Notes |
|----|-------------|-------|--------|-------|
| EI-001 | High contrast | Black on white/cream | [ ] | |
| EI-002 | No animations | Static content | [ ] | |
| EI-003 | No video | Static images only | [ ] | |
| EI-004 | Minimal refreshes | Reduce screen updates | [ ] | |
| EI-005 | Large text | Readable on e-ink | [ ] | |

### Touch Response

| ID | Requirement | Check | Status | Notes |
|----|-------------|-------|--------|-------|
| ET-001 | Tolerant of slow response | UI handles latency | [ ] | |
| ET-002 | Clear touch feedback | Visual confirmation | [ ] | |
| ET-003 | No rapid interactions | No quick taps required | [ ] | |
| ET-004 | Debounced inputs | Prevents double-tap | [ ] | |

## Audio UX Checklist

### Playback

| ID | Requirement | Check | Status | Notes |
|----|-------------|-------|--------|-------|
| AU-001 | Consistent volume | All audio same level | [ ] | |
| AU-002 | Clear audio | No distortion | [ ] | |
| AU-003 | Appropriate pace | Slow enough for children | [ ] | |
| AU-004 | Replay available | Can hear again | [ ] | |
| AU-005 | Pause available | Can pause playback | [ ] | |

### Recording

| ID | Requirement | Check | Status | Notes |
|----|-------------|-------|--------|-------|
| AR-001 | Clear start indicator | Know when recording | [ ] | |
| AR-002 | Clear stop indicator | Know when stopped | [ ] | |
| AR-003 | Playback of recording | Can hear what was recorded | [ ] | |
| AR-004 | Re-record option | Can try again | [ ] | |
| AR-005 | Appropriate duration | Not too long | [ ] | |

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
| Screen Time Indicators | 30% |
| Navigation | 20% |
| Accessibility | 20% |
| App Constraints | 20% |
| E-ink/Audio | 10% |

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
# UX Lint Report

**Target:** [app/content identifier]
**Date:** [timestamp]
**Reviewer:** [name/role]

## Summary

| Category | Items | Pass | Fail | N/A |
|----------|-------|------|------|-----|
| Screen Time Indicators | | | | |
| Navigation | | | | |
| Accessibility | | | | |
| App Constraints | | | | |
| Screen-by-Screen | | | | |
| E-ink Optimization | | | | |
| Audio UX | | | | |

**Score:** [XX/100]
**Verdict:** [PASS/CONDITIONAL/FAIL]

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
