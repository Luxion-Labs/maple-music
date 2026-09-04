package com.maple.discord

import android.app.Activity
import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import okhttp3.*
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

@InvokeArg
data class ConnectArgs(val token: String)

@InvokeArg
data class ActivityArgs(
    val appName: String,
    val applicationId: String,
    val details: String,
    val state: String,
    val largeImage: String? = null,
    val smallImage: String? = null
)

@TauriPlugin
class DiscordRpcPlugin(private val activity: Activity) : Plugin(activity) {
    private val tag = "MapleDiscordRpc"
    private val scope = CoroutineScope(Dispatchers.IO + Job())
    
    companion object {
        private const val REQUEST_DISCORD_LOGIN = 9001
    }
    
    private val client = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private var activeWebSocket: WebSocket? = null
    private var heartbeatJob: Job? = null
    private var heartbeatIntervalMs: Long = 41250L
    private var currentToken: String = ""
    private var applicationId: String = "1540597943151763486"
    private var isConnected: Boolean = false
    private var pendingWebViewInvoke: Invoke? = null

    private val prefs: SharedPreferences
        get() = activity.getSharedPreferences("maple_discord_prefs", Context.MODE_PRIVATE)

    @Command
    fun connectWithToken(invoke: Invoke) {
        val args = invoke.parseArgs(ConnectArgs::class.java)
        val token = args.token.trim().trim('"', '\'')
        
        if (token.isBlank()) {
            val result = JSObject()
            result.put("success", false)
            result.put("message", "Token cannot be empty")
            invoke.resolve(result)
            return
        }

        // Save token
        prefs.edit().putString("discord_token", token).apply()
        currentToken = token

        // Extract application ID if it looks like one (all digits, 17-21 chars)
        if (token.all { it.isDigit() } && token.length in 17..21) {
            applicationId = token
            prefs.edit().putString("application_id", applicationId).apply()
            val result = JSObject()
            result.put("success", false)
            result.put("message", "Application ID saved. Please provide a user or bot token.")
            invoke.resolve(result)
            return
        }

        scope.launch {
            try {
                connectToGateway(token)
                val result = JSObject()
                result.put("success", true)
                result.put("message", "Connected to Discord Gateway")
                invoke.resolve(result)
            } catch (e: Exception) {
                val result = JSObject()
                result.put("success", false)
                result.put("message", e.message ?: "Connection failed")
                invoke.resolve(result)
            }
        }
    }

    @Command
    fun openWebViewLogin(invoke: Invoke) {
        val intent = android.content.Intent(activity, DiscordWebViewActivity::class.java)
        activity.startActivityForResult(intent, REQUEST_DISCORD_LOGIN)
        
        // Store the invoke to resolve later in onActivityResult
        pendingWebViewInvoke = invoke
    }

    @Command
    fun updateActivity(invoke: Invoke) {
        val args = invoke.parseArgs(ActivityArgs::class.java)
        
        scope.launch {
            try {
                if (!isConnected || activeWebSocket == null) {
                    invoke.reject("Not connected to Discord")
                    return@launch
                }

                sendPresenceUpdate(args)
                invoke.resolve()
            } catch (e: Exception) {
                invoke.reject("Failed to update activity: ${e.message}")
            }
        }
    }

    @Command
    fun disconnect(invoke: Invoke) {
        scope.launch {
            try {
                heartbeatJob?.cancel()
                heartbeatJob = null
                activeWebSocket?.close(1000, "User disconnected")
                activeWebSocket = null
                isConnected = false
                invoke.resolve()
            } catch (e: Exception) {
                invoke.reject("Failed to disconnect: ${e.message}")
            }
        }
    }

    @Command
    fun saveToken(invoke: Invoke) {
        val args = invoke.parseArgs(ConnectArgs::class.java)
        prefs.edit().putString("discord_token", args.token).apply()
        invoke.resolve()
    }

    @Command
    fun getSavedToken(invoke: Invoke) {
        val token = prefs.getString("discord_token", "") ?: ""
        val result = JSObject()
        result.put("token", token)
        invoke.resolve(result)
    }

