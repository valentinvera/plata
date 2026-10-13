import { createRunOncePlugin, withAndroidManifest } from "expo/config-plugins"

const BOOT_RECEIVER = "com.lesimoes.androidnotificationlistener.BootUpReceiver"

// The upstream library starts its notification listener as a foreground service
// from a BOOT_COMPLETED receiver without calling startForeground(), which
// Android 12+ kills with a ForegroundServiceDidNotStartInTimeException. The
// system rebinds enabled notification listeners on its own, so drop the
// receiver from the merged manifest.
const withNotificationListenerFix = (config) =>
  withAndroidManifest(config, (modConfig) => {
    const { manifest } = modConfig.modResults

    manifest.$ = manifest.$ ?? {}
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools"

    const application = manifest.application?.[0]

    if (application) {
      application.receiver = application.receiver ?? []
      application.receiver.push({
        $: {
          "android:name": BOOT_RECEIVER,
          "tools:node": "remove",
        },
      })
    }

    return modConfig
  })

export default createRunOncePlugin(
  withNotificationListenerFix,
  "with-notification-listener-fix"
)
