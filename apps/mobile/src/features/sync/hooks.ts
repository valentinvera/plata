import { useEffect } from "react"
import { AppState, Platform } from "react-native"

import { authClient } from "@/lib/auth-client"
import { syncApiClient } from "@/utils/trpc"

import { runSync } from "./sync-client"

// Syncs on mount and whenever the app returns to the foreground, once the user
// is signed in. A failed pass is ignored here: it retries on the next trigger.
export function useSyncOnForeground(): void {
  const { data: session } = authClient.useSession()
  const userId = session?.user.id ?? null

  useEffect(() => {
    if (!userId || Platform.OS === "web") {
      return
    }

    const sync = () => {
      runSync(userId, syncApiClient).catch(() => undefined)
    }

    sync()

    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") {
        sync()
      }
    })

    return () => subscription.remove()
  }, [userId])
}
