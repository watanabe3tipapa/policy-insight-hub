import { describe, expect, it, vi } from "vitest";

vi.mock("./_core/passwordAuth", async importOriginal => {
  const actual = await importOriginal<typeof import("./_core/passwordAuth")>();
  return {
    ...actual,
    authenticateWithPassword: vi.fn(),
  };
});

import { configureEnv } from "./_core/env";
import { appRouter } from "./routers";
import { authenticateWithPassword } from "./_core/passwordAuth";
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

const adminUser = {
  id: 1,
  openId: "admin",
  username: "admin",
  passwordHash: "pbkdf2:SHA-256:210000:AAAA:BBBB",
  name: "admin",
  email: null,
  loginMethod: "password",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("auth.login (username + password)", () => {
  it("rejects credentials that fail validation", async () => {
    configureEnv({ ADMIN_USERNAME: "admin", JWT_SECRET: "secret" });
    const { ctx } = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.login({ username: "a", password: "short" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a wrong password", async () => {
    configureEnv({ ADMIN_USERNAME: "admin", JWT_SECRET: "secret" });
    vi.mocked(authenticateWithPassword).mockResolvedValueOnce(null);
    const { ctx } = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.login({ username: "admin", password: "wrong-password" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("issues a session cookie on valid credentials", async () => {
    configureEnv({ ADMIN_USERNAME: "admin", JWT_SECRET: "secret" });
    vi.mocked(authenticateWithPassword).mockResolvedValueOnce(adminUser);
    const { ctx, setCookies } = createContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.login({ username: "admin", password: "correct-password" });

    expect(result.user).toMatchObject({ username: "admin", role: "admin" });
    expect(setCookies).toHaveLength(1);
    expect(setCookies[0]).toContain(`${COOKIE_NAME}=`);
    expect(setCookies[0]).toContain("Path=/");
    expect(setCookies[0]).toContain("HttpOnly");
  });
});