import { protectedProcedure, publicProcedure, router } from "../index"
import { syncRouter } from "./sync"

export const appRouter = router({
  healthCheck: publicProcedure.query(() => "OK"),
  privateData: protectedProcedure.query(({ ctx }) => ({
    message: "This is private",
    user: ctx.session.user,
  })),
  sync: syncRouter,
})
export type AppRouter = typeof appRouter
