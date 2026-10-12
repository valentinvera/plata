import { fromBase64, toBase64 } from "./base64"
import type { SyncBlob, SyncCipher, SyncRecord } from "./types"

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function toIso(value: number | null): string | null {
  return value === null ? null : new Date(value).toISOString()
}

function fromIso(value: string | null): number | null {
  return value === null ? null : Date.parse(value)
}

export function encodeRecord(record: SyncRecord, cipher: SyncCipher): SyncBlob {
  return {
    ciphertext: toBase64(cipher.encrypt(encoder.encode(record.payload))),
    deletedAt: toIso(record.deletedAt),
    id: record.id,
    updatedAt: new Date(record.updatedAt).toISOString(),
  }
}

export function decodeRecord(blob: SyncBlob, cipher: SyncCipher): SyncRecord {
  return {
    deletedAt: fromIso(blob.deletedAt),
    id: blob.id,
    payload: decoder.decode(cipher.decrypt(fromBase64(blob.ciphertext))),
    updatedAt: Date.parse(blob.updatedAt),
  }
}
