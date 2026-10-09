import "varlock/auto-load"

// biome-ignore lint/performance/noBarrelFile: shim que dispara el auto-load de Varlock y reexpone ENV
export { ENV } from "./env"
