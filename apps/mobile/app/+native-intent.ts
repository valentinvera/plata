import { getShareExtensionKey } from "expo-share-intent"

export function redirectSystemPath({
  path,
}: {
  initial: boolean
  path: string
}): string {
  try {
    // iOS launches the app with a `dataUrl=<share key>` deep link; send it to a
    // valid route so the modal does not sit on top of `+not-found`.
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) {
      return "/"
    }
    return path
  } catch {
    return "/"
  }
}
