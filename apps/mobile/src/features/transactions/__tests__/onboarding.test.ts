import { describe, expect, it } from "bun:test"

import {
  ONBOARDING_BENEFITS,
  ONBOARDING_COMPLETED_KEY,
  shouldShowOnboarding,
} from "../onboarding"

describe("shouldShowOnboarding", () => {
  it("shows onboarding until it has been completed", () => {
    expect(shouldShowOnboarding(null)).toBe(true)
    expect(shouldShowOnboarding("0")).toBe(true)
    expect(shouldShowOnboarding("")).toBe(true)
  })

  it("hides onboarding once completed", () => {
    expect(shouldShowOnboarding("1")).toBe(false)
  })
})

describe("onboarding constants", () => {
  it("exposes the completion key and a non-empty benefit list", () => {
    expect(ONBOARDING_COMPLETED_KEY).toBe("onboarding_completed")
    expect(ONBOARDING_BENEFITS.length).toBeGreaterThan(0)
  })
})
