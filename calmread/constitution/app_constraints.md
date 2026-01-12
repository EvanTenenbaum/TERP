# App Constraints Constitution

**Version:** 1.0.0  
**Last Updated:** January 11, 2026  
**Status:** ACTIVE  
**Authority:** System Architect

## Preamble

This constitution defines the technical requirements, forbidden features, and operational constraints for the CalmRead Android application. These constraints ensure the app remains a calm, focused reading instrument rather than drifting toward conventional app patterns.

Any implementation that violates this constitution is **automatically rejected** regardless of other merits.

## Target Platform

### Hardware Specification

**Device:** BOOX Go Color 7 (Gen II)

| Component | Specification | App Requirement |
|-----------|---------------|-----------------|
| Display | 7" E-ink color | Page-based rendering, no scrolling |
| Touch | Capacitive | Large touch targets, minimal gestures |
| Audio Out | Built-in speaker | Reliable playback |
| Audio In | Built-in microphone | Recording capability |
| Storage | Internal + microSD | Local lesson storage |
| OS | Android-based | Standard Android APIs |
| Frontlight | Adjustable | Optional brightness control |

### Hardware Acceptance Requirements

The app must accommodate:

1. **Page-based navigation:** No scrolling (e-ink refresh optimization)
2. **Minimal touch interactions:** Predictable, deliberate taps only
3. **Reliable audio playback:** No gaps, consistent volume
4. **Audio recording:** Clear capture of child's voice
5. **Kiosk mode support:** Single-app operation

## Technical Requirements

### Offline-First Architecture

**Requirement:** The app must function fully without network connectivity.

| Aspect | Implementation |
|--------|----------------|
| Lesson content | Loaded from local storage |
| User data | Stored locally |
| Progress tracking | Local database |
| Audio assets | Bundled with lessons |
| Updates | Manual sideload for beta |

**Rationale:**
- Beta testing doesn't require accounts
- Reduces complexity and failure modes
- Ensures reliability in any environment
- Protects child privacy

### Local Storage Structure

```
/storage/emulated/0/CalmRead/
├── lessons/
│   ├── lesson_01/
│   │   ├── lesson.json
│   │   ├── pages/
│   │   ├── words/
│   │   ├── prompts/
│   │   └── recordings/
│   ├── lesson_02/
│   └── ...
├── progress/
│   └── progress.json
└── settings/
    └── settings.json
```

### Lesson Loading

**Requirement:** App loads lessons from local storage without code changes.

| Aspect | Specification |
|--------|---------------|
| Discovery | Scan `/lessons/` directory |
| Validation | Check `lesson.json` schema compliance |
| Ordering | Use `lessonId` for sequence |
| Hot reload | Detect new lessons on app start |

### Progress Tracking

**Requirement:** Minimal local progress tracking.

```json
{
  "progressSchema": {
    "lastLessonCompleted": "string (lessonId)",
    "lessonProgress": {
      "lesson_01": {
        "completed": true,
        "completedAt": "ISO8601 timestamp",
        "currentStep": null
      },
      "lesson_02": {
        "completed": false,
        "completedAt": null,
        "currentStep": 3
      }
    },
    "sessionHistory": [
      {
        "lessonId": "string",
        "startedAt": "ISO8601 timestamp",
        "endedAt": "ISO8601 timestamp",
        "completed": "boolean"
      }
    ]
  }
}
```

### Audio Requirements

#### Playback

| Requirement | Specification |
|-------------|---------------|
| Formats | MP3, WAV |
| Latency | < 200ms from tap to sound |
| Volume | Consistent across all audio |
| Controls | Play, pause (no seek in V1) |
| Queue | Sequential playback support |

#### Recording

| Requirement | Specification |
|-------------|---------------|
| Format | MP3 or WAV |
| Quality | 16kHz minimum, clear speech |
| Controls | One-tap start/stop |
| Storage | Local, organized by lesson |
| Naming | `{lessonId}_{timestamp}.mp3` |

### Kiosk Mode

**Requirement:** Support single-app operation to prevent escape.

| Level | Implementation |
|-------|----------------|
| Device-level | BOOX kiosk/launcher lock |
| App-level | No exit button, no back to home |
| Escape prevention | Require parent action to exit |

