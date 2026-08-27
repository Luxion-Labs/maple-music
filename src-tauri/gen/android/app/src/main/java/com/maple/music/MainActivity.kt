package com.maple.music

import android.os.Bundle
import androidx.core.view.WindowCompat

class MainActivity : TauriActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Deliberately disable edge-to-edge. The vivo V23 runs Android 12 (API 32), where
        // edge-to-edge is not OS-enforced, so opting out works here. This makes Android lay the
        // WebView out inside the system bars: the top bar sits below the status bar and the
        // bottom nav above the gesture/nav bar (instead of sliding under the phone's home/back
        // buttons), and 100dvh layouts never overflow off the visible screen.
        WindowCompat.setDecorFitsSystemWindows(window, true)
    }
}
