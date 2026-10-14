import { protectedProcedure, publicProcedure, router } from "../index"
import { spacesRouter } from "./spaces"
import { syncRouter } from "./sync"

export const appRouter = router({
  healthCheck: publicProcedure.query(() => "OK"),
  privateData: protectedProcedure.query(({ ctx }) => ({
    message: "This is private",
    user: ctx.session.user,
  })),
  spaces: spacesRouter,
  sync: syncRouter,
})
export type AppRouter = typeof appRouter
