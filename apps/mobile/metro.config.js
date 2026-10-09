const {
  withVarlockMetroConfig,
} = require("@varlock/expo-integration/metro-config")
const { getDefaultConfig } = require("expo/metro-config")
const { withUniwindConfig } = require("uniwind/metro")
const {
  wrapWithReanimatedMetroConfig,
} = require("react-native-reanimated/metro-config")

/** @type {import('expo/metro-config').MetroConfig} */
// biome-ignore lint/correctness/noGlobalDirnameFilename: este config es CommonJS y lo carga Node/Expo; import.meta.dirname lo rompe bajo Node 22+ (detección de ESM).
const config = getDefaultConfig(__dirname)

const uniwindConfig = withUniwindConfig(wrapWithReanimatedMetroConfig(config), {
  cssEntryFile: "./styles/globals.css",
  dtsFile: "./uniwind-types.d.ts",
})

module.exports = withVarlockMetroConfig(uniwindConfig)
