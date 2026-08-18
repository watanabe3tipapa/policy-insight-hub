import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; setCookies: string[] } {
  const resHeaders = new Headers();
  const setCookies: string[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const appendSetCookie = resHeaders.append.bind(resHeaders);
  resHeaders.append = (name, value, options) => {
    if (name === "Set-Cookie" || name === "set-cookie") {
      setCookies.push(value);
    }
    return appendSetCookie(name, value, options);
  };

  const ctx: TrpcContext = {
    user,
    req: new Request("https://example.com/api/trpc"),
    resHeaders,
  };

  return { ctx, setCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, setCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(setCookies).toHaveLength(1);
    expect(setCookies[0]).toContain(`${COOKIE_NAME}=`);
    expect(setCookies[0]).toContain("Max-Age=-1");
    expect(setCookies[0]).toContain("Secure");
    expect(setCookies[0]).toContain("SameSite=None");
    expect(setCookies[0]).toContain("HttpOnly");
    expect(setCookies[0]).toContain("Path=/");
  });
});