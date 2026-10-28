// Stored amounts use integer cents. Split their decimal digits instead of
// dividing by 100, which can round a valid cent away near the safe integer limit.
export function centsToDecimal(
  cents: number,
  separator: "." | "," = "."
): string {
  const digits = Math.abs(cents).toString().padStart(3, "0")
  const sign = cents < 0 ? "-" : ""
  return `${sign}${digits.slice(0, -2)}${separator}${digits.slice(-2)}`
}
