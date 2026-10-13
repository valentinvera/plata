import "expo-router/entry"

import { registerNotificationListener } from "./src/features/transactions/notification-listener"

// Register at the bundle entry, not in a route: the headless notification task
// runs without rendering the router, so `app/_layout.tsx` is never evaluated.
registerNotificationListener()
