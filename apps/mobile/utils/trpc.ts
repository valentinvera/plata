import type { AppRouter } from "@plata/trpc/routers/index"
import { QueryClient } from "@tanstack/react-query"
import { createTRPCClient, httpBatchLink } from "@trpc/client"
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query"
import { Platform } from "react-native"
import { authClient } from "@/lib/auth-client"
import type { SyncApiClient } from "@/src/features/sync/sync-transport"

import { ENV } from "../src/env"

export const queryClient = new QueryClient()

function platformFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, {
    ...init,
    // Better Auth Expo forwards the session cookie manually on native.
    credentials: Platform.OS === "web" ? "include" : "omit",
  })
}

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      fetch: platformFetch,
      async headers() {
        if (Platform.OS === "web") {
          return {}
        }
        const headers = new Map<string, string>()
        const cookies = await authClient.getCookie()
        if (cookies) {
          headers.set("Cookie", cookies)
        }
        return Object.fromEntries(headers)
      },
      url: `${ENV.EXPO_PUBLIC_SERVER_URL}/trpc`,
    }),
  ],
})

// Compile-time guard: the API client must satisfy the sync transport contract.
export const syncApiClient: SyncApiClient = trpcClient

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
})
