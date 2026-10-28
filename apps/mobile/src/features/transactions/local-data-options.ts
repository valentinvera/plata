// SQLite operations need no network. Scope this to local hooks so remote
// authentication and sync requests keep their normal connectivity policy.
export const LOCAL_DATA_OPTIONS = { networkMode: "always" } as const
