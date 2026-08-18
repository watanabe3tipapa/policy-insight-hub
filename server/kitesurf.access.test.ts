import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createUserContext(role: "user" | "admin"): TrpcContext {
  return {
    user: {
      id: 7,
      openId: "kitesurf-test-user",
      name: "Kitesurf Test User",
      email: "kitesurf-test@example.com",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: new Request("https://example.com/api/trpc") as TrpcContext["req"],
    resHeaders: new Headers(),
  };
}

describe("kitesurf access control", () => {
  it("rejects Worker endpoint changes by a general user before database access", async () => {
    const caller = appRouter.createCaller(createUserContext("user"));
    await expect(
      caller.kitesurf.saveConfig({ workerUrl: "https://policy-kitesurf.example.workers.dev" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects startup refresh setting changes by a general user before database access", async () => {
    const caller = appRouter.createCaller(createUserContext("user"));
    await expect(caller.kitesurf.updateRefreshSettings({ autoRefreshEnabled: true, staleAfterHours: 24 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
