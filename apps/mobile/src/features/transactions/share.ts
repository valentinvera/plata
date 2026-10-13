export interface ShareIntentFileLike {
  mimeType?: string | null
  path?: string | null
}

export interface ShareIntentLike {
  files?: readonly ShareIntentFileLike[] | null
  text?: string | null
}

export function getSharedText(
  shareIntent: ShareIntentLike | null | undefined
): string | null {
  const text = shareIntent?.text?.trim()
  return text ? text : null
}

// The first shared file that is an image (e.g. an iOS screenshot), so the share
// extension can run OCR on it.
export function getSharedImageUrl(
  shareIntent: ShareIntentLike | null | undefined
): string | null {
  const files = shareIntent?.files ?? []
  const image = files.find((file) => file.mimeType?.startsWith("image/"))

  return image?.path ?? null
}
