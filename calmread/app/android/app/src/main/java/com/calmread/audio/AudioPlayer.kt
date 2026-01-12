package com.calmread.audio

import android.media.MediaPlayer
import java.io.File
import java.io.IOException

/**
 * Audio Player
 * 
 * Handles playback of lesson audio files.
 * Designed for calm, controlled audio experience.
 * 
 * Features:
 * - Play/pause/stop
 * - Replay capability
 * - Completion callbacks
 * - Error handling
 */
class AudioPlayer {

    private var mediaPlayer: MediaPlayer? = null
    private var currentFile: File? = null
    private var onCompletionListener: (() -> Unit)? = null
    private var onErrorListener: ((String) -> Unit)? = null

    /**
     * Play an audio file
     * 
     * @param file The audio file to play
     * @param onCompletion Callback when playback completes
     * @param onError Callback on error
     */
    fun play(
        file: File,
        onCompletion: (() -> Unit)? = null,
        onError: ((String) -> Unit)? = null
    ) {
        // Stop any current playback
        stop()
        
        this.onCompletionListener = onCompletion
        this.onErrorListener = onError
        this.currentFile = file
        
        if (!file.exists()) {
            onError?.invoke("Audio file not found: ${file.path}")
            return
        }
        
        try {
            mediaPlayer = MediaPlayer().apply {
                setDataSource(file.path)
                setOnCompletionListener {
                    onCompletionListener?.invoke()
                }
                setOnErrorListener { _, what, extra ->
                    onErrorListener?.invoke("Playback error: $what, $extra")
                    true
                }
                prepare()
                start()
            }
        } catch (e: IOException) {
            onError?.invoke("Failed to play audio: ${e.message}")
        } catch (e: IllegalStateException) {
            onError?.invoke("Player in invalid state: ${e.message}")
        }
    }

    /**
     * Pause playback
     */
    fun pause() {
        mediaPlayer?.let {
            if (it.isPlaying) {
                it.pause()
            }
        }
    }

    /**
     * Resume playback
     */
    fun resume() {
        mediaPlayer?.let {
            if (!it.isPlaying) {
                it.start()
            }
        }
    }

    /**
     * Stop playback and release resources
     */
    fun stop() {
        mediaPlayer?.let {
            if (it.isPlaying) {
                it.stop()
            }
            it.release()
        }
        mediaPlayer = null
    }

    /**
     * Replay the current audio from the beginning
     */
    fun replay() {
        currentFile?.let { file ->
            play(file, onCompletionListener, onErrorListener)
        }
    }

    /**
     * Check if currently playing
     */
    fun isPlaying(): Boolean {
        return mediaPlayer?.isPlaying ?: false
    }

    /**
     * Get current playback position in milliseconds
     */
    fun getCurrentPosition(): Int {
        return mediaPlayer?.currentPosition ?: 0
    }

    /**
     * Get total duration in milliseconds
     */
    fun getDuration(): Int {
        return mediaPlayer?.duration ?: 0
    }

    /**
     * Release all resources
     * Call when done with the player
     */
    fun release() {
        stop()
        onCompletionListener = null
        onErrorListener = null
        currentFile = null
    }
}
