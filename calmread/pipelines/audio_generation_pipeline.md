# Audio Generation Pipeline

**Version:** 1.0.0  
**Last Updated:** January 11, 2026

## Overview

This pipeline generates audio assets (MP3 files) from lesson audio scripts. It uses text-to-speech (TTS) services with specific voice and tone requirements to maintain calm design principles.

## Pipeline Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Audio Scripts  │────▶│   TTS Service   │────▶│  Raw Audio      │
│  (from lesson)  │     │   Generation    │     │  Files          │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Packaged     │◀────│   QA Review     │◀────│  Normalized     │
│    Lesson       │     │   (Audio)       │     │  Audio          │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Audio Requirements

### Voice Characteristics

| Attribute | Requirement | Rationale |
|-----------|-------------|-----------|
| Tone | Calm, warm, supportive | Low arousal principle |
| Pace | Slow and clear | Child comprehension |
| Energy | Low, steady | No excitement |
| Gender | Neutral preference | Accessibility |
| Accent | Clear, standard | Comprehension |

### Technical Specifications

| Parameter | Specification |
|-----------|---------------|
| Format | MP3 |
| Sample Rate | 44.1 kHz |
| Bit Rate | 128 kbps minimum |
| Channels | Mono |
| Loudness | -16 LUFS (normalized) |
| Max Duration | 30 seconds per file |

### Forbidden Audio Characteristics

| Characteristic | Reason |
|----------------|--------|
| Excited tone | Violates low arousal |
| Fast pace | Comprehension issues |
| Background music | Cognitive load |
| Sound effects | Distraction |
| Multiple voices | Complexity |
| Echo/reverb | Clarity issues |

## Audio Asset Types

### Type 1: Instruction Audio

**Purpose:** Narrate lesson instructions

**Example Script:**
```
"This letter is 'm'. 
It makes the sound /m/. 
Watch my mouth: /m/. 
Now you try."
```

**File Naming:** `instruction_step_XX.mp3`

### Type 2: Word Audio

**Purpose:** Pronounce individual words

**Example Script:**
```
"mat"
```

**File Naming:** `word_[word].mp3` (e.g., `word_mat.mp3`)

### Type 3: Blending Audio

**Purpose:** Demonstrate sound-by-sound blending

**Example Script:**
```
"/m/ ... /a/ ... /t/ ... mat"
```

**File Naming:** `blend_[word].mp3`

### Type 4: Sentence Audio

**Purpose:** Read sentences from decodable text

**Example Script:**
```
"Sam sat on the mat."
```

**File Naming:** `sentence_XX.mp3`

### Type 5: Prompt Audio

**Purpose:** Guide child through activities

**Example Script:**
```
"Now it's your turn to read."
"Touch each word as you read."
"All done! Great reading."
```

**File Naming:** `prompt_[id].mp3`

## Step-by-Step Process

### Step 1: Extract Audio Scripts

**Actor:** Human Conductor

From lesson generation output, collect all audio scripts:

```
curriculum/lessons/lesson_03/scripts/
├── instructions.md    # Instruction narrations
├── words.md           # Word pronunciations
├── blending.md        # Blending demonstrations
├── sentences.md       # Sentence readings
└── prompts.md         # Activity prompts
```

### Step 2: Prepare TTS Input

**Actor:** Builder/Operator (ROLE_D)

Format scripts for TTS service:

```json
{
  "lessonId": "lesson_03",
  "audioAssets": [
    {
      "assetId": "instruction_step_01",
      "type": "instruction",
      "text": "Let's review the sounds we know.",
      "ssml": "<speak><prosody rate='slow'>Let's review the sounds we know.</prosody></speak>"
    },
    {
      "assetId": "word_mat",
      "type": "word",
      "text": "mat",
      "ssml": "<speak><prosody rate='slow'>mat</prosody></speak>"
    },
    {
      "assetId": "blend_mat",
      "type": "blending",
      "text": "/m/ ... /a/ ... /t/ ... mat",
      "ssml": "<speak><prosody rate='x-slow'>/m/</prosody><break time='500ms'/><prosody rate='x-slow'>/a/</prosody><break time='500ms'/><prosody rate='x-slow'>/t/</prosody><break time='700ms'/><prosody rate='slow'>mat</prosody></speak>"
    }
  ]
}
```

### Step 3: Select TTS Service

**Actor:** Builder/Operator (ROLE_D)

Recommended TTS services:

