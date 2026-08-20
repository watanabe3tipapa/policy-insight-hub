import { describe, expect, it } from "vitest";
import { configureEnv } from "./_core/env";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

function createContext(): { ctx: TrpcContext; setCookies: string[] } {
  const resHeaders = new Headers();
  const setCookies: string[] = [];

  const appendSetCookie = resHeaders.append.bind(resHeaders);
  resHeaders.append = (name, value, options) => {
    if (name === "Set-Cookie" || name === "set-cookie") {
      setCookies.push(value);
    }
    return appendSetCookie(name, value, options);
  };

  const ctx: TrpcContext = {
    user: null,
    req: new Request("https://example.com/api/trpc"),
    resHeaders,
  };

  return { ctx, setCookies };
}

describe("auth.login (admin password)", () => {
  it("rejects a wrong password", async () => {
    configureEnv({ ADMIN_PASSWORD: "correct-horse", JWT_SECRET: "secret" });
    const { ctx } = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.login({ password: "wrong" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects login when ADMIN_PASSWORD is unset", async () => {
    configureEnv({ ADMIN_PASSWORD: "", JWT_SECRET: "secret" });
    const { ctx } = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.login({ password: "anything" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("issues a session cookie on a correct password", async () => {
    configureEnv({ ADMIN_PASSWORD: "correct-horse", JWT_SECRET: "secret" });
    const { ctx, setCookies } = createContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.login({ password: "correct-horse" });

    expect(result).toEqual({ success: true });
    expect(setCookies).toHaveLength(1);
    expect(setCookies[0]).toContain(`${COOKIE_NAME}=`);
    expect(setCookies[0]).toContain("Path=/");
    expect(setCookies[0]).toContain("HttpOnly");
  });
});