import type { SyncRecord } from "./types"

// Remote blobs come from the server, which already resolved last-write-wins on
// push. Locally we apply a remote record only when it is newer, or when it
// carries a different version at the same logical time.
export function shouldApplyRemote(
  local: SyncRecord | null,
  remote: SyncRecord
): boolean {
  if (!local) {
    return true
  }

  if (remote.updatedAt !== local.updatedAt) {
    return remote.updatedAt > local.updatedAt
  }

  return (
    remote.deletedAt !== local.deletedAt || remote.payload !== local.payload
  )
}
