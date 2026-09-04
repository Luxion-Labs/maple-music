package com.maple.discord

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.os.Bundle
import android.util.Log
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class DiscordWebViewActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private var captured = false

    companion object {
        const val RESULT_TOKEN = "discord_token"
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            userAgentString = "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36"
        }

        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                
                // Try to extract token from Discord's internal state
                val js = """
                    (function() {
                        try {
                            var token = (window.webpackChunkdiscord_app.push([[''],{},e=>{m=[];for(let c in e.c)m.push(e.c[c])}]),m).find(m=>m?.exports?.default?.getToken!==void 0).exports.default.getToken();
                            if (token) return token;
                        } catch(e) {}
                        try {
                            var iframe = document.createElement('iframe');
                            document.body.appendChild(iframe);
                            var t = iframe.contentWindow.localStorage.getItem('token');
                            if (t) return t.replace(/"/g, '');
                        } catch(e) {}
                        return '';
                    })();
                """.trimIndent()

                view?.evaluateJavascript(js) { result ->
                    val clean = result?.trim('"', ' ', '\n', '\r')
                    if (!clean.isNullOrBlank() && clean != "null" && clean.length > 25 && !captured) {
                        captured = true
                        finishWithToken(clean)
                    }
                }
            }

            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): android.webkit.WebResourceResponse? {
                request?.let { req ->
                    val headers = req.requestHeaders
                    val auth = headers["Authorization"] ?: headers["authorization"]
                    if (!auth.isNullOrBlank() && !auth.startsWith("Bot ") && auth.length > 25 && !captured) {
                        captured = true
                        runOnUiThread {
                            finishWithToken(auth.trim('"', ' '))
                        }
                    }
                }
                return super.shouldInterceptRequest(view, request)
            }
        }

        webView.loadUrl("https://discord.com/login")
    }

    private fun finishWithToken(token: String) {
        val intent = android.content.Intent().apply {
            putExtra(RESULT_TOKEN, token)
        }
        setResult(RESULT_OK, intent)
        finish()
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
