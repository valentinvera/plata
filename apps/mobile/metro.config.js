const {
  withVarlockMetroConfig,
} = require("@varlock/expo-integration/metro-config")
const { getDefaultConfig } = require("expo/metro-config")
const { withUniwindConfig } = require("uniwind/metro")
const {
  wrapWithReanimatedMetroConfig,
} = require("react-native-reanimated/metro-config")

/** @type {import('expo/metro-config').MetroConfig} */
// biome-ignore lint/correctness/noGlobalDirnameFilename: this config is CommonJS and is loaded by Node/Expo; import.meta.dirname breaks it under Node 22+ (ESM detection).
const config = getDefaultConfig(__dirname)

// expo-sqlite on web requires WASM assets and SharedArrayBuffer (COEP/COOP) headers.
config.resolver.assetExts.push("wasm")
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader("Cross-Origin-Embedder-Policy", "credentialless")
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin")
  return middleware(req, res, next)
}

const uniwindConfig = withUniwindConfig(wrapWithReanimatedMetroConfig(config), {
  cssEntryFile: "./styles/globals.css",
  dtsFile: "./uniwind-types.d.ts",
})

module.exports = withVarlockMetroConfig(uniwindConfig)
