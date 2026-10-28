import { StyleSheet } from "react-native"

export const financeFonts = {
  Manrope: require("../../assets/fonts/manrope-400.ttf"),
  ManropeSemiBold: require("../../assets/fonts/manrope-600.ttf"),
  ManropeBold: require("../../assets/fonts/manrope-700.ttf"),
  ManropeExtraBold: require("../../assets/fonts/manrope-800.ttf"),
}

export const financeTypography = StyleSheet.create({
  body: { fontFamily: "Manrope", fontSize: 14, lineHeight: 20 },
  medium: { fontFamily: "ManropeSemiBold", fontSize: 14, lineHeight: 20 },
  bold: { fontFamily: "ManropeBold" },
  display: { fontFamily: "ManropeExtraBold" },
  meta: { fontFamily: "Manrope", fontSize: 12, lineHeight: 18 },
  row: { fontFamily: "ManropeSemiBold", fontSize: 16, lineHeight: 22 },
  section: { fontFamily: "ManropeBold", fontSize: 20, lineHeight: 28 },
  screen: { fontFamily: "ManropeExtraBold", fontSize: 24, lineHeight: 32 },
  amount: {
    fontFamily: "ManropeExtraBold",
    fontSize: 40,
    lineHeight: 52,
    fontVariant: ["tabular-nums"],
  },
})

export const financeLayout = {
  touchTarget: 44,
  contentMaxWidth: 600,
  radius: 16,
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
} as const
