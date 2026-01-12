# Calm Lint Checklist

**Version:** 1.0.0  
**Last Updated:** January 11, 2026  
**Purpose:** Validate content and code against Calm Design Constitution

## How to Use This Checklist

1. Review each item against the content or code being validated
2. Mark each item as PASS (✓), FAIL (✗), or N/A (-)
3. For any FAIL, document the specific violation and location
4. Calculate the final score based on severity weights
5. A single BLOCKER = automatic FAIL regardless of score

## UI Rules Checklist

### Navigation & Layout

| ID | Rule | Check | Status | Notes |
|----|------|-------|--------|-------|
| UI-001 | No scrolling anywhere in the app | Verify no ScrollView, no vertical scroll, no horizontal scroll | [ ] | |
| UI-002 | Page-based navigation only | Verify ViewPager or equivalent, discrete pages | [ ] | |
| UI-003 | One primary action per screen | Count primary buttons/actions per screen | [ ] | |
| UI-004 | Consistent navigation pattern | Back button always same position, same behavior | [ ] | |
| UI-005 | Clear visual hierarchy | Primary action visually dominant | [ ] | |

### Animation & Motion

| ID | Rule | Check | Status | Notes |
|----|------|-------|--------|-------|
| UI-006 | No celebratory animations | No confetti, fireworks, bouncing, spinning | [ ] | |
| UI-007 | No confetti/fireworks/sparkles | Search code for animation keywords | [ ] | |
| UI-008 | Only subtle fade transitions allowed | Verify transitions are fade only, < 300ms | [ ] | |
| UI-009 | No variable rewards | No random rewards, no surprise elements | [ ] | |
| UI-010 | No attention-grabbing motion | No pulsing, flashing, or movement to draw eye | [ ] | |

### Interruptions & Flow

| ID | Rule | Check | Status | Notes |
|----|------|-------|--------|-------|
| UI-011 | No popups interrupting flow | No modal dialogs during lesson flow | [ ] | |
| UI-012 | No interstitials between activities | Direct transitions only | [ ] | |
| UI-013 | No "rate this app" prompts | Search for rating prompts | [ ] | |
| UI-014 | No upsell or promotional content | No ads, no premium prompts | [ ] | |
| UI-015 | No notifications | No push notifications, no in-app alerts | [ ] | |

### Audio & Sound

| ID | Rule | Check | Status | Notes |
|----|------|-------|--------|-------|
| UI-016 | No excited voice tones | Audio is calm, measured, supportive | [ ] | |
| UI-017 | No reward sounds | No dings, chimes, or celebration sounds | [ ] | |
| UI-018 | No background music | Only instructional audio | [ ] | |
| UI-019 | Consistent audio volume | All audio normalized to same level | [ ] | |
| UI-020 | Audio can be paused/replayed | User controls audio playback | [ ] | |

### Visual Design

| ID | Rule | Check | Status | Notes |
|----|------|-------|--------|-------|
| UI-021 | Muted, calm color palette | No bright/saturated colors | [ ] | |
| UI-022 | High contrast for readability | Text clearly readable | [ ] | |
| UI-023 | Large touch targets (48dp+) | Measure all interactive elements | [ ] | |
| UI-024 | Adequate spacing | Elements not crowded | [ ] | |
| UI-025 | E-ink optimized (if applicable) | Works well on e-ink display | [ ] | |

## Principles Checklist

### Predictability

| ID | Principle | Check | Status | Notes |
|----|-----------|-------|--------|-------|
| P-001 | Same structure every lesson | Lesson flow follows consistent pattern | [ ] | |
| P-002 | No surprises | No unexpected elements or changes | [ ] | |
| P-003 | Consistent terminology | Same words used for same concepts | [ ] | |
| P-004 | Consistent visual language | Same icons, colors, layouts | [ ] | |
| P-005 | Predictable audio cues | Same sounds mean same things | [ ] | |

### Boundedness

| ID | Principle | Check | Status | Notes |
|----|-----------|-------|--------|-------|
| B-001 | Clear start point | Lesson has obvious beginning | [ ] | |
| B-002 | Clear end point | "All Done" screen, no ambiguity | [ ] | |
| B-003 | No infinite content | Finite number of steps/pages | [ ] | |
| B-004 | No autoplay to next | Does not auto-advance to next lesson | [ ] | |
| B-005 | Session has natural endpoint | Can stop at logical points | [ ] | |

### Low Arousal

| ID | Principle | Check | Status | Notes |
|----|-----------|-------|--------|-------|
| LA-001 | Minimal motion | Only essential movement | [ ] | |
| LA-002 | Muted colors | No bright, exciting colors | [ ] | |
| LA-003 | Calm audio tone | Voice is soothing, not exciting | [ ] | |
| LA-004 | No urgency | No timers, no pressure | [ ] | |
| LA-005 | Relaxed pacing | User controls speed | [ ] | |

