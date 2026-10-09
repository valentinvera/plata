import { type Config, defineConfig } from "drizzle-kit"
import "varlock/auto-load"

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/schema/index.ts",
} satisfies Config)
