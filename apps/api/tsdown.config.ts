import { defineConfig } from "tsdown"

export default defineConfig({
  clean: true,
  deps: {
    alwaysBundle: [/@plata\/.*/],
  },
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
})
