import { initTRPC, TRPCError } from "@trpc/server"

import type { Context } from "./context"

export const t = initTRPC.context<Context>().create()

export const { router } = t

export const { procedure: publicProcedure } = t

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  const { session } = ctx
  if (!session) {
    throw new TRPCError({
      cause: "No session",
      code: "UNAUTHORIZED",
      message: "Authentication required",
    })
  }
  return next({
    ctx: {
      ...ctx,
      session,
    },
  })
})