**Implementation Options:**
1. BOOX built-in app pinning
2. Third-party kiosk launcher
3. App-level navigation restrictions

## Forbidden Features

### Absolutely Forbidden (BLOCKER)

These features must **never** be implemented:

| Feature | Rationale |
|---------|-----------|
| Browser access | External content, safety risk |
| External links | Escape from controlled environment |
| Notifications | Interrupts calm, creates pressure |
| Gamification mechanics | Violates calm design constitution |
| Social features | Comparison, pressure, safety risk |
| Variable rewards | Addictive design pattern |
| Streaks | Fear of loss, pressure |
| Leaderboards | Comparison, pressure |
| In-app purchases | Inappropriate for children's app |
| Ads | Distraction, inappropriate content risk |

### Deferred Features (Not in Beta)

These features are explicitly deferred:

| Feature | Reason for Deferral |
|---------|---------------------|
| Accounts/auth | Complexity, not needed for beta |
| Cloud sync | Requires accounts, infrastructure |
| Payments | Not relevant for beta |
| Adaptive algorithms | Requires data, validation |
| Real-time ASR | Complexity, calm design risk |
| Parent dashboard | Complexity, not MVP |
| Multiple profiles | Complexity, not MVP |

## Core App Modes

### Mode 1: Read Mode

**Purpose:** Calm, page-based reading of decodable text.

| Aspect | Specification |
|--------|---------------|
| Navigation | Page forward/back only |
| Interaction | Tap word for pronunciation (optional) |
| Display | One page at a time, no scrolling |
| Audio | Tap-to-hear support |
| Progress | Page indicator |

### Mode 2: Guided Practice Mode

**Purpose:** Structured literacy lesson delivery.

| Aspect | Specification |
|--------|---------------|
| Structure | Step-by-step lesson flow |
| Navigation | Forward only (back for review) |
| Interaction | Response to prompts |
| Audio | Instruction audio, feedback |
| Highlighting | Optional karaoke (calm) |
| Progress | Step indicator |

### Mode 3: Listen/Read-Aloud Mode

**Purpose:** Audio-centric read-aloud experience.

| Aspect | Specification |
|--------|---------------|
| Focus | Audio playback primary |
| Display | Minimal screen updates |
| Interaction | Play/pause only |
| Highlighting | Line/phrase sync (optional) |
| Use case | Bedtime, passive listening |

### Mode 4: Record Mode

**Purpose:** Capture child's oral reading.

| Aspect | Specification |
|--------|---------------|
| Trigger | Integrated into lesson flow |
| Controls | One-tap start/stop |
| Feedback | Visual recording indicator only |
| Storage | Local, organized by lesson |
| Review | Parent can access recordings |

## Screen Specifications

### Allowed Screens

| Screen | Purpose | Primary Action |
|--------|---------|----------------|
| Home | Entry point | Select lesson |
| LessonPicker | Choose lesson | Tap lesson |
| LessonOverview | Preview lesson | Start lesson |
| LessonStep | Render lesson step | Complete step |
| ReaderPage | Display reading page | Navigate page |
| AudioPlaybackOverlay | Audio controls | Play/pause |
| RecordingScreen | Record read-aloud | Start/stop |
| CompletionScreen | End session | Return home |

### Screen Constraints

Every screen must follow:

| Constraint | Specification |
|------------|---------------|
| Primary action | Maximum 1 per screen |
| Secondary action | Maximum 1 per screen |
| Navigation | Consistent placement |
| Scrolling | Forbidden |
| Animation | Minimal, functional only |

### Navigation Flow

```
Home
  │
  ├── LessonPicker
  │     │
  │     └── LessonOverview
  │           │
  │           └── LessonStep (loop)
  │                 │
  │                 ├── ReaderPage
  │                 ├── RecordingScreen
  │                 └── AudioPlaybackOverlay
  │                       │
  │                       └── CompletionScreen
  │                             │
  │                             └── Home
  │
  └── Settings (parent-gated, future)
```

## UI Component Specifications

### Buttons

| Property | Specification |
|----------|---------------|
| Minimum size | 48dp x 48dp |
| Touch target | 56dp x 56dp minimum |
| Spacing | 16dp minimum between buttons |
| Style | Solid fill, clear border |
| States | Normal, pressed (no hover on e-ink) |

