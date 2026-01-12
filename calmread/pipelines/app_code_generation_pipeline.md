# App Code Generation Pipeline

**Version:** 1.0.0  
**Last Updated:** January 11, 2026

## Overview

This pipeline generates and updates Android app code based on constitutions and schemas. It ensures the app enforces calm design principles, loads local lessons, and provides all required functionality.

## Pipeline Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Constitutions  │────▶│   Code          │────▶│   Build &       │
│  + Schemas      │     │   Generation    │     │   Test          │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Deployed     │◀────│   Device        │◀────│   QA Review     │
│    App          │     │   Testing       │     │   (Calm/UX)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## App Requirements Summary

From `constitution/app_constraints.md`:

### Must Have (V1 Beta)

| Feature | Description |
|---------|-------------|
| Lesson Loader | Load lessons from local storage |
| Page Renderer | Display pages without scrolling |
| Audio Playback | Play instruction and word audio |
| Audio Recording | Record child read-aloud |
| Progress Tracking | Save completion status locally |
| Kiosk Mode | Prevent app escape |

### Must NOT Have

| Feature | Reason |
|---------|--------|
| Network calls | Offline-first |
| Accounts/auth | Beta simplicity |
| Gamification | Calm design |
| Scrolling | E-ink + calm design |
| Notifications | Calm design |
| Browser/links | Safety |

## Step-by-Step Process

### Step 1: Review Specifications

**Actor:** Builder/Operator (ROLE_D)

Before generating code, review:

1. `constitution/app_constraints.md` - Technical requirements
2. `constitution/calm_design.md` - UX constraints
3. `schemas/app_screen_schema.json` - Screen definitions
4. `schemas/lesson_schema.json` - Data structures

### Step 2: Generate Project Structure

**Actor:** Builder/Operator (ROLE_D)

**Prompt Template:**

```
You are the CalmRead Builder/Operator (ROLE_D).

=== TASK ===
Generate the Android project structure for CalmRead.

=== SPECIFICATIONS ===
From app_constraints.md:
- Platform: Android (API 26+)
- Language: Kotlin
- Architecture: MVVM
- Storage: Local files + Room database
- No network permissions

From calm_design.md:
- No scrolling
- No animations (except fade)
- Large touch targets (48dp+)
- Calm color palette

=== REQUIRED STRUCTURE ===
app/android/
├── app/
│   ├── src/main/
│   │   ├── java/com/calmread/
│   │   │   ├── MainActivity.kt
│   │   │   ├── CalmReadApp.kt
│   │   │   ├── ui/
│   │   │   │   ├── screens/
│   │   │   │   ├── components/
│   │   │   │   └── theme/
│   │   │   ├── data/
│   │   │   │   ├── models/
│   │   │   │   ├── repository/
│   │   │   │   └── local/
│   │   │   ├── audio/
│   │   │   └── util/
│   │   ├── res/
│   │   │   ├── values/
│   │   │   ├── drawable/
│   │   │   └── layout/
│   │   └── AndroidManifest.xml
│   └── build.gradle.kts
├── build.gradle.kts
├── settings.gradle.kts
└── gradle.properties

=== OUTPUT ===
Generate all files with complete, working code.
```

### Step 3: Generate Core Components

**Actor:** Builder/Operator (ROLE_D)

Generate each component following specifications:

#### 3.1 Data Models

```
=== TASK ===
Generate Kotlin data models matching lesson_schema.json.

=== INPUT ===
schemas/lesson_schema.json

=== OUTPUT ===
data/models/Lesson.kt
data/models/Step.kt
data/models/Word.kt
data/models/AudioAsset.kt
etc.

=== REQUIREMENTS ===
- Use @Serializable for JSON parsing
- Match schema exactly
- Include validation helpers
```

#### 3.2 Lesson Loader

```
=== TASK ===
Generate LessonLoader that reads lessons from local storage.

=== REQUIREMENTS ===
- Scan /storage/emulated/0/CalmRead/lessons/
- Parse lesson.json files
- Validate against schema
- Return sorted list by lessonId
- Handle errors gracefully

=== OUTPUT ===
data/repository/LessonRepository.kt
data/local/LessonLoader.kt
```

#### 3.3 Audio Components

```
=== TASK ===
Generate audio playback and recording components.

=== REQUIREMENTS ===
Playback:
- Play MP3 files from lesson directories
- Support play, pause, stop
- Callback on completion
- No background playback

Recording:
- Record to MP3/WAV
- One-tap start/stop
- Save to lesson recordings directory
- Visual indicator only (no waveform)

=== OUTPUT ===
audio/AudioPlayer.kt
audio/AudioRecorder.kt
```

