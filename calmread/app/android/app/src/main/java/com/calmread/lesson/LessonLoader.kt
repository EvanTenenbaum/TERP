package com.calmread.lesson

import android.content.Context
import android.os.Environment
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import java.io.File
import java.io.FileReader

/**
 * Lesson Loader
 * 
 * Loads lesson.json files from external storage.
 * All lessons are stored locally - no network access.
 * 
 * Default path: /storage/emulated/0/CalmRead/lessons/
 */
class LessonLoader(private val context: Context) {

    companion object {
        private const val CALMREAD_DIR = "CalmRead"
        private const val LESSONS_DIR = "lessons"
        private const val LESSON_FILE = "lesson.json"
    }

    private val gson = Gson()

    /**
     * Get the base lessons directory
     */
    private fun getLessonsDirectory(): File {
        val externalStorage = Environment.getExternalStorageDirectory()
        return File(externalStorage, "$CALMREAD_DIR/$LESSONS_DIR")
    }

    /**
     * Get all available lesson IDs
     */
    fun getAvailableLessons(): List<String> {
        val lessonsDir = getLessonsDirectory()
        
        if (!lessonsDir.exists() || !lessonsDir.isDirectory) {
            return emptyList()
        }
        
        return lessonsDir.listFiles()
            ?.filter { it.isDirectory && File(it, LESSON_FILE).exists() }
            ?.map { it.name }
            ?.sorted()
            ?: emptyList()
    }

    /**
     * Load a specific lesson by ID
     */
    fun loadLesson(lessonId: String): Lesson? {
        val lessonFile = File(getLessonsDirectory(), "$lessonId/$LESSON_FILE")
        
        if (!lessonFile.exists()) {
            return null
        }
        
        return try {
            FileReader(lessonFile).use { reader ->
                gson.fromJson(reader, Lesson::class.java)
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    /**
     * Get the audio file path for a lesson asset
     */
    fun getAudioPath(lessonId: String, assetPath: String): File {
        return File(getLessonsDirectory(), "$lessonId/$assetPath")
    }

    /**
     * Check if a lesson exists
     */
    fun lessonExists(lessonId: String): Boolean {
        val lessonFile = File(getLessonsDirectory(), "$lessonId/$LESSON_FILE")
        return lessonFile.exists()
    }
}

/**
 * Lesson data class
 * Maps to lesson.json schema
 */
data class Lesson(
    @SerializedName("lessonId") val lessonId: String,
    @SerializedName("version") val version: String,
    @SerializedName("title") val title: String,
    @SerializedName("lessonNumber") val lessonNumber: Int,
    @SerializedName("type") val type: String,
    @SerializedName("estimatedDuration") val estimatedDuration: Int,
    @SerializedName("objectives") val objectives: List<String>,
    @SerializedName("prerequisites") val prerequisites: List<String>,
    @SerializedName("graphemeConstraints") val graphemeConstraints: GraphemeConstraints,
    @SerializedName("steps") val steps: List<Step>,
    @SerializedName("wordList") val wordList: List<Word>,
    @SerializedName("decodableText") val decodableText: DecodableText?,
    @SerializedName("audioAssets") val audioAssets: List<AudioAsset>,
    @SerializedName("metadata") val metadata: Metadata
)

data class GraphemeConstraints(
    @SerializedName("allowedGraphemes") val allowedGraphemes: List<String>,
    @SerializedName("bannedGraphemes") val bannedGraphemes: List<String>,
    @SerializedName("taughtPatterns") val taughtPatterns: List<TaughtPattern>,
    @SerializedName("sightWords") val sightWords: List<String>
)

data class TaughtPattern(
    @SerializedName("grapheme") val grapheme: String,
    @SerializedName("phoneme") val phoneme: String,
    @SerializedName("isNew") val isNew: Boolean
)

data class Step(
    @SerializedName("stepId") val stepId: String,
    @SerializedName("stepNumber") val stepNumber: Int,
    @SerializedName("type") val type: String,
    @SerializedName("title") val title: String,
    @SerializedName("instruction") val instruction: String,
    @SerializedName("audioAssetId") val audioAssetId: String,
    @SerializedName("interactionType") val interactionType: String,
    @SerializedName("requiredAction") val requiredAction: String,
    @SerializedName("content") val content: StepContent
)

data class StepContent(
    @SerializedName("displayText") val displayText: String?,
    @SerializedName("targetGrapheme") val targetGrapheme: String?,
    @SerializedName("targetPhoneme") val targetPhoneme: String?,
    @SerializedName("targetWord") val targetWord: String?,
    @SerializedName("blendingSequence") val blendingSequence: List<String>?,
    @SerializedName("passage") val passage: String?,
    @SerializedName("question") val question: String?,
    @SerializedName("options") val options: List<Option>?,
    @SerializedName("recordingPrompt") val recordingPrompt: String?,
    @SerializedName("maxRecordingDuration") val maxRecordingDuration: Int?,
    @SerializedName("completionMessage") val completionMessage: String?,
    @SerializedName("visualElements") val visualElements: List<VisualElement>?
)

data class Option(
    @SerializedName("id") val id: String,
    @SerializedName("display") val display: String,
    @SerializedName("correct") val correct: Boolean
)

data class VisualElement(
    @SerializedName("type") val type: String,
    @SerializedName("content") val content: Any?,
    @SerializedName("size") val size: String?
)

data class Word(
    @SerializedName("word") val word: String,
    @SerializedName("graphemes") val graphemes: List<String>,
    @SerializedName("phonemes") val phonemes: List<String>,
    @SerializedName("isTargetPattern") val isTargetPattern: Boolean,
    @SerializedName("isReview") val isReview: Boolean
)

data class DecodableText(
    @SerializedName("title") val title: String,
    @SerializedName("sentences") val sentences: List<Sentence>,
    @SerializedName("totalWords") val totalWords: Int,
    @SerializedName("decodableWords") val decodableWords: Int,
    @SerializedName("sightWords") val sightWords: Int,
    @SerializedName("decodablePercentage") val decodablePercentage: Double
)

data class Sentence(
    @SerializedName("text") val text: String,
    @SerializedName("words") val words: List<String>
)

data class AudioAsset(
    @SerializedName("assetId") val assetId: String,
    @SerializedName("path") val path: String,
    @SerializedName("type") val type: String,
    @SerializedName("transcript") val transcript: String,
    @SerializedName("duration") val duration: Double
)

data class Metadata(
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String,
    @SerializedName("author") val author: String,
    @SerializedName("reviewStatus") val reviewStatus: String,
    @SerializedName("qaReportId") val qaReportId: String?
)
