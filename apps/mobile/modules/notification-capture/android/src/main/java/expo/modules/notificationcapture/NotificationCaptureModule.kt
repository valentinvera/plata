package expo.modules.notificationcapture

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NotificationCaptureModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NotificationCapture")

    // Returns the pending notifications as a JSON array. They are only removed
    // once ackAsync() is called, so a crash before ingestion keeps them.
    AsyncFunction("readPendingsAsync") {
      val context = appContext.reactContext

      if (context == null) "[]" else NotificationCaptureStore.readPendings(context)
    }

    AsyncFunction("ackAsync") {
      appContext.reactContext?.let { NotificationCaptureStore.ack(it) }
    }

    AsyncFunction("getPermissionStatusAsync") {
      val context = appContext.reactContext

      if (context == null) {
        "unknown"
      } else {
        // Access is granted per component, not per package: after replacing the
        // listener the app must be re-authorized (the screens prompt for it).
        val enabled = Settings.Secure.getString(
          context.contentResolver,
          "enabled_notification_listeners"
        ).orEmpty()
        val component = ComponentName(context, PlataNotificationListenerService::class.java)
        val granted = enabled.split(":").any { entry ->
          val parsed = ComponentName.unflattenFromString(entry)
          parsed != null &&
            parsed.packageName == component.packageName &&
            parsed.className == component.className
        }

        if (granted) "authorized" else "denied"
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