#### 3.4 UI Screens

```
=== TASK ===
Generate UI screens following app_screen_schema.json.

=== SCREENS ===
1. HomeScreen - Entry point, start lesson button
2. LessonPickerScreen - List of available lessons
3. LessonScreen - Lesson step renderer
4. ReaderScreen - Page-based text display
5. RecordingScreen - Read-aloud recording
6. CompletionScreen - "All Done" screen

=== CONSTRAINTS ===
- No scrolling (use paging)
- One primary action per screen
- Large touch targets (56dp)
- Calm color palette
- No animations except fade

=== OUTPUT ===
ui/screens/*.kt
ui/components/*.kt
```

#### 3.5 Theme

```
=== TASK ===
Generate calm theme following calm_design.md.

=== COLOR PALETTE ===
Primary: Warm, muted blue (#5B7C99)
Background: Warm white (#FFFDF7)
Text: Dark gray (#333333)
Accent: Soft green (#7BA05B)

=== TYPOGRAPHY ===
Body: 24sp minimum
Heading: 32sp minimum
Line height: 1.5x

=== OUTPUT ===
ui/theme/CalmTheme.kt
ui/theme/CalmColors.kt
ui/theme/CalmTypography.kt
```

### Step 4: Build and Test

**Actor:** Builder/Operator (ROLE_D)

```bash
#!/bin/bash
# build_app.sh - Build the CalmRead app

cd app/android

# Clean
./gradlew clean

# Build debug APK
./gradlew assembleDebug

# Run tests
./gradlew test

# Check for lint issues
./gradlew lint

echo "Build complete: app/build/outputs/apk/debug/app-debug.apk"
```

### Step 5: Calm Design Review

**Actor:** QA/Red Team (ROLE_C)

Review generated code for calm compliance:

```markdown
## App Code Calm Review

### UI Compliance

| Rule | Code Location | Status |
|------|---------------|--------|
| No scrolling | All screens | [ ] |
| One primary action | Each screen | [ ] |
| Touch targets 48dp+ | All buttons | [ ] |
| No animations | Transitions | [ ] |
| Calm colors | Theme | [ ] |

### Forbidden Features Check

| Feature | Present? | Location |
|---------|----------|----------|
| ScrollView | [ ] | |
| RecyclerView (scrolling) | [ ] | |
| Animation APIs | [ ] | |
| Network calls | [ ] | |
| Notification APIs | [ ] | |
| WebView | [ ] | |

### Permission Audit

| Permission | Allowed? | Present? |
|------------|----------|----------|
| RECORD_AUDIO | Yes | [ ] |
| READ_EXTERNAL_STORAGE | Yes | [ ] |
| WRITE_EXTERNAL_STORAGE | Yes | [ ] |
| INTERNET | No | [ ] |
| CAMERA | No | [ ] |
```

### Step 6: Device Testing

**Actor:** Builder/Operator (ROLE_D)

Test on BOOX Go Color 7:

```markdown
## Device Test Checklist

### Installation
- [ ] APK installs successfully
- [ ] App launches without crash
- [ ] Permissions granted correctly

### Lesson Loading
- [ ] Lessons discovered from storage
- [ ] lesson.json parsed correctly
- [ ] Lesson list displays

### Navigation
- [ ] Home → Lesson Picker works
- [ ] Lesson selection works
- [ ] Back navigation works
- [ ] Completion → Home works

### Page Rendering
- [ ] Text displays clearly on e-ink
- [ ] No scrolling anywhere
- [ ] Page transitions work
- [ ] Touch targets responsive

### Audio
- [ ] Playback works reliably
- [ ] Volume appropriate
- [ ] Recording captures voice
- [ ] Recordings save correctly

### E-ink Specific
- [ ] Refresh rate acceptable
- [ ] No ghosting issues
- [ ] Contrast sufficient
- [ ] Touch latency acceptable
```

### Step 7: Iterate and Fix

**Actor:** Builder/Operator (ROLE_D)

Address any issues found:

```
=== TASK ===
Fix issues found in device testing.

=== ISSUES ===
1. [Issue description]
2. [Issue description]

=== CONSTRAINTS ===
- Maintain calm design compliance
- No new features
- Fix only reported issues

=== OUTPUT ===
Updated code files
```

### Step 8: Package Release

**Actor:** Builder/Operator (ROLE_D)

```bash
#!/bin/bash
# package_release.sh - Package release APK

cd app/android

# Build release APK
./gradlew assembleRelease

# Sign APK (if keystore configured)
# jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
#   -keystore calmread.keystore \
#   app/build/outputs/apk/release/app-release-unsigned.apk \
#   calmread

# Verify
./gradlew verifyRelease

echo "Release APK: app/build/outputs/apk/release/"
```