### Agency Without Pressure

| ID | Principle | Check | Status | Notes |
|----|-----------|-------|--------|-------|
| AWP-001 | Can stop anytime | Exit always available | [ ] | |
| AWP-002 | No penalties for stopping | No lost progress, no negative feedback | [ ] | |
| AWP-003 | No streaks | No consecutive day tracking | [ ] | |
| AWP-004 | No time limits | No countdown timers | [ ] | |
| AWP-005 | No comparison | No leaderboards, no peer comparison | [ ] | |

## Highlighting Policy Checklist

| ID | Rule | Check | Status | Notes |
|----|------|-------|--------|-------|
| H-001 | Granularity is none, line, or phrase | No word-level highlighting | [ ] | |
| H-002 | Cadence is fixed | Highlighting follows consistent pattern | [ ] | |
| H-003 | Style is subtle | Not attention-grabbing | [ ] | |
| H-004 | Color is muted | Soft highlight color | [ ] | |
| H-005 | Optional/configurable | Can be disabled if needed | [ ] | |

## Gamification Detection

### Forbidden Elements

| ID | Element | Present? | Location | Severity |
|----|---------|----------|----------|----------|
| G-001 | Points/scores | [ ] | | BLOCKER |
| G-002 | Stars/badges | [ ] | | BLOCKER |
| G-003 | Levels/XP | [ ] | | BLOCKER |
| G-004 | Streaks | [ ] | | BLOCKER |
| G-005 | Leaderboards | [ ] | | BLOCKER |
| G-006 | Achievements | [ ] | | BLOCKER |
| G-007 | Virtual currency | [ ] | | BLOCKER |
| G-008 | Unlockables | [ ] | | BLOCKER |
| G-009 | Progress bars (gamified) | [ ] | | CRITICAL |
| G-010 | Countdown timers | [ ] | | CRITICAL |

### Behavioral Triggers

| ID | Trigger | Present? | Location | Severity |
|----|---------|----------|----------|----------|
| BT-001 | Variable rewards | [ ] | | BLOCKER |
| BT-002 | Loss aversion messaging | [ ] | | CRITICAL |
| BT-003 | FOMO triggers | [ ] | | CRITICAL |
| BT-004 | Social comparison | [ ] | | CRITICAL |
| BT-005 | Artificial scarcity | [ ] | | CRITICAL |
| BT-006 | Commitment escalation | [ ] | | MAJOR |

## Content Tone Checklist

### Language Analysis

| ID | Check | Status | Notes |
|----|-------|--------|-------|
| CT-001 | No exclamation marks (except rare) | [ ] | |
| CT-002 | No "amazing/awesome/fantastic" | [ ] | |
| CT-003 | No competitive language | [ ] | |
| CT-004 | No urgency words | [ ] | |
| CT-005 | Supportive, not evaluative | [ ] | |
| CT-006 | Calm, measured tone | [ ] | |

### Forbidden Phrases

Search content for these phrases:

- [ ] "Great job!" (excessive)
- [ ] "You're amazing!"
- [ ] "Keep your streak!"
- [ ] "Don't lose your progress!"
- [ ] "Beat your best!"
- [ ] "Hurry!"
- [ ] "Time's running out!"
- [ ] "You're falling behind!"
- [ ] "Your friends are ahead!"

## Scoring

### Severity Weights

| Severity | Points Deducted | Effect |
|----------|-----------------|--------|
| BLOCKER | -100 | Auto-fail |
| CRITICAL | -25 | Must fix |
| MAJOR | -10 | Should fix |
| MINOR | -2 | Track |

### Score Calculation

```
Base Score: 100
Final Score = 100 - (sum of deductions)

PASS: Score ≥ 80, no BLOCKERS
CONDITIONAL: Score ≥ 60, no BLOCKERS  
FAIL: Score < 60 OR any BLOCKERS
```

## Report Template

```markdown
# Calm Lint Report

**Content/Code:** [identifier]
**Date:** [timestamp]
**Reviewer:** [name/role]

## Summary

| Category | Items | Pass | Fail | N/A |
|----------|-------|------|------|-----|
| UI Rules | 25 | | | |
| Principles | 20 | | | |
| Highlighting | 5 | | | |
| Gamification | 16 | | | |
| Content Tone | 15 | | | |

**Score:** [XX/100]
**Verdict:** [PASS/CONDITIONAL/FAIL]

## Blockers

[List any blockers found]

## Critical Issues

[List critical issues]

## Major Issues

[List major issues]

## Minor Issues

[List minor issues]

## Recommendations

[List recommendations]
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-11 | Initial checklist |