| Service | Pros | Cons |
|---------|------|------|
| Google Cloud TTS | High quality, SSML support | Cost |
| Amazon Polly | Good quality, reasonable cost | Less natural |
| Azure Speech | Neural voices | Complexity |
| ElevenLabs | Very natural | Higher cost |

**Voice Selection Criteria:**
- Neural/natural voice preferred
- Child-friendly tone
- Clear pronunciation
- Supports SSML for pacing control

### Step 4: Generate Audio

**Actor:** Builder/Operator (ROLE_D)

**Script Template (Python):**

```python
#!/usr/bin/env python3
"""
generate_audio.py - Generate audio assets for a lesson
"""

import json
import os
from google.cloud import texttospeech

def generate_audio(lesson_id: str, assets_file: str, output_dir: str):
    """Generate audio files from asset specifications."""
    
    # Initialize TTS client
    client = texttospeech.TextToSpeechClient()
    
    # Voice configuration - CALM voice
    voice = texttospeech.VoiceSelectionParams(
        language_code="en-US",
        name="en-US-Neural2-C",  # Calm, clear voice
        ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
    )
    
    # Audio configuration
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
        speaking_rate=0.85,  # Slower than normal
        pitch=0.0,  # Neutral pitch
        volume_gain_db=0.0
    )
    
    # Load asset specifications
    with open(assets_file, 'r') as f:
        data = json.load(f)
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate each asset
    for asset in data['audioAssets']:
        # Use SSML if available, otherwise plain text
        if 'ssml' in asset:
            synthesis_input = texttospeech.SynthesisInput(ssml=asset['ssml'])
        else:
            synthesis_input = texttospeech.SynthesisInput(text=asset['text'])
        
        # Generate audio
        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config
        )
        
        # Save to file
        output_path = os.path.join(output_dir, f"{asset['assetId']}.mp3")
        with open(output_path, 'wb') as out:
            out.write(response.audio_content)
        
        print(f"Generated: {output_path}")
    
    print(f"Audio generation complete for {lesson_id}")

if __name__ == "__main__":
    import sys
    lesson_id = sys.argv[1]
    assets_file = f"curriculum/lessons/{lesson_id}/scripts/audio_assets.json"
    output_dir = f"curriculum/lessons/{lesson_id}/audio_raw"
    generate_audio(lesson_id, assets_file, output_dir)
```

### Step 5: Normalize Audio

**Actor:** Builder/Operator (ROLE_D)

Normalize all audio to consistent loudness:

```bash
#!/bin/bash
# normalize_audio.sh - Normalize audio files to -16 LUFS

INPUT_DIR=$1
OUTPUT_DIR=$2

mkdir -p "${OUTPUT_DIR}"

for file in "${INPUT_DIR}"/*.mp3; do
    filename=$(basename "$file")
    
    ffmpeg -i "$file" \
        -af "loudnorm=I=-16:TP=-1.5:LRA=11" \
        -ar 44100 \
        -ac 1 \
        -b:a 128k \
        "${OUTPUT_DIR}/${filename}" \
        -y -loglevel error
    
    echo "Normalized: ${filename}"
done
```

### Step 6: Organize Files

**Actor:** Builder/Operator (ROLE_D)

Organize audio into lesson structure:

```
curriculum/lessons/lesson_03/
├── lesson.json
├── words/
│   ├── word_mat.mp3
│   ├── word_sat.mp3
│   └── ...
├── prompts/
│   ├── instruction_step_01.mp3
│   ├── instruction_step_02.mp3
│   ├── prompt_read_aloud.mp3
│   └── ...
├── pages/
│   ├── sentence_01.mp3
│   ├── sentence_02.mp3
│   └── ...
└── scripts/
    └── (source scripts)
```

### Step 7: QA Audio Review

**Actor:** QA/Red Team (ROLE_C)

Review audio for calm compliance:

```markdown
## Audio QA Checklist

### Voice Quality
- [ ] Tone is calm and warm
- [ ] Pace is slow and clear
- [ ] No excitement or high energy
- [ ] Pronunciation is correct
- [ ] No background noise

### Technical Quality
- [ ] All files play correctly
- [ ] Consistent volume across files
- [ ] No clipping or distortion
- [ ] Appropriate duration
- [ ] Correct file format

### Content Accuracy
- [ ] Text matches script exactly
- [ ] Phoneme pronunciations correct
- [ ] Blending timing appropriate
- [ ] All required assets present

### Calm Design Compliance
- [ ] No "excited" tone
- [ ] No reward sounds
- [ ] No sound effects
- [ ] No background music
- [ ] Supportive, not evaluative
```

