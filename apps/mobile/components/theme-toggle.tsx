import { Ionicons } from "@expo/vector-icons"
import { ImpactFeedbackStyle, impactAsync } from "expo-haptics"
import { Platform, Pressable } from "react-native"
import Animated, { FadeOut, ZoomIn } from "react-native-reanimated"
import { withUniwind } from "uniwind"

import { useAppTheme } from "@/contexts/app-theme-context"

const StyledIonicons = withUniwind(Ionicons)

export function ThemeToggle() {
  const { toggleTheme, isLight } = useAppTheme()

  return (
    <Pressable
      accessibilityLabel={
        isLight ? "Activar el modo oscuro" : "Activar el modo claro"
      }
      accessibilityRole="button"
      className="px-2.5"
      hitSlop={12}
      onPress={() => {
        if (Platform.OS === "ios") {
          impactAsync(ImpactFeedbackStyle.Light)
        }
        toggleTheme()
      }}
    >
      {isLight ? (
        <Animated.View entering={ZoomIn} exiting={FadeOut} key="moon">
          <StyledIonicons className="text-foreground" name="moon" size={20} />
        </Animated.View>
      ) : (
        <Animated.View entering={ZoomIn} exiting={FadeOut} key="sun">
          <StyledIonicons className="text-foreground" name="sunny" size={20} />
        </Animated.View>
      )}
    </Pressable>
  )
}
