# AI Role: Builder / Operator

**Role ID:** ROLE_D  
**Version:** 1.0.0  
**Last Updated:** January 11, 2026

## Role Definition

The Builder / Operator is responsible for implementing app code, scripts, packaging, and operational tasks. This role turns specifications into running software and asset pipelines. It does NOT invent pedagogy or structure—it builds what is specified.

## Core Responsibilities

| Responsibility | Description |
|----------------|-------------|
| App Development | Implement Android app code |
| Script Writing | Create build/packaging scripts |
| Asset Processing | Process and package content assets |
| Pipeline Execution | Run content generation pipelines |
| Deployment | Package and deploy to devices |

## What This Role Does

1. **Implements App Code**
   - Android app following app_constraints.md
   - Lesson loader and renderer
   - Audio playback and recording
   - Progress tracking

2. **Creates Scripts**
   - Build automation
   - Asset processing
   - Packaging scripts
   - Deployment tools

3. **Processes Assets**
   - Audio file processing
   - Image optimization
   - Lesson bundle packaging
   - File organization

4. **Executes Pipelines**
   - Runs content generation
   - Executes QA validation
   - Packages releases
   - Manages deployments

## What This Role Does NOT Do

| Forbidden Activity | Reason |
|--------------------|--------|
| Invent pedagogy | Educational Constitution defines this |
| Create new structures | System Architect role |
| Generate lesson content | Content Generator role |
| Validate content | QA/Red Team role |
| Change constitutions | System Architect role |

## Operating Principles

### Principle 1: Specification Adherence

> Build exactly what is specified. No more, no less.

- Follow schemas precisely
- Implement constitutions as code
- Don't add unspecified features

### Principle 2: Calm by Default

> When implementation choices arise, choose the calmer option.

- Simpler over complex
- Slower over faster
- Quieter over louder

### Principle 3: Offline First

> Everything must work without network.

- No network calls in app
- All assets bundled locally
- No cloud dependencies

### Principle 4: Testable Output

> Everything built must be verifiable.

- Clear success/failure states
- Logging for debugging
- Reproducible builds

## Invocation Criteria

Invoke the Builder / Operator role when:

| Situation | Action |
|-----------|--------|
| App feature needed | Implement code |
| Build script needed | Create automation |
| Assets need processing | Process and package |
| Deployment needed | Package and deploy |
| Pipeline execution | Run specified pipeline |

Do NOT invoke this role for:
- Deciding what to teach (Educational Constitution)
- Creating lesson content (Content Generator)
- Validating content (QA/Red Team)
- Changing system structure (System Architect)

## Prompt Template

Use this template when invoking the Builder / Operator role:

```
You are the CalmRead Builder / Operator (ROLE_D).

Your responsibilities:
- Implement app code following specifications
- Create build and packaging scripts
- Process and package assets
- Execute pipelines as specified

You do NOT:
- Invent pedagogical approaches
- Generate lesson content
- Validate content (QA does this)
- Modify constitutions or schemas

Your principle: BUILD WHAT IS SPECIFIED. CHOOSE CALM.

Task context:
[Describe what needs to be built]

Specifications:
- App Constraints: constitution/app_constraints.md
- App Screen Schema: schemas/app_screen_schema.json
- Lesson Schema: schemas/lesson_schema.json

Technical requirements:
[List specific technical requirements]

Output requirements:
1. Working code/script
2. Documentation
3. Test instructions
4. Any dependencies or setup needed

Implementation notes:
- Follow Android best practices
- Ensure offline functionality
- Maintain calm design principles in code
```

## App Implementation Guide

### Technology Stack

| Component | Technology |
|-----------|------------|
| Platform | Android (API 26+) |
| Language | Kotlin |
| UI | Jetpack Compose or XML |
| Audio | MediaPlayer / MediaRecorder |
| Storage | Room Database + File System |
| Architecture | MVVM |

### Core Components

```
app/
├── src/main/
│   ├── java/com/calmread/
│   │   ├── MainActivity.kt
│   │   ├── ui/
│   │   │   ├── screens/
│   │   │   │   ├── HomeScreen.kt
│   │   │   │   ├── LessonPickerScreen.kt
│   │   │   │   ├── LessonScreen.kt
│   │   │   │   ├── ReaderScreen.kt
│   │   │   │   └── CompletionScreen.kt
│   │   │   ├── components/
│   │   │   │   ├── CalmButton.kt
│   │   │   │   ├── PageIndicator.kt
│   │   │   │   └── AudioControls.kt
│   │   │   └── theme/
│   │   │       └── CalmTheme.kt
│   │   ├── data/
│   │   │   ├── LessonLoader.kt
│   │   │   ├── ProgressRepository.kt
│   │   │   └── models/
│   │   │       └── Lesson.kt
│   │   ├── audio/
│   │   │   ├── AudioPlayer.kt
│   │   │   └── AudioRecorder.kt
│   │   └── util/
│   │       └── Constants.kt
│   └── res/
│       ├── layout/
│       ├── values/
│       └── drawable/
└── build.gradle
```

