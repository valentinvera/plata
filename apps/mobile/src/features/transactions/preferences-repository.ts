import { getAppMeta, setAppMeta } from "./app-meta-repository"
import {
  type Preferences,
  parsePreferences,
  serializePreferences,
} from "./preferences"

const PREFERENCES_KEY = "preferences"

export async function getPreferences(): Promise<Preferences> {
  return parsePreferences(await getAppMeta(PREFERENCES_KEY))
}

export async function setPreferences(
  update: Partial<Preferences>
): Promise<Preferences> {
  const next = { ...(await getPreferences()), ...update }

  await setAppMeta(PREFERENCES_KEY, serializePreferences(next))

  return next
}
