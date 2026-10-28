import { describe, expect, it } from "bun:test"

import { createReminderOperations } from "../reminder-operations"
import type { ReminderPlan } from "../reminders"

const NOW = new Date(2026, 0, 10, 10).getTime()

function gate() {
  let release: () => void = () => undefined
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

function harness() {
  const state: {
    beforePermission?: () => Promise<void>
    beforeRead?: () => Promise<void>
    beforeSchedule?: () => Promise<void>
    cancelCalls: number
    cycle: string | null
    failCancel: boolean
    failSchedule: boolean
    failWrite: boolean
    permission: boolean
    permissionCalls: number
    scheduled: ReminderPlan[]
  } = {
    cancelCalls: 0,
    cycle: null,
    failCancel: false,
    failSchedule: false,
    failWrite: false,
    permission: true,
    permissionCalls: 0,
    scheduled: [],
  }
  const operations = createReminderOperations({
    cancelScheduled() {
      state.cancelCalls += 1
      if (state.failCancel) {
        return Promise.reject(new Error("Native cancellation failed"))
      }
      state.scheduled = []
      return Promise.resolve()
    },
    async getCycle() {
      await state.beforeRead?.()
      return state.cycle
    },
    async requestPermission() {
      state.permissionCalls += 1
      await state.beforePermission?.()
      return state.permission
    },
    async schedule(plan) {
      await state.beforeSchedule?.()
      if (state.failSchedule) {
        throw new Error("Native scheduling failed")
      }
      state.scheduled.push(plan)
    },
    setCycle(cycle) {
      if (state.failWrite) {
        return Promise.reject(new Error("Storage unavailable"))
      }
      state.cycle = cycle
      return Promise.resolve()
    },
  })
  return { ...operations, state }
}

describe("reminder operation ordering", () => {
  it("schedules once per cycle and clears the cycle on opt-out", async () => {
    const { sync, cancel, state } = harness()
    expect(await sync(NOW, NOW)).toBe(true)
    expect(await sync(NOW, NOW)).toBe(false)
    expect(state.scheduled).toHaveLength(1)
    expect(state.permissionCalls).toBe(1)

    await cancel()
    expect(state.scheduled).toEqual([])
    expect(state.cycle).toBe("")
    expect(await sync(NOW, NOW)).toBe(true)
    expect(state.scheduled).toHaveLength(1)
  })

  it("waits for late native scheduling before completing opt-out", async () => {
    const { sync, cancel, state } = harness()
    const entered = gate()
    const pending = gate()
    state.beforeSchedule = async () => {
      entered.release()
      await pending.promise
    }
    const scheduling = sync(NOW, NOW)
    await entered.promise
    const cancelling = cancel()
    pending.release()

    expect(await scheduling).toBe(false)
    await cancelling
    expect(state.scheduled).toEqual([])
    expect(state.cycle).toBe("")
  })

  it("does not schedule after opt-out while permission is pending", async () => {
    const { sync, cancel, state } = harness()
    const entered = gate()
    const pending = gate()
    state.beforePermission = async () => {
      entered.release()
      await pending.promise
    }
    const scheduling = sync(NOW, NOW)
    await entered.promise
    const cancelling = cancel()
    pending.release()

    expect(await scheduling).toBe(false)
    await cancelling
    expect(state.scheduled).toEqual([])
    expect(state.cycle).toBe("")
  })

  it("does not ask permission after opt-out while metadata is pending", async () => {
    const { sync, cancel, state } = harness()
    const entered = gate()
    const pending = gate()
    state.beforeRead = async () => {
      entered.release()
      await pending.promise
    }
    const scheduling = sync(NOW, NOW)
    await entered.promise
    const cancelling = cancel()
    pending.release()

    expect(await scheduling).toBe(false)
    await cancelling
    expect(state.permissionCalls).toBe(0)
    expect(state.scheduled).toEqual([])
  })

  it("keeps only the newer cycle when two native schedules overlap", async () => {
    const { sync, state } = harness()
    const entered = gate()
    const pending = gate()
    state.beforeSchedule = async () => {
      entered.release()
      await pending.promise
    }
    const older = sync(NOW, NOW)
    await entered.promise
    const newer = sync(NOW + 1000, NOW)
    pending.release()

    expect(await older).toBe(false)
    expect(await newer).toBe(true)
    expect(state.scheduled).toHaveLength(1)
    expect(state.cycle).toBe(String(NOW + 1000))
  })

  it("skips queued schedules superseded by opt-out", async () => {
    const { sync, cancel, state } = harness()
    const first = sync(NOW, NOW)
    const second = sync(NOW + 1000, NOW)
    const cancelling = cancel()

    expect(await first).toBe(false)
    expect(await second).toBe(false)
    await cancelling
    expect(state.permissionCalls).toBe(0)
    expect(state.scheduled).toEqual([])
  })

  it("allows cancellation and retry after native scheduling fails", async () => {
    const { sync, cancel, state } = harness()
    state.failSchedule = true
    await expect(sync(NOW, NOW)).rejects.toThrow("Native scheduling failed")
    await cancel()
    expect(state.cycle).toBe("")

    state.failSchedule = false
    expect(await sync(NOW, NOW)).toBe(true)
    expect(state.scheduled).toHaveLength(1)
  })

  it("allows retry after native cancellation fails", async () => {
    const { sync, cancel, state } = harness()
    await sync(NOW, NOW)
    state.failCancel = true
    await expect(cancel()).rejects.toThrow("Native cancellation failed")
    state.failCancel = false
    await cancel()
    expect(state.scheduled).toEqual([])
    expect(state.cycle).toBe("")
  })

  it("cancels native reminders even if clearing metadata fails", async () => {
    const { sync, cancel, state } = harness()
    await sync(NOW, NOW)
    state.failWrite = true
    await expect(cancel()).rejects.toThrow("Storage unavailable")
    expect(state.scheduled).toEqual([])
    state.failWrite = false
    await cancel()
    expect(state.cycle).toBe("")
  })

  it("does not schedule without permission or a logged transaction", async () => {
    const { sync, state } = harness()
    expect(await sync(null, NOW)).toBe(false)
    expect(state.permissionCalls).toBe(0)
    state.permission = false
    expect(await sync(NOW, NOW)).toBe(false)
    expect(state.scheduled).toEqual([])
    expect(state.cycle).toBe("")
  })
})
