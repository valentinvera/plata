import type { Session } from "@plata/auth"
import type { Database } from "@plata/db"

// biome-ignore lint/style/useConsistentTypeDefinitions: tRPC requires a type alias to preserve the context's implicit index signature
export type Context = {
  db: Database
  session: Session | null
}
