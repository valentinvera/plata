import "@/styles/globals.css"
import {
  focusManager,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query"
import { router, Stack } from "expo-router"
import { ShareIntentProvider, useShareIntentContext } from "expo-share-intent"
import { HeroUINativeProvider } from "heroui-native"
import { useEffect } from "react"
import { Alert, AppState, Platform } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { KeyboardProvider } from "react-native-keyboard-controller"

import { AppThemeProvider } from "@/contexts/app-theme-context"
import { useSyncOnForeground } from "@/src/features/sync/hooks"
import {
  transactionsQueryKey,
  useAppMeta,
  useLastTransactionTime,
  usePreferences,
} from "@/src/features/transactions/hooks"
import { drainCapturedNotifications } from "@/src/features/transactions/notification-listener"
import { recognizeTransactionText } from "@/src/features/transactions/ocr-recognize"
import {
  ONBOARDING_COMPLETED_KEY,
  shouldShowOnboarding,
} from "@/src/features/transactions/onboarding"
import {
  cancelReminders,
  syncReminder,
} from "@/src/features/transactions/reminder-scheduler"
import {
  getSharedImageUrl,
  getSharedText,
} from "@/src/features/transactions/share"
import { queryClient } from "@/utils/trpc"

function StackLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="add-transaction"
        options={{ presentation: "modal", title: "Add transaction" }}
      />
      <Stack.Screen name="week" options={{ title: "This week" }} />
      <Stack.Screen name="catch-up" options={{ title: "Catch up" }} />
      <Stack.Screen name="budgets" options={{ title: "Budgets" }} />
      <Stack.Screen name="accounts" options={{ title: "Accounts" }} />
      <Stack.Screen name="account" options={{ title: "Account" }} />
      <Stack.Screen name="search" options={{ title: "Search" }} />
      <Stack.Screen name="categories" options={{ title: "Categories" }} />
      <Stack.Screen name="preferences" options={{ title: "Preferences" }} />
      <Stack.Screen name="export" options={{ title: "Export" }} />
      <Stack.Screen name="duplicates" options={{ title: "Duplicates" }} />
      <Stack.Screen name="recurring" options={{ title: "Recurring" }} />
      <Stack.Screen name="insights" options={{ title: "Insights" }} />
      <Stack.Screen
        name="notifications"
        options={{ title: "Automatic import" }}
      />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen
        name="transaction/[id]"
        options={{ title: "Transaction" }}
      />
      <Stack.Screen
        name="modal"
        options={{ presentation: "modal", title: "Modal" }}
      />
    </Stack>
  )
}

function ReminderScheduler() {
  const { data: preferences } = usePreferences()
  const { data: lastAt } = useLastTransactionTime()
  const enabled = preferences?.remindersEnabled ?? false
  const ready = preferences !== undefined && lastAt !== undefined

  // Keep a single "get up to date" reminder in sync with how long ago the last
  // transaction was (opt-in).
  useEffect(() => {
    if (!ready) {
      return
    }

    const run = () => {
      const task = enabled ? syncReminder(lastAt) : cancelReminders()
      task.catch(() => undefined)
    }

    run()

    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") {
        run()
      }
    })

    return () => subscription.remove()
  }, [enabled, lastAt, ready])

  return null
}

function ShareIntentHandler() {
  const { hasShareIntent, resetShareIntent, shareIntent } =
    useShareIntentContext()
  const sharedText = getSharedText(shareIntent)
  const sharedImage = getSharedImageUrl(shareIntent)
  const { data: onboardingValue, isLoading } = useAppMeta(
    ONBOARDING_COMPLETED_KEY
  )

  useEffect(() => {
    if (!hasShareIntent || isLoading) {
      return
    }

    // Don't bypass onboarding on a fresh install: hold the share until the user
    // has finished it, then import.
    if (shouldShowOnboarding(onboardingValue ?? null)) {
      router.push("/onboarding")
      return
    }

    if (sharedText) {
      router.push({
        pathname: "/add-transaction",
        params: { text: sharedText },
      })
      resetShareIntent()
      return
    }

    if (!sharedImage) {
      return
    }

    // iOS screenshots arrive as images: OCR them before opening the form.
    let cancelled = false

    const importImage = async () => {
      let text: string | null = null

      try {
        text = await recognizeTransactionText(sharedImage)
      } catch {
        text = null
      }

      if (cancelled) {
        return
      }

      if (text) {
        router.push({ pathname: "/add-transaction", params: { text } })
      } else {
        Alert.alert(
          "Could not read the image",
          "We could not find a transaction in that screenshot. Try a clearer image or add it manually."
        )
      }

      resetShareIntent()
    }

    importImage().catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [
    hasShareIntent,
    isLoading,
    onboardingValue,
    resetShareIntent,
    sharedImage,
    sharedText,
  ])

  return null
}

function SyncHandler() {
  useSyncOnForeground()
  return null
}

function NotificationDrain() {
  const client = useQueryClient()

  // Turn notifications captured in the background into suggestions when the app
  // is (re)opened.
  useEffect(() => {
    if (Platform.OS !== "android") {
      return
    }

    let cancelled = false

    const drain = () => {
      drainCapturedNotifications()
        .then((count) => {
          if (!(cancelled || count === 0)) {
            return client.invalidateQueries({
              queryKey: transactionsQueryKey,
            })
          }
        })
        .catch(() => undefined)
    }

    drain()

    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") {
        drain()
      }
    })

    return () => {
      cancelled = true
      subscription.remove()
    }
  }, [client])

  return null
}

export default function Layout() {
  // Background ingestion writes straight to SQLite, so refetch the cached
  // queries when the app returns to the foreground.
  useEffect(() => {
    if (Platform.OS === "web") {
      return
    }

    const subscription = AppState.addEventListener("change", (status) => {
      focusManager.setFocused(status === "active")
    })

    return () => subscription.remove()
  }, [])

  return (
    <ShareIntentProvider>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <AppThemeProvider>
              <HeroUINativeProvider>
                <StackLayout />
                <SyncHandler />
                <NotificationDrain />
                <ReminderScheduler />
                <ShareIntentHandler />
              </HeroUINativeProvider>
            </AppThemeProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ShareIntentProvider>
  )
}
