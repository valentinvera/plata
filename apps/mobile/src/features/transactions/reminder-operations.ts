import { planReminder, type ReminderPlan } from "./reminders"

interface ReminderDependencies {
  cancelScheduled: () => Promise<void>
  getCycle: () => Promise<string | null>
  requestPermission: () => Promise<boolean>
  schedule: (plan: ReminderPlan) => Promise<void>
  setCycle: (cycle: string) => Promise<void>
}

// Native scheduling cannot be interrupted once started. Serialize its effects
// with cancellation so a completed opt-out always includes any in-flight work.
export function createReminderOperations(deps: ReminderDependencies) {
  let generation = 0
  let pending: Promise<unknown> = Promise.resolve()

  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const previous = pending
    const result = (async () => {
      await previous
      return await operation()
    })()
    // Return failures to the caller without poisoning subsequent retries.
    pending = result.catch(() => undefined)
    return result
  }

  function cancel(): Promise<void> {
    generation += 1
    return enqueue(async () => {
      await deps.cancelScheduled()
      await deps.setCycle("")
    })
  }

  async function performSync(
    lastLoggedAt: number | null,
    now: number,
    mine: number
  ): Promise<boolean> {
    if (mine !== generation) {
      return false
    }

    const cycle = lastLoggedAt === null ? null : String(lastLoggedAt)
    if (cycle !== null && (await deps.getCycle()) === cycle) {
      return false
    }
    if (mine !== generation) {
      return false
    }

    await deps.cancelScheduled()
    if (mine !== generation) {
      return false
    }

    const plan = planReminder(lastLoggedAt, now)
    if (!plan) {
      await deps.setCycle("")
      return false
    }

    if (!(await deps.requestPermission()) || mine !== generation) {
      return false
    }

    await deps.schedule(plan)
    if (mine !== generation) {
      return false
    }
    await deps.setCycle(cycle ?? "")
    return mine === generation
  }

  function sync(lastLoggedAt: number | null, now: number): Promise<boolean> {
    generation += 1
    const mine = generation
    return enqueue(() => performSync(lastLoggedAt, now, mine))
  }

  return { cancel, sync }
}
