package com.calmread.audio

import android.media.MediaRecorder
import android.os.Build
import android.os.Environment
import java.io.File
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*

/**
 * Audio Recorder
 * 
 * Handles recording of child's read-aloud audio.
 * Recordings are saved locally for parent review.
 * 
 * Features:
 * - Start/stop recording
 * - Automatic file naming
 * - Playback of recordings
 * - Error handling
 */
class AudioRecorder {

    private var mediaRecorder: MediaRecorder? = null
    private var currentFile: File? = null
    private var isRecording = false
    private var onErrorListener: ((String) -> Unit)? = null

    companion object {
        private const val CALMREAD_DIR = "CalmRead"
        private const val RECORDINGS_DIR = "recordings"
        private const val AUDIO_FORMAT = ".mp3"
    }

    /**
     * Get the recordings directory
     */
    private fun getRecordingsDirectory(sessionId: String): File {
        val externalStorage = Environment.getExternalStorageDirectory()
        val dir = File(externalStorage, "$CALMREAD_DIR/$RECORDINGS_DIR/$sessionId")
        if (!dir.exists()) {
            dir.mkdirs()
        }
        return dir
    }

    /**
     * Generate a unique filename for the recording
     */
    private fun generateFilename(lessonId: String, stepId: String): String {
        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        return "${lessonId}_${stepId}_$timestamp$AUDIO_FORMAT"
    }

    /**
     * Start recording
     * 
     * @param sessionId Unique session identifier
     * @param lessonId Current lesson ID
     * @param stepId Current step ID
     * @param onError Error callback
     * @return The file being recorded to, or null on error
     */
    fun startRecording(
        sessionId: String,
        lessonId: String,
        stepId: String,
        onError: ((String) -> Unit)? = null
    ): File? {
        this.onErrorListener = onError
        
        // Stop any existing recording
        stopRecording()
        
        val recordingsDir = getRecordingsDirectory(sessionId)
        val filename = generateFilename(lessonId, stepId)
        currentFile = File(recordingsDir, filename)
        
        try {
            mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(android.app.Application())
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioSamplingRate(44100)
                setAudioEncodingBitRate(128000)
                setOutputFile(currentFile?.absolutePath)
                
                prepare()
                start()
            }
            
            isRecording = true
            return currentFile
            
        } catch (e: IOException) {
            onError?.invoke("Failed to start recording: ${e.message}")
            return null
        } catch (e: IllegalStateException) {
            onError?.invoke("Recorder in invalid state: ${e.message}")
            return null
        }
    }

    /**
     * Stop recording
     * 
     * @return The recorded file, or null if not recording
     */
    fun stopRecording(): File? {
        if (!isRecording) {
            return null
        }
        
        try {
            mediaRecorder?.apply {
                stop()
                release()
            }
        } catch (e: IllegalStateException) {
            onErrorListener?.invoke("Error stopping recording: ${e.message}")
        }
        
        mediaRecorder = null
        isRecording = false
        
        return currentFile
    }

    /**
     * Check if currently recording
     */
    fun isRecording(): Boolean {
        return isRecording
    }

    /**
     * Get the current recording file
     */
    fun getCurrentFile(): File? {
        return currentFile
    }

    /**
     * Delete a recording file
     */
    fun deleteRecording(file: File): Boolean {
        return file.delete()
    }

    /**
     * Get all recordings for a session
     */
    fun getSessionRecordings(sessionId: String): List<File> {
        val dir = getRecordingsDirectory(sessionId)
        return dir.listFiles()
            ?.filter { it.isFile && it.name.endsWith(AUDIO_FORMAT) }
            ?.sortedBy { it.lastModified() }
            ?: emptyList()
    }

    /**
     * Release all resources
     */
    fun release() {
        stopRecording()
        onErrorListener = null
    }
}
