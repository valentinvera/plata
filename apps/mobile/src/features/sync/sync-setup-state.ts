export type SyncSetupState =
  | "fresh"
  | "needs-recovery"
  | "needs-reset"
  | "ready"

export interface SyncSetupInput {
  hasKey: boolean
  hasRemoteData: boolean
  hasWrappedKey: boolean
}

export function resolveSyncSetupState(input: SyncSetupInput): SyncSetupState {
  if (input.hasKey) {
    return "ready"
  }

  if (input.hasWrappedKey) {
    return "needs-recovery"
  }

  return input.hasRemoteData ? "needs-reset" : "fresh"
}
