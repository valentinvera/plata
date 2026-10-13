import { type NativeModule, requireOptionalNativeModule } from "expo"

export interface CapturedNotification {
  app: string
  bigText: string
  text: string
  time: string
  title: string
}

declare class NotificationCaptureModule extends NativeModule {
  ackAsync(): Promise<void>
  getPermissionStatusAsync(): Promise<string>
  readPendingsAsync(): Promise<string>
  requestPermission(): void
}

// Optional: undefined on iOS/web, where the Android listener is not available.
export default requireOptionalNativeModule<NotificationCaptureModule>(
  "NotificationCapture"
)
