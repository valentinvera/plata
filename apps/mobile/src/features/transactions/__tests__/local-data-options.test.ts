import { Database } from "bun:sqlite"
import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import {
  InfiniteQueryObserver,
  onlineManager,
  QueryClient,
  QueryObserver,
} from "@tanstack/react-query"
import { LOCAL_DATA_NETWORK_MODE } from "../local-data-options"

const clients: QueryClient[] = []
const databases: Database[] = []
let previousOnline = true
beforeEach(() => {
  previousOnline = onlineManager.isOnline()
  onlineManager.setOnline(false)
})
afterEach(() => {
  for (const client of clients) {
    client.clear()
  }
  for (const database of databases) {
    database.close()
  }
  clients.length = 0
  databases.length = 0
  onlineManager.setOnline(previousOnline)
})

function harness() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const database = new Database(":memory:")
  database.exec(
    "CREATE TABLE transactions (amount INTEGER); INSERT INTO transactions VALUES (5000), (6000)"
  )
  clients.push(client)
  databases.push(database)
  const queryKey = ["transactions", "offline"] as const
  const read = () =>
    Promise.resolve(
      database
        .query<{ amount: number }, []>(
          "SELECT amount FROM transactions ORDER BY rowid"
        )
        .all()
    )
  return { client, database, queryKey, read }
}

describe("local SQLite operations while offline", () => {
  it("reads uncached data without pausing or changing connectivity", async () => {
    const { client, queryKey, read } = harness()
    const result = client.fetchQuery({
      networkMode: LOCAL_DATA_NETWORK_MODE,
      queryKey,
      queryFn: read,
    })
    expect(client.getQueryState(queryKey)?.fetchStatus).not.toBe("paused")
    expect(await result).toEqual([{ amount: 5000 }, { amount: 6000 }])
    expect(onlineManager.isOnline()).toBe(false)
  })

  it("saves a movement and refreshes the active query before the mutation finishes", async () => {
    const { client, database, queryKey, read } = harness()
    const observer = new QueryObserver(client, {
      networkMode: LOCAL_DATA_NETWORK_MODE,
      queryKey,
      queryFn: read,
    })
    const unsubscribe = observer.subscribe(() => undefined)
    try {
      await observer.refetch()
      const mutation = client.getMutationCache().build(client, {
        networkMode: LOCAL_DATA_NETWORK_MODE,
        mutationFn: (amount: number) =>
          Promise.resolve(
            database.run("INSERT INTO transactions VALUES (?)", [amount])
          ),
        onSuccess: () => client.invalidateQueries({ queryKey }),
      })
      await mutation.execute(7000)
      expect(mutation.state.isPaused).toBe(false)
      expect(client.getQueryData<{ amount: number }[]>(queryKey)).toEqual([
        { amount: 5000 },
        { amount: 6000 },
        { amount: 7000 },
      ])
    } finally {
      unsubscribe()
    }
  })

  it("loads the next local search page while offline", async () => {
    const { client, database, queryKey } = harness()
    const observer = new InfiniteQueryObserver(client, {
      networkMode: LOCAL_DATA_NETWORK_MODE,
      enabled: false,
      queryKey,
      initialPageParam: 0,
      queryFn: ({ pageParam }) =>
        Promise.resolve(
          database
            .query<{ amount: number }, [number]>(
              "SELECT amount FROM transactions ORDER BY rowid LIMIT 1 OFFSET ?"
            )
            .all(pageParam)
        ),
      getNextPageParam: (_lastPage, pages) =>
        pages.length < 2 ? pages.length : undefined,
    })
    await observer.refetch()
    const next = await observer.fetchNextPage()
    expect(next.data?.pages).toEqual([[{ amount: 5000 }], [{ amount: 6000 }]])
    expect(next.fetchStatus).toBe("idle")
  })

  it("retries a transient local read failure without waiting for internet", async () => {
    const { client, queryKey, read } = harness()
    let attempts = 0
    const result = await client.fetchQuery({
      networkMode: LOCAL_DATA_NETWORK_MODE,
      queryKey,
      retry: 1,
      retryDelay: 0,
      queryFn: () => {
        attempts += 1
        return attempts === 1
          ? Promise.reject(new Error("SQLite busy"))
          : read()
      },
    })
    expect(attempts).toBe(2)
    expect(result).toEqual([{ amount: 5000 }, { amount: 6000 }])
  })

  it("retries a local write failure without pausing the mutation", async () => {
    const { client, database, read } = harness()
    let attempts = 0
    const mutation = client.getMutationCache().build(client, {
      networkMode: LOCAL_DATA_NETWORK_MODE,
      retry: 1,
      retryDelay: 0,
      mutationFn: (amount: number) => {
        attempts += 1
        if (attempts === 1) {
          return Promise.reject(new Error("SQLite busy"))
        }
        return Promise.resolve(
          database.run("INSERT INTO transactions VALUES (?)", [amount])
        )
      },
    })
    await mutation.execute(7000)
    expect(attempts).toBe(2)
    expect(mutation.state.isPaused).toBe(false)
    expect(await read()).toHaveLength(3)
  })

  it("preserves the default paused behavior for a remote query", async () => {
    const { client } = harness()
    const queryKey = ["remote-control"] as const
    let calls = 0
    const request = client
      .fetchQuery({
        queryKey,
        queryFn: () => {
          calls += 1
          return Promise.resolve("server result")
        },
      })
      .catch(() => undefined)
    expect(client.getQueryState(queryKey)?.fetchStatus).toBe("paused")
    expect(calls).toBe(0)
    await client.cancelQueries({ queryKey })
    await request
  })
})
