package expo.modules.notificationcapture

import android.content.Context
import org.json.JSONObject
import java.io.File

/**
 * Persists captured notifications to a JSON-lines file in the app's private
 * storage. The listener service appends; the JS module drains (reads + clears)
 * when the app is in the foreground. Keeping the write native means no
 * background JS/headless service is needed on modern Android.
 */
object NotificationCaptureStore {
  private const val FILE_NAME = "captured-notifications.jsonl"
  private const val MAX_BYTES = 2 * 1024 * 1024

  private fun file(context: Context): File = File(context.filesDir, FILE_NAME)

  @Synchronized
  fun append(context: Context, payload: JSONObject) {
    try {
      val target = file(context)

      if (target.exists() && target.length() > MAX_BYTES) {
        target.delete()
      }

      target.appendText(payload.toString() + "\n")
    } catch (_: Exception) {
      // A failed capture must never crash the listener.
    }
  }

  @Synchronized
  fun drain(context: Context): List<JSONObject> {
    val target = file(context)

    if (!target.exists()) {
      return emptyList()
    }

    val result = ArrayList<JSONObject>()

    try {
      target.forEachLine { line ->
        if (line.isNotBlank()) {
          try {
            result.add(JSONObject(line))
          } catch (_: Exception) {
            // Skip malformed lines.
          }
        }
      }
      target.delete()
    } catch (_: Exception) {
    }

    return result
  }
}
