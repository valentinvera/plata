import type { Session } from "@plata/auth"
import type { Database } from "@plata/db"

// biome-ignore lint/style/useConsistentTypeDefinitions: tRPC requiere un type alias para conservar la index signature implícita del context
export type Context = {
  db: Database
  session: Session | null
}
