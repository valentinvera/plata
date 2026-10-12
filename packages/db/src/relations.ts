import { defineRelations } from "drizzle-orm"

import { account, authRelations, session, user, verification } from "./schema"
import { device, encryptedBlob } from "./schema/sync"

export const relations = {
  ...defineRelations({
    account,
    device,
    encryptedBlob,
    session,
    user,
    verification,
  }),
  ...authRelations,
}