### Step 8: Update Lesson JSON

**Actor:** Builder/Operator (ROLE_D)

Update lesson.json with audio asset paths:

```json
{
  "audioAssets": [
    {
      "assetId": "instruction_step_01",
      "path": "prompts/instruction_step_01.mp3",
      "type": "instruction",
      "transcript": "Let's review the sounds we know.",
      "duration": 2.5
    },
    {
      "assetId": "word_mat",
      "path": "words/word_mat.mp3",
      "type": "word",
      "transcript": "mat",
      "duration": 0.8
    }
  ]
}
```

### Step 9: Verify Completeness

**Actor:** Builder/Operator (ROLE_D)

Run completeness check:

```bash
#!/bin/bash
# verify_audio.sh - Verify all required audio exists

LESSON_DIR=$1
LESSON_JSON="${LESSON_DIR}/lesson.json"

# Extract expected audio assets from lesson.json
expected=$(jq -r '.audioAssets[].path' "${LESSON_JSON}")

missing=0
for asset in $expected; do
    if [ ! -f "${LESSON_DIR}/${asset}" ]; then
        echo "MISSING: ${asset}"
        missing=$((missing + 1))
    fi
done

if [ $missing -eq 0 ]; then
    echo "✓ All audio assets present"
    exit 0
else
    echo "✗ Missing ${missing} audio files"
    exit 1
fi
```

## SSML Templates

### Instruction SSML

```xml
<speak>
  <prosody rate="slow" pitch="0st">
    This letter is <phoneme alphabet="ipa" ph="ɛm">m</phoneme>.
    <break time="300ms"/>
    It makes the sound <phoneme alphabet="ipa" ph="m">mmm</phoneme>.
    <break time="500ms"/>
    Now you try.
  </prosody>
</speak>
```

### Blending SSML

```xml
<speak>
  <prosody rate="x-slow">
    <phoneme alphabet="ipa" ph="m">mmm</phoneme>
  </prosody>
  <break time="500ms"/>
  <prosody rate="x-slow">
    <phoneme alphabet="ipa" ph="æ">aaa</phoneme>
  </prosody>
  <break time="500ms"/>
  <prosody rate="x-slow">
    <phoneme alphabet="ipa" ph="t">t</phoneme>
  </prosody>
  <break time="700ms"/>
  <prosody rate="slow">mat</prosody>
</speak>
```

### Prompt SSML

```xml
<speak>
  <prosody rate="slow" pitch="-1st">
    All done.
    <break time="300ms"/>
    Great reading.
  </prosody>
</speak>
```

## Batch Audio Generation

For multiple lessons:

```bash
#!/bin/bash
# batch_audio.sh - Generate audio for multiple lessons

for lesson_dir in curriculum/lessons/lesson_*; do
    lesson_id=$(basename "$lesson_dir")
    
    echo "Processing ${lesson_id}..."
    
    # Generate audio
    python3 scripts/generate_audio.py "${lesson_id}"
    
    # Normalize
    ./scripts/normalize_audio.sh \
        "${lesson_dir}/audio_raw" \
        "${lesson_dir}/audio_normalized"
    
    # Organize
    ./scripts/organize_audio.sh "${lesson_dir}"
    
    # Verify
    ./scripts/verify_audio.sh "${lesson_dir}"
    
    echo "Completed ${lesson_id}"
done
```

## Error Handling

| Error | Resolution |
|-------|------------|
| TTS service error | Retry with backoff, check credentials |
| Pronunciation wrong | Use SSML phoneme tags |
| Audio too fast | Reduce speaking_rate parameter |
| Missing asset | Regenerate from script |
| Normalization failed | Check ffmpeg installation |

## Quality Gates

| Gate | Criteria | Owner |
|------|----------|-------|
| Generation Complete | All assets generated | Builder/Operator |
| Normalization | Consistent loudness | Builder/Operator |
| Audio QA | Calm compliance | QA/Red Team |
| Completeness | All assets present | Builder/Operator |

## Metrics

| Metric | Target |
|--------|--------|
| Assets per lesson | 15-30 |
| Generation time | < 5 min/lesson |
| QA pass rate | ≥ 95% |
| File size per lesson | < 10 MB |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-11 | Initial pipeline |
