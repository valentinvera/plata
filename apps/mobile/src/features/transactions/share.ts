export interface ShareIntentLike {
  text?: string | null
}

export function getSharedText(
  shareIntent: ShareIntentLike | null | undefined
): string | null {
  const text = shareIntent?.text?.trim()
  return text ? text : null
}
