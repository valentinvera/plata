import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { AppState, Platform } from "react-native"

import { authClient } from "@/lib/auth-client"
import { transactionsQueryKey } from "@/src/features/transactions/hooks"
import { syncApiClient } from "@/utils/trpc"

import { runSync } from "./sync-client"
import { SyncKeyMismatchError, SyncKeyMissingError } from "./sync-runner"

export type SyncStatus =
  | "idle"
  | "syncing"
  | "key-missing"
  | "key-mismatch"
  | "error"

function statusFor(error: unknown): SyncStatus {
  if (error instanceof SyncKeyMissingError) {
    return "key-missing"
  }

  if (error instanceof SyncKeyMismatchError) {
    return "key-mismatch"
  }

  return "error"
}

// Syncs on mount and whenever the app returns to the foreground, once the user
// is signed in. The returned status lets the UI route non-retryable key
// failures (recovery/reset) while transient errors just retry next time.
export function useSyncOnForeground(): SyncStatus {
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const userId = session?.user.id ?? null
  const [status, setStatus] = useState<SyncStatus>("idle")

  useEffect(() => {
    if (!userId || Platform.OS === "web") {
      return
    }

    const sync = () => {
      setStatus("syncing")
      runSync(userId, syncApiClient)
        .then(() => {
          setStatus("idle")

          return queryClient.invalidateQueries({
            queryKey: transactionsQueryKey,
          })
        })
        .catch((error: unknown) => setStatus(statusFor(error)))
    }

    sync()

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        sync()
      }
    })

    return () => subscription.remove()
  }, [queryClient, userId])

  return status
}
