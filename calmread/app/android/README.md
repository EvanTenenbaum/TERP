# CalmRead Android App

**Version:** 0.1.0 (Scaffold)  
**Target:** BOOX Go Color 7 (Android 12, E-ink)  
**Purpose:** Calm, systematic phonics reading instruction for young children

## Overview

This is the Android application scaffold for CalmRead. The app is designed to run completely offline, with no internet permissions, and follows strict calm design principles to avoid screen time addiction patterns.

## Architecture

```
app/
├── src/main/
│   ├── java/com/calmread/
│   │   ├── MainActivity.kt          # Entry point
│   │   ├── ui/                       # UI components
│   │   │   ├── HomeScreen.kt
│   │   │   ├── LessonPickerScreen.kt
│   │   │   ├── LessonScreen.kt
│   │   │   ├── ReaderScreen.kt
│   │   │   ├── RecordingScreen.kt
│   │   │   └── CompletionScreen.kt
│   │   ├── data/                     # Data layer
│   │   │   ├── LessonRepository.kt
│   │   │   ├── ProgressRepository.kt
│   │   │   └── RecordingRepository.kt
│   │   ├── audio/                    # Audio handling
│   │   │   ├── AudioPlayer.kt
│   │   │   └── AudioRecorder.kt
│   │   └── lesson/                   # Lesson logic
│   │       ├── LessonLoader.kt
│   │       ├── LessonEngine.kt
│   │       └── StepHandler.kt
│   └── res/
│       ├── layout/                   # XML layouts
│       ├── values/                   # Colors, strings, themes
│       └── drawable/                 # Icons, backgrounds
├── build.gradle.kts                  # App-level build config
└── proguard-rules.pro               # ProGuard rules
```

## Design Principles

### Calm Design Compliance

This app MUST comply with the Calm Design Constitution:

- **No scrolling** - Page-based navigation only
- **No animations** - Only subtle fade transitions (≤300ms)
- **No gamification** - No points, badges, streaks, or rewards
- **No excitement** - Calm colors, calm audio, calm feedback
- **Clear endpoints** - "All Done" screens, no autoplay

### E-ink Optimization

Designed for BOOX Go Color 7 e-ink display:

- High contrast (black on cream/white)
- No animations (prevents ghosting)
- Large touch targets (56dp minimum)
- Minimal screen refreshes
- Static content preferred

### Offline-Only

- **No INTERNET permission** in manifest
- All lessons loaded from local storage
- All progress saved locally
- All recordings saved locally
- No analytics, no crash reporting

## Screens

### 1. Home Screen
- Single "Start Reading" button
- Settings access (parent)
- Clean, minimal design

### 2. Lesson Picker Screen
- List of available lessons
- Simple progress indicator (completed/not completed)
- No scrolling if possible (paginate if needed)

### 3. Lesson Screen
- ViewPager-based step navigation
- Audio playback controls
- Progress indicator (step X of Y)
- Exit button

### 4. Reader Screen
- Large, readable text
- Line-by-line highlighting (optional)
- Audio sync
- Page navigation

### 5. Recording Screen
- Clear record button
- Recording indicator
- Stop button
- Playback option
- Continue button

### 6. Completion Screen
- "All Done" message
- Return to home button
- No celebration, no "next lesson" prompt

## Data Flow

```
External Storage
    └── CalmRead/
        ├── lessons/
        │   ├── lesson_01/
        │   │   ├── lesson.json
        │   │   ├── words/
        │   │   └── prompts/
        │   └── lesson_02/
        │       └── ...
        ├── progress/
        │   └── progress.json
        └── recordings/
            └── [session_id]/
                └── [recording_id].mp3
```

## Build Instructions

### Prerequisites

- Android Studio (latest stable)
- Android SDK 31+ (Android 12)
- Kotlin 1.9+
- Gradle 8.0+

### Build Debug APK

```bash
cd app/android
./gradlew assembleDebug
```

Output: `app/build/outputs/apk/debug/app-debug.apk`

### Build Release APK

```bash
./gradlew assembleRelease
```

### Deploy to Device

```bash
# Install APK
adb install -r app/build/outputs/apk/debug/app-debug.apk

# Deploy lessons
adb push ../../curriculum/lessons/* /storage/emulated/0/CalmRead/lessons/

# Launch app
adb shell am start -n com.calmread/.MainActivity
```

## Configuration

### Lesson Path

Default lesson path: `/storage/emulated/0/CalmRead/lessons/`

Can be configured in `LessonRepository.kt`.

### Audio Settings

- Sample rate: 44100 Hz
- Bit depth: 16-bit
- Channels: Mono
- Format: MP3

### Display Settings

- Text size: 24sp (body), 32sp (headings)
- Touch targets: 56dp minimum
- Colors: See `res/values/colors.xml`

## Permissions

Required permissions (AndroidManifest.xml):

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

**Explicitly NOT included:**
- `android.permission.INTERNET`
- `android.permission.ACCESS_NETWORK_STATE`

## Testing

### Unit Tests

```bash
./gradlew test
```

### Instrumented Tests

```bash
./gradlew connectedAndroidTest
```

### Manual Testing Checklist

- [ ] App launches on BOOX Go Color 7
- [ ] Lessons load from external storage
- [ ] Audio plays correctly
- [ ] Recording works
- [ ] Progress saves
- [ ] No scrolling anywhere
- [ ] All touch targets ≥ 48dp
- [ ] E-ink display renders well

## Kiosk Mode

For beta testing, the app can be run in kiosk mode:

1. Use BOOX built-in kiosk mode, or
2. Use third-party kiosk launcher

The app is designed to be self-contained with no need to exit.

## Troubleshooting

### Lessons Not Loading

1. Check lessons exist: `adb shell ls /storage/emulated/0/CalmRead/lessons/`
2. Check permissions granted
3. Check lesson.json is valid JSON

### Audio Not Playing

1. Check audio files exist
2. Check volume settings
3. Check audio format (MP3)

### Recording Not Working

1. Check RECORD_AUDIO permission
2. Check storage permission
3. Check microphone hardware

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-01-11 | Initial scaffold |

## License

Proprietary - All rights reserved
