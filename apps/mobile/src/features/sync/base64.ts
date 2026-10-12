// biome-ignore-all lint/suspicious/noBitwiseOperators: base64 is defined in terms of bitwise shifts
// React Native has no Buffer/btoa guarantee, so base64 is implemented here.

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

const LOOKUP = (() => {
  const table = new Uint8Array(128)

  for (let index = 0; index < ALPHABET.length; index += 1) {
    table[ALPHABET.charCodeAt(index)] = index
  }

  return table
})()

function stripPadding(value: string): string {
  if (value.endsWith("==")) {
    return value.slice(0, -2)
  }

  if (value.endsWith("=")) {
    return value.slice(0, -1)
  }

  return value
}

export function toBase64(bytes: Uint8Array): string {
  let output = ""

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0
    const second = bytes[index + 1] ?? 0
    const third = bytes[index + 2] ?? 0

    output += ALPHABET.charAt(first >> 2)
    output += ALPHABET.charAt(((first & 0x03) << 4) | (second >> 4))
    output +=
      index + 1 < bytes.length
        ? ALPHABET.charAt(((second & 0x0f) << 2) | (third >> 6))
        : "="
    output += index + 2 < bytes.length ? ALPHABET.charAt(third & 0x3f) : "="
  }

  return output
}

export function fromBase64(value: string): Uint8Array {
  const body = stripPadding(value)
  const bytes = new Uint8Array(Math.floor((body.length * 3) / 4))
  let position = 0

  for (let index = 0; index < body.length; index += 4) {
    const first = LOOKUP[body.charCodeAt(index)] ?? 0
    const second = LOOKUP[body.charCodeAt(index + 1)] ?? 0
    const third = LOOKUP[body.charCodeAt(index + 2)] ?? 0
    const fourth = LOOKUP[body.charCodeAt(index + 3)] ?? 0

    bytes[position] = (first << 2) | (second >> 4)
    position += 1

    if (position < bytes.length) {
      bytes[position] = ((second & 0x0f) << 4) | (third >> 2)
      position += 1
    }

    if (position < bytes.length) {
      bytes[position] = ((third & 0x03) << 6) | fourth
      position += 1
    }
  }

  return bytes
}
