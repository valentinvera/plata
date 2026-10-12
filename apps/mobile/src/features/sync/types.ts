export interface SyncRecord {
  deletedAt: number | null
  id: string
  payload: string
  updatedAt: number
}

export interface SyncBlob {
  ciphertext: string
  deletedAt: string | null
  id: string
  updatedAt: string
}

export interface SyncCipher {
  decrypt: (ciphertext: Uint8Array) => Uint8Array
  encrypt: (plaintext: Uint8Array) => Uint8Array
}

export interface SyncStore {
  applyRemote: (record: SyncRecord) => Promise<void>
  getCursor: () => Promise<string | null>
  getRecord: (id: string) => Promise<SyncRecord | null>
  listDirty: () => Promise<SyncRecord[]>
  markSynced: (ids: readonly string[]) => Promise<void>
  setCursor: (cursor: string | null) => Promise<void>
}

export interface SyncTransport {
  pull: (input: {
    since: string | null
  }) => Promise<{ blobs: SyncBlob[]; cursor: string | null }>
  push: (input: {
    blobs: SyncBlob[]
    deviceId: string
    platform?: string
  }) => Promise<{ applied: number }>
}

export interface SyncSummary {
  applied: number
  pulled: number
  pushed: number
}
