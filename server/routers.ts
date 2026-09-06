import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { serialize } from "cookie";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { authenticateWithPassword, isValidPassword, isValidUsername } from "./_core/passwordAuth";
import { sdk } from "./_core/sdk";
import { publicProcedure, router } from "./_core/trpc";
import { kitesurfRouter } from "./routers/kitesurf";
import { internationalPolicyRouter } from "./routers/internationalPolicy";
import { policyRouter } from "./routers/policy";

const INVALID_CREDENTIALS_MSG = "ユーザー名またはパスワードが正しくありません";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure
      .input(
        z.object({
          username: z.string().min(2, "ユーザー名は2文字以上で入力してください").max(64),
          password: z.string().min(8, "パスワードは8文字以上で入力してください").max(128),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!isValidUsername(input.username) || !isValidPassword(input.password)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: INVALID_CREDENTIALS_MSG });
        }

        const user = await authenticateWithPassword(input.username, input.password);
        if (!user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: INVALID_CREDENTIALS_MSG });
        }

        const sessionToken = await sdk.signSession({
          openId: user.openId,
          name: user.name ?? user.username ?? "",
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.resHeaders.append(
          "Set-Cookie",
          serialize(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS }),
        );
        return { user };
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
