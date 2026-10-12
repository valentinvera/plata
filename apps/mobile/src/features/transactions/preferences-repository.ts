import { getAppMeta, setAppMeta } from "./app-meta-repository"
import {
  type Preferences,
  parsePreferences,
  serializePreferences,
} from "./preferences"

const PREFERENCES_KEY = "preferences"

// Preference writes are read-merge-write, so serialize them to avoid two
// concurrent updates (e.g. a chip tap while Save is in flight) clobbering each
// other.
let pendingWrite: Promise<unknown> = Promise.resolve()

export async function getPreferences(): Promise<Preferences> {
  return parsePreferences(await getAppMeta(PREFERENCES_KEY))
}

export function setPreferences(
  update: Partial<Preferences>
): Promise<Preferences> {
  const result = pendingWrite.then(async () => {
    const next = { ...(await getPreferences()), ...update }

    await setAppMeta(PREFERENCES_KEY, serializePreferences(next))

    return next
  })

  pendingWrite = result.catch(() => undefined)

  return result
}