    private suspend fun connectToGateway(token: String) = withContext(Dispatchers.IO) {
        val gatewayUrl = "wss://gateway.discord.gg/?v=10&encoding=json"
        val request = Request.Builder().url(gatewayUrl).build()

        activeWebSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d(tag, "Gateway WebSocket opened")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                handleGatewayMessage(webSocket, text, token)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e(tag, "Gateway connection error: ${t.message}")
                isConnected = false
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                heartbeatJob?.cancel()
                isConnected = false
            }
        })

        // Wait a moment for connection
        delay(2000)
    }

    private fun handleGatewayMessage(webSocket: WebSocket, text: String, token: String) {
        try {
            val json = JSONObject(text)
            val op = json.optInt("op", -1)

            when (op) {
                10 -> { // Hello
                    val d = json.getJSONObject("d")
                    heartbeatIntervalMs = d.getLong("heartbeat_interval")
                    startHeartbeat(webSocket)
                    sendGatewayIdentify(webSocket, token)
                }
                11 -> { // Heartbeat ACK
                    Log.d(tag, "Heartbeat ACK")
                }
                0 -> { // Dispatch
                    val t = json.optString("t")
                    if (t == "READY") {
                        isConnected = true
                        Log.d(tag, "Discord Gateway Ready")
                    }
                }
                9 -> { // Invalid Session
                    Log.w(tag, "Invalid Discord session")
                    isConnected = false
                }
            }
        } catch (e: Exception) {
            Log.e(tag, "Error handling gateway message", e)
        }
    }

    private fun startHeartbeat(webSocket: WebSocket) {
        heartbeatJob?.cancel()
        heartbeatJob = scope.launch {
            while (isActive) {
                delay(heartbeatIntervalMs)
                try {
                    val heartbeat = JSONObject().apply {
                        put("op", 1)
                        put("d", JSONObject.NULL)
                    }
                    webSocket.send(heartbeat.toString())
                } catch (e: Exception) {
                    break
                }
            }
        }
    }

    private fun sendGatewayIdentify(webSocket: WebSocket, token: String) {
        val cleanToken = if (token.startsWith("Bot ")) token.removePrefix("Bot ").trim() else token

        val identify = JSONObject().apply {
            put("op", 2)
            put("d", JSONObject().apply {
                put("token", cleanToken)
                put("properties", JSONObject().apply {
                    put("os", "Android")
                    put("browser", "Maple Music")
                    put("device", "Android")
                })
                put("presence", JSONObject().apply {
                    put("since", JSONObject.NULL)
                    put("status", "online")
                    put("afk", false)
                    put("activities", JSONArray())
                })
            })
        }
        webSocket.send(identify.toString())
    }

    private fun sendPresenceUpdate(activity: ActivityArgs) {
        val socket = activeWebSocket ?: return

        try {
            val payload = JSONObject().apply {
                put("op", 3)
                put("d", JSONObject().apply {
                    put("since", JSONObject.NULL)
                    put("status", "online")
                    put("afk", false)
                    put("activities", JSONArray().apply {
                        put(JSONObject().apply {
                            put("name", activity.appName)
                            put("type", 2) // 0 = Playing, 2 = Listening
                            put("application_id", activity.applicationId)
                            put("details", activity.details)
                            put("state", activity.state)
                            put("timestamps", JSONObject().apply {
                                put("start", System.currentTimeMillis())
                            })
                            if (activity.largeImage != null || activity.smallImage != null) {
                                put("assets", JSONObject().apply {
                                    if (activity.largeImage != null) {
                                        put("large_image", activity.largeImage)
                                        put("large_text", "Maple Music")
                                    }
                                    if (activity.smallImage != null) {
                                        put("small_image", activity.smallImage)
                                        put("small_text", "Now Playing")
                                    }
                                })
                            }
                        })
                    })
                })
            }
            socket.send(payload.toString())
            Log.d(tag, "Sent presence update")
        } catch (e: Exception) {
            Log.e(tag, "Failed to send presence update", e)
        }
    }

    override fun onActivityResult(activity: AppCompatActivity, requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        super.onActivityResult(activity, requestCode, resultCode, data)
        
        if (requestCode == REQUEST_DISCORD_LOGIN && pendingWebViewInvoke != null) {
            val invoke = pendingWebViewInvoke!!
            pendingWebViewInvoke = null
            
            if (resultCode == Activity.RESULT_OK && data != null) {
                val token = data.getStringExtra(DiscordWebViewActivity.RESULT_TOKEN)
                if (!token.isNullOrBlank()) {
                    // Save and connect with the captured token
                    prefs.edit().putString("discord_token", token).apply()
                    currentToken = token
                    
                    scope.launch {
                        try {
                            connectToGateway(token)
                            val result = JSObject()
                            result.put("success", true)
                            result.put("message", "Connected via Discord login")
                            invoke.resolve(result)
                        } catch (e: Exception) {
                            val result = JSObject()
                            result.put("success", false)
                            result.put("message", e.message ?: "Connection failed")
                            invoke.resolve(result)
                        }
                    }
                } else {
                    val result = JSObject()
                    result.put("success", false)
                    result.put("message", "No token captured")
                    invoke.resolve(result)
                }
            } else {
                val result = JSObject()
                result.put("success", false)
                result.put("message", "Login cancelled")
                invoke.resolve(result)
            }
        }
    }

    override fun onDestroy(activity: AppCompatActivity) {
        super.onDestroy(activity)
        scope.cancel()
        heartbeatJob?.cancel()
        activeWebSocket?.close(1000, "Plugin destroyed")
    }
}
