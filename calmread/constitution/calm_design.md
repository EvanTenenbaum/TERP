# Calm Design Constitution

**Version:** 1.0.0  
**Last Updated:** January 11, 2026  
**Status:** ACTIVE  
**Authority:** System Architect

## Preamble

Calm is a **system constraint**, not a visual style. The UI and behavior must enforce calmness at every level. This constitution defines the non-negotiable principles, rules, and constraints that govern all CalmRead user experiences.

Any feature, design, or implementation that violates this constitution is **automatically rejected** regardless of other merits.

## Core Principles

### Principle 1: Predictability

> The child should always know what comes next.

**Requirements:**
- Same lesson/session structure every time
- No surprise mechanics or hidden features
- Consistent navigation patterns
- Reliable response to user actions
- No random rewards or variable outcomes

**Violations:**
- Pop-up notifications
- Surprise bonuses or unlocks
- Randomized content order
- Inconsistent button placement
- "Easter eggs" or hidden features

### Principle 2: Boundedness

> Every session has a clear beginning and end.

**Requirements:**
- Clear start point for each session
- Explicit "All Done" ending
- No infinite queues or autoplay
- Deliberate action required to start new session
- Visible progress toward completion

**Violations:**
- "Next up" autoplay
- Infinite scroll
- Unbounded content feeds
- Sessions that don't end
- Automatic session continuation

### Principle 3: Low Arousal

> The experience should calm, not excite.

**Requirements:**
- Minimal motion and animation
- No flashy transitions
- Muted, warm color palette
- Gentle audio (no loud sounds)
- Slow, predictable timing

**Violations:**
- Confetti or fireworks
- Bouncing or shaking elements
- Bright flashing colors
- Exciting sound effects
- Fast-paced animations

### Principle 4: Agency Without Pressure

> The child controls the experience without fear of loss.

**Requirements:**
- Child can stop at any time
- No penalties for stopping
- No streak loss mechanics
- No "fear of missing out" triggers
- No time pressure

**Violations:**
- Streak counters
- Daily login rewards
- Limited-time offers
- Countdown timers
- Loss aversion mechanics

## UI Rules (Hard Constraints)

These rules are **non-negotiable** and must be enforced in all implementations.

### Navigation Rules

| Rule ID | Rule | Rationale |
|---------|------|-----------|
| UI-001 | No scrolling anywhere | E-ink optimization, reduces cognitive load |
| UI-002 | Page-based navigation only | Predictable, bounded interaction |
| UI-003 | One primary action per screen | Reduces decision fatigue |
| UI-004 | Consistent back/exit placement | Predictable escape route |
| UI-005 | No gesture-based navigation | Explicit, visible controls only |

### Visual Rules

| Rule ID | Rule | Rationale |
|---------|------|-----------|
| UI-006 | No celebratory animations | Low arousal principle |
| UI-007 | No confetti, fireworks, or sparkles | Low arousal principle |
| UI-008 | No bouncing or attention-grabbing motion | Low arousal principle |
| UI-009 | No variable visual rewards | Agency without pressure |
| UI-010 | Minimal color palette | E-ink optimization, calm aesthetic |

### Interaction Rules

| Rule ID | Rule | Rationale |
|---------|------|-----------|
| UI-011 | No popups that interrupt flow | Predictability principle |
| UI-012 | No illustration hotspots | Educational constitution alignment |
| UI-013 | No mini-games | App constraints constitution |
| UI-014 | No decorative animations | Low arousal principle |
| UI-015 | Touch targets must be large and clear | Accessibility, child-friendly |

### Audio Rules

| Rule ID | Rule | Rationale |
|---------|------|-----------|
| UI-016 | No "exciting" voice tones | Low arousal principle |
| UI-017 | No reward sounds (dings, chimes) | Agency without pressure |
| UI-018 | Consistent volume levels | Predictability principle |
| UI-019 | Calm, warm narrator voice | Low arousal principle |
| UI-020 | No background music | Reduces cognitive load |

## Highlighting Policy

Karaoke-style highlighting is **permitted** under strict conditions:

### Allowed Conditions

1. **Purpose:** Directly supports print tracking during guided reading
2. **Cadence:** Fixed and predictable (not variable speed)
3. **Granularity:** Line or phrase level preferred (fewer e-ink refreshes)
4. **Style:** Subtle highlight (no bouncing, no color changes)
5. **Control:** Must be optional and easily disabled

### Forbidden Conditions

1. Word-by-word highlighting with bouncing
2. Color-changing highlights
3. Animated highlight transitions
4. Highlighting that draws attention away from text
5. Highlighting during independent reading (only during model/guided reading)

