import "varlock/auto-load"

// biome-ignore lint/performance/noBarrelFile: shim that triggers Varlock's auto-load and re-exports ENV
export { ENV } from "./env"
