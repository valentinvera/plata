package expo.modules.notificationcapture

import android.content.Intent
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray

class NotificationCaptureModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NotificationCapture")

    // Returns the pending notifications as a JSON array string and clears them.
    AsyncFunction("drainAsync") {
      val context = appContext.reactContext

      if (context == null) {
        "[]"
      } else {
        val array = JSONArray()
        NotificationCaptureStore.drain(context).forEach { array.put(it) }
        array.toString()
      }
    }

    AsyncFunction("getPermissionStatusAsync") {
      val context = appContext.reactContext

      if (context == null) {
        "unknown"
      } else {
        val enabled = NotificationManagerCompat.getEnabledListenerPackages(context)
        if (enabled.contains(context.packageName)) "authorized" else "denied"
      }
    }

    Function("requestPermission") {
      val context = appContext.reactContext

      if (context != null) {
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
      }
    }
  }
}
