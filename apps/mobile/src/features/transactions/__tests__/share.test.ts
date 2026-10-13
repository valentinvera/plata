import { describe, expect, it } from "bun:test"

import { getSharedImageUrl, getSharedText } from "../share"

describe("getSharedText", () => {
  it("returns the trimmed shared text", () => {
    expect(getSharedText({ text: "  Compraste $500  " })).toBe("Compraste $500")
  })

  it("returns null for empty or missing text", () => {
    expect(getSharedText({ text: "   " })).toBeNull()
    expect(getSharedText({})).toBeNull()
    expect(getSharedText(null)).toBeNull()
  })
})

describe("getSharedImageUrl", () => {
  it("returns the first image file", () => {
    expect(
      getSharedImageUrl({
        files: [
          { mimeType: "application/pdf", path: "file:///doc.pdf" },
          { mimeType: "image/png", path: "file:///shot.png" },
        ],
      })
    ).toBe("file:///shot.png")
  })

  it("returns null without image files", () => {
    expect(getSharedImageUrl({ files: [] })).toBeNull()
    expect(getSharedImageUrl({ files: null })).toBeNull()
    expect(getSharedImageUrl({})).toBeNull()
    expect(getSharedImageUrl(null)).toBeNull()
  })

  it("returns null when the image has no path", () => {
    expect(getSharedImageUrl({ files: [{ mimeType: "image/png" }] })).toBeNull()
  })
})
