import type { SyncBlob, SyncTransport } from "./types"

// Minimal shape of the tRPC client the transport needs. `utils/trpc.ts` passes
// the real client, which is structurally compatible.
export interface SyncApiClient {
  sync: {
    pull: {
      query: (input: {
        since: string | null
      }) => Promise<{ blobs: SyncBlob[]; cursor: string | null }>
    }
    push: {
      mutate: (input: {
        blobs: SyncBlob[]
        deviceId: string
        platform?: string
      }) => Promise<{ accepted: string[] }>
    }
    reset: {
      mutate: () => Promise<{ deleted: number }>
    }
    reserveKey: {
      mutate: (input: { keyId: string }) => Promise<{ keyId: string }>
    }
    storeRecovery: {
      mutate: (input: { wrappedKey: string }) => Promise<{ stored: boolean }>
    }
    getRecovery: {
      query: () => Promise<{ wrappedKey: string | null }>
    }
  }
}

export function createSyncTransport(client: SyncApiClient): SyncTransport {
  return {
    pull: (input) => client.sync.pull.query({ since: input.since }),
    push: (input) => client.sync.push.mutate(input),
  }
}
