import { COOKIE_NAME } from "@shared/const";
import { serialize } from "cookie";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { kitesurfRouter } from "./routers/kitesurf";
import { internationalPolicyRouter } from "./routers/internationalPolicy";
import { policyRouter } from "./routers/policy";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.resHeaders.append("Set-Cookie", serialize(COOKIE_NAME, "", { ...cookieOptions, maxAge: -1 }));
      return { success: true } as const;
    }),
  }),
  policy: policyRouter,
  kitesurf: kitesurfRouter,
  internationalPolicy: internationalPolicyRouter,
});

export type AppRouter = typeof appRouter;
