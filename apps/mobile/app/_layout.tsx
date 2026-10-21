import "@/styles/globals.css"
import {
  focusManager,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query"
import { router, Stack } from "expo-router"
import { ShareIntentProvider, useShareIntentContext } from "expo-share-intent"
import { StatusBar } from "expo-status-bar"
import { HeroUINativeProvider } from "heroui-native"
import { useEffect } from "react"
import { Alert, AppState, Platform } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { KeyboardProvider } from "react-native-keyboard-controller"

import { NavigationTheme } from "@/components/navigation-theme"
import { AppThemeProvider, useAppTheme } from "@/contexts/app-theme-context"
import { useSyncOnForeground } from "@/src/features/sync/hooks"
import {
  transactionsQueryKey,
  useAppMeta,
  useLastLoggedTime,
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
    <Stack screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="add-transaction"
        options={{ presentation: "modal", title: "Agregar movimiento" }}
      />
      <Stack.Screen name="week" options={{ title: "Esta semana" }} />
      <Stack.Screen name="catch-up" options={{ title: "Ponerme al día" }} />
      <Stack.Screen name="budgets" options={{ title: "Presupuestos" }} />
      <Stack.Screen name="accounts" options={{ title: "Medios de pago" }} />
      <Stack.Screen name="account" options={{ title: "Mi cuenta" }} />
      <Stack.Screen name="search" options={{ title: "Buscar" }} />
      <Stack.Screen name="categories" options={{ title: "Categorías" }} />
      <Stack.Screen name="preferences" options={{ title: "Preferencias" }} />
      <Stack.Screen name="export" options={{ title: "Exportar" }} />
      <Stack.Screen name="duplicates" options={{ title: "Duplicados" }} />
      <Stack.Screen name="recurring" options={{ title: "Recurrentes" }} />
      <Stack.Screen name="insights" options={{ title: "Análisis" }} />
      <Stack.Screen
        name="notifications"
        options={{ title: "Importación automática" }}
      />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="transaction/[id]" options={{ title: "Movimiento" }} />
      <Stack.Screen
        name="modal"
        options={{ presentation: "modal", title: "Modal" }}
      />
    </Stack>
  )
}

function ReminderScheduler() {
  const { data: preferences } = usePreferences()
  const { data: lastLoggedAt } = useLastLoggedTime()
  const enabled = preferences?.remindersEnabled ?? false
  const ready = preferences !== undefined && lastLoggedAt !== undefined

  // Keep a single "get up to date" reminder in sync with when the user last
  // logged something (opt-in).
  useEffect(() => {
    if (!ready) {
      return
    }

    const run = () => {
      const task = enabled ? syncReminder(lastLoggedAt) : cancelReminders()
      task.catch(() => undefined)
    }

    run()

    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") {
        run()
      }
    })

    return () => subscription.remove()
  }, [enabled, lastLoggedAt, ready])

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

// The home hides the native header, so the status bar has to follow the app
// theme: light icons on the ink background, dark icons on the sand one.
function ThemedStatusBar() {
  const { isDark } = useAppTheme()

  return <StatusBar style={isDark ? "light" : "dark"} />
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
              <ThemedStatusBar />
              <NavigationTheme>
                <HeroUINativeProvider>
                  <StackLayout />
                  <SyncHandler />
                  <NotificationDrain />
                  <ReminderScheduler />
                  <ShareIntentHandler />
                </HeroUINativeProvider>
              </NavigationTheme>
            </AppThemeProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ShareIntentProvider>
  )
}
