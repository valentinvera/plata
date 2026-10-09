import { createAuth } from "@plata/auth"
import { createDb } from "@plata/db"

import { ENV } from "./env.server"

export const db = createDb(ENV)
export const auth = createAuth(ENV, db)
