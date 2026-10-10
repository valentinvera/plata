import "@/styles/globals.css"
import { QueryClientProvider } from "@tanstack/react-query"
import { router, Stack } from "expo-router"
import { ShareIntentProvider, useShareIntentContext } from "expo-share-intent"
import { HeroUINativeProvider } from "heroui-native"
import { useEffect } from "react"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { KeyboardProvider } from "react-native-keyboard-controller"

import { AppThemeProvider } from "@/contexts/app-theme-context"
import { getSharedText } from "@/src/features/transactions/share"
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

  useEffect(() => {
    if (hasShareIntent && sharedText) {
      router.push({
        pathname: "/add-transaction",
        params: { text: sharedText },
      })
      resetShareIntent()
    }
  }, [hasShareIntent, resetShareIntent, sharedText])

  return null
}

export default function Layout() {
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