## Code Generation Prompts

### Full App Generation Prompt

```
You are the CalmRead Builder/Operator (ROLE_D).

=== TASK ===
Generate the complete CalmRead Android app.

=== SPECIFICATIONS ===

From constitution/app_constraints.md:
- Offline-first, no network
- Page-based navigation, no scrolling
- Local lesson loading
- Audio playback and recording
- Simple progress tracking
- Kiosk mode support

From constitution/calm_design.md:
- No gamification
- No animations (except fade)
- Large touch targets
- Calm color palette
- Clear endpoints

From schemas/app_screen_schema.json:
- Screens: Home, LessonPicker, Lesson, Reader, Recording, Completion
- Max 1 primary action per screen
- Consistent navigation

From schemas/lesson_schema.json:
- Lesson data structure
- Step types
- Audio asset references

=== TECHNOLOGY STACK ===
- Kotlin
- Jetpack Compose (or XML if preferred for e-ink)
- Room for progress storage
- MediaPlayer/MediaRecorder for audio
- Kotlinx.serialization for JSON

=== OUTPUT ===
Complete, working Android project with:
1. All source files
2. Build configuration
3. Resources
4. Manifest

=== CONSTRAINTS ===
- No placeholder code
- No TODO comments
- All features functional
- Follows all constitutions
```

### Screen Generation Prompt

```
You are the CalmRead Builder/Operator (ROLE_D).

=== TASK ===
Generate the [SCREEN_NAME] screen.

=== SCREEN SPECIFICATION ===
From app_screen_schema.json:
[Paste screen definition]

=== REQUIREMENTS ===
- No scrolling
- One primary action: [action]
- Secondary action (if any): [action]
- Touch targets: 56dp minimum
- Colors from CalmTheme

=== NAVIGATION ===
- Enters from: [screen]
- Exits to: [screen]
- Back behavior: [behavior]

=== OUTPUT ===
Complete Kotlin file for the screen.
```

### Component Generation Prompt

```
You are the CalmRead Builder/Operator (ROLE_D).

=== TASK ===
Generate the [COMPONENT_NAME] component.

=== COMPONENT SPECIFICATION ===
[Description of component]

=== CALM DESIGN REQUIREMENTS ===
- [Specific requirements]

=== OUTPUT ===
Complete Kotlin file for the component.
```

## Code Templates

### Calm Button Template

```kotlin
@Composable
fun CalmButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    Button(
        onClick = onClick,
        modifier = modifier
            .defaultMinSize(minWidth = 120.dp, minHeight = 56.dp),
        enabled = enabled,
        colors = ButtonDefaults.buttonColors(
            containerColor = CalmColors.Primary,
            contentColor = CalmColors.OnPrimary,
            disabledContainerColor = CalmColors.Disabled,
            disabledContentColor = CalmColors.OnDisabled
        ),
        shape = RoundedCornerShape(8.dp),
        elevation = ButtonDefaults.buttonElevation(
            defaultElevation = 0.dp,
            pressedElevation = 0.dp
        )
    ) {
        Text(
            text = text,
            style = CalmTypography.Button
        )
    }
}
```

### Page Container Template

```kotlin
@Composable
fun CalmPageContainer(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(CalmColors.Background)
            .padding(24.dp)
    ) {
        content()
    }
}
```

### Screen Template

```kotlin
@Composable
fun ExampleScreen(
    onPrimaryAction: () -> Unit,
    onBack: () -> Unit
) {
    CalmPageContainer {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.SpaceBetween,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header
            Text(
                text = "Screen Title",
                style = CalmTypography.Heading
            )
            
            // Content
            Box(
                modifier = Modifier.weight(1f),
                contentAlignment = Alignment.Center
            ) {
                // Main content here
            }
            
            // Primary Action
            CalmButton(
                text = "Continue",
                onClick = onPrimaryAction
            )
        }
    }
}
```

## Error Handling

| Error | Resolution |
|-------|------------|
| Build failure | Check dependencies, fix syntax |
| Calm violation | Refactor to comply |
| Device incompatibility | Test on target device, adjust |
| Performance issue | Optimize for e-ink |

## Quality Gates

| Gate | Criteria | Owner |
|------|----------|-------|
| Build Success | Compiles without errors | Builder/Operator |
| Lint Pass | No critical lint issues | Builder/Operator |
| Calm Review | Passes calm design audit | QA/Red Team |
| Device Test | Works on BOOX Go Color 7 | Builder/Operator |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-11 | Initial pipeline |
