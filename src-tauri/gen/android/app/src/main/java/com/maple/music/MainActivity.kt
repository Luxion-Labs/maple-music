package com.maple.music

import android.os.Bundle
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import kotlin.math.roundToInt

class MainActivity : TauriActivity() {
  override fun onCreate(savedState: Bundle?) {
    super.onCreate(savedState)
    enableEdgeToEdge()
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)

    // The Android WebView reports env(safe-area-inset-top) as 0 even with edge-to-edge, so the
    // app's top bar (hamburger/account) and full-screen overlays hide behind the status bar.
    // Read the real system-bar + cutout insets and inject them as CSS variables so the frontend
    // can pad below the status bar (top) and above the gesture/nav bar (bottom). Re-evaluates
    // whenever the insets change (rotation, IME).
    ViewCompat.setOnApplyWindowInsetsListener(webView) { v, insets ->
      val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
      val cutout = insets.getInsets(WindowInsetsCompat.Type.displayCutout())
      val density = resources.displayMetrics.density
      val top = (maxOf(bars.top, cutout.top) / density).roundToInt()
      val bottom = (maxOf(bars.bottom, cutout.bottom) / density).roundToInt()
      val left = (maxOf(bars.left, cutout.left) / density).roundToInt()
      val right = (maxOf(bars.right, cutout.right) / density).roundToInt()
      val script =
        "document.documentElement.style.setProperty('--safe-area-inset-top','${top}px');" +
          "document.documentElement.style.setProperty('--safe-area-inset-bottom','${bottom}px');" +
          "document.documentElement.style.setProperty('--safe-area-inset-left','${left}px');" +
          "document.documentElement.style.setProperty('--safe-area-inset-right','${right}px');"
      v.post { webView.evaluateJavascript(script, null) }
      insets
    }
  }
}
