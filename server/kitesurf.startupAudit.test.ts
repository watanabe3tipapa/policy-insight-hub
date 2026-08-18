import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getKitesurfConfig: vi.fn() }));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: { id: 55, openId: "audit-user", name: "Audit User", email: null, loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: new Request("https://example.com/api/trpc") as TrpcContext["req"],
    resHeaders: new Headers(),
  };
}

describe("kitesurf startup audit route", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns persisted startup audit fields through the protected Kitesurf API", async () => {
    const checkedAt = new Date("2026-08-18T00:00:00.000Z");
    vi.mocked(db.getKitesurfConfig).mockResolvedValueOnce({ lastStartupCheckAt: checkedAt, lastStartupOutcome: "succeeded", lastStartupMessage: "2件の候補を受信しました。", lastStartupRefreshAt: checkedAt } as any);
    const result = await appRouter.createCaller(createContext()).kitesurf.startupAudit();
    expect(result).toEqual({ lastStartupCheckAt: checkedAt, lastStartupOutcome: "succeeded", lastStartupMessage: "2件の候補を受信しました。", lastStartupRefreshAt: checkedAt });
  });
});
