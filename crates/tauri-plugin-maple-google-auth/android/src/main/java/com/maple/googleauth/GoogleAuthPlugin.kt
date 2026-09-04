package com.maple.googleauth

import android.app.Activity
import android.util.Log
import androidx.activity.result.ActivityResult
import app.tauri.annotation.ActivityCallback
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException

/**
 * Native Google account chooser for Maple.
 *
 * Presents Google's sign-in account picker so the user can select *which* Google account to sign
 * into, bypassing the browser's default-account behaviour. Returns the chosen account's email; the
 * Rust command then opens the sign-in webview with that email as the `login_hint` so the captured
 * YTM session cookie belongs to the account the user actually picked.
 */
@TauriPlugin
class GoogleAuthPlugin(private val activity: Activity) : Plugin(activity) {
    // The chooser only needs the account email (to preselect it in the sign-in webview), never a
    // Google ID token, so we deliberately do NOT call `requestIdToken(...)`. An OAuth web client ID
    // must be registered against the app's package + signing-cert SHA-1 in the Google Cloud
    // Console, and when it isn't, `getSignedInAccountFromIntent` throws DEVELOPER_ERROR (status 10)
    // and the whole picker fails. Plain DEFAULT_SIGN_IN + email has no such dependency and works on
    // any package/signing config.

    @Command
    fun suggestAccount(invoke: Invoke) {
        try {
            val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .build()
            val client: GoogleSignInClient = GoogleSignIn.getClient(activity, gso)
            startActivityForResult(invoke, client.signInIntent, "googleSignInResult")
        } catch (ex: Exception) {
            Log.w("MapleGoogleAuth", "google sign-in unavailable: $ex")
            invoke.resolve(JSObject())
        }
    }

    @ActivityCallback
    fun googleSignInResult(invoke: Invoke, result: ActivityResult) {
        try {
            val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
            val account = task.getResult(ApiException::class.java)
            val email = account?.email
            val ret = JSObject()
            if (email != null) {
                ret.put("email", email)
            }
            invoke.resolve(ret)
        } catch (e: ApiException) {
            Log.w("MapleGoogleAuth", "sign-in failed: ${e.statusCode}")
            invoke.resolve(JSObject())
        } catch (e: Exception) {
            Log.w("MapleGoogleAuth", "sign-in error: $e")
            invoke.resolve(JSObject())
        }
    }
}
