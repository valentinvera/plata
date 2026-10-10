// The package ships an `index.d.ts` that lists named exports, but its runtime
// `index.js` only exposes a default export (the native module) plus the headless
// task name. Augment the module so the default import type-checks.
declare module "react-native-android-notification-listener" {
  export const RNAndroidNotificationListenerHeadlessJsName: "RNAndroidNotificationListenerHeadlessJs"

  export interface RNAndroidNotificationListener {
    getPermissionStatus: () => Promise<"authorized" | "denied" | "unknown">
    requestPermission: () => void
  }

  const listener: RNAndroidNotificationListener
  export default listener
}
