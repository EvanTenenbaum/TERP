package com.calmread

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.calmread.ui.HomeScreen

/**
 * CalmRead Main Activity
 * 
 * Entry point for the CalmRead app. Handles:
 * - Permission requests
 * - Screen navigation
 * - Immersive mode for distraction-free reading
 * 
 * Design Principles:
 * - No scrolling anywhere
 * - Page-based navigation only
 * - Calm, muted colors
 * - Large touch targets (56dp minimum)
 * - E-ink optimized (high contrast, no animations)
 */
class MainActivity : AppCompatActivity() {

    companion object {
        private const val PERMISSION_REQUEST_CODE = 100
        private val REQUIRED_PERMISSIONS = arrayOf(
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.READ_EXTERNAL_STORAGE,
            Manifest.permission.WRITE_EXTERNAL_STORAGE
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Keep screen on during lessons
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        
        // Check and request permissions
        if (!hasPermissions()) {
            requestPermissions()
        } else {
            initializeApp()
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            // Enter immersive mode for distraction-free experience
            hideSystemUI()
        }
    }

    /**
     * Hide system UI for immersive experience
     * Important for e-ink devices and kiosk mode
     */
    private fun hideSystemUI() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_FULLSCREEN
        )
    }

    /**
     * Check if all required permissions are granted
     */
    private fun hasPermissions(): Boolean {
        return REQUIRED_PERMISSIONS.all { permission ->
            ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED
        }
    }

    /**
     * Request required permissions
     */
    private fun requestPermissions() {
        ActivityCompat.requestPermissions(
            this,
            REQUIRED_PERMISSIONS,
            PERMISSION_REQUEST_CODE
        )
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        if (requestCode == PERMISSION_REQUEST_CODE) {
            if (grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                initializeApp()
            } else {
                // Show permission explanation
                // In production, show a calm, clear message about why permissions are needed
                showPermissionExplanation()
            }
        }
    }

    /**
     * Initialize the app after permissions are granted
     */
    private fun initializeApp() {
        // Show home screen
        showHomeScreen()
    }

    /**
     * Show the home screen
     */
    private fun showHomeScreen() {
        supportFragmentManager.beginTransaction()
            .replace(android.R.id.content, HomeScreen())
            .commit()
    }

    /**
     * Show permission explanation
     * Uses calm, clear language appropriate for parents
     */
    private fun showPermissionExplanation() {
        // TODO: Implement calm permission explanation screen
        // For now, just try to initialize anyway (will show errors if needed)
        initializeApp()
    }

    /**
     * Navigate to lesson picker
     * Called from HomeScreen
     */
    fun navigateToLessonPicker() {
        // TODO: Implement lesson picker navigation
    }

    /**
     * Navigate to lesson
     * Called from LessonPicker
     */
    fun navigateToLesson(lessonId: String) {
        // TODO: Implement lesson navigation
    }

    /**
     * Navigate back to home
     * Called from completion screen or back button
     */
    fun navigateToHome() {
        showHomeScreen()
    }
}