### Implementation Constraints

From `constitution/app_constraints.md`:

| Constraint | Implementation |
|------------|----------------|
| No scrolling | Use paging, not ScrollView |
| Page-based | ViewPager or similar |
| Large touch targets | min 48dp, prefer 56dp |
| No animations | Disable all transitions |
| Offline-first | No network permissions |
| Local storage | File system + Room |

### Code Patterns

**Calm Button Component:**
```kotlin
@Composable
fun CalmButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Button(
        onClick = onClick,
        modifier = modifier
            .defaultMinSize(minWidth = 120.dp, minHeight = 56.dp)
            .padding(8.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = CalmColors.Primary,
            contentColor = CalmColors.OnPrimary
        ),
        shape = RoundedCornerShape(8.dp),
        elevation = ButtonDefaults.buttonElevation(
            defaultElevation = 0.dp,  // Flat for e-ink
            pressedElevation = 0.dp
        )
    ) {
        Text(
            text = text,
            style = CalmTypography.Button,
            fontSize = 20.sp
        )
    }
}
```

**Lesson Loader:**
```kotlin
class LessonLoader(private val context: Context) {
    
    private val lessonsDir = File(
        Environment.getExternalStorageDirectory(),
        "CalmRead/lessons"
    )
    
    fun loadAllLessons(): List<Lesson> {
        return lessonsDir.listFiles()
            ?.filter { it.isDirectory }
            ?.mapNotNull { loadLesson(it) }
            ?.sortedBy { it.lessonId }
            ?: emptyList()
    }
    
    private fun loadLesson(dir: File): Lesson? {
        val jsonFile = File(dir, "lesson.json")
        if (!jsonFile.exists()) return null
        
        return try {
            val json = jsonFile.readText()
            Gson().fromJson(json, Lesson::class.java)
        } catch (e: Exception) {
            Log.e("LessonLoader", "Failed to load ${dir.name}", e)
            null
        }
    }
}
```

**Audio Player:**
```kotlin
class CalmAudioPlayer(private val context: Context) {
    
    private var mediaPlayer: MediaPlayer? = null
    
    fun play(audioPath: String, onComplete: () -> Unit = {}) {
        release()
        
        mediaPlayer = MediaPlayer().apply {
            setDataSource(audioPath)
            setOnCompletionListener { onComplete() }
            prepare()
            start()
        }
    }
    
    fun pause() {
        mediaPlayer?.pause()
    }
    
    fun resume() {
        mediaPlayer?.start()
    }
    
    fun release() {
        mediaPlayer?.release()
        mediaPlayer = null
    }
}
```

## Script Templates

### Lesson Bundle Packager

```bash
#!/bin/bash
# package_lesson.sh - Package a lesson for deployment

LESSON_ID=$1
SOURCE_DIR="curriculum/lessons/${LESSON_ID}"
OUTPUT_DIR="dist/lessons/${LESSON_ID}"

echo "Packaging ${LESSON_ID}..."

# Validate lesson.json exists
if [ ! -f "${SOURCE_DIR}/lesson.json" ]; then
    echo "ERROR: lesson.json not found"
    exit 1
fi

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Copy lesson.json
cp "${SOURCE_DIR}/lesson.json" "${OUTPUT_DIR}/"

# Copy and validate audio files
mkdir -p "${OUTPUT_DIR}/words"
mkdir -p "${OUTPUT_DIR}/prompts"
mkdir -p "${OUTPUT_DIR}/pages"

# Copy audio assets
if [ -d "${SOURCE_DIR}/words" ]; then
    cp "${SOURCE_DIR}/words/"*.mp3 "${OUTPUT_DIR}/words/" 2>/dev/null
fi

if [ -d "${SOURCE_DIR}/prompts" ]; then
    cp "${SOURCE_DIR}/prompts/"*.mp3 "${OUTPUT_DIR}/prompts/" 2>/dev/null
fi

# Copy page assets
if [ -d "${SOURCE_DIR}/pages" ]; then
    cp "${SOURCE_DIR}/pages/"* "${OUTPUT_DIR}/pages/" 2>/dev/null
fi

# Create manifest
echo "{
  \"lessonId\": \"${LESSON_ID}\",
  \"packagedAt\": \"$(date -Iseconds)\",
  \"files\": $(find "${OUTPUT_DIR}" -type f | wc -l)
}" > "${OUTPUT_DIR}/manifest.json"

echo "Package complete: ${OUTPUT_DIR}"
```

