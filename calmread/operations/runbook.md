# CalmRead Operations Runbook

**Version:** 1.0.0  
**Last Updated:** January 11, 2026  
**Purpose:** Step-by-step procedures for common operations

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Lesson Generation](#lesson-generation)
3. [Audio Generation](#audio-generation)
4. [App Build & Deploy](#app-build--deploy)
5. [QA Procedures](#qa-procedures)
6. [Beta Operations](#beta-operations)
7. [Troubleshooting](#troubleshooting)
8. [Emergency Procedures](#emergency-procedures)

---

## Daily Operations

### Morning Checklist

```markdown
## Daily Checklist - [DATE]

### Repository Status
- [ ] Pull latest from main branch
- [ ] Check for open issues
- [ ] Review any pending PRs

### Content Status
- [ ] Check lesson generation queue
- [ ] Review QA reports from yesterday
- [ ] Address any blockers

### Beta Status (if active)
- [ ] Check feedback log for new entries
- [ ] Review any critical issues
- [ ] Prepare for today's sessions
```

### End of Day Checklist

```markdown
## End of Day - [DATE]

### Commits
- [ ] All work committed
- [ ] Meaningful commit messages
- [ ] Pushed to remote

### Documentation
- [ ] Updated relevant docs
- [ ] Noted any blockers
- [ ] Updated task status

### Handoff
- [ ] Summarized progress
- [ ] Listed next steps
- [ ] Flagged any issues
```

---

## Lesson Generation

### Procedure: Generate Single Lesson

**Prerequisites:**
- Scope/sequence entry exists
- Prior lessons complete (if applicable)
- All constitutions and schemas available

**Steps:**

1. **Extract lesson specification**
   ```bash
   # View the scope/sequence entry
   cat curriculum/scope_sequence_v1.json | jq '.lessons[] | select(.lessonId == "lesson_XX")'
   ```

2. **Invoke Content Generator**
   - Use prompt template from `pipelines/lesson_generation_pipeline.md`
   - Provide lesson specification
   - Include all constraints

3. **Self-validation**
   - Content Generator produces self-validation report
   - Review for any issues
   - Fix before proceeding

4. **QA Review**
   - Invoke QA/Red Team role
   - Use QA report template
   - Address any failures

5. **Save approved lesson**
   ```bash
   # Create lesson directory
   mkdir -p curriculum/lessons/lesson_XX/{scripts,words,prompts,pages}
   
   # Save lesson.json
   # (paste content to file)
   
   # Save audio scripts
   # (paste to scripts/ directory)
   ```

6. **Verify**
   ```bash
   # Validate JSON
   python3 -c "import json; json.load(open('curriculum/lessons/lesson_XX/lesson.json'))"
   
   # Check schema compliance
   python3 scripts/schema_lint.py curriculum/lessons/lesson_XX schemas/lesson_schema.json
   ```

### Procedure: Generate Batch Lessons

**Prerequisites:**
- All prerequisite lessons complete
- Scope/sequence entries for batch exist

**Steps:**

1. **Define batch scope**
   ```yaml
   Batch:
     start: lesson_06
     end: lesson_10
     count: 5
   ```

2. **Extract all entries**
   ```bash
   cat curriculum/scope_sequence_v1.json | jq '.lessons[] | select(.lessonNumber >= 6 and .lessonNumber <= 10)'
   ```

3. **Generate sequentially**
   - Generate lesson_06 first
   - Update cumulative state
   - Generate lesson_07, etc.
   - Each builds on previous

4. **Cumulative validation**
   - Check grapheme progression
   - Verify review cadence
   - Cross-validate consistency

5. **Batch QA**
   - Review entire batch together
   - Check for patterns/issues
   - Approve or fix

6. **Save all lessons**
   ```bash
   for i in 06 07 08 09 10; do
     mkdir -p curriculum/lessons/lesson_${i}/{scripts,words,prompts,pages}
   done
   ```

---

## Audio Generation

### Procedure: Generate Audio for Lesson

**Prerequisites:**
- Lesson approved by QA
- Audio scripts extracted
- TTS service configured

**Steps:**

1. **Prepare audio scripts**
   ```bash
   # Extract scripts from lesson
   cat curriculum/lessons/lesson_XX/lesson.json | jq '.audioAssets'
   
   # Create audio_assets.json for TTS
   # (format per audio_generation_pipeline.md)
   ```

2. **Configure TTS**
   ```python
   # Set voice parameters
   voice_config = {
       "language": "en-US",
       "voice": "en-US-Neural2-C",  # or equivalent calm voice
       "speaking_rate": 0.85,
       "pitch": 0.0
   }
   ```

3. **Generate audio**
   ```bash
   python3 scripts/generate_audio.py lesson_XX
   ```

4. **Normalize audio**
   ```bash
   ./scripts/normalize_audio.sh \
     curriculum/lessons/lesson_XX/audio_raw \
     curriculum/lessons/lesson_XX/audio_normalized
   ```

5. **Organize files**
   ```bash
   ./scripts/organize_audio.sh curriculum/lessons/lesson_XX
   ```

6. **Verify completeness**
   ```bash
   ./scripts/verify_audio.sh curriculum/lessons/lesson_XX
   ```

7. **QA audio**
   - Listen to each file
   - Check calm tone
   - Verify pronunciations
   - Confirm consistent volume

---

## App Build & Deploy

### Procedure: Build Debug APK

**Prerequisites:**
- Android SDK installed
- Project configured
- All dependencies resolved

**Steps:**

1. **Navigate to project**
   ```bash
   cd app/android
   ```

2. **Clean previous build**
   ```bash
   ./gradlew clean
   ```

3. **Build debug APK**
   ```bash
   ./gradlew assembleDebug
   ```

4. **Locate APK**
   ```bash
   ls -la app/build/outputs/apk/debug/
   # app-debug.apk
   ```

5. **Verify build**
   ```bash
   # Check APK info
   aapt dump badging app/build/outputs/apk/debug/app-debug.apk
   ```

### Procedure: Deploy to Device

**Prerequisites:**
- Device connected via USB
- USB debugging enabled
- ADB installed

**Steps:**

1. **Verify device connection**
   ```bash
   adb devices
   # Should show device
   ```

2. **Install APK**
   ```bash
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```

3. **Deploy lessons**
   ```bash
   # Create directory on device
   adb shell mkdir -p /storage/emulated/0/CalmRead/lessons
   
   # Push lessons
   adb push curriculum/lessons/lesson_* /storage/emulated/0/CalmRead/lessons/
   ```

4. **Verify installation**
   ```bash
   # Check app installed
   adb shell pm list packages | grep calmread
   
   # Check lessons deployed
   adb shell ls /storage/emulated/0/CalmRead/lessons/
   ```

5. **Launch app**
   ```bash
   adb shell am start -n com.calmread/.MainActivity
   ```

### Procedure: Build Release APK

**Prerequisites:**
- Keystore configured
- All QA passed
- Version number updated

**Steps:**

1. **Update version**
   ```kotlin
   // In app/build.gradle.kts
   versionCode = X
   versionName = "X.X.X"
   ```

2. **Build release**
   ```bash
   ./gradlew assembleRelease
   ```

3. **Sign APK** (if not auto-signed)
   ```bash
   jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
     -keystore calmread.keystore \
     app/build/outputs/apk/release/app-release-unsigned.apk \
     calmread
   ```

4. **Align APK**
   ```bash
   zipalign -v 4 \
     app-release-unsigned.apk \
     app-release.apk
   ```

5. **Verify**
   ```bash
   apksigner verify app-release.apk
   ```

---

## QA Procedures

### Procedure: Run Full QA Lint

**Steps:**

1. **Run schema lint**
   ```bash
   python3 scripts/schema_lint.py curriculum/lessons schemas/lesson_schema.json > qa/reports/schema_lint_$(date +%Y%m%d).md
   ```

2. **Run calm lint**
   - Invoke QA/Red Team role
   - Use `qa/checklists/calm_lint.md`
   - Document all findings

3. **Run pedagogy lint**
   - Invoke QA/Red Team role
   - Use `qa/checklists/pedagogy_lint.md`
   - Document all findings

4. **Run UX lint**
   - Invoke QA/Red Team role
   - Use `qa/checklists/ux_lint.md`
   - Document all findings

5. **Aggregate results**
   ```markdown
   # Full QA Report - [DATE]
   
   ## Schema Lint
   [Results]
   
   ## Calm Lint
   [Results]
   
   ## Pedagogy Lint
   [Results]
   
   ## UX Lint
   [Results]
   
   ## Overall Score
   [Score]
   
   ## Verdict
   [PASS/CONDITIONAL/FAIL]
   ```

6. **Save report**
   ```bash
   # Save to qa/reports/
   mv qa_report.md qa/reports/full_qa_$(date +%Y%m%d).md
   ```

### Procedure: Pre-Release QA

**Steps:**

1. **Content QA**
   - All lessons pass schema lint
   - All lessons pass pedagogy lint
   - All lessons pass calm lint
   - All audio assets present and verified

2. **App QA**
   - App builds successfully
   - No lint errors
   - Passes UX lint
   - Device testing complete

3. **Integration QA**
   - App loads all lessons
   - Audio plays correctly
   - Recording works
   - Progress saves
   - Navigation works

4. **Sign-off**
   ```markdown
   ## Pre-Release Sign-off
   
   **Version:** X.X.X
   **Date:** YYYY-MM-DD
   
   ### Content
   - [ ] All lessons validated
   - [ ] All audio verified
   
   ### App
   - [ ] Build successful
   - [ ] Device tested
   
   ### Integration
   - [ ] Full flow tested
   
   **Approved by:** [Name]
   **Approved date:** [Date]
   ```

---

## Beta Operations

### Procedure: Prepare Beta Session

**Steps:**

1. **Device preparation**
   ```bash
   # Connect device
   adb devices
   
   # Install latest APK
   adb install -r app-debug.apk
   
   # Deploy latest lessons
   adb push curriculum/lessons/* /storage/emulated/0/CalmRead/lessons/
   
   # Verify
   adb shell ls /storage/emulated/0/CalmRead/lessons/
   ```

2. **Environment check**
   - Device charged (>50%)
   - Kiosk mode configured
   - Volume set appropriately
   - Screen clean

3. **Observer preparation**
   - Feedback log ready
   - Session ID assigned
   - Protocol reviewed

4. **Pre-session checklist**
   ```markdown
   ## Pre-Session Checklist - [SESSION_ID]
   
   - [ ] Device ready
   - [ ] Lessons loaded
   - [ ] Audio working
   - [ ] Observer ready
   - [ ] Child willing
   - [ ] Environment quiet
   ```

### Procedure: Conduct Beta Session

**Steps:**

1. **Follow session protocol**
   - See `beta/session_protocol.md`
   - Record observations
   - Note timestamps

2. **During session**
   - Minimal intervention
   - Record key moments
   - Note child reactions

3. **End session**
   - Natural or child-initiated
   - Note ending state

4. **Immediate recording**
   - Complete session summary
   - Transfer observations to feedback log
   - Note any critical issues

### Procedure: Process Beta Feedback

**Steps:**

1. **Daily review**
   ```bash
   # Review new entries
   cat beta/feedback_log.md | grep "Date: $(date +%Y-%m-%d)"
   ```

2. **Categorize issues**
   - Blockers → Immediate action
   - Critical → This week
   - Major → Soon
   - Minor → Track

3. **Create action items**
   ```markdown
   ## Action Items from Beta - [DATE]
   
   ### Immediate
   1. [Issue] - [Owner] - [Due]
   
   ### This Week
   1. [Issue] - [Owner] - [Due]
   
   ### Backlog
   1. [Issue]
   ```

4. **Weekly summary**
   - Aggregate findings
   - Identify patterns
   - Update priorities

---

## Troubleshooting

### Issue: Lesson Won't Load

**Symptoms:**
- App shows error
- Lesson list empty
- Specific lesson missing

**Diagnosis:**
```bash
# Check lesson exists
adb shell ls /storage/emulated/0/CalmRead/lessons/lesson_XX/

# Check lesson.json valid
adb shell cat /storage/emulated/0/CalmRead/lessons/lesson_XX/lesson.json | head -20

# Check permissions
adb shell ls -la /storage/emulated/0/CalmRead/
```

**Resolution:**
1. Re-deploy lesson files
2. Check JSON validity
3. Verify file permissions
4. Restart app

### Issue: Audio Not Playing

**Symptoms:**
- Silent playback
- Audio cuts out
- Wrong audio plays

**Diagnosis:**
```bash
# Check audio files exist
adb shell ls /storage/emulated/0/CalmRead/lessons/lesson_XX/words/

# Check file size (not empty)
adb shell ls -la /storage/emulated/0/CalmRead/lessons/lesson_XX/words/

# Test audio file
adb shell am start -a android.intent.action.VIEW -d file:///storage/emulated/0/CalmRead/lessons/lesson_XX/words/word_mat.mp3 -t audio/mp3
```

**Resolution:**
1. Re-deploy audio files
2. Check audio format (MP3)
3. Verify volume settings
4. Check audio paths in lesson.json

### Issue: App Crashes

**Symptoms:**
- App closes unexpectedly
- Freezes then closes
- Error dialog

**Diagnosis:**
```bash
# Get crash logs
adb logcat -d | grep -i "calmread\|crash\|exception" > crash_log.txt

# Check last lines
tail -100 crash_log.txt
```

**Resolution:**
1. Identify crash point from logs
2. Check for null pointers
3. Verify all required files exist
4. Rebuild and redeploy

### Issue: Recording Not Working

**Symptoms:**
- Record button unresponsive
- No audio captured
- Permission denied

**Diagnosis:**
```bash
# Check permission granted
adb shell dumpsys package com.calmread | grep -i "permission"

# Check microphone
adb shell am start -a android.media.action.SOUND_SETTINGS
```

**Resolution:**
1. Grant RECORD_AUDIO permission
2. Check microphone hardware
3. Verify recording path writable
4. Restart app

---

## Emergency Procedures

### Procedure: Critical Bug in Beta

**Trigger:** Bug causing harm or preventing use

**Steps:**

1. **Stop beta sessions immediately**
   - Notify all testers
   - Document the issue

2. **Assess impact**
   - What is affected?
   - How many users?
   - Data loss?

3. **Implement fix**
   - Hotfix if possible
   - Test fix thoroughly
   - Document changes

4. **Deploy fix**
   - Build new APK
   - Deploy to all devices
   - Verify fix works

5. **Resume beta**
   - Notify testers
   - Monitor closely

### Procedure: Data Loss

**Trigger:** Progress or recordings lost

**Steps:**

1. **Stop operations**
   - Don't overwrite anything
   - Document state

2. **Assess scope**
   - What was lost?
   - Is recovery possible?

3. **Attempt recovery**
   ```bash
   # Check for backups
   adb shell ls /storage/emulated/0/CalmRead/backups/
   
   # Check app data
   adb shell ls /data/data/com.calmread/
   ```

4. **Document incident**
   - What happened
   - What was lost
   - Prevention measures

5. **Implement prevention**
   - Add backup mechanism
   - Improve data safety

### Procedure: Constitution Violation Discovered

**Trigger:** Content or app violates constitution

**Steps:**

1. **Assess severity**
   - Which constitution?
   - Which rule?
   - How severe?

2. **Remove violating content**
   - Pull from beta devices
   - Mark as invalid

3. **Fix violation**
   - Regenerate content, or
   - Fix app code

4. **QA the fix**
   - Full lint on fixed content
   - Verify compliance

5. **Redeploy**
   - Deploy fixed version
   - Document incident

6. **Update prevention**
   - Add to checklists
   - Update prompts

---

## Appendix: Quick Reference

### Common Commands

```bash
# Build app
cd app/android && ./gradlew assembleDebug

# Deploy to device
adb install -r app/build/outputs/apk/debug/app-debug.apk

# Push lessons
adb push curriculum/lessons/* /storage/emulated/0/CalmRead/lessons/

# View logs
adb logcat -s CalmRead

# Validate JSON
python3 -c "import json; json.load(open('file.json'))"

# Schema lint
python3 scripts/schema_lint.py curriculum/lessons schemas/lesson_schema.json
```

### Key File Locations

| Item | Location |
|------|----------|
| Lessons | `curriculum/lessons/` |
| Scope/Sequence | `curriculum/scope_sequence_v1.json` |
| Schemas | `schemas/` |
| Constitutions | `constitution/` |
| QA Reports | `qa/reports/` |
| Beta Feedback | `beta/feedback_log.md` |
| App Code | `app/android/` |

### Contact/Escalation

| Issue Type | Contact |
|------------|---------|
| Technical | [Technical lead] |
| Content | [Content lead] |
| Beta | [Beta coordinator] |
| Emergency | [Emergency contact] |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-11 | Initial runbook |
