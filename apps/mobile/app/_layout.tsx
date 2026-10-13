import "@/styles/globals.css"
import { focusManager, QueryClientProvider } from "@tanstack/react-query"
import { router, Stack } from "expo-router"
import { ShareIntentProvider, useShareIntentContext } from "expo-share-intent"
import { HeroUINativeProvider } from "heroui-native"
import { useEffect } from "react"
import { AppState, Platform } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { KeyboardProvider } from "react-native-keyboard-controller"

import { AppThemeProvider } from "@/contexts/app-theme-context"
import { useSyncOnForeground } from "@/src/features/sync/hooks"
import { useAppMeta } from "@/src/features/transactions/hooks"
import { registerNotificationListener } from "@/src/features/transactions/notification-listener"
import {
  ONBOARDING_COMPLETED_KEY,
  shouldShowOnboarding,
} from "@/src/features/transactions/onboarding"
import { getSharedText } from "@/src/features/transactions/share"
import { queryClient } from "@/utils/trpc"

// Register early so the headless task is available even when the app is closed.
registerNotificationListener()

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

function ShareIntentHandler() {
  const { hasShareIntent, resetShareIntent, shareIntent } =
    useShareIntentContext()
  const sharedText = getSharedText(shareIntent)
  const { data: onboardingValue, isLoading } = useAppMeta(
    ONBOARDING_COMPLETED_KEY
  )

  useEffect(() => {
    if (!(hasShareIntent && sharedText) || isLoading) {
      return
    }

    // Don't bypass onboarding on a fresh install: hold the share until the user
    // has finished it, then import.
    if (shouldShowOnboarding(onboardingValue ?? null)) {
      router.push("/onboarding")
      return
    }

    router.push({
      pathname: "/add-transaction",
      params: { text: sharedText },
    })
    resetShareIntent()
  }, [hasShareIntent, isLoading, onboardingValue, resetShareIntent, sharedText])

  return null
}

export default function Layout() {
  useSyncOnForeground()

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
                <ShareIntentHandler />
              </HeroUINativeProvider>
            </AppThemeProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ShareIntentProvider>
  )
}