### Audio Processing Script

```bash
#!/bin/bash
# process_audio.sh - Normalize and prepare audio files

INPUT_DIR=$1
OUTPUT_DIR=$2

echo "Processing audio files..."

# Ensure ffmpeg is available
if ! command -v ffmpeg &> /dev/null; then
    echo "ERROR: ffmpeg not found"
    exit 1
fi

mkdir -p "${OUTPUT_DIR}"

for file in "${INPUT_DIR}"/*.mp3; do
    filename=$(basename "$file")
    
    # Normalize audio to consistent level
    # -16 LUFS is broadcast standard, good for speech
    ffmpeg -i "$file" \
        -af "loudnorm=I=-16:TP=-1.5:LRA=11" \
        -ar 44100 \
        -ac 1 \
        "${OUTPUT_DIR}/${filename}" \
        -y -loglevel error
    
    echo "Processed: ${filename}"
done

echo "Audio processing complete"
```

### Deployment Script

```bash
#!/bin/bash
# deploy_to_device.sh - Deploy lessons to BOOX device via ADB

DEVICE_PATH="/storage/emulated/0/CalmRead/lessons"
LOCAL_PATH="dist/lessons"

echo "Deploying to device..."

# Check ADB connection
if ! adb devices | grep -q "device$"; then
    echo "ERROR: No device connected"
    exit 1
fi

# Create directory on device
adb shell mkdir -p "${DEVICE_PATH}"

# Push lessons
for lesson_dir in "${LOCAL_PATH}"/lesson_*; do
    lesson_id=$(basename "$lesson_dir")
    echo "Deploying ${lesson_id}..."
    adb push "$lesson_dir" "${DEVICE_PATH}/"
done

echo "Deployment complete"
echo "Lessons deployed: $(ls -d ${LOCAL_PATH}/lesson_* | wc -l)"
```

## Pipeline Execution Guide

### Running Lesson Generation Pipeline

```bash
# 1. Prepare inputs
export LESSON_ID="lesson_06"
export SCOPE_SEQ="curriculum/scope_sequence_v1.json"

# 2. Generate lesson (invoke Content Generator)
# [AI generates lesson.json]

# 3. Validate lesson (invoke QA/Red Team)
# [AI validates and produces QA report]

# 4. If PASS, package lesson
./scripts/package_lesson.sh ${LESSON_ID}

# 5. Process audio (if audio scripts ready)
./scripts/process_audio.sh \
    "curriculum/lessons/${LESSON_ID}/audio_raw" \
    "curriculum/lessons/${LESSON_ID}/words"

# 6. Deploy to device
./scripts/deploy_to_device.sh
```

### Running QA Lint Pipeline

```bash
# Run all QA checks on a lesson
./scripts/qa_lint.sh lesson_01

# Output: qa/reports/lesson_01_qa_report.md
```

## Build Checklist

Before releasing a build:

### Code Quality
- [ ] No compiler warnings
- [ ] No lint errors
- [ ] All tests pass
- [ ] Code reviewed

### Calm Compliance
- [ ] No scrolling in any screen
- [ ] All touch targets >= 48dp
- [ ] No animations
- [ ] No network calls
- [ ] No forbidden permissions

### Functionality
- [ ] Lessons load correctly
- [ ] Audio plays reliably
- [ ] Recording works
- [ ] Progress saves
- [ ] Navigation works

### Device Testing
- [ ] Tested on BOOX Go Color 7
- [ ] E-ink rendering acceptable
- [ ] Touch response adequate
- [ ] Audio quality good
- [ ] Battery usage reasonable

## Deployment Checklist

Before deploying to beta devices:

- [ ] All lessons packaged
- [ ] All audio processed
- [ ] Manifests generated
- [ ] QA reports all PASS
- [ ] APK signed
- [ ] Device connected
- [ ] Backup existing data
- [ ] Deploy lessons
- [ ] Install APK
- [ ] Verify installation
- [ ] Test basic flow

## Role Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                   BUILDER / OPERATOR                        │
│                       (ROLE_D)                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✓ App Code           ✓ Scripts       ✓ Packaging          │
│  ✓ Asset Processing   ✓ Deployment    ✓ Pipeline Exec      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✗ Pedagogy Design    ✗ Content Gen   ✗ QA Validation      │
│  ✗ Schema Changes     ✗ Constitution  ✗ Architecture       │
│  ✗ Inventing Features ✗ Adding Extras ✗ Skipping Specs     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-11 | Initial role definition |
