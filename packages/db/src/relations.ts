import { defineRelations } from "drizzle-orm"

import { account, authRelations, session, user, verification } from "./schema"
import { device, encryptedBlob, syncCursor } from "./schema/sync"

export const relations = {
  ...defineRelations({
    account,
    device,
    encryptedBlob,
    session,
    syncCursor,
    user,
    verification,
  }),
  ...authRelations,
}