### Text

| Property | Specification |
|----------|---------------|
| Body font size | 24sp minimum |
| Heading font size | 32sp minimum |
| Line height | 1.5x font size |
| Contrast | High contrast for e-ink |
| Font family | Sans-serif, clear letterforms |

### Pages

| Property | Specification |
|----------|---------------|
| Margins | 24dp minimum |
| Content area | Single screen, no scroll |
| Page indicator | Subtle, non-distracting |
| Transitions | Instant (e-ink compatible) |

## Data Collection Policy

### Allowed Data Collection

| Data | Purpose | Storage |
|------|---------|---------|
| Lesson progress | Resume capability | Local only |
| Session timestamps | Usage patterns | Local only |
| Audio recordings | Parent review | Local only |
| Step completion | Progress tracking | Local only |

### Forbidden Data Collection

| Data | Reason |
|------|--------|
| Personal information | Privacy, not needed |
| Location | Privacy, not needed |
| Device identifiers | Privacy, not needed |
| Usage analytics (cloud) | Offline-first, privacy |
| Biometric data | Privacy, not needed |

## Error Handling

### Principles

1. **Fail gracefully:** Never crash, always recover
2. **Child-friendly messages:** Simple, non-scary language
3. **No blame:** Never suggest child did something wrong
4. **Clear action:** Always provide a way forward

### Error Messages

| Situation | Message | Action |
|-----------|---------|--------|
| Lesson not found | "Let's find another story!" | Return to picker |
| Audio failed | "Let's try that again." | Retry button |
| Recording failed | "Oops! Let's try again." | Retry button |
| Storage full | "We need more space." | Parent notification |

## Performance Requirements

### Responsiveness

| Action | Maximum Latency |
|--------|-----------------|
| Screen transition | 500ms |
| Button response | 100ms |
| Audio start | 200ms |
| Page render | 300ms |

### Resource Usage

| Resource | Limit |
|----------|-------|
| Memory | < 256MB |
| Storage (app) | < 100MB |
| Battery | Minimal background usage |
| CPU | Minimal when idle |

## Security Requirements

### App Security

| Requirement | Implementation |
|-------------|----------------|
| No network calls | Offline-first architecture |
| No external content | All content bundled |
| No permissions abuse | Minimal permissions |
| Secure storage | Standard Android security |

### Required Permissions

| Permission | Purpose | Justification |
|------------|---------|---------------|
| RECORD_AUDIO | Read-aloud recording | Core feature |
| READ_EXTERNAL_STORAGE | Load lessons | Core feature |
| WRITE_EXTERNAL_STORAGE | Save recordings | Core feature |

### Forbidden Permissions

| Permission | Reason |
|------------|--------|
| INTERNET | Offline-first |
| CAMERA | Not needed |
| LOCATION | Not needed |
| CONTACTS | Not needed |
| PHONE | Not needed |

## Testing Requirements

### Device Testing

All features must be tested on:
- BOOX Go Color 7 Gen II (primary target)
- Android emulator (development)

### Test Categories

| Category | Coverage |
|----------|----------|
| Lesson loading | All lesson formats |
| Audio playback | All audio types |
| Audio recording | Various environments |
| Navigation | All screen flows |
| E-ink rendering | Page transitions |
| Kiosk mode | Escape prevention |

## Compliance Checklist

Every build must pass:

### Technical Compliance
- [ ] Offline functionality verified
- [ ] All lessons load correctly
- [ ] Audio playback reliable
- [ ] Audio recording functional
- [ ] Progress saves correctly
- [ ] No network calls

### UI Compliance
- [ ] No scrolling anywhere
- [ ] Page-based navigation only
- [ ] Touch targets adequate
- [ ] Text readable on e-ink
- [ ] Transitions e-ink compatible

### Constraint Compliance
- [ ] No forbidden features
- [ ] No forbidden permissions
- [ ] No data collection violations
- [ ] Kiosk mode functional
- [ ] Error handling graceful

## Amendment Process

Changes to this constitution require:

1. Technical feasibility assessment
2. Calm design impact review
3. Security review
4. Version increment
5. Update all dependent documents

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-11 | Initial constitution |
