package expo.modules.notificationcapture

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject

/**
 * Captures the text of posted notifications into the local store. No work is
 * done in the background beyond this write: the JS app drains the queue when it
 * runs.
 */
class PlataNotificationListenerService : NotificationListenerService() {
  override fun onNotificationPosted(sbn: StatusBarNotification) {
    val notification: Notification = sbn.notification ?: return
    val extras = notification.extras ?: return

    val packageName = sbn.packageName
    val context = applicationContext

    if (packageName == null || packageName == context.packageName) {
      return
    }

    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim().orEmpty()
    val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim().orEmpty()
    val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim().orEmpty()

    if (title.isEmpty() && text.isEmpty() && bigText.isEmpty()) {
      return
    }

    val payload = JSONObject().apply {
      put("app", packageName)
      put("title", title)
      put("text", text)
      put("bigText", bigText)
      put("time", sbn.postTime.toString())
    }

    NotificationCaptureStore.append(context, payload)
  }
}
