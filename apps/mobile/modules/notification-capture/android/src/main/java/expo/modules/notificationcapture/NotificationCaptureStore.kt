package expo.modules.notificationcapture

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * Persists captured notifications to a JSON-lines file in the app's private
 * storage. The listener service appends; the JS module reads the pending lines
 * and acknowledges (removes) them only after they were ingested, so a crash
 * mid-processing never drops a notification.
 */
object NotificationCaptureStore {
  private const val FILE_NAME = "captured-notifications.jsonl"
  private const val MAX_BYTES = 2 * 1024 * 1024

  // Byte offset up to which the last read should be acknowledged.
  private var pendingOffset = 0

  private fun file(context: Context): File = File(context.filesDir, FILE_NAME)

  @Synchronized
  fun append(context: Context, payload: JSONObject) {
    try {
      val target = file(context)

      if (target.exists() && target.length() > MAX_BYTES) {
        target.delete()
        pendingOffset = 0
      }

      target.appendText(payload.toString() + "\n")
    } catch (_: Exception) {
      // A failed capture must never crash the listener.
    }
  }

  @Synchronized
  fun readPendings(context: Context): String {
    val target = file(context)
    val array = JSONArray()

    if (!target.exists()) {
      pendingOffset = 0
      return array.toString()
    }

    try {
      val bytes = target.readBytes()
      pendingOffset = bytes.size

      bytes.toString(Charsets.UTF_8).lineSequence().forEach { line ->
        if (line.isNotBlank()) {
          try {
            array.put(JSONObject(line))
          } catch (_: Exception) {
            // Skip malformed lines.
          }
        }
      }
    } catch (_: Exception) {
    }

    return array.toString()
  }

  @Synchronized
  fun ack(context: Context) {
    val target = file(context)

    if (!target.exists()) {
      pendingOffset = 0
      return
    }

    try {
      val bytes = target.readBytes()

      if (pendingOffset >= bytes.size) {
        target.delete()
      } else {
        target.writeBytes(bytes.copyOfRange(pendingOffset, bytes.size))
      }
    } catch (_: Exception) {
    }

    pendingOffset = 0
  }
}
