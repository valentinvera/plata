import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2"
import { expo } from "@better-auth/expo"
import type { Database } from "@plata/db"
import {
  account,
  authRelations,
  session,
  user,
  verification,
} from "@plata/db/schema/auth"
import { betterAuth } from "better-auth"

export interface AuthConfig {
  AUTH_TRUSTED_ORIGINS: string
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  CORS_ORIGIN: string
}

export function createAuth(
  env: AuthConfig,
  database: Database,
  desktopOrigins: readonly string[] = []
) {
  const configuredOrigins = env.AUTH_TRUSTED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)

  return betterAuth({
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "none",
        secure: true,
      },
    },
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: { account, authRelations, session, user, verification },
    }),
    emailAndPassword: { enabled: true },
    plugins: [expo()],
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.CORS_ORIGIN, ...desktopOrigins, ...configuredOrigins],
  })
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"]
