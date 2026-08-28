package com.maple.googleauth

import android.app.Activity
import android.os.CancellationSignal
import android.util.Log
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.GetCredentialNoCredentialException
import androidx.core.content.ContextCompat
import com.google.android.libraries.identity.googleid.GetGoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

/**
 * Native Google account chooser for Maple.
 *
 * Presents Google Credential Manager's sign-in-with-Google picker so the user can select *which*
 * account to sign into, bypassing the browser's default-account behaviour. Returns the chosen
 * account's email; the Rust command then opens the sign-in webview with that email as the
 * `login_hint` so the captured session cookie belongs to the account the user actually picked.
 */
@TauriPlugin
class GoogleAuthPlugin(private val activity: Activity) : Plugin(activity) {
    // Web Application OAuth client ID (Google Cloud Console). Public client identifier — safe to
    // ship in the app; it only identifies the client to Google's account chooser.
    private val serverClientId =
        "863073010017-7hjv9bdptpuleevj0h8g1r02eoic8kjb.apps.googleusercontent.com"

    @Command
    fun suggestAccount(invoke: Invoke) {
        try {
            val request = GetCredentialRequest.Builder()
                .addCredentialOption(
                    GetSignInWithGoogleOption.Builder(serverClientId)
                        // Show all device accounts (incl. ones not previously used in the app)
                        // so the user really can switch Google IDs.
                        .setFilterByAuthorizedAccounts(false)
                        // Never auto-select a single account — this is a chooser.
                        .setAutoSelectEnabled(false)
                        .build()
                )
                .build()

            val credentialManager = CredentialManager.create(activity)
            val mainExecutor = ContextCompat.getMainExecutor(activity)

            credentialManager.getCredential(
                activity,
                request,
                CancellationSignal(),
                mainExecutor,
                object : android.os.OutcomeReceiver<GetCredentialResponse, GetCredentialException> {
                    override fun onResult(result: GetCredentialResponse) {
                        val credential = result.credential
                        val idToken = credential as? GetGoogleIdTokenCredential
                        if (idToken != null) {
                            val email = idToken.id
                            val ret = JSObject()
                            ret.put("email", email)
                            invoke.resolve(ret)
                        } else {
                            // Unexpected credential type — resolve empty (no account chosen).
                            invoke.resolve(JSObject())
                        }
                    }

                    override fun onError(error: GetCredentialException) {
                        when (error) {
                            is GetCredentialCancellationException,
                            is GetCredentialNoCredentialException -> {
                                // User backed out, or no Google accounts on device: fall back to
                                // the plain webview sign-in (no hint).
                                invoke.resolve(JSObject())
                            }
                            else -> {
                                Log.w("MapleGoogleAuth", "credential manager error: $error")
                                invoke.resolve(JSObject())
                            }
                        }
                    }
                }
            )
        } catch (ex: Exception) {
            // CredentialManager unavailable (e.g. missing Play Services): fall back silently.
            Log.w("MapleGoogleAuth", "credential manager unavailable: $ex")
            invoke.resolve(JSObject())
        }
    }
}
