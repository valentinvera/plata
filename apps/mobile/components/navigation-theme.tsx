import { DarkTheme, DefaultTheme, type Theme, ThemeProvider } from "expo-router"
import type { PropsWithChildren } from "react"

import { useAppTheme } from "@/contexts/app-theme-context"

// Brand tokens for the native navigator chrome (headers, screen background) so
// it follows the app theme instead of React Navigation's default white/black.
const light: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#f4f1ea",
    border: "#e7e2d8",
    card: "#f4f1ea",
    notification: "#ff6b5c",
    primary: "#0e7c5a",
    text: "#10221c",
  },
}

const dark: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#10221c",
    border: "#22423a",
    card: "#10221c",
    notification: "#ff6b5c",
    primary: "#12b886",
    text: "#eaf5f0",
  },
}

export function NavigationTheme({ children }: PropsWithChildren) {
  const { isDark } = useAppTheme()

  return <ThemeProvider value={isDark ? dark : light}>{children}</ThemeProvider>
}