### Implementation Specification

```json
{
  "highlightPolicy": {
    "allowed": ["none", "line", "phrase"],
    "forbidden": ["word_bounce", "color_change", "animated"],
    "cadence": {
      "type": "fixed",
      "minDuration": 2000,
      "maxDuration": 5000
    },
    "style": {
      "type": "background",
      "color": "#FFFDE7",
      "opacity": 0.3
    }
  }
}
```

## Session Rules

### Session Start

1. Child (or parent) explicitly selects a lesson
2. Brief overview screen shows what will happen
3. Single tap to begin
4. No countdown or pressure

### Session Flow

1. Steps proceed in fixed order
2. Progress indicator shows position (e.g., "Step 3 of 5")
3. Each step completes before next begins
4. No skipping ahead (maintains structure)
5. Back button allows review of previous steps

### Session End

1. Final step completes
2. "All Done" screen appears
3. Session stops completely
4. No "next lesson" autoplay
5. Deliberate action required to start another session

### Session Interruption

1. Child can exit at any time via consistent exit button
2. No penalty for early exit
3. No "are you sure?" guilt messaging
4. Progress saved to current step
5. Can resume later from saved point

## Sleep-Aware Behavior (Optional)

For bedtime use, the following features may be enabled:

| Feature | Description |
|---------|-------------|
| Brightness cap | Maximum brightness reduced after set time |
| Warm light | Color temperature shifts warmer |
| Listen-only mode | Audio playback without visual engagement |
| Session limit | Optional parent-set session limit |

## Compliance Checklist

Every screen, feature, and interaction must pass this checklist:

### Predictability Check
- [ ] Does the user know what will happen next?
- [ ] Is the interaction consistent with other screens?
- [ ] Are there any surprise elements?

### Boundedness Check
- [ ] Is there a clear end to this interaction?
- [ ] Can the user see progress toward completion?
- [ ] Is there any infinite or unbounded content?

### Low Arousal Check
- [ ] Are animations minimal and slow?
- [ ] Are colors muted and warm?
- [ ] Are sounds gentle and consistent?
- [ ] Is there any exciting or attention-grabbing element?

### Agency Check
- [ ] Can the user stop at any time?
- [ ] Is there any penalty for stopping?
- [ ] Is there any pressure to continue?
- [ ] Is there any fear of missing out?

## Violation Severity

| Severity | Description | Action |
|----------|-------------|--------|
| **BLOCKER** | Violates core principle | Cannot ship, must fix |
| **CRITICAL** | Violates hard UI rule | Must fix before release |
| **MAJOR** | Violates soft guideline | Should fix, document if not |
| **MINOR** | Suboptimal calm design | Track for future improvement |

## Examples

### Compliant Design

**Lesson Complete Screen:**
```
┌─────────────────────────────────────┐
│                                     │
│           All Done! 📖              │
│                                     │
│    You read about the cat.          │
│                                     │
│         ┌─────────────┐             │
│         │    Home     │             │
│         └─────────────┘             │
│                                     │
└─────────────────────────────────────┘
```

- Simple, clear message
- Single action (Home)
- No celebration animation
- No "play again" pressure

### Non-Compliant Design (REJECTED)

**Lesson Complete Screen:**
```
┌─────────────────────────────────────┐
│  🎉 AMAZING JOB! 🎉                 │
│  ⭐⭐⭐ 3 STARS! ⭐⭐⭐              │
│  🔥 5 DAY STREAK! 🔥                │
│                                     │
│  You earned 50 coins!               │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │Play Again│  │Next Level│        │
│  └──────────┘  └──────────┘        │
│                                     │
│  ⏰ Bonus lesson expires in 2:00!   │
└─────────────────────────────────────┘
```

**Violations:**
- UI-006: Celebratory elements (stars, fire)
- UI-009: Variable rewards (coins)
- Principle 4: Streak counter (fear of loss)
- Principle 4: Time pressure (countdown)
- Principle 2: "Next Level" autoplay suggestion

## Amendment Process

Changes to this constitution require:

1. Written proposal with rationale
2. Review against educational research
3. Impact assessment on all existing features
4. Version increment (e.g., 1.0 → 1.1)
5. Documentation of change in changelog
6. Update all dependent documents

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-11 | Initial constitution |

## References

- Radesky, J. S., et al. (2020). "Digital Media and Symptoms of Attention-Deficit/Hyperactivity Disorder in Adolescents"
- Christakis, D. A. (2009). "The effects of infant media usage"
- American Academy of Pediatrics. (2016). "Media and Young Minds"
- Common Sense Media. (2021). "The Common Sense Census: Media Use by Kids"
