package com.calmread.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.fragment.app.Fragment
import com.calmread.MainActivity
import com.calmread.R

/**
 * Home Screen
 * 
 * The entry point for the child. Displays:
 * - App title
 * - Single "Start Reading" button
 * - Settings access (hidden, for parents)
 * 
 * Design Principles:
 * - Single primary action
 * - Large touch target (56dp minimum)
 * - Calm colors
 * - No distractions
 * - No scrolling
 */
class HomeScreen : Fragment() {

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.screen_home, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        // Set up start button
        view.findViewById<Button>(R.id.btn_start_reading)?.setOnClickListener {
            navigateToLessonPicker()
        }
        
        // Set up hidden settings access (triple tap on title)
        view.findViewById<TextView>(R.id.tv_app_title)?.setOnClickListener(
            TripleTapListener {
                openSettings()
            }
        )
    }

    /**
     * Navigate to lesson picker
     */
    private fun navigateToLessonPicker() {
        (activity as? MainActivity)?.navigateToLessonPicker()
    }

    /**
     * Open settings (parent access)
     */
    private fun openSettings() {
        // TODO: Implement settings screen
    }

    /**
     * Triple tap listener for hidden parent access
     */
    private class TripleTapListener(
        private val onTripleTap: () -> Unit
    ) : View.OnClickListener {
        
        private var tapCount = 0
        private var lastTapTime = 0L
        private val tapTimeout = 500L // ms between taps
        
        override fun onClick(v: View?) {
            val currentTime = System.currentTimeMillis()
            
            if (currentTime - lastTapTime > tapTimeout) {
                tapCount = 0
            }
            
            tapCount++
            lastTapTime = currentTime
            
            if (tapCount >= 3) {
                tapCount = 0
                onTripleTap()
            }
        }
    }
}
