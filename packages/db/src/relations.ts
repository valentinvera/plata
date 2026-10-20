import { defineRelations } from "drizzle-orm"

import { account, authRelations, session, user, verification } from "./schema"
import { space, spaceBlob, spaceMember } from "./schema/spaces"
import { device, encryptedBlob } from "./schema/sync"

export const relations = {
  ...defineRelations({
    account,
    device,
    encryptedBlob,
    session,
    space,
    spaceBlob,
    spaceMember,
    user,
    verification,
  }),
  ...authRelations,
}
