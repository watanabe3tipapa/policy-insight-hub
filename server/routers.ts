import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { serialize } from "cookie";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { kitesurfRouter } from "./routers/kitesurf";
import { internationalPolicyRouter } from "./routers/internationalPolicy";
import { policyRouter } from "./routers/policy";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure
      .input(z.object({ password: z.string().min(1).max(200) }))
      .mutation(async ({ ctx, input }) => {
        if (!ENV.adminPassword || input.password !== ENV.adminPassword) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "パスワードが正しくありません。" });
        }
        const openId = ENV.ownerOpenId || "local-admin";
        const name = "Toolsmith";
        await db.upsertUser({
          openId,
          name,
          role: "admin",
          loginMethod: "password",
          lastSignedIn: new Date(),
        });
        const sessionToken = await sdk.signSession({ openId, name });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.resHeaders.append(
          "Set-Cookie",
          serialize(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS }),
        );
        return { success: true } as const;
      }),
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
